'use client';

/**
 * =============================================================================
 * PENDING DOCUMENTS PAGE
 * =============================================================================
 * 
 * Shows documents pending action based on user role:
 * 
 * QUALITY MANAGER:
 * - All draft documents (to review/manage)
 * - All pending approval documents (to approve)
 * 
 * PROCESS OWNER / EMPLOYEE:
 * - Their own draft documents (to edit/submit)
 * - Pending documents assigned to them for approval (if they're process owner)
 * 
 * FEATURES:
 * - Role-based filtering (myView parameter)
 * - Shows draft and pending_approval statuses
 * - Paginated results (10 per page)
 * - Context-aware actions
 * - Permission-based UI
 */

import { FileText } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';  // For page navigation
import { useAuth } from '@/lib/contexts/AuthContext';   // Import useAuth to access and use context

import { useDocuments } from '@/lib/hooks/useDocuments';
import { useModal } from '@/lib/hooks/useModal';
import { useDocumentFilters } from '@/lib/hooks/useDocumentFilters';

import DocumentsTable from '@/components/documents/DocumentsTable';
import Pagination from '@/components/ui/Pagination';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import DocumentFilters from '@/components/documents/DocumentFilters';


// Modals
import DeleteDraftModal from '@/components/modals/documents/DeleteDraftModal';
import SubmitForApprovalModal from '@/components/modals/documents/SubmitForApprovalModal';
import RejectDocumentModal from '@/components/modals/documents/RejectDocumentModal';
import ApproveDocumentModal from '@/components/modals/documents/ApproveDocumentModal';

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
    // MODALS STATE
    // ========================================

    /**
    * Modals store versionId
    * When modal.data is not null, we know which version to modify
    * The Type is <number> because is going to store the "versionId"
    */
    const deleteModal = useModal<number>();
    const submitModal = useModal<number>();
    const rejectModal = useModal<number>();
    const approveModal = useModal<number>();

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
     * - status: ['draft', 'pending_approval'] - Only show drafts and pending
     * - myView: true - Enable role-based filtering:
     *   - QM: sees all
     *   - Employee/PO: sees only created by them OR assigned to them
     * - Also includes search, process, department, type filters
     */
    const { versions, pagination, isLoading, error, refetch } = useDocuments({
        ...filters,  // Spread all filters (search, process, department, type)
        // Only set default status if user hasn't selected any from the filters
        status: filters.status || ['draft', 'pending_approval'],
        myView: true,
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

                // Edit
                case 'edit':
                    window.location.href = `/documents/${version.documentId}/versions/${version.versionId}/edit`;
                    break;

                // Delete Draft
                case 'delete':
                    // Open the delete modal with the versionId as data
                    deleteModal.open(version.versionId);
                    break;

                // Submit for Approval
                case 'submit':
                    // Open the submit modal with the versionId as data
                    submitModal.open(version.versionId);
                    break;

                // Approve Document
                case 'approve':
                    // Open the approve modal with the versionId as data
                    approveModal.open(version.versionId);
                    break;

                // Reject Document
                case 'reject':
                    rejectModal.open(version.versionId);
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
                <ErrorMessage message="Please log in to view pending documents" />
            </div>
        );
    }

    // ========================================
    // COMPUTE MODAL DATA - Only when needed
    // ========================================
    /** 
     * Search in "versions" array (returned from useDocuments hook)
     * Each version already has document info embedded (code, name, etc.)
   */

    // Find version being deleted
    const versionToDelete = deleteModal.data
        ? versions.find(v => v.versionId === deleteModal.data)
        : null;

    /**
     * Check if this is the only version
     * 
     * We need to count versions for this document
     * Filter versions array by documentId
     */
    const isOnlyVersion = versionToDelete
        ? versions.filter(v => v.documentId === versionToDelete.documentId).length === 1
        : false;

    // Find version being submitted
    const versionToSubmit = submitModal.data
        ? versions.find(v => v.versionId === submitModal.data)
        : null;

    // Reject modal data
    const versionToReject = rejectModal.data
        ? versions.find(v => v.versionId === rejectModal.data)
        : null;

    // Approve modal data
    const versionToApprove = approveModal.data
        ? versions.find(v => v.versionId === approveModal.data)
        : null;

    // Check if there's an approved version for this document
    const hasApprovedVersion = versionToApprove
        ? versions.some(v => v.documentId === versionToApprove.documentId && v.status === 'approved')
        : false;

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

                    <h1 className="text-2xl font-semibold text-gray-900">Pending Documents</h1>

                    <p className="mt-1 text-sm text-gray-500">
                        {user.role === 'quality_manager'
                            ? 'All documents requiring action'
                            : 'Documents you created or are assigned to approve'
                        }
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
                allowedStatuses={['draft', 'pending_approval']}
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
                        No pending documents
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
          MODALS
          ======================================== */}

            {/* Delete Draft Modal */}
            {versionToDelete && (
                <DeleteDraftModal
                    isOpen={deleteModal.isOpen}
                    onClose={deleteModal.close}
                    onSuccess={() => {
                        deleteModal.close();  // Close modal
                        refetch();            // Refresh table
                    }}
                    documentId={versionToDelete.documentId}  // From version object
                    version={versionToDelete}
                    documentCode={versionToDelete.code}      // From version object
                    documentName={versionToDelete.name}      // From version object
                    isOnlyVersion={isOnlyVersion}
                />
            )}

            {/* Submit for Approval Modal */}
            {versionToSubmit && (
                <SubmitForApprovalModal
                    isOpen={submitModal.isOpen}
                    onClose={submitModal.close}
                    onSuccess={() => {
                        submitModal.close();
                        refetch();
                    }}
                    documentId={versionToSubmit.documentId}
                    version={versionToSubmit}
                    documentCode={versionToSubmit.code}
                    documentName={versionToSubmit.name}
                />
            )}

            {/* Reject Document Modal */}
            {versionToReject && (
                <RejectDocumentModal
                    isOpen={rejectModal.isOpen}
                    onClose={rejectModal.close}
                    onSuccess={() => {
                        rejectModal.close();
                        refetch();
                    }}
                    documentId={versionToReject.documentId}
                    version={versionToReject}
                    documentCode={versionToReject.code}
                    documentName={versionToReject.name}
                />
            )}

            {/* Approve Document Modal */}
            {versionToApprove && (
                <ApproveDocumentModal
                    isOpen={approveModal.isOpen}
                    onClose={approveModal.close}
                    onSuccess={() => {
                        approveModal.close();
                        refetch();
                    }}
                    documentId={versionToApprove.documentId}
                    version={versionToApprove}
                    documentCode={versionToApprove.code}
                    documentName={versionToApprove.name}
                    hasApprovedVersion={hasApprovedVersion}
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