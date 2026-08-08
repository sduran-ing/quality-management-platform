/**
 * =============================================================================
 * DEPARTMENTS API CLIENT
 * =============================================================================
 * 
 * Handles all department-related API calls.
 * Matches backend departmentController.js
 */

import apiClient from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// User (for department head and members)
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
  company_id: number;
  name: string;
  description: string | null;
  department_head_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations (when included)
  departmentHead?: User;
  members?: User[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Get All Departments Response
export interface GetDepartmentsResponse {
  success: boolean;
  message: string;
  data: {
    departments: Department[];
    total: number;
  };
}

// Get Single Department Response
export interface DepartmentResponse {
  success: boolean;
  message: string;
  data: {
    department: Department;
  };
}

// Create Department Request
export interface CreateDepartmentRequest {
  name: string;
  description?: string;
}

// Update Department Request
export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
}

// Assign Department Head Request
export interface AssignDepartmentHeadRequest {
  userId: number;
}

// Delete Department Response
export interface DeleteDepartmentResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * GET /api/departments
 * Get all departments for the company
 * 
 * Returns active departments with head and members
 * 
 * @returns List of departments
 */
export const getAllDepartments = async (): Promise<GetDepartmentsResponse> => {
  return await apiClient.get('/departments');
};

/**
 * GET /api/departments/:id
 * Get single department by ID
 * 
 * @param id - Department ID
 * @returns Department with head and members
 */
export const getDepartmentById = async (id: number): Promise<DepartmentResponse> => {
  return await apiClient.get(`/departments/${id}`);
};

/**
 * POST /api/departments
 * Create a new department
 * 
 * @param data - Department name and description
 * @returns Created department
 */
export const createDepartment = async (data: CreateDepartmentRequest): Promise<DepartmentResponse> => {
  return await apiClient.post('/departments', data);
};

/**
 * PUT /api/departments/:id
 * Update department details 
 * 
 * @param id - Department ID
 * @param data - Fields to update
 * @returns Updated department
 */
export const updateDepartment = async (
  id: number,
  data: UpdateDepartmentRequest
): Promise<DepartmentResponse> => {
  return await apiClient.put(`/departments/${id}`, data);
};

/**
 * DELETE /api/departments/:id
 * Soft delete a department
 * 
 * @param id - Department ID
 * @returns Deletion confirmation
 */
export const deleteDepartment = async (id: number): Promise<DeleteDepartmentResponse> => {
  return await apiClient.delete(`/departments/${id}`);
};

/**
 * PUT /api/departments/:id/assign-head
 * Assign or update department head
 * 
 * @param id - Department ID
 * @param data - User ID to assign as head
 * @returns Updated department with new head
 */
export const assignDepartmentHead = async (
  id: number,
  data: AssignDepartmentHeadRequest
): Promise<DepartmentResponse> => {
  return await apiClient.put(`/departments/${id}/assign-head`, data);
};