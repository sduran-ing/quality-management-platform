'use strict';

/**
 * Seeds the Emerald Software Inc company.
 * 
 * This is the root record — everything else (users, departments,
 * processes, documents) depends on this company_id.
 * Must run FIRST before all other demo seeders.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('companies', [
      {
        name: 'Emerald Software Inc',
        logo_url: null,  // No logo for initial state
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('Company seeded: Emerald Software Inc');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('companies', {
      name: 'Emerald Software Inc'
    });

    console.log('Company removed');
  }
};