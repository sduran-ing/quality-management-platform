// Import express-validator
const { validationResult } = require('express-validator');

/**
 * Middleware to check for validation errors
 * Use this after express-validator rules in any route
 * 
 * Example usage:
 * router.post('/register', [validationRules], validate, controller)
 */
const validate = (req, res, next) => {
  // Extract validation errors from request
  const errors = validationResult(req);
  
  // Check if there are any errors
  if (!errors.isEmpty()) {
    // Return 400 Bad Request with error details
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array() // Array of error objects
    });
  }
  
  // No errors - continue to next middleware/controller
  next();
};

// Export the middleware
module.exports = { validate };