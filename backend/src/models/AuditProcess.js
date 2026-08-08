// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the AuditProcess model (junction table)
const AuditProcess = sequelize.define('AuditProcess', {
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
  process_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'processes',
      key: 'id'
    }
  }
}, {
  tableName: 'audit_processes',
  timestamps: false  // ← No timestamp columns in table
});

module.exports = AuditProcess;