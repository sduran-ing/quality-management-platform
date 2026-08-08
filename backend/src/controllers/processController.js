// Import models
const { Process, User, Department } = require('../models');
const sequelize = require('../config/database');

// ============================================
// GET ALL PROCESSES
// ============================================

/**
 * Get all processes for the authenticated user's company
 * GET /api/processes
 */
const getAllProcesses = async (req, res) => {
  try {
    const processes = await Process.findAll({
      where: {
        company_id: req.user.companyId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'processOwner',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Department,
          as: 'departments',
          attributes: ['id', 'name'],
          through: { attributes: [] } // Don't include junction table data
        },
        {
          model: User,
          as: 'assignedUsers',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
          through: { attributes: [] }
        }
      ],
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      message: 'Processes retrieved successfully',
      data: {
        processes,
        total: processes.length
      }
    });

  } catch (error) {
    console.error('Get processes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve processes',
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE PROCESS
// ============================================

/**
 * Get a single process by ID
 * GET /api/processes/:id
 */
const getProcessById = async (req, res) => {
  try {
    const { id } = req.params;

    const process = await Process.findOne({
      where: {
        id,
        company_id: req.user.companyId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'processOwner',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Department,
          as: 'departments',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        },
        {
          model: User,
          as: 'assignedUsers',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
          through: { attributes: [] }
        }
      ]
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Process retrieved successfully',
      data: { process }
    });

  } catch (error) {
    console.error('Get process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve process',
      error: error.message
    });
  }
};

// ============================================
// CREATE PROCESS
// ============================================

/**
 * Create a new process
 * POST /api/processes
 * Body: { name, acronym, description, processOwnerId, departmentIds }
 * Only Quality Manager can create processes
 */
const createProcess = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { name, acronym, description, processOwnerId, departmentIds } = req.body;

    // Validation
    if (!name || !acronym || !processOwnerId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Name, acronym, and process owner ID are required'
      });
    }

    // Convert acronym to uppercase
    const upperAcronym = acronym.toUpperCase();

    // Check if acronym already exists in this company
    const existingProcess = await Process.findOne({
      where: {
        company_id: req.user.companyId,
        acronym: upperAcronym,
        is_active: true
      }
    });

    if (existingProcess) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Process with acronym "${upperAcronym}" already exists`
      });
    }

    // Check if process owner exists and belongs to same company
    const processOwner = await User.findOne({
      where: {
        id: processOwnerId,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!processOwner) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Process owner not found or does not belong to your company'
      });
    }

    // Create process
    const process = await Process.create({
      company_id: req.user.companyId,
      name: name.trim(),
      acronym: upperAcronym,
      description: description ? description.trim() : null,
      process_owner_id: processOwnerId
    }, { transaction });

    // Link process to departments if provided
    if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
      // Verify all departments exist and belong to company
      const departments = await Department.findAll({
        where: {
          id: departmentIds,
          company_id: req.user.companyId,
          is_active: true
        }
      });

      if (departments.length !== departmentIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'One or more department IDs are invalid'
        });
      }

      // Add departments to process
      await process.setDepartments(departments, { transaction });
    }

    await transaction.commit();

    // Reload with associations
    await process.reload({
      include: [
        {
          model: User,
          as: 'processOwner',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Department,
          as: 'departments',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Process created successfully',
      data: { process }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create process',
      error: error.message
    });
  }
};

// ============================================
// UPDATE PROCESS
// ============================================

/**
 * Update process details
 * PUT /api/processes/:id
 * Body: { name, acronym, description, processOwnerId, departmentIds }
 * Only Quality Manager can update processes
 */
const updateProcess = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { name, acronym, description, processOwnerId, departmentIds } = req.body;

    // Find process
    const process = await Process.findOne({
      where: {
        id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!process) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // If acronym is being changed, check for duplicates
    if (acronym) {
      const upperAcronym = acronym.toUpperCase();
      
      if (upperAcronym !== process.acronym) {
        const existingProcess = await Process.findOne({
          where: {
            company_id: req.user.companyId,
            acronym: upperAcronym,
            is_active: true,
            id: { [sequelize.Sequelize.Op.ne]: id }
          }
        });

        if (existingProcess) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Process with acronym "${upperAcronym}" already exists`
          });
        }
        
        process.acronym = upperAcronym;
      }
    }

    // Update basic fields
    if (name) process.name = name.trim();
    if (description !== undefined) process.description = description ? description.trim() : null;

    // Update process owner if provided
    if (processOwnerId) {
      const processOwner = await User.findOne({
        where: {
          id: processOwnerId,
          company_id: req.user.companyId,
          is_active: true
        }
      });

      if (!processOwner) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Process owner not found'
        });
      }

      process.process_owner_id = processOwnerId;
    }

    await process.save({ transaction });

    // Update department associations if provided
    if (departmentIds && Array.isArray(departmentIds)) {
      const departments = await Department.findAll({
        where: {
          id: departmentIds,
          company_id: req.user.companyId,
          is_active: true
        }
      });

      if (departments.length !== departmentIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'One or more department IDs are invalid'
        });
      }

      await process.setDepartments(departments, { transaction });
    }

    await transaction.commit();

    // Reload with associations
    await process.reload({
      include: [
        {
          model: User,
          as: 'processOwner',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Department,
          as: 'departments',
          attributes: ['id', 'name'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Process updated successfully',
      data: { process }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Update process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update process',
      error: error.message
    });
  }
};

// ============================================
// DELETE PROCESS (Soft Delete)
// ============================================

/**
 * Soft delete a process
 * DELETE /api/processes/:id
 * Only Quality Manager can delete processes
 */
const deleteProcess = async (req, res) => {
  try {
    const { id } = req.params;

    const process = await Process.findOne({
      where: {
        id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // Soft delete
    process.is_active = false;
    await process.save();

    res.status(200).json({
      success: true,
      message: 'Process deleted successfully'
    });

  } catch (error) {
    console.error('Delete process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete process',
      error: error.message
    });
  }
};

// ============================================
// ASSIGN USERS TO PROCESS
// ============================================

/**
 * Assign multiple users to a process
 * POST /api/processes/:id/assign-users
 * Body: { userIds: [1, 2, 3] }
 * Quality Manager or Process Owner can assign users
 * REPLACES existing user assignments (not additive)
 */
const assignUsersToProcess = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    // Find process
    const process = await Process.findOne({
      where: {
        id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!process) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }

    // Check authorization: Quality Manager or Process Owner
    if (req.user.role !== 'quality_manager' && process.process_owner_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Process Owner can assign users'
      });
    }

    // Verify all users exist and belong to company
    const users = await User.findAll({
      where: {
        id: userIds,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (users.length !== userIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'One or more user IDs are invalid'
      });
    }

    // Add users to process (this replaces existing assignments)
    // In models/index.js (associations):
    // Process.belongsToMany(User, {
    // through: 'process_users',     // Junction table
    // as: 'assignedUsers',  
    // Sequelize automatically generates 'setAssignedUsers' method according to the alias
    await process.setAssignedUsers(users, { transaction });

    await transaction.commit();

    // Reload with associations
    await process.reload({
      include: [
        {
          model: User,
          as: 'assignedUsers',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
          through: { attributes: [] }
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Users assigned to process successfully',
      data: { process }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Assign users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign users',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getAllProcesses,
  getProcessById,
  createProcess,
  updateProcess,
  deleteProcess,
  assignUsersToProcess
};