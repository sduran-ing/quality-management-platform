'use client';

/**
 * =============================================================================
 * APPROVE CORRECTIVE ACTION MODAL
 * =============================================================================
 * 
 * Confirmation modal for approving a proposed corrective action
 * 
 * - QM, Lead Auditor, or Auditor can approve
 * - Only works on proposed status
 * - Changes status to 'in_implementation'
 * - Updates finding status to 'in_progress' (if not already)
 */

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Calendar, User } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { approveCorrectiveAction, CorrectiveAction } from '@/lib/api/correctiveActions';
import { formatDate, formatUserName, CORRECTIVE_ACTION_STATUSES } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ApproveCorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: number;
  findingId: number;
  action: CorrectiveAction;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ApproveCorrectiveActionModal({
  isOpen,
  onClose,
  auditId,
  findingId,
  action,
  onSuccess
}: ApproveCorrectiveActionModalProps) {

  // ========================================
  // STATE
  // ========================================

  const [isApproving, setIsApproving] = useState(false);
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
   * Handle approval
   */
  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setApiError(null);

      await approveCorrectiveAction(auditId, findingId, action.id);

      // Success
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error('Approve corrective action error:', error);
      setApiError(error.response?.data?.message || 'Failed to approve corrective action');
    } finally {
      setIsApproving(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Approve Corrective Action"
      size="md"
    >
      <div className="space-y-4">

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">
              This will approve the corrective action and move it to implementation phase.
            </p>
          </div>
        </div>

        {/* Action Details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Action Number:</span>
            <span className="text-gray-900 font-semibold">{action.actionNumber}</span>

            <span className="text-gray-600 font-medium">Current Status:</span>
            <span className="text-gray-900">
              {CORRECTIVE_ACTION_STATUSES[action.status]?.label || action.status}
            </span>
          </div>

          {/* Proposed Action */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Proposed Action:
            </p>
            <p className="text-base text-gray-900">
              {action.proposedAction}
            </p>
          </div>

          {/* Root Cause Analysis */}
          {action.rootCauseAnalysis && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Root Cause Analysis:
              </p>
              <p className="text-base text-gray-900">
                {action.rootCauseAnalysis}
              </p>
            </div>
          )}

          {/* Additional Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
            {/* Responsible User */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                <User className="h-3 w-3 inline mr-1" />
                Responsible:
              </p>
              <p className="text-base text-gray-900">
                {action.responsibleUser ? formatUserName(action.responsibleUser) : 'Not assigned'}
              </p>
              {action.responsibleUser?.email && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {action.responsibleUser.email}
                </p>
              )}
            </div>

            {/* Expected Completion Date */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                Expected Completion:
              </p>
              <p className="text-base text-gray-900">
                {formatDate(action.expectedCompletionDate)}
              </p>
            </div>
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
            disabled={isApproving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleApprove}
            disabled={isApproving}
            className="min-w-[180px]"
          >
            {isApproving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Action
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}