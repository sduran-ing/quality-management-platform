// Import models
const { 
  AuditFinding, 
  Audit,
  Standard,
  StandardRequirement, 
  Process, 
  User,
  AuditTeam,
  CorrectiveAction
} = require('../models');
const sequelize = require('../config/database');
const achievementService = require('../services/achievementService');   // For using the achievements logic

// ============================================
// HELPER: GENERATE FINDING NUMBER
// ============================================

/**
 * Generate unique finding number for audit: A-001, A-002, etc.
 */
const generateFindingNumber = async (auditId) => {
  const existingFindings = await AuditFinding.findAll({
    where: { audit_id: auditId },
    attributes: ['finding_number'],
    raw: true
  });

  const numbers = existingFindings
    .map(f => parseInt(f.finding_number.split('-')[1], 10))
    .filter(n => !isNaN(n));

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(3, '0');

  return `F-${paddedNumber}`;
};

// ============================================
// GET ALL FINDINGS FOR AUDIT
// ============================================

/**
 * Get all findings for a specific audit
 * GET /api/audits/:auditId/findings
 * Query params: status, severity
 */
const getAllFindings = async (req, res) => {
  try {
    const { auditId } = req.params;
    const { status, severity } = req.query;

    // Verify audit exists and user has access
    const audit = await Audit.findOne({
      where: {
        id: auditId,
        company_id: req.user.companyId
      }
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Build where clause
    const whereClause = { audit_id: auditId };
    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;

    const findings = await AuditFinding.findAll({
      where: whereClause,
      include: [
        {
          model: StandardRequirement,
          as: 'requirement',
          attributes: ['id', 'clause_number', 'title']
        },
        {
          model: Process,
          as: 'process',
          attributes: ['id', 'name', 'acronym']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['finding_number', 'ASC']]
    });

    res.status(200).json({
      success: true,
      message: 'Findings retrieved successfully',
      data: {
        findings,
        total: findings.length
      }
    });

  } catch (error) {
    console.error('Get findings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve findings',
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE FINDING
// ============================================

/**
 * Get a single finding by ID
 * GET /api/audits/:auditId/findings/:findingId
 */
const getFindingById = async (req, res) => {
  try {
    const { auditId, findingId } = req.params;

    const finding = await AuditFinding.findOne({
      where: { 
        id: findingId,
        audit_id: auditId
      },
      include: [
        {
          model: Audit,
          as: 'audit',
          where: { company_id: req.user.companyId },
          attributes: ['id', 'title', 'audit_type', 'status']
        },
        {
          model: StandardRequirement,
          as: 'requirement',
          attributes: ['id', 'clause_number', 'title', 'description']
        },
        {
          model: Process,
          as: 'process',
          attributes: ['id', 'name', 'acronym']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        { model: User,
          as: 'closedByUser',
          attributes: ['id', 'first_name', 'last_name'] }
      ]
    });

    if (!finding) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Finding retrieved successfully',
      data: { finding }
    });

  } catch (error) {
    console.error('Get finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve finding',
      error: error.message
    });
  }
};

// ============================================
// CREATE FINDING
// ============================================

/**
 * Create a new audit finding
 * POST /api/audits/:auditId/findings
 * Body: { severity, requirement_id, process_id, description }
 * 
 * - QM, Lead Auditor, Auditor can create
 * - Requirements from audit's associated standards
 * - Processes from audit's associated processes
 * - Can only create if audit status is in_progress
 */
const createFinding = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { auditId } = req.params;
    const { severity, requirement_id, process_id, description } = req.body;

    // Validation - severity
    if (!severity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Severity is required'
      });
    }

    const validSeverities = ['major_nonconformity', 'minor_nonconformity', 'opportunity'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid severity. Must be: major_nonconformity, minor_nonconformity, or opportunity'
      });
    }

    // Validation - description
    if (!description || description.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters'
      });
    }

    // Validation - requirement
    if (!requirement_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Standard requirement is required'
      });
    }

    // Validation - process
    if (!process_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Process is required'
      });
    }

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
        },
        {
          model: Standard,
          as: 'standards',
          through: { attributes: [] }
        },
        {
          model: Process,
          as: 'processes',
          through: { attributes: [] }
        }
      ]
    });

    if (!audit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Audit not found'
      });
    }

    // Check audit status, can only create finding if audit is in_progress
    if (audit.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot create finding for audit with status: ${audit.status}. Audit must be in progress.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor OR Auditor
    const isQM = req.user.role === 'quality_manager';
    
    const isAuditor = audit.teamMembers?.some(
      member => member.id === req.user.id && 
      (member.AuditTeam?.role === 'lead_auditor' || member.AuditTeam?.role === 'auditor')
    );

    if (!isQM && !isAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager, Lead Auditor, or Auditors can create findings'
      });
    }

    // Verify requirement belongs to audit's standards
    const requirement = await StandardRequirement.findOne({
      where: { id: requirement_id },
      include: [
        {
          model: Standard,
          as: 'standard',
          where: {
            id: audit.standards.map(s => s.id)
          }
        }
      ]
    });

    if (!requirement) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Standard requirement not found or not associated with this audit'
      });
    }

    // Verify process belongs to audit's processes
    const auditProcessIds = audit.processes.map(p => p.id);
    if (!auditProcessIds.includes(process_id)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Process is not associated with this audit'
      });
    }

    // Generate finding number
    const findingNumber = await generateFindingNumber(auditId);

    // Create finding
    const finding = await AuditFinding.create({
      audit_id: auditId,
      finding_number: findingNumber,
      severity,
      standard_requirement_id: requirement_id,
      process_id: process_id,
      description: description.trim(),
      status: 'open',
      created_by: req.user.id
    }, { transaction });

    // Reload with associations
    await finding.reload({
      include: [
        { 
          model: StandardRequirement, 
          as: 'requirement', 
          attributes: ['id', 'clause_number', 'title'],
          include: [
            { model: Standard, as: 'standard', attributes: ['id', 'name', 'version'] }
          ]
        },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
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
      'finding_created',
      finding.id,
      'audit_findings'
    );

    res.status(201).json({
      success: true,
      message: 'Finding created successfully',
      data: { finding },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    console.error('Create finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create finding',
      error: error.message
    });
  }
};

// ============================================
// DELETE FINDING
// ============================================

/**
 * Delete a finding
 * DELETE /api/audits/:auditId/findings/:findingId
 * 
 * - QM, Lead Auditor, Auditor can delete
 * - Only 'open' findings can be deleted
 * - Deletes all associated corrective actions
 */
const deleteFinding = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { auditId, findingId } = req.params;

    // Get finding with audit and team members
    const finding = await AuditFinding.findOne({
      where: { 
        id: findingId,
        audit_id: auditId
      },
      include: [
        {
          model: Audit,
          as: 'audit',
          where: { company_id: req.user.companyId },
          include: [
            {
              model: User,
              as: 'teamMembers',
              through: { attributes: ['role'] },
              attributes: ['id']
            }
          ]
        }
      ],
      transaction
    });

    if (!finding) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    // Check status - can only delete open findings
    if (finding.status !== 'open') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot delete finding with status: ${finding.status}. Only open findings can be deleted.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor OR Auditor
    const isQM = req.user.role === 'quality_manager';
    
    const isAuditor = finding.audit.teamMembers?.some(
      member => member.id === req.user.id && 
      (member.AuditTeam?.role === 'lead_auditor' || member.AuditTeam?.role === 'auditor')
    );

    if (!isQM && !isAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager, Lead Auditor, or Auditors can delete findings'
      });
    }

    // Delete finding (CASCADE will delete associated corrective actions)
    await finding.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Finding deleted successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Delete finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete finding',
      error: error.message
    });
  }
};

// ============================================
// EDIT FINDING
// ============================================

/**
 * Edit a finding
 * PUT /api/audits/:auditId/findings/:findingId
 * Body: { severity, requirement_id, process_id, description }
 * 
 * BUSINESS RULES:
 * - Who can edit: QM, Lead Auditor, Auditor
 * - Status: Only 'open' findings can be edited
 * - Status does NOT change after edit
 * - Can update: severity, requirement, process, description
 */
const editFinding = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { auditId, findingId } = req.params;
    const { severity, requirement_id, process_id, description } = req.body;

    // Validation - severity
    if (!severity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Severity is required'
      });
    }

    const validSeverities = ['major_nonconformity', 'minor_nonconformity', 'opportunity'];
    if (!validSeverities.includes(severity)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid severity. Must be: major_nonconformity, minor_nonconformity, or opportunity'
      });
    }

    // Validation - description
    if (!description || description.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    if (description.trim().length < 10) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters'
      });
    }

    // Validation - requirement
    if (!requirement_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Standard requirement is required'
      });
    }

    // Validation - process
    if (!process_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Process is required'
      });
    }

    // Get finding with audit and associations
    const finding = await AuditFinding.findOne({
      where: { 
        id: findingId,
        audit_id: auditId
      },
      include: [
        {
          model: Audit,
          as: 'audit',
          where: { company_id: req.user.companyId },
          include: [
            {
              model: User,
              as: 'teamMembers',
              through: { attributes: ['role'] },
              attributes: ['id']
            },
            {
              model: Standard,
              as: 'standards',
              through: { attributes: [] }
            },
            {
              model: Process,
              as: 'processes',
              through: { attributes: [] }
            }
          ]
        }
      ],
      transaction
    });

    if (!finding) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    // Check status - can only edit open findings
    if (finding.status !== 'open') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot edit finding with status: ${finding.status}. Only open findings can be edited.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor OR Auditor
    const isQM = req.user.role === 'quality_manager';
    
    const isAuditor = finding.audit.teamMembers?.some(
      member => member.id === req.user.id && 
      (member.AuditTeam?.role === 'lead_auditor' || member.AuditTeam?.role === 'auditor')
    );

    if (!isQM && !isAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager, Lead Auditor, or Auditors can edit findings'
      });
    }

    // Verify requirement belongs to audit's standards
    const requirement = await StandardRequirement.findOne({
      where: { id: requirement_id },
      include: [
        {
          model: Standard,
          as: 'standard',
          where: {
            id: finding.audit.standards.map(s => s.id)
          }
        }
      ],
      transaction
    });

    if (!requirement) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Standard requirement not found or not associated with this audit'
      });
    }

    // Verify process belongs to audit's processes
    const auditProcessIds = finding.audit.processes.map(p => p.id);
    if (!auditProcessIds.includes(process_id)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Process is not associated with this audit'
      });
    }

    // Update finding
    finding.severity = severity;
    finding.standard_requirement_id = requirement_id;
    finding.process_id = process_id;
    finding.description = description.trim();
    // Note: Status does NOT change
    
    // Save the changes in finding
    await finding.save({ transaction });    

    // Reload with associations before committing
    await finding.reload({
      include: [
        { 
          model: StandardRequirement, 
          as: 'requirement', 
          attributes: ['id', 'clause_number', 'title'],
          include: [
            { model: Standard, as: 'standard', attributes: ['id', 'name', 'version'] }
          ]
        },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
      ],
      transaction
    });

    // Commit after reload succeeds
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Finding updated successfully',
      data: { finding }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Edit finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit finding',
      error: error.message
    });
  }
};


// ============================================
// CLOSE FINDING
// ============================================

/**
 * Close a finding
 * PUT /api/audits/:auditId/findings/:findingId/close
 * 
 * BUSINESS RULES:
 * - QM, Lead Auditor, Auditor can close
 * - Only 'pending_verification' findings can be closed
 * - All corrective actions must be in 'completed' status
 */
const closeFinding = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { auditId, findingId } = req.params;

    // Get finding with audit, team members, and corrective actions
    const finding = await AuditFinding.findOne({
      where: { 
        id: findingId,
        audit_id: auditId
      },
      include: [
        {
          model: Audit,
          as: 'audit',
          where: { company_id: req.user.companyId },
          include: [
            {
              model: User,
              as: 'teamMembers',
              through: { attributes: ['role'] },
              attributes: ['id']
            }
          ]
        },
        {
          model: CorrectiveAction,
          as: 'correctiveActions',
          attributes: ['id', 'status']
        }
      ],
      transaction
    });

    if (!finding) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    // Check status - can only close pending_verification findings
    if (finding.status !== 'pending_verification') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot close finding with status: ${finding.status}. Only findings pending verification can be closed.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor OR Auditor
    const isQM = req.user.role === 'quality_manager';
    
    const isAuditor = finding.audit.teamMembers?.some(
      member => member.id === req.user.id && 
      (member.AuditTeam?.role === 'lead_auditor' || member.AuditTeam?.role === 'auditor')
    );

    if (!isQM && !isAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager, Lead Auditor, or Auditors can close findings'
      });
    }

    // Validate all corrective actions are completed
    const correctiveActions = finding.correctiveActions || [];
    
    if (correctiveActions.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot close finding without corrective actions'
      });
    }

    const incompleteActions = correctiveActions.filter(ca => ca.status !== 'completed');
    
    if (incompleteActions.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot close finding. ${incompleteActions.length} corrective action(s) are not completed yet.`,
        data: {
          totalActions: correctiveActions.length,
          incompleteActions: incompleteActions.length
        }
      });
    }

    // Close the finding
    finding.status = 'closed';
    finding.closed_at = new Date();
    finding.closed_by = req.user.id;
    
    await finding.save({ transaction });

    // Reload with associations (include transaction)
    await finding.reload({
      include: [
        { 
          model: StandardRequirement, 
          as: 'requirement', 
          attributes: ['id', 'clause_number', 'title'],
          include: [
            { model: Standard, as: 'standard', attributes: ['id', 'name', 'version'] }
          ]
        },
        { model: Process, as: 'process', attributes: ['id', 'name', 'acronym'] },
        { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'closedByUser', attributes: ['id', 'first_name', 'last_name'] }
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
      'finding_closed',
      finding.id,
      'audit_findings'
    );

    res.status(200).json({
      success: true,
      message: 'Finding closed successfully',
      data: { finding },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Close finding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close finding',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getAllFindings,
  getFindingById,
  createFinding,
  deleteFinding,
  editFinding,
  closeFinding
};