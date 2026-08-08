import React, { useState } from 'react';

const LANG_COLORS = {
  '.py': '#3572A5', '.js': '#F1E05A', '.ts': '#3178C6', '.jsx': '#61DAFB',
  '.tsx': '#61DAFB', '.go': '#00ADD8', '.rs': '#DEA584', '.java': '#B07219',
  '.rb': '#CC342D', '.php': '#4F5D95', '.cpp': '#F34B7D', '.c': '#555555',
  '.cs': '#239120', '.swift': '#F05138', '.kt': '#A97BFF', '.md': '#083FA1',
  '.json': '#292929', '.yaml': '#CB171E', '.yml': '#CB171E', '.html': '#E34C26',
  '.css': '#563D7C', '.scss': '#C6538C', '.sql': '#E38C00', '.sh': '#89E051',
};

const LANG_LABELS = {
  '.py': 'Python', '.js': 'JavaScript', '.ts': 'TypeScript', '.jsx': 'React',
  '.tsx': 'React TS', '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.rb': 'Ruby',
  '.php': 'PHP', '.cpp': 'C++', '.c': 'C', '.cs': 'C#', '.swift': 'Swift',
  '.kt': 'Kotlin', '.md': 'Markdown', '.json': 'JSON', '.yaml': 'YAML',
  '.yml': 'YAML', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
  '.sql': 'SQL', '.sh': 'Shell',
};

function getFileExt(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return '.' + parts[parts.length - 1].toLowerCase();
}

function FileIcon({ filename }) {
  const ext = getFileExt(filename);
  const color = LANG_COLORS[ext] || '#5A5A7A';
  return (
    <div style={{ width: 16, height: 16, borderRadius: '3px', background: color, flexShrink: 0, opacity: 0.85 }} />
  );
}

function FileNode({ name, isFile, children, depth = 0, onSelect, selectedFile }) {
  const [open, setOpen] = useState(depth < 2);

  if (isFile) {
    const isSelected = selectedFile === name;
    return (
      <button
        onClick={() => onSelect?.(name)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: `3px 8px 3px ${8 + depth * 14}px`,
          width: '100%',
          background: isSelected ? 'rgba(124,58,237,0.12)' : 'transparent',
          border: 'none',
          borderLeft: isSelected ? '2px solid #7C3AED' : '2px solid transparent',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'transparent')}
      >
        <FileIcon filename={name} />
        <span
          style={{
            fontSize: '11px',
            color: isSelected ? '#A78BFA' : '#9090B8',
            fontFamily: 'JetBrains Mono, monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {name}
        </span>
      </button>
    );
  }

  // Directory
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: `3px 8px 3px ${8 + depth * 14}px`,
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: '9px', color: '#3A3A54', width: 10 }}>{open ? '▼' : '▶'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#86868B', marginRight: '4px' }}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span
          style={{
            fontSize: '11px',
            color: '#7A7A9A',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 500,
          }}
        >
          {name}/
        </span>
      </button>
      {open && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}

function renderTree(tree, path = '', depth = 0, onSelect, selectedFile) {
  const nodes = [];

  // Directories first
  const dirs = Object.keys(tree).filter((k) => k !== '_files' && typeof tree[k] === 'object');
  const files = tree._files || [];

  dirs.forEach((dirName) => {
    const dirPath = path ? `${path}/${dirName}` : dirName;
    nodes.push(
      <FileNode key={dirPath} name={dirName} depth={depth} onSelect={onSelect} selectedFile={selectedFile}>
        {renderTree(tree[dirName], dirPath, depth + 1, onSelect, selectedFile)}
      </FileNode>
    );
  });

  files.forEach((fileName) => {
    const filePath = path ? `${path}/${fileName}` : fileName;
    nodes.push(
      <FileNode
        key={filePath}
        name={fileName}
        isFile
        depth={depth}
        onSelect={() => onSelect?.(filePath)}
        selectedFile={selectedFile}
      />
    );
  });

  return nodes;
}

/**
 * FileExplorer — IDE-style file tree with expand/collapse and file selection.
 */
export default function FileExplorer({ tree = {}, fileCount = 0, onSelect, selectedFile, searchQuery = '' }) {
  const [search, setSearch] = useState(searchQuery);

  // Flatten for search
  const flattenTree = (t, path = '') => {
    const result = [];
    const dirs = Object.keys(t).filter((k) => k !== '_files' && typeof t[k] === 'object');
    const files = t._files || [];
    dirs.forEach((d) => {
      const dPath = path ? `${path}/${d}` : d;
      result.push(...flattenTree(t[d], dPath));
    });
    files.forEach((f) => {
      const fPath = path ? `${path}/${f}` : f;
      result.push(fPath);
    });
    return result;
  };

  const allFiles = flattenTree(tree);
  const filteredFiles = search
    ? allFiles.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #1E1E2E', flexShrink: 0 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files..."
          style={{
            width: '100%',
            padding: '6px 10px',
            background: '#16161F',
            border: '1px solid #2A2A3E',
            borderRadius: '6px',
            color: '#9090B8',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace',
            outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#7C3AED')}
          onBlur={(e) => (e.target.style.borderColor = '#2A2A3E')}
        />
      </div>

      {/* File count badge */}
      <div
        style={{
          padding: '4px 12px',
          borderBottom: '1px solid #1E1E2E',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '10px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Files
        </span>
        <span style={{ fontSize: '10px', color: '#5A5A7A', fontFamily: 'JetBrains Mono, monospace' }}>
          {search ? filteredFiles?.length : fileCount}
        </span>
      </div>

      {/* Tree or search results */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {search && filteredFiles ? (
          filteredFiles.length === 0 ? (
            <div style={{ padding: '16px 12px', color: '#3A3A54', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
              No files match "{search}"
            </div>
          ) : (
            filteredFiles.map((fp) => {
              const parts = fp.split('/');
              const fileName = parts[parts.length - 1];
              return (
                <button
                  key={fp}
                  onClick={() => onSelect?.(fp)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    width: '100%',
                    background: selectedFile === fp ? 'rgba(124,58,237,0.12)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <FileIcon filename={fileName} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '11px', color: '#9090B8', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fileName}
                    </div>
                    <div style={{ fontSize: '10px', color: '#3A3A54', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fp}
                    </div>
                  </div>
                </button>
              );
            })
          )
        ) : (
          renderTree(tree, '', 0, onSelect, selectedFile)
        )}
      </div>
    </div>
  );
}
