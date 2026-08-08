'use client';

/**
 * =============================================================================
 * EDIT CORRECTIVE ACTION MODAL
 * =============================================================================
 * 
 * Modal for editing a rejected corrective action
 * After editing, status changes back to 'proposed' for re-approval
 * 
 * - QM and auditees can edit
 * - Can only edit when status 'rejected'
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Edit } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { editCorrectiveAction, CorrectiveAction } from '@/lib/api/correctiveActions';
import { getAuditTeamMembers } from '@/lib/api/audits';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface EditCorrectiveActionModalProps {
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

const editCASchema = z.object({
  proposedAction: z
    .string()
    .min(1, { message: 'Proposed action is required' })
    .min(10, { message: 'Proposed action must be at least 10 characters' })
    .max(1000, { message: 'Proposed action must not exceed 1000 characters' }),
  
  rootCauseAnalysis: z
    .string()
    .max(1000, { message: 'Root cause analysis must not exceed 1000 characters' })
    .optional(),
  
  responsibleUserId: z
    .number({ message: 'Responsible user is required' })
    .positive({ message: 'Please select a responsible user' }),
  
  expectedCompletionDate: z
    .string()
    .min(1, { message: 'Expected completion date is required' })
    .refine((date) => new Date(date) > new Date(), {
      message: 'Expected completion date must be in the future'
    })
});

type EditCAFormData = z.infer<typeof editCASchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function EditCorrectiveActionModal({
  isOpen,
  onClose,
  auditId,
  findingId,
  action,
  onSuccess
}: EditCorrectiveActionModalProps) {

  // ========================================
  // STATE
  // ========================================

  const [isUpdating, setIsUpdating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [auditeeOptions, setAuditeeOptions] = useState<SelectOption[]>([]);
  const [isLoadingAuditees, setIsLoadingAuditees] = useState(false);

  // ========================================
  // FORM
  // ========================================

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm<EditCAFormData>({
    resolver: zodResolver(editCASchema),
    defaultValues: {
      proposedAction: action.proposedAction,
      rootCauseAnalysis: action.rootCauseAnalysis || '',
      responsibleUserId: action.responsibleUserId,
      expectedCompletionDate: action.expectedCompletionDate.split('T')[0]  // Format for date input
    }
  });

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Load auditees when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      loadAuditees();
    }
  }, [isOpen, auditId]);

  /**
   * Reset form with action data when action changes
   */
  useEffect(() => {
    if (isOpen && action) {
      reset({
        proposedAction: action.proposedAction,
        rootCauseAnalysis: action.rootCauseAnalysis || '',
        responsibleUserId: action.responsibleUserId,
        expectedCompletionDate: action.expectedCompletionDate.split('T')[0]
      });
    }
  }, [isOpen, action, reset]);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Load audit team members (filter auditees)
   */
  const loadAuditees = async () => {
    try {
      setIsLoadingAuditees(true);
      const response = await getAuditTeamMembers(auditId);
      
      // Filter only auditees
      const auditees = response.data.teamMembers
        .filter(member => member.auditTeam?.role === 'auditee')
        .map(member => ({
          value: member.id,
          label: `${member.firstName} ${member.lastName}`,
          subtitle: member.email
        }));

      setAuditeeOptions(auditees);
    } catch (error: any) {
      console.error('Error loading auditees:', error);
      setApiError('Failed to load available users');
    } finally {
      setIsLoadingAuditees(false);
    }
  };

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
  const onSubmit = async (data: EditCAFormData) => {
    try {
      setIsUpdating(true);
      setApiError(null);

      await editCorrectiveAction(auditId, findingId, action.id, {
        proposedAction: data.proposedAction.trim(),
        rootCauseAnalysis: data.rootCauseAnalysis?.trim(),
        responsibleUserId: data.responsibleUserId,
        expectedCompletionDate: data.expectedCompletionDate
      });

      // Success
      onSuccess();
      handleClose();

    } catch (error: any) {
      console.error('Edit corrective action error:', error);
      setApiError(error.response?.data?.message || 'Failed to update corrective action');
    } finally {
      setIsUpdating(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Corrective Action"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>

        {/* Rejection Reason (if exists) */}
        {action.rejectionReason && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-bold text-red-700 uppercase tracking-wide mb-1">
              Previous Rejection Reason:
            </p>
            <p className="text-sm text-red-900">
              {action.rejectionReason}
            </p>
          </div>
        )}

        {/* API Error */}
        {apiError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {/* Proposed Action */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proposed Action <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('proposedAction')}
            placeholder="Describe the corrective action to be taken..."
            rows={4}
            disabled={isUpdating}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border bg-white',
              'text-sm resize-none transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              errors.proposedAction
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500'
            )}
          />
          {errors.proposedAction && (
            <p className="mt-1 text-sm text-red-600">
              {errors.proposedAction.message}
            </p>
          )}
        </div>

        {/* Root Cause Analysis (Optional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Root Cause Analysis (Optional)
          </label>
          <textarea
            {...register('rootCauseAnalysis')}
            placeholder="Describe why the problem occurred..."
            rows={3}
            disabled={isUpdating}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border bg-white',
              'text-sm resize-none transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              errors.rootCauseAnalysis
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500'
            )}
          />
          {errors.rootCauseAnalysis && (
            <p className="mt-1 text-sm text-red-600">
              {errors.rootCauseAnalysis.message}
            </p>
          )}
        </div>

        {/* Responsible User (Auditee) */}
        <div className="mb-4">
          <Controller
            name="responsibleUserId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Responsible"
                required
                options={auditeeOptions}
                value={field.value || null}
                onChange={(value) => field.onChange(value)}
                placeholder={isLoadingAuditees ? 'Loading auditees...' : 'Select responsible user'}
                disabled={isUpdating || isLoadingAuditees}
                error={errors.responsibleUserId?.message}
              />
            )}
          />
        </div>

        {/* Expected Completion Date */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Completion Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register('expectedCompletionDate')}
            disabled={isUpdating}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border bg-white',
              'text-sm transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              errors.expectedCompletionDate
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500'
            )}
          />
          {errors.expectedCompletionDate && (
            <p className="mt-1 text-sm text-red-600">
              {errors.expectedCompletionDate.message}
            </p>
          )}
        </div>

        {/* Confirmation text */}
        <p className="text-sm text-gray-700 pb-4">
          After saving, this action {action.actionNumber} will return to proposed status for re-approval.
        </p>

        {/* Actions Buttons*/}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isUpdating || isLoadingAuditees}
            className="min-w-[180px]"
          >
            {isUpdating ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Updating...
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Update Action
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}