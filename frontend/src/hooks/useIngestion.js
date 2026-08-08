import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ingestRepo, getIngestStatus, cancelIngest, listRepos } from '../services/api';

export function useIngestion() {
  const activeTask = useStore((state) => state.activeTask);
  const setActiveTask = useStore((state) => state.setActiveTask);
  const updateActiveTask = useStore((state) => state.updateActiveTask);
  const clearActiveTask = useStore((state) => state.clearActiveTask);
  const setRepos = useStore((state) => state.setRepos);
  const setActiveRepo = useStore((state) => state.setActiveRepo);

  const pollIntervalRef = useRef(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const pollStatus = (slug) => {
    stopPolling();
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await getIngestStatus(slug);
        
        updateActiveTask({
          status: data.status,
          progress: data.progress,
          processed_files: data.processed_files,
          total_files: data.total_files,
          error: data.error,
        });

        if (data.status === 'completed') {
          stopPolling();
          // Ingestion completed! Refresh repos list
          const reposList = await listRepos();
          setRepos(reposList.repos || []);
          setActiveRepo(slug);
          setTimeout(() => clearActiveTask(), 5000); // Clear task banner after 5s
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          stopPolling();
          const reposList = await listRepos();
          setRepos(reposList.repos || []);
          setTimeout(() => clearActiveTask(), 10000); // Keep error visible for 10s
        }
      } catch (err) {
        console.error('Error polling status:', err);
        stopPolling();
        updateActiveTask({
          status: 'failed',
          error: err.message || 'Failed to fetch indexing status.',
        });
        setTimeout(() => clearActiveTask(), 10000);
      }
    }, 1000);
  };

  const startIngestion = async (repoUrl, force = false) => {
    clearActiveTask();
    
    try {
      const data = await ingestRepo(repoUrl, force);
      
      const slug = data.slug;
      
      if (data.status === 'completed') {
        // Already indexed and not forced
        const reposList = await listRepos();
        setRepos(reposList.repos || []);
        setActiveRepo(slug);
        return { success: true, slug, alreadyIndexed: true };
      }
      
      // Indexing queued in background
      setActiveTask({
        slug,
        status: data.status || 'pending',
        progress: 0,
        processed_files: 0,
        total_files: 0,
        error: null,
      });

      pollStatus(slug);
      return { success: true, slug, alreadyIndexed: false };
    } catch (err) {
      console.error('Failed to start ingestion:', err);
      setActiveTask({
        slug: 'unknown',
        status: 'failed',
        progress: 0,
        processed_files: 0,
        total_files: 0,
        error: err.message || 'Failed to start repository indexing.',
      });
      return { success: false, error: err.message };
    }
  };

  const cancelIngestion = async (slug) => {
    try {
      stopPolling();
      await cancelIngest(slug);
      updateActiveTask({
        status: 'cancelled',
        progress: 100,
        error: 'Cancelled by user',
      });
      const reposList = await listRepos();
      setRepos(reposList.repos || []);
      setTimeout(() => clearActiveTask(), 3000);
      return true;
    } catch (err) {
      console.error('Failed to cancel ingestion:', err);
      // Restart polling since cancel failed or task finished
      pollStatus(slug);
      return false;
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  return {
    startIngestion,
    cancelIngestion,
    activeTask,
  };
}
