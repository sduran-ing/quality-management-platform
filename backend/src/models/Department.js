// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the Department model
const Department = sequelize.define('Department', {
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
      len: [2, 255] // Name must be between 2 and 255 characters
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  department_head_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Can be null initially (assigned later)
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
  tableName: 'departments',
  timestamps: true,
  underscored: true
});

module.exports = Department;