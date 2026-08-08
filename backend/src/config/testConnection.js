// Import the database configuration we just created
const sequelize = require('./database');

// Async function to test connection
const testDatabaseConnection = async () => {
  try {
    // Try to authenticate (connect) to the database
    await sequelize.authenticate();
    console.log('SUCCESS! Database connection established.');
    console.log(`Connected to database: ${process.env.DB_NAME}`);
    console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    
    // Close the connection after testing
    await sequelize.close();
    console.log('Connection closed.');
    
  } catch (error) {
    // If connection fails, show detailed error
    console.error('ERROR! Unable to connect to the database.');
    console.error('Error details:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify your DB_PASSWORD in .env file');
    console.error('3. Confirm database "quality_management" exists');
  }
};

// Run the test
testDatabaseConnection();