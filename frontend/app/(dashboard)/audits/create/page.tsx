'use client';

/**
 * =============================================================================
 * CREATE AUDIT PAGE
 * =============================================================================
 * 
 * Form to create a new audit
 * 
 * KEY FEATURES:
 * - Zod validation
 * - Multi-select for processes and standards
 * - Dynamic team member assignment with roles
 * - Date range validation
 * 
 * POST /api/audits
 * 
 * - Quality Manager and Process Owner can create
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Calendar,
  Users,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// API imports
import { getAllProcesses, Process } from '@/lib/api/processes';
import { getAllStandards, Standard } from '@/lib/api/standards';
import { getAllUsers, User } from '@/lib/api/users';
import { createAudit } from '@/lib/api/audits';

// Component imports
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import SearchableMultiSelect from '@/components/ui/SearchableMultiSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { cn, formatUserName } from '@/lib/utils';

/**
 * =============================================================================
 * FORM VALIDATION SCHEMA (ZOD)
 * =============================================================================
 */
const createAuditSchema = z.object({
  // Title
  title: z
    .string()
    .min(1, { message: 'Title is required' })
    .min(5, { message: 'Title must be at least 5 characters' }),

  // Audit type
  auditType: z.enum(['internal', 'external', 'certification', 'surveillance'], {
    message: 'Please select an audit type'
  }),

  // Date range
  startDate: z
    .string()
    .min(1, { message: 'Start date is required' }),

  endDate: z
    .string()
    .min(1, { message: 'End date is required' }),

  // Description (optional)
  description: z
    .string()
    .optional(),

  // Process IDs (multi-select)
  processIds: z
    .array(z.number())
    .min(1, { message: 'At least one process is required' }),

  // Standard IDs (multi-select)
  standardIds: z
    .array(z.number())
    .min(1, { message: 'At least one standard is required' }),

  // Team members (dynamic array)
teamMembers: z
    .array(
      z.object({
        userId: z.number().positive({ message: 'Please select a user' }),
        role: z.enum(['lead_auditor', 'auditor', 'auditee'], {
          message: 'Please select a role'
        })
      })
    )
    .min(2, { message: 'At least 2 team members are required (1 Lead Auditor + 1 Auditee)' })
    .superRefine((members, ctx) => {
      // Check for lead auditor
      const hasLeadAuditor = members.some(m => m.role === 'lead_auditor');
      if (!hasLeadAuditor) {
        ctx.addIssue({
          code: "custom",
          message: 'At least one Lead Auditor is required',
          path: []  // Error applies to the whole array
        });
      }

      // Check for auditee
      const hasAuditee = members.some(m => m.role === 'auditee');
      if (!hasAuditee) {
        ctx.addIssue({
          code: "custom",
          message: 'At least one Auditee is required',
          path: []  // Error applies to the whole array
        });
      }

      // Check for duplicate users
      const userIds = members.map(m => m.userId);
      const uniqueUserIds = new Set(userIds);
      if (userIds.length !== uniqueUserIds.size) {
        ctx.addIssue({
          code: "custom",
          message: 'Each team member can only be assigned once. Please select different users.',
          path: []
        });
      }
    })
}).refine(
  // Date validation: start must be before end
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: 'Start date must be before or equal to end date',
    path: ['endDate']
  }
);

type CreateAuditFormData = z.infer<typeof createAuditSchema>;

/**
 * =============================================================================
 * COMPONENT
 * =============================================================================
 */
export default function CreateAuditPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { notify } = useAchievementNotifier();

  // ========================================
  // FORM STATE
  // ========================================

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<CreateAuditFormData>({
    resolver: zodResolver(createAuditSchema),
    defaultValues: {
      title: '',
      auditType: 'internal',
      startDate: '',
      endDate: '',
      description: '',
      processIds: [],
      standardIds: [],
      teamMembers: [{ userId: 0, role: 'lead_auditor' },
        { userId: 0, role: 'auditee' }
      ]
    }
  });

  // Dynamic team members array
  // Default value (mandatory, at least one lead_auditor and auditee):
  // teamMembers: [{ userId: 0, role: 'lead_auditor' }]
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'teamMembers'
  });

  // ========================================
  // STATE
  // ========================================

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // ========================================
  // FETCH OPTIONS
  // ========================================

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoadingOptions(true);

        // Fetch all options in parallel
        const [processesRes, standardsRes, usersRes] = await Promise.all([
          getAllProcesses(),
          getAllStandards(),
          getAllUsers({ isActive: true })
        ]);

        console.log('Fetched options:', {
          processes: processesRes.data.processes.length,
          standards: standardsRes.data.standards.length,
          users: usersRes.data.users.length
        });

        setProcesses(processesRes.data.processes);
        setStandards(standardsRes.data.standards);
        setUsers(usersRes.data.users);

      } catch (error: any) {
        console.error('Error fetching options:', error);
        setSubmitError('Failed to load form options. Please refresh the page.');
      } finally {
        setIsLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  // ========================================
  // CONVERT TO SELECT OPTIONS
  // ========================================

  const processOptions: SelectOption[] = processes.map(proc => ({
    value: proc.id,
    label: `${proc.acronym} - ${proc.name}`
  }));

  const standardOptions: SelectOption[] = standards.map(std => ({
    value: std.id,
    label: `${std.name} (v${std.version})`,
    subtitle: std.description
  }));

  const userOptions: SelectOption[] = users.map(u => ({
    value: u.id,
    label: formatUserName(u),
    subtitle: u.email
  }));

  // Audit type options
  const auditTypeOptions = [
    { value: 'internal', label: 'Internal Audit', description: 'Audit conducted by internal team' },
    { value: 'external', label: 'External Audit', description: 'Audit conducted by external auditors' },
    { value: 'certification', label: 'Certification Audit', description: 'Audit for certification purposes' },
    { value: 'surveillance', label: 'Surveillance Audit', description: 'Periodic monitoring audit' }
  ];

  // Team role options
  const roleOptions: SelectOption[] = [
    { value: 'lead_auditor', label: 'Lead Auditor' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'auditee', label: 'Auditee' }
  ];

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle form submission
   */
  const onSubmit = async (data: CreateAuditFormData) => {
    try {
      setSubmitError(null);

      console.log('Creating audit:', data);

      // Call API
      const response = await createAudit({
        title: data.title.trim(),
        auditType: data.auditType,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description?.trim(),
        processIds: data.processIds,
        standardIds: data.standardIds,
        teamMembers: data.teamMembers
      });

      if (response.success) {
        console.log('Audit created:', response.data.audit);

        // Redirect to the created audit detail page
        router.push(`/audits/${response.data.audit.id}`);
      }

      // Trigger notifications if achievements returned
      if (response.achievements) {
        notify(response.achievements);
      }

    } catch (error: any) {
      console.error('Create audit error:', error);
      setSubmitError(
        error.response?.data?.message ||
        error.message ||
        'Failed to create audit. Please try again.'
      );
    }
  };

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoadingOptions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/audits')}
            className="gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>

          <h1 className="text-3xl font-bold text-gray-900">Create New Audit</h1>
        </div>

        {/* Error Banner */}
        {submitError && (
          <div className="mb-6">
            <ErrorMessage message={submitError} />
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            {/* Left accent stripe */}
            <div className="w-2 bg-primary-600 flex-shrink-0" />

            {/* Form content */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 p-8">
              <div className="space-y-6">                
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Audit Information
                  </h3>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audit Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., ISO 9001:2015 Internal Audit - Q1 2025"
                    error={errors.title?.message}
                    disabled={isSubmitting}
                    {...register('title')}
                  />
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Audit Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Audit Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('auditType')}
                      disabled={isSubmitting}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border bg-white',
                        'text-sm transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500',
                        errors.auditType
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-primary-500'
                      )}
                    >
                      {auditTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.auditType && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.auditType.message}
                      </p>
                    )}
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      error={errors.startDate?.message}
                      disabled={isSubmitting}
                      {...register('startDate')}
                    />
                  </div>

                  {/* End Date */}
                  <div className="md:col-start-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      error={errors.endDate?.message}
                      disabled={isSubmitting}
                      {...register('endDate')}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe the purpose and scope of this audit..."
                    rows={3}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white',
                      'text-sm resize-none transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500',
                      'border-gray-300 focus:border-primary-500'
                    )}
                    {...register('description')}
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <Users className="h-5 w-5 inline mr-2" />
                      Audit Team
                    </h3>                    
                    <Button
                      type="button"
                      variant="outline"

                      // 'append' method from useFieldArray, creates empty team member
                      onClick={() => append({ userId: 0, role: 'auditor' })}
                      disabled={isSubmitting}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Member
                    </Button>                    
                  </div>
                  <p className="text-sm mb-3">
                      <strong>Team Requirements:</strong> At least 1 Lead Auditor and 1 Auditee are required.
                  </p>

                  {/* Team Members Validation Errors - ALWAYS VISIBLE */}
                  {errors.teamMembers && (
                    <div className="mb-4 space-y-2">
                      {/* Array-level error (min length) */}
                      {errors.teamMembers.message && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-800">{errors.teamMembers.message}</p>
                        </div>
                      )}
                      
                      {/* Refinement errors (lead auditor, auditee) */}
                      {errors.teamMembers.root && (
                        <div className="space-y-2">
                          {Array.isArray(errors.teamMembers.root) ? (
                            errors.teamMembers.root.map((error: any, index: number) => (
                              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800">{error.message}</p>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-red-800">{errors.teamMembers.root.message}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Team Members List */}
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        
                        {/* User Select */}
                        <div className="flex-1">
                          <Controller
                            // Nested path: teamMembers[0].userId using the useFieldArray declared previously
                            name={`teamMembers.${index}.userId`}
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                options={userOptions}
                                value={field.value || null}

                                // User selects "John Doe" (ID: 1), onChange(1) then field.onChange(1) 
                                // React Hook Form updates: teamMembers[0].userId = 1
                                onChange={(value) => field.onChange(value)}
                                placeholder="Select team member"
                                error={errors.teamMembers?.[index]?.userId?.message}
                                disabled={isSubmitting}
                              />
                            )}
                          />
                        </div>

                        {/* Role Select */}
                        <div className="w-48">
                          <Controller
                            // Nested path: teamMembers[0].userId using the useFieldArray declared previously
                            name={`teamMembers.${index}.role`}
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                options={roleOptions}
                                value={field.value}

                                // User selects "Lead Auditor", onChange('lead_auditor'), field.onChange('lead_auditor')
                                // React Hook Form updates: teamMembers[0].role = 'lead_auditor'
                                onChange={(value) => field.onChange(value)}
                                placeholder="Select role"
                                error={errors.teamMembers?.[index]?.role?.message}
                                disabled={isSubmitting}
                              />
                            )}
                          />
                        </div>

                        {/* Remove Button */}
                        {fields.length > 1 && (
                          <button
                            type="button"

                            // 'remove' method from useFieldArray, removes a team member
                            onClick={() => remove(index)}
                            disabled={isSubmitting}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 mt-1"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Audit Scope
                  </h3>
                </div>

                {/* Processes Multi-Select */}
                <Controller
                  name="processIds"
                  control={control}
                  render={({ field }) => (
                    <SearchableMultiSelect
                      label="Processes"
                      required
                      options={processOptions}
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      placeholder="Select processes to audit"
                      error={errors.processIds?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />

                {/* Standards Multi-Select */}
                <Controller
                  name="standardIds"
                  control={control}
                  render={({ field }) => (
                    <SearchableMultiSelect
                      label="Standards"
                      required
                      options={standardOptions}
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      placeholder="Select standards to audit against"
                      error={errors.standardIds?.message}
                      disabled={isSubmitting}
                    />
                  )}
                />                

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/audits')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Audit'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}