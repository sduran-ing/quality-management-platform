// Import models
const { Op } = require('sequelize');
const { matchedData } = require('express-validator');
const {
  Audit,
  AuditTeam,
  User,
  Process,
  Standard,
  AuditFinding,
  CorrectiveAction,
  StandardRequirement
} = require('../models');
const sequelize = require('../config/database');
const achievementService = require('../services/achievementService');   // For using the achievements logic

// ============================================
// GET ALL AUDITS
// ============================================

/**
 * Get all audits for the company with pagination and filters
 * GET /api/audits
 * Query params: 
 *   - page, limit (pagination)
 *   - search (title search)
 *   - status (single or array)
 *   - auditType (single or array)
 *   - processId (filter by process)
 *   - departmentId (filter by department)
 *   - myRole (filter by user's role: lead_auditor, auditor, auditee)
 *   - myView (boolean - role-based filtering for "My Audits" page)
 */
const getAllAudits = async (req, res) => {
  try {

    // ========================================
    // GET VALIDATED & SANITIZED PARAMS
    // ========================================

    /**
     * Use matchedData to get sanitized values
     * - Converts 'true' string to boolean true
     * - Only includes validated parameters
     */
    const validatedQuery = matchedData(req, { locations: ['query'] });

    const {
      page = 1,
      limit = 10,
      search,
      status,
      audit_type, 
      process_id,
      my_role, 
      my_view 
    } = validatedQuery;


    // DEBUG: Log destructured values
    console.log('Backend - Filters:', {
      status,
      audit_type,
      process_id,
      my_role,
      my_view
    });

    // ========================================
    // PAGINATION CALCULATION
    // ========================================

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // ========================================
    // BUILD WHERE CLAUSE FOR AUDITS
    // ========================================

    const auditWhere = {
      company_id: req.user.companyId
    };

    // Status filter (single or array)
    if (status) {
      if (Array.isArray(status)) {
        // Multiple statuses: ['draft', 'pending_approval']
        auditWhere.status = { [Op.in]: status };
      } else {
        // Single status: 'approved'
        auditWhere.status = status;
      }
    }

    // Audit type filter (single or array)
    if (audit_type) {
      if (Array.isArray(audit_type)) {
        auditWhere.audit_type = { [Op.in]: audit_type };
      } else {
        auditWhere.audit_type = audit_type;
      }
    }

    // Search by title (case-insensitive)
    if (search && search.trim()) {
      auditWhere.title = { [Op.iLike]: `%${search.trim()}%` };
    }

    // ========================================
    // BUILD INCLUDE CLAUSE
    // ========================================

    const includeClause = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'first_name', 'last_name', 'email']
      },
      {
        model: Process,
        as: 'processes',
        attributes: ['id', 'name', 'acronym'],
        through: { attributes: [] }
      },
      {
        model: Standard,
        as: 'standards',
        attributes: ['id', 'name', 'version'],
        through: { attributes: [] }
      },
      {
        model: User,
        as: 'teamMembers',
        attributes: ['id', 'first_name', 'last_name', 'email'],
        through: {
          attributes: ['role']
        }
      }
    ];

    // ========================================
    // PROCESS FILTER
    // ========================================

    /**
     * Filter audits that include a specific process
     * Uses inner join on audit_processes
     */
    if (process_id) {
      // 1. Find the "processes" include in our includeClause array
      const processIncludeIndex = includeClause.findIndex(inc => inc.as === 'processes');

      // 2. Modify it to filter for specific process
      if (processIncludeIndex !== -1) {
        includeClause[processIncludeIndex] = {
          ...includeClause[processIncludeIndex],  // Keep existing properties
          where: { id: process_id },               // ADD: Filter for this process
          required: true                          // ADD: INNER JOIN (exclude audits without this process)
        };
      }
    }

    // ========================================
    // MY ROLE FILTER
    // ========================================

    /**
     * Filter audits where user has a specific role
     * e.g., myRole=lead_auditor shows only audits where I'm lead auditor
     * 
     * Different from myView, this filters by specific role inside an audit
     */
    if (my_role && !my_view) {
      includeClause.push({
        model: AuditTeam,
        as: 'teamAssignments',
        where: {
          auditor_id: req.user.id,
          role: my_role
        },
        attributes: [],
        required: true  // INNER JOIN - only audits where I have this role
      });
    }

    // ========================================
    // MY VIEW FILTER (My Audits Page)
    // ========================================

    /**
     * Role-based filtering for "My Audits" page
     * 
     * QUALITY MANAGER:
     * - No filter (sees all audits)
     * 
     * EMPLOYEE / PROCESS OWNER:
     * - created_by = current user (audits they created)
     * - OR on audit team (any role)
     * 
     * Uses OR logic at audit level
     */
    if (my_view === true) {
      // Quality Manager sees everything - no additional filter
      if (req.user.role !== 'quality_manager') {
        // Employee and Process Owner see audits they created OR are team members of
        auditWhere[Op.or] = [
          { created_by: req.user.id },  // Audits I created
          // Audits where I'm a team member (checked via subquery)
          {
            id: {
              [Op.in]: sequelize.literal(`(
                SELECT DISTINCT audit_id 
                FROM audit_team 
                WHERE auditor_id = ${req.user.id}
              )`)
            }
          }
        ];
      }
    }

    // ========================================
    // QUERY WITH PAGINATION
    // ========================================

    const { count, rows: audits } = await Audit.findAndCountAll({
      where: auditWhere,
      include: includeClause,
      limit: limitNum,
      offset: offset,
      order: [['scheduled_start_date', 'DESC']],
      distinct: true  // Important for correct count with joins
    });

    /**
    * CALCULATE PAGINATION METADATA
    */
    const totalPages = Math.ceil(count / limitNum);
    const hasMore = pageNum < totalPages;

    // ========================================
    // RESPONSE
    // ========================================
    /**
     * Return snake_case response
     * Middleware will transform to camelCase before sending to frontend
     */
    res.status(200).json({
      success: true,
      message: 'Audits retrieved successfully',
      data: { audits,   // snake_case data
      pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: totalPages,
          hasMore: hasMore
      }
    }
    });

  } catch (error) {
    console.error('Get audits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audits',
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE AUDIT
// ============================================

/**
 * Get a single audit by ID with all details
 * GET /api/audits/:auditId
 */
const getAuditById = async (req, res) => {
  try {
    const { auditId } = req.params;

    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Process,
          as: 'processes',
          attributes: ['id', 'name', 'acronym'],
          through: { attributes: [] }
        },
        {
          model: Standard,
          as: 'standards',
          attributes: ['id', 'name', 'version'],
          through: { attributes: [] }
        },
        {
          model: User,
          as: 'teamMembers',
          attributes: ['id', 'first_name', 'last_name', 'email', 'role'],
          through: {
            attributes: ['role']
          }
        },
        {
          model: AuditFinding,
          as: 'findings',
          attributes: ['id', 'finding_number', 'severity', 'description', 'status']
        }
      ]
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Audit retrieved successfully',
      data: { audit }
    });

  } catch (error) {
    console.error('Get audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit',
      error: error.message
    });
  }
};

// ============================================
// CREATE AUDIT
// ============================================

/**
 * Create a new audit with scope and team
 * POST /api/audits
 * Body: {
 *   title, audit_type, start_date, end_date, description,
 *   process_ids: [array],
 *   standard_ids: [array],
 *   team_members: [{ user_id, role }]
 * }
 * 
 * - QM, Process Owner can create
 * - At least one lead_auditor required in team
 */
const createAudit = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      title,
      audit_type,
      start_date,
      end_date,
      description,
      process_ids,
      standard_ids,
      team_members
    } = req.body;

    // Validation - required fields
    if (!title || !audit_type || !start_date || !end_date || !description) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Title, audit type, start date, end date, and description are required'
      });
    }

    // Validate audit type
    const validAuditTypes = ['internal', 'external', 'surveillance', 'certification'];
    if (!validAuditTypes.includes(audit_type)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid audit type. Must be one of: ${validAuditTypes.join(', ')}`
      });
    }

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (startDateObj > endDateObj) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Authorization: Quality Manager OR Process Owner
    const isQM = req.user.role === 'quality_manager';
    const isPO = req.user.role === 'process_owner';

    if (!isQM && !isPO) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Process Owner can create audits'
      });
    }

    // Validate team members
    if (!team_members || !Array.isArray(team_members) || team_members.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one team member is required'
      });
    }

    // Check that there's at least one lead auditor
    const hasLeadAuditor = team_members.some(tm => tm.role === 'lead_auditor');
    if (!hasLeadAuditor) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one lead auditor is required'
      });
    }

    // Check that there's at least one auditee
    const hasAuditee = team_members.some(tm => tm.role === 'auditee');
    if (!hasAuditee) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one auditee is required'
      });
    }

    // Get user IDs
    const userIds = team_members.map(tm => tm.user_id);

    // VALIDATION 1: Check for duplicate users (one user = one role)
    const uniqueUserIds = new Set(userIds);
    if (userIds.length !== uniqueUserIds.size) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Each user can only be assigned one role in the audit'
      });
    }

    // VALIDATION 2: Check that all users exist and are active
    const users = await User.findAll({
      where: {
        id: Array.from(uniqueUserIds),  // Use unique IDs for query
        company_id: req.user.companyId,
        is_active: true
      },
      transaction
    });

    if (users.length !== uniqueUserIds.size) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'One or more user IDs are invalid or inactive'
      });
    }

    // Validate processes if provided
    if (process_ids && Array.isArray(process_ids) && process_ids.length > 0) {
      const processes = await Process.findAll({
        where: {
          id: process_ids,
          company_id: req.user.companyId,
          is_active: true
        },
        transaction
      });

      if (processes.length !== process_ids.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'One or more process IDs are invalid'
        });
      }
    }

    // Validate standards if provided
    if (standard_ids && Array.isArray(standard_ids) && standard_ids.length > 0) {
      const standards = await Standard.findAll({
        where: { id: standard_ids },
        transaction
      });

      if (standards.length !== standard_ids.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'One or more standard IDs are invalid'
        });
      }
    }

    // Create audit
    const audit = await Audit.create({
      company_id: req.user.companyId,
      title: title.trim(),
      audit_type: audit_type,
      status: 'scheduled',
      scheduled_start_date: start_date,
      scheduled_end_date: end_date,
      description: description.trim(),
      created_by: req.user.id
    }, { transaction });

    // Add processes to audit scope
    if (process_ids && Array.isArray(process_ids) && process_ids.length > 0) {
      const processes = await Process.findAll({
        where: {
          id: process_ids,
          company_id: req.user.companyId,
          is_active: true
        },
        transaction
      });

      await audit.setProcesses(processes, { transaction });
    }

    // Add standards to audit scope
    if (standard_ids && Array.isArray(standard_ids) && standard_ids.length > 0) {
      const standards = await Standard.findAll({
        where: { id: standard_ids },
        transaction
      });

      await audit.setStandards(standards, { transaction });
    }

    // Add team members with roles
    for (const member of team_members) {
      await AuditTeam.create({
        audit_id: audit.id,
        auditor_id: member.user_id,
        role: member.role
      }, { transaction });
    }

    // Reload with associations (include transaction)
    await audit.reload({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        { model: Process, as: 'processes', attributes: ['id', 'name', 'acronym'], through: { attributes: [] } },
        { model: Standard, as: 'standards', attributes: ['id', 'name', 'version'], through: { attributes: [] } },
        {
          model: User,
          as: 'teamMembers',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          through: { attributes: ['role'] }
        }
      ],
      transaction
    });

    // Commit after successful reload
    await transaction.commit();

    // Track achievement after commit - never inside transaction
    // Service handles its own errors so this never breaks the response
    const achievements = await achievementService.track(
      req.user.id,
      req.user.companyId,
      'audit_scheduled',
      audit.id,
      'audit'
    );

    res.status(201).json({
      success: true,
      message: 'Audit created successfully',
      data: { audit },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create audit',
      error: error.message
    });
  }
};

// ============================================
// EDIT AUDIT
// ============================================

/**
 * Edit an audit
 * PUT /api/audits/:auditId
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
const editAudit = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { auditId } = req.params;
    const {
      title,
      audit_type,
      start_date,
      end_date,
      description,
      process_ids,
      standard_ids,
      team_members
    } = req.body;

    // Get audit with associations
    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: User,
          as: 'teamMembers',
          through: { attributes: ['role'] },
          attributes: ['id']
        }
      ],
      transaction
    });

    if (!audit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Check status - can only edit scheduled audits
    if (audit.status !== 'scheduled') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot edit audit with status: ${audit.status}. Only scheduled audits can be edited.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor
    const isQM = req.user.role === 'quality_manager';
    
    const isLeadAuditor = audit.teamMembers?.some(
      member => member.id === req.user.id && member.AuditTeam?.role === 'lead_auditor'
    );

    if (!isQM && !isLeadAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Lead Auditor can edit audits'
      });
    }

    // Validation - required fields
    if (!title || !audit_type || !start_date || !end_date) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Title, audit type, start date, and end date are required'
      });
    }

    // Validate audit type
    const validAuditTypes = ['internal', 'external', 'surveillance', 'certification'];
    if (!validAuditTypes.includes(audit_type)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid audit type. Must be one of: ${validAuditTypes.join(', ')}`
      });
    }

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (startDateObj > endDateObj) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Validate team members
    if (!team_members || !Array.isArray(team_members) || team_members.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one team member is required'
      });
    }

    // Check that there's at least one lead auditor
    const hasLeadAuditor = team_members.some(tm => tm.role === 'lead_auditor');
    if (!hasLeadAuditor) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one lead auditor is required'
      });
    }

    // Check that there's at least one auditee
    const hasAuditee = team_members.some(tm => tm.role === 'auditee');
    if (!hasAuditee) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one auditee is required'
      });
    }

    // Get user IDs
    const userIds = team_members.map(tm => tm.user_id);

    // VALIDATION 1: Check for duplicate users (one user = one role)
    const uniqueUserIds = new Set(userIds);
    if (userIds.length !== uniqueUserIds.size) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Each user can only be assigned one role in the audit'
      });
    }

    // VALIDATION 2: Check that all users exist and are active
    const users = await User.findAll({
      where: {
        id: Array.from(uniqueUserIds),  // Use unique IDs for query
        company_id: req.user.companyId,
        is_active: true
      },
      transaction
    });

    if (users.length !== uniqueUserIds.size) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'One or more user IDs are invalid or inactive'
      });
    }

    // Validate processes if provided
    if (process_ids && Array.isArray(process_ids) && process_ids.length > 0) {
      const processes = await Process.findAll({
        where: {
          id: process_ids,
          company_id: req.user.companyId,
          is_active: true
        },
        transaction
      });

      if (processes.length !== process_ids.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'One or more process IDs are invalid'
        });
      }
    }

    // Validate standards if provided
    if (standard_ids && Array.isArray(standard_ids) && standard_ids.length > 0) {
      const standards = await Standard.findAll({
        where: { id: standard_ids },
        transaction
      });

      if (standards.length !== standard_ids.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'One or more standard IDs are invalid'
        });
      }
    }

    // Update audit basic fields
    audit.title = title.trim();
    audit.audit_type = audit_type;
    audit.scheduled_start_date = start_date;
    audit.scheduled_end_date = end_date;
    audit.description = description ? description.trim() : null;
    // Note: Status does NOT change

    await audit.save({ transaction });

    // Update processes
    if (process_ids && Array.isArray(process_ids)) {
      const processes = await Process.findAll({
        where: {
          id: process_ids,
          company_id: req.user.companyId,
          is_active: true
        },
        transaction
      });

      await audit.setProcesses(processes, { transaction });
    }

    // Update standards
    if (standard_ids && Array.isArray(standard_ids)) {
      const standards = await Standard.findAll({
        where: { id: standard_ids },
        transaction
      });

      await audit.setStandards(standards, { transaction });
    }

    // Update team members
    // Delete existing team members
    await AuditTeam.destroy({
      where: { audit_id: audit.id },
      transaction
    });

    // Create new team members
    for (const member of team_members) {
      await AuditTeam.create({
        audit_id: audit.id,
        auditor_id: member.user_id,
        role: member.role
      }, { transaction });
    }

    // Reload with associations (include transaction)
    await audit.reload({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        { model: Process, as: 'processes', attributes: ['id', 'name', 'acronym'], through: { attributes: [] } },
        { model: Standard, as: 'standards', attributes: ['id', 'name', 'version'], through: { attributes: [] } },
        {
          model: User,
          as: 'teamMembers',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          through: { attributes: ['role'] }
        }
      ],
      transaction
    });

    // Commit after successful reload
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Audit updated successfully',
      data: { audit }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Edit audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit audit',
      error: error.message
    });
  }
};

// ============================================
// START AUDIT
// ============================================

/**
 * Start an audit
 * PUT /api/audits/:auditId/start
 * 
 * - QM, Lead Auditor can start an audit
 * - Status change: scheduled to in_progress
 * - Can only start audits with status: 'scheduled'
 * - Records actual_start_date
 */
const startAudit = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { auditId } = req.params;

    // Get audit with team members
    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: User,
          as: 'teamMembers',
          through: { attributes: ['role'] },
          attributes: ['id']
        }
      ],
      transaction
    });

    if (!audit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Check status - can only start scheduled audits
    if (audit.status !== 'scheduled') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot start audit with status: ${audit.status}. Only scheduled audits can be started.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor
    const isQM = req.user.role === 'quality_manager';
    
    const isLeadAuditor = audit.teamMembers?.some(
      member => member.id === req.user.id && member.AuditTeam?.role === 'lead_auditor'
    );

    if (!isQM && !isLeadAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Lead Auditor can start audits'
      });
    }

    // Start the audit
    audit.status = 'in_progress';
    audit.actual_start_date = new Date();

    await audit.save({ transaction });

    // Reload with associations
    await audit.reload({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        { model: Process, as: 'processes', attributes: ['id', 'name', 'acronym'], through: { attributes: [] } },
        { model: Standard, as: 'standards', attributes: ['id', 'name', 'version'], through: { attributes: [] } },
        {
          model: User,
          as: 'teamMembers',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          through: { attributes: ['role'] }
        }
      ],
      transaction
    });

    // Commit after successful reload
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Audit started successfully',
      data: { audit }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Start audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start audit',
      error: error.message
    });
  }
};

// ============================================
// COMPLETE AUDIT
// ============================================

/**
 * Complete an audit
 * PUT /api/audits/:auditId/complete
 * 
 * - QM, Lead Auditor can complete an audit
 * - Status change: in_progress to completed
 * - ALL findings must be 'closed'
 * - Records actual_end_date
 * - Can only complete audits with status: 'in_progress'
 */
const completeAudit = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { auditId } = req.params;

    // Get audit with team members and findings
    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: User,
          as: 'teamMembers',
          through: { attributes: ['role'] },
          attributes: ['id']
        },
        {
          model: AuditFinding,
          as: 'findings',
          attributes: ['id', 'status']
        }
      ],
      transaction
    });

    if (!audit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Check status - can only complete in_progress audits
    if (audit.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot complete audit with status: ${audit.status}. Only in-progress audits can be completed.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor
    const isQM = req.user.role === 'quality_manager';
    
    const isLeadAuditor = audit.teamMembers?.some(
      member => member.id === req.user.id && member.AuditTeam?.role === 'lead_auditor'
    );

    if (!isQM && !isLeadAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Lead Auditor can complete audits'
      });
    }

    // Validate all findings are closed
    const findings = audit.findings || [];
    
    if (findings.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot complete audit without any findings'
      });
    }

    const openFindings = findings.filter(f => f.status !== 'closed');
    
    if (openFindings.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot complete audit. ${openFindings.length} finding(s) are not closed yet.`,
        data: {
          totalFindings: findings.length,
          openFindings: openFindings.length
        }
      });
    }

    // Complete the audit
    audit.status = 'completed';
    audit.actual_end_date = new Date();

    await audit.save({ transaction });

    // Reload with associations (include transaction)
    await audit.reload({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        { model: Process, as: 'processes', attributes: ['id', 'name', 'acronym'], through: { attributes: [] } },
        { model: Standard, as: 'standards', attributes: ['id', 'name', 'version'], through: { attributes: [] } },
        {
          model: User,
          as: 'teamMembers',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          through: { attributes: ['role'] }
        }
      ],
      transaction
    });

    // Commit after successful reload
    await transaction.commit();

    // Track achievement AFTER commit - never inside transaction
    // Service handles its own errors so this never breaks the response
    const achievements = await achievementService.track(
      req.user.id,
      req.user.companyId,
      'audit_completed',
      audit.id,
      'audit'
    );

    res.status(200).json({
      success: true,
      message: 'Audit completed successfully',
      data: { audit },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Complete audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete audit',
      error: error.message
    });
  }
};

// ============================================
// CANCEL AUDIT
// ============================================

/**
 * Cancel an audit
 * PUT /api/audits/:auditId/cancel
 * 
 * - QM, Lead Auditor can cancel
 * - Can only cancel audits with status: 'scheduled' OR 'in_progress'
 * - Deletes ALL findings and their corrective actions
 */
const cancelAudit = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { auditId } = req.params;

    // Get audit with team members and findings
    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: User,
          as: 'teamMembers',
          through: { attributes: ['role'] },
          attributes: ['id']
        },
        {
          model: AuditFinding,
          as: 'findings',
          attributes: ['id'],
          include: [
            {
              model: CorrectiveAction,
              as: 'correctiveActions',
              attributes: ['id']
            }
          ]
        }
      ],
      transaction
    });

    if (!audit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Check status - can only cancel scheduled or in_progress audits
    if (audit.status !== 'scheduled' && audit.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel audit with status: ${audit.status}. Only scheduled or in-progress audits can be cancelled.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor
    const isQM = req.user.role === 'quality_manager';
    
    const isLeadAuditor = audit.teamMembers?.some(
      member => member.id === req.user.id && member.AuditTeam?.role === 'lead_auditor'
    );

    if (!isQM && !isLeadAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Lead Auditor can cancel audits'
      });
    }

    // Count findings and corrective actions that will be deleted
    const findings = audit.findings || [];
    const totalFindings = findings.length;
    const totalCorrectiveActions = findings.reduce(
      (sum, finding) => sum + (finding.correctiveActions?.length || 0),
      0
    );

    // Delete all corrective actions first (if any exist)
    if (totalCorrectiveActions > 0) {
      const findingIds = findings.map(f => f.id);
      await CorrectiveAction.destroy({
        where: {
          finding_id: findingIds
        },
        transaction
      });
    }

    // Delete all findings (cascade will handle any remaining associations)
    if (totalFindings > 0) {
      await AuditFinding.destroy({
        where: {
          audit_id: audit.id
        },
        transaction
      });
    }

    // Cancel the audit
    audit.status = 'cancelled';

    await audit.save({ transaction });

    // Reload with associations (include transaction)
    await audit.reload({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        { model: Process, as: 'processes', attributes: ['id', 'name', 'acronym'], through: { attributes: [] } },
        { model: Standard, as: 'standards', attributes: ['id', 'name', 'version'], through: { attributes: [] } },
        {
          model: User,
          as: 'teamMembers',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          through: { attributes: ['role'] }
        }
      ],
      transaction
    });

    // Commit after successful reload
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Audit cancelled successfully',
      data: {
        audit,
        deletedFindings: totalFindings,
        deletedCorrectiveActions: totalCorrectiveActions
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Cancel audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel audit',
      error: error.message
    });
  }
};

// ============================================
// AUDIT STATISTICS
// ============================================

/**
 * Get audit statistics
 * GET /api/audits/:auditId/statistics
 * 
 * Returns counts of findings and corrective actions
 * Used for modals and overview displays
 */
const getAuditStatistics = async (req, res) => {
  try {
    const { auditId } = req.params;

    // Get audit with findings and corrective actions
    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: AuditFinding,
          as: 'findings',
          attributes: ['id', 'status'],
          include: [
            {
              model: CorrectiveAction,
              as: 'correctiveActions',
              attributes: ['id', 'status']
            }
          ]
        }
      ]
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Calculate statistics
    const findings = audit.findings || [];
    
    const statistics = {
      totalFindings: findings.length,
      findingsByStatus: {
        open: findings.filter(f => f.status === 'open').length,
        in_progress: findings.filter(f => f.status === 'in_progress').length,
        pending_verification: findings.filter(f => f.status === 'pending_verification').length,
        closed: findings.filter(f => f.status === 'closed').length
      },
      totalCorrectiveActions: findings.reduce(
        (sum, finding) => sum + (finding.correctiveActions?.length || 0),
        0
      ),
      correctiveActionsByStatus: {
        proposed: 0,
        rejected: 0,
        in_implementation: 0,
        pending_verification: 0,
        completed: 0
      }
    };

    // Count corrective actions by status
    findings.forEach(finding => {
      finding.correctiveActions?.forEach(ca => {
        if (statistics.correctiveActionsByStatus[ca.status] !== undefined) {
          statistics.correctiveActionsByStatus[ca.status]++;
        }
      });
    });

    res.status(200).json({
      success: true,
      message: 'Audit statistics retrieved successfully',
      data: { statistics }
    });

  } catch (error) {
    console.error('Get audit statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit statistics',
      error: error.message
    });
  }
};

/**
 * Get all team members for an audit (for dropdown selectors)
 * GET /api/audits/:auditId/team-members
 */
const getAuditTeamMembers = async (req, res) => {
  try {
    const { auditId } = req.params;

    // Get audit with team members
    const audit = await Audit.findOne({
      where: { 
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: User,
          as: 'teamMembers',
          through: { attributes: ['role'] },
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Team members retrieved successfully',
      data: {
        teamMembers: audit.teamMembers
      }
    });

  } catch (error) {
    console.error('Get audit team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve team members',
      error: error.message
    });
  }
};

/**
 * Get standards associated with an audit (with their requirements)
 * GET /api/audits/:auditId/standards
 * Returns all standards and their requirements for this audit
 */
const getAuditStandards = async (req, res) => {
  try {
    const { auditId } = req.params;

    // Verify audit exists and user has access
    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: Standard,
          as: 'standards',
          through: { attributes: [] },  // Don't include junction table fields
          include: [
            {
              model: StandardRequirement,
              as: 'requirements',
              attributes: ['id', 'clause_number', 'title', 'description']
            }
          ]
        }
      ]
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Audit Standards retrieved successfully',
      data: { standards: audit.standards }
    });

  } catch (error) {
    console.error('Get audit standards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit standards',
      error: error.message
    });
  }
};

/**
 * Get processes associated with an audit
 * GET /api/audits/:auditId/processes
 * Returns all processes for this audit
 */
const getAuditProcesses = async (req, res) => {
  try {
    const { auditId } = req.params;

    // Verify audit exists and user has access
    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      },
      include: [
        {
          model: Process,
          as: 'processes',
          through: { attributes: [] },  // Don't include junction table fields
          attributes: ['id', 'name', 'acronym']
        }
      ]
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Audit Processes retrieved successfully',
      data: { processes: audit.processes }
    });

  } catch (error) {
    console.error('Get audit processes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit processes',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
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
};