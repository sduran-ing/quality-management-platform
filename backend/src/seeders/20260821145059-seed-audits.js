'use strict';

/**
 * ============================================================================
 * SEEDER: Audits + Findings + Corrective Actions
 * ============================================================================
 *
 * Seeds 2 audits for Emerald Software Inc demonstrating the full audit
 * lifecycle — one completed and one in progress.
 *
 * AUDIT 1 — Completed (Software Development process, Q1 2026)
 *   Finding F-001: major_nonconformity → closed
 *     CA-001: completed
 *     CA-002: completed
 *   Finding F-002: opportunity → closed
 *     CA-003: completed
 *     CA-004: completed
 *
 * AUDIT 2 — In Progress (Quality Control process, Q2 2026)
 *   Finding F-001: major_nonconformity → open
 *     CA-001: proposed
 *
 * TEAM (both audits):
 *   Santiago Duran → lead_auditor
 *   Demo User      → auditee
 *
 * JUNCTION TABLES seeded:
 *   audit_team, audit_processes, audit_standards
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ==========================================
    // STEP 1: GATHER ALL REQUIRED IDs
    // ==========================================

    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (!company) throw new Error('Company not found. Run seed-company.js first.');

    // Users
    const users = await queryInterface.sequelize.query(
      `SELECT id, email FROM users WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getUserId = (email) => users.find(u => u.email === email)?.id;
    const santiagoId = getUserId('santiago@emeraldsoftware.dev');
    const demoId = getUserId('demo@emeraldsoftware.dev');

    // Processes
    const processes = await queryInterface.sequelize.query(
      `SELECT id, acronym FROM processes WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getProcId = (acronym) => processes.find(p => p.acronym === acronym)?.id;

    // ISO 9001:2015 standard
    const [standard] = await queryInterface.sequelize.query(
      `SELECT id FROM standards WHERE name = 'ISO 9001' AND version = '2015'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (!standard) throw new Error('ISO 9001 standard not found. Run seed-iso-9001.js first.');

    // Standard requirements — used as finding references
    // Clause 8.3: Design and development (for SD audit finding 1)
    // Clause 7.2: Competence (for SD audit finding 2)
    // Clause 9.1: Monitoring, measurement, analysis (for QC audit finding 1)
    const requirements = await queryInterface.sequelize.query(
      `SELECT id, clause_number FROM standard_requirements WHERE standard_id = ${standard.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getReqId = (clause) => requirements.find(r => r.clause_number === clause)?.id;

    // ==========================================
    // STEP 2: AUDIT 1 — COMPLETED
    // Software Development process, January 2026
    // ==========================================

    console.log('\nSeeding Audit 1 (Completed)...');

    const audit1StartDate = new Date('2026-01-06T09:00:00.000Z');
    const audit1EndDate = new Date('2026-01-10T17:00:00.000Z');

    await queryInterface.bulkInsert('audits', [
      {
        company_id: company.id,
        title: 'ISO 9001:2015 Internal Audit — Software Development Q1 2026',
        audit_type: 'internal',
        status: 'completed',
        description: 'Internal audit of the Software Development process against ISO 9001:2015 requirements. Focused on design and development controls and team competency.',
        scheduled_start_date: audit1StartDate,
        scheduled_end_date: audit1EndDate,
        actual_start_date: audit1StartDate,
        actual_end_date: audit1EndDate,
        created_by: santiagoId,
        created_at: new Date('2025-12-15T10:00:00.000Z'),
        updated_at: audit1EndDate
      }
    ]);

    const [audit1] = await queryInterface.sequelize.query(
      `SELECT id FROM audits 
       WHERE company_id = ${company.id} 
       AND title LIKE '%Software Development Q1 2026%'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Team members for audit 1
    await queryInterface.bulkInsert('audit_team', [
      {
        audit_id: audit1.id,
        auditor_id: santiagoId,
        role: 'lead_auditor',
        assigned_at: new Date('2025-12-15T10:00:00.000Z')
      },
      {
        audit_id: audit1.id,
        auditor_id: demoId,
        role: 'auditee',
        assigned_at: new Date('2025-12-15T10:00:00.000Z')
      }
    ]);

    // Link audit 1 to SD process
    await queryInterface.bulkInsert('audit_processes', [
      {
        audit_id: audit1.id,
        process_id: getProcId('SD')
      }
    ]);

    // Link audit 1 to ISO 9001:2015
    await queryInterface.bulkInsert('audit_standards', [
      {
        audit_id: audit1.id,
        standard_id: standard.id
      }
    ]);

    console.log(' Audit 1 created and linked');

    // ── FINDING F-001 (Major Nonconformity — Closed) ──────────────────────

    console.log('  Adding Finding F-001 (major_nonconformity, closed)...');

    const finding1ClosedAt = new Date('2026-01-10T16:00:00.000Z');

    await queryInterface.bulkInsert('audit_findings', [
      {
        audit_id: audit1.id,
        finding_number: 'F-001',
        severity: 'major_nonconformity',
        // Clause 8.3: Design and development of products and services
        standard_requirement_id: getReqId('8.3'),
        process_id: getProcId('SD'),
        description:
          'The organization lacks a formal design and development planning procedure. ' +
          'No documented evidence of design reviews was found for the audit period. ' +
          'Development projects are being initiated without documented design inputs, ' +
          'outputs or review approvals as required by clause 8.3.',
        evidence_description:
          'Reviewed project records for Q4 2025. No design review meeting minutes or ' +
          'approval signatures were found in 8 of 10 sampled development projects. ' +
          'Developers confirmed verbally that no formal design review process exists.',
        status: 'closed',
        closed_by: santiagoId,
        closed_at: finding1ClosedAt,
        created_by: santiagoId,
        created_at: new Date('2026-01-07T10:00:00.000Z'),
        updated_at: finding1ClosedAt
      }
    ]);

    const [finding1] = await queryInterface.sequelize.query(
      `SELECT id FROM audit_findings WHERE audit_id = ${audit1.id} AND finding_number = 'F-001'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // CA-001 for Finding F-001
    await queryInterface.bulkInsert('corrective_actions', [
      {
        finding_id: finding1.id,
        action_number: 'CA-001',
        proposed_action:
          'Establish and implement a Design and Development Planning Procedure that defines ' +
          'the required stages, review points, responsibilities and approval criteria for all ' +
          'software development projects. Templates for design inputs, outputs and review ' +
          'records must be included.',
        root_cause_analysis:
          'The design and development process was historically informal and undocumented. ' +
          'As the team grew from 3 to 12 developers, tribal knowledge was insufficient to ' +
          'maintain consistency. No formal process owner was assigned for this activity.',
        responsible_user_id: demoId,
        expected_completion_date: new Date('2026-01-31T17:00:00.000Z'),
        actual_completion_date: new Date('2026-01-28T15:00:00.000Z'),
        implementation_evidence:
          'Procedure SD-PR-001 "Software Development Procedure" was created, reviewed and ' +
          'approved. Document code SD-PR-001 v1.0 approved on Jan 28, 2026.',
        status: 'completed',
        proposed_by: demoId,
        proposed_at: new Date('2026-01-08T09:00:00.000Z'),
        approved_by: santiagoId,
        approved_at: new Date('2026-01-09T10:00:00.000Z'),
        verified_by: santiagoId,
        verified_at: new Date('2026-02-01T11:00:00.000Z'),
        rejection_reason: null
      },
      // CA-002 for Finding F-001
      {
        finding_id: finding1.id,
        action_number: 'CA-002',
        proposed_action:
          'Conduct a mandatory training session for all Software Development team members ' +
          'on the new Design and Development Planning Procedure. Training records must be ' +
          'signed and retained as quality records.',
        root_cause_analysis:
          'Developers were unaware of ISO 9001:2015 clause 8.3 requirements. ' +
          'No QMS onboarding or refresher training had been provided to the team.',
        responsible_user_id: demoId,
        expected_completion_date: new Date('2026-02-15T17:00:00.000Z'),
        actual_completion_date: new Date('2026-02-10T16:00:00.000Z'),
        implementation_evidence:
          'Training session conducted on Feb 10, 2026. Attendance records signed by ' +
          '12 team members. Training materials archived in the QMS document library.',
        status: 'completed',
        proposed_by: demoId,
        proposed_at: new Date('2026-01-08T09:30:00.000Z'),
        approved_by: santiagoId,
        approved_at: new Date('2026-01-09T10:00:00.000Z'),
        verified_by: santiagoId,
        verified_at: new Date('2026-02-12T14:00:00.000Z'),
        rejection_reason: null
      }
    ]);

    console.log('F-001 + CA-001 + CA-002 created');

    // ── FINDING F-002 (Opportunity — Closed) ──────────────────────────────

    console.log('  Adding Finding F-002 (opportunity, closed)...');

    await queryInterface.bulkInsert('audit_findings', [
      {
        audit_id: audit1.id,
        finding_number: 'F-002',
        severity: 'opportunity',
        // Clause 7.2: Competence
        standard_requirement_id: getReqId('7.2'),
        process_id: getProcId('SD'),
        description:
          'Opportunity identified to enhance the competency assessment process for software ' +
          'developers. While developers are qualified, no formal skills matrix exists to ' +
          'identify training needs systematically or plan professional development activities.',
        evidence_description:
          'HR records reviewed. Individual CVs and certificates on file but no consolidated ' +
          'skills matrix or competency gap analysis exists. Team leads confirmed competency ' +
          'assessments are done informally during annual reviews only.',
        status: 'closed',
        closed_by: santiagoId,
        closed_at: finding1ClosedAt,
        created_by: santiagoId,
        created_at: new Date('2026-01-07T14:00:00.000Z'),
        updated_at: finding1ClosedAt
      }
    ]);

    const [finding2] = await queryInterface.sequelize.query(
      `SELECT id FROM audit_findings WHERE audit_id = ${audit1.id} AND finding_number = 'F-002'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // CA-003 and CA-004 for Finding F-002
    await queryInterface.bulkInsert('corrective_actions', [
      {
        finding_id: finding2.id,
        action_number: 'CA-003',
        proposed_action:
          'Develop a Skills Matrix for the Software Development team covering technical ' +
          'competencies (languages, frameworks, tools) and soft skills. The matrix must ' +
          'identify current proficiency levels and target levels per role.',
        root_cause_analysis:
          'Competency management was handled informally as the team was small. ' +
          'Rapid team growth made informal management insufficient for ISO 9001 compliance.',
        responsible_user_id: demoId,
        expected_completion_date: new Date('2026-02-28T17:00:00.000Z'),
        actual_completion_date: new Date('2026-02-25T16:00:00.000Z'),
        implementation_evidence:
          'Skills Matrix v1.0 completed and reviewed by all team leads on Feb 25, 2026. ' +
          'Stored in the HR document management folder.',
        status: 'completed',
        proposed_by: demoId,
        proposed_at: new Date('2026-01-08T10:00:00.000Z'),
        approved_by: santiagoId,
        approved_at: new Date('2026-01-09T10:30:00.000Z'),
        verified_by: santiagoId,
        verified_at: new Date('2026-03-01T10:00:00.000Z'),
        rejection_reason: null
      },
      {
        finding_id: finding2.id,
        action_number: 'CA-004',
        proposed_action:
          'Implement quarterly competency reviews using the Skills Matrix. Each quarter, ' +
          'team leads will assess their direct reports, identify gaps and propose training ' +
          'actions. Training plans must be documented and tracked to completion.',
        root_cause_analysis:
          'No systematic cadence existed for competency reviews beyond the annual HR cycle.',
        responsible_user_id: demoId,
        expected_completion_date: new Date('2026-03-31T17:00:00.000Z'),
        actual_completion_date: new Date('2026-03-28T15:00:00.000Z'),
        implementation_evidence:
          'First quarterly competency review conducted in March 2026. ' +
          '3 training plans raised and approved. Review records signed by all team leads.',
        status: 'completed',
        proposed_by: demoId,
        proposed_at: new Date('2026-01-08T10:30:00.000Z'),
        approved_by: santiagoId,
        approved_at: new Date('2026-01-09T10:30:00.000Z'),
        verified_by: santiagoId,
        verified_at: new Date('2026-04-01T09:00:00.000Z'),
        rejection_reason: null
      }
    ]);

    console.log('F-002 + CA-003 + CA-004 created');

    // ==========================================
    // STEP 3: AUDIT 2 — IN PROGRESS
    // Quality Control process, April 2026
    // ==========================================

    console.log('\nSeeding Audit 2 (In Progress)...');

    const audit2StartDate = new Date('2026-04-07T09:00:00.000Z');

    await queryInterface.bulkInsert('audits', [
      {
        company_id: company.id,
        title: 'ISO 9001:2015 Internal Audit — Quality Control Q2 2026',
        audit_type: 'internal',
        status: 'in_progress',
        description: 'Internal audit of the Quality Control process against ISO 9001:2015 requirements. Focused on monitoring, measurement and performance evaluation activities.',
        scheduled_start_date: audit2StartDate,
        scheduled_end_date: new Date('2026-04-11T17:00:00.000Z'),
        actual_start_date: audit2StartDate,
        actual_end_date: null,   // Still in progress
        created_by: santiagoId,
        created_at: new Date('2026-03-20T10:00:00.000Z'),
        updated_at: audit2StartDate
      }
    ]);

    const [audit2] = await queryInterface.sequelize.query(
      `SELECT id FROM audits 
       WHERE company_id = ${company.id} 
       AND title LIKE '%Quality Control Q2 2026%'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Team members for audit 2
    await queryInterface.bulkInsert('audit_team', [
      {
        audit_id: audit2.id,
        auditor_id: santiagoId,
        role: 'lead_auditor',
        assigned_at: new Date('2026-03-20T10:00:00.000Z')
      },
      {
        audit_id: audit2.id,
        auditor_id: demoId,
        role: 'auditee',
        assigned_at: new Date('2026-03-20T10:00:00.000Z')
      }
    ]);

    // Link audit 2 to QC process
    await queryInterface.bulkInsert('audit_processes', [
      {
        audit_id: audit2.id,
        process_id: getProcId('QC')
      }
    ]);

    // Link audit 2 to ISO 9001:2015
    await queryInterface.bulkInsert('audit_standards', [
      {
        audit_id: audit2.id,
        standard_id: standard.id
      }
    ]);

    console.log('Audit 2 created and linked');

    // ── FINDING F-001 (Major Nonconformity — Open) ────────────────────────

    console.log('  Adding Finding F-001 (major_nonconformity, open)...');

    await queryInterface.bulkInsert('audit_findings', [
      {
        audit_id: audit2.id,
        finding_number: 'F-001',
        severity: 'major_nonconformity',
        // Clause 9.1: Monitoring, measurement, analysis and evaluation
        standard_requirement_id: getReqId('9.1'),
        process_id: getProcId('QC'),
        description:
          'The organization has not established measurable quality objectives with defined ' +
          'targets, monitoring frequency or assigned responsibility as required by clause 9.1. ' +
          'No documented evidence of performance evaluation results or trend analysis was ' +
          'found for the Quality Control process.',
        evidence_description:
          'Requested quality objectives documentation. None could be provided. ' +
          'QC team confirmed objectives are discussed verbally in monthly meetings but ' +
          'no formal targets, baselines or tracking records exist.',
        status: 'open',
        closed_by: null,
        closed_at: null,
        created_by: santiagoId,
        created_at: new Date('2026-04-08T10:00:00.000Z'),
        updated_at: new Date('2026-04-08T10:00:00.000Z')
      }
    ]);

    const [finding3] = await queryInterface.sequelize.query(
      `SELECT id FROM audit_findings WHERE audit_id = ${audit2.id} AND finding_number = 'F-001'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // CA-001 for Finding F-001 (proposed, awaiting approval)
    await queryInterface.bulkInsert('corrective_actions', [
      {
        finding_id: finding3.id,
        action_number: 'CA-001',
        proposed_action:
          'Define and document quality objectives with measurable targets for the Quality ' +
          'Control process. Each objective must include: baseline value, target value, ' +
          'measurement method, monitoring frequency and responsible owner. ' +
          'Results must be reported monthly to management.',
        root_cause_analysis: null,   // Root cause not yet analyzed (proposed stage)
        responsible_user_id: demoId,
        expected_completion_date: new Date('2026-05-15T17:00:00.000Z'),
        actual_completion_date: null,
        implementation_evidence: null,
        status: 'proposed',
        proposed_by: demoId,
        proposed_at: new Date('2026-04-09T11:00:00.000Z'),
        approved_by: null,
        approved_at: null,
        verified_by: null,
        verified_at: null,
        rejection_reason: null
      }
    ]);

    console.log('F-001 + CA-001 (proposed) created');
    console.log('\n Audit seeder complete!');
    console.log('  - Audit 1: completed | 2 findings (closed) | 4 CAs (completed)');
    console.log('  - Audit 2: in_progress | 1 finding (open) | 1 CA (proposed)');
  },

  down: async (queryInterface, Sequelize) => {
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!company) return;

    // Get all audits for this company
    const audits = await queryInterface.sequelize.query(
      `SELECT id FROM audits WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (audits.length === 0) return;

    const auditIds = audits.map(a => a.id);
    const auditIdList = auditIds.join(', ');

    // Get all findings for these audits
    const findings = await queryInterface.sequelize.query(
      `SELECT id FROM audit_findings WHERE audit_id IN (${auditIdList})`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const findingIds = findings.map(f => f.id);

    // Delete corrective actions first (deepest level)
    if (findingIds.length > 0) {
      await queryInterface.sequelize.query(
        `DELETE FROM corrective_actions WHERE finding_id IN (${findingIds.join(', ')})`
      );
    }

    // Delete findings
    await queryInterface.sequelize.query(
      `DELETE FROM audit_findings WHERE audit_id IN (${auditIdList})`
    );

    // Delete junction tables
    await queryInterface.sequelize.query(
      `DELETE FROM audit_team WHERE audit_id IN (${auditIdList})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM audit_processes WHERE audit_id IN (${auditIdList})`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM audit_standards WHERE audit_id IN (${auditIdList})`
    );

    // Delete audits
    await queryInterface.bulkDelete('audits', { company_id: company.id });

    console.log('Audits, findings, corrective actions and junctions removed');
  }
};