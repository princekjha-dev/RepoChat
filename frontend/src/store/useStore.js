import { create } from 'zustand';
import { persist } from 'zustand/middleware';

let msgIdCounter = 0;
const nextId = () => `msg_${++msgIdCounter}_${Date.now()}`;

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Repositories ──────────────────────────────────
      repos: [],
      setRepos: (repos) => set({ repos }),

      activeRepo: null,
      setActiveRepo: (slug) => set({ activeRepo: slug }),

      activeRepoDetails: null,
      setActiveRepoDetails: (details) => set({ activeRepoDetails: details }),

      // ── Chat Messages (per repo, map of slug→messages) ──
      chatHistories: {},
      getMessages: () => {
        const { activeRepo, chatHistories } = get();
        if (!activeRepo) return [];
        return chatHistories[activeRepo] || [];
      },
      addMessage: (message) =>
        set((state) => {
          const slug = state.activeRepo;
          if (!slug) return state;
          const history = state.chatHistories[slug] || [];
          return {
            chatHistories: {
              ...state.chatHistories,
              [slug]: [...history, { ...message, id: nextId(), timestamp: new Date().toISOString() }],
            },
          };
        }),
      updateLastMessage: (updates) =>
        set((state) => {
          const slug = state.activeRepo;
          if (!slug) return state;
          const history = [...(state.chatHistories[slug] || [])];
          if (history.length === 0) return state;
          history[history.length - 1] = { ...history[history.length - 1], ...updates };
          return { chatHistories: { ...state.chatHistories, [slug]: history } };
        }),
      clearMessages: () =>
        set((state) => {
          const slug = state.activeRepo;
          if (!slug) return state;
          return {
            chatHistories: { ...state.chatHistories, [slug]: [] },
          };
        }),

      // ── Indexing Task ─────────────────────────────────
      activeTask: null,
      setActiveTask: (task) => set({ activeTask: task }),
      updateActiveTask: (updates) =>
        set((state) => ({
          activeTask: state.activeTask ? { ...state.activeTask, ...updates } : null,
        })),
      clearActiveTask: () => set({ activeTask: null }),

      // ── UI State ──────────────────────────────────────
      activePage: 'landing', // 'landing' | 'indexing' | 'chat'
      setActivePage: (page) => set({ activePage: page }),

      activeTab: 'chat', // 'chat' | 'review' | 'explore' | 'summary' | 'compare'
      setActiveTab: (tab) => set({ activeTab: tab }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // ── Review State ──────────────────────────────────
      reviewResult: null,
      setReviewResult: (result) => set({ reviewResult: result }),
      reviewLoading: false,
      setReviewLoading: (loading) => set({ reviewLoading: loading }),

      // ── Summary State ─────────────────────────────────
      summaryContent: {},
      setSummaryContent: (slug, content) =>
        set((state) => ({
          summaryContent: { ...state.summaryContent, [slug]: content },
        })),

      // ── Compare State ─────────────────────────────────
      compareContent: '',
      setCompareContent: (content) => set({ compareContent: content }),
      compareRepo1: null,
      setCompareRepo1: (slug) => set({ compareRepo1: slug }),
      compareRepo2: null,
      setCompareRepo2: (slug) => set({ compareRepo2: slug }),

      // ── Toast notifications ───────────────────────────
      toasts: [],
      addToast: (message, type = 'info', duration = 4000) =>
        set((state) => {
          const id = `toast_${Date.now()}`;
          setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
          }, duration);
          return { toasts: [...state.toasts, { id, message, type }] };
        }),
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'repochat-storage',
      partialize: (state) => ({
        repos: state.repos,
        activeRepo: state.activeRepo,
        chatHistories: state.chatHistories,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
