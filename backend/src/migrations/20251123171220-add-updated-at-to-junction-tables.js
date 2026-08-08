'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add updated_at column to process_departments table
    await queryInterface.addColumn('process_departments', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });

    // Add created_at column to user_processes table
    await queryInterface.addColumn('user_processes', 'created_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });

    // Add updated_at column to user_processes table
    await queryInterface.addColumn('user_processes', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });

    console.log('Added missing timestamp columns to junction tables');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove updated_at from process_departments
    await queryInterface.removeColumn('process_departments', 'updated_at');

    // Remove created_at from user_processes
    await queryInterface.removeColumn('user_processes', 'created_at');

    // Remove updated_at from user_processes
    await queryInterface.removeColumn('user_processes', 'updated_at');

    console.log('Removed timestamp columns from junction tables');
  }
};