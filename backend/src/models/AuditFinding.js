// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the AuditFinding model
const AuditFinding = sequelize.define('AuditFinding', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  audit_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'audits',
      key: 'id'
    }
  },
  finding_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Auto-generated: F-001, F-002, etc.'
  },
  severity: {
    type: DataTypes.ENUM('major_nonconformity', 'minor_nonconformity', 'opportunity'),
    allowNull: false
  },
  standard_requirement_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'standard_requirements',
      key: 'id'
    },
    comment: 'Which requirement was not met'
  },
  process_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'processes',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'What was found'
  },
  evidence_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of evidence supporting the finding'
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'pending_verification', 'closed'),
    allowNull: false,
    defaultValue: 'open'
  },
  closed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Who closed the finding'
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the finding was closed'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Auditor who created the finding'
  }
}, {
  tableName: 'audit_findings',
  timestamps: true,
  underscored: true
});

module.exports = AuditFinding;