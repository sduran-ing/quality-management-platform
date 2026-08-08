'use client';

/**
 * =============================================================================
 * EDIT DOCUMENT PAGE
 * =============================================================================
 * 
 * Conditional form based on user permissions and version status:
 * 
 * SCENARIO 1: QM + Approved
 * - Can edit: metadata (name, type, process, dept) + version fields (approver, notes) + file
 * 
 * SCENARIO 2: Creator + Draft v1.0
 * - Can edit: metadata + version fields + file
 * 
 * SCENARIO 3: Creator + Draft v2.0+
 * - Can edit: version fields (approver, notes) + file ONLY
 * - Shows metadata as read-only info
 * 
 * ROUTE: /documents/[id]/edit
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

// API functions
import {
  getDocumentById,
  updateDocument,
  updateVersionFile,
  Document,
  DocumentVersion
} from '@/lib/api/documents';
import { getAllDocumentTypes, DocumentType } from '@/lib/api/documentTypes';
import { getAllProcesses, Process } from '@/lib/api/processes';
import { getAllDepartments, Department } from '@/lib/api/departments';
import { getApprovers, Approver } from '@/lib/api/users';

// Components
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import Badge, { getDocumentStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { cn, formatUserName, formatFileSize, DOCUMENT_STATUSES, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/utils';

/**
 * =============================================================================
 * FORM VALIDATION SCHEMA
 * =============================================================================
 * 
 * Fields validated based on what's editable
 * All fields optional (only validate what's being updated)
 */
const editDocumentSchema = z.object({
  // Document metadata (optional - only for scenarios 1 & 2)
  name: z
    .string()
    .min(3, { message: 'Document name must be at least 3 characters' })
    .optional()
    .or(z.literal('')),

  documentTypeId: z
    .number()
    .positive({ message: 'Please select a document type' })
    .optional(),

  processId: z
    .number()
    .positive({ message: 'Please select a process' })
    .optional(),

  departmentId: z
    .number()
    .positive({ message: 'Please select a department' })
    .optional(),

  // Version fields (available for all draft scenarios)
  assignedApproverId: z
    .number()
    .positive({ message: 'Please select an approver' })
    .optional(),

  changeNotes: z
    .string()
    .min(10, { message: 'Change notes must be at least 10 characters' })
    .optional()
    .or(z.literal('')),

  // File (optional - only validate if provided)
  file: z.any().optional()
});

type EditDocumentFormData = z.infer<typeof editDocumentSchema>;

/**
 * =============================================================================
 * COMPONENT
 * =============================================================================
 */
export default function EditVersionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const documentId = parseInt(params.id as string, 10);
  const versionId = parseInt(params.versionId as string, 10);

  // ========================================
  // STATE
  // ========================================

  const [document, setDocument] = useState<Document | null>(null);
  const [version, setVersion] = useState<DocumentVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dropdown options
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // ========================================
  // FORM SETUP
  // ========================================

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EditDocumentFormData>({
    resolver: zodResolver(editDocumentSchema)
  });

  // ========================================
  // FETCH DOCUMENT
  // ========================================

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getDocumentById(documentId);
        const doc = response.data.document;
        setDocument(doc);

        // Find the specific version we're editing
        const versionToEdit = doc.versions?.find(v => v.versionId === versionId);

        if (!versionToEdit) {
          setError('Version not found');
          return;
        }

        setVersion(versionToEdit);

        // Pre-fill form with current values
        reset({
          name: doc.name,
          documentTypeId: doc.documentTypeId,
          processId: doc.processId,
          departmentId: doc.departmentId,
          assignedApproverId: versionToEdit.assignedApprover?.id,  // Uses versionToEdit
          changeNotes: versionToEdit.changeNotes || ''  // Uses versionToEdit
        });

      } catch (err: any) {
        console.error('Error fetching document:', err);
        setError(err.response?.data?.message || 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId && versionId) {
      fetchDocument();
    }
  }, [documentId, versionId, reset]);

  // ========================================
  // FETCH DROPDOWN OPTIONS
  // ========================================

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoadingOptions(true);

        const [typesRes, processesRes, departmentsRes, approversRes] = await Promise.all([
          getAllDocumentTypes(),
          getAllProcesses(),
          getAllDepartments(),
          getApprovers()
        ]);

        setDocumentTypes(typesRes.data.documentTypes);
        setProcesses(processesRes.data.processes);
        setDepartments(departmentsRes.data.departments);
        setApprovers(approversRes.data.approvers);

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
  // CALCULATE PERMISSIONS
  // ========================================

  if (!document || !version || !user) {
    return null;
  }

  const isQM = user.role === 'quality_manager';
  const isCreator = user.id === version.createdBy.id;
  const isApproved = version.status === 'approved';
  const isDraft = version.status === 'draft';
  const isFirstVersion = version.versionNumber === '1.0';

  /**
   * PERMISSION MATRIX
   * Checks against the actual version being edited, not the currentVersion of the document that is always pointing to the version "Approved"
   * 
   * canEditMetadata: name, type, process, department
   * canEditVersionFields: approver, change notes
   * canEditFile: replace file
   */
  const canEditMetadata =
    (isQM && isApproved) ||
    (isCreator && isDraft && isFirstVersion);

  const canEditVersionFields =
    (isCreator && isDraft) ||
    (isQM && isApproved);

  const canEditFile =
    (isQM && isApproved) ||
    (isCreator && isDraft);

  // No edit permissions at all
  if (!canEditMetadata && !canEditVersionFields && !canEditFile) {
    return (
      <div className="p-6">
        <ErrorMessage
          message={`You do not have permission to edit this version. The creator of version 
          ${version.versionNumber} is ${formatUserName(version.createdBy)}.`}
        />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/documents/${documentId}/versions/${versionId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Version
        </Button>
      </div>
    );
  }

  // ========================================
  // FILE VALIDATION
  // ========================================

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
      return 'File type not supported. Please upload PDF, Word, Excel, or image files.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  // ========================================
  // FILE HANDLERS
  // ========================================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

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

  const handleFileChange = (file: File) => {
    const error = validateFile(file);

    if (error) {
      setFileError(error);
      setSelectedFile(null);
      setValue('file', null);
    } else {
      setSelectedFile(file);
      setFileError(null);
      setValue('file', file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setValue('file', null);

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
   * STRATEGY:
   * 1. Check what changed (metadata vs file)
   * 2. Call appropriate API endpoints
   * 3. Handle errors gracefully
   * 4. Redirect on success
   */
  const onSubmit = async (data: EditDocumentFormData) => {
    try {
      setSubmitError(null);

      // Determine what needs updating
      const metadataChanged =
        data.name !== document.name ||
        data.documentTypeId !== document.documentTypeId ||
        data.processId !== document.processId ||
        data.departmentId !== document.departmentId ||
        data.assignedApproverId !== version.assignedApprover?.id ||
        (data.changeNotes && data.changeNotes !== version.changeNotes);

      const fileChanged = !!selectedFile;

      // ============================================
      // UPDATE METADATA (if changed and allowed)
      // ============================================

      if (metadataChanged) {
        // Build update payload (only include changed fields)
        const updatePayload: any = {};

        if (data.name && data.name !== document.name) {
          updatePayload.name = data.name;
        }
        if (data.documentTypeId && data.documentTypeId !== document.documentTypeId) {
          updatePayload.documentTypeId = data.documentTypeId;
        }
        if (data.processId && data.processId !== document.processId) {
          updatePayload.processId = data.processId;
        }
        if (data.departmentId && data.departmentId !== document.departmentId) {
          updatePayload.departmentId = data.departmentId;
        }
        if (data.assignedApproverId && data.assignedApproverId !== version.assignedApprover?.id) {
          updatePayload.assignedApproverId = data.assignedApproverId;
        }
        if (data.changeNotes && data.changeNotes !== version.changeNotes) {
          updatePayload.changeNotes = data.changeNotes;
        }

        await updateDocument(documentId, versionId, updatePayload);
      }

      // ============================================
      // UPDATE FILE (if changed and allowed)
      // ============================================
      if (fileChanged && selectedFile) {
        await updateVersionFile(documentId, versionId, selectedFile);
      }

      // If successful redirect to version detail page
      router.push(`/documents/${documentId}/versions/${versionId}`);

    } catch (error: any) {
      console.error('Update document error:', error);
      setSubmitError(
        error.response?.data?.message ||
        error.message ||
        'Failed to update document. Please try again.'
      );
    }
  };

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
  // LOADING STATE
  // ========================================

  if (isLoading || isLoadingOptions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={error} />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/documents')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
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
            onClick={() => router.push(`/documents/${documentId}/versions/${versionId}`)}
            className="gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 py-2">Edit Version {version.versionNumber}</h1>
          <p className="font-semibold text-gray-900 mt-2">
            {document.code} - {document.name}
            <Badge variant={getDocumentStatusVariant(version.status)} className="text-sm px-3 py-1 ml-2">
              {DOCUMENT_STATUSES[version.status].label}
            </Badge>
          </p>
        </div>

        {/**
         * =====================================================================
         * ERROR BANNER
         * =====================================================================
         */}
        {submitError && (
          <div className="mb-6">
            <ErrorMessage message={submitError} />
          </div>
        )}

        {/**
         * =====================================================================
         * INFO BANNER (Scenario 3: Limited editing)
         * =====================================================================
         */}
        {!canEditMetadata && (canEditVersionFields || canEditFile) && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  You can only edit the assigned approver, change notes, and file for version {version.versionNumber}.

                  {isQM
                    ? ' To update the document metadata edit the current version of the document.'
                    : ' To update the document metadata, please contact the Quality Manager.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/**
         * =====================================================================
         * READ-ONLY METADATA (Scenario 3)
         * =====================================================================
         */}
        {!canEditMetadata && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="flex">
              <div className="w-2 bg-gray-400 flex-shrink-0" />
              <div className="flex-1 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Document Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Document Code</p>
                    <p className="text-base text-gray-900">{document.code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Document Name</p>
                    <p className="text-base text-gray-900">{document.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">ID</p>
                    <p className="text-base text-gray-900">{document.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Document Type</p>
                    <p className="text-base text-gray-900">{document.documentType?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Process</p>
                    <p className="text-base text-gray-900">{document.process?.name} ({document.process?.acronym})</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Department</p>
                    <p className="text-base text-gray-900">{document.department?.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/**
         * =====================================================================
         * EDIT FORM
         * =====================================================================
         */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            <div className="w-2 bg-primary-600 flex-shrink-0" />

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 p-8">
              <div className="space-y-6">

                {/**
                 * =============================================================
                 * EDITABLE METADATA (Scenarios 1 & 2)
                 * =============================================================
                 */}
                {canEditMetadata && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Document Metadata
                      </h2>
                    </div>

                    {/* Document Name */}
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

                    {/* Grid: Type, Process, Department */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    </div>

                    <div className="border-t border-gray-200 my-6" />
                  </>
                )}

                {/**
                 * =============================================================
                 * VERSION FIELDS (All scenarios with draft)
                 * =============================================================
                 */}
                {canEditVersionFields && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Version Settings
                      </h2>
                    </div>

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

                    {/* Change Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Change Notes
                      </label>
                      <textarea
                        placeholder="Describe changes in this version..."
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

                    <div className="border-t border-gray-200 my-6" />
                  </>
                )}

                {/**
                 * =============================================================
                 * FILE UPLOAD (All scenarios)
                 * =============================================================
                 */}
                {canEditFile && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Replace File (Optional)
                      </h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Current file: <span className="font-medium">{version.fileName}</span> ({formatFileSize(version.fileSize)})
                      </p>
                    </div>

                    <div>
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
                    </div>
                  </>
                )}

                {/**
                 * =============================================================
                 * FORM ACTIONS
                 * =============================================================
                 */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/documents/${documentId}`)}
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
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
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