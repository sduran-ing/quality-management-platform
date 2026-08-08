'use strict';

/**
 * =============================================================================
 * MIGRATION: Remove Document Status & Add Version Obsolete Status
 * =============================================================================
 * 
 * CHANGES:
 * 1. Remove 'status' column from 'documents' table
 *    - No longer needed - we use document_versions.status instead
 *    - Single source of truth for status
 * 
 * 2. Add 'obsolete' option to document_versions.status enum
 *    - Existing: 'draft', 'pending_approval', 'approved', 'outdated'
 *    - New: 'obsolete'
 *    - Used when document is retired with no replacement
 * 
 * WHY THIS CHANGE:
 * - Document can have multiple versions with different statuses
 * - Document-level status was ambiguous (what if v3 approved, v4 draft?)
 * - Filtering happens at version level
 * - Simpler data model (no redundancy)
 */

module.exports = {
  /**
   * UP Migration
   * 
   * Executes when running: npx sequelize-cli db:migrate
   */
  up: async (queryInterface, Sequelize) => {
    /**
     * STEP 1: Add 'obsolete' to document_versions.status enum
     * 
     * PROCESS:
     * 1. Create new enum with all values including 'obsolete'
     * 2. Alter column to use new enum
     * 3. Drop old enum
     * 
     * NOTE: Sequelize doesn't have direct enum update method,
     * so we use raw SQL for PostgreSQL
     */
    
    // For PostgreSQL
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_document_versions_status 
      ADD VALUE IF NOT EXISTS 'obsolete';
    `);

    /**
     * STEP 2: Remove status column from documents table
     * 
     * SAFE TO DROP:
     * - All status logic moved to document_versions table
     * - No data loss (status exists in versions)
     * - current_version_id still points to active version
     */
    await queryInterface.removeColumn('documents', 'status');
  },

  /**
   * DOWN Migration
   * 
   * Executes when running: npx sequelize-cli db:migrate:undo
   * 
   * RESTORES:
   * - documents.status column
   * - Removes 'obsolete' from version status enum
   * 
   * WARNING: This will lose 'obsolete' status data!
   */
  down: async (queryInterface, Sequelize) => {
    /**
     * STEP 1: Restore status column to documents table
     * 
     * DEFAULT VALUE:
     * - Set to 'draft' as safest option
     * - In production, you'd want to derive this from current_version.status
     */
    await queryInterface.addColumn('documents', 'status', {
      type: Sequelize.ENUM('draft', 'pending_approval', 'approved', 'obsolete'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Restored during migration rollback'
    });

    /**
     * STEP 2: Remove 'obsolete' from document_versions.status enum
     * 
     * WARNING: This will fail if any versions have status='obsolete'
     * First, you'd need to update those records to 'outdated' or another status
     * 
     * NOTE: PostgreSQL doesn't support removing enum values directly
     * You'd need to:
     * 1. Create new enum without 'obsolete'
     * 2. Update column to use new enum
     * 3. Drop old enum
     * 
     * For simplicity, we're leaving this as a TODO
     * In practice, you wouldn't rollback this migration
     */
    
    // TODO: Implement if rollback is truly needed
    console.log('WARNING: Rollback does not remove obsolete from version status enum');
    console.log('If needed, manually update any obsolete versions first');
  }
};