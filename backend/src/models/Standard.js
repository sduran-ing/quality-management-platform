// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the Standard model
const Standard = sequelize.define('Standard', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  version: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., 2015, 2018, 27001:2022'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'standards',
  timestamps: true,
  underscored: true,
  updatedAt: false  // Only created_at based on migration
});

module.exports = Standard;