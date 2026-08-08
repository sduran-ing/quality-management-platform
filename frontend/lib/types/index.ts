// ============================================
// BASE API RESPONSE
// ============================================

/**
 * Generic base for all API responses
 * T = the shape of the data field
 * 
 * Usage:
 * ApiResponse<{ document: Document }>
 * ApiResponse<{ audit: Audit }>
 * ApiResponse<{ users: User[] }>
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ============================================
// ACHIEVEMENTS (shared across many responses)
// ============================================

// Single progress bar toward an unearned achievement
export interface AchievementProgress {
  id: number;
  name: string;
  icon: string;       // Lucide icon name e.g. 'ClipboardCheck'
  points: number;
  current: number;    // How many times user has done this action
  target: number;     // How many times needed to earn
  percentage: number; // 0-99
}

// Achievement just earned (triggers unlock animation)
export interface NewlyEarnedAchievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  points: number;
}

// Full achievements object appended to action responses
export interface AchievementsResult {
  progress: AchievementProgress[];
  newlyEarned: NewlyEarnedAchievement[];
}

// Base for responses that include achievement tracking
export interface ApiResponseWithAchievements<T> extends ApiResponse<T> {
  achievements?: AchievementsResult;  // Optional: only present when action tracked
}