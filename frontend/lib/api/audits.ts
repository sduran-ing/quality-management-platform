/**
 * =============================================================================
 * AUDITS API
 * =============================================================================
 * 
 * All API functions for audit management
 * All interfaces use camelCase (frontend convention)
 * Backend sends camelCase (transformed by backend middleware)
 */

import apiClient from './client';

// import generic api responses
import { ApiResponse, ApiResponseWithAchievements } from '../types';

// ============================================
// TYPES & INTERFACES
// ============================================

// Audit status enum
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Audit type enum
export type AuditType = 'internal' | 'external' | 'certification' | 'surveillance';

// Team member role enum
export type TeamMemberRole = 'lead_auditor' | 'auditor' | 'auditee';

// User (simplified)
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

// Process (simplified)
export interface Process {
  id: number;
  name: string;
  acronym: string;
}

// Standard (simplified)
export interface Standard {
  id: number;
  name: string;
  version: string;
}

// Team member with role
export interface TeamMember extends User {
  auditTeam?: {
    role: TeamMemberRole;
  };
}

// Audit (full structure)
export interface Audit {
  id: number;
  companyId: number;
  title: string;
  auditType: AuditType;
  status: AuditStatus;
  scheduledStartDate: string;  // ISO date string
  scheduledEndDate: string;    // ISO date string
  actualStartDate: string | null;
  actualEndDate: string | null;
  description: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  
  // Associations (populated when included)
  creator?: User;
  processes?: Process[];
  standards?: Standard[];
  teamMembers?: TeamMember[];
}

// Pagination metadata (matching backend response)
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Query parameters for getting audits
export interface GetAuditsParams {
  // Pagination
  page?: number;
  limit?: number;

  // Search
  search?: string;

  // Filters
  status?: AuditStatus | AuditStatus[];
  auditType?: AuditType | AuditType[];
  processId?: number;
  myRole?: TeamMemberRole;  // Filter by my role in audits
  myView?: boolean;         // Role-based "My Audits" filter
}

// Response structure for getting multiple audits
export interface GetAuditsResponse {
  success: boolean;
  message: string;
  data: {
    audits: Audit[];
    pagination: Pagination;
    };
  }


// Get Single Audit Response (clean one-liner using generic from index)
export type AuditResponse = ApiResponse<{ audit: Audit }>;

// Get Single Audit Response with Achievements
export type AuditResponseAchievements = ApiResponseWithAchievements<{ audit: Audit }>;

// Request body for creating audit
export interface CreateAuditRequest {
  title: string;
  auditType: AuditType;
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  description?: string;
  processIds: number[];
  standardIds: number[];
  teamMembers: Array<{
    userId: number;
    role: TeamMemberRole;
  }>;
}


// Response for getting all audit members
export interface GetAuditTeamMembersResponse {
  success: boolean;
  message: string;
  data: {
    teamMembers: TeamMember[];
  };
}

// Requirements associated to the standard
export interface StandardRequirement {
  id: number;
  clauseNumber: string;
  title: string;
  description?: string;
}

// Standards associated to the audit
export interface AuditStandard {
  id: number;
  name: string;
  version: string;
  requirements: StandardRequirement[];
}

// Response for all standards and their requirements for this audit
export interface GetAuditStandardResponse {
  success: boolean;
  message: string;
  data: {
    standards: AuditStandard[];
  };
}

// Response for all processes for this audit
export interface GetAuditProcessResponse {
  success: boolean;
  message: string;
  data: {
    processes: Process[];
  };
}

/**
 * Edit audit payload (same structure as create)
 */
export interface EditAuditPayload {
  title: string;
  auditType: AuditType;
  startDate: string;
  endDate: string;
  description?: string;
  processIds: number[];
  standardIds: number[];
  teamMembers: Array<{
    userId: number;
    role: TeamMemberRole;
  }>;
}

/**
 * Cancel audit response
 */
export interface CancelAuditResponse {
  success: boolean;
  message: string;
  data: {
    audit: Audit;
    deletedFindings: number;
    deletedCorrectiveActions: number;
  };
}

/**
 * Audit statistics interface
 */
export interface AuditStatistics {
  totalFindings: number;
  findingsByStatus: {
    open: number;
    in_progress: number;
    pending_verification: number;
    closed: number;
  };
  totalCorrectiveActions: number;
  correctiveActionsByStatus: {
    proposed: number;
    rejected: number;
    in_implementation: number;
    pending_verification: number;
    completed: number;
  };
}

/**
 * Get audit statistics response
 */
export interface GetAuditStatisticsResponse {
  success: boolean;
  message: string;
  data: {
    statistics: AuditStatistics;
  };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all audits with filters and pagination
 * GET /api/audits
 * 
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated list of audits
 */
export const getAllAudits = async (
  params?: GetAuditsParams
): Promise<GetAuditsResponse> => {
  return await apiClient.get('/audits', { params });
};

/**
 * Get single audit by ID
 * GET /api/audits/:auditId
 * 
 * @param auditId - Audit ID
 * @returns Audit details with associations
 */
export const getAuditById = async (auditId: number): Promise<AuditResponse> => {
  return await apiClient.get(`/audits/${auditId}`);
};

/**
 * Create new audit
 * POST /api/audits
 * 
 * @param data - Audit creation data
 * @returns Created audit
 */
export const createAudit = async (
  data: CreateAuditRequest
): Promise<AuditResponseAchievements> => {
  return await apiClient.post('/audits', data);
};

/**
 * Edit an audit
 * PUT /api/audits/:id
 * 
 * @param auditId - Audit ID
 * @param payload - Updated audit data
 * @returns Updated audit
 */
export const editAudit = async (
  auditId: number,
  payload: EditAuditPayload
): Promise<AuditResponse> => {
  return await apiClient.put(`/audits/${auditId}`, payload);
};

/**
 * Start an audit
 * PUT /api/audits/:auditId/start
 * 
 * Changes status from 'scheduled' to 'in_progress'
 * Records actual start date
 * 
 * @param auditId - Audit ID
 * @returns Updated audit
 */
export const startAudit = async (
  auditId: number
): Promise<AuditResponse> => {
  return await apiClient.put(`/audits/${auditId}/start`);
};

/**
 * Complete an audit
 * PUT /api/audits/:auditId/complete
 * 
 * @param auditId - Audit ID
 * @returns Completed audit
 */
export const completeAudit = async (
  auditId: number
): Promise<AuditResponseAchievements> => {
  return await apiClient.put(`/audits/${auditId}/complete`);
};

/**
 * Cancel an audit
 * PUT /api/audits/:auditId/cancel
 * 
 * Changes status to 'cancelled'
 * Deletes ALL findings and corrective actions
 * Can only cancel audits with status: 'scheduled' or 'in_progress'
 * 
 * @param auditId - Audit ID
 * @returns Updated audit and deletion counts
 */
export const cancelAudit = async (
  auditId: number
): Promise<CancelAuditResponse> => {
  return await apiClient.put(`/audits/${auditId}/cancel`);
};

/**
 * Get audit statistics
 * GET /api/audits/:auditId/statistics
 * 
 * Returns counts of findings and corrective actions by status
 * 
 * @param auditId - Audit ID
 * @returns Audit statistics
 */
export const getAuditStatistics = async (
  auditId: number
): Promise<GetAuditStatisticsResponse> => {
  return await apiClient.get(`/audits/${auditId}/statistics`);
};

/**
 * Get audit team members
 * GET /api/audits/:auditId/team-members
 */
export const getAuditTeamMembers = async (
  auditId: number
): Promise<GetAuditTeamMembersResponse> => {
  return await apiClient.get(`/audits/${auditId}/team-members`);
};

/**
 * Get standards associated with an audit
 * GET /api/audits/:auditId/standards
 */
export const getAuditStandards = async (
  auditId: number
): Promise<GetAuditStandardResponse> => {
  return await apiClient.get(`/audits/${auditId}/standards`);
};

/**
 * Get processes associated with an audit  
 * GET /api/audits/:auditId/processes
 */
export const getAuditProcesses = async (
  auditId: number
): Promise<GetAuditProcessResponse> => {
  return await apiClient.get(`/audits/${auditId}/processes`);
};