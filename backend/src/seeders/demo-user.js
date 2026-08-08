/**
 * =============================================================================
 * DEMO USER SEEDER
 * =============================================================================
 * 
 * Creates a demo user for the "Try Demo" feature.
 * This user has process_owner role with moderate permissions.
 * 
 * RUN WITH:
 * node src/seeders/demo-user.js
 */

require('dotenv').config();
const { hashPassword } = require('../utils/authUtils');
const { User, Company } = require('../models');

// Import Sequelize for transactions
const sequelize = require('../config/database');

// Demo user credentials
const DEMO_EMAIL = 'demo@qms-platform.com';
const DEMO_PASSWORD = 'Demo123!';
const DEMO_COMPANY_NAME = 'QMS Demo Company';

/**
 * Create or update demo user
 */
const seedDemoUser = async () => {
    try {
        // Start transaction
        const transaction = await sequelize.transaction();

        try {
            console.log('🌱 Seeding demo user...');

            // ========================================
            // GET OR CREATE DEMO COMPANY
            // ========================================

            let company = await Company.findOne({
                where: { name: DEMO_COMPANY_NAME }
            });

            if (!company) {
                company = await Company.create({
                    name: DEMO_COMPANY_NAME,
                }, { transaction });
                console.log('✅ Created demo company:', company.name);
            } else {
                console.log('✅ Demo company already exists');
            }

            // ========================================
            // GET OR CREATE DEMO USER
            // ========================================

            let demoUser = await User.findOne({
                where: { email: DEMO_EMAIL }
            });

            // Hash the password before storing
            const hashedPassword = await hashPassword(DEMO_PASSWORD);

            if (!demoUser) {
                // Create new demo user
                demoUser = await User.create({
                    company_id: company.id,
                    email: DEMO_EMAIL,
                    password_hash: hashedPassword,
                    first_name: 'Demo',
                    last_name: 'User',
                    role: 'process_owner',
                    department_id: null,
                    is_active: true
                }, { transaction });

                console.log('✅ Created demo user');
            } else {
                // Update existing demo user (in case password changed)
                await demoUser.update({
                    password_hash: hashedPassword,
                    role: 'process_owner', // Ensure role is correct
                    is_active: true
                }, { transaction });

                console.log('✅ Updated existing demo user');
            }

            // Commit transaction
            await transaction.commit();

            // ========================================
            // DISPLAY CREDENTIALS
            // ========================================

            console.log('\n📋 Demo User Credentials:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Email:    ${DEMO_EMAIL}`);
            console.log(`Password: ${DEMO_PASSWORD}`);
            console.log(`Role:     ${demoUser.role}`);
            console.log(`Company:  ${company.name}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            console.log('✅ Demo user seeded successfully!');
            process.exit(0);

        } catch (error) {
            // If anything fails, rollback the transaction (undo everything)
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('❌ Error seeding demo user:', error);
        process.exit(1);
    }
};

// Run seeder
seedDemoUser();