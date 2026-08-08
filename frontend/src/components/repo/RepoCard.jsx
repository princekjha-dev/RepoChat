import { FiFile, FiBox, FiGlobe, FiClock, FiExternalLink } from 'react-icons/fi';
import { formatSlug, formatFileSize, formatDate, getLanguageColor } from '../../utils/helpers';

/**
 * Rich repository information card.
 */
function RepoCard({ details }) {
  if (!details) return null;

  const topLanguages = Object.entries(details.languages || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="animate-fade-in rounded-2xl border
                    dark:border-surface-700/50 dark:bg-surface-800/50
                    border-surface-200 bg-white
                    p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold dark:text-surface-100 text-surface-800">
            {formatSlug(details.slug)}
          </h3>
          {details.url && (
            <a
              href={details.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 text-xs text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-300 transition-colors"
            >
              <FiExternalLink className="h-3 w-3" />
              View on GitHub
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl dark:bg-surface-900/50 bg-surface-50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs dark:text-surface-400 text-surface-500 mb-1">
            <FiFile className="h-3 w-3" />
            Files
          </div>
          <p className="text-lg font-semibold dark:text-surface-100 text-surface-800">
            {details.file_count || 0}
          </p>
        </div>
        <div className="rounded-xl dark:bg-surface-900/50 bg-surface-50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs dark:text-surface-400 text-surface-500 mb-1">
            <FiBox className="h-3 w-3" />
            Chunks
          </div>
          <p className="text-lg font-semibold dark:text-surface-100 text-surface-800">
            {details.chunk_count || 0}
          </p>
        </div>
        <div className="rounded-xl dark:bg-surface-900/50 bg-surface-50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs dark:text-surface-400 text-surface-500 mb-1">
            <FiGlobe className="h-3 w-3" />
            Size
          </div>
          <p className="text-lg font-semibold dark:text-surface-100 text-surface-800">
            {formatFileSize(details.total_size)}
          </p>
        </div>
        <div className="rounded-xl dark:bg-surface-900/50 bg-surface-50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs dark:text-surface-400 text-surface-500 mb-1">
            <FiClock className="h-3 w-3" />
            Indexed
          </div>
          <p className="text-sm font-medium dark:text-surface-100 text-surface-800 truncate">
            {formatDate(details.indexed_at)}
          </p>
        </div>
      </div>

      {/* Languages */}
      {topLanguages.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium dark:text-surface-400 text-surface-500 uppercase tracking-wider">
            Languages
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topLanguages.map(([lang, count]) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium
                           dark:bg-surface-900/80 dark:text-surface-300
                           bg-surface-100 text-surface-600"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getLanguageColor(lang) }}
                />
                {lang}
                <span className="dark:text-surface-500 text-surface-400">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RepoCard;
