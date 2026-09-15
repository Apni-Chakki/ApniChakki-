import { useState, useEffect, useCallback, useRef } from 'react';
import { getCached, setCache, invalidateCache } from '../utils/apiCache';

/**
 * Custom Stale-While-Revalidate (SWR) hook for instant cached rendering
 * with automatic background data synchronization.
 *
 * @param {string} cacheKey - Unique cache key identifier
 * @param {string|function} urlOrFetcher - API URL string or custom async fetcher function
 * @param {object} options - Configuration options
 * @param {number} options.ttlSeconds - Cache TTL in seconds (default: 300)
 * @param {boolean} options.revalidateOnMount - Revalidate from network on mount (default: true)
 * @param {any} options.initialData - Fallback data when cache is empty
 * @returns {{ data: any, loading: boolean, error: any, isValidating: boolean, mutate: Function, refetch: Function }}
 */
export function useCachedApi(cacheKey, urlOrFetcher, options = {}) {
  const {
    ttlSeconds = 300,
    revalidateOnMount = true,
    initialData = null,
  } = options;

  // 1. Synchronously read from cache for 0ms initial render
  const cachedValue = typeof window !== 'undefined' ? getCached(cacheKey, ttlSeconds) : null;

  const [data, setData] = useState(cachedValue !== null ? cachedValue : initialData);
  const [loading, setLoading] = useState(cachedValue === null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (isManualRefetch = false) => {
      if (!urlOrFetcher) return;

      if (!cachedValue || isManualRefetch) {
        setIsValidating(true);
      }

      try {
        let result;
        if (typeof urlOrFetcher === 'function') {
          result = await urlOrFetcher();
        } else {
          const res = await fetch(urlOrFetcher);
          if (!res.ok) throw new Error(`API error HTTP ${res.status}`);
          result = await res.json();
        }

        if (isMountedRef.current) {
          setData(result);
          setError(null);
          setLoading(false);
          setIsValidating(false);
          // Update cache
          setCache(cacheKey, result);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
          setLoading(false);
          setIsValidating(false);
        }
      }
    },
    [cacheKey, urlOrFetcher, cachedValue]
  );

  useEffect(() => {
    if (revalidateOnMount) {
      fetchData();
    }
  }, [fetchData, revalidateOnMount]);

  /**
   * Optimistic local data update + cache write
   */
  const mutate = useCallback(
    (nextData, shouldRevalidate = false) => {
      const updated = typeof nextData === 'function' ? nextData(data) : nextData;
      setData(updated);
      setCache(cacheKey, updated);

      if (shouldRevalidate) {
        fetchData(true);
      }
    },
    [cacheKey, data, fetchData]
  );

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    error,
    isValidating,
    mutate,
    refetch,
    invalidate: () => invalidateCache(cacheKey),
  };
}

export default useCachedApi;
