/**
 * ============================================================================
 * DEMO RESET SCRIPT
 * ============================================================================
 *
 * Restores the app to its initial state. Safe to run at any time.
 *
 * 1. Deletes all files from Supabase Storage
 * 2. Truncates all data tables (resets IDs to 1)
 * 3. Re-runs all seeders in timestamp order
 *
 * HOW IT RUNS:
 * - Manually: node scripts/resetDemo.js
 * - Automatically: GitHub Actions every Sunday 2AM UTC
 * - On demand: GitHub Actions "Run workflow" button
 *
 */

/**
 * Override NODE_ENV regardless of what the shell has set.
 * This guarantees resetDemo ALWAYS targets Supabase
 */
process.env.NODE_ENV = 'production'; 

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// ============================================
// SUPABASE CLIENT
// ============================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

// ============================================
// STEP 1: DELETE STORAGE FILES
// ============================================

/**
 * Clears all files from Supabase Storage bucket.
 * Handles nested folders (e.g. company-1/filename.pdf)
 */
async function clearStorage() {
  console.log('Step 1: Clearing Supabase storage...');

  try {
    // List top-level items (could be files or folders)
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
        // It's a file at the root level
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

    // Delete all collected paths in one request
    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove(allPaths);

    if (deleteError) throw deleteError;

    console.log(`   Deleted ${allPaths.length} files`);

  } catch (error) {
    console.error('   Storage clear failed:', error.message);
    throw error;
  }
}

// ============================================
// STEP 2: TRUNCATE ALL TABLES
// ============================================

/**
 * Wipes all data from every table
 * RESTART IDENTITY resets auto-increment IDs back to 1
 * so company_id = 1 matches the storage folder company-1/
 * CASCADE handles foreign key dependencies automatically
 * SequelizeMeta is excluded, migration history must be preserved
 */
async function truncateTables() {
  console.log('\n  Step 2: Truncating database tables...');

  // Import sequelize after dotenv has loaded
  // so DATABASE_URL is available when it connects
  // TRUNCATE: runs inside this script process
  // The script already has NODE_ENV=production in its environment
  // (set by GitHub Actions step env block)   
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

    console.log('   All tables truncated, IDs reset to 1');

  } catch (error) {
    console.error('   Truncate failed:', error.message);
    throw error;
  } finally {
    // Always close the DB connection when done
    await sequelize.close();
  }
}

// ============================================
// STEP 3: RE-SEED DATA
// ============================================

/**
 * Runs all seeders in timestamp order.
 * execSync runs the command synchronously (waits for it to finish)
 * stdio: 'inherit' shows the seeder output in this terminal
 * NODE_ENV=production makes seeders use DATABASE_URL (Supabase)
 */
async function reseedData() {
  console.log('\n Step 3: Re-seeding default data...');

  try {
    execSync('npx sequelize-cli db:seed:all', {
      stdio: 'inherit',          // Show seeder output in console
      cwd: __dirname + '/..',   // Run from backend/ folder
      env: {
        ...process.env,          // Pass all current env vars
        NODE_ENV: 'production'   // Even though is inherit, we explicitly ensure this is set
      }
    });

    console.log('\n   All seeders completed');

  } catch (error) {
    console.error('   Seeding failed:', error.message);
    throw error;
  }
}

// ============================================
// MAIN: RUN ALL STEPS IN ORDER
// ============================================

async function resetDemo() {
  console.log('Starting demo reset...');
  console.log(`   Time: ${new Date().toISOString()}\n`);

  try {
    await clearStorage();
    await truncateTables();
    await reseedData();

    console.log('\nDemo reset complete! App is back to initial state.');
    console.log(`   Finished: ${new Date().toISOString()}\n`);
    process.exit(0);

  } catch (error) {
    console.error('\nReset failed:', error.message);
    console.error('   The app may be in a partial state. Run reset again.');
    process.exit(1); // Exit code 1 = failure (GitHub Actions marks run as failed)
  }
}

resetDemo();