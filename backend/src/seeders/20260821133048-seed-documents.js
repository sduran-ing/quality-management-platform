'use strict';

/**
 * ============================================================================
 * SEEDER: Documents + Document Versions
 * ============================================================================
 *
 * Seeds 10 documents for Emerald Software Inc with real PDF files
 * uploaded to Supabase Storage.
 *
 * DOCUMENT STATUSES:
 * - 6 approved     (3 by Santiago, 3 by Demo User)
 * - 2 pending      (1 by Santiago, 1 by Demo User)
 * - 2 obsolete     (1 by Santiago, 1 by Demo User)
 *
 * CIRCULAR DEPENDENCY: documents.current_version_id ↔ document_versions.document_id
 * Resolved with a 3-pass approach per document:
 *   Pass 1: Insert document WITHOUT current_version_id (null)
 *   Pass 2: Insert document_version WITH document_id
 *   Pass 3: UPDATE document SET current_version_id = version.id
 */

require('dotenv').config();
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

// ============================================
// SUPABASE CLIENT
// ============================================

// Initialized at module level — env vars are loaded by Sequelize CLI
// before requiring seeder files, so this is safe.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

// ============================================
// PDF GENERATOR
// ============================================

/**
 * Generates a real PDF buffer using pdfkit.
 *
 * Returns a Promise<Buffer> because pdfkit uses streams:
 * we collect the stream chunks in an array and concat them
 * at the end into a single Buffer.
 *
 * @param {string} title - Document title (shown as heading)
 * @param {string} code - Document code (shown in header e.g. QC-MA-001)
 * @param {string} content - Body text for the document
 * @returns {Promise<Buffer>} - PDF file as a Buffer
 */
const generatePDF = (title, code, content) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    // Collect data chunks as they stream out
    doc.on('data', chunk => buffers.push(chunk));

    // When done, concat all chunks into one Buffer
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Bubble up any PDF generation errors
    doc.on('error', reject);

    // ── HEADER ──────────────────────────────
    doc
      .fontSize(8)
      .font('Helvetica')
      .text('EMERALD SOFTWARE INC', { align: 'center' })
      .text(`Document Code: ${code}`, { align: 'center' })
      .moveDown(0.5);

    // Horizontal rule
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);

    // ── TITLE ───────────────────────────────
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown(1);

    // ── BODY CONTENT ────────────────────────
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(content, { align: 'justify' });

    // ── FOOTER ──────────────────────────────
    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor('#666666')
      .text('This document is the property of Emerald Software Inc. Unauthorized reproduction is prohibited.', {
        align: 'center'
      });

    // Signal end of document — triggers the 'end' event above
    doc.end();
  });
};

// ============================================
// SUPABASE UPLOAD HELPER
// ============================================

/**
 * Uploads a Buffer to Supabase Storage.
 *
 * Uses the same path format as the app's upload middleware:
 * fixed path, same file always overwrites itself without timestamp
 * company-{id}/{sanitizedName}
 * 
 * This prevents orphaned files from the local run with no database record pointing to them. 
 * Storage accumulates junk files over time.
 *
 * @param {Buffer} buffer - File content
 * @param {number} companyId - Used to organize files by company folder
 * @param {string} fileName - Original file name (sanitized before upload)
 * @returns {Promise<string>} - Storage path stored in document_versions.file_url
 */
const uploadToSupabase = async (buffer, companyId, fileName) => {
  // Replace any non-alphanumeric chars (except dots and dashes) with underscores
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `company-${companyId}/${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: true   // overwrite if already exists
    });

  if (error) {
    throw new Error(`Failed to upload ${fileName}: ${error.message}`);
  }

  return data.path;
};

// ============================================
// MAIN SEEDER
// ============================================

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ==========================================
    // STEP 1: GATHER ALL REQUIRED IDs
    // Each foreign key in documents/document_versions
    // is resolved by querying the previously seeded records.
    // ==========================================

    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (!company) throw new Error('Company not found. Run seed-company.js first.');

    // Users: need IDs for created_by, assigned_approver_id, approved_by
    const users = await queryInterface.sequelize.query(
      `SELECT id, email FROM users WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getUserId = (email) => users.find(u => u.email === email)?.id;

    // Departments: need ID for documents.department_id
    const departments = await queryInterface.sequelize.query(
      `SELECT id, name FROM departments WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getDeptId = (name) => departments.find(d => d.name === name)?.id;

    // Processes: need ID for documents.process_id
    const processes = await queryInterface.sequelize.query(
      `SELECT id, acronym FROM processes WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getProcId = (acronym) => processes.find(p => p.acronym === acronym)?.id;

    // Document types: need ID for documents.document_type_id
    const docTypes = await queryInterface.sequelize.query(
      `SELECT id, acronym FROM document_types WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getTypeId = (acronym) => docTypes.find(t => t.acronym === acronym)?.id;

    // Shortcuts for the two QMs
    const santiagoId = getUserId('santiago@emeraldsoftware.dev');
    const demoId = getUserId('demo@emeraldsoftware.dev');

    // ==========================================
    // STEP 2: DEFINE ALL 10 DOCUMENTS
    //
    // Each entry describes one document + its version:
    // - code: unique document identifier
    // - typeAcronym/processAcronym/deptName: FK lookups
    // - createdBy: the QM who uploaded the document
    // - assignedApproverId: the QM assigned to review
    // - approvedBy: null for pending/obsolete workflows
    // - status: document_versions ENUM value
    // - fileName: used as Supabase file name
    // - pdfContent: body text rendered into the PDF
    // ==========================================

    const documentDefinitions = [

      // ────────────────────────────────────────
      // SANTIAGO'S DOCUMENTS (1–5)
      // ────────────────────────────────────────

      {
        code: 'QC-MA-001',
        name: 'Quality Manual',
        typeAcronym: 'MA',
        processAcronym: 'QC',
        deptName: 'Quality Assurance',
        createdBy: santiagoId,
        assignedApproverId: demoId,  // Demo User reviews Santiago's docs
        approvedBy: demoId,
        status: 'approved',
        changeNotes: 'Initial version — Quality Management System manual',
        fileName: 'quality-manual.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This Quality Manual describes the Quality Management System (QMS) of Emerald Software Inc, ' +
          'establishing the scope and policies required by ISO 9001:2015.\n\n' +
          '2. SCOPE\n' +
          'This manual applies to all software development, support and delivery activities performed ' +
          'by Emerald Software Inc.\n\n' +
          '3. QUALITY POLICY\n' +
          'Emerald Software Inc is committed to delivering high-quality software solutions that ' +
          'consistently meet customer requirements and continually improve our processes.\n\n' +
          '4. ORGANIZATION\n' +
          'The Quality Assurance department oversees all QMS activities and reports directly to ' +
          'executive leadership.\n\n' +
          '5. PROCESS INTERACTIONS\n' +
          'All key processes are defined, documented and interconnected to ensure consistent ' +
          'quality outcomes across the organization.'
      },

      {
        code: 'SD-PR-001',
        name: 'Software Development Procedure',
        typeAcronym: 'PR',
        processAcronym: 'SD',
        deptName: 'Software Development',
        createdBy: santiagoId,
        assignedApproverId: demoId,
        approvedBy: demoId,
        status: 'approved',
        changeNotes: 'Initial version',
        fileName: 'software-development-procedure.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This procedure defines the standard approach for software development at ' +
          'Emerald Software Inc.\n\n' +
          '2. SCOPE\n' +
          'Applies to all development projects undertaken by the Software Development department.\n\n' +
          '3. PROCEDURE\n' +
          '3.1 Requirements Gathering\n' +
          'All development begins with documented requirements reviewed by the product team.\n\n' +
          '3.2 Design & Architecture\n' +
          'Technical design documents must be produced before implementation begins.\n\n' +
          '3.3 Development & Code Review\n' +
          'All code must pass peer review before merging to the main branch.\n\n' +
          '3.4 Testing\n' +
          'Unit, integration and regression tests must pass before release.\n\n' +
          '3.5 Deployment\n' +
          'Production deployments follow the Release Management Guide (SD-GU-002).'
      },

      {
        code: 'SD-GU-001',
        name: 'Code Review Guide',
        typeAcronym: 'GU',
        processAcronym: 'SD',
        deptName: 'Software Development',
        createdBy: santiagoId,
        assignedApproverId: demoId,
        approvedBy: demoId,
        status: 'approved',
        changeNotes: 'Initial version',
        fileName: 'code-review-guide.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This guide establishes the standards and expectations for conducting code reviews ' +
          'at Emerald Software Inc.\n\n' +
          '2. SCOPE\n' +
          'All developers participating in peer code reviews.\n\n' +
          '3. CODE REVIEW CHECKLIST\n' +
          '3.1 Functionality — Does the code work as intended?\n' +
          '3.2 Readability — Is the code clear and well-commented?\n' +
          '3.3 Performance — Are there any obvious performance concerns?\n' +
          '3.4 Security — Does the code introduce any security vulnerabilities?\n' +
          '3.5 Tests — Are appropriate tests included and passing?\n\n' +
          '4. REVIEW TIMEFRAMES\n' +
          'Code reviews must be completed within 1 business day of assignment.\n\n' +
          '5. APPROVAL\n' +
          'At least one senior developer must approve before merging to main.'
      },

      {
        // PENDING: awaiting Demo User approval
        code: 'SD-PR-002',
        name: 'Bug Tracking Procedure',
        typeAcronym: 'PR',
        processAcronym: 'SD',
        deptName: 'Software Development',
        createdBy: santiagoId,
        assignedApproverId: demoId,  // Assigned to Demo for approval
        approvedBy: null,            // Not yet approved
        status: 'pending_approval',
        changeNotes: 'Initial version — awaiting QM approval',
        fileName: 'bug-tracking-procedure.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This procedure defines how software defects are identified, tracked and resolved ' +
          'at Emerald Software Inc.\n\n' +
          '2. SCOPE\n' +
          'All team members involved in development, testing and quality assurance.\n\n' +
          '3. DEFECT CLASSIFICATION\n' +
          'P1 — Critical: System down or data loss\n' +
          'P2 — High: Major feature broken\n' +
          'P3 — Medium: Minor feature impacted\n' +
          'P4 — Low: Cosmetic or minor issue\n\n' +
          '4. DEFECT LIFECYCLE\n' +
          '4.1 Identification: Anyone can log a defect in the tracking system\n' +
          '4.2 Triage: QA team classifies and assigns priority\n' +
          '4.3 Assignment: Development team lead assigns to a developer\n' +
          '4.4 Resolution: Developer fixes and documents the solution\n' +
          '4.5 Verification: QA team verifies fix before closing the ticket'
      },

      {
        // OBSOLETE: Santiago's obsolete document (shown on Obsolete Documents page)
        code: 'HR-PR-001',
        name: 'HR Onboarding Procedure',
        typeAcronym: 'PR',
        processAcronym: 'HR',
        deptName: 'Human Resources',
        createdBy: santiagoId,
        assignedApproverId: demoId,
        approvedBy: demoId,
        status: 'obsolete',
        changeNotes: 'Initial version — superseded by updated onboarding policy',
        fileName: 'hr-onboarding-procedure.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This procedure outlines the onboarding process for new employees joining ' +
          'Emerald Software Inc.\n\n' +
          '2. SCOPE\n' +
          'All new employees regardless of department or role.\n\n' +
          '3. PRE-ARRIVAL\n' +
          '3.1 IT equipment setup and account creation\n' +
          '3.2 Workspace assignment and access credentials\n\n' +
          '4. DAY 1\n' +
          '4.1 Welcome meeting with HR\n' +
          '4.2 Company tour and team introductions\n' +
          '4.3 System access verification\n\n' +
          '5. FIRST WEEK\n' +
          '5.1 Department orientation with manager\n' +
          '5.2 Role-specific training schedule\n' +
          '5.3 Introduction to QMS and company policies\n\n' +
          'NOTE: This version has been superseded. Please refer to the current ' +
          'onboarding documentation.'
      },

      // ────────────────────────────────────────
      // DEMO USER'S DOCUMENTS (6–10)
      // ────────────────────────────────────────

      {
        code: 'HR-PO-001',
        name: 'Training Policy',
        typeAcronym: 'PO',
        processAcronym: 'HR',
        deptName: 'Human Resources',
        createdBy: demoId,
        assignedApproverId: santiagoId,  // Santiago reviews Demo's docs
        approvedBy: santiagoId,
        status: 'approved',
        changeNotes: 'Initial version',
        fileName: 'training-policy.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This policy establishes the framework for employee training and professional ' +
          'development at Emerald Software Inc.\n\n' +
          '2. SCOPE\n' +
          'All employees, contractors and long-term consultants.\n\n' +
          '3. POLICY STATEMENT\n' +
          'Emerald Software Inc is committed to investing in the continuous development ' +
          'of its employees to maintain technical excellence and compliance with ISO 9001:2015.\n\n' +
          '4. TRAINING REQUIREMENTS\n' +
          '4.1 All employees must complete a minimum of 20 hours of professional development per year.\n' +
          '4.2 QMS-related training is mandatory for all staff.\n' +
          '4.3 Role-specific technical training is determined by department heads.\n\n' +
          '5. TRAINING RECORDS\n' +
          'HR maintains training records for all employees. Records are reviewed during ' +
          'annual performance evaluations.'
      },

      {
        code: 'CS-PR-001',
        name: 'Customer Complaint Procedure',
        typeAcronym: 'PR',
        processAcronym: 'CS',
        deptName: 'Operations',
        createdBy: demoId,
        assignedApproverId: santiagoId,
        approvedBy: santiagoId,
        status: 'approved',
        changeNotes: 'Initial version',
        fileName: 'customer-complaint-procedure.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This procedure defines how customer complaints are received, managed and resolved ' +
          'at Emerald Software Inc.\n\n' +
          '2. SCOPE\n' +
          'All customer-facing teams including Customer Support and Sales.\n\n' +
          '3. COMPLAINT INTAKE\n' +
          '3.1 Complaints are received via email, phone or support portal\n' +
          '3.2 All complaints must be logged within 1 hour of receipt\n' +
          '3.3 Acknowledge receipt to the customer within 4 business hours\n\n' +
          '4. CLASSIFICATION\n' +
          'Severity 1: Contract-impacting or legal risk — escalate immediately\n' +
          'Severity 2: Significant service failure — resolve within 24 hours\n' +
          'Severity 3: General dissatisfaction — resolve within 5 business days\n\n' +
          '5. RESOLUTION & FOLLOW-UP\n' +
          '5.1 Root cause analysis required for Severity 1 and 2\n' +
          '5.2 Customer notified of resolution with corrective actions taken\n' +
          '5.3 Follow-up satisfaction check conducted after 7 days'
      },

      {
        code: 'SD-GU-002',
        name: 'Release Management Guide',
        typeAcronym: 'GU',
        processAcronym: 'SD',
        deptName: 'Software Development',
        createdBy: demoId,
        assignedApproverId: santiagoId,
        approvedBy: santiagoId,
        status: 'approved',
        changeNotes: 'Initial version',
        fileName: 'release-management-guide.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This guide defines the process for planning, approving and deploying software ' +
          'releases at Emerald Software Inc.\n\n' +
          '2. SCOPE\n' +
          'All software releases to production environments.\n\n' +
          '3. RELEASE TYPES\n' +
          '3.1 Major Release: Significant new features — requires full QA cycle and management sign-off\n' +
          '3.2 Minor Release: Small features or improvements — requires QA sign-off\n' +
          '3.3 Hotfix: Critical bug fix — expedited process with post-release review\n\n' +
          '4. RELEASE CHECKLIST\n' +
          '4.1 All planned features implemented and tested\n' +
          '4.2 Regression test suite passed\n' +
          '4.3 Release notes prepared and reviewed\n' +
          '4.4 Rollback plan documented\n' +
          '4.5 Stakeholders notified of release window\n\n' +
          '5. POST-RELEASE\n' +
          'Monitor error rates for 24 hours following release. Document any issues ' +
          'in the bug tracking system (SD-PR-002).'
      },

      {
        // PENDING: awaiting Santiago approval
        code: 'QC-FR-001',
        name: 'Quality Control Form',
        typeAcronym: 'FR',
        processAcronym: 'QC',
        deptName: 'Quality Assurance',
        createdBy: demoId,
        assignedApproverId: santiagoId,  // Assigned to Santiago for approval
        approvedBy: null,                // Not yet approved
        status: 'pending_approval',
        changeNotes: 'Initial version — awaiting QM approval',
        fileName: 'quality-control-form.pdf',
        pdfContent:
          'QUALITY CONTROL INSPECTION FORM\n' +
          'Emerald Software Inc\n' +
          'Document Code: QC-FR-001 | Version: 1.0\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          'PROJECT INFORMATION\n' +
          'Project Name:       ___________________________\n' +
          'Release Version:    ___________________________\n' +
          'Inspection Date:    ___________________________\n' +
          'Inspected By:       ___________________________\n\n' +
          'INSPECTION CHECKLIST\n\n' +
          '[ ] Requirements coverage — All requirements have corresponding test cases\n' +
          '[ ] Test execution — All test cases have been executed and passed\n' +
          '[ ] Defect status — No open P1 or P2 defects remaining\n' +
          '[ ] Performance — Load tests within acceptable thresholds\n' +
          '[ ] Security — Security scan completed with no critical findings\n' +
          '[ ] Documentation — Release notes complete and accurate\n' +
          '[ ] Approval — Development lead sign-off received\n\n' +
          'OVERALL RESULT\n' +
          '[ ] PASS — Approved for release\n' +
          '[ ] FAIL — Issues identified (list below)\n\n' +
          'ISSUES / COMMENTS:\n' +
          '_____________________________________________\n\n' +
          'QA Signature: _____________  Date: __________'
      },

      {
        // OBSOLETE: Demo User's obsolete document (shown on Obsolete Documents page)
        code: 'QC-PR-001',
        name: 'Risk Management Procedure',
        typeAcronym: 'PR',
        processAcronym: 'QC',
        deptName: 'Quality Assurance',
        createdBy: demoId,
        assignedApproverId: santiagoId,
        approvedBy: santiagoId,
        status: 'obsolete',
        changeNotes: 'Initial version — superseded by updated risk framework',
        fileName: 'risk-management-procedure.pdf',
        pdfContent:
          '1. PURPOSE\n' +
          'This procedure defines how risks are identified, assessed and managed within ' +
          'Emerald Software Inc.\n\n' +
          '2. SCOPE\n' +
          'All departments and business processes.\n\n' +
          '3. RISK IDENTIFICATION\n' +
          '3.1 Risk identification sessions are conducted quarterly\n' +
          '3.2 Any employee may submit a risk for review via the QMS portal\n' +
          '3.3 Risks are classified by category: Technical, Operational, Financial, Compliance\n\n' +
          '4. RISK ASSESSMENT\n' +
          'Risks are rated on two dimensions:\n' +
          'Likelihood: 1 (rare) to 5 (almost certain)\n' +
          'Impact: 1 (negligible) to 5 (critical)\n' +
          'Risk Score = Likelihood × Impact\n\n' +
          '5. RISK TREATMENT\n' +
          'Score  1– 5: Monitor and log\n' +
          'Score  6–15: Develop and implement mitigation plan\n' +
          'Score 16–25: Immediate escalation and action required\n\n' +
          'NOTE: This version has been superseded. Please refer to the current ' +
          'risk management documentation.'
      }
    ];

    // ==========================================
    // STEP 3: INSERT EACH DOCUMENT
    // Uses 3-pass approach to resolve the
    // documents ↔ document_versions circular FK.
    // ==========================================

    console.log('\nSeeding documents and uploading files to Supabase...\n');

    for (const def of documentDefinitions) {
      console.log(`  Processing: ${def.name} (${def.code})...`);

      // Generate PDF as a Buffer in memory (no temp files)
      const pdfBuffer = await generatePDF(def.name, def.code, def.pdfContent);

      // Upload the buffer directly to Supabase Storage
      const storagePath = await uploadToSupabase(pdfBuffer, company.id, def.fileName);

      // PASS 1: Insert document WITHOUT current_version_id
      // The FK to document_versions cannot be set yet because the
      // version doesn't exist. We insert null and update in Pass 3.
      await queryInterface.bulkInsert('documents', [
        {
          company_id: company.id,
          code: def.code,
          name: def.name,
          document_type_id: getTypeId(def.typeAcronym),
          process_id: getProcId(def.processAcronym),
          department_id: getDeptId(def.deptName),
          current_version_id: null,   // ← Filled in Pass 3
          code_edited_by: null,
          code_edited_at: null,
          created_by: def.createdBy,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      // Retrieve the ID Postgres assigned to the new document
      const [document] = await queryInterface.sequelize.query(
        `SELECT id FROM documents WHERE code = '${def.code}' AND company_id = ${company.id}`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      // PASS 2: Insert document_version WITH document_id
      // Now we can set document_id because the document record exists.
      await queryInterface.bulkInsert('document_versions', [
        {
          document_id: document.id,
          version_number: '1.0',
          file_url: storagePath,       // Supabase storage path
          file_name: def.fileName,
          file_size: pdfBuffer.length, // Actual PDF size in bytes
          status: def.status,
          assigned_approver_id: def.assignedApproverId,
          approved_by: def.approvedBy,
          // Only set approved_at when document was actually approved
          approved_at: def.approvedBy ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null,
          version_edited_by: null,
          version_edited_at: null,
          created_by: def.createdBy,
          created_at: new Date(),
          change_notes: def.changeNotes
        }
      ]);

      // Retrieve the version ID Postgres assigned
      const [version] = await queryInterface.sequelize.query(
        `SELECT id FROM document_versions WHERE document_id = ${document.id}`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      // PASS 3: Update document to point at its current version
      // This resolves the circular dependency — both sides of the FK now exist.
      await queryInterface.sequelize.query(
        `UPDATE documents SET current_version_id = ${version.id} WHERE id = ${document.id}`
      );

      console.log(`  ${def.name} — status: ${def.status}`);
    }

    console.log('\nAll 10 documents seeded and files uploaded to Supabase!\n');
    console.log('  Summary:');
    console.log('  - 6 approved (3 by Santiago, 3 by Demo User)');
    console.log('  - 2 pending_approval (Bug Tracking Procedure + Quality Control Form)');
    console.log('  - 2 obsolete (HR Onboarding Procedure + Risk Management Procedure)\n');
  },

  down: async (queryInterface, Sequelize) => {

    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!company) return;

    // Get all version storage paths so we can delete from Supabase
    const versions = await queryInterface.sequelize.query(
      `SELECT dv.file_url
       FROM document_versions dv
       INNER JOIN documents d ON d.id = dv.document_id
       WHERE d.company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Delete files from Supabase Storage first
    if (versions.length > 0) {
      const filePaths = versions.map(v => v.file_url);
      const { error } = await supabase.storage.from(BUCKET).remove(filePaths);
      if (error) {
        console.warn('Some files could not be deleted from Supabase:', error.message);
        // Continue anyway — we still want to clean the database
      }
    }

    // Clear current_version_id before deleting versions
    // (otherwise FK constraint blocks the delete)
    await queryInterface.sequelize.query(
      `UPDATE documents SET current_version_id = null WHERE company_id = ${company.id}`
    );

    // Delete all versions belonging to this company's documents
    await queryInterface.sequelize.query(
      `DELETE FROM document_versions
       WHERE document_id IN (
         SELECT id FROM documents WHERE company_id = ${company.id}
       )`
    );

    // Delete documents
    await queryInterface.bulkDelete('documents', {
      company_id: company.id
    });

    console.log('Documents, versions and storage files removed');
  }
};