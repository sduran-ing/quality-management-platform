'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add responsible_user_id column
    await queryInterface.addColumn('corrective_actions', 'responsible_user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,  // Temporary default for existing rows
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Who is responsible for implementing the corrective action'
    });

    // Add implementation_evidence column
    await queryInterface.addColumn('corrective_actions', 'implementation_evidence', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Evidence/description of what was done to implement the action'
    });

    console.log('Added responsible_user_id and implementation_evidence to corrective_actions');
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse the changes
    await queryInterface.removeColumn('corrective_actions', 'responsible_user_id');
    await queryInterface.removeColumn('corrective_actions', 'implementation_evidence');

    console.log('Removed responsible_user_id and implementation_evidence from corrective_actions');
  }
};