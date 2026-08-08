/**
 * Utility helpers for RepoChat frontend.
 */

/**
 * Format a slug for display: "owner_repo" → "owner / repo"
 */
export function formatSlug(slug) {
  if (!slug) return '';
  return slug.replace(/_/g, ' / ');
}

/**
 * Format file size in human-readable form.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get a file icon based on extension.
 */
export function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const iconMap = {
    py: '🐍', js: '📜', jsx: '⚛️', ts: '📘', tsx: '⚛️',
    html: '🌐', css: '🎨', scss: '🎨',
    json: '📋', yaml: '📋', yml: '📋', toml: '📋',
    md: '📝', txt: '📄', rst: '📝',
    go: '🔵', rs: '🦀', java: '☕', rb: '💎',
    c: '⚙️', cpp: '⚙️', h: '⚙️',
    sh: '🔧', sql: '🗃️',
    vue: '💚', svelte: '🧡',
  };
  return iconMap[ext] || '📄';
}

/**
 * Get a color for a language badge.
 */
export function getLanguageColor(language) {
  const colorMap = {
    Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6',
    'React JSX': '#61dafb', 'React TSX': '#61dafb',
    HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
    Go: '#00ADD8', Java: '#b07219', Ruby: '#701516',
    Rust: '#dea584', 'C': '#555555', 'C++': '#f34b7d',
    Markdown: '#083fa1', JSON: '#292929',
    Shell: '#89e051', SQL: '#e38c00',
    Vue: '#41b883', Svelte: '#ff3e00',
    YAML: '#cb171e',
  };
  return colorMap[language] || '#6366f1';
}

/**
 * Export messages as a Markdown string.
 */
export function exportChatAsMarkdown(messages, repoSlug) {
  const header = `# RepoChat — ${formatSlug(repoSlug)}\n\n`;
  const timestamp = `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

  const body = messages
    .map((msg) => {
      if (msg.role === 'user') {
        return `## 🧑 You\n\n${msg.text}\n`;
      }
      let content = `## 🤖 RepoChat\n\n${msg.text}\n`;
      if (msg.sources?.length > 0) {
        content += `\n**Sources:**\n`;
        msg.sources.forEach((s) => {
          const loc = s.start_line ? ` (L${s.start_line}-L${s.end_line})` : '';
          content += `- \`${s.file}\`${loc}\n`;
        });
      }
      return content;
    })
    .join('\n---\n\n');

  return header + timestamp + body;
}

/**
 * Download a string as a file.
 */
export function downloadFile(content, filename, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
