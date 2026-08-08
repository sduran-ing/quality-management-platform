// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import the auth controller
const { register, login, getCurrentUser } = require('../controllers/authController');

// Import middleware
const { validate } = require('../middleware/validationMiddleware');
const { authenticate } = require('../middleware/authMiddleware');

// Import express-validator for input validation rules
const { body } = require('express-validator');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * POST /api/auth/register
 * Register a new demo user
 */
router.post(
  '/register',
  [
    // Validation rules
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(), // Converts to lowercase, removes dots from Gmail addresses
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    
    body('first_name')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
    
    body('last_name')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters')
  ],
  validate,  // Import from middleware folder
  register   // Execute controller function
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  [
    // Validation rules
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  validate,  // Import from middleware folder
  login      // Execute controller function
);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Requires: JWT token in Authorization header
 */
router.get('/me', authenticate, getCurrentUser);


// Export the router
module.exports = router;