/**
 * =============================================================================
 * USER ROUTES
 * =============================================================================
 * 
 * Routes for user-related operations.
 */

// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  changeOwnPassword,
  resetUserPassword,
  getApprovers
} = require('../controllers/userController');

// Import middleware
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Import validation
const { body, param } = require('express-validator');

// ============================================
// VALIDATION RULES
// ============================================

const validateUserCreate = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['quality_manager', 'process_owner', 'employee']).withMessage('Invalid role'),
  
  body('departmentId')
    .optional()
    .isInt().withMessage('Department ID must be an integer')
];

const validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty().withMessage('First name cannot be empty')
    .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .notEmpty().withMessage('Last name cannot be empty')
    .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),
  
  body('role')
    .optional()
    .isIn(['quality_manager', 'process_owner', 'employee']).withMessage('Invalid role'),
  
  body('departmentId')
    .optional()
    .custom((value) => {
      if (value !== null && !Number.isInteger(value)) {
        throw new Error('Department ID must be an integer or null');
      }
      return true;
    })
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
];

const validateResetPassword = [
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
];

const validateId = [
  param('id')
    .isInt().withMessage('Invalid user ID')
];

// ============================================
// ROUTES
// ============================================

/**
 * ROUTE ORDER MATTERS
 * 
 * Specific routes (like /approvers, /me) MUST come BEFORE parameterized routes (like /:id)
 * 
 * WHY:
 * Express matches routes in order from top to bottom.
 * If /:id comes first, /approvers will match /:id with id="approvers"
 * 
 * CORRECT ORDER:
 * 1. /approvers (specific)
 * 2. /me/change-password (specific)
 * 3. /:id (parameterized - catches everything else)
 */

/**
 * GET /api/users/approvers
 * Get list of users who can approve documents (QM + Process Owners)
 * Accessible by: All authenticated users
 */
router.get(
  '/approvers',
  authenticate,
  getApprovers
);

/**
 * PUT /api/users/me/change-password
 * Change own password
 * Accessible by: Any authenticated user (for themselves)
 */
router.put(
  '/me/change-password',
  authenticate,
  validateChangePassword,
  validate,
  changeOwnPassword
);

/**
 * GET /api/users
 * Get all users for the company
 * Query params: role, departmentId, isActive
 * Accessible by: Only QM for the organization module
 */
router.get(
  '/',
  authenticate,
  authorize(['quality_manager']),
  getAllUsers
);

/**
 * GET /api/users/:id
 * Get a single user by ID
 * Accessible by: Only QM for the organization module
 * 
 * THIS MUST COME AFTER SPECIFIC ROUTES
 * (After /approvers, /me/change-password, etc.)
 */
router.get(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validate,
  getUserById
);

/**
 * POST /api/users
 * Create a new user
 * Accessible by: Quality Manager only
 */
router.post(
  '/',
  authenticate,
  authorize(['quality_manager']),
  validateUserCreate,
  validate,
  createUser
);

/**
 * PUT /api/users/:id
 * Update user details
 * Accessible by: Quality Manager only
 */
router.put(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validateUserUpdate,
  validate,
  updateUser
);

/**
 * DELETE /api/users/:id
 * Deactivate a user (soft delete)
 * Accessible by: Quality Manager only
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validate,
  deactivateUser
);

/**
 * PUT /api/users/:id/reset-password
 * Reset another user's password (admin function)
 * Accessible by: Quality Manager only
 */
router.put(
  '/:id/reset-password',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validateResetPassword,
  validate,
  resetUserPassword
);

module.exports = router;