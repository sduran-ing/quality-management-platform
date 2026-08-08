'use client';

/**
 * =============================================================================
 * CREATE FINDING MODAL
 * =============================================================================
 * 
 * Modal for creating a new audit finding
 * 
 * PERMISSIONS:
 * - QM, Lead Auditor, and Auditor can create findings
 * 
 * BUSINESS LOGIC:
 * - Severity: major_nonconformity, minor_nonconformity, opportunity
 * - Requirement: must be from audit's associated standards
 * - Process: must be from audit's associated processes
 * - Description: minimum 10 characters
 */

import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, FileText, AlertCircle, Clipboard } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import { createFinding } from '@/lib/api/findings';
import { getAuditStandards, getAuditProcesses } from '@/lib/api/audits';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// ============================================================================
// TYPES
// ============================================================================

interface CreateFindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditId: number;
  onSuccess: () => void;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createFindingSchema = z.object({
  severity: z.enum(['major_nonconformity', 'minor_nonconformity', 'opportunity'], {
    message: 'Please select a severity level'
  }),
  
  requirementId: z
    .number({ message: 'Standard requirement is required' })
    .positive({ message: 'Please select a standard requirement' }),
  
  processId: z
    .number({ message: 'Process is required' })
    .positive({ message: 'Please select a process' }),
  
  description: z
    .string()
    .min(1, { message: 'Description is required' })
    .min(10, { message: 'Description must be at least 10 characters' })
    .max(2000, { message: 'Description must not exceed 2000 characters' })
});

type CreateFindingFormData = z.infer<typeof createFindingSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function CreateFindingModal({
  isOpen,
  onClose,
  auditId,
  onSuccess
}: CreateFindingModalProps) {

  const { notify } = useAchievementNotifier();

  // ========================================
  // STATE
  // ========================================

  const [apiError, setApiError] = useState<string | null>(null);
  const [requirementOptions, setRequirementOptions] = useState<SelectOption[]>([]);
  const [processOptions, setProcessOptions] = useState<SelectOption[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);

  // ========================================
  // FORM
  // ========================================

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<CreateFindingFormData>({
    resolver: zodResolver(createFindingSchema),
    defaultValues: {
      severity: 'minor_nonconformity',
      requirementId: 0,
      processId: 0,
      description: ''
    }
  });

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Load requirements and processes when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      loadRequirements();
      loadProcesses();
    }
  }, [isOpen, auditId]);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Load standard requirements from audit's associated standards
   */
  const loadRequirements = async () => {
    try {
      setIsLoadingRequirements(true);
      const response = await getAuditStandards(auditId);
      
      // Flatten requirements from all standards
      const requirements: SelectOption[] = [];
      response.data.standards.forEach((standard: any) => {
        standard.requirements.forEach((req: any) => {
          requirements.push({
            value: req.id,
            label: `${req.clauseNumber} - ${req.title}`,
            subtitle: standard.name
          });
        });
      });

      setRequirementOptions(requirements);
    } catch (error: any) {
      console.error('Error loading requirements:', error);
      setApiError('Failed to load standard requirements');
    } finally {
      setIsLoadingRequirements(false);
    }
  };

  /**
   * Load processes from audit's associated processes
   */
  const loadProcesses = async () => {
    try {
      setIsLoadingProcesses(true);
      const response = await getAuditProcesses(auditId);
      
      const processes = response.data.processes.map((process: any) => ({
        value: process.id,
        label: process.acronym ? `${process.acronym} - ${process.name}` : process.name
      }));

      setProcessOptions(processes);
    } catch (error: any) {
      console.error('Error loading processes:', error);
      setApiError('Failed to load processes');
    } finally {
      setIsLoadingProcesses(false);
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
  const onSubmit = async (data: CreateFindingFormData) => {
    try {
      setApiError(null);

      const response = await createFinding(auditId, {
        severity: data.severity,
        requirementId: data.requirementId,
        processId: data.processId,
        description: data.description.trim()
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
      console.error('Create finding error:', error);
      setApiError(error.response?.data?.message || 'Failed to create finding');
    }
  };

  // ========================================
  // SEVERITY OPTIONS
  // ========================================

  const severityOptions = [
    { value: 'major_nonconformity', label: 'Major Nonconformity' },
    { value: 'minor_nonconformity', label: 'Minor Nonconformity' },
    { value: 'opportunity', label: 'Opportunity for Improvement', }
  ];

  // ========================================
  // RENDER
  // ========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Finding"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">

          {/* API Error */}
          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{apiError}</p>
            </div>
          )}

          {/* Severity Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Severity <span className="text-red-500">*</span>
            </label>
            <select
              {...register('severity')}
              disabled={isSubmitting}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white',
                'text-sm transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                errors.severity
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500'
              )}
            >
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.severity && (
              <p className="mt-1 text-sm text-red-600">
                {errors.severity.message}
              </p>
            )}
          </div>

          {/* Standard Requirement */}
          <div>
            <Controller
              name="requirementId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Standard Requirement"
                  required
                  options={requirementOptions}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value)}
                  placeholder={isLoadingRequirements ? 'Loading requirements...' : 'Select requirement'}
                  disabled={isSubmitting || isLoadingRequirements}
                  error={errors.requirementId?.message}
                />
              )}
            />
          </div>

          {/* Process */}
          <div>
            <Controller
              name="processId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Process"
                  required
                  options={processOptions}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value)}
                  placeholder={isLoadingProcesses ? 'Loading processes...' : 'Select process'}
                  disabled={isSubmitting || isLoadingProcesses}
                  error={errors.processId?.message}
                />
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clipboard className="h-4 w-4 inline mr-1" />
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description')}
              placeholder="Describe the finding in detail, including what was observed and why it's a concern."
              rows={6}
              disabled={isSubmitting}
              className={cn(
                'w-full px-4 py-2.5 rounded-lg border bg-white',
                'text-sm resize-none transition-all',
                'focus:outline-none focus:ring-2',
                errors.description
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              )}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

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
              disabled={isSubmitting || isLoadingRequirements || isLoadingProcesses}
              className="min-w-[180px]"
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Finding
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}