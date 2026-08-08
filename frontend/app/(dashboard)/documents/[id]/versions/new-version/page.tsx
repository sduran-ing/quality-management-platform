'use client';

/**
 * =============================================================================
 * CREATE NEW VERSION PAGE
 * =============================================================================
 * 
 * Creates a new draft version of an approved document.
 * 
 * - Document metadata shown as read-only
 * - Current version must be approved
 * - No existing draft/pending versions
 * - File upload required
 * - Assigned approver required
 * 
 * ROUTE: /documents/:id/versions/new
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
  AlertCircle,
  Info
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAchievementNotifier } from '@/lib/contexts/AchievementContext';

// API functions
import { 
  getDocumentById, 
  createNewVersion,
  Document 
} from '@/lib/api/documents';
import { getApprovers, Approver } from '@/lib/api/users';

// Components
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { cn, formatFileSize, DOCUMENT_STATUSES, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/utils';

/**
 * =============================================================================
 * FORM VALIDATION SCHEMA
 * =============================================================================
 */
const createVersionSchema = z.object({
  assignedApproverId: z
    .number({ message: 'Assigned approver is required' })
    .positive({ message: 'Please select an approver' }),

  changeNotes: z
    .string()
    .min(1, { message: 'Change notes are required' })
    .min(10, { message: 'Change notes must be at least 10 characters' }),

  file: z.any().refine((file) => file !== null, {
    message: 'File upload is required'
  })
});

type CreateVersionFormData = z.infer<typeof createVersionSchema>;

/**
 * =============================================================================
 * COMPONENT
 * =============================================================================
 */
export default function CreateNewVersionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const { notify } = useAchievementNotifier();
  
  const documentId = parseInt(params.id as string, 10);

  // ========================================
  // STATE
  // ========================================

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dropdown options
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(false);

  // ========================================
  // FORM SETUP
  // ========================================

  const {
    handleSubmit,
    control,
    setValue,
    register,
    formState: { errors, isSubmitting }
  } = useForm<CreateVersionFormData>({
    resolver: zodResolver(createVersionSchema),
    defaultValues: {
      assignedApproverId: undefined,
      changeNotes: '',
      file: null
    }
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

        // Validate document can have new version
        if (!doc.currentVersion) {
          setError('Document has no current version.');
          return;
        }

        if (doc.currentVersion.status !== 'approved') {
          setError(
            `Cannot create new version. Current version ${doc.currentVersion.versionNumber} ` +
            `is "${DOCUMENT_STATUSES[doc.currentVersion.status].label}". Only approved versions can have new versions.`
          );
          return;
        }
        

        // Check for existing draft/pending
        const draftOrPending = doc.versions?.find(
          v => v.status === 'draft' || v.status === 'pending_approval'
        );
        
        if (draftOrPending) {
          setError(
            `Cannot create new version. Version ${draftOrPending.versionNumber} ` +
            `is already "${DOCUMENT_STATUSES[draftOrPending.status].label}". Complete or discard it first.`
          );
          return;
        }
        


      } catch (err: any) {
        console.error('Error fetching document:', err);
        setError(err.response?.data?.message || 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  // ========================================
  // FETCH APPROVERS
  // ========================================

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        setIsLoadingApprovers(true);
        const response = await getApprovers();
        setApprovers(response.data.approvers);
      } catch (error: any) {
        console.error('Error fetching approvers:', error);
        setSubmitError('Failed to load approvers. Please refresh the page.');
      } finally {
        setIsLoadingApprovers(false);
      }
    };

    fetchApprovers();
  }, []);

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

  const onSubmit = async (data: CreateVersionFormData) => {
    try {
      // Double-check file exists
      if (!selectedFile) {
        setFileError('Please select a file to upload');
        return;
      }

      setSubmitError(null);

      console.log('Creating new version:', {
        documentId,
        assignedApproverId: data.assignedApproverId,
        changeNotes: data.changeNotes,
        fileName: selectedFile.name
      });

      const response = await createNewVersion(documentId, {
        assignedApproverId: data.assignedApproverId,
        changeNotes: data.changeNotes.trim(),
        file: selectedFile
      });

      if (response.success) {
        console.log('New version created:', response.data);
        
        // Redirect to the new version detail page
        router.push(
          `/documents/${documentId}/versions/${response.data.newVersion.versionId}`
        );
      }

      // Trigger notifications if achievements returned
      if (response.achievements) {
        notify(response.achievements);
      }

    } catch (error: any) {
      console.error('Create version error:', error);
      setSubmitError(
        error.response?.data?.message ||
        error.message ||
        'Failed to create new version. Please try again.'
      );
    }
  };

  // ========================================
  // CONVERT TO SELECT OPTIONS
  // ========================================

  const approverOptions: SelectOption[] = approvers.map(approver => ({
    value: approver.id,
    label: `${approver.firstName} ${approver.lastName}`,
    subtitle: approver.role === 'quality_manager' ? 'Quality Manager' : 'Process Owner'
  }));

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoading || isLoadingApprovers) {
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

  if (error || !document) {
    return (
      <div className="p-6">
        <ErrorMessage message={error || 'Document not found'} />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/documents/${documentId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Document
        </Button>
      </div>
    );
  }

  const currentVersion = document.currentVersion!;

  // Calculate next version number for display
  const currentVersionNum = parseFloat(currentVersion.versionNumber);
  const nextVersionNum = (Math.floor(currentVersionNum) + 1.0).toFixed(1);

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
            onClick={() => router.push(`/documents/${documentId}`)}
            className="gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 py-2">Create New Version</h1>
          <p className="font-semibold text-gray-900 mt-2">
            {document.code} - {document.name}
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
         * INFO BANNER
         * =====================================================================
         */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Creating version <span className="font-bold">{nextVersionNum}</span> from approved version {currentVersion.versionNumber}.
                The new version will start as a draft.
              </p>
            </div>
          </div>
        </div>

        {/**
         * =====================================================================
         * READ-ONLY DOCUMENT METADATA
         * =====================================================================
         */}
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
                  <p className="text-base text-gray-900">
                    {document.process?.name} ({document.process?.acronym})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Department</p>
                  <p className="text-base text-gray-900">{document.department?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Current Version</p>
                  <p className="text-base text-gray-900">
                    {currentVersion.versionNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/**
         * =====================================================================
         * NEW VERSION FORM
         * =====================================================================
         */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            <div className="w-2 bg-primary-600 flex-shrink-0" />

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 p-8">
              <div className="space-y-6">

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    New Version Details
                  </h2>
                </div>

                {/**
                 * =============================================================
                 * ASSIGNED APPROVER
                 * =============================================================
                 */}
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
                    placeholder={`Describe changes in version ${nextVersionNum}...`}
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
                 * FILE UPLOAD
                 * =============================================================
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
                    onClick={() => router.push(`/documents/${documentId}`)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="min-w-[180px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating Version...
                      </>
                    ) : (
                      `Create Version ${nextVersionNum}`
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