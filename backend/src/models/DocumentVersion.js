// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * =============================================================================
 * DOCUMENT VERSION MODEL
 * =============================================================================
 * 
 * Represents a specific version of a document.
 * Each document can have multiple versions (1.0, 2.0, 3.0, etc.)
 * 
 * LIFECYCLE EXAMPLE:
 * 
 * Version 1.0: draft → pending_approval → approved
 * Version 2.0: draft → pending_approval → approved
 *              (Version 1.0 becomes outdated)
 * Version 3.0: draft → pending_approval → approved
 *              (Version 2.0 becomes outdated)
 * 
 * Version 3.0 marked as obsolete (no replacement needed)
 */
const DocumentVersion = sequelize.define('DocumentVersion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  document_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'documents',
      key: 'id'
    }
  },
  version_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Auto-incremented: 1.0, 2.0, 3.0, etc.'
  },
  file_url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'S3 key/path to the document file'
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'File size in bytes'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'outdated', 'obsolete'),
    allowNull: false,
    defaultValue: 'draft'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

    /**
   * Assigned approver
   * 
   * - Approving: Check if current_user is assigned approver
   * - Rejecting: Check if current_user is assigned approver
   * - QM can always override (approve/reject anything)
   * 
   */
  assigned_approver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,  // Null for backward compatibility (old records) but it will change with the demo
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User assigned to approve/reject this version (must be QM or Process Owner)'
  },

  version_edited_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Tracks if Quality Manager manually changed version number'
  },
  version_edited_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  change_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of what changed in this version'
  }
}, {
  tableName: 'document_versions',
  timestamps: true,
  underscored: true,
  // Only use created_at (no updated_at based on the design)
  updatedAt: false
});

module.exports = DocumentVersion;