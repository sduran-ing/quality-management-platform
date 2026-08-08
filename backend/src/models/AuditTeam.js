// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the AuditTeam model (junction table with role)
const AuditTeam = sequelize.define('AuditTeam', {
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
  auditor_id: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('lead_auditor', 'auditor', 'auditee'),
    allowNull: false,
    defaultValue: 'auditor',
    comment: 'Role of this user in this specific audit'
  }
}, {
  tableName: 'audit_team',
  timestamps: true,
  underscored: true,
  createdAt: 'assigned_at',  // Map to existing column
  updatedAt: false           // No updated_at in table
});

module.exports = AuditTeam;