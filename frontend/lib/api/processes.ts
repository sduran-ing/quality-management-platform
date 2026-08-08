/**
 * =============================================================================
 * PROCESSES API CLIENT
 * =============================================================================
 * 
 * Handles all process-related API calls
 * Matches backend processController.js
 */

import apiClient from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// User (for process owner and assigned users)
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role?: 'quality_manager' | 'process_owner' | 'employee';
}

// Department
export interface Department {
  id: number;
  name: string;
}

// Process
export interface Process {
  id: number;
  company_id: number;
  name: string;
  acronym: string;
  description: string | null;
  process_owner_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations (when included)
  processOwner?: User;
  departments?: Department[];
  assignedUsers?: User[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Get All Processes Response
export interface GetProcessesResponse {
  success: boolean;
  message: string;
  data: {
    processes: Process[];
    total: number;
  };
}

//  Get Single Process Response
export interface ProcessResponse {
  success: boolean;
  message: string;
  data: {
    process: Process;
  };
}

// Create Process Request
export interface CreateProcessRequest {
  name: string;
  acronym: string;
  description?: string;
  processOwnerId: number;
  departmentIds?: number[];
}

// Update Process Request
export interface UpdateProcessRequest {
  name?: string;
  acronym?: string;
  description?: string;
  processOwnerId?: number;
  departmentIds?: number[];
}

// Assign Users Request
export interface AssignUsersRequest {
  userIds: number[];
}

// Delete Process Response
export interface DeleteProcessResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * GET /api/processes
 * Get all processes for the company
 * 
 * @returns List of processes
 */
export const getAllProcesses = async (): Promise<GetProcessesResponse> => {
  return await apiClient.get('/processes');
};

/**
 * GET /api/processes/:id
 * Get single process by ID
 * 
 * @param id - Process ID
 * @returns Process with owner, departments, and assigned users
 */
export const getProcessById = async (id: number): Promise<ProcessResponse> => {
  return await apiClient.get(`/processes/${id}`);
};

/**
 * POST /api/processes
 * Create a new process
 * Quality Manager only
 * 
 * @param data - Process details
 * @returns Created process
 */
export const createProcess = async (data: CreateProcessRequest): Promise<ProcessResponse> => {
  return await apiClient.post('/processes', data);
};

/**
 * PUT /api/processes/:id
 * Update process details
 * Quality Manager only
 * 
 * @param id - Process ID
 * @param data - Fields to update
 * @returns Updated process
 */
export const updateProcess = async (
  id: number,
  data: UpdateProcessRequest
): Promise<ProcessResponse> => {
  return await apiClient.put(`/processes/${id}`, data);
};

/**
 * DELETE /api/processes/:id
 * Soft delete a process
 * 
 * Sets is_active = false
 * 
 * @param id - Process ID
 * @returns Deletion confirmation
 */
export const deleteProcess = async (id: number): Promise<DeleteProcessResponse> => {
  return await apiClient.delete(`/processes/${id}`);
};

/**
 * POST /api/processes/:id/assign-users
 * Assign multiple users to a process
 * Quality Manager OR Process Owner
 * 
 * REPLACES existing user assignments (not additive)
 * 
 * @param id - Process ID
 * @param data - Array of user IDs to assign
 * @returns Updated process with assigned users
 */
export const assignUsersToProcess = async (
  id: number,
  data: AssignUsersRequest
): Promise<ProcessResponse> => {
  return await apiClient.post(`/processes/${id}/assign-users`, data);
};