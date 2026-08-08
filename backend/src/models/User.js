// Import Sequelize components
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Define the User model
const User = sequelize.define('User', {
  // Define columns (Sequelize automatically creates 'id' as primary key)
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
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true // Built-in email validation
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('quality_manager', 'process_owner', 'employee'),
    allowNull: false,
    defaultValue: 'employee'
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  achievement_points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  // Model options
  tableName: 'users', // Explicitly set table name
  timestamps: true,   // Automatically manages createdAt and updatedAt
  underscored: true,  // Use snake_case (created_at) instead of camelCase (createdAt)
  
  // Instance methods - functions you can call on a user instance
  // Example: user.getFullName()
  instanceMethods: {
    getFullName: function() {
      return `${this.first_name} ${this.last_name}`;
    }
  },
  
  // Don't return password_hash in JSON responses
  defaultScope: {
    attributes: { exclude: ['password_hash'] }
  },
  
  // Named scope for when you need the password (like during login)
  scopes: {
    withPassword: {
      attributes: { include: ['password_hash'] }
    }
  }
});

// Export the model so other files can use it
module.exports = User;