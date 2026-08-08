/**
 * =============================================================================
 * DOCUMENT TYPES API CLIENT
 * =============================================================================
 * 
 * Handles all document type-related API calls
 * Matches backend documentTypeController.js
 * 
 */

import apiClient from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Document Type
export interface DocumentType {
  id: number;
  company_id: number;
  name: string;
  acronym: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Get All Document Types Response
export interface GetDocumentTypesResponse {
  success: boolean;
  message: string;
  data: {
    documentTypes: DocumentType[];
    total: number;
  };
}

// Get Single Document Type Response
export interface DocumentTypeResponse {
  success: boolean;
  message: string;
  data: {
    documentType: DocumentType;
  };
}

// Create Document Type Request
export interface CreateDocumentTypeRequest {
  name: string;
  acronym: string;
}

// Update Document Type Request
export interface UpdateDocumentTypeRequest {
  name?: string;
  acronym?: string;
}

// Delete Document Type Response
export interface DeleteDocumentTypeResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * GET /api/document-types
 * Returns document types ordered alphabetically by name
 * 
 * @returns List of document types
 */
export const getAllDocumentTypes = async (): Promise<GetDocumentTypesResponse> => {
  return await apiClient.get('/document-types');
};

/**
 * GET /api/document-types/:id
 * Get single document type by ID
 * 
 * @param id - Document type ID
 * @returns Document type
 */
export const getDocumentTypeById = async (id: number): Promise<DocumentTypeResponse> => {
  return await apiClient.get(`/document-types/${id}`);
};

/**
 * POST /api/document-types
 * Create a new document type
 * 
 * Quality Manager only
 * 
 * @param data - Document type details
 * @returns Created document type
 */
export const createDocumentType = async (
  data: CreateDocumentTypeRequest
): Promise<DocumentTypeResponse> => {
  return await apiClient.post('/document-types', data);
};

/**
 * PUT /api/document-types/:id
 * Update document type
 * 
 * Quality Manager only
 * 
 * @param id - Document type ID
 * @param data - Fields to update
 * @returns Updated document type
 */
export const updateDocumentType = async (
  id: number,
  data: UpdateDocumentTypeRequest
): Promise<DocumentTypeResponse> => {
  return await apiClient.put(`/document-types/${id}`, data);
};

/**
 * DELETE /api/document-types/:id
 * Delete a document type
 * 
 * Quality Manager only
 * 
 * @param id - Document type ID
 * @returns Deletion confirmation
 */
export const deleteDocumentType = async (id: number): Promise<DeleteDocumentTypeResponse> => {
  return await apiClient.delete(`/document-types/${id}`);
};