'use strict';

const NEW_ENUM_VALUES = [
  'audit_completed',
  'audit_scheduled',
  'finding_closed',
  'finding_created',
  'document_approved',
  'document_updated',
  'document_obsoleted',
  'document_proposal',
  'ca_proposed',
  'ca_implemented',
  'ca_completed'
].map(v => `'${v}'`).join(', ');

const OLD_ENUM_VALUES = [
  'audit_completed',
  'finding_closed',
  'document_uploaded',
  'document_updated',
  'document_obsoleted',
  'ca_verified'
].map(v => `'${v}'`).join(', ');

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ============================================
    // STEP 1: Update achievements.criteria_type
    // ============================================

    /**
     * PostgreSQL doesn't allow modifying existing ENUM types directly.
     * The only safe pattern is:
     * 1. Rename old type → keep as backup
     * 2. Create new type with updated values
     * 3. Alter column to use new type (USING casts existing values)
     * 4. Drop old type
     */
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_achievements_criteria_type" 
        RENAME TO "enum_achievements_criteria_type_old";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_achievements_criteria_type" 
        AS ENUM(${NEW_ENUM_VALUES});
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE achievements 
        ALTER COLUMN criteria_type 
        TYPE "enum_achievements_criteria_type" 
        USING criteria_type::text::"enum_achievements_criteria_type";
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE "enum_achievements_criteria_type_old";
    `);

    console.log('Updated achievements.criteria_type');

    // ============================================
    // STEP 2: Update user_activity.activity_type
    // ============================================

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_user_activity_activity_type" 
        RENAME TO "enum_user_activity_activity_type_old";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_user_activity_activity_type" 
        AS ENUM(${NEW_ENUM_VALUES});
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE user_activity 
        ALTER COLUMN activity_type 
        TYPE "enum_user_activity_activity_type" 
        USING activity_type::text::"enum_user_activity_activity_type";
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE "enum_user_activity_activity_type_old";
    `);

    console.log('Updated user_activity.activity_type');

    // ============================================
    // STEP 3: Add unique constraint on user_activity
    // ============================================

    await queryInterface.addConstraint('user_activity', {
      fields: ['user_id', 'activity_type', 'reference_id'],
      type: 'unique',
      name: 'unique_user_activity_action'
    });

    console.log('Added unique constraint on user_activity');
    console.log('Achievement system migration complete');
  },

  down: async (queryInterface, Sequelize) => {

    // ============================================
    // STEP 1: Remove unique constraint
    // ============================================

    await queryInterface.removeConstraint(
      'user_activity',
      'unique_user_activity_action'
    );

    console.log('Removed unique constraint');

    // ============================================
    // STEP 2: Revert user_activity.activity_type
    // ============================================

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_user_activity_activity_type" 
        RENAME TO "enum_user_activity_activity_type_old";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_user_activity_activity_type" 
        AS ENUM(${OLD_ENUM_VALUES});
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE user_activity 
        ALTER COLUMN activity_type 
        TYPE "enum_user_activity_activity_type" 
        USING activity_type::text::"enum_user_activity_activity_type";
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE "enum_user_activity_activity_type_old";
    `);

    console.log('Reverted user_activity.activity_type');

    // ============================================
    // STEP 3: Revert achievements.criteria_type
    // ============================================

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_achievements_criteria_type" 
        RENAME TO "enum_achievements_criteria_type_old";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_achievements_criteria_type" 
        AS ENUM(${OLD_ENUM_VALUES});
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE achievements 
        ALTER COLUMN criteria_type 
        TYPE "enum_achievements_criteria_type" 
        USING criteria_type::text::"enum_achievements_criteria_type";
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE "enum_achievements_criteria_type_old";
    `);

    console.log('Reverted achievements.criteria_type');
  }
};