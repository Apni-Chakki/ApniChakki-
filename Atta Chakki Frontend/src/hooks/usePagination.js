import { useMemo, useState } from 'react';

// pagination state + helpers, use p.slice(rows) for client-side paging
// or use p.page with a server-paginated api
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
