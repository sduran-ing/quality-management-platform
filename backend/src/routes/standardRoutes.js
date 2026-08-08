// Import Express and create a router
const express = require('express');
const router = express.Router();
// Import controllers

const { 
    getAllStandards 
} = require('../controllers/standardController');

// Import middleware
const { authenticate } = require('../middleware/authMiddleware');


// =============================================================================
// STANDARD ROUTES
// =============================================================================

/**
 * GET /api/standards
 * Get all standards
 * Accessible by: All authenticated users
 */
router.get(
  '/',
  authenticate,
  getAllStandards
);

module.exports = router;