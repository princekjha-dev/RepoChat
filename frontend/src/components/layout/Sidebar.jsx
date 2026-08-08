import { FiTrash2, FiClock, FiChevronLeft, FiPlus } from 'react-icons/fi';
import RepoInput from '../repo/RepoInput';
import { formatSlug } from '../../utils/helpers';

/**
 * Left sidebar — repo list, recent repos, repo input.
 */
function Sidebar({
  repos,
  activeRepo,
  recentRepos,
  ingesting,
  onIngest,
  onSelectRepo,
  onDeleteRepo,
  collapsed,
  onToggle,
}) {
  return (
    <aside
      className={`flex flex-col border-r transition-all duration-300
                  dark:border-surface-800 dark:bg-surface-900/60
                  border-surface-200 bg-surface-50/60
                  ${collapsed ? 'w-0 overflow-hidden border-0' : 'w-72 lg:w-80'}`}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Repo Input */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider
                         dark:text-surface-400 text-surface-500">
            Index Repository
          </h3>
          <RepoInput onIngest={onIngest} ingesting={ingesting} />
        </div>

        {/* Indexed Repos */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider
                         dark:text-surface-400 text-surface-500">
            Repositories
          </h3>
          {repos.length === 0 ? (
            <p className="text-xs dark:text-surface-500 text-surface-400 italic">
              No repositories indexed yet.
            </p>
          ) : (
            <div className="space-y-1">
              {repos.map((slug) => (
                <div
                  key={slug}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5
                              transition-all cursor-pointer
                              ${activeRepo === slug
                                ? 'dark:bg-surface-700/40 dark:text-surface-100 bg-surface-200/50 text-surface-900 border dark:border-surface-600/20 border-surface-400/20'
                                : 'dark:hover:bg-surface-800 hover:bg-surface-100 dark:text-surface-300 text-surface-600'
                              }`}
                  onClick={() => onSelectRepo(slug)}
                >
                  <span className="truncate text-sm font-medium">{formatSlug(slug)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRepo(slug);
                    }}
                    className="opacity-0 group-hover:opacity-100 rounded-md p-1
                               dark:hover:bg-surface-700 hover:bg-surface-200
                               transition-all"
                    title="Remove repository"
                  >
                    <FiTrash2 className="h-3.5 w-3.5 dark:text-surface-400 text-surface-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Repos */}
        {recentRepos.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider
                           dark:text-surface-400 text-surface-500">
              <FiClock className="h-3 w-3" />
              Recent
            </h3>
            <div className="space-y-1">
              {recentRepos.slice(0, 5).map((r) => (
                <button
                  key={r.slug}
                  onClick={() => onSelectRepo(r.slug)}
                  className="w-full rounded-lg px-3 py-1.5 text-left text-xs truncate
                             transition-colors
                             dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200
                             text-surface-500 hover:bg-surface-100 hover:text-surface-700"
                >
                  {formatSlug(r.slug)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
