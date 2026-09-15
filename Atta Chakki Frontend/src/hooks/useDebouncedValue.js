import { useEffect, useState } from 'react';

/**
 * Debounce a fast-changing value (e.g. a search input) so downstream effects run
 * only after the user pauses typing.
 *
 * Usage:
 *   const [q, setQ] = useState('');
 *   const debouncedQ = useDebouncedValue(q, 300);
 *   useEffect(() => { search(debouncedQ); }, [debouncedQ]);
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
