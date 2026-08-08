'use client';

/**
 * =============================================================================
 * AUDITS PAGE
 * =============================================================================
 * 
 * Main audits list page with filters, table, and pagination.
 * 
 * FEATURES:
 * - Search by title
 * - Multi-status filter
 * - Multi-type filter
 * - Filter by process, my role, my view
 * - Paginated results (10 per page)
 * - Permission-based UI
 */

import { Plus } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

import { useAudits } from '@/lib/hooks/useAudits';
import { useAuditFilters } from '@/lib/hooks/useAuditFilters';

import AuditFilters from '@/components/audits/AuditFilters';
import AuditsTable from '@/components/audits/AuditsTable';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function AuditsPage() {
  // ========================================
  // ROUTING & AUTH
  // ========================================

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();

  // ========================================
  // FILTERS
  // ========================================

  const { filters, setFilter, clearFilters } = useAuditFilters();

  // ========================================
  // PAGE NUMBER (from URL)
  // ========================================

  /**
   * Page is stored in URL query params
   * URL is the single source of truth
   * 
   * Example: /audits?page=2&search=ISO&status=in_progress
   */
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // ========================================
  // FETCH AUDITS (Combine filters + page)
  // ========================================

  /**
   * Fetch audits with both filters and page
   * 
   * Spread filters, then add page separately
   */
  const { audits, pagination, isLoading, error, refetch } = useAudits({
    ...filters,
    page: currentPage,
    limit: 10
  });

  // ========================================
  // PAGINATION HELPER
  // ========================================

  /**
   * Update page number in URL
   * 
   * When URL changes:
   * - currentPage updates
   * - useAudits refetches with new page
   * - Component re-renders with new data
   */
  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // ========================================
  // LOADING STATE (Auth check)
  // ========================================

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // NOT AUTHENTICATED
  // ========================================

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorMessage message="Please log in to view audits" />
      </div>
    );
  }

  // ========================================
  // PERMISSION CHECK
  // ========================================

  /**
   * Check if user can create audits
   * Only Quality Manager and Process Owner can create
   */
  const canCreateAudit = user.role === 'quality_manager' || user.role === 'process_owner';

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6 p-6">

      {/* ========================================
          PAGE HEADER
          ======================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audits</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track internal and external audits
          </p>
        </div>

        {/* Create Audit Button - Only for QM and PO */}
        {canCreateAudit && (
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => {
              router.push('/audits/create');
            }}
          >
            <Plus className="h-4 w-4" />
            Create Audit
          </Button>
        )}
      </div>

      {/* ========================================
          FILTERS
          ======================================== */}
      <AuditFilters
        filters={filters}
        onFilterChange={(key, value) => {
          setFilter(key, value);
          setPage(1);  // Reset to page 1 when filter changes
        }}
        onClearFilters={() => {
          clearFilters();
          setPage(1);  // Reset to page 1 when clearing filters
        }}
        className="bg-white p-4 rounded-lg shadow"
      />

      {/* ========================================
          ERROR STATE
          ======================================== */}
      {error && (
        <ErrorMessage message={error} />
      )}

      {/* ========================================
          AUDITS TABLE
          ======================================== */}
      <AuditsTable
        audits={audits}
        isLoading={isLoading}
      />

      {/* ========================================
          PAGINATION
          ======================================== */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          pagination={pagination}
          onPageChange={setPage}  // Only update page, NOT filters
          isLoading={isLoading}
        />
      )}
    </div>
  );
}