/**
 * =============================================================================
 * DASHBOARD API CLIENT
 * =============================================================================
 * 
 * Handles all dashboard-related API calls
 * Matches backend dashboardController.js
 */

import apiClient from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User (for audit relations)
 * 
 * camelCase because backend transforms it
 */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
}

/**
 * Process (for audit relations)
 * 
 * camelCase because backend transforms it
 */
export interface Process {
  id: number;
  name: string;
  acronym: string;
}

/**
 * Standard (for audit relations)
 * 
 * camelCase because backend transforms it
 */
export interface Standard {
  id: number;
  name: string;
  version: string;
}

/**
 * Upcoming Audit
 * 
 * camelCase because backend transforms it
 */
export interface UpcomingAudit {
  id: number;
  title: string;
  scheduledStartDate: string;
  scheduledEndDate: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  leadAuditor: User | null;
  processes: Process[];
  standards: Standard[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Dashboard Stats Response

export interface DashboardStatsResponse {
  success: boolean;
  message: string;
  data: {
    openCorrectiveActions: number;
    openFindings: number;
    myAudits: number;
    myAuditsThisQuarter: number;
  };
}

// Document Stats Response

export interface DocumentStatsResponse {
  success: boolean;
  message: string;
  data: {
    draft: number;
    pending: number;
    approved: number;
  };
}

// Upcoming Audits Response
export interface UpcomingAuditsResponse {
  success: boolean;
  message: string;
  data: {
    audits: UpcomingAudit[];
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 * 
 * @returns Dashboard statistics
 */
export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  return await apiClient.get('/dashboard/stats');
};

/**
 * GET /api/dashboard/documents/stats
 * Get document status distribution
 * 
 * @returns Document statistics
 */
export const getDocumentStats = async (): Promise<DocumentStatsResponse> => {
  return await apiClient.get('/dashboard/documents/stats');
};

/**
 * GET /api/dashboard/audits/upcoming
 * Get upcoming audits
 * 
 * @returns Upcoming audits
 */
export const getUpcomingAudits = async (): Promise<UpcomingAuditsResponse> => {
  return await apiClient.get('/dashboard/audits/upcoming');
};