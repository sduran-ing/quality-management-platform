// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * =============================================================================
 * DOCUMENT MODEL
 * =============================================================================
 * 
 * Represents a document that can have multiple versions.
 * 
 * SEPARATION OF CONCERNS:
 * 
 * DOCUMENT (this model):
 * - Metadata that doesn't change across versions
 * - Code, name, type, process, department
 * - Company ownership
 * - Points to current active version
 * 
 * DOCUMENT VERSION (separate model):
 * - Version-specific data
 * - File, version number, status
 * - Approval information
 * - Status
 */
const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Auto-generated: [PROCESS]-[TYPE]-[###] (e.g., ITEN-PROC-001)'
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 500]
    }
  },
  document_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'document_types',
      key: 'id'
    }
  },
  process_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'processes',
      key: 'id'
    }
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  current_version_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Points to latest approved version'
  },
  code_edited_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Tracks if Quality Manager manually changed the code'
  },
  code_edited_at: {
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
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true
});

module.exports = Document;