import { useState, useEffect } from 'react';
import { FiFolder, FiFile, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { getRepoFiles } from '../../services/api';
import { getFileIcon } from '../../utils/helpers';
import LoadingSkeleton from '../common/LoadingSkeleton';
import { useStore } from '../../store/useStore';

/**
 * Collapsible file tree explorer for indexed repository files.
 */
function FileExplorer({ slug }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError('');

    getRepoFiles(slug)
      .then((data) => setTree(data.tree))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSkeleton variant="text" count={6} />;
  if (error) return <p className="text-xs dark:text-red-400 text-red-500">{error}</p>;
  if (!tree) return null;

  return (
    <div className="animate-fade-in text-sm select-none">
      <TreeNode name="root" node={tree} isRoot parentPath="" />
    </div>
  );
}

function TreeNode({ name, node, isRoot = false, parentPath = '' }) {
  const [expanded, setExpanded] = useState(isRoot);
  const activeFile = useStore((state) => state.activeFile);
  const setActiveFile = useStore((state) => state.setActiveFile);

  const currentPath = isRoot ? '' : (parentPath ? `${parentPath}/${name}` : name);
  const dirs = Object.entries(node).filter(([key]) => key !== '_files');
  const files = node._files || [];

  if (isRoot && dirs.length === 0 && files.length === 0) {
    return <p className="text-xs dark:text-surface-500 text-surface-400">No files indexed.</p>;
  }

  return (
    <div className={isRoot ? '' : 'ml-3'}>
      {/* Directory */}
      {!isRoot && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left
                     transition-colors dark:hover:bg-surface-800 hover:bg-surface-100"
        >
          {expanded ? (
            <FiChevronDown className="h-3 w-3 dark:text-surface-400 text-surface-500" />
          ) : (
            <FiChevronRight className="h-3 w-3 dark:text-surface-400 text-surface-500" />
          )}
          <FiFolder className={`h-3.5 w-3.5 ${expanded ? 'text-surface-700 dark:text-surface-300' : 'dark:text-surface-400 text-surface-500'}`} />
          <span className="dark:text-surface-300 text-surface-600 text-xs truncate">{name}</span>
        </button>
      )}

      {/* Children */}
      {(expanded || isRoot) && (
        <div className={isRoot ? '' : 'ml-2 border-l dark:border-surface-850 border-surface-200'}>
          {dirs.map(([dirName, dirNode]) => (
            <TreeNode key={dirName} name={dirName} node={dirNode} parentPath={currentPath} />
          ))}
          {files.map((file) => {
            const filePath = currentPath ? `${currentPath}/${file}` : file;
            const isActive = activeFile === filePath;
            return (
              <button
                key={file}
                onClick={() => setActiveFile(isActive ? null : filePath)}
                className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 ml-3 text-left text-xs transition-colors
                           ${isActive 
                             ? 'dark:bg-surface-700/40 dark:text-surface-100 bg-surface-200/50 text-surface-900 font-medium border border-surface-400/20' 
                             : 'dark:text-surface-400 text-surface-500 dark:hover:bg-surface-800 hover:bg-surface-100'}`}
              >
                <span className="text-[10px]">{getFileIcon(file)}</span>
                <span className="truncate">{file}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FileExplorer;
