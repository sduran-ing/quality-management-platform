'use client';

/**
 * =============================================================================
 * IMPLEMENT CORRECTIVE ACTION MODAL
 * =============================================================================
 * 
 * Modal for adding implementation evidence and sending to verification
 * 
 * - QM and auditees can implement
 * - Can only implement when status 'in_implementation'
 * - Changes status to 'pending_verification'
 */

import { useState } from 'react';
import { Send, AlertTriangle, FileText, Calendar, User } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { implementCorrectiveAction, CorrectiveAction } from '@/lib/api/correctiveActions';
import { formatDate, formatUserName, CORRECTIVE_ACTION_STATUSES } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// ============================================================================
// TYPES
// ============================================================================

interface ImplementCorrectiveActionModalProps {
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

const implementEvidenceSchema = z.object({
  implementationEvidence: z
    .string()
    .min(1, { message: 'Implementation evidence is required' })
    .min(10, { message: 'Implementation evidence must be at least 10 characters' })
    .max(2000, { message: 'Implementation evidence must not exceed 2000 characters' })
});

type ImplementEvidenceFormData = z.infer<typeof implementEvidenceSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function ImplementCorrectiveActionModal({
  isOpen,
  onClose,
  auditId,
  findingId,
  action,
  onSuccess
}: ImplementCorrectiveActionModalProps) {

  const { notify } = useAchievementNotifier();

  // ========================================
  // FORM
  // ========================================

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ImplementEvidenceFormData>({
    resolver: zodResolver(implementEvidenceSchema),
    defaultValues: {
      implementationEvidence: ''
    }
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
  const onSubmit = async (data: ImplementEvidenceFormData) => {
    try {
      setApiError(null);

      const response = await implementCorrectiveAction(auditId, findingId, action.id, data.implementationEvidence);

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
      console.error('Implement corrective action error:', error);
      setApiError(error.response?.data?.message || 'Failed to implement corrective action');
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Implement Corrective Action"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Send className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                This will change the status to pending verification and notify auditors for review.
              </p>
            </div>
          </div>

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

            {/* Responsible Person & Date */}
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
                  Expected Completion:
                </p>
                <p className="text-sm text-gray-900">
                  {formatDate(action.expectedCompletionDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Implementation Evidence Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Implementation Evidence <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Describe what was done to implement this corrective action and provide evidence of completion.
            </p>
            <textarea
              {...register('implementationEvidence')}
              placeholder="Implementation evidence..."
              rows={6}
              disabled={isSubmitting}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white',
                'text-sm resize-none transition-all',
                'focus:outline-none focus:ring-2',
                errors.implementationEvidence
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              )}
            />
            {errors.implementationEvidence && (
              <p className="mt-1 text-sm text-red-600">
                {errors.implementationEvidence.message}
              </p>
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="min-w-[220px]"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}