'use client';

/**
 * =============================================================================
 * APPROVE DOCUMENT MODAL
 * =============================================================================
 * 
 * Approves pending version and makes it the current approved version
 * Old approved version becomes outdated
 * 
 * - Quality Manager can approve any pending version
 * - Process Owner can approve only if they're the assigned approver
 * - Employee cannot approve
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Info } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { approveDocument, DocumentVersion } from '@/lib/api/documents';
import { formatUserName, formatSnakeCase } from '@/lib/utils';

import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

interface ApproveDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;  // Optional callback for list page
  documentId: number;
  version: DocumentVersion;
  documentCode: string;
  documentName: string;
  hasApprovedVersion: boolean;  // True if there's currently an approved version
}

export default function ApproveDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  documentId,
  version,
  documentCode,
  documentName,
  hasApprovedVersion
}: ApproveDocumentModalProps) {
  
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { notify } = useAchievementNotifier();

  // Handle approve confirmation
 const handleApprove = async () => {
  try {
    setIsApproving(true);
    setError(null);

    // Call API to approve document
    const response = await approveDocument(documentId);

    if (response.success) {

      // Notify first
      if (response.achievements) {
        notify(response.achievements);
      }

    // router.refresh() can't be used in this case because it clears Next.js's server cache. 
    // But the data lives in React state in the browser where it can be only updated by hooks

    // Call success callback if provided, parent will handle data refresh via onSuccess={refetch} (which is a hook action)
      if (onSuccess) {
        onSuccess();  // Close modal, refresh table, etc. (defined in the parent)
        onClose(); 
        return;       // Don't navigate
      }

      // Default behavior: Push to the document page of the approved document
      onClose(); 
      router.push(`/documents/${documentId}`);
    }

  } catch (err: any) {
    console.error('Approve document error:', err);
    setError(
      err.response?.data?.message ||
      err.message ||
      'Failed to approve document'
    );
    setIsApproving(false);
  }
};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve Document"
      size="md"
    >
      <div className="space-y-4">
        
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">
              {hasApprovedVersion
                ? 'The previous approved version will become outdated.'
                : 'This will approve the version and make it the current document.'
              }
            </p>
          </div>
        </div>

        {/* Document/Version details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Document:</span>
            <span className="text-gray-900">{documentCode} - {documentName}</span>
            
            <span className="text-gray-600 font-medium">Version:</span>
            <span className="text-gray-900">{version.versionNumber}</span>
            
            <span className="text-gray-600 font-medium">File:</span>
            <span className="text-gray-900">{version.fileName}</span>
            
            <span className="text-gray-600 font-medium">Current Status:</span>
            <span className="text-gray-900">Pending Approval</span>
          </div>

          {/* Creator info */}
          {version.createdBy && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Created by:</p>
              <p className="text-base font-medium text-gray-900 mb-2">
                {formatUserName(version.createdBy) + ' - '}
                <span className="text-sm text-gray-600 mb-2">{formatSnakeCase(version.createdBy.role)}</span>
              </p>

              <p className="text-sm text-gray-600 mb-1">Change Notes:</p>
              <p className="text-sm text-gray-900 italic">
                {version.changeNotes}
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Confirmation text */}
        <p className="text-sm text-gray-700">
          Are you sure you want to approve version {version.versionNumber}? This action cannot be undone.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          
          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isApproving}
          >
            Cancel
          </Button>

          {/* Approve button */}
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={isApproving}
            className="min-w-[140px] bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            {isApproving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Document
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}