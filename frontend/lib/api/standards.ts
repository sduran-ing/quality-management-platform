import apiClient from './client';

/**
 * Standard interface
 */
export interface Standard {
  id: number;
  name: string;
  version: string;
  description?: string;
}

/**
 * Get all standards response
 */
export interface GetAllStandardsResponse {
  success: boolean;
  message: string;
  data: {
    standards: Standard[];
  };
}

/**
 * Get all standards
 * GET /api/standards
 * 
 * @returns List of all standards
 */
export const getAllStandards = async (): Promise<GetAllStandardsResponse> => {
  return await apiClient.get('/standards');
};