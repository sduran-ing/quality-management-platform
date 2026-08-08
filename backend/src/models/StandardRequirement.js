// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the StandardRequirement model
const StandardRequirement = sequelize.define('StandardRequirement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  standard_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'standards',
      key: 'id'
    }
  },
  clause_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., 4.1, 8.5.1'
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'standard_requirements',
      key: 'id'
    },
    comment: 'For hierarchical requirements (sub-clauses)'
  }
}, {
  tableName: 'standard_requirements',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

module.exports = StandardRequirement;