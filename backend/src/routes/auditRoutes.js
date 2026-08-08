// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllAudits,
  getAuditById,
  createAudit,
  editAudit,
  startAudit,
  completeAudit,
  cancelAudit,
  getAuditStatistics,
  getAuditTeamMembers,
  getAuditStandards,
  getAuditProcesses
} = require('../controllers/auditController');

// Import middleware
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Import validation
const { body, param, query } = require('express-validator');

// Import nested routes
const auditFindingRoutes = require('./auditFindingRoutes');

// ============================================
// VALIDATION RULES
// ============================================

const validateAuditCreate = [
  body('title')
    .trim()
    .notEmpty().withMessage('Audit title is required')
    .isLength({ min: 5, max: 500 }).withMessage('Title must be between 5 and 500 characters'),
  
  body('audit_type')
    .notEmpty().withMessage('Audit type is required')
    .isIn(['internal', 'external', 'certification', 'surveillance']).withMessage('Invalid audit type'),
  
  body('start_date')
    .notEmpty().withMessage('Start date is required')
    .isDate().withMessage('Start date must be a valid date'),
  
  body('end_date')
    .notEmpty().withMessage('End date is required')
    .isDate().withMessage('End date must be a valid date'),
  
  body('description')
    .notEmpty().withMessage('Description is required')
    .trim(),
  
  body('process_ids')
    .notEmpty().withMessage('You must select at least 1 process')
    .isArray().withMessage('Process IDs must be an array'),
  
  body('standard_ids')
    .notEmpty().withMessage('You must select at least 1 standard')
    .isArray().withMessage('Standard IDs must be an array'),
  
  body('team_members')
    .notEmpty().withMessage('You must select at least 2 members')
    .isArray().withMessage('Team members must be an array')
    .custom((value) => {
      if (value && Array.isArray(value)) {
        // VALIDATION 1: Check each member has user_id and role
        for (const member of value) {
          if (!member.user_id || !member.role) {
            throw new Error('Each team member must have user_id and role');
          }
          if (!['lead_auditor', 'auditor', 'auditee'].includes(member.role)) {
            throw new Error('Invalid team member role');
          }
        }

        // VALIDATION 2: Check at least one lead auditor
        const hasLeadAuditor = value.some(m => m.role === 'lead_auditor');
        if (!hasLeadAuditor) {
          throw new Error('At least one lead auditor is required');
        }

        // VALIDATION 3: Check at least one auditee
        const hasAuditee = value.some(m => m.role === 'auditee');
        if (!hasAuditee) {
          throw new Error('At least one auditee is required');
        }

        // VALIDATION 4: Check for duplicate users (no user assigned twice)
        const userIds = value.map(m => m.user_id);
        const uniqueUserIds = new Set(userIds);
        if (userIds.length !== uniqueUserIds.size) {
          throw new Error('Each user can only be assigned one role in the audit');
        }
      }
      return true;
    })
];

const validateAuditEdit = [
  body('title')
    .trim()
    .notEmpty().withMessage('Audit title is required')
    .isLength({ min: 5, max: 500 }).withMessage('Title must be between 5 and 500 characters'),
  
  body('audit_type')
    .notEmpty().withMessage('Audit type is required')
    .isIn(['internal', 'external', 'certification', 'surveillance']).withMessage('Invalid audit type'),
  
  body('start_date')
    .notEmpty().withMessage('Start date is required')
    .isDate().withMessage('Start date must be a valid date'),
  
  body('end_date')
    .notEmpty().withMessage('End date is required')
    .isDate().withMessage('End date must be a valid date'),
  
  body('description')
    .notEmpty().withMessage('Description is required')
    .trim(),
  
  body('process_ids')
    .notEmpty().withMessage('You must select at least 1 process')
    .isArray().withMessage('Process IDs must be an array'),
  
  body('standard_ids')
    .notEmpty().withMessage('You must select at least 1 standard')
    .isArray().withMessage('Standard IDs must be an array'),
  
  body('team_members')
    .notEmpty().withMessage('You must select at least 2 members')
    .isArray().withMessage('Team members must be an array')
    .custom((value) => {
      if (value && Array.isArray(value)) {
        // VALIDATION 1: Check each member has user_id and role
        for (const member of value) {
          if (!member.user_id || !member.role) {
            throw new Error('Each team member must have user_id and role');
          }
          if (!['lead_auditor', 'auditor', 'auditee'].includes(member.role)) {
            throw new Error('Invalid team member role');
          }
        }

        // VALIDATION 2: Check at least one lead auditor
        const hasLeadAuditor = value.some(m => m.role === 'lead_auditor');
        if (!hasLeadAuditor) {
          throw new Error('At least one lead auditor is required');
        }

        // VALIDATION 3: Check at least one auditee
        const hasAuditee = value.some(m => m.role === 'auditee');
        if (!hasAuditee) {
          throw new Error('At least one auditee is required');
        }

        // VALIDATION 4: Check for duplicate users (no user assigned twice)
        const userIds = value.map(m => m.user_id);
        const uniqueUserIds = new Set(userIds);
        if (userIds.length !== uniqueUserIds.size) {
          throw new Error('Each user can only be assigned one role in the audit');
        }
      }
      return true;
    })
];

const validateAuditQuery = [
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
    .isLength({ max: 255 }).withMessage('Search query too long'),
  
  query('status')
    .optional()
    .custom((value) => {
      const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
      if (Array.isArray(value)) {
        return value.every(s => validStatuses.includes(s));
      }
      return validStatuses.includes(value);
    }).withMessage('Invalid status'),
  
  // Audit type (can be single or array)
  query('audit_type')
    .optional()
    .custom((value) => {
      const validTypes = ['internal', 'external', 'certification', 'surveillance'];
      if (Array.isArray(value)) {
        return value.every(t => validTypes.includes(t));
      }
      return validTypes.includes(value);
    }).withMessage('Invalid audit type'),
  
  // Filters
  query('process_id')
    .optional()
    .isInt().withMessage('Process ID must be an integer'),
    
  // Role filter
  query('my_role')
    .optional()
    .isIn(['lead_auditor', 'auditor', 'auditee']).withMessage('Invalid role'),
  
  // My View - Convert string to boolean
  query('my_view')
    .optional()
    .customSanitizer(value => {
      // Convert string 'true'/'false' to boolean
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    })
    .isBoolean().withMessage('My view must be a boolean')
];

const validateAuditId = [
  param('auditId')
    .isInt().withMessage('Invalid audit ID')
];

// ============================================
// ROUTES
// ============================================

// GET /api/audits/:auditId/team-members
// Get audit team members (for dropdowns)
router.get(
  '/:auditId/team-members',
  authenticate,
  validateAuditId,
  validate,
  getAuditTeamMembers
);

/**
 * GET /api/audits/:auditId/standards
 * Returns all standards and their requirements for this audit
 */
router.get(
  '/:auditId/standards',
  authenticate,
  validateAuditId,
  validate,
  getAuditStandards
);

/**
 * GET /api/audits/:auditId/processes
 * Returns all processes for this audit
 */
router.get(
  '/:auditId/processes',
  authenticate,
  validateAuditId,
  validate,
  getAuditProcesses
);

/**
 * GET /api/audits/:auditId/statistics
 * Get audit statistics
 * 
 * Returns counts of findings and corrective actions
 * Used for modals and overview displays
 */
router.get(
  '/:auditId/statistics',
  authenticate,
  validateAuditId,
  validate,
  getAuditStatistics
);

/**
 * GET /api/audits
 * Get all audits for the company with filters and pagination
 * Query params: page, limit, search, status, auditType, processId, departmentId, myRole, myView
 * Accessible by: All authenticated users
 */
router.get(
  '/',
  authenticate,
  validateAuditQuery,
  validate,
  getAllAudits
);

/**
 * GET /api/audits/:auditId
 * Get a single audit by ID with all details
 * Accessible by: All authenticated users
 */
router.get(
  '/:auditId',
  authenticate,
  validateAuditId,
  validate,
  getAuditById
);

/**
 * POST /api/audits
 * Create a new audit
 * Body: {
 *   title, audit_type, start_date, end_date, description,
 *   process_ids: [array],
 *   standard_ids: [array],
 *   team_members: [{ user_id, role }]
 * }
 * Accessible by: Quality Manager or Process Owner
 */
router.post(
  '/',
  authenticate,
  authorize(['quality_manager', 'process_owner']),
  validateAuditCreate,
  validate,
  createAudit
);

/**
 * PUT /api/audits/:auditId/start
 * Start an audit
 * 
 * - QM, Lead Auditor can start an audit
 * - Status change: scheduled to in_progress
 * - Can only start audits with status: 'scheduled'
 */
router.put(
  '/:auditId/start',
  authenticate,
  // Authorization checked in controller (dynamic based on audit)
  validateAuditId,
  validate,
  startAudit
);

/**
 * PUT /api/audits/:auditId/complete
 * Complete an audit
 * 
 * - QM, Lead Auditor can complete an audit
 * - Status change: in_progress to completed
 * - ALL findings must be 'closed'
 * - Records actual_end_date
 * - Can only complete audits with status: 'in_progress'
 */
router.put(
  '/:auditId/complete',
  authenticate,
  // Authorization checked in controller (dynamic based on audit)
  validateAuditId,
  validate,
  completeAudit
);

/**
 * PUT /api/audits/:auditId/cancel
 * Cancel an audit
 * 
 * - QM, Lead Auditor can cancel
 * - Can only cancel audits with status: 'scheduled' OR 'in_progress'
 * - Deletes ALL findings and their corrective actions
 */
router.put(
  '/:auditId/cancel',
  authenticate,
  // Authorization checked in controller (dynamic based on audit)
  validateAuditId,
  validate,
  cancelAudit
);

/**
 * PUT /api/audits/:auditId
 * Edit an audit
 * Body: {
 *   title, audit_type, start_date, end_date, description,
 *   process_ids: [array],
 *   standard_ids: [array],
 *   team_members: [{ user_id, role }]
 * }
 * 
 * - QM, Lead Auditor can edit
 * - Can only edit audits with status: 'scheduled'
 */
router.put(
  '/:auditId',
  authenticate,
  // Authorization checked in controller (dynamic based on audit)
  validateAuditId,
  validateAuditEdit,
  validate,
  editAudit
);

// Mount nested finding routes
// This creates /api/audits/:auditId/findings
router.use('/:auditId/findings', auditFindingRoutes);

module.exports = router;