'use client';

/**
 * =============================================================================
 * SUBMIT FOR APPROVAL MODAL
 * =============================================================================
 * 
 * Confirms submission of draft version for approval
 * Changes status: draft to pending_approval
 * 
 * PERMISSIONS:
 * - Creator can submit their own draft
 * - Quality Manager can submit any draft
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { submitForApproval, DocumentVersion } from '@/lib/api/documents';
import { formatUserName } from '@/lib/utils';

interface SubmitForApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;  // Optional callback to trigger specific behaviours
  documentId: number;
  version: DocumentVersion;
  documentCode: string;
  documentName: string;
}

export default function SubmitForApprovalModal({
  isOpen,
  onClose,
  onSuccess,
  documentId,
  version,
  documentCode,
  documentName
}: SubmitForApprovalModalProps) {
  
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle submit confirmation
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Call API to submit for approval
      const response = await submitForApproval(documentId);

      if (response.success) {
        
        // Call success callback if provided by parent (e.g. for documents list)
        if (onSuccess) {
          onSuccess();  // Close modal, refresh table, etc. (defined in the parent)
          onClose();    
          return;       // Don't navigate
        }

        onClose();
      }

    } catch (err: any) {
      console.error('Submit for approval error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to submit for approval'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit for Approval"
      size="md"
    >
      <div className="space-y-4">

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
            <span className="text-gray-900">Draft</span>
          </div>

          {/* Assigned approver info */}
          {version.assignedApprover && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Will be sent to:</p>
              <p className="text-base font-medium text-gray-900">
                {formatUserName(version.assignedApprover)}
              </p>
              <p className="text-sm text-gray-600">
                {version.assignedApprover.role === 'quality_manager' 
                  ? 'Quality Manager' 
                  : 'Process Owner'}
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
          Are you sure you want to submit version {version.versionNumber} for approval?
          You will not be able to edit it until it is approved or rejected.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          
          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {/* Submit button */}
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}