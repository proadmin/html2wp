import { useState, useEffect, useCallback } from 'react';
import { getJobStatus, type JobStatus } from '../api/client';

export function useJobStatus(jobId: string | null, pollInterval = 2000) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      const data = await getJobStatus(jobId);
      setStatus(data);
      setError(null);

      if (data.status === 'complete' || data.status === 'error') {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchStatus();

    if (!jobId) return;

    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [jobId, pollInterval, fetchStatus]);

  return { status, error, loading };
}
