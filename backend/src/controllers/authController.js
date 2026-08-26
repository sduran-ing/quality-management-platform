// Import models
// This ensures the associations are loaded from the main "models" folder, instead of each model .js
const { User, Company } = require('../models');

// Import utilities
const { hashPassword, comparePassword, generateToken } = require('../utils/authUtils');

// Import Sequelize for transactions
const sequelize = require('../config/database');

// ============================================
// REGISTER - Create new company and first user
// ============================================

/**
 * Register a new demo user in the shared demo company
 * POST /api/auth/register
 * Body: { email, password, firstName, lastName }
 * 
 * DEMO MODE:
 * - All users join "QMS Demo Company"
 * - All users get "process_owner" role
 * - Shared environment for portfolio showcase
 */
const register = async (req, res) => {
  // Start a database transaction
  const transaction = await sequelize.transaction();

  try {
    // Extract data from request body
    const { email, password, first_name, last_name } = req.body;

    // ============================================
    // VALIDATION
    // ============================================

    // Check if all required fields are provided
    if (!email || !password || !first_name || !last_name) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'All fields are required: email, password, first_name, last_name'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // ============================================
    // GET OR CREATE DEMO COMPANY
    // ============================================

    const DEMO_COMPANY_NAME = 'Emerald Software Inc';

    // Try to find existing demo company
    let company = await Company.findOne({
      where: { name: DEMO_COMPANY_NAME }
    });

    // If demo company doesn't exist, create it
    if (!company) {
      company = await Company.create({
        name: DEMO_COMPANY_NAME,
      }, { transaction });

      console.log('Created demo company:', company.id);
    }

    // ============================================
    // CREATE USER AS QM
    // ============================================

    // Hash the password before storing
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      company_id: company.id,
      email: email.toLowerCase(), // Store email in lowercase
      password_hash: hashedPassword,
      first_name: first_name,
      last_name: last_name,
      role: 'quality_manager', // All demo users are QM
      department_id: null, // Not assigned to specific department
      is_active: true
    }, { transaction });

    // Commit the transaction (save everything to database)
    await transaction.commit();

    // ============================================
    // GENERATE JWT TOKEN
    // ============================================

    const token = await generateToken(user);

    // ============================================
    // SEND RESPONSE
    // ============================================

    // Return user info (password_hash excluded by default scope)
    res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to the QMS Demo!',
      token: token,
      user: { user }
    });

  } catch (error) {
    // If anything fails, rollback the transaction (undo everything)
    await transaction.rollback();

    console.error('Registration error:', error);

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// ============================================
// LOGIN - Authenticate user and return token
// ============================================

/**
 * Login existing user
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  try {
    // Extract data from request body
    const { email, password } = req.body;

    // ============================================
    // VALIDATION
    // ============================================

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // ============================================
    // FIND USER (with password)
    // ============================================

    // Use 'withPassword' scope to include password_hash
    const user = await User.scope('withPassword').findOne({
      where: {
        email: email.toLowerCase(),
        is_active: true // Only active users can login
      },
      include: [{
        model: Company,
        as: 'company', // We'll define this association later
        attributes: ['id', 'name', 'logo_url']
      }]
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ============================================
    // VERIFY PASSWORD
    // ============================================

    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ============================================
    // GENERATE JWT TOKEN
    // ============================================

    const token = await generateToken(user);

    // ============================================
    // SEND RESPONSE
    // ============================================

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      user: user
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// ============================================
// GET CURRENT USER - 
// ============================================

/**
 * Verify current authenticated user
 * GET /api/auth/me
 * Requires: Authentication (JWT token) 
 *
 * PURPOSE:
 * - Verify token is still valid
 * - Return current user data
 * - Used by frontend to check auth on page load
 */
const getCurrentUser = async (req, res) => {
  try {
    /**
     * req.user comes from authenticate middleware
     * 
     * Middleware already:
     * 1. Verified JWT token
     * 2. Loaded user from database
     * 3. Attached to req.user
     * 
     */
    const user = req.user;

    // If user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get company name (user object from middleware might not include it)
    const userWithCompany = await User.findByPk(user.id, {
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name']
        }
      ]
    });

    // Return user data (matching frontend User interface)
    res.status(200).json({
      success: true,
      user: userWithCompany
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      error: error.message
    });
  }
};

// Export controller functions
module.exports = {
  register,
  login,
  getCurrentUser
};