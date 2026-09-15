import { useMemo, useState } from 'react';

/**
 * Client-side pagination state + helpers. For server-paginated endpoints, pass
 * `total` from the API response and use `page` to build the next request.
 *
 * const p = usePagination({ total: 132, pageSize: 20 });
 * // p.page, p.pageSize, p.totalPages, p.next(), p.prev(), p.setPage(3)
 *
 * For pure client-side slicing:
 * const paged = p.slice(rows);
 */
export function usePagination({ total = 0, pageSize = 20, initialPage = 1 } = {}) {
  const [page, setPage] = useState(initialPage);
  const [size, setSize] = useState(pageSize);

  const totalPages = Math.max(1, Math.ceil((total || 0) / size));
  const clampedPage = Math.min(Math.max(1, page), totalPages);

  const canPrev = clampedPage > 1;
  const canNext = clampedPage < totalPages;

  const next = () => canNext && setPage(clampedPage + 1);
  const prev = () => canPrev && setPage(clampedPage - 1);
  const goTo = (n) => setPage(Math.min(Math.max(1, n), totalPages));
  const reset = () => setPage(1);

  const slice = useMemo(() => {
    return (rows) => {
      if (!Array.isArray(rows)) return [];
      const start = (clampedPage - 1) * size;
      return rows.slice(start, start + size);
    };
  }, [clampedPage, size]);

  return {
    page: clampedPage,
    pageSize: size,
    totalPages,
    canNext,
    canPrev,
    next,
    prev,
    setPage: goTo,
    setPageSize: setSize,
    reset,
    slice,
  };
}
