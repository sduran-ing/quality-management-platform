'use client';

/**
 * =============================================================================
 * VERSION DETAIL PAGE
 * =============================================================================
 * 
 * - Displays details for a specific document version
 * - Warning if not current version
 * - Actions based on status and role
 * 
 * ROUTE: /documents/[id]/versions/[versionId]
 * 
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  MoreVertical,
  Edit,
  FilePlus,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Archive
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getDocumentById,
  getDownloadUrl,
  makeObsolete,
  Document,
  DocumentVersion
} from '@/lib/api/documents';
import Badge, { getDocumentStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// Import modals
import { useModal } from '@/lib/hooks/useModal';
import DeleteDraftModal from '@/components/modals/documents/DeleteDraftModal';
import SubmitForApprovalModal from '@/components/modals/documents/SubmitForApprovalModal';
import RejectDocumentModal from '@/components/modals/documents/RejectDocumentModal';
import ApproveDocumentModal from '@/components/modals/documents/ApproveDocumentModal';
import MakeObsoleteModal from '@/components/modals/documents/MakeObsoleteModal';

import { cn, formatDate, formatUserName, formatFileSize, DOCUMENT_STATUSES } from '@/lib/utils';

export default function VersionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  // Store the URL params in variables
  const documentId = parseInt(params.id as string, 10);
  const versionId = parseInt(params.versionId as string, 10);

  // ========================================
  // STATE
  // ========================================

  const [document, setDocument] = useState<Document | null>(null);
  const [version, setVersion] = useState<DocumentVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // ========================================
  // MODAL HOOKS
  // ========================================

  // All of them don't need data (void), because the version id was already extracted from the URL
  const deleteModal = useModal<void>();
  const submitModal = useModal<void>();
  const rejectModal = useModal<void>();
  const approveModal = useModal<void>();
  const obsoleteModal = useModal<void>();

  // ========================================
  // FETCH DATA
  // ========================================

  /**
   * Fetch document and extract specific version
   * 
   * We reuse the getDocumentById endpoint and filter client-side
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get document with all versions
        const response = await getDocumentById(documentId);
        const doc = response.data.document;

        // Find the specific version
        const foundVersion = doc.versions?.find(v => v.versionId === versionId);

        if (!foundVersion) {
          throw new Error('Version not found');
        }

        setDocument(doc);
        setVersion(foundVersion);
      } catch (err: any) {
        console.error('Error fetching version:', err);
        setError(err.response?.data?.message || 'Failed to load version');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId && versionId) {
      fetchData();
    }
  }, [documentId, versionId]);

  // ========================================
  // REFRESH DATA
  // ========================================

  // Refetch data after actions
  const refetch = async () => {
    try {
      const response = await getDocumentById(documentId);
      const doc = response.data.document;
      const foundVersion = doc.versions?.find(v => v.versionId === versionId);

      if (foundVersion) {
        setDocument(doc);
        setVersion(foundVersion);
      }
    } catch (err: any) {
      console.error('Refetch error:', err);
    }
  };

  // ========================================
  // HANDLERS
  // ========================================

  // Download this version
  const handleDownload = async () => {
    if (!version) return;

    try {
      const response = await getDownloadUrl(documentId, versionId);

      if (response.success && response.data?.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      } else {
        throw new Error('No download URL received');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      alert(error.response?.data?.message || error.message || 'Download failed');
    }
  };

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading version...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error || !document || !version) {
    return (
      <div className="p-6">
        <ErrorMessage message={error || 'Version not found'} />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/documents')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
      </div>
    );
  }

  // Get current version for "Go to current" button
  const currentVersion = document.currentVersion ||
    document.versions?.find(v => v.versionId === document.currentVersionId);

  // Check if this is the current version
  const isCurrentVersion = version.versionId === document.currentVersionId;

  // Check if this is the only version for the delete draft modal
  const isOnlyVersion = document?.versions?.length === 1;

  // Check if there's currently an approved version
  // .some() checks if at least one element in an array satisfies a condition
  // "?? false" this means If the value on the left is null or undefined, use false
  const hasApprovedVersion = document?.versions?.some(v => v.status === 'approved') ?? false;

  /**
   * Determine available actions based on status and role
   * 
   * DRAFT:
   * - Edit (creator or QM)
   * - Delete (creator or QM)
   * - Submit (creator or QM)
   * 
   * PENDING:
   * - Approve (QM or assigned approver)
   * - Reject (QM or assigned approver)
   * 
   * APPROVED:
   * - New Version (everyone)
   * - Edit Metadata (QM only)
   * 
   * OUTDATED/OBSOLETE:
   * - No actions
   */
  const isCreator = version.createdBy?.id === user?.id;
  const isQM = user?.role === 'quality_manager';
  const isAssignedApprover = version.assignedApprover?.id === user?.id;

  const canEdit = (version.status === 'draft') && (isCreator || isQM);
  const canDelete = (version.status === 'draft') && (isCreator || isQM);
  const canSubmit = (version.status === 'draft') && (isCreator || isQM);
  const canApprove = (version.status === 'pending_approval') && (isQM || isAssignedApprover);
  const canReject = (version.status === 'pending_approval') && (isQM || isAssignedApprover);
  const canCreateNewVersion = version.status === 'approved';
  const canEditMetadata = isQM && version.status === 'approved';
  const canMakeObsolete = isQM && version.status === 'approved';

  // Calculate version statuses for the make obsolete modal
  const hasDraftVersions = document?.versions?.some(v => v.status === 'draft') ?? false;
  const hasPendingVersions = document?.versions?.some(v => v.status === 'pending_approval') ?? false;

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-6 p-6">

        {/* ========================================
            HEADER
            ======================================== */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(`/documents/${documentId}`)}
            className="gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Document
          </Button>

          {/* Actions Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setIsActionsOpen(!isActionsOpen)}
              className="gap-2"
            >
              Actions
              <MoreVertical className="h-4 w-4" />
            </Button>

            {isActionsOpen && (
              <>
                {/* Click outside to close */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsActionsOpen(false)}
                />

                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1 flex flex-col">

                    {/* Download (always available) */}
                    <Button
                      variant="menuItem"
                      onClick={() => {
                        setIsActionsOpen(false);
                        handleDownload();
                      }}
                      className="gap-3 w-full"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>

                    {/* Edit (draft only, creator or QM) */}
                    {canEdit && (
                      <Button
                        variant="menuItem"
                        onClick={() => {
                          setIsActionsOpen(false);
                          router.push(`/documents/${documentId}/versions/${versionId}/edit`);
                        }}
                        className="gap-3 w-full"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Version
                      </Button>
                    )}

                    {/* Submit for Approval (draft only) */}
                    {canSubmit && (
                      <Button
                        variant="menuItem"
                        onClick={() => {
                          setIsActionsOpen(false);
                          submitModal.open();  // Open submit modal
                        }}
                        // Green hover for better UI
                        className="gap-3 w-full text-green-600 hover:bg-green-50 hover:text-green-700"
                      >
                        <Send className="h-4 w-4" />
                        Submit for Approval
                      </Button>
                    )}

                    {/* Approve (pending only, QM or assigned) */}
                    {canApprove && (
                      <Button
                        variant="menuItem"
                        onClick={() => {
                          setIsActionsOpen(false);
                          approveModal.open();
                        }}
                        // Green hover for better UI
                        className="gap-3 w-full text-green-600 hover:bg-green-50 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                    )}

                    {/* Reject (pending only, QM or assigned) */}
                    {canReject && (
                      <Button
                        variant="menuItem"
                        onClick={() => {
                          setIsActionsOpen(false);
                          // Opens the previously declared modal
                          rejectModal.open();
                        }}
                        // Orange hover for better UI
                        className="gap-3 w-full text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    )}

                    {/* New Version (approved only, everyone) */}
                    {canCreateNewVersion && (
                      <Button
                        variant="menuItem"
                        onClick={() => {
                          setIsActionsOpen(false);
                          router.push(`/documents/${documentId}/versions/new-version`);
                        }}
                        className="gap-3 w-full"
                      >
                        <FilePlus className="h-4 w-4" />
                        New Version
                      </Button>
                    )}

                    {/* Edit Metadata (approved only, QM only) */}
                    {canEditMetadata && (
                      <Button
                        variant="menuItem"
                        onClick={() => {
                          setIsActionsOpen(false);
                          router.push(`/documents/${documentId}/versions/${versionId}/edit`);
                        }}
                        className="gap-3 w-full"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Metadata
                      </Button>
                    )}

                    {/* Make Obsolete (approved only only, creator or QM) */}
                    {canMakeObsolete && (
                      <>
                        <div className="my-1 border-t border-gray-100" />
                        <Button
                          variant="menuItem"
                          onClick={() => {
                            setIsActionsOpen(false);
                            obsoleteModal.open();
                          }}
                          className="gap-3 w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Archive className="h-4 w-4" />
                          Make Obsolete
                        </Button>
                      </>
                    )}

                    {/* Delete (draft only, creator or QM) */}
                    {canDelete && (
                      <>
                        <div className="my-1 border-t border-gray-100" />
                        <Button
                          variant="menuItem"
                          onClick={() => {
                            setIsActionsOpen(false);
                            // Opens the previously declared modal
                            deleteModal.open();
                          }}
                          className="gap-3 w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Draft
                        </Button>
                      </>
                    )}

                  </div>
                </div>
              </>
            )}
          </div>

          {/* ========================================
          MODALS (The Modals have to be SIBLINGs to the entire actions dropdown, not nested inside it.)
          ======================================== */}

          {/* Delete Draft Modal - Always rendered, controlled by isOpen 
          "onSuccess" is not used because it will redirect*/}
          <DeleteDraftModal
            isOpen={deleteModal.isOpen}
            onClose={deleteModal.close}
            documentId={documentId}
            version={version}
            documentCode={document.code}
            documentName={document.name}
            isOnlyVersion={isOnlyVersion}
          />

          {/* Submit for Approval Modal */}
          <SubmitForApprovalModal
            isOpen={submitModal.isOpen}
            onClose={submitModal.close}
            onSuccess={refetch}  // To handle the refetch of the page data after submitting for approval
            documentId={documentId}
            version={version}
            documentCode={document.code}
            documentName={document.name}
          />

          {/* Reject Modal */}
          <RejectDocumentModal
            isOpen={rejectModal.isOpen}
            onClose={rejectModal.close}
            documentId={documentId}
            version={version}
            documentCode={document.code}
            documentName={document.name}
          />

          {/* Approve Modal */}
          <ApproveDocumentModal
            isOpen={approveModal.isOpen}
            onClose={approveModal.close}
            // No need to define onSuccess={}, it will use the default behaviour of the modal
            documentId={documentId}
            version={version}
            documentCode={document.code}
            documentName={document.name}
            hasApprovedVersion={hasApprovedVersion}
          />

          {/* Make Obsolete Modal */}
          <MakeObsoleteModal
            isOpen={obsoleteModal.isOpen}
            onClose={obsoleteModal.close}
            // No need to define onSuccess={}, it will use the default behaviour of the modal
            documentId={documentId}
            documentCode={document.code}
            documentName={document.name}
            currentVersionNumber={currentVersion?.versionNumber ?? ''}
            hasDraftVersions={hasDraftVersions}
            hasPendingVersions={hasPendingVersions}
          />

        </div>

        {/* ========================================
            WARNING BANNER (if not current version)
            ======================================== */}
        {!isCurrentVersion && currentVersion && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    This is not the current version.
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    Current version is <span className="font-semibold">{currentVersion.versionNumber}</span>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/documents/${documentId}`)}
                className="gap-2 flex-shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Go to Current
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================
            VERSION HEADER
            ======================================== */}
        <div className="bg-white rounded-lg shadow p-6">


          {/* ========================================
              TWO-COLUMN GRID
              ======================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Download button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDownload()}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>

              {/* Status */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Status
                </p>
                <Badge variant={getDocumentStatusVariant(version.status)} className="text-sm px-3 py-1">
                  {DOCUMENT_STATUSES[version.status].label}
                </Badge>
              </div>

              {/* ID */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Document ID
                </p>
                <p className="text-base text-gray-900">{document.id}</p>
              </div>

              {/* Code */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Code
                </p>
                <p className="text-base text-gray-900">{document.code}</p>
              </div>

              {/* Name */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Name
                </p>
                <p className="text-base text-gray-900">{document.name}</p>
              </div>

              {/* Version */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Version
                </p>
                <p className="text-base text-gray-900 font-semibold">{version.versionNumber}</p>
              </div>

              {/* File */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  File
                </p>
                <p className="text-base text-gray-900 font-medium">{version.fileName}</p>
                <p className="text-base text-gray-600 mt-0.5">{formatFileSize(version.fileSize)}</p>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">

              {/* Change Notes */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Change Notes
                </p>
                <p className="text-base text-gray-900 italic">
                  {version.changeNotes || 'No change notes provided'}
                </p>
              </div>

              {/* Uploaded */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Created By
                </p>
                <p className="text-base text-gray-900">{formatDate(version.createdAt)}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  by {formatUserName(version.createdBy)}
                </p>
              </div>

              {/* Assigned Approver */}
              {version.assignedApprover && (
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Assigned Approver
                  </p>
                  <p className="text-base text-gray-900">
                    {formatUserName(version.assignedApprover)}
                  </p>
                </div>
              )}

              {/* Approved */}
              {version.approvedAt && version.approvedBy && (
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Approved
                  </p>
                  <p className="text-base text-gray-900">{formatDate(version.approvedAt)}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    by {formatUserName(version.approvedBy)}
                  </p>
                </div>
              )}

              {/* Type */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Type
                </p>
                <p className="text-base text-gray-900">{document.documentType?.name}</p>
              </div>

              {/* Process */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Process
                </p>
                <p className="text-base text-gray-900">{document.process?.name}</p>
                <p className="text-base text-gray-600 mt-0.5">{document.process?.acronym}</p>
              </div>

              {/* Department */}
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                  Department
                </p>
                <p className="text-base text-gray-900">{document.department?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}