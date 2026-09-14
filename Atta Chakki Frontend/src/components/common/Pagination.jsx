import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  className = ''
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  const handlePageChange = (newPage) => {
    if (!onPageChange || newPage === validCurrentPage || newPage < 1 || newPage > totalPages) return;
    onPageChange(newPage);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    const adminContainer = document.querySelector('.admin-main-inner');
    if (adminContainer) {
      adminContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers with different windows for mobile/desktop
  const getPageNumbers = (maxVisible) => {
    const pages = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, validCurrentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const mobilePages = getPageNumbers(3);
  const desktopPages = getPageNumbers(5);

  if (totalItems <= 0 || totalPages <= 1) return null;

  const navBtn = "h-8 w-8 min-w-[32px] p-0 flex items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 bg-card border border-border rounded-xl text-xs sm:text-sm shadow-sm ${className}`}>
      {/* Item Range Summary & Page Size Select */}
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-muted-foreground flex-wrap">
        <span className="whitespace-nowrap">
          <span className="hidden sm:inline">Showing </span>
          <strong className="text-foreground font-bold">{startItem}</strong>
          <span className="mx-0.5">–</span>
          <strong className="text-foreground font-bold">{endItem}</strong>
          <span className="mx-1">of</span>
          <strong className="text-foreground font-bold">{totalItems}</strong>
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 shrink-0">
            <label htmlFor="pageSizeSelect" className="text-[11px] sm:text-xs hidden sm:inline">Show:</label>
            <select
              id="pageSizeSelect"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                handlePageChange(1);
              }}
              className="bg-background border border-input rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}/page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
        {/* First Page — desktop only */}
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={validCurrentPage === 1}
          className={`${navBtn} hidden sm:flex`}
          title="First Page"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4 shrink-0" />
        </button>

        {/* Previous */}
        <button
          type="button"
          onClick={() => handlePageChange(validCurrentPage - 1)}
          disabled={validCurrentPage === 1}
          className={navBtn}
          title="Previous Page"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
        </button>

        {/* Numeric Buttons — 3 on mobile, 5 on desktop */}
        <div className="flex items-center gap-1 sm:hidden">
          {mobilePages.map((pageNum) => {
            const isActive = pageNum === validCurrentPage;
            return (
              <button
                key={`m-${pageNum}`}
                type="button"
                onClick={() => handlePageChange(pageNum)}
                className={`h-8 w-8 min-w-[32px] p-0 flex items-center justify-center text-xs rounded-lg font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm border border-primary'
                    : 'bg-background text-foreground hover:bg-accent border border-input'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <div className="hidden sm:flex items-center gap-1">
          {desktopPages.map((pageNum) => {
            const isActive = pageNum === validCurrentPage;
            return (
              <button
                key={`d-${pageNum}`}
                type="button"
                onClick={() => handlePageChange(pageNum)}
                className={`h-8 w-8 min-w-[32px] p-0 flex items-center justify-center text-xs rounded-lg font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm border border-primary'
                    : 'bg-background text-foreground hover:bg-accent border border-input'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={() => handlePageChange(validCurrentPage + 1)}
          disabled={validCurrentPage === totalPages}
          className={navBtn}
          title="Next Page"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>

        {/* Last Page — desktop only */}
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={validCurrentPage === totalPages}
          className={`${navBtn} hidden sm:flex`}
          title="Last Page"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
