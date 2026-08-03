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

  // Handle page change with auto scroll-to-top
  const handlePageChange = (newPage) => {
    if (!onPageChange || newPage === validCurrentPage || newPage < 1 || newPage > totalPages) return;
    onPageChange(newPage);

    // Auto scroll smoothly to the top of window and admin container
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const adminContainer = document.querySelector('.admin-main-inner');
    if (adminContainer) {
      adminContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate exact visible page numbers without extra empty ovals
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, validCurrentPage - 2);
      let end = Math.min(totalPages, validCurrentPage + 2);

      if (validCurrentPage <= 3) {
        start = 1;
        end = maxVisible;
      } else if (validCurrentPage >= totalPages - 2) {
        start = totalPages - 4;
        end = totalPages;
      }

      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  if (totalItems <= 0 || totalPages <= 1) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 bg-card border border-border rounded-xl text-sm shadow-sm ${className}`}>
      {/* Item Range Summary & Page Size Select */}
      <div className="flex items-center gap-3 text-muted-foreground text-xs sm:text-sm flex-wrap">
        <span>
          Showing <strong className="text-foreground font-bold">{startItem}</strong> to{' '}
          <strong className="text-foreground font-bold">{endItem}</strong> of{' '}
          <strong className="text-foreground font-bold">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-1">
            <label htmlFor="pageSizeSelect" className="text-xs">Show:</label>
            <select
              id="pageSizeSelect"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                handlePageChange(1);
              }}
              className="bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={validCurrentPage === 1}
          className="h-8 w-8 min-h-0 min-w-[32px] p-0 flex items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="h-4 w-4 shrink-0" />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => handlePageChange(validCurrentPage - 1)}
          disabled={validCurrentPage === 1}
          className="h-8 w-8 min-h-0 min-w-[32px] p-0 flex items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
        </button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum) => {
            const isActive = pageNum === validCurrentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => handlePageChange(pageNum)}
                className={`h-8 w-8 min-h-0 min-w-[32px] p-0 flex items-center justify-center text-xs rounded-lg font-bold transition-all ${
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

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => handlePageChange(validCurrentPage + 1)}
          disabled={validCurrentPage === totalPages}
          className="h-8 w-8 min-h-0 min-w-[32px] p-0 flex items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={validCurrentPage === totalPages}
          className="h-8 w-8 min-h-0 min-w-[32px] p-0 flex items-center justify-center rounded-lg border border-input bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
