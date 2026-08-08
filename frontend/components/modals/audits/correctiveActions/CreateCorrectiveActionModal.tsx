'use client';

/**
 * =============================================================================
 * CREATE CORRECTIVE ACTION MODAL
 * =============================================================================
 * 
 * Modal for creating a new corrective action for a finding
 * 
 * PERMISSIONS:
 * - QM and auditees can create corrective actions
 * - Finding must be in status: open or in_progress
 */

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { createCorrectiveAction } from '@/lib/api/correctiveActions';
import { getAuditTeamMembers } from '@/lib/api/audits';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// ============================================================================
// TYPES
// ============================================================================

interface CreateCorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: number;
  findingId: number;
  findingNumber: string;
  onSuccess: () => void;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createCASchema = z.object({
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

type CreateCAFormData = z.infer<typeof createCASchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function CreateCorrectiveActionModal({
  isOpen,
  onClose,
  auditId,
  findingId,
  findingNumber,
  onSuccess
}: CreateCorrectiveActionModalProps) {

  const { notify } = useAchievementNotifier();

  // ========================================
  // STATE
  // ========================================

  const [isCreating, setIsCreating] = useState(false);
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
  } = useForm<CreateCAFormData>({
    resolver: zodResolver(createCASchema),
    defaultValues: {
      proposedAction: '',
      rootCauseAnalysis: '',
      responsibleUserId: undefined,
      expectedCompletionDate: ''
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
          value: member.id,  // Keep as number
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
  const onSubmit = async (data: CreateCAFormData) => {
    try {
      setIsCreating(true);
      setApiError(null);

      const response = await createCorrectiveAction(auditId, findingId, {
        proposedAction: data.proposedAction.trim(),
        rootCauseAnalysis: data.rootCauseAnalysis?.trim(),
        responsibleUserId: data.responsibleUserId,
        expectedCompletionDate: data.expectedCompletionDate
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
      console.error('Create corrective action error:', error);
      setApiError(error.response?.data?.message || 'Failed to create corrective action');
    } finally {
      setIsCreating(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Corrective Action"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        
        {/* Finding Reference */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            Creating corrective action for finding:
          </p>
          <p className="text-base font-semibold text-gray-900 mt-1">
            {findingNumber}
          </p>
        </div>

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
            disabled={isCreating}
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
            disabled={isCreating}
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
                value={field.value || null}  // Value binding
                onChange={(value) => field.onChange(value)}  // Direct onChange
                placeholder={isLoadingAuditees ? 'Loading auditees...' : 'Select responsible user'}
                disabled={isCreating || isLoadingAuditees}
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
            disabled={isCreating}
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isCreating || isLoadingAuditees}
            className="min-w-[200px]"
          >
            {isCreating ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Corrective Action'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}