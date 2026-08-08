'use client';

/**
 * =============================================================================
 * DOCUMENT DETAIL PAGE
 * =============================================================================
 * 
 * - Warning banner with links to draft/pending versions
 * - Actions dropdown
 * - Details tab
 * - Versions table ordered by version (highest to lowest)
 * 
 * ROUTE: /documents/[id]
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  MoreVertical,
  Edit,
  FilePlus,
  Archive,
  AlertCircle,
  Eye,
  FileText,
  Calendar,
  User,
  Building2,
  FileType,
  GitBranch,
  Bolt
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';   // Import useAuth to access and use context
import {
  getDownloadUrl
} from '@/lib/api/documents';
import Badge, { getDocumentStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// Modals
import { useModal } from '@/lib/hooks/useModal';
import MakeObsoleteModal from '@/components/modals/documents/MakeObsoleteModal';
import { cn, formatDate, formatUserName, formatFileSize, DOCUMENT_STATUSES } from '@/lib/utils';

import { useDocument } from '@/lib/hooks/useDocuments';

type Tab = 'details' | 'versions';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const documentId = parseInt(params.id as string, 10);

  // ========================================
  // STATE
  // ========================================

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // ========================================
  // MODAL HOOKS
  // ========================================

  // It doesn't need data (void), because the document id was already extracted from the URL
  const obsoleteModal = useModal<void>();

  // ========================================
  // FETCH DOCUMENT
  // ========================================

  const { document, isLoading, error, refetch } = useDocument(documentId);

  // ========================================
  // HANDLERS
  // ========================================

  // Handle download version
  // GET /api/documents/:id/versions/:versionId/download
  const handleDownload = async (versionId: number) => {
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
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error || !document) {
    return (
      <div className="p-6">
        <ErrorMessage message={error || 'Document not found'} />
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

  // Find draft or pending versions for the warning banner
  const draftVersion = document.versions?.find(v => v.status === 'draft');
  const pendingVersion = document.versions?.find(v => v.status === 'pending_approval');
  const hasWarning = !!(draftVersion || pendingVersion);

  // Get current version
  const currentVersion = document.currentVersion ||
    document.versions?.find(v => v.versionId === document.currentVersionId);

  /**
   * Sort versions by version number (highest to lowest)
   * 
   * Converts version strings to numbers for proper sorting
   */
  const sortedVersions = document.versions
    ? [...document.versions].sort((a, b) => {
      const versionA = parseFloat(a.versionNumber);
      const versionB = parseFloat(b.versionNumber);
      return versionB - versionA;  // Descending order
    })
    : [];

  /**
   * Determine available actions
   * 
   * NEW VERSION: If approved + no drafts + no pending
   * EDIT: Only QM (for metadata editing)
   * MAKE OBSOLETE: Only QM + approved status
   */
  const hasDraftOrPending = !!(draftVersion || pendingVersion);
  const canCreateNewVersion =
    currentVersion?.status === 'approved' &&
    !hasDraftOrPending;
  const canEdit = user?.role === 'quality_manager';
  const canMakeObsolete =
    user?.role === 'quality_manager' &&
    currentVersion?.status === 'approved';

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
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/documents')}
            className="gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Button>

          {/* Actions Dropdown - Always visible */}
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

                    {/* New Version */}
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

                    {/* Edit Metadata (QM only) */}
                    {canEdit && (
                      <Button
                        variant="menuItem"
                        onClick={() => {
                          setIsActionsOpen(false);
                          router.push(`/documents/${documentId}/versions/${currentVersion.versionId}/edit`);
                        }}
                        className="gap-3 w-full"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Document
                      </Button>
                    )}

                    {/* Make Obsolete (QM only) */}
                    {canMakeObsolete && (
                      <>
                        {(canCreateNewVersion || canEdit) && (
                          <div className="my-1 border-t border-gray-100" />
                        )}
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

                    {/* No actions available */}
                    {!canCreateNewVersion && !canEdit && !canMakeObsolete && (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        No actions available
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

      {/* ========================================
          MODALS (The Modals have to be SIBLINGs to the entire actions dropdown, not nested inside it.)
          ======================================== */}
      
      {/* Make Obsolete Modal */}
      <MakeObsoleteModal
        isOpen={obsoleteModal.isOpen}
        onClose={obsoleteModal.close}
        onSuccess={refetch}  // To handle the refetch of the page data after approving
        documentId={documentId}
        documentCode={document.code}
        documentName={document.name}
        currentVersionNumber={currentVersion?.versionNumber ?? ''}
        hasDraftVersions={hasDraftVersions}
        hasPendingVersions={hasPendingVersions}
      />

          </div>
        </div>

        {/* ========================================
            WARNING BANNER
            ======================================== */}
        {hasWarning && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">

                {/* Two different renders depending if the document has a draft or pending version */}
                {draftVersion && (
                  <p className="text-sm font-medium text-amber-900">
                    Draft version <span className="font-semibold">{draftVersion.versionNumber}</span> exists.{' '}
                    <Link
                      href={`/documents/${documentId}/versions/${draftVersion.versionId}`}
                      className="underline hover:text-amber-950 font-semibold"
                    >
                      See draft version →
                    </Link>
                  </p>
                )}
                {pendingVersion && (
                  <p className="text-sm font-medium text-amber-900">
                    Pending approval version <span className="font-semibold">{pendingVersion.versionNumber}</span> exists.{' '}
                    <Link
                      href={`/documents/${documentId}/versions/${pendingVersion.versionId}`}
                      className="underline hover:text-amber-950 font-semibold"
                    >
                      See pending version →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================
            DOCUMENT HEADER CARD
            ======================================== */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">

                <h1 className="text-2xl font-bold text-gray-900">
                  {document.code}
                </h1>
                {currentVersion && (
                  <Badge variant={getDocumentStatusVariant(currentVersion.status)} className="text-sm px-3 py-1">
                    {/* Maps the status backend names to the constants with the frontend expected output */}
                    {DOCUMENT_STATUSES[currentVersion.status].label}
                  </Badge>
                )}
              </div>
              <h2 className="text-xl text-gray-700 mb-2 font-medium">{document.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <FileType className="h-4 w-4" />
                  <span>{document.documentType?.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bolt className="h-4 w-4" />
                  <span>{document.process?.acronym}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  <span>{document.department?.name}</span>
                </div>
              </div>
              <h2 className="text-lg font-bold text-gray-900 pt-2">
                ID: {document.id}
              </h2>
            </div>
          </div>
        </div>

        {/* ========================================
            TABS CONTAINER
            ======================================== */}
        <div className="bg-white rounded-lg shadow">

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <nav className="flex -mb-px px-6">
              <button
                onClick={() => setActiveTab('details')}
                className={cn(
                  'px-4 py-4 text-sm font-medium border-b-2 transition-all',
                  activeTab === 'details'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Details
                </span>
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={cn(
                  'px-4 py-4 text-sm font-medium border-b-2 transition-all',
                  activeTab === 'versions'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <span className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Versions ({document.versions?.length || 0})
                </span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">

            {/* ========================================
                DETAILS TAB
                ======================================== */}
            {activeTab === 'details' && (
              <div className="space-y-8">

                {/* Current Version Card */}
                {currentVersion && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Current Version
                      </h3>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownload(currentVersion.versionId)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>

                    <div className="bg-secondary-50 rounded-xl p-6 border border-secondary-100 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-secondary-600 uppercase tracking-wide mb-1">
                              Version Number
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {currentVersion.versionNumber}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-secondary-600 uppercase tracking-wide mb-1">
                              File
                            </p>
                            <p className="text-base font-medium text-gray-900">
                              {currentVersion.fileName}
                            </p>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {formatFileSize(currentVersion.fileSize)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-secondary-600 uppercase tracking-wide mb-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              Uploaded
                            </p>
                            <p className="text-base text-gray-900">
                              {formatDate(currentVersion.createdAt)}
                            </p>
                            <p className="text-base text-gray-600 mt-0.5">
                              <User className="h-4 w-4 inline mr-1" />
                              by {formatUserName(currentVersion.createdBy)}
                            </p>
                          </div>
                          {/* Only renders if the version has been approved */}
                          {currentVersion.approvedAt && currentVersion.approvedBy && (
                            <div>
                              <p className="text-sm font-medium text-secondary-600 uppercase tracking-wide mb-1">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                Approved
                              </p>
                              <p className="text-base text-gray-900">
                                {formatDate(currentVersion.approvedAt)}
                              </p>
                              <p className="text-base text-gray-600 mt-0.5">
                                <User className="h-4 w-4 inline mr-1" />
                                by {formatUserName(currentVersion.approvedBy)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {currentVersion.changeNotes && (
                        // div with top border to create a line before change notes
                        <div className="mt-6 pt-6 border-t border-secondary-200">
                          <p className="text-sm font-medium text-secondary-600 uppercase tracking-wide mb-2">
                            Change Notes
                          </p>
                          <p className="text-base text-gray-900 italic">
                            {currentVersion.changeNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Document Information Card */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Document Information
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          Document Code
                        </p>
                        <p className="text-base text-gray-900">{document.code}</p>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          Document Name
                        </p>
                        <p className="text-base text-gray-900">{document.name}</p>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          Type
                        </p>
                        <p className="text-base text-gray-900">{document.documentType?.name}</p>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          Process
                        </p>
                        <p className="text-base text-gray-900">
                          {document.process?.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {document.process?.acronym}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          Department
                        </p>
                        <p className="text-base text-gray-900">{document.department?.name}</p>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">
                          Created By
                        </p>
                        <p className="text-base text-gray-900">{formatUserName(document.creator)}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {formatDate(document.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================
                VERSIONS TAB
                ======================================== */}
            {activeTab === 'versions' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Version History
                </h3>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Version
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Download
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          View Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedVersions.length > 0 ? (
                        sortedVersions.map((version) => (
                          <tr key={version.versionId} className="hover:bg-gray-50">
                            {/* Version */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {version.versionNumber}
                              {version.versionId === document.currentVersionId && (
                                <Badge variant="info" className="ml-2">Current</Badge>
                              )}
                            </td>

                            {/* Date */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(version.createdAt)}
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={getDocumentStatusVariant(version.status)}>
                                {/* Maps the status backend names to the constants with the frontend expected output */}
                                {DOCUMENT_STATUSES[version.status].label}
                              </Badge>
                            </td>

                            {/* Download */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(version.versionId)}
                                className="gap-2"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </td>

                            {/* View Details */}
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/documents/${documentId}/versions/${version.versionId}`)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No versions available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}