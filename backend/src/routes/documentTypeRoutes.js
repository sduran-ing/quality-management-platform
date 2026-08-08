// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllDocumentTypes,
  getDocumentTypeById,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType
} = require('../controllers/documentTypeController');

// Import middleware
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Import validation
const { body, param } = require('express-validator');

// ============================================
// VALIDATION RULES
// ============================================

const validateDocumentTypeCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Document type name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('acronym')
    .trim()
    .notEmpty().withMessage('Acronym is required')
    .isLength({ min: 2, max: 10 }).withMessage('Acronym must be between 2 and 10 characters')
    .isUppercase().withMessage('Acronym must be uppercase')
];

const validateDocumentTypeUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('acronym')
    .optional()
    .trim()
    .notEmpty().withMessage('Acronym cannot be empty')
    .isLength({ min: 2, max: 10 }).withMessage('Acronym must be between 2 and 10 characters')
    .isUppercase().withMessage('Acronym must be uppercase')
];

const validateId = [
  param('id')
    .isInt().withMessage('Invalid document type ID')
];

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/document-types
 * Get all document types for the company
 * Accessible by: All authenticated users
 */
router.get(
  '/',
  authenticate,
  getAllDocumentTypes
);

/**
 * GET /api/document-types/:id
 * Get a single document type by ID
 * Accessible by: All authenticated users
 */
router.get(
  '/:id',
  authenticate,
  validateId,
  validate,
  getDocumentTypeById
);

/**
 * POST /api/document-types
 * Create a new document type
 * Accessible by: Quality Manager only
 */
router.post(
  '/',
  authenticate,
  authorize(['quality_manager']),
  validateDocumentTypeCreate,
  validate,
  createDocumentType
);

/**
 * PUT /api/document-types/:id
 * Update document type
 * Accessible by: Quality Manager only
 */
router.put(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validateDocumentTypeUpdate,
  validate,
  updateDocumentType
);

/**
 * DELETE /api/document-types/:id
 * Delete a document type
 * Accessible by: Quality Manager only
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validate,
  deleteDocumentType
);

module.exports = router;