'use strict';

/**
 * Seeds 5 document types for Emerald Software Inc.
 * 
 * Acronyms are used for generating document codes:
 * e.g. SD-PR-001 = Software Development + Procedure + sequence 001
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!company) {
      throw new Error('Company not found. Run seed-company.js first.');
    }

    await queryInterface.bulkInsert('document_types', [
      {
        company_id: company.id,
        name: 'Procedure',
        acronym: 'PR',
        created_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Guide',
        acronym: 'GU',
        created_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Policy',
        acronym: 'PO',
        created_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Form',
        acronym: 'FR',
        created_at: new Date()
      },
      {
        company_id: company.id,
        name: 'Manual',
        acronym: 'MA',
        created_at: new Date()
      }
    ]);

    console.log('Document types seeded: PR, GU, PO, FR, MA');
  },

  down: async (queryInterface, Sequelize) => {
    const [company] = await queryInterface.sequelize.query(
      `SELECT id FROM companies WHERE name = 'Emerald Software Inc'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (company) {
      await queryInterface.bulkDelete('document_types', {
        company_id: company.id
      });
    }

    console.log('Document types removed');
  }
};