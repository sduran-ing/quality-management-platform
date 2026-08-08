'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, create the ISO 9001:2015 standard
    const [standard] = await queryInterface.bulkInsert('standards', [
      {
        name: 'ISO 9001',
        version: '2015',
        description: 'Quality management systems - Requirements',
        is_active: true,
        created_at: new Date()
      }
    ], { returning: true });

    // Get the standard ID (for PostgreSQL, we need to query it back)
    const [standardRecord] = await queryInterface.sequelize.query(
      `SELECT id FROM standards WHERE name = 'ISO 9001' AND version = '2015'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    // From the previous query, we retreive and save the standard ID in this variable
    const standardId = standardRecord.id;

    // Now insert all ISO 9001:2015 requirements
    // We'll create main clauses (4-10) and some key sub-clauses as examples
    
    const requirements = [
      // ============================================
      // CLAUSE 4: Context of the organization
      // ============================================
      {
        standard_id: standardId,
        clause_number: '4',
        title: 'Context of the organization',
        description: 'The organization shall determine external and internal issues that are relevant to its purpose and strategic direction.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '4.1',
        title: 'Understanding the organization and its context',
        description: 'The organization shall determine external and internal issues that are relevant to its purpose and strategic direction and that affect its ability to achieve the intended result(s) of its QMS.',
        parent_id: null, // Will be set after we get parent IDs
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '4.2',
        title: 'Understanding the needs and expectations of interested parties',
        description: 'The organization shall determine the interested parties that are relevant to the QMS and the requirements of these interested parties.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '4.3',
        title: 'Determining the scope of the quality management system',
        description: 'The organization shall determine the boundaries and applicability of the QMS to establish its scope.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '4.4',
        title: 'Quality management system and its processes',
        description: 'The organization shall establish, implement, maintain and continually improve a QMS, including the processes needed and their interactions.',
        parent_id: null,
        created_at: new Date()
      },

      // ============================================
      // CLAUSE 5: Leadership
      // ============================================
      {
        standard_id: standardId,
        clause_number: '5',
        title: 'Leadership',
        description: 'Top management shall demonstrate leadership and commitment with respect to the QMS.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '5.1',
        title: 'Leadership and commitment',
        description: 'Top management shall demonstrate leadership and commitment by taking accountability for the effectiveness of the QMS.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '5.2',
        title: 'Policy',
        description: 'Top management shall establish, implement and maintain a quality policy.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '5.3',
        title: 'Organizational roles, responsibilities and authorities',
        description: 'Top management shall ensure that the responsibilities and authorities for relevant roles are assigned, communicated and understood.',
        parent_id: null,
        created_at: new Date()
      },

      // ============================================
      // CLAUSE 6: Planning
      // ============================================
      {
        standard_id: standardId,
        clause_number: '6',
        title: 'Planning',
        description: 'When planning for the QMS, the organization shall consider the issues referred to in 4.1 and the requirements referred to in 4.2.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '6.1',
        title: 'Actions to address risks and opportunities',
        description: 'When planning for the QMS, the organization shall consider risks and opportunities that need to be addressed.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '6.2',
        title: 'Quality objectives and planning to achieve them',
        description: 'The organization shall establish quality objectives at relevant functions, levels and processes.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '6.3',
        title: 'Planning of changes',
        description: 'When the organization determines the need for changes to the QMS, the changes shall be carried out in a planned manner.',
        parent_id: null,
        created_at: new Date()
      },

      // ============================================
      // CLAUSE 7: Support
      // ============================================
      {
        standard_id: standardId,
        clause_number: '7',
        title: 'Support',
        description: 'The organization shall determine and provide the resources needed for the establishment, implementation, maintenance and continual improvement of the QMS.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '7.1',
        title: 'Resources',
        description: 'The organization shall determine and provide the resources needed for the QMS.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '7.2',
        title: 'Competence',
        description: 'The organization shall determine the necessary competence of person(s) doing work under its control that affects the performance and effectiveness of the QMS.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '7.3',
        title: 'Awareness',
        description: 'The organization shall ensure that persons doing work under the organization\'s control are aware of the quality policy and relevant quality objectives.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '7.4',
        title: 'Communication',
        description: 'The organization shall determine the internal and external communications relevant to the QMS.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '7.5',
        title: 'Documented information',
        description: 'The organization\'s QMS shall include documented information required by this International Standard and determined by the organization as being necessary for the effectiveness of the QMS.',
        parent_id: null,
        created_at: new Date()
      },

      // ============================================
      // CLAUSE 8: Operation
      // ============================================
      {
        standard_id: standardId,
        clause_number: '8',
        title: 'Operation',
        description: 'The organization shall plan, implement and control the processes needed to meet requirements for the provision of products and services.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '8.1',
        title: 'Operational planning and control',
        description: 'The organization shall plan, implement and control the processes needed to meet the requirements for the provision of products and services.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '8.2',
        title: 'Requirements for products and services',
        description: 'The organization shall determine, review and meet requirements for products and services to be offered to customers.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '8.3',
        title: 'Design and development of products and services',
        description: 'The organization shall establish, implement and maintain a design and development process.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '8.4',
        title: 'Control of externally provided processes, products and services',
        description: 'The organization shall ensure that externally provided processes, products and services conform to requirements.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '8.5',
        title: 'Production and service provision',
        description: 'The organization shall implement production and service provision under controlled conditions.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '8.6',
        title: 'Release of products and services',
        description: 'The organization shall implement planned arrangements to verify that product and service requirements have been met.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '8.7',
        title: 'Control of nonconforming outputs',
        description: 'The organization shall ensure that outputs that do not conform to their requirements are identified and controlled.',
        parent_id: null,
        created_at: new Date()
      },

      // ============================================
      // CLAUSE 9: Performance evaluation
      // ============================================
      {
        standard_id: standardId,
        clause_number: '9',
        title: 'Performance evaluation',
        description: 'The organization shall determine what needs to be monitored and measured, the methods for monitoring, measurement, analysis and evaluation.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '9.1',
        title: 'Monitoring, measurement, analysis and evaluation',
        description: 'The organization shall determine what needs to be monitored and measured, and the methods for monitoring, measurement, analysis and evaluation needed to ensure valid results.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '9.2',
        title: 'Internal audit',
        description: 'The organization shall conduct internal audits at planned intervals to provide information on whether the QMS conforms to requirements and is effectively implemented and maintained.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '9.3',
        title: 'Management review',
        description: 'Top management shall review the organization\'s QMS at planned intervals to ensure its continuing suitability, adequacy, effectiveness and alignment.',
        parent_id: null,
        created_at: new Date()
      },

      // ============================================
      // CLAUSE 10: Improvement
      // ============================================
      {
        standard_id: standardId,
        clause_number: '10',
        title: 'Improvement',
        description: 'The organization shall determine and select opportunities for improvement and implement necessary actions.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '10.1',
        title: 'General',
        description: 'The organization shall determine and select opportunities for improvement and implement any necessary actions to meet customer requirements and enhance customer satisfaction.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '10.2',
        title: 'Nonconformity and corrective action',
        description: 'When a nonconformity occurs, the organization shall react to the nonconformity and take action to control and correct it, evaluate the need for action to eliminate the causes of nonconformity.',
        parent_id: null,
        created_at: new Date()
      },
      {
        standard_id: standardId,
        clause_number: '10.3',
        title: 'Continual improvement',
        description: 'The organization shall continually improve the suitability, adequacy and effectiveness of the QMS.',
        parent_id: null,
        created_at: new Date()
      }
    ];

    // Insert all requirements
    await queryInterface.bulkInsert('standard_requirements', requirements);

    console.log('ISO 9001:2015 standard and requirements seeded successfully!');
    console.log(`Inserted ${requirements.length} requirements`);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all ISO 9001:2015 data
    await queryInterface.bulkDelete('standard_requirements', {
      standard_id: queryInterface.sequelize.literal(
        `(SELECT id FROM standards WHERE name = 'ISO 9001' AND version = '2015')`
      )
    });
    
    await queryInterface.bulkDelete('standards', {
      name: 'ISO 9001',
      version: '2015'
    });

    console.log('ISO 9001:2015 data removed successfully!');
  }
};