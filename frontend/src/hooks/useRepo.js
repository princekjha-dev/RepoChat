import { useState, useCallback, useEffect } from 'react';
import { listRepos, ingestRepo, getRepoDetails, deleteRepo as apiDeleteRepo } from '../services/api';
import { useLocalStorage } from './useLocalStorage';

/**
 * Repository management hook.
 * Handles listing, ingesting, selecting, and tracking recent repos.
 */
export function useRepo() {
  const [repos, setRepos] = useState([]);
  const [repoDetails, setRepoDetails] = useState(null);
  const [activeRepo, setActiveRepo] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [recentRepos, setRecentRepos] = useLocalStorage('repochat-recent', []);

  // Load repos on mount
  const loadRepos = useCallback(async () => {
    try {
      const data = await listRepos();
      setRepos(data.repos || []);
      setActiveRepo((current) => {
        if (data.repos?.length && !current) {
          return data.repos[0];
        }
        return current;
      });
    } catch (error) {
      console.error('Failed to load repos:', error);
    }
  }, []);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // Load details when active repo changes
  useEffect(() => {
    if (!activeRepo) {
      setRepoDetails(null);
      return;
    }

    getRepoDetails(activeRepo)
      .then(setRepoDetails)
      .catch(() => setRepoDetails(null));
  }, [activeRepo]);

  // Ingest a new repo
  const ingest = useCallback(
    async (repoUrl, force = false) => {
      setIngesting(true);
      setIngestError('');

      try {
        const result = await ingestRepo(repoUrl, force);
        const slug = result.slug;

        if (slug) {
          setActiveRepo(slug);

          // Update recent repos
          setRecentRepos((prev) => {
            const filtered = prev.filter((r) => r.slug !== slug);
            return [{ slug, url: repoUrl, indexedAt: new Date().toISOString() }, ...filtered].slice(0, 10);
          });
        }

        await loadRepos();
        return result;
      } catch (error) {
        setIngestError(error.message);
        throw error;
      } finally {
        setIngesting(false);
      }
    },
    [loadRepos, setRecentRepos]
  );

  // Select a repo
  const selectRepo = useCallback((slug) => {
    setActiveRepo(slug);
    setIngestError('');
  }, []);

  // Delete a repo
  const removeRepo = useCallback(
    async (slug) => {
      try {
        await apiDeleteRepo(slug);
        if (activeRepo === slug) {
          setActiveRepo('');
          setRepoDetails(null);
        }
        await loadRepos();
      } catch (error) {
        console.error('Failed to delete repo:', error);
      }
    },
    [activeRepo, loadRepos]
  );

  return {
    repos,
    activeRepo,
    repoDetails,
    ingesting,
    ingestError,
    recentRepos,
    ingest,
    selectRepo,
    removeRepo,
    loadRepos,
  };
}
