// This file is specifically for Sequelize CLI
// It exports a plain configuration object (not a Sequelize instance)
require('dotenv').config();

module.exports = {
  // This config is to run the migration locally using: $env:NODE_ENV="development"
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + '_test',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  },

  // This config is to run the migration in the production DB using: $env:NODE_ENV="production"
  production: {
    // Uses a single connection string instead of individual variables
    // Supabase provides this format: postgresql://user:password@host:5432/db
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      // Required for Supabase - enforces SSL connection
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};