/**
 * =============================================================================
 * USE ACHIEVEMENTS HOOK
 * =============================================================================
 * 
 * Manages filter state for achievement lists.
 * For fetching all achievements with user progress
 */

import { useState, useEffect } from 'react';
import {
  getUserAchievements,
  Achievement,
  AchievementStats
} from '@/lib/api/achievements';

interface UseAchievementsReturn {
  achievements: Achievement[];
  stats: AchievementStats | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for fetching all achievements with user progress.
 * 
 * USAGE:
 * const { achievements, stats, isLoading, error } = useAchievements();
 */
export function useAchievements(): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getUserAchievements();
        setAchievements(response.data.achievements);
        setStats(response.data.stats);

      } catch (err: any) {
        console.error('Error fetching achievements:', err);
        setError(err.response?.data?.message || 'Failed to load achievements');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  return { achievements, stats, isLoading, error };
}