/**
 * API client for RepoChat AI backend.
 * All endpoints with error handling.
 */

// In dev, Vite proxies /api/* to the Flask backend (see vite.config.js).
// Using an empty base means all fetches go through the same-origin Vite proxy,
// which avoids CORS issues entirely.
// In production (after `vite build`), VITE_API_URL must be set to the actual backend URL.
export const API_BASE =
  import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');


async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}: ${response.statusText || 'Not Found'}`);
    }
    throw new Error(`Invalid JSON response received from ${endpoint}`);
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

// ── Repository Management ──────────────────────────────
export const listRepos = () => fetchJson('/api/repos');
export const getRepoDetails = (slug) => fetchJson(`/api/repos/${slug}`);
export const getRepoFiles = (slug) => fetchJson(`/api/repos/${slug}/files`);
export const getRepoEnriched = (slug) => fetchJson(`/api/repos/${slug}/enrich`);
export const deleteRepo = (slug) => fetchJson(`/api/repos/${slug}`, { method: 'DELETE' });
export const reindexRepo = (slug) => fetchJson(`/api/repos/${slug}/reindex`, { method: 'POST' });
export const getFileContent = (slug, filePath) => fetchJson(`/api/repos/${slug}/file?path=${encodeURIComponent(filePath)}`);

// ── Indexing ───────────────────────────────────────────
export const indexRepo = (repoUrl, githubToken) =>
  fetchJson('/api/index', {
    method: 'POST',
    body: JSON.stringify({ repo_url: repoUrl, github_token: githubToken }),
  });

export const getIngestStatus = (slug) => fetchJson(`/api/status/${slug}`);
export const cancelIngest = (slug) =>
  fetchJson(`/api/ingest/cancel/${slug}`, { method: 'POST' });

// ── Search ─────────────────────────────────────────────
export const searchRepo = (query, repoName, topK = 10) =>
  fetchJson('/api/search', {
    method: 'POST',
    body: JSON.stringify({ query, repo_name: repoName, top_k: topK }),
  });

// ── Code Review ────────────────────────────────────────
export const reviewCode = (diff, options = {}) =>
  fetchJson('/api/review', {
    method: 'POST',
    body: JSON.stringify({
      diff,
      context: options.context || '',
      repo_name: options.repoName || '',
      pr_url: options.prUrl || '',
    }),
  });

// ── Export ─────────────────────────────────────────────
export const exportConversation = (messages, repoName, format = 'markdown') =>
  fetchJson('/api/export', {
    method: 'POST',
    body: JSON.stringify({ messages, repo_name: repoName, format }),
  });

// ── Health ─────────────────────────────────────────────
export const checkHealth = () => fetchJson('/api/health');


// ══════════════════════════════════════════════════════
// SSE STREAM HELPERS
// ══════════════════════════════════════════════════════

/**
 * Generic SSE stream reader.
 * Parses SSE lines and dispatches tokens.
 */
async function readSSEStream(response, { onToken, onSources, onStatus, onCitations, onMessageId, onError, onComplete, signal }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const payload = trimmed.slice(6);
        if (payload === '[DONE]') {
          onComplete?.();
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) { onError?.(new Error(parsed.error)); return; }
          if (parsed.sources) onSources?.(parsed.sources);
          if (parsed.status) onStatus?.(parsed.status);
          if (parsed.token) onToken?.(parsed.token);
          if (parsed.citations) onCitations?.(parsed.citations);
          if (parsed.message_id) onMessageId?.(parsed.message_id);
        } catch {
          // ignore malformed
        }
      }
    }
    onComplete?.();
  } catch (err) {
    if (err.name !== 'AbortError') onError?.(err);
  }
}


/**
 * Stream chat Q&A responses (RAG).
 */
export async function streamChat(slug, message, history, callbacks, signal) {
  const { onSources, onToken, onCitations, onMessageId, onError, onComplete } = callbacks;
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        repo_name: slug,
        conversation_history: history,
      }),
      signal,
    });
    if (!response.ok) {
      const text = await response.text();
      let errMsg = `Request failed: ${response.status}`;
      try { errMsg = JSON.parse(text).error || errMsg; } catch {}
      throw new Error(errMsg);
    }
    await readSSEStream(response, { onToken, onSources, onCitations, onMessageId, onError, onComplete, signal });
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err);
  }
}


// ── Share ──────────────────────────────────────────────
export const getShareExchange = (slug, messageId) =>
  fetchJson(`/api/share/${slug}/${messageId}`);


/**
 * Stream code explanation.
 */
export async function streamExplain(code, options = {}, callbacks, signal) {
  const { onToken, onError, onComplete } = callbacks;
  try {
    const response = await fetch(`${API_BASE}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        language: options.language || '',
        repo_name: options.repoName || '',
      }),
      signal,
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    await readSSEStream(response, { onToken, onError, onComplete, signal });
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err);
  }
}


/**
 * Stream repository summary generation.
 */
export async function streamRepoSummary(slug, callbacks, signal) {
  const { onToken, onError, onComplete } = callbacks;
  try {
    const response = await fetch(`${API_BASE}/api/repos/${slug}/summary`, { signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    await readSSEStream(response, { onToken, onError, onComplete, signal });
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err);
  }
}


/**
 * Stream repository comparison.
 */
export async function streamCompare(slug1, slug2, callbacks, signal) {
  const { onToken, onError, onComplete } = callbacks;
  try {
    const response = await fetch(`${API_BASE}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo1: slug1, repo2: slug2 }),
      signal,
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    await readSSEStream(response, { onToken, onError, onComplete, signal });
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err);
  }
}
