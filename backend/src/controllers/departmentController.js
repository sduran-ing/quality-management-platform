// Import models
const { Department, User } = require('../models');

// ============================================
// GET ALL DEPARTMENTS
// ============================================

/**
 * Get all departments for the authenticated user's company
 * GET /api/departments
 */
const getAllDepartments = async (req, res) => {
  try {
    // req.user.companyId comes from authenticate middleware
    const departments = await Department.findAll({
      where: {
        company_id: req.user.companyId,
        is_active: true // Only active departments
      },
      include: [
        {
          model: User,
          as: 'departmentHead',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        }
      ],
      order: [['name', 'ASC']] // Alphabetical order
    });

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: {
        departments,
        total: departments.length
      }
    });

  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments',
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE DEPARTMENT
// ============================================

/**
 * Get a single department by ID
 * GET /api/departments/:id
 */
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findOne({
      where: {
        id,
        company_id: req.user.companyId, // Multi-tenancy check
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'departmentHead',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role']
        }
      ]
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully',
      data: { department }
    });

  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department',
      error: error.message
    });
  }
};

// ============================================
// CREATE DEPARTMENT
// ============================================

/**
 * Create a new department
 * POST /api/departments
 * Body: { name, description }
 * Only Quality Manager can create departments
 */
const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    // Check if department name already exists in this company
    const existingDepartment = await Department.findOne({
      where: {
        company_id: req.user.companyId,
        name: name.trim(),
        is_active: true
      }
    });

    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Department with this name already exists'
      });
    }

    // Create department
    const department = await Department.create({
      company_id: req.user.companyId,
      name: name.trim(),
      description: description ? description.trim() : null,
      department_head_id: null // Will be assigned later
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { department }
    });

  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: error.message
    });
  }
};

// ============================================
// UPDATE DEPARTMENT
// ============================================

/**
 * Update department details
 * PUT /api/departments/:id
 * Body: { name, description }
 * Only Quality Manager can update departments
 */
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Find department
    const department = await Department.findOne({
      where: {
        id,
        company_id: req.user.companyId, // Multi-tenancy check
        is_active: true
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // If name is being changed, check for duplicates
    if (name && name.trim() !== department.name) {
      const existingDepartment = await Department.findOne({
        where: {
          company_id: req.user.companyId,
          name: name.trim(),
          is_active: true,
          id: { [require('sequelize').Op.ne]: id } // Exclude current department
        }
      });

      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          message: 'Department with this name already exists'
        });
      }
    }

    // Update department
    if (name) department.name = name.trim();
    if (description !== undefined) department.description = description ? description.trim() : null;

    await department.save();

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: { department }
    });

  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: error.message
    });
  }
};

// ============================================
// DELETE DEPARTMENT (Soft Delete)
// ============================================

/**
 * Soft delete a department
 * DELETE /api/departments/:id
 * Only Quality Manager can delete departments
 */
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Find department
    const department = await Department.findOne({
      where: {
        id,
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

    // Check if department has members
    const memberCount = await User.count({
      where: {
        department_id: id,
        is_active: true
      }
    });

    if (memberCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. It has ${memberCount} active member(s). Please reassign them first.`
      });
    }

    // Soft delete (set is_active to false)
    department.is_active = false;
    await department.save();

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });

  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
};

// ============================================
// ASSIGN DEPARTMENT HEAD
// ============================================

/**
 * Assign or update department head
 * PUT /api/departments/:id/assign-head
 * Body: { userId }
 * Only Quality Manager can assign department heads
 */
const assignDepartmentHead = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find department
    const department = await Department.findOne({
      where: {
        id,
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

    // Check if user exists and belongs to same company
    const user = await User.findOne({
      where: {
        id: userId,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or does not belong to your company'
      });
    }

    // Check if user is already head of another department
    const existingHeadship = await Department.findOne({
      where: {
        department_head_id: userId,
        company_id: req.user.companyId,
        is_active: true,
        id: { [require('sequelize').Op.ne]: id } // Exclude current department
      }
    });

    if (existingHeadship) {
      return res.status(400).json({
        success: false,
        message: `User is already head of "${existingHeadship.name}" department. A user can only head one department.`
      });
    }

    // Assign department head
    department.department_head_id = userId;
    await department.save();

    // Reload with associations
    await department.reload({
      include: [
        {
          model: User,
          as: 'departmentHead',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Department head assigned successfully',
      data: { department }
    });

  } catch (error) {
    console.error('Assign department head error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign department head',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignDepartmentHead
};