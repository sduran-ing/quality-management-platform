// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the AuditStandard model (junction table)
const AuditStandard = sequelize.define('AuditStandard', {
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
  standard_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'standards',
      key: 'id'
    }
  }
}, {
  tableName: 'audit_standards',
  timestamps: false  // No timestamp columns in table
});

module.exports = AuditStandard;