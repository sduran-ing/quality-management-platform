/**
 * =============================================================================
 * FINDINGS API
 * =============================================================================
 * 
 * API functions for audit findings
 */

import apiClient from './client';

// import generic api responses
import { ApiResponse, ApiResponseWithAchievements } from '../types';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Finding severity enum
 */
export type FindingSeverity = 'major_nonconformity' | 'minor_nonconformity' | 'opportunity';

/**
 * Finding status enum
 */
export type FindingStatus = 'open' | 'in_progress' | 'pending_verification' | 'closed';

/**
 * Standard Requirement (simplified)
 */
export interface StandardRequirement {
  id: number;
  clauseNumber: string;
  title: string;
  description: string;
}

/**
 * Process (simplified)
 */
export interface Process {
  id: number;
  name: string;
  acronym: string;
}

/**
 * User (simplified)
 */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Audit (simplified)
 */
export interface AuditSimple {
  id: number;
  title: string;
  auditType: string;
  status: string;
}

/**
 * Finding (full structure)
 */
export interface Finding {
  id: number;
  auditId: number;
  findingNumber: string;
  severity: FindingSeverity;
  standardRequirementId: number;
  processId: number;
  description: string;
  evidenceDescription: string | null;
  status: FindingStatus;
  closedBy: number | null;
  closedAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;

  // Associations (populated when included)
  audit?: AuditSimple;
  requirement?: StandardRequirement;
  process?: Process;
  creator?: User;
  closedByUser?: User;
}

/**
 * Response structure for getting multiple findings
 */
export interface GetFindingsResponse {
  success: boolean;
  message: string;
  data: {
    findings: Finding[];
    total: number;
  };
}

// Get Single Finding Response (clean one-liner using generic from index)
export type FindingResponse = ApiResponse<{ finding: Finding }>;

// Get Single Finding Response with Achievements
export type FindingResponseAchievements = ApiResponseWithAchievements<{ finding: Finding }>;


/**
 * Create finding payload
 */
export interface CreateFindingPayload {
  severity: FindingSeverity;
  requirementId: number;
  processId: number;
  description: string;
}


/**
 * Delete finding response
 */
export interface DeleteFindingResponse {
  success: boolean;
  message: string;
}

/**
 * Edit finding payload
 */
export interface EditFindingPayload {
  severity: FindingSeverity;
  requirementId: number;
  processId: number;
  description: string;
}


// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all findings for an audit
 * GET /api/audits/:auditId/findings
 * 
 * @param auditId - Audit ID
 * @returns List of findings
 */
export const getAllFindings = async (auditId: number): Promise<GetFindingsResponse> => {
  return await apiClient.get(`/audits/${auditId}/findings`);
};

/**
 * Get single finding by ID
 * GET /api/audits/:auditId/findings/:id
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @returns Finding details
 */
export const getFindingById = async (
  auditId: number,
  findingId: number
): Promise<FindingResponse> => {
  return await apiClient.get(`/audits/${auditId}/findings/${findingId}`);
};

/**
 * Create a new finding
 * POST /api/audits/:auditId/findings
 * 
 * @param auditId - Audit ID
 * @param payload - Finding creation data
 * @returns Created finding
 */
export const createFinding = async (
  auditId: number,
  payload: CreateFindingPayload
): Promise<FindingResponseAchievements> => {
  return await apiClient.post(`/audits/${auditId}/findings`, payload);
};

/**
 * Delete a finding
 * DELETE /api/audits/:auditId/findings/:findingId
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @returns Success response
 */
export const deleteFinding = async (
  auditId: number,
  findingId: number
): Promise<DeleteFindingResponse> => {
  return await apiClient.delete(`/audits/${auditId}/findings/${findingId}`);
};

/**
 * Edit a finding
 * PUT /api/audits/:auditId/findings/:findingId
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param payload - Updated finding data
 * @returns Updated finding
 */
export const editFinding = async (
  auditId: number,
  findingId: number,
  payload: EditFindingPayload
): Promise<FindingResponse> => {
  return await apiClient.put(`/audits/${auditId}/findings/${findingId}`, payload);
};

/**
 * Close a finding
 * PUT /api/audits/:auditId/findings/:findingId/close
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @returns Updated finding
 */
export const closeFinding = async (
  auditId: number,
  findingId: number
): Promise<FindingResponseAchievements> => {
  return await apiClient.put(`/audits/${auditId}/findings/${findingId}/close`);
};