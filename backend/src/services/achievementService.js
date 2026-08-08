const { Achievement, UserAchievement, UserActivity, User } = require('../models');

// ============================================
// TRACK ACTIVITY AND CHECK ACHIEVEMENTS
// ============================================

/**
 * Core function called by other controllers after an action completes.
 * 
 * Flow:
 * 1. Log activity to user_activity table
 * 2. Count user's total for this activity type
 * 3. Find unearned achievements for this activity type
 * 4. Award any achievements the user just reached
 * 5. Build progress data for remaining unearned achievements
 * 6. Return { progress, newlyEarned } for frontend
 * 
 * @param {number} userId - User performing the action
 * @param {number} companyId - User's company
 * @param {string} activityType - e.g. 'audit_completed', 'finding_closed'
 * @param {number} referenceId - ID of the audit, finding, document, etc.
 * @param {string} referenceType - Table name: 'audit', 'finding', 'document', etc.
 * @returns {{ progress: Array, newlyEarned: Array }}
 */
const track = async (userId, companyId, activityType, referenceId, referenceType) => {
  try {

    // ============================================
    // STEP 1: Log Activity
    // ============================================

    /**
     * Try to insert into user_activity.
     * If the unique constraint fires (same user + action + record),
     * it means this action was already tracked - return early.
     * 
     * This protects against double-counting if a controller
     * is accidentally called twice or retried.
     */
    try {
      await UserActivity.create({
        user_id: userId,
        company_id: companyId,
        activity_type: activityType,
        reference_id: referenceId,
        reference_type: referenceType
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        // Already tracked - silently skip, don't award again
        console.log(`Activity already tracked: ${activityType} #${referenceId} for user ${userId}`);
        return { progress: [], newlyEarned: [] };
      }
      throw error; // Re-throw unexpected errors
    }

    // ============================================
    // STEP 2: Count total for this Activity Type
    // ============================================

    /**
     * Count how many times this user has done this specific action.
     * This is what gets compared against achievement criteria_value.
     * 
     * Example: User has completed 2 audits → count = 2
     * Achievement "Audit Champion" requires 2 → award it!
     */
    const totalCount = await UserActivity.count({
      where: {
        user_id: userId,
        activity_type: activityType
      }
    });

    console.log(`User ${userId} total ${activityType}: ${totalCount}`);

    // ============================================
    // STEP 3: Get All Achievements for This Activity Type
    // ============================================

    /**
     * Fetch all achievements that this action can unlock.
     * Ordered by criteria_value ASC so we check level 1 before level 2, etc.
     * 
     * Example for activityType 'audit_completed':
     * [
     *   { name: 'Audit Initiated', criteria_value: 1, points: 10 },
     *   { name: 'Audit Champion',  criteria_value: 2, points: 25 },
     *   { name: 'Audit Master',    criteria_value: 3, points: 50 },
     * ]
     */
    const relatedAchievements = await Achievement.findAll({
      where: { criteria_type: activityType },
      order: [['criteria_value', 'ASC']]
    });

    // Nothing to check if no achievements defined for this type
    if (relatedAchievements.length === 0) {
      return { progress: [], newlyEarned: [] };
    }

    // ============================================
    // STEP 4: Find Already Earned Achievements
    // ============================================

    /**
     * Get IDs of achievements this user has already earned.
     * We use this to filter them out - don't award twice, don't
     * show progress for already completed achievements.
     */
    const alreadyEarned = await UserAchievement.findAll({
      where: { user_id: userId },
      attributes: ['achievement_id']
    });

    // Convert to a Set for O(1) lookup
    const earnedIds = new Set(alreadyEarned.map(row => row.achievement_id));

    // Filter down to only unearned achievements for this type
    const unearnedAchievements = relatedAchievements.filter(
      achievement => !earnedIds.has(achievement.id)
    );

    // User has earned all achievements for this type - nothing to do
    if (unearnedAchievements.length === 0) {
      return { progress: [], newlyEarned: [] };
    }

    // ============================================
    // STEP 5: Award Newly Earned Achievements
    // ============================================

    /**
     * Check each unearned achievement - if the user's count
     * has reached or passed the requirement, award it now.
     * 
     * We collect them to return to the frontend for the
     * unlock animation.
     */
    const newlyEarned = [];

    for (const achievement of unearnedAchievements) {
      if (totalCount >= achievement.criteria_value) {

        // Award the achievement
        await UserAchievement.create({
          user_id: userId,
          achievement_id: achievement.id,
          earned_at: new Date()
        });

        console.log(`Achievement unlocked: "${achievement.name}" for user ${userId}`);

        // Append in the empty array each earned achievement
        newlyEarned.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon_url,  // Lucide icon name
          points: achievement.points
        });
      }
    }

    // ============================================
    // STEP 5.1: Increment user's achievement_points by total points earned
    // ============================================

    /** 
     * Uses Sequelize's increment() which runs a single atomic SQL:
     * UPDATE users SET achievement_points = achievement_points + N WHERE id = userId
     * 
     * Atomic = no race condition if two actions complete simultaneously.
     * Only runs if at least one achievement was earned this action.
     */
    if (newlyEarned.length > 0) {
      const totalPointsEarned = newlyEarned.reduce(
        (sum, achievement) => sum + achievement.points,
        0
      );

      await User.increment('achievement_points', {
        by: totalPointsEarned,
        where: { id: userId }
      });

      console.log(`Added ${totalPointsEarned} points to user ${userId}`);
    }

    // ============================================
    // STEP 6: Build Progress for Remaining Achievements
    // ============================================

    /**
     * After awarding, calculate progress for achievements
     * the user still hasn't earned yet.
     * 
     * These become the progress bars shown in the frontend.
     * Maximum 3 bars - which matches our 3 levels per category.
     * 
     * Example with count = 1, achievements [1, 2, 3]:
     * - Level 1 (criteria 1): just earned → goes to newlyEarned
     * - Level 2 (criteria 2): 1/2 = 50% → progress bar
     * - Level 3 (criteria 3): 1/3 = 33% → progress bar
     */
    const newlyEarnedIds = new Set(newlyEarned.map(a => a.id));

    const progress = unearnedAchievements
      .filter(achievement => !newlyEarnedIds.has(achievement.id)) // Exclude just earned
      .slice(0, 3)                                                 // Max 3 bars
      .map(achievement => ({
        id: achievement.id,
        name: achievement.name,
        icon: achievement.icon_url,
        points: achievement.points,
        current: totalCount,
        target: achievement.criteria_value,
        // Cap at 99% so bar never looks complete until actually earned
        percentage: Math.min(
          Math.round((totalCount / achievement.criteria_value) * 100),
          99
        )
      }));

    return { progress, newlyEarned };

  } catch (error) {
    /**
     * IMPORTANT: Achievement tracking must NEVER crash the main action.
     * 
     * If this service throws, the audit/document/finding has already
     * been saved. We log the error and return empty data so the
     * controller response still succeeds.
     */
    console.error('Achievement tracking error:', error);
    return { progress: [], newlyEarned: [] };
  }
};

module.exports = { track };