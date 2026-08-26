'use strict';

/**
 * ============================================================================
 * SEEDER: Demo Achievements
 * ============================================================================
 *
 * Seeds user_activity and user_achievements for Santiago Duran and Demo User,
 * giving both users a realistic starting state with 3 earned achievements each.
 *
 * ACHIEVEMENTS SEEDED (per user):
 * 1. "First Draft"       → document_proposal   (criteria_value: 1)
 * 2. "Stamp of Approval" → document_approved    (criteria_value: 1)
 * 3. "Archive Keeper"    → document_obsoleted   (criteria_value: 1)
 *
 * ACTIVITY LINKED TO REAL DOCUMENTS (congruent with documents seeder):
 *
 * Santiago:
 *   document_proposal  → QC-MA-001 (Quality Manual — he created it)
 *   document_approved  → HRM-PO-001 (Training Policy — he approved it)
 *   document_obsoleted → HRM-PR-001 (HR Onboarding Procedure — he obsoleted it)
 *
 * Demo User:
 *   document_proposal  → HRM-PO-001 (Training Policy — she created it)
 *   document_approved  → QC-MA-001 (Quality Manual — she approved it)
 *   document_obsoleted → QC-PR-001 (Risk Management Procedure — she obsoleted it)
 *
 * POINTS: 3 achievements × 10 pts each = 30 points per user
 * Updates users.achievement_points accordingly.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ==========================================
    // STEP 1: GATHER ALL REQUIRED IDs
    // ==========================================

    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (!company) throw new Error('Company not found. Run seed-company.js first.');

    // Users — need Santiago and Demo User IDs
    const users = await queryInterface.sequelize.query(
      `SELECT id, email FROM users WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getUserId = (email) => users.find(u => u.email === email)?.id;
    const santiagoId = getUserId('santiago@emeraldsoftware.dev');
    const demoId = getUserId('demo@emeraldsoftware.dev');

    // Documents — need IDs by code to link user_activity correctly
    // Each activity record must reference a real document so the data is congruent
    const documents = await queryInterface.sequelize.query(
      `SELECT id, code FROM documents WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getDocId = (code) => documents.find(d => d.code === code)?.id;

    // Achievements — look up by criteria_type + criteria_value
    // We only seed level 1 achievements (criteria_value = 1)
    const achievements = await queryInterface.sequelize.query(
      `SELECT id, criteria_type, criteria_value, name FROM achievements
       WHERE criteria_type IN ('document_proposal', 'document_approved', 'document_obsoleted')
       AND criteria_value = 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const getAchievementId = (criteriaType) =>
      achievements.find(a => a.criteria_type === criteriaType)?.id;

    const proposalAchievementId   = getAchievementId('document_proposal');
    const approvedAchievementId   = getAchievementId('document_approved');
    const obsoletedAchievementId  = getAchievementId('document_obsoleted');

    // Validate all IDs resolved before inserting anything
    if (!proposalAchievementId || !approvedAchievementId || !obsoletedAchievementId) {
      throw new Error('One or more achievements not found. Run seed-achievements.js first.');
    }

    // ==========================================
    // STEP 2: SEED USER_ACTIVITY
    //
    // Each record represents one real action the user performed.
    // The unique constraint (user_id, activity_type, reference_id) prevents
    // counting the same action twice if the seeder is accidentally re-run.
    //
    // reference_type: 'document' matches what the achievement service uses
    // when tracking document-related activities in the app.
    // ==========================================

    console.log('\nSeeding demo achievements...\n');
    console.log('  Inserting user_activity records...');

    await queryInterface.bulkInsert('user_activity', [

      // ── SANTIAGO'S ACTIVITIES ────────────────────────────────────────────

      {
        user_id: santiagoId,
        company_id: company.id,
        activity_type: 'document_proposal',
        reference_id: getDocId('QC-MA-001'),  // Quality Manual — Santiago created it
        reference_type: 'document',
        created_at: new Date('2026-01-05T09:00:00.000Z')
      },
      {
        user_id: santiagoId,
        company_id: company.id,
        activity_type: 'document_approved',
        reference_id: getDocId('HR-PO-001'),  // Training Policy — Santiago approved it
        reference_type: 'document',
        created_at: new Date('2026-01-06T10:00:00.000Z')
      },
      {
        user_id: santiagoId,
        company_id: company.id,
        activity_type: 'document_obsoleted',
        reference_id: getDocId('HR-PR-001'),  // HR Onboarding Procedure — Santiago obsoleted it
        reference_type: 'document',
        created_at: new Date('2026-01-07T11:00:00.000Z')
      },

      // ── DEMO USER'S ACTIVITIES ───────────────────────────────────────────

      {
        user_id: demoId,
        company_id: company.id,
        activity_type: 'document_proposal',
        reference_id: getDocId('HR-PO-001'),  // Training Policy — Demo User created it
        reference_type: 'document',
        created_at: new Date('2026-01-05T09:30:00.000Z')
      },
      {
        user_id: demoId,
        company_id: company.id,
        activity_type: 'document_approved',
        reference_id: getDocId('QC-MA-001'),  // Quality Manual — Demo User approved it
        reference_type: 'document',
        created_at: new Date('2026-01-06T10:30:00.000Z')
      },
      {
        user_id: demoId,
        company_id: company.id,
        activity_type: 'document_obsoleted',
        reference_id: getDocId('QC-PR-001'),  // Risk Management Procedure — Demo User obsoleted it
        reference_type: 'document',
        created_at: new Date('2026-01-07T11:30:00.000Z')
      }
    ]);

    console.log('6 activity records inserted (3 per user)');

    // ==========================================
    // STEP 3: SEED USER_ACHIEVEMENTS
    //
    // One record per user per achievement.
    // The unique constraint on (user_id, achievement_id) prevents duplicates.
    // earned_at matches the activity timestamp for consistency.
    // ==========================================

    console.log('Inserting user_achievements records...');

    await queryInterface.bulkInsert('user_achievements', [

      // ── SANTIAGO'S EARNED ACHIEVEMENTS ───────────────────────────────────

      {
        user_id: santiagoId,
        achievement_id: proposalAchievementId,   // "First Draft"
        earned_at: new Date('2026-01-05T09:00:00.000Z')
      },
      {
        user_id: santiagoId,
        achievement_id: approvedAchievementId,   // "Stamp of Approval"
        earned_at: new Date('2026-01-06T10:00:00.000Z')
      },
      {
        user_id: santiagoId,
        achievement_id: obsoletedAchievementId,  // "Archive Keeper"
        earned_at: new Date('2026-01-07T11:00:00.000Z')
      },

      // ── DEMO USER'S EARNED ACHIEVEMENTS ──────────────────────────────────

      {
        user_id: demoId,
        achievement_id: proposalAchievementId,   // "First Draft"
        earned_at: new Date('2026-01-05T09:30:00.000Z')
      },
      {
        user_id: demoId,
        achievement_id: approvedAchievementId,   // "Stamp of Approval"
        earned_at: new Date('2026-01-06T10:30:00.000Z')
      },
      {
        user_id: demoId,
        achievement_id: obsoletedAchievementId,  // "Archive Keeper"
        earned_at: new Date('2026-01-07T11:30:00.000Z')
      }
    ]);

    console.log('6 achievement records inserted (3 per user)');

    // ==========================================
    // STEP 4: UPDATE ACHIEVEMENT POINTS
    //
    // Matches what achievementService.track() does in the app:
    // increments users.achievement_points by the sum of earned points.
    //
    // 3 achievements × 10 points each = 30 points per user.
    // ==========================================

    console.log('  Updating achievement_points...');

    const pointsPerUser = achievements.reduce((sum, a) => sum + 10, 0); // 10 pts × 3 achievements

    await queryInterface.sequelize.query(
      `UPDATE users 
       SET achievement_points = ${pointsPerUser}
       WHERE id IN (${santiagoId}, ${demoId})`
    );

    console.log(`  achievement_points set to ${pointsPerUser} for both users`);

    // ==========================================
    // SUMMARY
    // ==========================================

    console.log('\n Achievement seeder complete!');
    console.log(`  - Santiago Duran: 3 achievements, ${pointsPerUser} points`);
    console.log(`     First Draft (document_proposal)`);
    console.log(`     Stamp of Approval (document_approved)`);
    console.log(`     Archive Keeper (document_obsoleted)`);
    console.log(`  - Demo User: 3 achievements, ${pointsPerUser} points`);
    console.log(`     First Draft (document_proposal)`);
    console.log(`     Stamp of Approval (document_approved)`);
    console.log(`     Archive Keeper (document_obsoleted)\n`);
  },

  down: async (queryInterface, Sequelize) => {
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!company) return;

    const users = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE company_id = ${company.id}
       AND email IN ('santiago@emeraldsoftware.dev', 'demo@emeraldsoftware.dev')`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length === 0) return;

    const userIds = users.map(u => u.id);
    const userIdList = userIds.join(', ');

    // Remove earned achievements
    await queryInterface.sequelize.query(
      `DELETE FROM user_achievements WHERE user_id IN (${userIdList})`
    );

    // Remove activity records
    await queryInterface.sequelize.query(
      `DELETE FROM user_activity WHERE user_id IN (${userIdList})`
    );

    // Reset achievement points to 0
    await queryInterface.sequelize.query(
      `UPDATE users SET achievement_points = 0 WHERE id IN (${userIdList})`
    );

    console.log(' User achievements, activity records and points reset');
  }
};