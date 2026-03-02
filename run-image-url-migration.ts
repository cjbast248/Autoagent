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
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigration() {
    try {
        console.log('🚀 Adding image_url column to sidebar_promos table...');

        // Read SQL file
        const sql = readFileSync('./supabase/migrations/20260206150000_add_image_url_to_sidebar_promos.sql', 'utf8');

        // Execute via exec_sql RPC
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ RPC exec_sql failed:', error.message);
            console.log('\n📝 Please run this SQL manually in Supabase Dashboard:');
            console.log(sql);
            process.exit(1);
        } else {
            console.log('✅ Migration completed successfully!');
            console.log('✅ image_url column added to sidebar_promos table');
        }

    } catch (err: any) {
        console.error('❌ Migration script error:', err.message);
        process.exit(1);
    }
}

runMigration();
