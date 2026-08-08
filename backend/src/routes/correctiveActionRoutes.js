// Import Express and create a router
const express = require('express');
const router = express.Router({ mergeParams: true }); // ← Important for nested routes

// Import controllers
const {
  getAllCorrectiveActions,
  createCorrectiveAction,
  deleteCorrectiveAction,
  rejectCorrectiveAction,
  editCorrectiveAction,
  approveCorrectiveAction,
  implementCorrectiveAction,
  verifyCorrectiveAction
} = require('../controllers/correctiveActionController');

// Import middleware
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Import validation
const { body, param } = require('express-validator');

// ============================================
// VALIDATION RULES
// ============================================

const validateCorrectiveActionCreate = [
  body('proposed_action')
    .trim()
    .notEmpty().withMessage('Proposed action is required')
    .isLength({ min: 10 }).withMessage('Proposed action must be at least 10 characters'),
  
  body('root_cause_analysis')
    .optional()
    .trim(),
  
  body('responsible_user_id')
    .notEmpty().withMessage('Responsible user is required')
    .isInt().withMessage('Responsible user ID must be an integer'),
  
  body('expected_completion_date')
    .notEmpty().withMessage('Expected completion date is required')
    .isISO8601().withMessage('Expected completion date must be a valid date')
];

const validateRejectionReason = [
  body('rejection_reason')
    .trim()
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 10 }).withMessage('Rejection reason must be at least 10 characters')
];

const validateCorrectiveActionEdit = [
  body('proposed_action')
    .optional()
    .trim()
    .notEmpty().withMessage('Proposed action is required')
    .isLength({ min: 10 }).withMessage('Proposed action must be at least 10 characters'),
  
  body('root_cause_analysis')
    .optional()
    .trim(),
  
  body('responsible_user_id')
    .optional()
    .notEmpty().withMessage('Responsible user is required')
    .isInt().withMessage('Responsible user ID must be an integer'),
  
  body('expected_completion_date')
    .optional()
    .notEmpty().withMessage('Expected completion date is required')
    .isISO8601().withMessage('Expected completion date must be a valid date')
];

const validateImplementationEvidence = [
  body('implementation_evidence')
    .trim()
    .notEmpty().withMessage('Implementation evidence is required')
    .isLength({ min: 10 }).withMessage('Implementation evidence must be at least 10 characters')
];

const validateCorrectiveActionVerification = [
  body('decision')
    .notEmpty().withMessage('Decision is required')
    .isIn(['approved', 'rejected']).withMessage('Decision must be either "approved" or "rejected"'),

  body('rejection_reason')
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage('Rejection reason must be at least 10 characters')
];

const validateAuditId = [
  param('auditId')
    .isInt().withMessage('Invalid audit ID')
];

const validateFindingId = [
  param('findingId')
    .isInt().withMessage('Invalid finding ID')
];

const validateActionId = [
  param('actionId')
    .isInt().withMessage('Invalid corrective action ID')
];

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/audits/:auditId/findings/:findingId/corrective-actions
 * Get all corrective actions for a finding
 * Accessible by: All authenticated users
 */
router.get(
  '/',
  authenticate,
  validateAuditId,
  validateFindingId,
  validate,
  getAllCorrectiveActions
);

/**
 * POST /api/audits/:auditId/findings/:findingId/corrective-actions
 * Create a corrective action
 * Body: { proposed_action, root_cause_analysis, responsible_user_id, expected_completion_date }
 * Accessible by: Quality Manager or auditee (checked in controller)
 */
router.post(
  '/',
  authenticate,
  validateAuditId,
  validateFindingId,
  validateCorrectiveActionCreate,
  validate,
  createCorrectiveAction
);

/**
 * DELETE /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId
 * Delete a corrective action
 * Accessible by: Quality Manager or auditee (checked in controller)
 */
router.delete(
  '/:actionId',
  authenticate,
  validateAuditId,
  validateFindingId,
  validateActionId,
  validate,
  deleteCorrectiveAction
);

/**
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/reject
 * Reject a proposed corrective action
 * Body: { rejection_reason }
 * Accessible by: QM, Lead Auditor, Auditor (checked in controller)
 */
router.put(
  '/:actionId/reject',
  authenticate,
  validateAuditId,
  validateFindingId,
  validateActionId,
  validateRejectionReason,
  validate,
  rejectCorrectiveAction
);

/**
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/approve
 * Approve a corrective action
 * Accessible by: Auditors (checked in controller)
 */
router.put(
  '/:actionId/approve',
  authenticate,
  validateAuditId,
  validateFindingId,
  validateActionId,
  validate,
  approveCorrectiveAction
);


/**
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/implement
 * Implement corrective action (add evidence and send to verification)
 * Body: { implementation_evidence }
 * Accessible by: Quality Manager or auditee (checked in controller)
 */
router.put(
  '/:actionId/implement',
  authenticate,
  validateAuditId,
  validateFindingId,
  validateActionId,
  validateImplementationEvidence,
  validate,
  implementCorrectiveAction
);

/**
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/verify
 * Verify corrective action effectiveness
 * Body: { decision, rejection_reason }
 * Accessible by: Auditors (checked in controller)
 */
router.put(
  '/:actionId/verify',
  authenticate,
  validateAuditId,
  validateFindingId,
  validateActionId,
  validateCorrectiveActionVerification,
  validate,
  verifyCorrectiveAction
);

/**
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId
 * Edit a corrective action
 * Body: { proposed_action, root_cause_analysis, responsible_user_id, expected_completion_date }
 * Accessible by: QM amd auditee (checked in controller)
 */
router.put(
  '/:actionId',
  authenticate,
  validateAuditId,
  validateFindingId,
  validateActionId,
  validateCorrectiveActionEdit,
  validate,
  editCorrectiveAction
);

module.exports = router;