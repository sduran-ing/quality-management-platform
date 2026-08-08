'use client';

/**
 * =============================================================================
 * ACHIEVEMENTS PAGE
 * =============================================================================
 * 
 * Displays the user's achievement progress and earned badges.
 * 
 * SECTIONS:
 * 1. Header and total points
 * 2. Completed achievements: sorted newer first, with earned date
 * 3. In progress: sorted by % completion DESC, two-column grid
 */

import { useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Trophy, Star, LucideIcon, CheckCircle2, Clock } from 'lucide-react';
import { cn, formatDate, formatUserName } from '@/lib/utils';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAchievements } from '@/lib/hooks/useAchievements';
import { Achievement } from '@/lib/api/achievements';
import Spinner from '@/components/ui/Spinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// ============================================
// ACHIEVEMENT ICON COMPONENT
// ============================================

/**
 * OPTION A. Resolves a Lucide icon from a stored string name and renders it.
 * 
 * MUST be declared at module level (outside other components) and then can be used in all the components.
 * Declaring it inside a component would create a new component
 * on every render and React 19 flags this as an error.
 * 
 */
function AchievementIcon({
  name,
  className
}: {
  name: string;
  className: string;
}) {
  // Falls back to Trophy if icon name doesn't match any Lucide icon.
  const Icon = (Icons[name as keyof typeof Icons] as LucideIcon) ?? Trophy;
  return <Icon className={className} />;
}

// ============================================
// COMPLETED ACHIEVEMENT CARD
// ============================================

/**
 * Card for an achievement the user has already earned.
 * Shows full purple styling, earned date, and points.
 */
function CompletedCard({ achievement }: { achievement: Achievement }) {

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-accent-200 shadow-sm">

      {/* Purple icon badge */}
      <div className="flex-shrink-0 w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center">
         <AchievementIcon name={achievement.icon} className="h-7 w-7 text-accent-600" />
      </div>

      {/* Achievement info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-gray-900 text-md truncate">
            {achievement.name}
          </p>
        </div>
        <p className="text-sm text-gray-700 truncate">
          {achievement.description}
        </p>

        {/* Earned date */}
        {achievement.earnedAt && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3 text-gray-600" />
            <p className="text-sm text-gray-600">
              Earned on {formatDate(achievement.earnedAt)}
            </p>
          </div>
        )}
      </div>

      {/* Points badge */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-accent-100 rounded-full">
        <Star className="h-4 w-4 text-accent-500" />
        <span className="text-sm font-semibold text-accent-700">
          +{achievement.points}
        </span>
      </div>
    </div>
  );
}

// ============================================
// IN PROGRESS ACHIEVEMENT CARD
// ============================================

/**
 * Card for an achievement the user hasn't earned yet.
 * Shows progress bar, current/target count, and potential points.
 */
function InProgressCard({ achievement }: { achievement: Achievement }) {

    /**
       * OPTION B. Dynamic Lucide icon from stored icon name string.
       * e.g. icon = 'ClipboardCheck' → Icons.ClipboardCheck
       * Falls back to Trophy if icon name doesn't match any Lucide icon
       * HAS TO BE DECLARED inside each component
       */
      const Icon = (Icons[achievement.icon as keyof typeof Icons] as LucideIcon) ?? Trophy;

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">

      {/* Header: icon + name + potential points */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">

          {/* Gray icon badge (not earned yet) */}
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Icon className="h-5 w-5 text-gray-500" />
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-md truncate">
              {achievement.name}
            </p>
            <p className="text-sm text-gray-700 truncate">
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Points to earn (grayed out) */}
        <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
          <Star className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-600">
            {achievement.points}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-accent-500 rounded-full transition-all duration-500"
          style={{ width: `${achievement.percentage}%` }}
        />
      </div>

      {/* Progress counts + percentage */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {achievement.current} / {achievement.criteriaValue}
        </span>
        <span className="text-sm font-semibold text-accent-600">
          {achievement.percentage}%
        </span>
      </div>
    </div>
  );
}

// ============================================
// PAGE COMPONENT
// ============================================

export default function AchievementsPage() {
  const { user } = useAuth();
  const { achievements, stats, isLoading, error } = useAchievements();

  /**
   * Split achievements into two sorted lists:
   * 
   * completed: earned=true, sorted by earnedAt DESC (newest first)
   * inProgress: earned=false, sorted by percentage DESC (most progress first)
   * 
   * useMemo prevents re-sorting on every render — only recalculates
   * when the achievements array itself changes.
   */
  const { completed, inProgress } = useMemo(() => {
    const completed = achievements
      .filter(a => a.earned)
      .sort((a, b) => {
        // Both have earnedAt since earned=true, but TypeScript needs the check
        if (!a.earnedAt || !b.earnedAt) return 0;
        return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
      });

    const inProgress = achievements
      .filter(a => !a.earned)
      .sort((a, b) => b.percentage - a.percentage);

    return { completed, inProgress };
  }, [achievements]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500 text-sm">Loading achievements...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorMessage message={error} />
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ============================================
          HEADER SECTION
          Personalized title + total points summary
          ============================================ */}
      <div className="bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between gap-4">

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold mb-1">
              These are your achievements, {formatUserName(user)}!!
            </h1>
            <p className="text-accent-200 text-lg">
              {stats?.earnedCount ?? 0} of {stats?.totalCount ?? 0} achievements earned
              · {stats?.completionPercentage ?? 0}% complete
            </p>
          </div>

          {/* Total points - prominent display */}
          <div className="flex-shrink-0 text-center bg-white/20 rounded-xl px-6 py-4">
            <div className="flex items-center gap-2 justify-center mb-1">
              <Trophy className="h-7 w-7 text-accent-100" />
              <span className="text-accent-100 text-md font-semibold uppercase tracking-wide">
                Total Points
              </span>
            </div>
            <p className="text-3xl font-bold">
              {stats?.totalPoints ?? 0}
            </p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-6">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${stats?.completionPercentage ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ============================================
          COMPLETED ACHIEVEMENTS
          Sorted newer first, full list no pagination
          ============================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-accent-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Completed
          </h2>
          <span className="text-md text-gray-600">
            ({completed.length})
          </span>
        </div>

        {completed.length > 0 ? (
            
           // Two-column grid on medium+ screens.
           // Single column on mobile (grid-cols-1).
           // Achievements sorted by latest earn, first appears (top-left).  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completed.map(achievement => (
              <CompletedCard
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
            <Trophy className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-md">
              No achievements earned yet. Start completing actions!
            </p>
          </div>
        )}
      </section>

      {/* ============================================
          IN PROGRESS ACHIEVEMENTS
          Sorted by % DESC, two-column grid
          ============================================ */}
      {inProgress.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              In Progress
            </h2>
            <span className="text-md text-gray-600">
              ({inProgress.length})
            </span>
          </div>

          {/**
           * Two-column grid on medium+ screens.
           * Single column on mobile (grid-cols-1).
           * Achievements sorted by percentage DESC so closest
           * to completion appears first (top-left).
           */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inProgress.map(achievement => (
              <InProgressCard
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}