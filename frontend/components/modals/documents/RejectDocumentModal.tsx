'use client';

/**
 * =============================================================================
 * REJECT DOCUMENT MODAL
 * =============================================================================
 * 
 * Rejects pending version and returns it to draft status
 * Requires rejection reason (mandatory)
 * 
 * PERMISSIONS:
 * - Quality Manager can reject any pending version
 * - Process Owner can reject only if they're the assigned approver
 * - Employee cannot reject
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { rejectDocument, DocumentVersion } from '@/lib/api/documents';
import { formatUserName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface RejectDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;  // Optional callback to trigger specific behaviours
  documentId: number;
  version: DocumentVersion;
  documentCode: string;
  documentName: string;
}

/**
 * =============================================================================
 * VALIDATION SCHEMA
 * =============================================================================
 */
const rejectReasonSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, { message: 'Rejection reason is required' })
    .min(10, { message: 'Rejection reason must be at least 10 characters' })
    .max(500, { message: 'Rejection reason must not exceed 500 characters' })
});

type RejectReasonFormData = z.infer<typeof rejectReasonSchema>;

export default function RejectDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  documentId,
  version,
  documentCode,
  documentName
}: RejectDocumentModalProps) {

  const router = useRouter();

  // Use React Hook Form (consistent with other forms)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<RejectReasonFormData>({
    resolver: zodResolver(rejectReasonSchema)
  });

  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal closes
  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  // Handle form submission
  const onSubmit = async (data: RejectReasonFormData) => {
    try {
      setIsRejecting(true);
      setError(null);

      // Data is already validated by Zod
      const response = await rejectDocument(documentId, data.rejectionReason);

      if (response.success) {
        // Call success callback if provided (for documents list)
        if (onSuccess) {
          onSuccess();    // Refresh table, close modal
          handleClose();
          return;
        }

        // Default behavior: Force refresh to show new status
        router.push(`/documents/${documentId}/versions/${version.versionId}`);
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject document');
      setIsRejecting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      // Empties the modal data and closes it
      onClose={handleClose}
      title="Reject Document"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">

          {/* Warning banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                This will return the document to draft status. The creator will need to make changes and resubmit for approval.
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
                <p className="text-base font-medium text-gray-900">
                  {formatUserName(version.createdBy)}
                </p>
              </div>
            )}
          </div>

          {/* Rejection reason textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('rejectionReason')}  // Auto-connect
              placeholder="Explain why this document is being rejected and what changes are needed..."
              rows={4}
              disabled={isRejecting}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white',
                'text-sm resize-none transition-all',
                'focus:outline-none focus:ring-2',
                errors.rejectionReason
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
              )}
            />

            {/* Auto-managed errors */}
            {errors.rejectionReason && (
              <p className="mt-1 text-sm text-red-600">
                {errors.rejectionReason.message}
              </p>
            )}

          </div>

          {/* API Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">

            {/* Cancel button */}
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isRejecting}
            >
              Cancel
            </Button>

            {/* Reject button - destructive styling */}
            <Button
              type="submit"  // Form submit
              variant="danger"
              disabled={isRejecting}
              className="min-w-[120px]"
            >
              {isRejecting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Document
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}