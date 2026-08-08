'use client';

/**
 * =============================================================================
 * OBSOLETE DOCUMENTS PAGE
 * =============================================================================
 * 
 * Shows documents "outdated" and "obsolete" for all users
 * 
 * FEATURES:
 * - Paginated results (10 per page)
 * - Context-aware actions
 * - Permission-based UI
 */

import { FileText } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';  // For page navigation
import { useAuth } from '@/lib/contexts/AuthContext';   // Import useAuth to access and use context

import { useDocuments } from '@/lib/hooks/useDocuments';
import { useDocumentFilters } from '@/lib/hooks/useDocumentFilters';

import DocumentsTable from '@/components/documents/DocumentsTable';
import Pagination from '@/components/ui/Pagination';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import DocumentFilters from '@/components/documents/DocumentFilters';

import { DocumentAction } from '@/components/documents/DocumentActions';
import { DocumentVersion, getDownloadUrl } from '@/lib/api/documents';

export default function PendingDocumentsPage() {
    // ========================================
    // ROUTING & AUTH
    // ========================================

    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: isAuthLoading } = useAuth();

    // ========================================
    // FILTERS
    // ========================================

    const { filters, setFilter, clearFilters } = useDocumentFilters();

    // ========================================
    // PAGE NUMBER (from URL)
    // ========================================

    /**
     * Page is stored in URL query params
     * URL is the single source of truth
     * 
     * Example: /pending?page=2
     */
    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    // ========================================
    // FETCH DOCUMENTS (with role-based filter)
    // ========================================

    /**
     * Fetch pending documents with role-based filtering
     * 
     * FILTERS:
     * - status: ['outdated', 'obsolete']
     * - Also includes search, process, department, type filters
     */
    const { versions, pagination, isLoading, error, refetch } = useDocuments({
        ...filters,  // Spread all filters (search, process, department, type)
        // Only set default status if user hasn't selected any from the filters
        status: filters.status || ['outdated', 'obsolete'],
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
     * - useDocuments refetches with new page
     * - Component re-renders with new data
     */
    const setPage = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`?${params.toString()}`, { scroll: false });
    };

    // ========================================
    // ACTION HANDLER
    // ========================================

    const handleDocumentAction = async (
        action: DocumentAction,
        version: DocumentVersion
    ) => {
        try {
            switch (action) {

                // View Details
                case 'view':
                    window.location.href = `/documents/${version.documentId}/versions/${version.versionId}`;
                    break;

                // Download Document
                case 'download':
                    const urlResponse = await getDownloadUrl(
                        version.documentId,
                        version.versionId
                    );

                    if (urlResponse.success) {
                        // Open download URL in new tab
                        window.open(urlResponse.data.downloadUrl, '_blank');
                    }
                    break;

                default:
                    console.warn(`Unhandled action: ${action}`);
            }
        } catch (error: any) {
            console.error('Action failed:', error);

            // Show error message
            const errorMessage = error.response?.data?.message || error.message || 'Action failed';
            alert(`Error: ${errorMessage}`);
        }
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
                <ErrorMessage message="Please log in to view obsolete documents" />
            </div>
        );
    }

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
                    <h1 className="text-2xl font-semibold text-gray-900">Obsolete Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            All unavailable documents
          </p>
                </div>
            </div>

            {/* ========================================
                FILTERS
                ======================================== */}
            <DocumentFilters
                filters={filters}
                onFilterChange={(key, value) => {
                    setFilter(key, value);
                    setPage(1);  // Reset to page 1 when filter changes
                }}
                onClearFilters={() => {
                    clearFilters();
                    setPage(1);  // Reset to page 1 when clearing filters
                }}
                allowedStatuses={['outdated', 'obsolete']}
                className="bg-white p-4 rounded-lg shadow"
            />

            {/* ========================================
          ERROR STATE
          ======================================== */}
            {error && (
                <ErrorMessage message={error} />
            )}

            {/* ========================================
          EMPTY STATE
          ======================================== */}
            {!isLoading && !error && versions.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No obsolete documents
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {user.role === 'quality_manager'
                            ? 'There are no documents requiring action at this time.'
                            : 'You have no pending documents or approvals.'
                        }
                    </p>
                </div>
            )}

            {/* ========================================
          DOCUMENTS TABLE
          ======================================== */}
            {(isLoading || versions.length > 0) && (
                <DocumentsTable
                    versions={versions}
                    userRole={user.role as 'quality_manager' | 'process_owner' | 'employee'}
                    userId={user.id}
                    onActionSelect={handleDocumentAction}
                    isLoading={isLoading}
                />
            )}            

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