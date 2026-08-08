// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the Audit model
const Audit = sequelize.define('Audit', {
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
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  audit_type: {
    type: DataTypes.ENUM('internal', 'external', 'certification', 'surveillance'),
    allowNull: false,
    comment: 'Type of audit being conducted'
  },
  scheduled_start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Planned start date'
  },
  scheduled_end_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Planned end date'
  },
  actual_start_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When audit actually started'
  },
  actual_end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When audit actually ended'
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'scheduled'
  },
  description: {
    type: DataTypes.TEXT,
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
  tableName: 'audits',
  timestamps: true,
  underscored: true
});

module.exports = Audit;