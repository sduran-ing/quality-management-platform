/**
 * =============================================================================
 * CORRECTIVE ACTIONS API
 * =============================================================================
 * 
 * API functions for corrective actions
 */

import apiClient from './client';

// import generic api responses
import { ApiResponse, ApiResponseWithAchievements } from '../types';

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Corrective action status enum
 */
export type CorrectiveActionStatus = 
  | 'proposed' 
  | 'rejected'
  | 'in_implementation' 
  | 'pending_verification'
  | 'completed';

/**
 * User (simplified)
 */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
}

/**
 * Corrective Action (full structure)
 */
export interface CorrectiveAction {
  id: number;
  findingId: number;
  actionNumber: string;
  proposedAction: string;
  rootCauseAnalysis: string | null;
  responsibleUserId: number;
  expectedCompletionDate: string;
  actualCompletionDate: string | null;
  implementationEvidence: string | null;
  status: CorrectiveActionStatus;
  proposedBy: number;
  proposedAt: string;
  approvedBy: number | null;
  approvedAt: string | null;
  verifiedBy: number | null;
  verifiedAt: string | null;
  rejectionReason: string | null;

  // Associations (populated when included)
  responsibleUser?: User;
  proposer?: User;
  approver?: User;
  verifier?: User;
}

/**
 * Response structure for getting corrective actions
 */
export interface GetCorrectiveActionsResponse {
  success: boolean;
  message: string;
  data: {
    correctiveActions: CorrectiveAction[];
    total: number;
  };
}

// Get Single CA Response (clean one-liner using generic from index)
export type CorrectiveActionResponse = ApiResponse<{ correctiveAction: CorrectiveAction }>;

// Get Single CA Response with Achievements
export type CorrectiveActionResponseAchievements = ApiResponseWithAchievements<{ correctiveAction: CorrectiveAction }>;

/**
 * Create corrective action request
 */
export interface CreateCorrectiveActionPayload {
  proposedAction: string;
  rootCauseAnalysis?: string;
  responsibleUserId: number;
  expectedCompletionDate: string;
}

/**
 * Delete corrective action response
 */
export interface DeleteCorrectiveActionResponse {
  success: boolean;
  message: string;
}

/**
 * Edit corrective action payload
 */
export interface EditCorrectiveActionPayload {
  proposedAction: string;
  rootCauseAnalysis?: string;
  responsibleUserId: number;
  expectedCompletionDate: string;
}



/**
 * Verify corrective action payload
 */
export interface VerifyCorrectiveActionPayload {
  decision: 'approved' | 'rejected';
  rejectionReason?: string;
}


// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all corrective actions for a finding
 * GET /api/audits/:auditId/findings/:findingId/corrective-actions
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @returns List of corrective actions
 */
export const getCorrectiveActions = async (
  auditId: number,
  findingId: number
): Promise<GetCorrectiveActionsResponse> => {
  return await apiClient.get(`/audits/${auditId}/findings/${findingId}/corrective-actions`);
};

/**
 * Create a new corrective action for a finding
 * POST /api/audits/:auditId/findings/:findingId/corrective-actions
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param payload - Corrective action data
 * @returns Created corrective action
 */
export const createCorrectiveAction = async (
  auditId: number,
  findingId: number,
  payload: CreateCorrectiveActionPayload
): Promise<CorrectiveActionResponseAchievements> => {
  return await apiClient.post(
    `/audits/${auditId}/findings/${findingId}/corrective-actions`,
    payload
  );
};

/**
 * Delete a corrective action
 * DELETE /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param actionId - Corrective Action ID
 * @returns Success response
 */
export const deleteCorrectiveAction = async (
  auditId: number,
  findingId: number,
  actionId: number
): Promise<DeleteCorrectiveActionResponse> => {
  return await apiClient.delete(
    `/audits/${auditId}/findings/${findingId}/corrective-actions/${actionId}`
  );
};

/**
 * Reject a proposed corrective action
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/reject
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param actionId - Corrective Action ID
 * @param rejectionReason - Rejection reason
 * @returns Updated corrective action
 */
export const rejectCorrectiveAction = async (
  auditId: number,
  findingId: number,
  actionId: number,
  rejectionReason: string
): Promise<CorrectiveActionResponse> => {
  return await apiClient.put(
    `/audits/${auditId}/findings/${findingId}/corrective-actions/${actionId}/reject`,
    { rejectionReason }
  );
};

/**
 * Edit a corrective action
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param actionId - Corrective Action ID
 * @param payload - Updated corrective action data
 * @returns Updated corrective action
 */
export const editCorrectiveAction = async (
  auditId: number,
  findingId: number,
  actionId: number,
  payload: EditCorrectiveActionPayload
): Promise<CorrectiveActionResponse> => {
  return await apiClient.put(
    `/audits/${auditId}/findings/${findingId}/corrective-actions/${actionId}`,
    payload
  );
};

/**
 * Approve a proposed corrective action
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/approve
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param actionId - Corrective Action ID
 * @returns Updated corrective action
 */
export const approveCorrectiveAction = async (
  auditId: number,
  findingId: number,
  actionId: number
): Promise<CorrectiveActionResponse> => {
  return await apiClient.put(
    `/audits/${auditId}/findings/${findingId}/corrective-actions/${actionId}/approve`
  );
};

/**
 * Implement a corrective action (add evidence and send to verification)
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/implement
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param actionId - Corrective Action ID
 * @param implementationEvidence - Implementation evidence
 * @returns Updated corrective action
 */
export const implementCorrectiveAction = async (
  auditId: number,
  findingId: number,
  actionId: number,
  implementationEvidence: string
): Promise<CorrectiveActionResponseAchievements> => {
  return await apiClient.put(
    `/audits/${auditId}/findings/${findingId}/corrective-actions/${actionId}/implement`,
    { implementationEvidence }
  );
};

/**
 * Verify a corrective action (approve or reject)
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/verify
 * 
 * @param auditId - Audit ID
 * @param findingId - Finding ID
 * @param actionId - Corrective Action ID
 * @param payload - Verification decision and notes
 * @returns Updated corrective action
 */
export const verifyCorrectiveAction = async (
  auditId: number,
  findingId: number,
  actionId: number,
  payload: VerifyCorrectiveActionPayload
): Promise<CorrectiveActionResponseAchievements> => {
  return await apiClient.put(
    `/audits/${auditId}/findings/${findingId}/corrective-actions/${actionId}/verify`,
    payload
  );
};