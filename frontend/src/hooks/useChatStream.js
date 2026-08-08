import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { API_BASE } from '../services/api/client';

export function useChatStream() {
  const messages = useStore((state) => state.messages);
  const addMessage = useStore((state) => state.addMessage);
  const updateLastMessage = useStore((state) => state.updateLastMessage);
  const [streaming, setStreaming] = useState(false);
  const abortControllerRef = useRef(null);
  const accumulatedRef = useRef('');

  const cancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreaming(false);
      const stopped = accumulatedRef.current + '\n\n*(Generation stopped by user)*';
      updateLastMessage({ content: stopped, isStreaming: false });
      accumulatedRef.current = '';
    }
  };

  const streamAnswer = async (slug, question, mode = 'qa') => {
    if (streaming) return;

    setStreaming(true);
    accumulatedRef.current = '';
    abortControllerRef.current = new AbortController();

    // Prepare chat history for RAG memory context (exclude IDs and timestamps)
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 1. Add User message
    addMessage({
      role: 'user',
      content: question,
      sources: [],
    });

    // 2. Add Assistant message placeholder
    addMessage({
      role: 'assistant',
      content: '',
      sources: [],
      isStreaming: true,
    });

    try {
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          question,
          history,
          mode,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `Server returned status ${response.status}`;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep last incomplete line in buffer
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          const dataPayload = trimmed.slice(6);
          if (dataPayload === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataPayload);

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.sources) {
              updateLastMessage({ sources: parsed.sources });
            }

            if (parsed.token) {
              accumulatedRef.current += parsed.token;
              updateLastMessage({ content: accumulatedRef.current });
            }
          } catch (e) {
            // Re-throw explicit server/API errors
            if (e.message && (e.message.startsWith('Server') || e.message.includes('API') || e.message.includes('not indexed'))) {
              throw e;
            }
            // Silently ignore malformed chunks
          }
        }
      }

      // Finish streaming
      updateLastMessage({ isStreaming: false });
      setStreaming(false);
      accumulatedRef.current = '';
      abortControllerRef.current = null;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted');
        return;
      }

      console.error('Streaming failed:', err);
      updateLastMessage({
        content: `Error: ${err.message || 'Connection lost. Failed to generate response.'}`,
        isStreaming: false,
        error: true,
      });
      setStreaming(false);
      accumulatedRef.current = '';
      abortControllerRef.current = null;
    }
  };

  return {
    streamAnswer,
    cancelStream,
    streaming,
  };
}
