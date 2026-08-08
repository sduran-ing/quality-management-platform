'use client';

/**
 * =============================================================================
 * EDIT AUDIT PAGE
 * =============================================================================
 * 
 * Form to edit an existing audit
 * Pre-populates all fields with current audit data
 * 
 * - Quality Manager and Lead Auditor can edit
 * - Can only edit audits with status: 'scheduled'
 * - Status does NOT change after edit
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Calendar,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  Save
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

// API imports
import { getAuditById, editAudit, Audit } from '@/lib/api/audits';
import { getAllProcesses, Process } from '@/lib/api/processes';
import { getAllStandards, Standard } from '@/lib/api/standards';
import { getAllUsers, User } from '@/lib/api/users';

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
 * VALIDATION SCHEMA
 * =============================================================================
 */
const editAuditSchema = z.object({
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

type EditAuditFormData = z.infer<typeof editAuditSchema>;

/**
 * =============================================================================
 * COMPONENT
 * =============================================================================
 */
export default function EditAuditPage() {
  const router = useRouter();
  const params = useParams();
  const auditId = parseInt(params.id as string);
  const { user } = useAuth();

  // ========================================
  // STATE
  // ========================================

  const [isLoadingAudit, setIsLoadingAudit] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // ========================================
  // FORM
  // ========================================

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EditAuditFormData>({
    resolver: zodResolver(editAuditSchema)
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'teamMembers'
  });

  // ========================================
  // FETCH AUDIT DATA
  // ========================================

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setIsLoadingAudit(true);
        const response = await getAuditById(auditId);
        const auditData = response.data.audit;
        
        // DEBUG
        console.log('Team members structure:', auditData.teamMembers);

        setAudit(auditData);

        // Pre-populate form with audit data
        reset({
          title: auditData.title,
          auditType: auditData.auditType,
          startDate: auditData.scheduledStartDate?.split('T')[0], // Format for input[type="date"]
          endDate: auditData.scheduledEndDate?.split('T')[0],
          description: auditData.description || '',
          processIds: auditData.processes?.map((p: any) => p.id) || [],
          standardIds: auditData.standards?.map((s: any) => s.id) || [],
          teamMembers: auditData.teamMembers?.map((tm: any) => ({
            userId: tm.id,

            // This is how the role information is retrieved and stored:
            // export interface TeamMember extends User {
            //   auditTeam?: {
            //     role: TeamMemberRole;
            //   };
            // }
            role: tm.auditTeam?.role
          })) || [{ userId: 0, role: 'lead_auditor' }]
        });

      } catch (error: any) {
        console.error('Error fetching audit:', error);
        setSubmitError('Failed to load audit data. Please try again.');
      } finally {
        setIsLoadingAudit(false);
      }
    };

    fetchAudit();
  }, [auditId, reset]);

  // ========================================
  // FETCH OPTIONS
  // ========================================

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoadingOptions(true);

        const [processesRes, standardsRes, usersRes] = await Promise.all([
          getAllProcesses(),
          getAllStandards(),
          getAllUsers({ isActive: true })
        ]);

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
  // OPTIONS
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

  const auditTypeOptions = [
    { value: 'internal', label: 'Internal Audit' },
    { value: 'external', label: 'External Audit' },
    { value: 'certification', label: 'Certification Audit' },
    { value: 'surveillance', label: 'Surveillance Audit' }
  ];

  const roleOptions: SelectOption[] = [
    { value: 'lead_auditor', label: 'Lead Auditor' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'auditee', label: 'Auditee' }
  ];

  // ========================================
  // HANDLERS
  // ========================================

  const onSubmit = async (data: EditAuditFormData) => {
    try {
      setSubmitError(null);

      console.log('Updating audit:', data);

      const response = await editAudit(auditId, {
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
        console.log('Audit updated:', response.data.audit);
        router.push(`/audits/${auditId}`);
      }

    } catch (error: any) {
      console.error('Edit audit error:', error);
      setSubmitError(
        error.response?.data?.message ||
        error.message ||
        'Failed to update audit. Please try again.'
      );
    }
  };

  // ========================================
  // LOADING STATES
  // ========================================

  if (isLoadingAudit || isLoadingOptions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading audit...</p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Audit not found</p>
          <Button
            variant="outline"
            onClick={() => router.push('/audits')}
            className="mt-4"
          >
            Back to Audits
          </Button>
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
            onClick={() => router.push(`/audits/${auditId}`)}
            className="gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>

          <h1 className="text-3xl font-bold text-gray-900">Edit Audit</h1>
          <p className="text-gray-600 mt-2">
            Editing: <span className="font-semibold">{audit.title}</span>
          </p>
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
                            name={`teamMembers.${index}.userId`}
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                options={userOptions}

                                // Because we have pre-populated data, we have value = teamMember.id
                                // Then the value will match the label defined in "userOptions", which is the user name
                                value={field.value || null}
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
                            name={`teamMembers.${index}.role`}
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                options={roleOptions}

                                // Because we have pre-populated data, we have value = teamMember.auditRole
                                // Then the value will match the label defined in "roleOptions", which is the role name
                                value={field.value}
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

                {/* Processes */}
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

                {/* Standards */}
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
                    onClick={() => router.push(`/audits/${auditId}`)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="min-w-[160px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Audit
                      </>
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