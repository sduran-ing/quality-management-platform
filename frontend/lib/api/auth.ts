import apiClient from './client';

/**
 * =============================================================================
 * AUTHENTICATION API
 * =============================================================================
 * 
 * Handles user authentication: login, register, logout.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// User object returned from backend
// Backend auth endpoints return camelCase
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'quality_manager' | 'process_owner' | 'employee';
  company: {
    id: number;
    name: string;
  },
  departmentId: number | null;
  avatarUrl: string | null;
  achievementPoints: number | null;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Login request body
export interface LoginRequest {
  email: string;
  password: string;
}

// Register request body
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Login/Register response from backend
export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

// Get Current User Response
export interface GetCurrentUserResponse {
  success: boolean;
  user: User;
}

/**
 * =============================================================================
 * AUTH API FUNCTIONS
 * =============================================================================
 */

  /**
   * POST /api/auth/login
   * 
   * Authenticates user with email and password.
   * On success, returns JWT token and user data.
   * 
   * @param credentials - Email and password
   * @returns Promise with token and user data
   * 
   */
export const loginUser = async (credentials: LoginRequest): Promise<AuthResponse> => {
  return await apiClient.post('/auth/login', credentials);
};

  /**
   * POST /api/auth/register
   * 
   * Creates a new user account.
   * User is automatically logged in after registration
   * 
   * @param userData - User registration details
   * @returns Promise with token and user data
   */
  export const registerUser = async (userData: RegisterRequest): Promise<AuthResponse> => {
  return await apiClient.post('/auth/register', userData);
};

  /**
   * GET /api/auth/me
   * 
   * Fetches the currently authenticated user's data.
   * Uses JWT token from localStorage (added by apiClient interceptor).
   * 
   * USE CASE:
   * - On app load, verify token is still valid
   * - Refresh user data after profile update
   * - Check user permissions
   * 
   * @returns Promise with user data
   */
export const getCurrentUser = async (): Promise<GetCurrentUserResponse> => {
  return await apiClient.get('/auth/me');
};

  /**
   * LOGOUT
   * 
   * Logs out the current user.
   * 
   * PROCESS:
   * 1. Remove token from localStorage
   * 2. Clear user from state
   * 3. Redirect to login page
   * 
   * NOTE: This is client-side only.
   * Backend doesn't need to know (JWT is stateless).
   * Token becomes invalid when removed from client.
   * 
   */
  export const logoutUser = (): void => {
    // Remove token from localStorage
    if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }

    // Redirect to login page
    // We use window.location instead of Next.js router
    // because we want a full page reload (clear all state)

    if (typeof window !== 'undefined') {
    // Checks if the code is running in a browser
    // 'window' only exists in the browser
    // On the server (Node.js, SSR, static generation), window is 'undefined'
    // This prevents a runtime server-side crash
    // Once we’re sure we’re in the browser, we trigger a full page redirect
      window.location.href = '/login';
    }
  }
