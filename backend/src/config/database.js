// Import required modules
require('dotenv').config(); // Loads variables from .env file
const { Sequelize } = require('sequelize');

// Create a new Sequelize instance (this represents the database connection)
const sequelize = new Sequelize(
  process.env.DB_NAME,      // Database name: quality_management
  process.env.DB_USER,      // Username: postgres
  process.env.DB_PASSWORD,  // Password: from your .env file
  {
    host: process.env.DB_HOST,     // Where PostgreSQL is running: localhost
    port: process.env.DB_PORT,     // PostgreSQL port: 5432
    dialect: 'postgres',           // Database type: PostgreSQL
    logging: false,                // Disable SQL query logging (set to console.log to see queries)
    pool: {
      max: 5,          // Maximum number of connections in pool
      min: 0,          // Minimum number of connections in pool
      acquire: 30000,  // Maximum time (ms) to get connection before throwing error
      idle: 10000      // Maximum time (ms) a connection can be idle before being released
    }
  }
);

// Test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
  }
};

// Export the sequelize instance so other files can use it
module.exports = sequelize;
module.exports.testConnection = testConnection;