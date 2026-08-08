// Import models
const { 
  CorrectiveAction, 
  AuditFinding, 
  Audit,
  User,
  Process,
  AuditTeam
} = require('../models');
const sequelize = require('../config/database');
const achievementService = require('../services/achievementService');   // For using the achievements logic

// ============================================
// HELPER: GENERATE ACTION NUMBER
// ============================================

/**
 * Generate unique action number for finding: CA-001, CA-002, etc.
 */
const generateActionNumber = async (findingId) => {
  const existingActions = await CorrectiveAction.findAll({
    where: { finding_id: findingId },
    attributes: ['action_number'],
    raw: true
  });

  const numbers = existingActions
    .map(a => parseInt(a.action_number.split('-')[1], 10))
    .filter(n => !isNaN(n));

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = maxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(3, '0');

  return `CA-${paddedNumber}`;
};

// ============================================
// GET ALL CORRECTIVE ACTIONS FOR FINDING
// ============================================

/**
 * Get all corrective actions for a specific finding
 * GET /api/audits/:auditId/findings/:findingId/corrective-actions
 */
const getAllCorrectiveActions = async (req, res) => {
  try {
    const { auditId, findingId } = req.params;

    // Verify finding exists
    const finding = await AuditFinding.findOne({
      where: { 
        id: findingId,
        audit_id: auditId
      },
      include: [
        {
          model: Audit,
          as: 'audit',
          where: { company_id: req.user.companyId }
        }
      ]
    });

    if (!finding) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    const correctiveActions = await CorrectiveAction.findAll({
      where: { finding_id: findingId },
      include: [
        { model: User, as: 'responsibleUser', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'proposer', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'verifier', attributes: ['id', 'first_name', 'last_name'] }
      ],
      order: [['proposed_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: 'Corrective actions retrieved successfully',
      data: {
        correctiveActions,
        total: correctiveActions.length
      }
    });

  } catch (error) {
    console.error('Get corrective actions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve corrective actions',
      error: error.message
    });
  }
};

// ============================================
// CREATE CORRECTIVE ACTION
// ============================================

/**
 * Create a corrective action for a finding
 * POST /api/audits/:auditId/findings/:findingId/corrective-actions
 * Body: { root_cause_analysis, proposed_action, responsible_user_id, expected_completion_date }
 * 
 * - QM and auditee (team member with role 'auditee') can create
 * - Status: proposed
 * - Can only create if finding status is open or in_progress
 */
const createCorrectiveAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { auditId, findingId } = req.params;
    const { root_cause_analysis, proposed_action, responsible_user_id, expected_completion_date } = req.body;

    // Validation
    if (!proposed_action || !responsible_user_id || !expected_completion_date) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Proposed action, responsible user, and expected completion date are required'
      });
    }

    // Verify finding exists and get audit details
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
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        }
      ]
    });

    if (!finding) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }

    // Check finding status, can only create CA if finding is open or in_progress
    if (finding.status !== 'open' && finding.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot create corrective action for finding with status: ${finding.status}. Finding must be open or in progress.`
      });
    }

    // Authorization: Quality Manager OR Auditee (team member with role 'auditee')
    const isQM = req.user.role === 'quality_manager';
    
    // Check if user is an auditee on this audit
    const isAuditee = finding.audit.teamMembers?.some(
      member => member.id === req.user.id && member.AuditTeam?.role === 'auditee'
    );

    if (!isQM && !isAuditee) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Auditees can create corrective actions'
      });
    }

    // Verify responsible user exists
    const responsibleUser = await User.findOne({
      where: {
        id: responsible_user_id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!responsibleUser) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Responsible user not found'
      });
    }

    // Generate action number
    const actionNumber = await generateActionNumber(findingId);

    // Create corrective action
    const correctiveAction = await CorrectiveAction.create({
      finding_id: findingId,
      action_number: actionNumber,
      proposed_action: proposed_action.trim(),
      root_cause_analysis: root_cause_analysis ? root_cause_analysis.trim() : null,
      responsible_user_id,
      expected_completion_date,
      status: 'proposed',
      proposed_by: req.user.id,
      proposed_at: new Date()
    }, { transaction });

    // Reload with associations
    await correctiveAction.reload({
      include: [
        { model: User, as: 'responsibleUser', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'proposer', attributes: ['id', 'first_name', 'last_name'] }
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
      'ca_proposed',
      correctiveAction.id,
      'corrective_actions'
    );

    res.status(201).json({
      success: true,
      message: 'Corrective action created successfully',
      data: { correctiveAction },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create corrective action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create corrective action',
      error: error.message
    });
  }
};

// ============================================
// DELETE CORRECTIVE ACTION
// ============================================

/**
 * Delete a corrective action
 * DELETE /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId
 * 
 * - Who can delete: QM and auditee
 * - Can only delete in status: proposed or rejected
 * - Hard delete (record removed from database)
 */
const deleteCorrectiveAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { auditId, findingId, actionId } = req.params;

    // Get corrective action with all necessary associations
    const correctiveAction = await CorrectiveAction.findOne({
      where: { 
        id: actionId,
        finding_id: findingId
      },
      include: [
        {
          model: AuditFinding,
          as: 'finding',
          where: { audit_id: auditId },
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
          ]
        }
      ]
    });

    if (!correctiveAction) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Corrective action not found'
      });
    }

    // Check status - can only delete in proposed or rejected status
    if (correctiveAction.status !== 'proposed' && correctiveAction.status !== 'rejected') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot delete corrective action with status: ${correctiveAction.status}. Only proposed or rejected actions can be deleted.`
      });
    }

    // Authorization: Quality Manager OR Auditee
    const isQM = req.user.role === 'quality_manager';
    
    // Check if user is an auditee on this audit
    const isAuditee = correctiveAction.finding.audit.teamMembers?.some(
      member => member.id === req.user.id && member.AuditTeam?.role === 'auditee'
    );

    if (!isQM && !isAuditee) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Auditees can delete corrective actions'
      });
    }

    // Hard delete the corrective action
    await correctiveAction.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `Corrective action with code ${correctiveAction.action_number} deleted successfully`
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Delete corrective action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete corrective action',
      error: error.message
    });
  }
};

// ============================================
// REJECT CORRECTIVE ACTION (Proposal Stage)
// ============================================

/**
 * Reject a proposed corrective action
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/reject
 * Body: { rejection_reason }
 * 
 * BUSINESS RULES:
 * - Who can reject: QM, Lead Auditor, Auditor
 * - Status: Only proposed
 * - Changes status to 'rejected', stores rejection reason
 */
const rejectCorrectiveAction = async (req, res) => {
  try {
    const { auditId, findingId, actionId } = req.params;
    const { rejection_reason } = req.body;

    // Validation
    if (!rejection_reason || rejection_reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    if (rejection_reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason must be at least 10 characters'
      });
    }

    // Get corrective action with all necessary associations
    const correctiveAction = await CorrectiveAction.findOne({
      where: { 
        id: actionId,
        finding_id: findingId
      },
      include: [
        {
          model: AuditFinding,
          as: 'finding',
          where: { audit_id: auditId },
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
          ]
        }
      ]
    });

    if (!correctiveAction) {
      return res.status(404).json({
        success: false,
        message: 'Corrective action not found'
      });
    }

    // Check status - can only reject proposed actions
    if (correctiveAction.status !== 'proposed') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject corrective action with status: ${correctiveAction.status}. Only proposed actions can be rejected.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor OR Auditor
    const isQM = req.user.role === 'quality_manager';
    
    // Check if user is lead auditor or auditor on this audit
    const isAuditor = correctiveAction.finding.audit.teamMembers?.some(
      member => member.id === req.user.id && 
      (member.AuditTeam?.role === 'lead_auditor' || member.AuditTeam?.role === 'auditor')
    );

    if (!isQM && !isAuditor) {
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager, Lead Auditor, or Auditors can reject corrective actions'
      });
    }

    // Reject the corrective action
    correctiveAction.status = 'rejected';
    correctiveAction.rejection_reason = rejection_reason.trim();
    await correctiveAction.save();

    // Reload with associations
    await correctiveAction.reload({
      include: [
        { model: User, as: 'responsibleUser', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'proposer', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Corrective action rejected',
      data: { correctiveAction }
    });

  } catch (error) {
    console.error('Reject corrective action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject corrective action',
      error: error.message
    });
  }
};

// ============================================
// EDIT CORRECTIVE ACTION
// ============================================

/**
 * Edit a corrective action
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId
 * Body: { proposed_action, root_cause_analysis, responsible_user_id, expected_completion_date }
 * 
 * - QM and auditee can edit
 * - Status: Only 'rejected' 
 */
const editCorrectiveAction = async (req, res) => {
  try {
    const { auditId, findingId, actionId } = req.params;
    const { 
      proposed_action, 
      root_cause_analysis, 
      responsible_user_id, 
      expected_completion_date 
    } = req.body;

    // Validation
    if (!proposed_action || !responsible_user_id || !expected_completion_date) {
      return res.status(400).json({
        success: false,
        message: 'Proposed action, responsible user, and expected completion date are required'
      });
    }

    // Get corrective action with all necessary associations
    const correctiveAction = await CorrectiveAction.findOne({
      where: { 
        id: actionId,
        finding_id: findingId
      },
      include: [
        {
          model: AuditFinding,
          as: 'finding',
          where: { audit_id: auditId },
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
          ]
        }
      ]
    });

    if (!correctiveAction) {
      return res.status(404).json({
        success: false,
        message: 'Corrective action not found'
      });
    }

    // Check status - can only edit rejected actions
    if (correctiveAction.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit corrective action with status: ${correctiveAction.status}. Only rejected actions can be edited.`
      });
    }

    // Authorization: Quality Manager OR Auditee
    const isQM = req.user.role === 'quality_manager';
    
    // Check if user is an auditee on this audit
    const isAuditee = correctiveAction.finding.audit.teamMembers?.some(
      member => member.id === req.user.id && member.AuditTeam?.role === 'auditee'
    );

    if (!isQM && !isAuditee) {
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Auditees can edit corrective actions'
      });
    }

    // Verify responsible user exists
    const responsibleUser = await User.findOne({
      where: {
        id: responsible_user_id,
        company_id: req.user.companyId,
        is_active: true
      }
    });

    if (!responsibleUser) {
      return res.status(404).json({
        success: false,
        message: 'Responsible user not found'
      });
    }

    // Update corrective action
    correctiveAction.proposed_action = proposed_action.trim();
    correctiveAction.root_cause_analysis = root_cause_analysis ? root_cause_analysis.trim() : null;
    correctiveAction.responsible_user_id = responsible_user_id;
    correctiveAction.expected_completion_date = expected_completion_date;
    
    // After editing, status goes back to 'proposed' for re-approval
    correctiveAction.status = 'proposed';
    correctiveAction.rejection_reason = null;  // Clear rejection reason
    
    await correctiveAction.save();

    // Reload with associations
    await correctiveAction.reload({
      include: [
        { model: User, as: 'responsibleUser', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'proposer', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Corrective action updated successfully',
      data: { correctiveAction }
    });

  } catch (error) {
    console.error('Edit corrective action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit corrective action',
      error: error.message
    });
  }
};

// ============================================
// APPROVE CORRECTIVE ACTION
// ============================================

/**
 * Approve a corrective action
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/approve
 * 
 * - QM, Lead Auditor, Auditor can approve
 * - Changes status to 'in_implementation'
 * - Updates finding status to 'in_progress' (if not already)
 * - Records approver and approval timestamp
 */
const approveCorrectiveAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { auditId, findingId, actionId } = req.params;

    // Get corrective action with all necessary associations
    const correctiveAction = await CorrectiveAction.findOne({
      where: { 
        id: actionId,
        finding_id: findingId
      },
      include: [
        {
          model: AuditFinding,
          as: 'finding',
          where: { audit_id: auditId },
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
          ]
        }
      ],
      transaction
    });

    if (!correctiveAction) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Corrective action not found'
      });
    }

    // Check status - can only approve proposed actions
    if (correctiveAction.status !== 'proposed') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot approve corrective action with status: ${correctiveAction.status}. Only proposed actions can be approved.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor OR Auditor
    const isQM = req.user.role === 'quality_manager';
    
    // Check if user is lead auditor or auditor on this audit
    const isAuditor = correctiveAction.finding.audit.teamMembers?.some(
      member => member.id === req.user.id && 
      (member.AuditTeam?.role === 'lead_auditor' || member.AuditTeam?.role === 'auditor')
    );

    if (!isQM && !isAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager, Lead Auditor, or Auditors can approve corrective actions'
      });
    }

    // Approve corrective action
    correctiveAction.status = 'in_implementation';  // Status after approval
    correctiveAction.approved_by = req.user.id;
    correctiveAction.approved_at = new Date();
    correctiveAction.rejection_reason = null;  // Clear any rejection reason
    await correctiveAction.save({ transaction });

    // Update finding status to 'in_progress' if not already
    const finding = correctiveAction.finding;
    if (finding.status === 'open') {
      finding.status = 'in_progress';
      await finding.save({ transaction });
    }

    // Reload with associations
    await correctiveAction.reload({
      include: [
        { model: User, as: 'responsibleUser', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'proposer', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] }
      ],
      transaction 
    });

    // Commit AFTER reload succeeds
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Corrective action approved successfully',
      data: { correctiveAction }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Approve corrective action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve corrective action',
      error: error.message
    });
  }
};

// ============================================
// IMPLEMENT CORRECTIVE ACTION
// ============================================

/**
 * Implement corrective action (add evidence and send to verification)
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/implement
 * Body: { implementation_evidence }
 * 
 * - QM and Auditee can implement
 * - Only 'in_implementation'
 * - Changes status to 'pending_verification'
 */
const implementCorrectiveAction = async (req, res) => {
  try {
    const { auditId, findingId, actionId } = req.params;
    const { implementation_evidence } = req.body;

    // Validation
    if (!implementation_evidence || implementation_evidence.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Implementation evidence is required'
      });
    }

    if (implementation_evidence.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Implementation evidence must be at least 10 characters'
      });
    }

    // Get corrective action with all necessary associations
    const correctiveAction = await CorrectiveAction.findOne({
      where: { 
        id: actionId,
        finding_id: findingId
      },
      include: [
        {
          model: AuditFinding,
          as: 'finding',
          where: { audit_id: auditId },
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
          ]
        }
      ]
    });

    if (!correctiveAction) {
      return res.status(404).json({
        success: false,
        message: 'Corrective action not found'
      });
    }

    // Check status - can only implement actions in_implementation
    if (correctiveAction.status !== 'in_implementation') {
      return res.status(400).json({
        success: false,
        message: `Cannot implement corrective action with status: ${correctiveAction.status}. Only actions in implementation can be marked as implemented.`
      });
    }

    // Authorization: Quality Manager OR Auditee
    const isQM = req.user.role === 'quality_manager';
    
    // Check if user is an auditee on this audit
    const isAuditee = correctiveAction.finding.audit.teamMembers?.some(
      member => member.id === req.user.id && member.AuditTeam?.role === 'auditee'
    );

    if (!isQM && !isAuditee) {
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager or Auditees can implement corrective actions'
      });
    }

    // Implement the corrective action
    correctiveAction.implementation_evidence = implementation_evidence.trim();
    correctiveAction.status = 'pending_verification';
    correctiveAction.actual_completion_date = new Date();  // Record when implemented
    correctiveAction.rejection_reason = null;  // Clear any rejection reason
    await correctiveAction.save();

    // Reload with associations
    await correctiveAction.reload({
      include: [
        { model: User, as: 'responsibleUser', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'proposer', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });

    // Track achievement AFTER commit - never inside transaction
    // Service handles its own errors so this never breaks the response
    const achievements = await achievementService.track(
      req.user.id,
      req.user.companyId,
      'ca_implemented',
      correctiveAction.id,
      'corrective_actions'
    );

    res.status(200).json({
      success: true,
      message: 'Corrective action implemented and sent for verification',
      data: { correctiveAction },
      achievements  // { progress: [], newlyEarned: [] }
    });

  } catch (error) {
    console.error('Implement corrective action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to implement corrective action',
      error: error.message
    });
  }
};


// ============================================
// VERIFY CORRECTIVE ACTION
// ============================================

/**
 * Verify corrective action effectiveness
 * PUT /api/audits/:auditId/findings/:findingId/corrective-actions/:actionId/verify
 * Body: { decision, rejection_reason }
 * 
 * BUSINESS RULES:
 * - QM, Lead Auditor, Auditor can verify
 * - Only pending_verification
 * - 'approved' status changes to 'completed'
 * - 'rejected' status changes back to 'in_implementation'
 * - If all CAs completed, finding status changes to 'closed'
 */
const verifyCorrectiveAction = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { auditId, findingId, actionId } = req.params;
    const { decision, rejection_reason } = req.body;

    // Validation
    if (!decision || !['approved', 'rejected'].includes(decision)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Decision must be either "approved" or "rejected"'
      });
    }

    // If rejecting, rejection_reason is required
    if (decision === 'rejected') {
      if (!rejection_reason || rejection_reason.trim().length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting verification'
        });
      }

      if (rejection_reason.trim().length < 10) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Rejection reason must be at least 10 characters'
        });
      }
    }

    // Get corrective action with all necessary associations
    const correctiveAction = await CorrectiveAction.findOne({
      where: { 
        id: actionId,
        finding_id: findingId
      },
      include: [
        {
          model: AuditFinding,
          as: 'finding',
          where: { audit_id: auditId },
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
          ]
        }
      ],
      transaction
    });

    if (!correctiveAction) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Corrective action not found'
      });
    }

    // Check status - can only verify actions pending_verification
    if (correctiveAction.status !== 'pending_verification') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot verify corrective action with status: ${correctiveAction.status}. Only actions pending verification can be verified.`
      });
    }

    // Authorization: Quality Manager OR Lead Auditor OR Auditor
    const isQM = req.user.role === 'quality_manager';
    
    // Check if user is lead auditor or auditor on this audit
    const isAuditor = correctiveAction.finding.audit.teamMembers?.some(
      member => member.id === req.user.id && 
      (member.AuditTeam?.role === 'lead_auditor' || member.AuditTeam?.role === 'auditor')
    );

    if (!isQM && !isAuditor) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only Quality Manager, Lead Auditor, or Auditors can verify corrective actions'
      });
    }

    // Apply decision
    if (decision === 'approved') {
      // Approve: Mark as completed
      correctiveAction.status = 'completed';
      correctiveAction.verified_by = req.user.id;
      correctiveAction.verified_at = new Date();
      correctiveAction.rejection_reason = null;  // Clear any rejection reason
    } else {
      // Reject: Send back to implementation with reason
      correctiveAction.status = 'in_implementation';
      correctiveAction.rejection_reason = rejection_reason.trim();
      correctiveAction.verified_by = null;  // Clear previous verification
      correctiveAction.verified_at = null;
    }

    await correctiveAction.save({ transaction });

    // Check if all corrective actions for this finding are completed
    const allCorrectiveActions = await CorrectiveAction.findAll({
      where: { finding_id: findingId },
      transaction
    });

    const allCompleted = allCorrectiveActions.every(ca => ca.status === 'completed');

    // If all CAs are completed, update finding status to closed
    if (allCompleted && allCorrectiveActions.length > 0) {
      const finding = correctiveAction.finding;
      finding.status = 'pending_verification';
      await finding.save({ transaction });
    }
    
    // Reload with associations
    await correctiveAction.reload({
      include: [
        { model: User, as: 'responsibleUser', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'proposer', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'verifier', attributes: ['id', 'first_name', 'last_name'] }
      ],
      transaction
    });

    // Commit AFTER reload
    await transaction.commit();

    // Only track achievement when corrective action is approved (completed)
    // Rejected decisions don't count toward achievements
    let achievements = null;
    if (decision === 'approved') {
      achievements = await achievementService.track(
        req.user.id,
        req.user.companyId,
        'ca_completed',
        correctiveAction.id,
        'corrective_actions'
      );
    }

    res.status(200).json({
      success: true,
      message: decision === 'approved' 
        ? 'Corrective action verified and marked as completed'
        : 'Corrective action sent back to implementation',
      data: { correctiveAction },
      // Only included in response when approved, null otherwise
      ...(achievements && { achievements })
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Verify corrective action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify corrective action',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getAllCorrectiveActions,
  createCorrectiveAction,
  deleteCorrectiveAction,
  rejectCorrectiveAction,
  editCorrectiveAction,
  approveCorrectiveAction,
  implementCorrectiveAction,
  verifyCorrectiveAction
};