import React, { useState } from 'react';
import { FiCode, FiSearch, FiMessageSquare } from 'react-icons/fi';
import RepoInput from '../components/RepoInput';

/**
 * Home Component.
 * Landing view where user enters a repository URL to begin indexing.
 * 
 * @param {function} onIngest - Callback triggered on URL submission.
 * @param {boolean} ingesting - Active indexing state.
 * @param {Array} indexedRepos - Already indexed repository slugs.
 * @param {function} onSelectRepo - Select indexed repo callback.
 */
export default function Home({ onIngest, ingesting, indexedRepos = [], onSelectRepo }) {
  const [prefilledUrl, setPrefilledUrl] = useState('');

  // Example pills
  const examples = [
    { label: 'vercel/next.js', url: 'https://github.com/vercel/next.js' },
    { label: 'facebook/react', url: 'https://github.com/facebook/react' },
    { label: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi' }
  ];

  const handleChipClick = (url) => {
    // Determine if already indexed in slugs
    const slugMatch = url.split('/').slice(-2).join('_').replace('.git', '');
    if (indexedRepos.includes(slugMatch)) {
      onSelectRepo(slugMatch);
    } else {
      // Direct ingest with null token
      onIngest(url, null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between select-none">
  {/* Top Navbar */}
  <nav className="w-full border-b border-borderLight bg-white px-6 py-3 flex items-center">
    <div className="flex items-center gap-2">
      <span className="text-base font-bold tracking-tight text-textPrimary font-sans">RepoChat</span>
    </div>
  </nav>

      {/* Centered Hero Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-4xl mx-auto w-full py-16">
        <div className="text-center space-y-6 w-full">
          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-textPrimary leading-tight">
            Chat with any GitHub Repository
          </h1>
          <p className="text-base md:text-lg text-textSecondary max-w-2xl mx-auto font-sans leading-relaxed">
            Understand codebases instantly using AI-powered semantic search. Paste a repository URL below to begin.
          </p>

          {/* input component wrapper */}
          <div className="max-w-2xl mx-auto w-full pt-4">
            <RepoInput onIngest={onIngest} ingesting={ingesting} />
          </div>

          {/* Quick-start Example Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-textMuted font-sans">Examples:</span>
            {examples.map((item) => (
              <button
                key={item.label}
                disabled={ingesting}
                onClick={() => handleChipClick(item.url)}
                className="text-xs font-mono px-3 py-1 border border-borderLight rounded-full bg-white text-textSecondary
                           hover:bg-accent hover:text-white hover:border-accent active:scale-[0.96] transition-all"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-20 border-t border-borderLight pt-16">
          <div className="bg-surface border-t-2 border-t-accent rounded-b-md p-5 border-x border-b border-borderLight shadow-premium flex flex-col items-start gap-3">
            <FiCode className="h-5 w-5 text-textPrimary" />
            <h3 className="text-sm font-bold text-textPrimary font-sans">
              AST-Aware Chunking
            </h3>
            <p className="text-xs text-textSecondary leading-normal">
              Extracts semantic code nodes (functions, classes, components) in Python and JS/TS for precise structural relevance.
            </p>
          </div>

          <div className="bg-surface border-t-2 border-t-accent rounded-b-md p-5 border-x border-b border-borderLight shadow-premium flex flex-col items-start gap-3">
            <FiSearch className="h-5 w-5 text-textPrimary" />
            <h3 className="text-sm font-bold text-textPrimary font-sans">
              Semantic Search
            </h3>
            <p className="text-xs text-textSecondary leading-normal">
              Uses embedding vectors to retrieve context chunks corresponding to natural language queries.
            </p>
          </div>

          <div className="bg-surface border-t-2 border-t-accent rounded-b-md p-5 border-x border-b border-borderLight shadow-premium flex flex-col items-start gap-3">
            <FiMessageSquare className="h-5 w-5 text-textPrimary" />
            <h3 className="text-sm font-bold text-textPrimary font-sans">
              Streaming Responses
            </h3>
            <p className="text-xs text-textSecondary leading-normal">
              Streams responses token-by-token using SSE directly from Claude, displaying precise line citations.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-borderLight py-6 text-center select-none bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-textMuted">
          <span>&copy; {new Date().getFullYear()} RepoChat. All rights reserved.</span>
          <a
            href="https://github.com/princekjha-dev/RepoChat.git"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-textPrimary transition-colors"
          >
            GitHub Project Link
          </a>
        </div>
      </footer>
    </div>
  );
}
