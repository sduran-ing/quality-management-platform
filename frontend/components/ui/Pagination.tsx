/**
 * =============================================================================
 * PAGINATION COMPONENT
 * =============================================================================
 * 
 * Displays pagination controls for document list.
 * 
 * - Previous/Next buttons
 * - Page number display
 * - Total count display
 * - First/Last page buttons (desktop only)
 * 
 */

import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';
import { Pagination as PaginationType } from '@/lib/api/documents';

interface PaginationProps {
  
  pagination: PaginationType;       // Pagination metadata from backend
  onPageChange: (page: number) => void;     // Callback when page changes
  isLoading?: boolean;      // Loading state (disable buttons while loading)
}

export default function Pagination({ 
  pagination, 
  onPageChange, 
  isLoading = false 
}: PaginationProps) {
  const { page, totalPages, total, hasMore } = pagination;

  /**
   * Calculate page range to show
   * 
   * PATTERN: Show 5 pages at a time
   * Examples:
   * - Page 1: [1] 2 3 4 5
   * - Page 3: 1 2 [3] 4 5
   * - Page 8 (of 10): 6 7 [8] 9 10
   */
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    // Calculate start and end of visible range
    let start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    // Build array of page numbers
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Shared button styles
  const buttonBaseStyles = `
    relative inline-flex items-center px-2 py-2 
    text-gray-400 ring-1 ring-inset ring-gray-300 
    hover:bg-gray-50 focus:z-20 focus:outline-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const pageNumberStyles = (isActive: boolean) => `
    relative inline-flex items-center px-4 py-2 text-sm font-semibold
    ${isActive
      ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
    }
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      
      {/* ========================================
          MOBILE VIEW: Simple Previous/Next
          ======================================== */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          className="relative inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore || isLoading}
          className="relative inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ========================================
          DESKTOP VIEW: Full Pagination
          ======================================== */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        
        {/* Total count display */}
        <div>
          <p className="text-sm text-gray-700">
            Showing page <span className="font-medium">{page}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
            {' '}({total} total results)
          </p>
        </div>

        {/* Page controls */}
        <div>
          <nav 
            className="isolate inline-flex -space-x-px rounded-md shadow-sm" 
            aria-label="Pagination"
          >
            
            {/* First page button */}
            <button
              onClick={() => onPageChange(1)}
              disabled={page === 1 || isLoading}
              className={`${buttonBaseStyles} rounded-l-md`}
              aria-label="First page"
            >
              <ChevronsLeft className="h-5 w-5" />
            </button>

            {/* Previous page button */}
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || isLoading}
              className={buttonBaseStyles}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Page number buttons */}
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={pageNumberStyles(pageNum === page)}
                aria-label={`Page ${pageNum}`}
                aria-current={pageNum === page ? 'page' : undefined}
              >
                {pageNum}
              </button>
            ))}

            {/* Next page button */}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore || isLoading}
              className={buttonBaseStyles}
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Last page button */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages || isLoading}
              className={`${buttonBaseStyles} rounded-r-md`}
              aria-label="Last page"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
            
          </nav>
        </div>
      </div>
    </div>
  );
}