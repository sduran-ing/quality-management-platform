/**
 * =============================================================================
 * USER CONTROLLER
 * =============================================================================
 * 
 * Handles user-related operations.
 */

// Import models
const { User, Department, Process } = require('../models');
const { hashPassword } = require('../utils/authUtils');
const sequelize = require('../config/database');

// ============================================
// GET ALL USERS
// ============================================

/**
 * Get all users for the authenticated user's company
 * GET /api/users
 * Query params: role, departmentId, isActive
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, departmentId, isActive } = req.query;

    // Build where clause
    const whereClause = {
      company_id: req.user.companyId
    };

    // Apply filters if provided
    if (role) whereClause.role = role;
    if (departmentId) whereClause.department_id = departmentId;
    if (isActive !== undefined) whereClause.is_active = isActive === 'true';

    const users = await User.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: Process,
          as: 'assignedProcesses',
          attributes: ['id', 'name', 'acronym'],
          through: { attributes: [] }
        }
      ],
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        total: users.length
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE USER
// ============================================

/**
 * Get a single user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: {
        id,
        company_id: req.user.companyId,
        is_active: true
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: Department,
          as: 'managedDepartment',
          attributes: ['id', 'name']
        },
        {
          model: Process,
          as: 'ownedProcesses',
          attributes: ['id', 'name', 'acronym']
        },
        {
          model: Process,
          as: 'assignedProcesses',
          attributes: ['id', 'name', 'acronym'],
          through: { attributes: [] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message
    });
  }
};

// ============================================
// CREATE USER
// ============================================

/**
 * Create a new user (employee or process owner)
 * POST /api/users
 * Body: { email, password, firstName, lastName, role, departmentId }
 * Only Quality Manager can create users
 */
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, departmentId } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, last name, and role are required'
      });
    }

    // Validate role
    const validRoles = ['quality_manager', 'process_owner', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // If departmentId provided, verify it exists and belongs to company
    if (departmentId) {
      const department = await Department.findOne({
        where: {
          id: departmentId,
          company_id: req.user.companyId,
          is_active: true
        }
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found or does not belong to your company'
        });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      company_id: req.user.companyId,
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      role,
      department_id: departmentId || null,
      is_active: true
    });

    // Reload with associations
    await user.reload({
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// ============================================
// UPDATE USER
// ============================================

/**
 * Update user details
 * PUT /api/users/:id
 * Body: { firstName, lastName, role, departmentId }
 * Only Quality Manager can update users
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, departmentId } = req.body;

    // Find user
    const user = await User.findOne({
      where: {
        id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent changing role of the first Quality Manager (yourself)
    if (user.id === req.user.id && role && role !== 'quality_manager') {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['quality_manager', 'process_owner', 'employee'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      user.role = role;
    }

    // If departmentId provided, verify it exists
    if (departmentId !== undefined) {
      if (departmentId === null) {
        // Allow removing department assignment
        user.department_id = null;
      } else {
        const department = await Department.findOne({
          where: {
            id: departmentId,
            company_id: req.user.companyId,
            is_active: true
          }
        });

        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
        user.department_id = departmentId;
      }
    }

    // Update basic fields
    if (firstName) user.first_name = firstName;
    if (lastName) user.last_name = lastName;

    await user.save();

    // Reload with associations
    await user.reload({
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// ============================================
// DEACTIVATE USER (Soft Delete)
// ============================================

/**
 * Deactivate a user (soft delete)
 * DELETE /api/users/:id
 * Only Quality Manager can deactivate users
 */
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findOne({
      where: {
        id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Check if user is a process owner
    const ownedProcesses = await Process.count({
      where: {
        process_owner_id: id,
        is_active: true
      }
    });

    if (ownedProcesses > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate user. They own ${ownedProcesses} active process(es). Please reassign process ownership first.`
      });
    }

    // Check if user is a department head
    const managedDepartment = await Department.findOne({
      where: {
        department_head_id: id,
        is_active: true
      }
    });

    if (managedDepartment) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate user. They are head of "${managedDepartment.name}" department. Please reassign department head first.`
      });
    }

    // Deactivate user
    user.is_active = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
};

// ============================================
// CHANGE OWN PASSWORD
// ============================================

/**
 * Change own password (authenticated user)
 * PUT /api/users/me/change-password
 * Body: { currentPassword, newPassword }
 * Accessible by: Any authenticated user
 */
const changeOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Prevent using same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Get user with password (use withPassword scope)
    const user = await User.scope('withPassword').findOne({
      where: {
        id: req.user.id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const { comparePassword } = require('../utils/authUtils');
    const isPasswordValid = await comparePassword(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    user.password_hash = newPasswordHash;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// ============================================
// RESET USER PASSWORD (Admin)
// ============================================

/**
 * Reset another user's password (admin function)
 * PUT /api/users/:id/reset-password
 * Body: { newPassword }
 * Accessible by: Quality Manager only
 */
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Validation
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find user
    const user = await User.findOne({
      where: {
        id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    user.password_hash = newPasswordHash;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${user.first_name} ${user.last_name}`
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};

/**
 * ============================================================================
 * GET APPROVERS LIST
 * ============================================================================
 * 
 * Returns list of users who can approve documents.
 * 
 * Only Quality Managers and Process Owners can approve
 * Populate "Assign Approver" dropdown in create document form
 * 
 * ROUTE: GET /api/users/approvers
 */
const getApprovers = async (req, res) => {
  console.log('\n GET APPROVERS CALLED');
  console.log('User:', req.user.id, req.user.role);
  console.log('Company:', req.user.companyId);
  try {
    // 1. Find all possible APPROVERS
    const approvers = await User.findAll({
      where: {
        company_id: req.user.companyId,  // Same company as current user
        role: ['quality_manager', 'process_owner'],  // Role is quality_manager OR process_owner
        is_active: true  // The user has to be active
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ],
      attributes: [
        'id',
        'first_name',
        'last_name',
        'email',
        'role',
        'department_id'
      ],
      order: [
        // Quality Managers first, then Process Owners
        [sequelize.literal(`
          CASE role
            WHEN 'quality_manager' THEN 1
            WHEN 'process_owner' THEN 2
          END
        `), 'ASC'],
        ['first_name', 'ASC']
      ]
    });

    // Console info message
    console.log('Found approvers:', approvers.length);

    // Transform for Frontend
    const formattedApprovers = approvers.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
      displayName: `${user.first_name} ${user.last_name} (${
        user.role === 'quality_manager' ? 'Quality Manager' : 'Process Owner'
      })`,
      department: user.department
    }));

    res.status(200).json({
      success: true,
      message: 'Approvers retrieved successfully',
      data: {
        approvers: formattedApprovers,
        total: formattedApprovers.length
      }
    });

  } catch (error) {
    // Console info message
    console.error('Get approvers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve approvers',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  changeOwnPassword,
  resetUserPassword,
  getApprovers
};