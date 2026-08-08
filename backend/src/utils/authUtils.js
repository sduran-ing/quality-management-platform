// Import required modules
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const util = require('util');   // For using 'promisify' - Node.js has a built-in helper to convert callbacks to Promises

// ============================================
// PASSWORD HASHING FUNCTIONS
// ============================================

/**
 * Hash a plain text password
 * @param {string} password - Plain text password from user
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  // Generate a salt (random data added to password before hashing)
  // 10 is the "cost factor" - higher = more secure but slower
  const salt = await bcrypt.genSalt(10);
  
  // Hash the password with the salt
  const hashedPassword = await bcrypt.hash(password, salt);
  
  return hashedPassword;
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password from login attempt
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
const comparePassword = async (password, hashedPassword) => {
  // bcrypt.compare automatically handles the salt
  const isMatch = await bcrypt.compare(password, hashedPassword);
  return isMatch;
};

// ============================================
// JWT TOKEN FUNCTIONS
// ============================================

// Convert callback-based functions to Promise-based
// Now we can use async/await for JWT
const signAsync = util.promisify(jwt.sign);
const verifyAsync = util.promisify(jwt.verify);

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object from database
 * @returns {string} - JWT token
 */
  const generateToken = async (user) => {
// Payload - data embedded in the token (don't put sensitive data here!)
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id
  };
  
  // Sign the token with our secret key
  // signAsync replaces: "jwt.sign" 
    // Was wrapped here: const signAsync = util.promisify(jwt.sign);
    // In order to be able to use async-await
  const token = await signAsync(
    payload, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }     // expiresIn: token valid for 7 days
  );

  return token;
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token from request header
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
// verifyAsync replaces: "jwt.verify"
const verifyToken = async (token) => {
  try {
    const decoded = await verifyAsync(
        token, 
        process.env.JWT_SECRET
    );

    return decoded;
    
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Export all functions
module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};