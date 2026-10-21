// Import Express and create a router
const express = require('express');
const router = express.Router();

const sequelize = require('../config/database');

/**
 * GET /health
 * Used by the keep-alive ping to stop Render from sleeping.
 * It also runs a tiny query so Supabase counts it as activity.
 * Mounted BEFORE auth/rate-limit/caseTransform so nothing blocks it.
 */
router.get('/', async (req, res) => {
  try {
    // "SELECT 1" is the cheapest possible query: it only checks that the DB answers
    await sequelize.query('SELECT 1');

    // Same response shape as the rest of the API: { success, message, data }
    return res.status(200).json({
      success: true,
      message: 'OK',
      data: { uptime: Math.round(process.uptime()) } // seconds since the server started
    });
  } catch (error) {
    // 503 = service unavailable, so a monitor can tell the DB is down
    console.error('Health check failed:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Database unreachable',
      data: null
    });
  }
});

module.exports = router;