'use strict';

/**
 * ============================================================================
 * SEEDER: Updated Achievements
 * ============================================================================
 * 
 * 33 achievements across 11 categories × 3 levels each
 * 
 * Rules:
 * - criteria_value: 1 / 2 / 3 per level (easy to earn in demo)
 * - points: 10 / 25 / 50 per level
 * - icon: For easy maintainance Lucide icon name (mapped in frontend), in the future will change
 *   to url for more personalization (but requires storage of the images)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // Clear existing achievements before inserting new ones
    await queryInterface.bulkDelete('achievements', null, {});

    const achievements = [

      // ============================================
      // AUDIT SCHEDULING (audit_scheduled)
      // ============================================
      {
        name: 'First Step',
        description: 'Schedule your first audit',
        icon_url: 'Calendar',
        points: 10,
        criteria_type: 'audit_scheduled',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Planning Ahead',
        description: 'Schedule 2 audits',
        icon_url: 'Calendar',
        points: 25,
        criteria_type: 'audit_scheduled',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Audit Planner',
        description: 'Schedule 3 audits',
        icon_url: 'Calendar',
        points: 50,
        criteria_type: 'audit_scheduled',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // AUDIT COMPLETION (audit_completed)
      // ============================================
      {
        name: 'Audit Initiated',
        description: 'Complete your first audit',
        icon_url: 'ClipboardCheck',
        points: 10,
        criteria_type: 'audit_completed',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Audit Champion',
        description: 'Complete 2 audits',
        icon_url: 'ClipboardCheck',
        points: 25,
        criteria_type: 'audit_completed',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Audit Master',
        description: 'Complete 3 audits',
        icon_url: 'ClipboardCheck',
        points: 50,
        criteria_type: 'audit_completed',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // FINDING CREATION (finding_created)
      // ============================================
      {
        name: 'Eagle Eye',
        description: 'Create your first finding',
        icon_url: 'Search',
        points: 10,
        criteria_type: 'finding_created',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Sharp Observer',
        description: 'Create 2 findings',
        icon_url: 'Search',
        points: 25,
        criteria_type: 'finding_created',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Finding Expert',
        description: 'Create 3 findings',
        icon_url: 'Search',
        points: 50,
        criteria_type: 'finding_created',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // FINDING CLOSURE (finding_closed)
      // ============================================
      {
        name: 'Problem Solver',
        description: 'Close your first finding',
        icon_url: 'CheckCircle',
        points: 10,
        criteria_type: 'finding_closed',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Swift Resolver',
        description: 'Close 2 findings',
        icon_url: 'CheckCircle',
        points: 25,
        criteria_type: 'finding_closed',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Resolution Expert',
        description: 'Close 3 findings',
        icon_url: 'CheckCircle',
        points: 50,
        criteria_type: 'finding_closed',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // CORRECTIVE ACTION PROPOSAL (ca_proposed)
      // ============================================
      {
        name: 'First Fix',
        description: 'Propose your first corrective action',
        icon_url: 'AlertCircle',
        points: 10,
        criteria_type: 'ca_proposed',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Action Taker',
        description: 'Propose 2 corrective actions',
        icon_url: 'AlertCircle',
        points: 25,
        criteria_type: 'ca_proposed',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Improvement Driver',
        description: 'Propose 3 corrective actions',
        icon_url: 'AlertCircle',
        points: 50,
        criteria_type: 'ca_proposed',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // CORRECTIVE ACTION IMPLEMENTATION (ca_implemented)
      // ============================================
      {
        name: 'Problem Fighter',
        description: 'Implement your first corrective action',
        icon_url: 'Wrench',
        points: 10,
        criteria_type: 'ca_implemented',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Change Maker',
        description: 'Implement 2 corrective actions',
        icon_url: 'Wrench',
        points: 25,
        criteria_type: 'ca_implemented',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Execution Expert',
        description: 'Implement 3 corrective actions',
        icon_url: 'Wrench',
        points: 50,
        criteria_type: 'ca_implemented',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // CORRECTIVE ACTION COMPLETION (ca_completed)
      // ============================================
      {
        name: 'Quality Guardian',
        description: 'Complete your first corrective action',
        icon_url: 'ShieldCheck',
        points: 10,
        criteria_type: 'ca_completed',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Verification Pro',
        description: 'Complete 2 corrective actions',
        icon_url: 'ShieldCheck',
        points: 25,
        criteria_type: 'ca_completed',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Excellence Enforcer',
        description: 'Complete 3 corrective actions',
        icon_url: 'ShieldCheck',
        points: 50,
        criteria_type: 'ca_completed',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // DOCUMENT PROPOSAL (document_proposal)
      // ============================================
      {
        name: 'First Draft',
        description: 'Propose your first document',
        icon_url: 'FilePlus',
        points: 10,
        criteria_type: 'document_proposal',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Content Creator',
        description: 'Propose 2 documents',
        icon_url: 'FilePlus',
        points: 25,
        criteria_type: 'document_proposal',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Documentation Starter',
        description: 'Propose 3 documents',
        icon_url: 'FilePlus',
        points: 50,
        criteria_type: 'document_proposal',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // DOCUMENT APPROVAL (document_approved)
      // ============================================
      {
        name: 'Stamp of Approval',
        description: 'Approve your first document',
        icon_url: 'FileCheck',
        points: 10,
        criteria_type: 'document_approved',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Quality Reviewer',
        description: 'Approve 2 documents',
        icon_url: 'FileCheck',
        points: 25,
        criteria_type: 'document_approved',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Documentation Hero',
        description: 'Approve 3 documents',
        icon_url: 'FileCheck',
        points: 50,
        criteria_type: 'document_approved',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // DOCUMENT UPDATE APPROVAL (document_updated)
      // ============================================
      {
        name: 'Version Controller',
        description: 'Approve your first document update',
        icon_url: 'RefreshCw',
        points: 10,
        criteria_type: 'document_updated',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Continuous Improver',
        description: 'Approve 2 document updates',
        icon_url: 'RefreshCw',
        points: 25,
        criteria_type: 'document_updated',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Evolution Expert',
        description: 'Approve 3 document updates',
        icon_url: 'RefreshCw',
        points: 50,
        criteria_type: 'document_updated',
        criteria_value: 3,
        created_at: new Date()
      },

      // ============================================
      // DOCUMENT OBSOLETING (document_obsoleted)
      // ============================================
      {
        name: 'Archive Keeper',
        description: 'Obsolete your first document',
        icon_url: 'Archive',
        points: 10,
        criteria_type: 'document_obsoleted',
        criteria_value: 1,
        created_at: new Date()
      },
      {
        name: 'Quality Curator',
        description: 'Obsolete 2 documents',
        icon_url: 'Archive',
        points: 25,
        criteria_type: 'document_obsoleted',
        criteria_value: 2,
        created_at: new Date()
      },
      {
        name: 'Legacy Manager',
        description: 'Obsolete 3 documents',
        icon_url: 'Archive',
        points: 50,
        criteria_type: 'document_obsoleted',
        criteria_value: 3,
        created_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('achievements', achievements);

    console.log('Achievements seeded successfully');
    console.log(`Inserted ${achievements.length} achievements across 11 categories`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('achievements', null, {});
    console.log('All achievements removed');
  }
};