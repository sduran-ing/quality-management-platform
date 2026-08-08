'use strict';

/**
 * =============================================================================
 * MIGRATION: Add Assigned Approver to Document Versions
 * =============================================================================
 * 
 * ADDS:
 * - assigned_approver_id column to document_versions table
 * 
 * PURPOSE:
 * - When creating a document/version, creator assigns who will approve it
 * - Approver must be Quality Manager or Process Owner
 * - Provides accountability and workflow clarity
 * 
 * BUSINESS RULE:
 * - Required for new documents/versions
 * - Can be changed before submission
 * - Locked after submission to pending_approval
 * - QM can override and approve/reject anything
 * 
 * BACKWARD COMPATIBILITY:
 * - Field allows NULL for existing records
 * - Will be cleaned up later with demo seeder
 */

module.exports = {
  /**
   * UP Migration
   */
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('document_versions', 'assigned_approver_id', {
      type: Sequelize.INTEGER,
      allowNull: true,  // Allow null for existing records
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',  // If approver deleted, set to null (QM can still approve)
      comment: 'User assigned to approve/reject this version (must be QM or Process Owner)'
    });

    // Add index for faster queries
    await queryInterface.addIndex('document_versions', ['assigned_approver_id'], {
      name: 'document_versions_assigned_approver_id_idx'
    });
  },

  /**
   * DOWN Migration
   */
  down: async (queryInterface) => {
    await queryInterface.removeIndex('document_versions', 'document_versions_assigned_approver_id_idx');
    await queryInterface.removeColumn('document_versions', 'assigned_approver_id');
  }
};