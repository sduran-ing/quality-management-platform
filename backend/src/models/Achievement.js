const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define('Achievement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // Stores Lucide icon name or url
  icon_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  criteria_type: {
    type: DataTypes.ENUM(
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
    ),
    allowNull: false
  },
  // How many times the action must be performed to earn this achievement
  criteria_value: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'achievements',
  timestamps: false,   // No updated_at in this table
  underscored: true
});

module.exports = Achievement;