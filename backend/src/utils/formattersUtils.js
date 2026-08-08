// Import required modules


/** EXPLANATION EXAMPLES
 * Hash a plain text password
 * @param {string} password - Plain text password from user
 * @returns {Promise<string>} - Hashed password
 */


/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password from login attempt
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */

// Helper function to get quarter start date
const getQuarterStart = (date) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3);
  const quarterStartMonth = quarter * 3;
  return new Date(year, quarterStartMonth, 1);
}

// Export all functions
module.exports = {
  getQuarterStart
};