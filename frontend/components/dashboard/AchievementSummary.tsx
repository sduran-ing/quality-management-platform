import Link from 'next/link';
import * as Icons from 'lucide-react';
import { Trophy, TrendingUp, LucideIcon, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { Achievement } from '@/lib/api/achievements';

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum items shown in each section of the dashboard summary.
 * Small because is a preview, not the full list.
 * Full list lives at /achievements page.
 */
const MAX_RECENT = 3;
const MAX_PROGRESS = 3;

// ============================================
// ACHIEVEMENT ICON
// ============================================

/**
 * Declared at module level to avoid React 19 "component created during render" error.
 * Resolves Lucide icon name stored in DB to an actual icon component.
 * Falls back to Trophy if the stored name doesn't match any Lucide icon.
 */
function AchievementIcon({ name, className }: { name: string; className: string }) {
  const Icon = (Icons[name as keyof typeof Icons] as LucideIcon) ?? Trophy;
  return <Icon className={className} />;
}

// ============================================
// PROPS
// ============================================

interface AchievementSummaryProps {
  /**
   * Full list of achievements from useAchievements() hook.
   * The component handles filtering and sorting internally.
   * Parent passes everything
   */
  achievements: Achievement[];
}

// ============================================
// COMPONENT
// ============================================

export default function AchievementSummary({ achievements }: AchievementSummaryProps) {

  /**
   * Split and sort achievements into two display lists.
   * 
   * recentAchievements:
   * - Filter: earned only (earned=true)
   * - Sort: newest first (earnedAt DESC)
   * - Limit: MAX_RECENT (3)
   * 
   * progressAchievements:
   * - Filter: unearned with some progress (percentage > 0)
   *   Achievements with 0% are hidden — not relevant to show yet
   * - Sort: most progress first (percentage DESC)
   *   User sees what they're closest to completing
   * - Limit: MAX_PROGRESS (3)
   */
  const recentAchievements = achievements
    .filter(a => a.earned)
    .sort((a, b) => {
      if (!a.earnedAt || !b.earnedAt) return 0;
      return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
    })
    .slice(0, MAX_RECENT);

  const progressAchievements = achievements
    .filter(a => !a.earned && a.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, MAX_PROGRESS);



  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">

      {/* ============================================
          LATEST UNLOCKED
          Shows last MAX_RECENT (3) earned achievements
          ============================================ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-accent-500" />
          <h4 className="font-heading text-lg font-semibold text-gray-900">
            Latest Unlocked
          </h4>
        </div>

        <div className="space-y-3">
          {recentAchievements.length === 0 ? (
            <p className="font-body text-md text-gray-500 italic">
              No achievements unlocked yet
            </p>
          ) : (
            recentAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-accent-200 shadow-sm"
              >
                {/* Purple icon badge */}
                <div className="flex-shrink-0 w-9 h-9 bg-accent-100 rounded-lg flex items-center justify-center">
                  <AchievementIcon
                    name={achievement.icon}
                    className="h-5 w-5 text-accent-600"
                  />
                </div>

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-md text-gray-900">
                    {achievement.name}
                  </p>
                  <p className="font-body text-sm text-gray-600 mt-0.5">
                    {achievement.description}
                  </p>
                </div>

                {/**
                 * Relative time e.g. "2 days ago"
                 */}
                {achievement.earnedAt && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-3 w-3 text-accent-500" />
                    <span className="text-sm text-accent-700 font-body whitespace-nowrap">
                      {formatRelativeTime(achievement.earnedAt)}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============================================
          ALMOST THERE — IN PROGRESS
          Shows MAX_PROGRESS (3) closest to completion
          Only achievements with percentage > 0 appear here
          ============================================ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-primary-600" />
          <h4 className="font-heading text-lg font-semibold text-gray-900">
            Almost There
          </h4>
        </div>

        <div className="space-y-3">
          {progressAchievements.length === 0 ? (
            <p className="font-body text-md text-gray-500 italic">
              No achievements in progress
            </p>
          ) : (
            progressAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                {/* Icon + name + description */}
                <div className="flex items-start gap-3 mb-2">

                  {/* Gray icon badge (not earned yet) */}
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <AchievementIcon
                      name={achievement.icon}
                      className="h-4 w-4 text-gray-500"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-body text-md font-medium text-gray-900">
                      {achievement.name}
                    </p>
                    <p className="font-body text-sm text-gray-600 mt-0.5">
                      {achievement.description}
                    </p>
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
            ))
          )}
        </div>
      </div>

      {/* Link to full achievements page */}
      <Link
        href="/achievements"
        className="block text-center py-2 text-sm font-body font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        View All Achievements
      </Link>
    </div>
  );
}