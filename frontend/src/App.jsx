import React, { useEffect, useRef } from 'react';
import LandingPage from './pages/LandingPage';
import IndexingPage from './pages/IndexingPage';
import ChatPage from './pages/ChatPage';
import SharePage from './pages/SharePage';
import { ToastContainer, addToast } from './components/Toast';
import { useStore } from './store/useStore';
import {
  listRepos,
  getRepoDetails,
  indexRepo,
  getIngestStatus,
  cancelIngest,
  deleteRepo,
  streamChat,
} from './api/client';

export default function App() {
  const {
    repos, setRepos,
    activeRepo, setActiveRepo,
    activeRepoDetails, setActiveRepoDetails,
    activePage, setActivePage,
    activeTask, setActiveTask, updateActiveTask, clearActiveTask,
    addMessage, updateLastMessage, clearMessages,
    addToast: storeToast,
  } = useStore();

  const pollRef = useRef(null);
  const abortRef = useRef(null);
  const streamAccRef = useRef('');
  const chatLoadingRef = useRef(false);
  const [chatLoading, setChatLoading] = React.useState(false);

  // ── Load repos on mount ─────────────────────────────
  // Background sync — silently degrades if backend is unreachable.
  // Never shows a toast for this non-user-triggered call.
  useEffect(() => {
    listRepos()
      .then((data) => setRepos(data.repos || []))
      .catch(() => {
        // Backend unavailable on load — keep persisted repos, do not toast.
      });
  }, []);

  // ── Load repo details when activeRepo changes ───────
  useEffect(() => {
    if (!activeRepo) { setActiveRepoDetails(null); return; }
    getRepoDetails(activeRepo)
      .then((d) => setActiveRepoDetails(d))
      .catch(() => setActiveRepoDetails(null));
  }, [activeRepo]);

  // ── Cleanup polling on unmount ──────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Polling helpers ─────────────────────────────────
  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = (slug) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await getIngestStatus(slug);
        updateActiveTask({
          status: data.status,
          percent: data.percent,
          current_file: data.current_file,
          processed_files: data.processed_files || 0,
          total_files: data.total_files || 0,
          files: data.files || [],
          error: data.error,
        });

        if (data.status === 'completed') {
          stopPolling();
          addToast(`Indexed successfully!`, 'success');
          const list = await listRepos();
          setRepos(list.repos || []);
          setActiveRepo(slug);
          clearActiveTask();
          setActivePage('chat');
        } else if (data.status === 'failed') {
          stopPolling();
          addToast(`Indexing failed: ${data.error || 'Unknown error'}`, 'error');
          setTimeout(() => { clearActiveTask(); setActivePage('landing'); }, 8000);
        } else if (data.status === 'cancelled') {
          stopPolling();
          addToast('Indexing cancelled.', 'info');
          clearActiveTask();
          setActivePage('landing');
        }
      } catch (err) {
        stopPolling();
        clearActiveTask();
        setActivePage('landing');
      }
    }, 1000);
  };

  // ── Handle ingest ───────────────────────────────────
  const handleIngest = async (url, token) => {
    try {
      const data = await indexRepo(url, token);
      const slug = data.slug || data.job_id;

      if (data.status === 'completed') {
        addToast('Repository already indexed!', 'success');
        const list = await listRepos();
        setRepos(list.repos || []);
        setActiveRepo(slug);
        setActivePage('chat');
        return;
      }

      setActiveTask({
        slug,
        percent: 0,
        current_file: 'Initializing...',
        status: data.status || 'pending',
        processed_files: 0,
        total_files: 0,
        files: [],
        error: null,
      });
      setActivePage('indexing');
      startPolling(slug);
    } catch (err) {
      addToast(err.message || 'Failed to start indexing.', 'error');
    }
  };

  // ── Handle cancel ───────────────────────────────────
  const handleCancel = async (slug) => {
    try {
      stopPolling();
      await cancelIngest(slug);
      addToast('Cancelling...', 'info');
      clearActiveTask();
      setActivePage('landing');
      const list = await listRepos();
      setRepos(list.repos || []);
    } catch {
      addToast('Cancel failed.', 'error');
      startPolling(slug);
    }
  };

  // ── Handle delete ───────────────────────────────────
  const handleDelete = async (slug) => {
    if (!confirm(`Remove index for "${slug.replace('_', '/')}"?`)) return;
    try {
      await deleteRepo(slug);
      addToast('Repository removed.', 'success');
      if (activeRepo === slug) {
        setActiveRepo(null);
        clearMessages();
        setActivePage('landing');
      }
      const list = await listRepos();
      setRepos(list.repos || []);
    } catch (err) {
      addToast(err.message || 'Delete failed.', 'error');
    }
  };

  // ── Handle chat send ────────────────────────────────
  const handleSend = async (question) => {
    if (!activeRepo || chatLoading) return;

    setChatLoading(true);
    chatLoadingRef.current = true;
    streamAccRef.current = '';
    abortRef.current = new AbortController();

    const history = useStore.getState().getMessages().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    addMessage({ role: 'user', content: question, sources: [] });
    addMessage({ role: 'assistant', content: '', sources: [], isStreaming: true });

    await streamChat(
      activeRepo,
      question,
      history,
      {
        onSources: (sources) => updateLastMessage({ sources }),
        onToken: (token) => {
          streamAccRef.current += token;
          updateLastMessage({ content: streamAccRef.current });
        },
        onCitations: (citations) => updateLastMessage({ citations }),
        onMessageId: (messageId) => updateLastMessage({ messageId }),
        onError: (err) => {
          updateLastMessage({ content: `Error: ${err.message}`, isStreaming: false, error: true });
          setChatLoading(false);
          chatLoadingRef.current = false;
        },
        onComplete: () => {
          updateLastMessage({ isStreaming: false });
          setChatLoading(false);
          chatLoadingRef.current = false;
        },
      },
      abortRef.current.signal
    );
  };

  // ── Handle cancel stream ────────────────────────────
  const handleCancelStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setChatLoading(false);
    chatLoadingRef.current = false;
    const stopped = streamAccRef.current + '\n\n*(Generation stopped)*';
    updateLastMessage({ content: stopped, isStreaming: false });
    streamAccRef.current = '';
    addToast('Generation stopped.', 'info');
  };

  // Detect share page URL: /share/:slug/:messageId
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts[0] === 'share' && pathParts[1] && pathParts[2]) {
    return (
      <div className="min-h-screen bg-background text-textPrimary">
        <ToastContainer />
        <SharePage slug={pathParts[1]} messageId={pathParts[2]} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-textPrimary">
      <ToastContainer />

      {activePage === 'landing' && (
        <LandingPage
          onIngest={handleIngest}
          ingesting={!!activeTask}
          indexedRepos={repos}
          onSelectRepo={(slug) => {
            setActiveRepo(slug);
            clearMessages();
            setActivePage('chat');
          }}
        />
      )}

      {activePage === 'indexing' && activeTask && (
        <IndexingPage task={activeTask} onCancel={handleCancel} />
      )}

      {activePage === 'chat' && activeRepo && (
        <div style={{ height: '100vh' }}>
          <ChatPage
            repos={repos}
            activeRepo={activeRepo}
            repoDetails={activeRepoDetails}
            onSend={handleSend}
            chatLoading={chatLoading}
            onCancelStream={handleCancelStream}
            onSelectRepo={(slug) => {
              setActiveRepo(slug);
              clearMessages();
            }}
            onDeleteRepo={handleDelete}
            onNewChat={() => {
              setActiveRepo(null);
              clearMessages();
              setActivePage('landing');
            }}
          />
        </div>
      )}
    </div>
  );
}
