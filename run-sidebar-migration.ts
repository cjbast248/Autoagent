import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Read environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigration() {
    try {
        console.log('🚀 Running sidebar_promos table migration...');

        // Read SQL file
        const sql = readFileSync('./supabase/migrations/20260206143000_create_sidebar_promos.sql', 'utf8');

        // Try to run via exec_sql if available (commonly used in this project context based on run-migration.js)
        // If exec_sql doesn't exist, this will fail and we'll see the error.
        // If straightforward SQL execution isn't possible via client, we might need another approach (e.g. asking user).
        // Note: Standard Supabase client doesn't run raw SQL without a stored procedure like exec_sql.

        // Attempt 1: Check if we can use the technique from run-migration.js
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ RPC exec_sql failed:', error.message);
            console.log('Trying fallback: Direct table creation not supported via JS client solely. Please run SQL in Dashboard.');
            process.exit(1);
        } else {
            console.log('✅ Migration completed successfully via exec_sql!');
        }

    } catch (err) {
        console.error('❌ Migration script error:', err.message);
        process.exit(1);
    }
}

runMigration();
