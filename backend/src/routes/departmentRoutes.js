// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignDepartmentHead
} = require('../controllers/departmentController');

// Import middleware
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Import validation
const { body, param } = require('express-validator');

// ============================================
// VALIDATION RULES
// ============================================

const validateDepartmentCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Department name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Department name must be between 2 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
];

const validateDepartmentUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Department name cannot be empty')
    .isLength({ min: 2, max: 255 }).withMessage('Department name must be between 2 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
];

const validateAssignHead = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be an integer')
];

const validateId = [
  param('id')
    .isInt().withMessage('Invalid department ID')
];

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/departments
 * Get all departments for the user's company
 * Accessible by: All authenticated users
 */
router.get(
  '/',
  authenticate,
  getAllDepartments
);

/**
 * GET /api/departments/:id
 * Get a single department by ID
 * Accessible by: All authenticated users
 */
router.get(
  '/:id',
  authenticate,
  validateId,
  validate,
  getDepartmentById
);

/**
 * POST /api/departments
 * Create a new department
 * Accessible by: Quality Manager only
 */
router.post(
  '/',
  // Four layers of protection:
  authenticate,                     // Layer 1: Is user logged in?
  authorize(['quality_manager']),   // Layer 2: Does user have permission?
  validateDepartmentCreate,         // Layer 3: Is data valid?
  validate,                         // Layer 4: Is express-validator rules valid?
  createDepartment                  // Finally: Execute business logic
);

/**
 * PUT /api/departments/:id
 * Update department details
 * Accessible by: Quality Manager only
 */
router.put(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validateDepartmentUpdate,
  validate,
  updateDepartment
);

/**
 * DELETE /api/departments/:id
 * Soft delete a department
 * Accessible by: Quality Manager only
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validate,
  deleteDepartment
);

/**
 * PUT /api/departments/:id/assign-head
 * Assign or update department head
 * Accessible by: Quality Manager only
 */
router.put(
  '/:id/assign-head',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validateAssignHead,
  validate,
  assignDepartmentHead
);

module.exports = router;