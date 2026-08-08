// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import controllers
const {
  createDocument,
  getAllDocuments,
  getDocumentById,
  downloadDocument,
  submitForApproval,
  approveDocument,
  rejectDocument,
  updateDocument,
  createNewVersion,
  makeObsolete,
  deleteDraftVersion,
  updateVersionFile
} = require('../controllers/documentController');

// Import middleware
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');

// Import validation
const { body, param, query } = require('express-validator');

// ============================================
// VALIDATION RULES
// ============================================

const validateDocumentCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Document name is required')
    .isLength({ min: 2, max: 500 }).withMessage('Name must be between 2 and 500 characters'),

  body('document_type_id')
    .notEmpty().withMessage('Document type is required')
    .isInt().withMessage('Document type ID must be an integer'),

  body('process_id')
    .notEmpty().withMessage('Process is required')
    .isInt().withMessage('Process ID must be an integer'),

  body('department_id')
    .notEmpty().withMessage('Department is required')
    .isInt().withMessage('Department ID must be an integer'),

  body('assigned_approver_id')
    .notEmpty().withMessage('Assigned approver is required')
    .isInt().withMessage('Assigned approver ID must be an integer'),

  body('change_notes')
    .notEmpty().withMessage('Change notes are required')
    .trim()
];

const validateDocumentQuery = [
  // Pagination
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  // Search
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),

  /**
   * STATUS FILTER
   * 
   * Can be single or array of statuses
   */
  query('status')
    .optional()
    .custom((value) => {
      const validStatuses = ['draft', 'pending_approval', 'approved', 'outdated', 'obsolete'];

      // Single status
      if (typeof value === 'string') {
        if (!validStatuses.includes(value)) {
          throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        return true;
      }

      // Array of statuses
      if (Array.isArray(value)) {
        const invalid = value.filter(s => !validStatuses.includes(s));
        if (invalid.length > 0) {
          throw new Error(`Invalid status values: ${invalid.join(', ')}`);
        }
        return true;
      }

      throw new Error('Status must be a string or array');
    }),

  query('process_id')
    .optional()
    .isInt().withMessage('Process ID must be an integer'),

  query('department_id')
    .optional()
    .isInt().withMessage('Department ID must be an integer'),

  query('document_type_id')
    .optional()
    .isInt().withMessage('Document type ID must be an integer'),

  /**
   * CREATED BY FILTER
   * 
   * For "my documents" view
   */
  query('created_by')
    .optional()
    .isInt().withMessage('Created by must be an integer'),

  query('my_view')
    .optional()
    .customSanitizer(value => {
      // Convert string 'true'/'false' to actual boolean
      // This is neccessary because URLs are text-based, query parameters are part of the URL string
      // It does not arrive as a boolean from the frontend
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;  // If already boolean, keep it
    })
    .isBoolean().withMessage('My view must be a boolean')
];

const validateId = [
  param('id')
    .isInt().withMessage('Invalid document ID')
];

const validateVersionId = [
  param('versionId')
    .isInt().withMessage('Invalid version ID')
];

const validateDocumentUpdate = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 500 }).withMessage('Name must be between 2 and 500 characters'),

  body('process_id')
    .optional()
    .isInt().withMessage('Process ID must be an integer'),

  body('department_id')
    .optional()
    .isInt().withMessage('Department ID must be an integer'),

  body('document_type_id')
    .optional()
    .isInt().withMessage('Document type ID must be an integer'),

  // Version fields
  body('assigned_approver_id')
    .optional()
    .isInt().withMessage('Assigned approver ID must be an integer'),

  body('change_notes')
    .optional()
    .trim()
    .notEmpty().withMessage('Change notes cannot be empty')
];

const validateRejectReason = [
  body('rejection_reason')
    .notEmpty().withMessage('Reject reason is required')
    .trim()
];

const validateNewVersionUpload = [
  body('change_notes')
    .notEmpty().withMessage('Change notes are required')
    .trim(),

  body('assigned_approver_id')
    .notEmpty().withMessage('Assigned approver is required')
    .isInt().withMessage('Assigned approver ID must be an integer'),
];

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/documents
 * Get all documents for the company
 * Query params: 
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - search: Search in code and name
 * - status: Single status or array ['draft', 'pending_approval']
 * - document_type_id: Filter by type
 * - process_id: Filter by process
 * - department_id: Filter by department
 * - created_by: Filter by creator (for "my documents")
 * - my_view: Filter by documents created or assigned to the user
 * Accessible by: All authenticated users
 */
router.get(
  '/',
  authenticate,
  validateDocumentQuery,
  validate,
  getAllDocuments
);

/**
 * GET /api/documents/:id
 * Get a single document by ID with all versions
 * Accessible by: All authenticated users
 */
router.get(
  '/:id',
  authenticate,
  validateId,
  validate,
  getDocumentById
);

/**
 * POST /api/documents
 * Create a new document with file upload
 * Body: multipart/form-data
 *   - file (required)
 *   - name (required)
 *   - document_type_id (required)
 *   - process_id (required)
 *   - department_id (required)
 *   - assigned_approver_id (required)
 *   - change_notes (required)
 * 
 * Accessible by: All authenticated users
 */
router.post(
  '/',
  authenticate,
  upload.single('file'),           // Multer processes file upload
  handleUploadError,               // Handle multer errors
  validateDocumentCreate,
  validate,
  createDocument
);

/**
 * GET /api/documents/:id/versions/:versionId/download
 * Get a pre-signed URL to download a document version
 * Accessible by: All authenticated users
 */
router.get(
  '/:id/versions/:versionId/download',
  authenticate,
  validateId,
  validateVersionId,
  validate,
  downloadDocument
);

/**
 * PUT /api/documents/:id/versions/:versionId
 * Update document (name, department, process, document type) and version metadata (assigned approver, change notes)
 * Accessible by: Quality Manager only and creator when document on draft status
 */
router.put(
  '/:id/versions/:versionId',
  authenticate,  // The authorization is in the controller because is user based
  validateId,
  validateVersionId,
  validateDocumentUpdate,
  validate,
  updateDocument
);

/**
 * Update version file
 * PUT /api/documents/:id/versions/:versionId/file
 * 
 * Replace file only - no metadata changes
 * Accessible by: Quality Manager only and creator when document on draft status
 */
router.put(
  '/:id/versions/:versionId/file',
  authenticate,  // The authorization is in the controller because is user based
  upload.single('file'),    // Multer processes file upload
  handleUploadError,    // Handle multer errors
  validateId,
  validateVersionId,
  validate,
  updateVersionFile
);

/**
 * PUT /api/documents/:id/submit-approval
 * Submit document for approval (draft → pending_approval)
 * Accessible by: The creator of the draft or QM
 */
router.put(
  '/:id/submit-approval',
  authenticate,  // The authorization is in the controller because is user based
  validateId,
  validate,
  submitForApproval
);

/**
 * PUT /api/documents/:id/approve
 * Approve document (pending_approval → approved)
 * Accessible by: The assigned approver that must be Process Owner or QM
 */
router.put(
  '/:id/approve',
  authenticate,  // The authorization is in the controller because is user based
  validateId,
  validate,
  approveDocument
);

/**
 * PUT /api/documents/:id/reject
 * Reject document (pending_approval → draft)
 * Accessible by: The assigned approver that must be Process Owner or QM
 */
router.put(
  '/:id/reject',
  authenticate,  // The authorization is in the controller because is user based
  validateId,
  validateRejectReason,
  validate,
  rejectDocument
);

/**
 * DELETE /api/documents/:documentId/versions/:versionId
 * Delete a draft version
 * Accessible by: Version creator or Quality Manager
 * 
 */
router.delete(
  '/:id/versions/:versionId',
  authenticate,
  // The authorization check is in the controller because it is also based in the user ID not just the role
  validateId,
  validateVersionId,
  validate,
  deleteDraftVersion
);

/**
 * POST /api/documents/:id/versions
 * Upload a new version of an existing document
 * Body: multipart/form-data (file, change_notes, assigned_approver_id)
 * Accessible by: All authenticated users
 */
router.post(
  '/:id/versions',
  authenticate,
  upload.single('file'),  // Multer processes file upload
  handleUploadError,   // Handle multer errors
  validateId,
  validateNewVersionUpload,
  validate,
  createNewVersion
);

/**
 * PUT /api/documents/:id/obsolete
 * Mark document as obsolete
 * Accessible by: Quality Manager only
 */
router.put(
  '/:id/obsolete',
  authenticate,
  authorize(['quality_manager']),
  validateId,
  validate,
  makeObsolete
);

module.exports = router;