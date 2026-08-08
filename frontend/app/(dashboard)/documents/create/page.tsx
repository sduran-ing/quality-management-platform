'use client';

/**
 * =============================================================================
 * CREATE DOCUMENT PAGE
 * =============================================================================
 * 
 * Form to create a new document with file upload.
 * 
 * KEY FEATURES:
 * - Zod validation (consistent with register page)
 * - Drag & drop file upload
 * - Multiple file type support (PDF, DOCX, XLSX, images)
 * - Searchable dropdowns
 * 
 * POST /api/documents (multipart/form-data)
 * 
 * FILE UPLOAD FLOW:
 * 1. User selects/drops file
 * 2. Frontend validates type & size
 * 3. Backend uploads to S3
 * 4. Backend creates document + version records
 * 5. Redirect to document detail page
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Upload,
  X,
  FileText
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// Import API functions for dropdowns
import { getAllDocumentTypes, DocumentType } from '@/lib/api/documentTypes';
import { getAllProcesses, Process } from '@/lib/api/processes';
import { getAllDepartments, Department } from '@/lib/api/departments';
import { getApprovers, Approver } from '@/lib/api/users';
import { createDocument } from '@/lib/api/documents';

import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { cn, formatUserName, formatFileSize, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/utils';

/**
 * =============================================================================
 * FORM VALIDATION SCHEMA (ZOD)
 * =============================================================================
 * 
 * Using Zod for type-safe validation
 * Consistent with register page pattern
 * 
 * VALIDATION RULES:
 * - All fields required
 * - Name: minimum 3 characters
 * - IDs: must be numbers > 0
 * - Change notes: minimum 10 characters
 * - File: custom validation (type & size checked separately)
 */
const createDocumentSchema = z.object({
  // Document name
  name: z
    .string()
    .min(1, { message: 'Document name is required' })
    .min(3, { message: 'Document name must be at least 3 characters' }),

  // Document type ID (from dropdown)
  documentTypeId: z
    .number({ message: 'Document type is required' })
    .positive({ message: 'Please select a document type' }),

  // Process ID (from dropdown)
  processId: z
    .number({ message: 'Process is required' })
    .positive({ message: 'Please select a process' }),

  // Department ID (from dropdown)
  departmentId: z
    .number({ message: 'Department is required' })
    .positive({ message: 'Please select a department' }),

  // Assigned approver ID (from dropdown)
  assignedApproverId: z
    .number({ message: 'Assigned approver is required' })
    .positive({ message: 'Please select an approver' }),

  // Change notes (optional but encouraged)
  changeNotes: z
    .string()
    .min(1, { message: 'Change notes are required' })
    .min(10, { message: 'Change notes must be at least 10 characters' }),

  // File (handled separately - can't validate File type with Zod easily)
  file: z.any().refine((file) => file !== null, {
    message: 'File upload is required'
  })
});

// TypeScript type inferred from schema
type CreateDocumentFormData = z.infer<typeof createDocumentSchema>;

/**
 * =============================================================================
 * COMPONENT
 * =============================================================================
 */
export default function CreateDocumentPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { notify } = useAchievementNotifier();

  // ========================================
  // FILE UPLOAD STATE
  // ========================================

  /**
   * Separate file state for better control
   * 
   * WHY SEPARATE:
   * - Zod can't easily validate File objects
   * - Need to validate type & size independently
   * - Easier to handle drag & drop
   */
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================
  // FORM STATE (React Hook Form + Zod)
  // ========================================

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateDocumentFormData>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      name: '',
      documentTypeId: undefined,
      processId: undefined,
      departmentId: undefined,
      assignedApproverId: undefined,
      changeNotes: '',
      file: null
    }
  });

  // ========================================
  // API ERROR STATE
  // ========================================

  const [submitError, setSubmitError] = useState<string | null>(null);

  // ========================================
  // DROPDOWN OPTIONS STATE
  // ========================================

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // ========================================
  // FETCH DROPDOWN OPTIONS
  // ========================================

  /**
   * Fetch all dropdown options on mount
   * 
   * PARALLEL LOADING:
   * - Faster than sequential
   * - All or nothing error handling
   * 
   * ROLE-BASED FILTERING:
   * - Approvers: Only QM and Process Owners
   * - Other options: All returned from backend
   */
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoadingOptions(true);

        // Fetch all options in parallel for speed
        const [typesRes, processesRes, departmentsRes, usersRes] = await Promise.all([
          getAllDocumentTypes(),
          getAllProcesses(),
          getAllDepartments(),

          // Only Quality Managers and Process Owners can approve. Backend validates this, and returns users matching this rule
          // Avoiding the necessity to filter all the users in the frontend (getAllUsers API call)
          getApprovers()
        ]);

        console.log('Fetched options:', {
          types: typesRes.data.documentTypes.length,
          processes: processesRes.data.processes.length,
          departments: departmentsRes.data.departments.length,
          approvers: usersRes.data.approvers.length
        });

        setDocumentTypes(typesRes.data.documentTypes);
        setProcesses(processesRes.data.processes);
        setDepartments(departmentsRes.data.departments);
        setApprovers(usersRes.data.approvers);

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

  const documentTypeOptions: SelectOption[] = documentTypes.map(type => ({
    value: type.id,
    label: `${type.acronym} - ${type.name}`,
  }));

  const processOptions: SelectOption[] = processes.map(proc => ({
    value: proc.id,
    label: `${proc.name} (${proc.acronym})`,
  }));

  const departmentOptions: SelectOption[] = departments.map(dept => ({
    value: dept.id,
    label: dept.name,
  }));

  const approverOptions: SelectOption[] = approvers.map(approver => ({
    value: approver.id,
    // Could not use "formatUserName" function because it receives first_name and last_name, and Approvers attributes are camelCase
    label: `${approver.firstName} ${approver.lastName}`,
    subtitle: approver.role === 'quality_manager' ? 'Quality Manager' : 'Process Owner'
  }));

  // ========================================
  // FILE VALIDATION
  // ========================================

  /**
   * Validate file type and size
   * 
   * CHECKS:
   * 1. File type matches allowed types
   * 2. File size within limit (10MB)
   * 
   * RETURNS:
   * - null if valid
   * - error message if invalid
   */
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
      return 'File type not supported. Please upload PDF, Word, Excel, or image files.';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  // ========================================
  // FILE SELECTION HANDLERS
  // ========================================

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  /**
   * Handle drag & drop events
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  /**
   * Central file change handler
   * 
   * VALIDATION FLOW:
   * 1. Validate file type & size
   * 2. If invalid: show error, don't set file
   * 3. If valid: set file, clear errors, update form
   */
  const handleFileChange = (file: File) => {
    const error = validateFile(file);

    if (error) {
      setFileError(error);
      setSelectedFile(null);
      setValue('file', null);
    } else {
      setSelectedFile(file);
      setFileError(null);
      setValue('file', file); // Update react-hook-form
    }
  };

  /**
   * Remove selected file
   */
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setValue('file', null);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ========================================
  // FORM SUBMISSION
  // ========================================

  /**
   * Handle form submission
   * 
   * FLOW:
   * 1. Zod validation (automatic via react-hook-form)
   * 2. File validation (already done)
   * 3. Create FormData with all fields
   * 4. Call API
   * 5. Redirect to document detail on success
   * 
   * ERROR HANDLING:
   * - Form validation errors: shown on fields
   * - File errors: shown on file upload area
   * - API errors: shown in banner at top
   */
  const onSubmit = async (data: CreateDocumentFormData) => {
    try {
      // Double-check file exists
      if (!selectedFile) {
        setFileError('Please select a file to upload');
        return;
      }

      setSubmitError(null);

      console.log('Submitting document:', {
        name: data.name,
        documentTypeId: data.documentTypeId,
        processId: data.processId,
        departmentId: data.departmentId,
        assignedApproverId: data.assignedApproverId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size
      });

      /**
       * CALL API
       * 
       * API function handles FormData creation
       * Backend expects multipart/form-data
       */
      const response = await createDocument({
        name: data.name.trim(),
        documentTypeId: data.documentTypeId,
        processId: data.processId,
        departmentId: data.departmentId,
        assignedApproverId: data.assignedApproverId,
        changeNotes: data.changeNotes.trim(),
        file: selectedFile
      });

      if (response.success) {
        console.log('Document created:', response.data.document);

        // Redirect to the created document's version detail page
        router.push(`/documents/${response.data.document.id}/versions/${response.data.document.currentVersion.versionId}`);
      }

      // Trigger notifications if achievements returned
      if (response.achievements) {
        notify(response.achievements);
      }

    } catch (error: any) {
      console.error('Create document error:', error);
      setSubmitError(
        error.response?.data?.message ||
        error.message ||
        'Failed to create document. Please try again.'
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

        {/**
         * =====================================================================
         * HEADER
         * =====================================================================
         */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/documents')}
            className="gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>

          <h1 className="text-3xl font-bold text-gray-900">Create New Document</h1>
        </div>

        {/**
         * =====================================================================
         * ERROR BANNER
         * =====================================================================
         * 
         * Shows API errors (backend errors, network errors, etc.)
         */}
        {submitError && (
          <div className="mb-6">
            <ErrorMessage message={submitError} />
          </div>
        )}

        {/**
         * =====================================================================
         * FORM CARD WITH LEFT STRIPE
         * =====================================================================
         * 
         * DESIGN PATTERN:
         * - 2px vertical stripe on left (primary color)
         * - Clean white card
         * - Shadow for depth
         */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            {/* Left accent stripe */}
            <div className="w-2 bg-primary-600 flex-shrink-0" />

            {/* Form content */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 p-8">
              <div className="space-y-6">

                {/**
                 * =============================================================
                 * DOCUMENT NAME
                 * =============================================================
                 */}
                <div>
                  {/* Label with required indicator */}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Name <span className="text-red-500">*</span>
                  </label>

                  <Input
                    type="text"
                    placeholder="e.g., Student Registration Process"

                    // Display validation error message (from Zod schema)
                    error={errors.name?.message}

                    // Disable input during form submission to prevent changes
                    disabled={isSubmitting}

                    /* 
                      Register input with React Hook Form
                      Spreads: { name, onChange, onBlur, ref }
                      - name: Sets input name attribute
                      - onChange: Updates form state on every keystroke
                      - onBlur: Triggers validation when user leaves field
                      - ref: Allows React Hook Form to access DOM element
                    */
                    {...register('name')}
                  />
                </div>

                {/**
                 * =============================================================
                 * TWO COLUMN GRID - DROPDOWN FIELDS
                 * =============================================================
                 * 
                 * Using Controller from react-hook-form for custom components
                 * SearchableSelect doesn't work with {...register()}
                 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Document Type */}
                  <Controller
                    // Field name - must match Zod schema key
                    name="documentTypeId"

                    // Link to React Hook Form instance (from useForm hook)
                    control={control}

                    /* 
                      Render function receives 'field' object with:
                      - field.value: Current form value
                      - field.onChange: Function to update form state
                      - field.onBlur: Function to trigger validation
                      - field.name: Field name
                      - field.ref: Reference callback
                    */
                    render={({ field }) => (
                      <SearchableSelect
                        label="Document Type"

                        // Dropdown options array 
                        options={documentTypeOptions}

                        // Current selected value from form state 
                        // || null: Fallback to null if undefined (prevents uncontrolled component warning)
                        value={field.value || null}

                        /* 
                          Update form state when selection changes
                          SearchableSelect calls this with the selected value directly (not event object)
                          field.onChange updates React Hook Form's internal state
                        */
                        onChange={(value) => field.onChange(value)}

                        placeholder="Select document type"

                        // Show red asterisk in label
                        required

                        // Display validation error message (from Zod schema)
                        error={errors.documentTypeId?.message}

                        // Disable dropdown during form submission
                        disabled={isSubmitting}
                      />
                    )}
                  />

                  {/* Process */}
                  <Controller
                    name="processId"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Process"
                        options={processOptions}
                        value={field.value || null}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Select process"
                        required
                        error={errors.processId?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />

                  {/* Department */}
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Department"
                        options={departmentOptions}
                        value={field.value || null}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Select department"
                        required
                        error={errors.departmentId?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />

                  {/* Assigned Approver */}
                  <Controller
                    name="assignedApproverId"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Assigned Approver"
                        options={approverOptions}
                        value={field.value || null}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Select approver"
                        required
                        error={errors.assignedApproverId?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </div>

                {/**
                 * =============================================================
                 * CHANGE NOTES
                 * =============================================================
                 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Change Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Describe the purpose and content of this document..."
                    rows={4}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white',
                      'text-sm resize-none transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500',
                      errors.changeNotes
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-primary-500'
                    )}
                    {...register('changeNotes')}
                  />
                  {errors.changeNotes && (
                    <p className="mt-1 text-sm text-red-600">{errors.changeNotes.message}</p>
                  )}
                </div>

                {/**
                 * =============================================================
                 * FILE UPLOAD WITH DRAG & DROP
                 * =============================================================
                 * 
                 * FEATURES:
                 * - Click to browse
                 * - Drag and drop
                 * - File type validation
                 * - File size validation
                 * - Preview selected file
                 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File <span className="text-red-500">*</span>
                  </label>

                  {!selectedFile ? (
                    <div
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'flex flex-col items-center justify-center',
                        'border-2 border-dashed rounded-lg p-8 cursor-pointer',
                        'transition-colors',
                        isDragging && 'border-primary-500 bg-primary-50',
                        !isDragging && fileError && 'border-red-300 bg-red-50',
                        !isDragging && !fileError && 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                      )}
                    >
                      <Upload className={cn(
                        'h-12 w-12 mb-3',
                        isDragging ? 'text-primary-500' : 'text-gray-400'
                      )} />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, Word, Excel, or Images (max 10MB)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={Object.keys(ALLOWED_FILE_TYPES).join(',')}
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-8 w-8 text-primary-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        disabled={isSubmitting}
                        className="ml-4 p-1 hover:bg-primary-100 rounded transition-colors disabled:opacity-50"
                      >
                        <X className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
                  )}

                  {fileError && (
                    <p className="mt-1 text-sm text-red-600">{fileError}</p>
                  )}
                  {errors.file && (
                    <p className="mt-1 text-sm text-red-600">{errors.file.message as string}</p>
                  )}
                </div>

                {/**
                 * =============================================================
                 * FORM ACTIONS
                 * =============================================================
                 */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/documents')}
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
                      'Create Document'
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