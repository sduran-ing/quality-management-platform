// Import models
const { 
  User, 
  Audit, 
  AuditTeam, 
  AuditFinding, 
  CorrectiveAction,
  Document,
  DocumentVersion,
  AuditProcess,
  AuditStandard,
  Process,
  Standard
} = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { getQuarterStart } = require('../utils/formattersUtils');

/**
 * Get dashboard statistics for the current user
 * Returns counts for: open corrective actions, open findings, my audits
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Count 1: Open Corrective Actions
    // Corrective actions assigned to me that are not completed
    const openCorrectiveActionsCount = await CorrectiveAction.count({
      where: {
        responsible_user_id: userId,
        // Op.in operator is used with an array of values to select records where a specific column's value 
        // matches any value within that array. This is a shorthand for multiple OR conditions in SQL
        status: {
          [Op.in]: ['proposed', 'rejected', 'in_implementation', 'pending_verification']
        }
      },
      include: [{
        model: AuditFinding,
        as: 'finding',
        required: true,
        include: [{
          model: Audit,
          as: 'audit',
          where: { company_id: companyId },
          required: true
        }]
      }]
    });

    // Count 2: Open Findings
    // Findings where I'm a team member (any role) and finding is not closed
    const openFindingsCount = await AuditFinding.count({
      where: {
        status: {
          [Op.in]: ['open', 'in_progress', 'pending_verification']
        }
      },
      include: [{
        model: Audit,
        as: 'audit',
        where: { company_id: companyId },
        required: true,
        include: [{
          model: AuditTeam,
          as: 'teamAssignments',
          where: { auditor_id: userId },
          required: true
        }]
      }]
    });

    // Count 3: My Audits
    // Audits where I'm a team member and audit is active
    const myAuditsCount = await Audit.count({
      where: {
        company_id: companyId,
        status: {
          [Op.in]: ['scheduled', 'in_progress']
        }
      },
      include: [{
        model: AuditTeam,
        as: 'teamAssignments',
        where: { auditor_id: userId },
        required: true
      }]
    });

    // For "this quarter" trend - count audits from this quarter
    const quarterStart = getQuarterStart(new Date());
    const myAuditsThisQuarter = await Audit.count({
      where: {
        company_id: companyId,
        created_at: {
          // Op.gte is the "greater than or equal to" comparison operator
          [Op.gte]: quarterStart
        }
      },
      include: [{
        model: AuditTeam,
        as: 'teamAssignments',
        where: { auditor_id: userId },
        required: true
      }]
    });

    res.json({
      success: true,
      data: {
        openCorrectiveActions: openCorrectiveActionsCount,
        openFindings: openFindingsCount,
        myAudits: myAuditsCount,
        myAuditsThisQuarter: myAuditsThisQuarter
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get document version status distribution for the current user
 * Returns count of document versions by status based on user involvement
 * 
 * COUNTING RULES:
 * - Draft: Count when user CREATED the version (created_by)
 * - Pending: Count when user is ASSIGNED to approve (assigned_approver_id)
 * - Approved: Count when user APPROVED it (approved_by)
 * - No double counting (one version = one status)
 */
const getDocumentStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    /**
     * QUERY CONSTRUCTION:
     * 
     * Step 1: Query DocumentVersion table (we're counting versions)
     * Step 2: Filter by company through Document join
     * Step 3: Apply role-based status filters with OR conditions
     * Step 4: Group by status
     * Step 5: Count versions in each status
     */
    const versionStats = await DocumentVersion.findAll({
      /**
       * WHERE CLAUSE
       * 
       * Each OR branch represents each rule
       * We use OR Because a version matches if ANY condition is true
       * Each version has only ONE status, so no double counting
       */
      where: {
        [Op.or]: [

          // CONDITION 1: DRAFT VERSIONS - Show drafts the user is working on
          {
            status: 'draft',
            created_by: userId  // User is the creator
          },
          
          // CONDITION 2: PENDING APPROVAL VERSIONS - Show versions waiting for user's approval
          {
            status: 'pending_approval',
            assigned_approver_id: userId  // User is the assigned approver
          },
          
          // CONDITION 3: APPROVED VERSIONS - Show versions the user has approved
          {
            status: 'approved',
            approved_by: userId  // User is the one who approved
          }
        ]
      },

      /**
       * INCLUDE - Join with Document for company filtering 
       */
      include: [
        {
          model: Document,
          as: 'document',
          attributes: [],  // Don't need document fields in result
          where: {
            company_id: companyId  // Only versions from user's company
          },
          required: true  // INNER JOIN - version must have valid document
        }
      ],

      /**
       * ATTRIBUTES - What to select and how to aggregate
       * 
       * 1. status - Group by this field
       * 2. COUNT(DocumentVersion.id) - Count versions in each group
       * 
       * This returns: [{ status: 'draft', count: '5' }, ...]
       */
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('DocumentVersion.id')), 'count']
      ],

      /**
       * GROUP BY - Aggregate by status
       * 
       * This groups all versions with same status together
       * Then COUNT aggregates them
       */
      group: ['status'],

      /**
       * RAW - Return plain objects instead of Sequelize instances
       * 
       * Makes the result easier to work with
       * Result: [{ status: 'draft', count: '5' }] instead of model instances
       */
      raw: true
    });

    /**
     * TRANSFORM RESULTS
     * 
     * Convert array of status counts into object format
     * Initialize all counts to 0 (in case status has no versions)
     */
    const stats = {
      draft: 0,
      pending: 0,
      approved: 0
    };

    /**
     * MAP DATABASE RESULTS TO RESPONSE FORMAT
     * 
     * versionStats format: [{ status: 'draft', count: '5' }, ...]
     * We transform to: { draft: 5, pending: 3, approved: 12 }
     */
    versionStats.forEach(stat => {
      const count = parseInt(stat.count);
      
      if (stat.status === 'draft') {
        stats.draft = count;
      } else if (stat.status === 'pending_approval') {
        stats.pending = count;
      } else if (stat.status === 'approved') {
        stats.approved = count;
      }
    });

    // Response
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document statistics',
      error: error.message
    });
  }
};


/**
 * Get upcoming audits
 * Returns next 5 scheduled or in-progress audits where user is a team member
 * Sorted by end date (soonest first)
 */
const getUpcomingAudits = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Get upcoming audits where user is ANY team member
    const audits = await Audit.findAll({
      where: {
        company_id: companyId,
        status: {
          [Op.in]: ['scheduled', 'in_progress']
        }
      },
      include: [
        {
          // Include ALL team members
          model: AuditTeam,
          as: 'teamAssignments',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name']
          }]
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
        }
      ],
      order: [['scheduled_end_date', 'ASC']], // Soonest first
    });

    // Filter to only audits where current user is a team member
    const userAudits = audits.filter(audit => 
      audit.teamAssignments.some(member => member.auditor_id === userId)
    );

    // Take first 5
    const limitedAudits = userAudits.slice(0, 5);

    // Format response
    const formattedAudits = limitedAudits.map(audit => {
      // Find lead auditor from team
      const leadAuditor = audit.teamAssignments.find(member => member.role === 'lead_auditor');
      
      return {
        id: audit.id,
        title: audit.title,
        scheduledStartDate: audit.scheduled_start_date,
        scheduledEndDate: audit.scheduled_end_date,
        status: audit.status,
        leadAuditor: leadAuditor ? {
          id: leadAuditor.user.id,
          firstName: leadAuditor.user.first_name,
          lastName: leadAuditor.user.last_name
        } : null,
        processes: audit.processes,
        standards: audit.standards
      };
    });

    res.json({
      success: true,
      data: {
        audits: formattedAudits
      }
    });

  } catch (error) {
    console.error('Get upcoming audits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve upcoming audits',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getDocumentStats,
  getUpcomingAudits
};