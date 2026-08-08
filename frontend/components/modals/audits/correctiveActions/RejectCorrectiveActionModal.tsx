'use client';

/**
 * =============================================================================
 * REJECT CORRECTIVE ACTION MODAL
 * =============================================================================
 * 
 * Rejects proposed corrective action with required reason
 * 
 * PERMISSIONS:
 * - QM, Lead Auditor, or Auditor can reject
 * - Only works on proposed status
 */

import { useState } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { rejectCorrectiveAction, CorrectiveAction } from '@/lib/api/correctiveActions';
import { CORRECTIVE_ACTION_STATUSES } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface RejectCorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: number;
  findingId: number;
  action: CorrectiveAction;
  onSuccess: () => void;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const rejectReasonSchema = z.object({
  rejectionReason: z
    .string()
    .min(1, { message: 'Rejection reason is required' })
    .min(10, { message: 'Rejection reason must be at least 10 characters' })
    .max(500, { message: 'Rejection reason must not exceed 500 characters' })
});

type RejectReasonFormData = z.infer<typeof rejectReasonSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function RejectCorrectiveActionModal({
  isOpen,
  onClose,
  auditId,
  findingId,
  action,
  onSuccess
}: RejectCorrectiveActionModalProps) {

  // ========================================
  // FORM
  // ========================================

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<RejectReasonFormData>({
    resolver: zodResolver(rejectReasonSchema)
  });

  const [apiError, setApiError] = useState<string | null>(null);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle modal close
   */
  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (data: RejectReasonFormData) => {
    try {
      setApiError(null);

      await rejectCorrectiveAction(auditId, findingId, action.id, data.rejectionReason);

      // Success
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error('Reject corrective action error:', error);
      setApiError(error.response?.data?.message || 'Failed to reject corrective action');
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reject Corrective Action"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">

          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                This will return the corrective action to rejected status. The proposer will need to revise and resubmit.
              </p>
            </div>
          </div>

          {/* Action Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600 font-medium">Action Number:</span>
              <span className="text-gray-900">{action.actionNumber}</span>

              <span className="text-gray-600 font-medium">Status:</span>
              <span className="text-gray-900">
                {CORRECTIVE_ACTION_STATUSES[action.status]?.label || action.status}
              </span>
            </div>

            {/* Proposed Action Preview */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Proposed Action:</p>
              <p className="text-base text-gray-900">
                {action.proposedAction.substring(0, 150)}
                {action.proposedAction.length > 150 && '...'}
              </p>
            </div>
          </div>

          {/* Rejection Reason Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('rejectionReason')}
              placeholder="Explain why this corrective action is being rejected and what improvements are needed..."
              rows={4}
              disabled={isSubmitting}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white',
                'text-sm resize-none transition-all',
                'focus:outline-none focus:ring-2',
                errors.rejectionReason
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
              )}
            />
            {errors.rejectionReason && (
              <p className="mt-1 text-sm text-red-600">
                {errors.rejectionReason.message}
              </p>
            )}
          </div>

          {/* API Error */}
          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{apiError}</p>
            </div>
          )}

          {/* Confirmation text */}
        <p className="text-sm text-gray-700">
          Are you sure you want to reject corrective action {action.actionNumber}?
        </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isSubmitting}
              className="min-w-[180px]"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Action
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}