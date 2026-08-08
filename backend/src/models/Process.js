// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the Process model
const Process = sequelize.define('Process', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 255]
    }
  },
  acronym: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 10],
      isUppercase: true // Acronyms should be uppercase
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  process_owner_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'processes',
  timestamps: true,
  underscored: true,
  
  // Add indexes for better query performance
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'acronym'], // Acronym must be unique per company
      name: 'unique_company_process_acronym'
    }
  ]
});

module.exports = Process;