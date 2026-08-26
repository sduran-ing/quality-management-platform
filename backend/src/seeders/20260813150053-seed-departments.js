'use strict';

/**
 * Seeds 5 departments for Emerald Software Inc.
 * 
 * CIRCULAR DEPENDENCY NOTE:
 * departments.department_head_id → users.id
 * users.department_id → departments.id
 * 
 * Solution: Insert departments WITHOUT department_head_id (null).
 * The users seeder (next) will UPDATE departments after inserting users.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get company ID — must exist before this runs
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!company) {
      throw new Error('Company not found. Run seed-company.js first.');
    }

    await queryInterface.bulkInsert('departments', [
      {
        company_id: company.id,
        name: 'Quality Assurance',
        description: 'Ensures product and process quality across the organization',
        department_head_id: null,  // Set after users are created
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Software Development',
        description: 'Designs, builds and maintains software products',
        department_head_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Human Resources',
        description: 'Manages talent acquisition, onboarding and employee relations',
        department_head_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Operations',
        description: 'Oversees day-to-day business operations and support services',
        department_head_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Product Management',
        description: 'Defines product vision, roadmap and stakeholder alignment',
        department_head_id: null,  // No head assigned initially
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('Departments seeded: 5 departments (heads assigned in users seeder)');
  },

  down: async (queryInterface, Sequelize) => {
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (company) {
      await queryInterface.bulkDelete('departments', {
        company_id: company.id
      });
    }

    console.log('Departments removed');
  }
};