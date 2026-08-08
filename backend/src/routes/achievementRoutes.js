// Import Express and create a router
const express = require('express');
const router = express.Router();

// Import controllers
const {
  getUserAchievements
} = require('../controllers/achievementController');

// Import middleware
const { authenticate } = require('../middleware/authMiddleware');

/**
 * GET /api/achievements
 * Returns all achievements with user's earned status and progress
 * Accessible by all authenticated users
 */
router.get(
  '/',
  authenticate,
  getUserAchievements
);

module.exports = router;