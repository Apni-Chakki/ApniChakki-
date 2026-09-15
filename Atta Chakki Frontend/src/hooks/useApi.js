import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Standard "fetch on mount + expose loading/error/data" hook.
 * Replaces the `useEffect(() => { setLoading(true); fetch(...).then(...) }, [])`
 * pattern that appears ~50 times across pages/.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(
 *     () => apiGet('/get_all_orders.php', { query: { page } }),
 *     [page]                        // deps — re-run when they change
 *   );
 *
 * `fetcher` MUST return an ApiResult ({ok, data, error}). Use apiClient.js.
 * If you need lazy execution (button click), pass `{immediate: false}` and call refetch().
 */
export function useApi(fetcher, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!immediate);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current({ signal: controller.signal });
      if (controller.signal.aborted) return;
      if (result?.ok) {
        setData(result.data);
        setError(null);
      } else {
        setError(result?.error || 'Something went wrong');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err?.message || 'Something went wrong');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run, setData };
}
