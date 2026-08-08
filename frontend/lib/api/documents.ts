/**
 * =============================================================================
 * DOCUMENTS API
 * =============================================================================
 * 
 * Handles all document-related API calls.
 * Matches backend documentController.js response structure.
 */

import apiClient from './client';

// import generic api responses
import { ApiResponse, ApiResponseWithAchievements } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// User (for relations)
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'quality_manager' | 'process_owner' | 'employee';
}

// Document Type
export interface DocumentType {
  id: number;
  name: string;
  acronym: string;
}

// Process
export interface Process {
  id: number;
  name: string;
  acronym: string;
}

// Department
export interface Department {
  id: number;
  name: string;
}

// Document Version
export interface DocumentVersion {
  // Version fields
  versionId: number;
  versionNumber: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'outdated' | 'obsolete';
  fileName: string;
  fileSize: number;
  approvedAt: string | null;
  createdAt: string;
  changeNotes: string | null;

  // Document fields
  documentId: number;
  code: string;
  name: string;
  isCurrentVersion: boolean;

  // Related data
  documentType: DocumentType;
  process: Process;
  department: Department;
  createdBy: User;
  approvedBy: User | null;
  assignedApprover: User | null;
}

// Pagination metadata
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Document (for detail view - getById)
export interface Document {
  id: number;
  companyId: number;
  code: string;
  name: string;

  // Foreign keys
  documentTypeId: number;
  processId: number;
  departmentId: number;
  createdBy: number;
  currentVersionId: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations
  documentType?: DocumentType;
  process?: Process;
  department?: Department;
  creator?: User;
  currentVersion: DocumentVersion;
  versions?: DocumentVersion[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Get All Documents Params
export interface GetDocumentsParams {
  // Pagination
  page?: number;
  limit?: number;

  // Search
  search?: string;

  // Filters
  status?: string | string[];  // Can be single or array
  documentTypeId?: number;
  processId?: number;
  departmentId?: number;
  createdBy?: number;  // For "my documents"
  myView?: boolean    // For "pending"
}

/**
 * Get All Documents Response
 * 
 * Backend returns: { success, message, data: { versions, pagination } }
 */
export interface GetDocumentsResponse {
  success: boolean;
  message: string;
  data: {
    versions: DocumentVersion[];
    pagination: Pagination;
  };
}



// Get Single Document Response (clean one-liner using generic from index)
export type DocumentResponse = ApiResponse<{ document: Document }>;

// Get Single Document Response with Achievements
export type DocumentResponseAchievements = ApiResponseWithAchievements<{ document: Document }>;




// Create Document Request
export interface CreateDocumentRequest {
  name: string;
  documentTypeId: number;
  processId: number;
  departmentId: number;
  assignedApproverId: number;
  changeNotes: string;
  file: File;
}

// Download URL Response
export interface DownloadUrlResponse {
  success: boolean;
  message: string;
  data: {
    downloadUrl: string;
    fileName: string;
    expiresIn: number;
  };
}

// Delete Version Response
export interface DeleteVersionResponse {
  success: boolean;
  message: string;
  data: {
    deletedVersion?: {
      id: number;
      versionNumber: string;
      fileName: string;
    };
    deletedDocument?: {
      code: string;
      name: string;
    };
  };
}

// Request to update document metadata only
export interface UpdateDocumentRequest {
  name?: string;
  documentTypeId?: number;
  processId?: number;
  departmentId?: number;
  assignedApproverId?: number;
  changeNotes?: string;
}

// Update version file response
export interface UpdateVersionFileResponse {
  success: boolean;
  message: string;
  data: {
    version: DocumentVersion;
  };
}

// ============================================
// CREATE NEW VERSION INTERFACES
// ============================================

// Request payload for creating new version
export interface CreateNewVersionRequest {
  assignedApproverId: number;
  changeNotes: string;
  file: File;
}

// Response from createNewVersion response including achievements
export type CreateNewVersionResponse = ApiResponseWithAchievements<{
  document: Document;
  newVersion: DocumentVersion;
}>;


// ============================================
// SUBMIT FOR APPROVAL
// ============================================

// Response from submitting for approval
export interface SubmitForApprovalResponse {
  success: boolean;
  message: string;
  data: {
    document: Document;
    submittedVersion: {
      id: number;
      versionNumber: string;
      status: 'pending_approval';
    };
  };
}

// ============================================
// REJECT DOCUMENT
// ============================================

// Response from rejecting document
export interface RejectDocumentResponse {
  success: boolean;
  message: string;
  data: {
    document: Document;
    rejectedVersion: {
      id: number;
      versionNumber: string;
      status: 'draft';
    };
  };
}

// ============================================
// MAKE OBSOLETE
// ============================================

// Response from making document obsolete including achievements
export type MakeObsoleteResponse = ApiResponseWithAchievements<{
  document: Document;
  deletedDrafts: number;
  deletedPending: number;
}>;

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * GET /api/documents
 * Get all document versions with pagination and filtering
 * 
 * @param params - Query parameters
 * @returns Paginated list of document versions
 */
export const getAllDocuments = async (params?: GetDocumentsParams): Promise<GetDocumentsResponse> => {
  return await apiClient.get('/documents', { params });
};

/**
 * GET /api/documents/:id
 * Get single document with all versions
 * 
 * @param id - Document ID
 * @returns Document with version history
 */
export const getDocumentById = async (id: number): Promise<DocumentResponse> => {
  return await apiClient.get(`/documents/${id}`);
};

/**
 * POST /api/documents
 * Create a new document with file upload
 * Content-Type: multipart/form-data
 *
 * @param data - Document data + file
 * @returns Created document
 */
export const createDocument = async (data: CreateDocumentRequest): Promise<DocumentResponseAchievements> => {
  /**
 * Create FormData for file upload
 * 
 * Why FormData:
 * - Backend expects multipart/form-data
 * - Need to send file and fields together
 * 
 * Also, we need to use snake_case for multipart/form-data cases
 * because it doesn't go through the case transformation middleware in the back
 */
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('document_type_id', data.documentTypeId.toString());
  formData.append('process_id', data.processId.toString());
  formData.append('department_id', data.departmentId.toString());
  formData.append('assigned_approver_id', data.assignedApproverId.toString());
  formData.append('change_notes', data.changeNotes);
  formData.append('file', data.file);

  /**
     * Send as multipart/form-data
     * 
     * apiClient automatically sets correct 'Content-Type': 'multipart/form-data'
     * when it detects FormData
     */
  return await apiClient.post('/documents', formData);
};

// ============================================
// UPDATE DOCUMENT METADATA
// ============================================

/**
 * Update document (name, department, process, document type) and version metadata (assigned approver, change notes)
 * PUT /api/documents/:id/versions/:versionId
 * 
 * Only updates provided fields (partial update)
 * 
 * @param documentId - Document ID
 * @param versionId - Version ID
 * @param data - Fields to update
 * @returns Updated document
 */
export const updateDocument = async (
  documentId: number,
  versionId: number,
  data: UpdateDocumentRequest
): Promise<DocumentResponse> => {
  // Send as JSON (not FormData)
  return await apiClient.put(`/documents/${documentId}/versions/${versionId}`, data);
};

// ============================================
// UPDATE VERSION FILE
// ============================================

/**
 * Replace file of a specific version
 * PUT /api/documents/:id/versions/:versionId/file
 * 
 * @param documentId - Document ID
 * @param versionId - Version ID
 * @param file - New file to upload
 * @returns Updated version
 */
export const updateVersionFile = async (
  documentId: number,
  versionId: number,
  file: File
): Promise<UpdateVersionFileResponse> => {
  /**
   * Create FormData for file upload
   * 
   * Backend expects multipart/form-data
   * Same pattern as createDocument
   */
  const formData = new FormData();
  formData.append('file', file);

  /**
     * Send as multipart/form-data
     * 
     * apiClient automatically sets correct 'Content-Type': 'multipart/form-data'
     * when it detects FormData
     */
  return await apiClient.put(
    `/documents/${documentId}/versions/${versionId}/file`,
    formData
  );
};

/**
 * PUT /api/documents/:id/submit-approval
 * Submit document for approval
 * 
 * Status: draft to pending_approval
 * 
 * @param id - Document ID
 * @returns Updated document
 */
export const submitForApproval = async (id: number): Promise<SubmitForApprovalResponse> => {
  return await apiClient.put(`/documents/${id}/submit-approval`);
};

/**
 * PUT /api/documents/:id/approve
 * Approve document
 * 
 * Status: pending_approval to approved
 * 
 * @param id - Document ID
 * @returns Updated document
 */
export const approveDocument = async (id: number): Promise<DocumentResponseAchievements> => {
  return await apiClient.put(`/documents/${id}/approve`);
};

/**
 * PUT /api/documents/:id/reject
 * Reject document
 * 
 * Status: pending_approval to draft
 * 
 * @param id - Document ID
 * @param rejectionReason - Reason for rejection
 * @returns Updated document
 */
export const rejectDocument = async (
  id: number,
  rejectionReason: string
): Promise<RejectDocumentResponse> => {
  return await apiClient.put(`/documents/${id}/reject`, { rejectionReason });
};

/**
 * PUT /api/documents/:id/obsolete
 * Marks current approved version as obsolete
 * Deletes all draft and pending versions
 * 
 * @param id - Document ID
 * @returns Updated document and confirmation with counts of deleted versions
 */
export const makeObsolete = async (
  id: number
): Promise<MakeObsoleteResponse> => {
  return await apiClient.put(`/documents/${id}/obsolete`);
};

// ============================================
// CREATE NEW VERSION
// ============================================

/**
 * Create new version of an approved document
 * POST /api/documents/:id/versions
 * 
 * Creates a new draft version. Current version must be approved.
 * No existing draft or pending versions allowed.
 * 
 * @param documentId - Document ID
 * @param data - New version details (approver, notes, file)
 * @returns Document and new version data
 */
export const createNewVersion = async (
  documentId: number,
  data: CreateNewVersionRequest
): Promise<CreateNewVersionResponse> => {
  /**
   * Create FormData for file upload
   * 
   * Backend expects multipart/form-data
   * Need to send file + fields together
   * 
   * Also, we need to use snake_case for multipart/form-data cases
   * because it doesn't go through the case transformation middleware in the back
   */
  const formData = new FormData();
  formData.append('assigned_approver_id', data.assignedApproverId.toString());
  formData.append('change_notes', data.changeNotes);
  formData.append('file', data.file);

  /**
   * Send as multipart/form-data
   * 
   * apiClient automatically sets correct Content-Type
   * when it detects FormData
   */
  return await apiClient.post(`/documents/${documentId}/versions`, formData);
};

/**
 * DELETE /api/documents/:documentId/versions/:versionId
 * Delete a draft version
 *  
 * @param documentId - Document ID
 * @param versionId - Version ID
 * @returns Deletion confirmation
 */
export const deleteDraftVersion = async (
  documentId: number,
  versionId: number
): Promise<DeleteVersionResponse> => {
  return await apiClient.delete(`/documents/${documentId}/versions/${versionId}`);
};

/**
 * GET /api/documents/:documentId/versions/:versionId/download
 * Get download URL for a document version
 * 
 * @param documentId - Document ID
 * @param versionId - Version ID
 * @returns Pre-signed S3 URL for downloading.
 */
export const getDownloadUrl = async (
  documentId: number,
  versionId: number
): Promise<DownloadUrlResponse> => {
  return await apiClient.get(`/documents/${documentId}/versions/${versionId}/download`);
};
