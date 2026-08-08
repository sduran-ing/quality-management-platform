// Import models
const { Standard } = require('../models');

// Import Sequelize for transactions
const sequelize = require('../config/database');

/**
 * Get all standards
 * GET /api/standards
 * 
 * Returns all standards available in the system
 * No company filtering, standards are system-wide
 */
const getAllStandards = async (req, res) => {
  try {
    const standards = await Standard.findAll({
      attributes: ['id', 'name', 'version', 'description'],
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      message: 'Standards retrieved successfully',
      data: { standards }
    });

  } catch (error) {
    console.error('Get all standards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve standards',
      error: error.message
    });
  }
};

module.exports = {
  getAllStandards
};