import { useCallback, useEffect, useRef, useState } from 'react';

// fetch on mount, gives back {data, loading, error, refetch}
// fetcher must return apiClient's {ok, data, error} shape
// pass {immediate: false} for lazy fetch (call refetch on click)
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
