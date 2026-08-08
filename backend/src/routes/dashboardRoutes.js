// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import middleware
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Import controllers
const {
  getDashboardStats,
  getDocumentStats,
  getUpcomingAudits
} = require('../controllers/dashboardController');

// ============================================
// MIDDLEWARE
// ============================================

// All dashboard routes require authentication
router.use(authenticate);

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics (my tasks, open findings, my audits)
 * Accessible by: All authenticated users
 */
router.get('/stats', getDashboardStats);

/**
 * GET /api/dashboard/documents/stats
 * Get document status distribution for current user
 * Returns count by status (draft, pending, approved, obsolete)
 * Accessible by: All authenticated users
 */
router.get('/documents/stats', getDocumentStats);

/**
 * GET /api/dashboard/audits/upcoming
 * Get upcoming audits (next 5 where user is team member)
 * Sorted by scheduled end date (soonest first)
 * Accessible by: All authenticated users
 */
router.get('/audits/upcoming', getUpcomingAudits);

module.exports = router;