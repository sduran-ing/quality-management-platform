/**
 * ============================================================================
 * LOCAL RESET SCRIPT
 * ============================================================================
 *
 * Restores the local development environment to its initial state.
 *
 * 1. Deletes all files from Supabase Storage (shared with production)
 * 2. Truncates all tables in local PostgreSQL database
 * 3. Re-runs all seeders in timestamp order against local
 *
 * HOW TO RUN:
 * npm run reset-local
 * (from the backend/ folder)
 *
 * Storage is shared between local and production environments,
 * so this script clears Supabase storage for everyone
 */

/**
 * Override NODE_ENV regardless of what the shell has set.
 * This guarantees resetLocal ALWAYS targets local PostgreSQL
 */
process.env.NODE_ENV = 'development';

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// ============================================
// SUPABASE CLIENT (storage only)
// ============================================

/**
 * Storage is always Supabase regardless of environment.
 * Only the database differs between local and production.
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

// ============================================
// STEP 1: DELETE STORAGE FILES
// ============================================

/**
 * Identical to production reset — storage is always Supabase.
 * Handles nested folders (e.g. company-1/filename.pdf)
 */
async function clearStorage() {
  console.log('  Step 1: Clearing Supabase storage...');

  try {
    const { data: items, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 1000 });

    if (error) throw error;

    if (!items || items.length === 0) {
      console.log('   Storage already empty');
      return;
    }

    // Collect all file paths including those inside subfolders
    const allPaths = [];

    for (const item of items) {
      if (item.id) {
        // It's a file at root level
        allPaths.push(item.name);
      } else {
        // It's a folder — list its contents
        const { data: subFiles, error: subError } = await supabase.storage
          .from(BUCKET)
          .list(item.name, { limit: 1000 });

        if (subError) throw subError;

        if (subFiles) {
          subFiles.forEach(f => allPaths.push(`${item.name}/${f.name}`));
        }
      }
    }

    if (allPaths.length === 0) {
      console.log('   No files found');
      return;
    }

    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove(allPaths);

    if (deleteError) throw deleteError;

    console.log(`    Deleted ${allPaths.length} files`);

  } catch (error) {
    console.error('    Storage clear failed:', error.message);
    throw error;
  }
}

// ============================================
// STEP 2: TRUNCATE LOCAL TABLES
// ============================================

/**
 * Truncates all tables in the LOCAL PostgreSQL database.
 *
 * Since NODE_ENV is not set to 'production', database.js will
 * use the individual local variables (DB_NAME, DB_USER, etc.)
 * instead of DATABASE_URL — targeting your local PostgreSQL.
 */
async function truncateTables() {
  console.log('\n  Step 2: Truncating local database tables...');

  // No NODE_ENV=production → database.js reads local variables
  const sequelize = require('../src/config/database');

  try {
    await sequelize.query(`
      SET session_replication_role = replica;

      TRUNCATE TABLE
        user_achievements,
        user_activity,
        corrective_action_evidence,
        corrective_actions,
        finding_evidence,
        audit_findings,
        audit_team,
        audit_processes,
        audit_standards,
        audits,
        document_versions,
        documents,
        user_processes,
        process_departments,
        company_standards,
        standards,
        standard_requirements,
        achievements,
        document_types,
        processes,
        departments,
        users,
        companies
      RESTART IDENTITY CASCADE;

      SET session_replication_role = DEFAULT;
    `);

    console.log('    All local tables truncated, IDs reset to 1');

  } catch (error) {
    console.error('    Truncate failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// ============================================
// STEP 3: RE-SEED LOCAL DATA
// ============================================

/**
 * Runs all seeders against the LOCAL database.
 *
 * NODE_ENV is NOT set to production here — Sequelize CLI
 * uses the development config (local PostgreSQL variables).
 *
 * The documents seeder still uploads files to Supabase storage
 * because storage is always Supabase regardless of environment.
 */
async function reseedData() {
  console.log('\n Step 3: Re-seeding local data...');

  try {
    execSync('npx sequelize-cli db:seed:all', {
      stdio: 'inherit',
      cwd: __dirname + '/..',
      env: {
        ...process.env,
        NODE_ENV: 'development'  // always development, no matter what shell has

      }
    });

    console.log('\n    All seeders completed');

  } catch (error) {
    console.error('    Seeding failed:', error.message);
    throw error;
  }
}

// ============================================
// MAIN
// ============================================

async function resetLocal() {
  console.log(' Starting LOCAL reset...');
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log('   Database: Local PostgreSQL');
  console.log('   Storage: Supabase (shared)\n');

  try {
    await clearStorage();
    await truncateTables();
    await reseedData();

    console.log('\n Local reset complete. Dev environment is back to initial state.');
    console.log(`   Finished: ${new Date().toISOString()}\n`);
    process.exit(0);

  } catch (error) {
    console.error('\n Reset failed:', error.message);
    process.exit(1);
  }
}

resetLocal();