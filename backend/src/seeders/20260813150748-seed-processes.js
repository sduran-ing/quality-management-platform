'use strict';

/**
 * Seeds 5 processes for Emerald Software Inc.
 * 
 * Also seeds three junction tables:
 * - process_departments: links each process to its department
 * - user_processes: links users to relevant processes
 * - company_standards: links Emerald Software to ISO 9001:2015
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {

    // Get company
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!company) throw new Error('Company not found. Run seed-company.js first.');

    // Get users
    const users = await queryInterface.sequelize.query(
      `SELECT id, email FROM users WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const getUserId = (email) => users.find(u => u.email === email)?.id;

    // Get departments
    const departments = await queryInterface.sequelize.query(
      `SELECT id, name FROM departments WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const getDeptId = (name) => departments.find(d => d.name === name)?.id;

    // Get ISO 9001 standard
    const [standard] = await queryInterface.sequelize.query(
      `SELECT id FROM standards WHERE name = 'ISO 9001' AND version = '2015'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!standard) throw new Error('ISO 9001 standard not found. Run seed-iso-9001 first.');

    // ============================================
    // INSERT PROCESSES
    // ============================================

    await queryInterface.bulkInsert('processes', [
      {
        company_id: company.id,
        name: 'Software Development',
        acronym: 'SD',
        description: 'End-to-end software design, development and delivery lifecycle',
        process_owner_id: getUserId('michael@emeraldsoftware.dev'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Quality Control',
        acronym: 'QC',
        description: 'Quality inspection, testing and continuous improvement activities',
        process_owner_id: getUserId('santiago@emeraldsoftware.dev'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Human Resources Management',
        acronym: 'HR',
        description: 'Talent acquisition, onboarding, training and employee development',
        process_owner_id: getUserId('demo@emeraldsoftware.dev'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Customer Support',
        acronym: 'CS',
        description: 'Customer issue resolution, complaint handling and satisfaction tracking',
        process_owner_id: getUserId('michael@emeraldsoftware.dev'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Product Planning',
        acronym: 'PP',
        description: 'Product roadmap, feature prioritization and stakeholder alignment',
        process_owner_id: getUserId('demo@emeraldsoftware.dev'),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('Processes seeded: SD, QC, HR, CS, PP');

    // Get freshly inserted process IDs
    const processes = await queryInterface.sequelize.query(
      `SELECT id, acronym FROM processes WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const getProcId = (acronym) => processes.find(p => p.acronym === acronym)?.id;

    // ============================================
    // INSERT PROCESS_DEPARTMENTS JUNCTION
    // Each process linked to its primary department
    // ============================================

    await queryInterface.bulkInsert('process_departments', [
      {
        process_id: getProcId('SD'),
        department_id: getDeptId('Software Development'),
        updated_at: new Date()
      },
      {
        process_id: getProcId('QC'),
        department_id: getDeptId('Quality Assurance'),
        updated_at: new Date()
      },
      {
        process_id: getProcId('HR'),
        department_id: getDeptId('Human Resources'),
        updated_at: new Date()
      },
      {
        process_id: getProcId('CS'),
        department_id: getDeptId('Operations'),
        updated_at: new Date()
      },
      {
        process_id: getProcId('PP'),
        department_id: getDeptId('Product Management'),
        updated_at: new Date()
      }
    ]);

    console.log('Process departments linked');

    // ============================================
    // INSERT USER_PROCESSES JUNCTION
    // Links users to the processes they participate in
    // ============================================

    await queryInterface.bulkInsert('user_processes', [
      // Santiago: Quality Control, Product Planning
      {
        user_id: getUserId('santiago@emeraldsoftware.dev'),
        process_id: getProcId('QC'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: getUserId('santiago@emeraldsoftware.dev'),
        process_id: getProcId('PP'),
        created_at: new Date(),
        updated_at: new Date()
      },
      // Demo User: HRM, Quality Control
      {
        user_id: getUserId('demo@emeraldsoftware.dev'),
        process_id: getProcId('HR'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: getUserId('demo@emeraldsoftware.dev'),
        process_id: getProcId('QC'),
        created_at: new Date(),
        updated_at: new Date()
      },
      // Michael Scott: Software Development, Customer Support
      {
        user_id: getUserId('michael@emeraldsoftware.dev'),
        process_id: getProcId('SD'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        user_id: getUserId('michael@emeraldsoftware.dev'),
        process_id: getProcId('CS'),
        created_at: new Date(),
        updated_at: new Date()
      },
      // Jim Halpert: Software Development
      {
        user_id: getUserId('jim@emeraldsoftware.dev'),
        process_id: getProcId('SD'),
        created_at: new Date(),
        updated_at: new Date()
      },
      // Dwight Schrute: Customer Support
      {
        user_id: getUserId('dwight@emeraldsoftware.dev'),
        process_id: getProcId('CS'),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('User processes linked');

    // ============================================
    // INSERT COMPANY_STANDARDS JUNCTION
    // Emerald Software adopts ISO 9001:2015
    // ============================================

    await queryInterface.bulkInsert('company_standards', [
      {
        company_id: company.id,
        standard_id: standard.id,
        adopted_at: new Date()
      }
    ]);

    console.log('Company standard linked: ISO 9001:2015');
  },

  down: async (queryInterface, Sequelize) => {
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (company) {
      const processes = await queryInterface.sequelize.query(
        `SELECT id FROM processes WHERE company_id = ${company.id}`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      const processIds = processes.map(p => p.id);

      if (processIds.length > 0) {
        // Remove junction table records first
        await queryInterface.bulkDelete('user_processes', {
          process_id: processIds
        });
        await queryInterface.bulkDelete('process_departments', {
          process_id: processIds
        });
      }

      await queryInterface.bulkDelete('company_standards', {
        company_id: company.id
      });

      await queryInterface.bulkDelete('processes', {
        company_id: company.id
      });
    }

    console.log('Processes and junctions removed');
  }
};