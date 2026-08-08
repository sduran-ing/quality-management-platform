'use client';

/**
 * =============================================================================
 * DOCUMENTS PAGE
 * =============================================================================
 * 
 * Main documents list page with filters, table, and pagination.
 * 
 * FEATURES:
 * - Search by code/name
 * - Multi-status filter
 * - Filter by type, process, department
 * - Paginated results (10 per page)
 * - Context-aware actions
 * - Permission-based UI
 */

import { Plus } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';  // For page navigation
import { useAuth } from '@/lib/contexts/AuthContext';   // Import useAuth to access and use context

import { useDocuments } from '@/lib/hooks/useDocuments';
import { useDocumentFilters } from '@/lib/hooks/useDocumentFilters';
import { useModal } from '@/lib/hooks/useModal';

import DocumentFilters from '@/components/documents/DocumentFilters';
import DocumentsTable from '@/components/documents/DocumentsTable';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// Modals
import DeleteDraftModal from '@/components/modals/documents/DeleteDraftModal';
import SubmitForApprovalModal from '@/components/modals/documents/SubmitForApprovalModal';
import RejectDocumentModal from '@/components/modals/documents/RejectDocumentModal';
import ApproveDocumentModal from '@/components/modals/documents/ApproveDocumentModal';
import MakeObsoleteModal from '@/components/modals/documents/MakeObsoleteModal';

import { DocumentAction } from '@/components/documents/DocumentActions';
import { DocumentVersion } from '@/lib/api/documents';
import { getDownloadUrl } from '@/lib/api/documents';

export default function DocumentsPage() {
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
  const obsoleteModal = useModal<number>();


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
   * Example: /documents?page=2&search=policy
   */
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // ========================================
  // FETCH DOCUMENTS (Combine filters + page)
  // ========================================

  /**
   * Fetch documents with both filters and page
   * 
   * Spread filters, then add page separately
   */
  const { versions, pagination, isLoading, error, refetch } = useDocuments({
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

        // Create New Version
        case 'newVersion':
          // Sends the user to the new version page
          window.location.href = `/documents/${version.documentId}/versions/new-version`;
          break;

        // Make Obsolete
        case 'makeObsolete':
          obsoleteModal.open(version.versionId);
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
        <ErrorMessage message="Please log in to view documents" />
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

  // Obsolete modal data
  const versionToObsolete = obsoleteModal.data
    ? versions.find(v => v.versionId === obsoleteModal.data)
    : null;

  // Check for draft/pending versions for this document
  const hasDraftVersionsForObsolete = versionToObsolete
    ? versions.some(v => v.documentId === versionToObsolete.documentId && v.status === 'draft')
    : false;

  const hasPendingVersionsForObsolete = versionToObsolete
    ? versions.some(v => v.documentId === versionToObsolete.documentId && v.status === 'pending_approval')
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
          <h1 className="text-2xl font-semibold text-gray-900">Master Document List</h1>
          <p className="mt-1 text-sm text-gray-500">
            All available documents
          </p>
        </div>

        {/* Create Document Button */}
        <Button
          variant="primary"
          className="gap-2"
          onClick={() => {
            // TODO: Implement create document modal
            window.location.href = '/documents/create';
          }}
        >
          <Plus className="h-4 w-4" />
          Create Document
        </Button>
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
        className="bg-white p-4 rounded-lg shadow"
      />

      {/* ========================================
          ERROR STATE
          ======================================== */}
      {error && (
        <ErrorMessage message={error} />
      )}

      {/* ========================================
          DOCUMENTS TABLE
          ======================================== */}
      <DocumentsTable
        versions={versions}
        userRole={user.role as 'quality_manager' | 'process_owner' | 'employee'}
        userId={user.id}
        onActionSelect={handleDocumentAction}
        isLoading={isLoading}
      />

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
          // No need to define onSuccess={}, it will use the default behaviour of the modal
          documentId={versionToApprove.documentId}
          version={versionToApprove}
          documentCode={versionToApprove.code}
          documentName={versionToApprove.name}
          hasApprovedVersion={hasApprovedVersion}
        />
      )}

      {/* Make Obsolete Modal */}
      {versionToObsolete && (
        <MakeObsoleteModal
          isOpen={obsoleteModal.isOpen}
          onClose={obsoleteModal.close}
          // No need to define onSuccess={}, it will use the default behaviour of the modal
          documentId={versionToObsolete.documentId}
          documentCode={versionToObsolete.code}
          documentName={versionToObsolete.name}
          currentVersionNumber={versionToObsolete.versionNumber}
          hasDraftVersions={hasDraftVersionsForObsolete}
          hasPendingVersions={hasPendingVersionsForObsolete}
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