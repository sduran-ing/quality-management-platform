'use client';

/**
 * =============================================================================
 * DELETE CORRECTIVE ACTION MODAL
 * =============================================================================
 * 
 * Confirmation modal for deleting a corrective action
 * 
 * PERMISSIONS:
 * - QM and auditees can delete
 * - Can only delete when the corrective action's status is: proposed or rejected
 */

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { deleteCorrectiveAction, CorrectiveAction } from '@/lib/api/correctiveActions';
import { CORRECTIVE_ACTION_STATUSES } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface DeleteCorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: number;
  findingId: number;
  correctiveAction: CorrectiveAction;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DeleteCorrectiveActionModal({
  isOpen,
  onClose,
  auditId,
  findingId,
  correctiveAction,
  onSuccess
}: DeleteCorrectiveActionModalProps) {

  // ========================================
  // STATE
  // ========================================

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (isDeleting) return;
    setError(null);
    onClose();
  };

  /**
   * Handle delete confirmation
   */
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await deleteCorrectiveAction(auditId, findingId, correctiveAction.id);

      // Success
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Delete corrective action error:', error);
      setError(error.response?.data?.message || 'Failed to delete corrective action');
    } finally {
      setIsDeleting(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Corrective Action"
      size="md"
    >
      <div className="space-y-4">

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              This action cannot be undone. The corrective action will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Action Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Action Number:</span>
            <span className="text-gray-900">{correctiveAction.actionNumber}</span>

            <span className="text-gray-600 font-medium">Status:</span>
            <span className="text-gray-900">
              {CORRECTIVE_ACTION_STATUSES[correctiveAction.status]?.label || correctiveAction.status}
            </span>
          </div>

          {/* Proposed Action Preview */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Proposed Action:</p>
            <p className="text-base text-gray-900">
              {correctiveAction.proposedAction.substring(0, 150)}
              {correctiveAction.proposedAction.length > 150 && '...'}
            </p>
          </div>
        </div>

        {/* API Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Confirmation text */}
        <p className="text-sm text-gray-700">
          Are you sure you want to delete corrective action {correctiveAction.actionNumber}?
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-w-[140px]"
          >
            {isDeleting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Action
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}