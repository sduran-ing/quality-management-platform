'use client';

/**
 * =============================================================================
 * VERIFY CORRECTIVE ACTION MODAL
 * =============================================================================
 * 
 * Modal for verifying corrective action effectiveness
 * User can choose to approve (completed) or reject (back to implementation)
 * 
 * - QM, Lead Auditor, and Auditor can verify
 * - Can only verify when status = 'pending_verification'
 * - If all CAs completed, finding status changes to 'closed'
 */

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, FileText, Calendar, User } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { verifyCorrectiveAction, CorrectiveAction } from '@/lib/api/correctiveActions';
import { formatDate, formatUserName, CORRECTIVE_ACTION_STATUSES } from '@/lib/utils';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// ============================================================================
// TYPES
// ============================================================================

interface VerifyCorrectiveActionModalProps {
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

/**
 * Schema with conditional validation:
 * - rejection_reason is only required when decision = 'rejected'
 */
const verifySchema = z.object({
  decision: z.enum(['approved', 'rejected'], {
    message: 'Please select a valid decision'
  }),
  rejectionReason: z.string().optional()
}).refine((data) => {
  // If decision is 'rejected', rejection_reason must be provided and >= 10 chars
  if (data.decision === 'rejected') {
    return data.rejectionReason && data.rejectionReason.trim().length >= 10;
  }
  return true;
}, {
  message: 'Rejection reason must be at least 10 characters when rejecting verification',
  path: ['rejectionReason']
});

type VerifyFormData = z.infer<typeof verifySchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function VerifyCorrectiveActionModal({
  isOpen,
  onClose,
  auditId,
  findingId,
  action,
  onSuccess
}: VerifyCorrectiveActionModalProps) {

  const { notify } = useAchievementNotifier();

  // ========================================
  // FORM
  // ========================================

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      decision: 'approved',
      rejectionReason: ''
    }
  });

  const [apiError, setApiError] = useState<string | null>(null);

  // Watch decision to show/hide rejection reason field
  const selectedDecision = useWatch({
  control,
  name: 'decision',
  defaultValue: 'approved'
});

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
  const onSubmit = async (data: VerifyFormData) => {
    try {
      setApiError(null);

      const response = await verifyCorrectiveAction(auditId, findingId, action.id, {
        decision: data.decision,
        rejectionReason: data.decision === 'rejected' ? data.rejectionReason?.trim() || '' : undefined
      });

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
      console.error('Verify corrective action error:', error);
      setApiError(error.response?.data?.message || 'Failed to verify corrective action');
    }
  };

  // ========================================
  // DYNAMIC MESSAGES BASED ON DECISION
  // ========================================

  const decisionMessages = {
    approved: {
      banner: {
        color: 'green',
        icon: CheckCircle2,
        description: 'This will mark the corrective action as completed and effective.'
      },
      button: {
        label: 'Approve & Complete',
        icon: CheckCircle2,
        variant: 'primary' as const
      }
    },
    rejected: {
      banner: {
        color: 'red',
        icon: XCircle,
        description: 'This will send the corrective action back to implementation for adjustments.'
      },
      button: {
        label: 'Reject & Return',
        icon: XCircle,
        variant: 'danger' as const
      }
    }
  };

  const currentMessage = decisionMessages[selectedDecision];

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Verify Corrective Action"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">

          {/* Action Details Summary */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-600 font-medium">Action Number:</span>
              <span className="text-gray-900 font-semibold">{action.actionNumber}</span>

              <span className="text-gray-600 font-medium">Current Status:</span>
              <span className="text-gray-900">
                {CORRECTIVE_ACTION_STATUSES[action.status]?.label || action.status}
              </span>
            </div>

            {/* Proposed Action */}
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Proposed Action:
              </p>
              <p className="text-base text-gray-900">
                {action.proposedAction}
              </p>
            </div>

            {/* Implementation Evidence */}
            {action.implementationEvidence && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Implementation Evidence:
                </p>
                <p className="text-base text-gray-900">
                  {action.implementationEvidence}
                </p>
              </div>
            )}

            {/* Responsible Person & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  <User className="h-3 w-3 inline mr-1" />
                  Responsible:
                </p>
                <p className="text-sm text-gray-900">
                  {action.responsibleUser ? formatUserName(action.responsibleUser) : 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Completed On:
                </p>
                <p className="text-sm text-gray-900">
                  {action.actualCompletionDate ? formatDate(action.actualCompletionDate) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Decision Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Decision <span className="text-red-500">*</span>
            </label>
            <select
              {...register('decision')}
              disabled={isSubmitting}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white',
                'text-sm transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                errors.decision
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500'
              )}
            >
              <option value="approved">Approve - Mark as Completed</option>
              <option value="rejected">Reject - Return to Implementation</option>
            </select>
            {errors.decision && (
              <p className="mt-1 text-sm text-red-600">
                {errors.decision.message}
              </p>
            )}
          </div>

          {/* Rejection Reason (Only shown when decision is 'rejected') */}
          {selectedDecision === 'rejected' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Explain why the implementation is insufficient and what needs to be improved.
              </p>
              <textarea
                {...register('rejectionReason')}
                placeholder="The implementation evidence is incomplete etc..."
                rows={5}
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
          )}

          {/* Dynamic Info Banner */}
          <div className={cn(
            'flex items-start gap-3 p-4 border rounded-lg',
            selectedDecision === 'approved' 
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          )}>
            <currentMessage.banner.icon className={cn(
              'h-5 w-5 flex-shrink-0 mt-0.5',
              selectedDecision === 'approved' ? 'text-green-600' : 'text-red-600'
            )} />
            <div className="flex-1">
              <p className={cn(
                'text-sm mt-1',
                selectedDecision === 'approved' ? 'text-green-800' : 'text-red-800'
              )}>
                {currentMessage.banner.description}
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={currentMessage.button.variant}
              disabled={isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <currentMessage.button.icon className="h-4 w-4 mr-2" />
                  {currentMessage.button.label}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}