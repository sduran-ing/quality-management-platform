'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // This seeder is for demonstration/testing purposes
    
    // For testing, we'll create document types for a sample company (ID: 1)
    // In production, companies create their own types during onboarding
    
    const documentTypes = [
      // ============================================
      // COMMON QUALITY MANAGEMENT DOCUMENT TYPES
      // ============================================
      {
        company_id: 1, // Sample company for testing
        name: 'Procedure',
        acronym: 'PR',
        created_at: new Date()
      },
      {
        company_id: 1,
        name: 'Form',
        acronym: 'FR',
        created_at: new Date()
      },
      {
        company_id: 1,
        name: 'Guide',
        acronym: 'GU',
        created_at: new Date()
      },
      {
        company_id: 1,
        name: 'Policy',
        acronym: 'POL',
        created_at: new Date()
      },
      {
        company_id: 1,
        name: 'Manual',
        acronym: 'MAN',
        created_at: new Date()
      },
      {
        company_id: 1,
        name: 'Instruction',
        acronym: 'INS',
        created_at: new Date()
      },
      {
        company_id: 1,
        name: 'Checklist',
        acronym: 'CK',
        created_at: new Date()
      },
      {
        company_id: 1,
        name: 'Report',
        acronym: 'REP',
        created_at: new Date()
      },
      {
        company_id: 1,
        name: 'Plan',
        acronym: 'PL',
        created_at: new Date()
      }
    ];

    // Insert document types
    await queryInterface.bulkInsert('document_types', documentTypes);

    console.log('Default document types seeded successfully!');
    console.log(`Inserted ${documentTypes.length} document types for sample company`);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all document types for company_id 1
    await queryInterface.bulkDelete('document_types', {
      company_id: 1
    });
    
    console.log('Sample document types removed successfully!');
  }
};