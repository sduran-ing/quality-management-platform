/**
 * =============================================================================
 * USERS API CLIENT
 * =============================================================================
 * 
 * Handles all user-related API calls
 * Matches backend userController.js
 * 
 */

import apiClient from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Department
export interface Department {
  id: number;
  name: string;
}

// Process
export interface Process {
  id: number;
  name: string;
  acronym: string;
}

// User
export interface User {
  id: number;
  companyId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'quality_manager' | 'process_owner' | 'employee';
  departmentId: number | null;
  avatarUrl: string | null;
  isActive: boolean;
  achievementPoints: number;
  createdAt: string;
  updatedAt: string;
  
  // Relations (when included)
  department?: Department;
  managedDepartment?: Department;
  ownedProcesses?: Process[];
  assignedProcesses?: Process[];
}

/**
 * Approver (for dropdown)
 * 
 * EXCEPTION: Backend transforms this to camelCase
 */
export interface Approver {
  id: number;
  firstName: string;      // camelCase (backend transforms)
  lastName: string;       // camelCase (backend transforms)
  name: string;
  email: string;
  role: 'quality_manager' | 'process_owner';
  displayName: string;
  department: Department | null;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Get All Users Query Params
export interface GetUsersParams {
  role?: 'quality_manager' | 'process_owner' | 'employee';
  departmentId?: number;
  isActive?: boolean;
}

// Get All Users Response
export interface GetUsersResponse {
  success: boolean;
  message: string;
  data: {
    users: User[];
    total: number;
  };
}

// Get Single User Response
export interface UserResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

// Create User Request
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'quality_manager' | 'process_owner' | 'employee';
  departmentId?: number;
}

// Update User Request
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: 'quality_manager' | 'process_owner' | 'employee';
  departmentId?: number | null;
}

// Change Password Request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Reset Password Request
export interface ResetPasswordRequest {
  newPassword: string;
}

/**
 * Get Approvers Response
 * 
 * EXCEPTION: Backend returns camelCase for approvers
 */
export interface GetApproversResponse {
  success: boolean;
  message: string;
  data: {
    approvers: Approver[];
    total: number;
  };
}

// Generic Success Response
export interface SuccessResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * GET /api/users
 * Get all users for the company
 * 
 * - role: Filter by role
 * - departmentId: Filter by department
 * - isActive: Filter by active status
 * 
 * @param params - Query parameters for filtering
 * @returns List of users
 */
export const getAllUsers = async (params?: GetUsersParams): Promise<GetUsersResponse> => {
  return await apiClient.get('/users', { params });
};

/**
 * GET /api/users/:id
 * Get single user by ID
 * 
 * @param id - User ID
 * @returns User with relations
 */
export const getUserById = async (id: number): Promise<UserResponse> => {
  return await apiClient.get(`/users/${id}`);
};

/**
 * POST /api/users
 * Create a new user
 * 
 * Quality Manager only
 * 
 * @param data - User details
 * @returns Created user
 */
export const createUser = async (data: CreateUserRequest): Promise<UserResponse> => {
  return await apiClient.post('/users', data);
};

/**
 * PUT /api/users/:id
 * Update user details
 * 
 * Quality Manager onl
 *  
 * @param id - User ID
 * @param data - Fields to update
 * @returns Updated user
 */
export const updateUser = async (
  id: number,
  data: UpdateUserRequest
): Promise<UserResponse> => {
  return await apiClient.put(`/users/${id}`, data);
};

/**
 * DELETE /api/users/:id
 * Deactivate a user (soft delete)
 * 
 * Quality Manager only
 * 
 * @param id - User ID
 * @returns Deactivation confirmation
 */
export const deactivateUser = async (id: number): Promise<SuccessResponse> => {
  return await apiClient.delete(`/users/${id}`);
};

/**
 * PUT /api/users/me/change-password
 * Change own password
 * 
 * Any authenticated user
 * 
 * @param data - Current and new passwords
 * @returns Success confirmation
 */
export const changeOwnPassword = async (
  data: ChangePasswordRequest
): Promise<SuccessResponse> => {
  return await apiClient.put('/users/me/change-password', data);
};

/**
 * PUT /api/users/:id/reset-password
 * Reset another user's password (admin function)
 * 
 * @param id - User ID
 * @param data - New password
 * @returns Success confirmation
 */
export const resetUserPassword = async (
  id: number,
  data: ResetPasswordRequest
): Promise<SuccessResponse> => {
  return await apiClient.put(`/users/${id}/reset-password`, data);
};

/**
 * GET /api/users/approvers
 * Get list of users who can approve documents
 * 
 * Returns: Quality Managers + Process Owners (active only)
 * 
 * @returns List of approvers
 */
export const getApprovers = async (): Promise<GetApproversResponse> => {
  return await apiClient.get('/users/approvers');
};