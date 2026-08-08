/**
 * =============================================================================
 * ACHIEVEMENTS API
 * =============================================================================
 * 
 * All API functions for achievement management
 * All interfaces use camelCase (frontend convention)
 * Backend sends camelCase (transformed by backend middleware)
 */

import apiClient from './client';
import { ApiResponse } from '@/lib/types';

// ============================================
// TYPES
// ============================================

/**
 * Single achievement with user's progress attached.
 * Returned by the achievements page endpoint.
 */
export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;            // Lucide icon name
  points: number;
  criteriaType: string;
  criteriaValue: number;

  // Earned status
  earned: boolean;
  earnedAt: string | null; // ISO date string if earned, null if not

  // Progress toward earning
  current: number;         // How many times user has done this activity
  percentage: number;
}

/**
 * Summary statistics for the achievements page header.
 */
export interface AchievementStats {
  totalPoints: number;
  earnedCount: number;
  totalCount: number;
  completionPercentage: number;
}

// Get Achievements Response (using generic from index)
export type GetAchievementsResponse = ApiResponse<{
  achievements: Achievement[];
  stats: AchievementStats;
}>;

// ============================================
// API FUNCTION
// ============================================

/**
 * Fetch all achievements with user's earned status and progress.
 * GET /api/achievements
 */
export const getUserAchievements = async (): Promise<GetAchievementsResponse> => {
  return await apiClient.get('/achievements');
};