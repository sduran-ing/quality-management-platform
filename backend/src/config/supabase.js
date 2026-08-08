const { createClient } = require('@supabase/supabase-js');

// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

if (!process.env.SUPABASE_STORAGE_BUCKET) {
  throw new Error('Missing SUPABASE_STORAGE_BUCKET environment variable');
}

/**
 * Create Supabase client for server-side operations
 * Uses service_role key for admin access (bypasses RLS)
 * 
 * IMPORTANT: Never expose service_role key to frontend
 * Frontend should use anon key only.
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,  // Service role for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Export client
module.exports = { supabase };