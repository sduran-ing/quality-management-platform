// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the CorrectiveAction model
const CorrectiveAction = sequelize.define('CorrectiveAction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  finding_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'audit_findings',
      key: 'id'
    }
  },
  action_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Auto-generated: CA-001, CA-002, etc.'
  },
  proposed_action: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'What will be done to fix the problem'
  },
  root_cause_analysis: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Why did the problem occur?'
  },
  responsible_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Who is responsible for implementation'
  },
  expected_completion_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When should it be completed?'
  },
  actual_completion_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When was it actually completed?'
  },
  implementation_evidence: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Evidence/description of what was done to implement the action'
  },
  status: {
    type: DataTypes.ENUM('proposed', 'rejected', 'in_implementation', 'pending_verification', 'completed'),
    allowNull: false,
    defaultValue: 'proposed'
  },
  proposed_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usually Process Owner or Quality Manager'
  },
  proposed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Auditor who approved the proposed action'
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verified_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Auditor who verified effectiveness'
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Why the CA was rejected (either at proposal or verification stage)'
  }
}, {
  tableName: 'corrective_actions',
  timestamps: true,
  underscored: true,
  createdAt: 'proposed_at',  // Map to existing column
  updatedAt: false           // No updated_at in table
});

module.exports = CorrectiveAction;