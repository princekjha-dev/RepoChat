import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CopyButton from '../common/CopyButton';
import { FiUser, FiCpu } from 'react-icons/fi';
import { memo } from 'react';

/**
 * Message bubble with markdown rendering, syntax highlighting,
 * and copy-to-clipboard on code blocks.
 */
function MessageBubble({ message, isDark = true }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl
          ${isUser
            ? 'bg-surface-950 dark:bg-white text-white dark:text-black'
            : message.isError
              ? 'bg-red-500/20 text-red-400'
              : 'dark:bg-surface-800 dark:text-surface-300 bg-surface-100 text-surface-700'
          }`}
      >
        {isUser ? <FiUser className="h-4 w-4" /> : <FiCpu className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={`max-w-[85%] lg:max-w-3xl ${isUser ? 'text-right' : ''}`}>
        {/* Label */}
        <p className={`mb-1 text-xs font-medium
          ${isUser ? 'dark:text-surface-400 text-surface-500' : 'dark:text-brand-400 text-brand-600'}`}>
          {isUser ? 'You' : 'RepoChat'}
        </p>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
            ${isUser
              ? 'bg-brand-600 text-white rounded-tr-md'
              : message.isError
                ? 'dark:bg-red-500/10 dark:border-red-500/20 bg-red-50 border border-red-200 rounded-tl-md dark:text-red-200 text-red-700'
                : 'dark:bg-surface-800/80 dark:text-surface-100 bg-surface-100 text-surface-800 rounded-tl-md'
            }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content || message.text || ''}</p>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeStr = String(children).replace(/\n$/, '');
                    const isInline = !match && !codeStr.includes('\n');

                    if (!isInline && match) {
                      return (
                        <div className="relative group my-3">
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <CopyButton text={codeStr} />
                          </div>
                          <SyntaxHighlighter
                            style={isDark ? oneDark : oneLight}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              borderRadius: '0.75rem',
                              fontSize: '0.8rem',
                              padding: '1rem',
                              margin: 0,
                            }}
                            {...props}
                          >
                            {codeStr}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }

                    if (!isInline) {
                      return (
                        <div className="relative group my-3">
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <CopyButton text={codeStr} />
                          </div>
                          <SyntaxHighlighter
                            style={isDark ? oneDark : oneLight}
                            language="text"
                            PreTag="div"
                            customStyle={{
                              borderRadius: '0.75rem',
                              fontSize: '0.8rem',
                              padding: '1rem',
                              margin: 0,
                            }}
                            {...props}
                          >
                            {codeStr}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content || message.text || ''}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Source References */}
        {!isUser && message.sources?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sources.map((source, index) => (
              <span
                key={`${source.file}-${index}`}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium
                           dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700
                           bg-surface-100 text-surface-600 hover:bg-surface-200
                           transition-colors cursor-default"
                title={`${source.file}${source.start_line ? ` (L${source.start_line}-L${source.end_line})` : ''}`}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                {source.file.split('/').pop()}
                {source.start_line && (
                  <span className="dark:text-surface-500 text-surface-400">
                    :L{source.start_line}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
