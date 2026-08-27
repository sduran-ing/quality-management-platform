import axios from 'axios';

// API base URL from environment variable
// We don't need 'dotenv' installation in Next.js because Next.js has built-in environment variable support
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api` || 'http://localhost:5000/api';

/**
 * Axios instance configured for the backend API
 * Automatically includes auth token from localStorage
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // I didn't used a default Content-Type, axios will set it based on data type
  // Because the Content-Type varies depending on the case:
  // It can be application/json or multipart/form-data

/**
   * PARAMS SERIALIZER
   * 
   * Handles array parameters correctly for Express backend
   * 
   * PROBLEM:
   * - Axios default: status[]=draft&status[]=approved
   * - Express expects: status=draft&status=approved
   * 
   * SOLUTION:
   * - Custom serializer that repeats param name for arrays
   */
  paramsSerializer: {
    serialize: (params) => {
      const parts: string[] = [];
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;  // Skip undefined/null values
        }
        
        if (Array.isArray(value)) {
          // For arrays: status=draft&status=approved
          value.forEach((item) => {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
          });
        } else {
          // For single values: page=1
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      });
      
      return parts.join('&');
    }
  }
});

/**
 * Request interceptor - Add auth token to every request
 * What this does: Before EVERY request get token from localStorage and add to Authorization header
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Only set Content-Type to JSON if NOT FormData
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    // If it IS FormData, axios will automatically set:
    // Content-Type: multipart/form-data;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle common errors
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return the data directly for successful responses
    // This UNWRAPS the axios response, the interceptor extracts the inner data object 
    // which means that .data contains the actual payload like this:
    //  {
    //   success: true,
    //   message: "Documents retrieved",
    //   data: {
    //     versions: [...],
    //     pagination: {...}
    //   }
    // }
    // 
    // Rather than the full axios wrapper:
    // {
    //   data: {
    //     success: true,
    //     message: "Documents retrieved",
    //     data: {
    //       versions: [...],
    //       pagination: {...}
    //     }
    //   },
    //   status: 200,
    //   statusText: 'OK',
    //   headers: {...},
    //   config: {...}
    // } 
    return response.data;
  },
  (error) => {
    // 1. Get the original request URL
    const requestUrl = error.config?.url || '';

    // 2. Check if this request was a Login attempt
    // Using the specific endpoint path
    const isLoginRequest = requestUrl.includes('/login');

    // 3. Handle 401 Unauthorized
    // ONLY redirect if this was NOT a login request
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('auth_token');

      // Redirect to login (only in browser, not during SSR)
      if (typeof window !== 'undefined') {
        //  Check if we are already on the login page to avoid self-redirect
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // Return a user-friendly error message
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

export default apiClient;