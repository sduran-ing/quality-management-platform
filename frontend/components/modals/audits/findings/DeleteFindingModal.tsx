'use client';

/**
 * =============================================================================
 * DELETE FINDING MODAL
 * =============================================================================
 * 
 * Confirmation modal for deleting a finding
 * 
 * - QM, Lead Auditor, and Auditor can delete findings
 * - Can only delete when status = 'open' 
 * - Hard delete (removes associated corrective actions)
 */

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { deleteFinding, Finding } from '@/lib/api/findings';
import { FINDING_STATUSES, FINDING_SEVERITIES } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface DeleteFindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: number;
  finding: Finding;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DeleteFindingModal({
  isOpen,
  onClose,
  auditId,
  finding,
  onSuccess
}: DeleteFindingModalProps) {

  // ========================================
  // STATE
  // ========================================

  const [isDeleting, setIsDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle modal close
   */
  const handleClose = () => {
    setApiError(null);
    onClose();
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setApiError(null);

      await deleteFinding(auditId, finding.id);

      // Success
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error('Delete finding error:', error);
      setApiError(error.response?.data?.message || 'Failed to delete finding');
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
      title="Delete Finding"
      size="md"
    >
      <div className="space-y-4">

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              This action cannot be undone
            </p>
            <p className="text-sm text-red-800 mt-1">
              Deleting this finding will also permanently delete all associated corrective actions.
            </p>
          </div>
        </div>

        {/* Finding Details */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Finding Number:</span>
            <span className="text-gray-900 font-semibold">{finding.findingNumber}</span>

            <span className="text-gray-600 font-medium">Status:</span>
            <span className="text-gray-900">
              {FINDING_STATUSES[finding.status]?.label || finding.status}
            </span>

            <span className="text-gray-600 font-medium">Severity:</span>
            <span className="text-gray-900">
              {FINDING_SEVERITIES[finding.severity]?.label || finding.severity}   
            </span>
          </div>

          {/* Description Preview */}
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Description:
            </p>
            <p className="text-sm text-gray-900">
              {finding.description.substring(0, 150)}
              {finding.description.length > 150 && '...'}
            </p>
          </div>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-w-[180px]"
          >
            {isDeleting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Finding
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}