'use strict';

const bcrypt = require('bcryptjs');

/**
 * Seeds 5 users for Emerald Software Inc.
 * 
 * CIRCULAR DEPENDENCY RESOLUTION:
 * After inserting users, this seeder UPDATES departments
 * with their department_head_id — closing the circular dependency
 * opened in seed-departments.js.
 * 
 * DEMO CREDENTIALS:
 * Quality Manager: demo@emeraldsoftware.dev / Demo1234!
 * 
 * All other credentials are for internal testing only.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {

    // Get required references
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!company) throw new Error('Company not found. Run seed-company.js first.');

    // Get all departments by name for department_id assignment
    const departments = await queryInterface.sequelize.query(
      `SELECT id, name FROM departments WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Helper to find department id by name
    const getDeptId = (name) => departments.find(d => d.name === name)?.id;

    // Hash all passwords (10 rounds = secure but not too slow for seeding)
    const saltRounds = 10;
    const [
      santiagoHash,
      demoHash,
      michaelHash,
      jimHash,
      dwightHash
    ] = await Promise.all([
      bcrypt.hash('Demo123!', saltRounds),
      bcrypt.hash('Demo123!', saltRounds),
      bcrypt.hash('Demo123!', saltRounds),
      bcrypt.hash('Demo123!', saltRounds),
      bcrypt.hash('Demo123!', saltRounds)
    ]);

    // Insert users
    await queryInterface.bulkInsert('users', [
      {
        company_id: company.id,
        email: 'santiago@emeraldsoftware.dev',
        password_hash: santiagoHash,
        first_name: 'Santiago',
        last_name: 'Duran',
        role: 'quality_manager',
        department_id: getDeptId('Quality Assurance'),
        avatar_url: null,
        achievement_points: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        email: 'demo@emeraldsoftware.dev',
        password_hash: demoHash,
        first_name: 'Demo',
        last_name: 'User',
        role: 'quality_manager',
        department_id: getDeptId('Human Resources'),
        avatar_url: null,
        achievement_points: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        email: 'michael@emeraldsoftware.dev',
        password_hash: michaelHash,
        first_name: 'Michael',
        last_name: 'Scott',
        role: 'process_owner',
        department_id: getDeptId('Software Development'),
        avatar_url: null,
        achievement_points: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        email: 'jim@emeraldsoftware.dev',
        password_hash: jimHash,
        first_name: 'Jim',
        last_name: 'Halpert',
        role: 'employee',
        department_id: getDeptId('Software Development'),
        avatar_url: null,
        achievement_points: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company_id: company.id,
        email: 'dwight@emeraldsoftware.dev',
        password_hash: dwightHash,
        first_name: 'Dwight',
        last_name: 'Schrute',
        role: 'employee',
        department_id: getDeptId('Operations'),
        avatar_url: null,
        achievement_points: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('Users seeded: 5 users');

    // ============================================
    // RESOLVE CIRCULAR DEPENDENCY
    // Now that users exist, update department heads
    // ============================================

    // Get freshly inserted user IDs
    const users = await queryInterface.sequelize.query(
      `SELECT id, email FROM users WHERE company_id = ${company.id}`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const getUserId = (email) => users.find(u => u.email === email)?.id;

    // Update department heads
    const headAssignments = [
      {
        deptName: 'Quality Assurance',
        headEmail: 'santiago@emeraldsoftware.dev'
      },
      {
        deptName: 'Software Development',
        headEmail: 'michael@emeraldsoftware.dev'
      },
      {
        deptName: 'Human Resources',
        headEmail: 'demo@emeraldsoftware.dev'
      },
      {
        deptName: 'Operations',
        headEmail: 'dwight@emeraldsoftware.dev'
      }
      // Product Management: no head assigned (null stays)
    ];

    for (const { deptName, headEmail } of headAssignments) {
      await queryInterface.sequelize.query(
        `UPDATE departments 
         SET department_head_id = ${getUserId(headEmail)}
         WHERE name = '${deptName}' AND company_id = ${company.id}`
      );
    }

    console.log('Department heads assigned');
  },

  down: async (queryInterface, Sequelize) => {
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (company) {
      // Clear department heads first (removes FK dependency on users)
      await queryInterface.sequelize.query(
        `UPDATE departments SET department_head_id = null 
         WHERE company_id = ${company.id}`
      );

      await queryInterface.bulkDelete('users', {
        company_id: company.id
      });
    }

    console.log('Users removed, department heads cleared');
  }
};