import client from './api/client';

// ── Ingest ──────────────────────────────────────────

export async function ingestRepo(repoUrl, force = false) {
  const response = await client.post('/api/ingest', { repo_url: repoUrl, force });
  return response.data;
}

export async function getIngestStatus(slug) {
  const response = await client.get(`/api/ingest/status/${slug}`, {
    retry: 3,
    retryDelay: 500,
  });
  return response.data;
}

export async function cancelIngest(slug) {
  const response = await client.post(`/api/ingest/cancel/${slug}`);
  return response.data;
}

// ── Chat ────────────────────────────────────────────

export async function sendMessage(slug, question, mode = 'qa') {
  const response = await client.post('/api/chat', { slug, question, mode });
  return response.data;
}

export async function getRepoSummary(slug) {
  const response = await client.get(`/api/chat/summary/${slug}`, {
    retry: 3,
    retryDelay: 1000,
  });
  return response.data;
}

// ── Repos ───────────────────────────────────────────

export async function listRepos() {
  const response = await client.get('/api/repos', {
    retry: 3,
    retryDelay: 1000,
  });
  return response.data;
}

export async function getRepoDetails(slug) {
  const response = await client.get(`/api/repos/${slug}`, {
    retry: 3,
    retryDelay: 1000,
  });
  return response.data;
}

export async function getRepoFiles(slug) {
  const response = await client.get(`/api/repos/${slug}/files`, {
    retry: 3,
    retryDelay: 1000,
  });
  return response.data;
}

export async function getRepoStats(slug) {
  const response = await client.get(`/api/repos/${slug}/stats`, {
    retry: 3,
    retryDelay: 1000,
  });
  return response.data;
}

export async function searchRepo(slug, query) {
  const response = await client.get(`/api/repos/${slug}/search?q=${encodeURIComponent(query)}`);
  return response.data;
}

export async function deleteRepo(slug) {
  const response = await client.delete(`/api/repos/${slug}`);
  return response.data;
}

export async function compareRepos(slug1, slug2) {
  const response = await client.post('/api/repos/compare', { slugs: [slug1, slug2] });
  return response.data;
}

// ── Health ──────────────────────────────────────────

export async function healthCheck() {
  const response = await client.get('/api/health');
  return response.data;
}
