import { type FC, useMemo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Generates a list of page numbers to display, inserting ellipsis
 * markers (represented as -1) when the range is too large.
 */
function getPageNumbers(current: number, total: number): (number | -1)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | -1)[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push(-1);
  }

  // Window around current page
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(-1);
  }

  // Always show last page
  pages.push(total);

  return pages;
}

const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const baseButtonClasses =
    'min-w-8 h-8 inline-flex items-center justify-center rounded text-[0.8125rem] font-medium transition-colors duration-150';

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-t border-[rgba(34,21,13,0.10)] flex-wrap gap-2 ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Showing info */}
      <span className="text-[0.8125rem] text-[#7d6b5d]">
        Showing {startItem}–{endItem} of {totalItems}
      </span>

      <div className="flex items-center gap-1">
        {/* Items per page selector */}
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 text-[0.8125rem] border border-[rgba(34,21,13,0.15)] rounded bg-transparent pr-8 pl-2 text-[#5c4a3e] mr-3 cursor-pointer focus:outline-none focus:border-brown-500 appearance-none"
            aria-label="Items per page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} per page
              </option>
            ))}
          </select>
        )}

        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`
            ${baseButtonClasses}
            px-3 gap-1
            text-[#5c4a3e]
            hover:bg-[rgba(34,21,13,0.06)] hover:text-[#22150d]
            disabled:text-[rgba(34,21,13,0.25)] disabled:pointer-events-none
            cursor-pointer disabled:cursor-not-allowed
          `}
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page === -1) {
            return (
              <span
                key={`ellipsis-${index}`}
                className={`${baseButtonClasses} text-[rgba(34,21,13,0.25)] pointer-events-none`}
                aria-hidden="true"
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              disabled={isActive}
              className={`
                ${baseButtonClasses}
                cursor-pointer
                ${isActive
                  ? 'bg-[#22150d] text-[#f9f0d9] font-semibold'
                  : 'text-[#5c4a3e] hover:bg-[rgba(34,21,13,0.06)] hover:text-[#22150d]'
                }
              `}
              aria-label={`Page ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`
            ${baseButtonClasses}
            px-3 gap-1
            text-[#5c4a3e]
            hover:bg-[rgba(34,21,13,0.06)] hover:text-[#22150d]
            disabled:text-[rgba(34,21,13,0.25)] disabled:pointer-events-none
            cursor-pointer disabled:cursor-not-allowed
          `}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
