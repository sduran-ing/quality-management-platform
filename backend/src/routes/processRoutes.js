// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllProcesses,
  getProcessById,
  createProcess,
  updateProcess,
  deleteProcess,
  assignUsersToProcess
} = require('../controllers/processController');

// Import middleware
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Import validation
const { body, param } = require('express-validator');

// ============================================
// VALIDATION RULES
// ============================================

const validateProcessCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Process name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Process name must be between 2 and 255 characters'),
  
  body('acronym')
    .trim()
    .notEmpty().withMessage('Process acronym is required')
    .isLength({ min: 2, max: 10 }).withMessage('Acronym must be between 2 and 10 characters')
    .isUppercase().withMessage('Acronym must be uppercase'),
  
  body('description')
    .optional()
    .trim(),
  
  body('processOwnerId')
    .notEmpty().withMessage('Process owner ID is required')
    .isInt().withMessage('Process owner ID must be an integer'),
  
  body('departmentIds')
    .optional()
    .isArray().withMessage('Department IDs must be an array')
];

const validateProcessUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Process name cannot be empty')
    .isLength({ min: 2, max: 255 }).withMessage('Process name must be between 2 and 255 characters'),
  
  body('acronym')
    .optional()
    .trim()
    .notEmpty().withMessage('Acronym cannot be empty')
    .isLength({ min: 2, max: 10 }).withMessage('Acronym must be between 2 and 10 characters')
    .isUppercase().withMessage('Acronym must be uppercase'),
  
  body('description')
    .optional()
    .trim(),
  
  body('processOwnerId')
    .optional()
    .isInt().withMessage('Process owner ID must be an integer'),
  
  body('departmentIds')
    .optional()
    .isArray().withMessage('Department IDs must be an array')
];

const validateAssignUsers = [
  body('userIds')
    .notEmpty().withMessage('User IDs are required')
    .isArray().withMessage('User IDs must be an array')
    .custom((value) => {
      if (value.length === 0) {
        throw new Error('User IDs array cannot be empty');
      }
      return true;
    })
];

const validateId = [
  param('id')
    .isInt().withMessage('Invalid process ID')
];

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/processes
 * Get all processes for the user's company
 * Accessible by: All authenticated users
 */
router.get(
  '/',
  authenticate,
  getAllProcesses
);

/**
 * GET /api/processes/:id
 * Get a single process by ID
 * Accessible by: All authenticated users
 */
router.get(
  '/:id',
  authenticate,
  validateId,
  validate,
  getProcessById
);

/**
 * POST /api/processes
 * Create a new process
 * Accessible by: Quality Manager only
 */
router.post(
  '/',
  authenticate,
  authorize(['quality_manager']),
  validateProcessCreate,
  validate,
  createProcess
);

/**
 * PUT /api/processes/:id
 * Update process details
 * Accessible by: Quality Manager only
 */
router.put(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validateProcessUpdate,
  validate,
  updateProcess
);

/**
 * DELETE /api/processes/:id
 * Soft delete a process
 * Accessible by: Quality Manager only
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validate,
  deleteProcess
);

/**
 * POST /api/processes/:id/assign-users
 * Assign users to a process
 * Accessible by: Quality Manager or Process Owner
 */
router.post(
  '/:id/assign-users',
  authenticate,
  // Note: Authorization is handled in controller (QM or Process Owner)
  validateId,
  validateAssignUsers,
  validate,
  assignUsersToProcess
);

module.exports = router;