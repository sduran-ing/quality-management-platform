// Import required modules
require('dotenv').config(); // Loads variables from .env file
const { Sequelize } = require('sequelize');

/**
 * Create Sequelize instance based on environment:
 *
 * Production (Render): Uses DATABASE_URL connection string from Supabase
 *   - Requires SSL (Supabase enforces it)
 *   - Single variable instead of individual credentials
 *
 * Development (local): Uses individual variables from .env
 *   - DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
 */
const sequelize = process.env.NODE_ENV === 'production'

  // ── PRODUCTION: Supabase via connection string ──────────────────────────
  ? new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      // Supabase requires SSL on all connections
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  })

  // ── DEVELOPMENT: Local PostgreSQL via individual variables ───────────────
  : new Sequelize(
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