'use client';

/**
 * =============================================================================
 * CLOSE FINDING MODAL
 * =============================================================================
 * 
 * Confirmation modal for closing a finding
 * 
 * - QM, Lead Auditor, and Auditor can close findings
 * - Can only close when status = 'pending_verification'
 * - Validates all corrective actions are completed
 * - Changes status to 'closed'
 */

import { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { closeFinding, Finding } from '@/lib/api/findings';
import { CorrectiveAction } from '@/lib/api/correctiveActions';
import { cn, FINDING_STATUSES, FINDING_SEVERITIES, CORRECTIVE_ACTION_STATUSES } from '@/lib/utils';

import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// ============================================================================
// TYPES
// ============================================================================

interface CloseFindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: number;
  finding: Finding;
  correctiveActions: CorrectiveAction[];
  onSuccess: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CloseFindingModal({
  isOpen,
  onClose,
  auditId,
  finding,
  correctiveActions,
  onSuccess
}: CloseFindingModalProps) {

  const { notify } = useAchievementNotifier();

  // ========================================
  // STATE
  // ========================================

  const [isClosing, setIsClosing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ========================================
  // VALIDATION
  // ========================================

  // Check if all corrective actions are completed
  const totalActions = correctiveActions.length;
  const completedActions = correctiveActions.filter(ca => ca.status === 'completed').length;
  const incompleteActions = totalActions - completedActions;
  const canClose = totalActions > 0 && incompleteActions === 0;

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
   * Handle close finding
   */
  const handleCloseFinding = async () => {
    // Additional validation
    if (!canClose) {
      setApiError('Cannot close finding. All corrective actions must be completed first.');
      return;
    }

    try {
      setIsClosing(true);
      setApiError(null);

      const response = await closeFinding(auditId, finding.id);

      if (response.success) {

        // Notify first
        if (response.achievements) {
          notify(response.achievements);
        }

        // Success
        onSuccess();
        handleClose();
    }

    } catch (error: any) {
      console.error('Close finding error:', error);
      setApiError(error.response?.data?.message || 'Failed to close finding');
    } finally {
      setIsClosing(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Close Finding"
      size="md"
    >
      <div className="space-y-4">

        {/* Success/Warning Banner */}
        {canClose ? (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Ready to close
              </p>
              <p className="text-sm text-green-800 mt-1">
                All corrective actions are completed. This finding can now be closed.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Cannot close finding
              </p>
              <p className="text-sm text-red-800 mt-1">
                {totalActions === 0 
                  ? 'No corrective actions exist for this finding.'
                  : `${incompleteActions} corrective action(s) are not completed yet.`}
              </p>
            </div>
          </div>
        )}

        {/* Finding Details */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Finding Number:</span>
            <span className="text-gray-900 font-semibold">{finding.findingNumber}</span>

            <span className="text-gray-600 font-medium">Current Status:</span>
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
              {finding.description.substring(0, 100)}
              {finding.description.length > 100 && '...'}
            </p>
          </div>
        </div>

        {/* Corrective Actions Status */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Corrective Actions Status:
          </p>
          
          {totalActions === 0 ? (
            <p className="text-sm text-gray-600 italic">No corrective actions</p>
          ) : (
            <div className="space-y-2">
              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      canClose ? 'bg-green-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${(completedActions / totalActions) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {completedActions}/{totalActions}
                </span>
              </div>

              {/* Action List */}
              <div className="space-y-1 mt-3">
                {correctiveActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{action.actionNumber}</span>
                    <span className={cn(
                      'text-sm px-2 py-0.5 rounded',
                      action.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {CORRECTIVE_ACTION_STATUSES[action.status]?.label || action.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            disabled={isClosing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleCloseFinding}
            disabled={isClosing || !canClose}
            className="min-w-[180px]"
          >
            {isClosing ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Closing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Close Finding
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}