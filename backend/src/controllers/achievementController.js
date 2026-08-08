const { Achievement, UserAchievement, UserActivity } = require('../models');
const sequelize = require('../config/database');

// ============================================
// GET USER ACHIEVEMENTS
// ============================================

/**
 * Returns all achievements with the user's progress and earned status.
 * Used by the achievements page to display the full achievement list.
 * 
 * GET /api/achievements
 * 
 * Response includes:
 * - All 33 achievements grouped by category
 * - Which ones are earned (with earned date)
 * - Progress toward unearned ones
 * - Summary stats (total points, earned count)
 */
const getUserAchievements = async (req, res) => {
  try {
    const userId = req.user.id;

    // ============================================
    // QUERY 1: All achievements
    // ============================================

    const allAchievements = await Achievement.findAll({
      order: [
        ['criteria_type', 'ASC'],   // Group by category
        ['criteria_value', 'ASC']   // Level 1 → 2 → 3 within category
      ]
    });

    // ============================================
    // QUERY 2: Achievements user has already earned
    // ============================================

    const earnedAchievements = await UserAchievement.findAll({
      where: { user_id: userId },
      attributes: ['achievement_id', 'earned_at']
    });

    // Convert to map for O(1) lookup: { achievementId, earned_at }
    // This will create earnedMap:
    // [
    // [1, "2026-05-20"],
    // [2, "2026-05-22"]
    // ]
    const earnedMap = new Map(
      earnedAchievements.map(row => [row.achievement_id, row.earned_at])
    );

    // ============================================
    // QUERY 3: User's activity counts per type
    // ============================================

    /**
     * Count how many times the user has done each activity.
     * Used to calculate progress percentage for unearned achievements.
     * 
     * Result: [
     *   { activity_type: 'audit_completed', count: '2' },
     *   { activity_type: 'finding_closed', count: '1' },
     * ]
     */
    const activityCounts = await UserActivity.findAll({
      where: { user_id: userId },
      attributes: [
        'activity_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['activity_type'],
      raw: true
    });

    // Convert to map for O(1) lookup: { activityType, count }
    const activityMap = new Map(
      activityCounts.map(row => [row.activity_type, parseInt(row.count)])
    );

    // ============================================
    // BUILD ACHIEVEMENT LIST
    // ============================================

    /**
     * For each achievement, attach:
     * - earned: true/false
     * - earnedAt: date if earned
     * - current: how many times user has done this activity
     * - percentage: progress toward this achievement
     */
    const achievements = allAchievements.map(achievement => {
      const isEarned = earnedMap.has(achievement.id);
      const currentCount = activityMap.get(achievement.criteria_type) || 0;

      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon_url,          // Lucide icon name
        points: achievement.points,
        criteriaType: achievement.criteria_type,
        criteriaValue: achievement.criteria_value,

        // Earned status
        earned: isEarned,

        // Here looks for a key equal to achievement.id in earnedMap and returns the associated value
        earnedAt: isEarned ? earnedMap.get(achievement.id) : null,

        // Progress (only meaningful if not earned)
        current: currentCount,
        percentage: isEarned
          ? 100
          : Math.min(
              Math.round((currentCount / achievement.criteria_value) * 100),
              99  // Cap at 99% until actually earned
            )
      };
    });

    // ============================================
    // CALCULATE SUMMARY STATS
    // ============================================

    const totalPoints = earnedAchievements.reduce((sum, earned) => {
      // Compare all the achievements to the earned achievements using id      
      const achievement = allAchievements.find(a => a.id === earned.achievement_id);

      // When it finds a match, we use sum to accumulate the total of each achievement?.points 
      return sum + (achievement?.points || 0);
    }, 0);

    const stats = {
      totalPoints,
      earnedCount: earnedAchievements.length,
      totalCount: allAchievements.length,
      // Percentage of all achievements earned
      completionPercentage: Math.round(
        (earnedAchievements.length / allAchievements.length) * 100
      )
    };

    res.json({
      success: true,
      message: 'Achievements retrieved successfully',
      data: {
        achievements,
        stats
      }
    });

  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve achievements',
      error: error.message
    });
  }
};

module.exports = {
  getUserAchievements
};