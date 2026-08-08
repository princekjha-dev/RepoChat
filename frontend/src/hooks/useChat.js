import { useState, useCallback } from 'react';
import { sendMessage } from '../services/api';

/**
 * Chat state management hook.
 * Manages messages, loading state, and send functionality.
 */
export function useChat(activeSlug) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(
    async (question, mode = 'qa') => {
      if (!activeSlug || !question.trim()) return;

      // Add user message immediately (optimistic UI)
      const userMessage = { role: 'user', text: question };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const data = await sendMessage(activeSlug, question, mode);
        const aiMessage = {
          role: 'assistant',
          text: data.answer || 'No answer returned.',
          sources: data.sources || [],
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        const errorMessage = {
          role: 'assistant',
          text: `⚠️ ${error.message || 'Something went wrong while generating the answer.'}`,
          sources: [],
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [activeSlug]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, send, clearMessages, setMessages };
}
