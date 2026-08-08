// Import Express and create a router
const express = require('express');

// `mergeParams: true` Because the route is *nested* (:auditId param needs to be accessible in finding routes) 
const router = express.Router({ mergeParams: true });

// Import controllers
const {
  getAllFindings,
  getFindingById,
  createFinding,
  deleteFinding,
  editFinding,
  closeFinding
} = require('../controllers/auditFindingController');

// Import middleware
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Import validation
const { body, param, query } = require('express-validator');

// Import nested routes
const correctiveActionRoutes = require('./correctiveActionRoutes');

// ============================================
// VALIDATION RULES
// ============================================

const validateFindingCreate = [
  body('severity')
    .notEmpty().withMessage('Severity is required')
    .isIn(['major_nonconformity', 'minor_nonconformity', 'opportunity']).withMessage('Invalid severity'),
  
  body('requirement_id')
    .notEmpty().withMessage('Standard requirement is required')
    .isInt().withMessage('Requirement ID must be an integer'),
  
  body('process_id')
    .notEmpty().withMessage('Process is required')
    .isInt().withMessage('Process ID must be an integer'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters')
];

const validateFindingEdit = [
  body('severity')
    .notEmpty().withMessage('Severity is required')
    .isIn(['major_nonconformity', 'minor_nonconformity', 'opportunity']).withMessage('Invalid severity'),
  
  body('requirement_id')
    .notEmpty().withMessage('Standard requirement is required')
    .isInt().withMessage('Requirement ID must be an integer'),
  
  body('process_id')
    .notEmpty().withMessage('Process is required')
    .isInt().withMessage('Process ID must be an integer'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters')
];

const validateFindingQuery = [
  query('status')
    .optional()
    .isIn(['open', 'in_progress', 'pending_verification', 'closed']).withMessage('Invalid status'),
  
  query('severity')
    .optional()
    .isIn(['major_nonconformity', 'minor_nonconformity', 'opportunity']).withMessage('Invalid severity')
];

const validateAuditId = [
  param('auditId')
    .isInt().withMessage('Invalid audit ID')
];

const validateFindingId = [
  param('findingId')
    .isInt().withMessage('Invalid finding ID')
];

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/audits/:auditId/findings
 * Get all findings for an audit
 * Query params: status, severity
 * Accessible by: All authenticated users
 */
router.get(
  '/',
  authenticate,
  validateAuditId,
  validateFindingQuery,
  validate,  // Single validate
  getAllFindings
);

/**
 * GET /api/audits/:auditId/findings/:findingId
 * Get a single finding by ID
 * Accessible by: All authenticated users
 */
router.get(
  '/:findingId',
  authenticate,
  validateAuditId,
  validateFindingId,
  validate,  // Single validate
  getFindingById
);

/**
 * POST /api/audits/:auditId/findings
 * Create a new finding
 * Body: { severity, requirement_id, process_id, description }
 * Accessible by: QM, Lead Auditor, Auditor (checked in controller)
 */
router.post(
  '/',
  authenticate,
  validateAuditId,
  validateFindingCreate,
  validate,   // Single validate call for ALL rules
  createFinding
);

/**
 * DELETE /api/audits/:auditId/findings/:findingId
 * Delete a finding  
 * - Accessible by: QM, Lead Auditor, Auditor (checked in controller)
 * - Only 'open' findings can be deleted
 * - Deletes all associated corrective actions
 */
// Delete finding
router.delete(
  '/:findingId',
  authenticate,
  validateAuditId,
  validateFindingId,
  validate,
  deleteFinding
);

/**
 * PUT /api/audits/:auditId/findings/:findingId/close
 * Close a finding (after all CAs 'completed')
 * QM, Lead Auditor, Auditor can close (checked in controller)
 */
router.put(
  '/:findingId/close',
  authenticate,
  validateAuditId,
  validateFindingId,
  validate,
  closeFinding
);

/**
 * PUT /api/audits/:auditId/findings/:findingId
 * Edit a finding
 * Body: { severity, requirement_id, process_id, description }
 * 
 * BUSINESS RULES:
 * - Accessible by: QM, Lead Auditor, Auditor
 * - Only 'open' findings can be edited
 */
router.put(
  '/:findingId',
  authenticate,
  validateAuditId,
  validateFindingId,
  validateFindingEdit,
  validate,
  editFinding
);

// Mount nested corrective action routes
// This creates /api/audits/:auditId/findings/:findingId/corrective-actions
router.use('/:findingId/corrective-actions', correctiveActionRoutes);

module.exports = router;