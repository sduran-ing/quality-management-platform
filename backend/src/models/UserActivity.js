const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserActivity = sequelize.define('UserActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  activity_type: {
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
  // ID of the related record (audit id, finding id, etc.)
  reference_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Which table the reference_id belongs to
  reference_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_activity',
  timestamps: false,   // No updated_at in this table
  underscored: true
});

module.exports = UserActivity;