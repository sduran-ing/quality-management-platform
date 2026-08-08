'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add description column
    await queryInterface.addColumn('audits', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Remove lead_auditor_id column (using audit_team table instead)
    await queryInterface.removeColumn('audits', 'lead_auditor_id');

    // Remove corrective_action_deadline column (not needed at audit level)
    await queryInterface.removeColumn('audits', 'corrective_action_deadline');

    console.log('✅ Audit schema fixed: Added description, removed lead_auditor_id and corrective_action_deadline');
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse the changes
    await queryInterface.removeColumn('audits', 'description');

    await queryInterface.addColumn('audits', 'lead_auditor_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('audits', 'corrective_action_deadline', {
      type: Sequelize.DATE,
      allowNull: true
    });

    console.log('Audit schema reverted');
  }
};