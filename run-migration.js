import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pwfczzxwjfxomqzhhwvj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('');
  console.error('You can find this key in:');
  console.error('Supabase Dashboard → Settings → API → service_role key');
  console.error('');
  console.error('Run this script like:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-key-here node run-migration.js');
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
    console.log('🚀 Running promo_usage table migration...');
    console.log('');

    // Read SQL file
    const sql = readFileSync('./supabase/migrations/20260206000000_create_promo_usage_table.sql', 'utf8');

    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative method - execute statements one by one
      console.log('⚠️  Direct execution failed, trying statement-by-statement...');

      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.length > 0) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          });

          if (stmtError) {
            console.error(`❌ Error executing statement: ${stmtError.message}`);
            throw stmtError;
          }
        }
      }
    }

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 You can now verify the table exists:');
    console.log('   SELECT * FROM promo_usage;');
    console.log('');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('');
    console.error('📝 Manual alternative:');
    console.error('1. Go to Supabase Dashboard → SQL Editor');
    console.error('2. Copy the content from: supabase/migrations/20260206000000_create_promo_usage_table.sql');
    console.error('3. Paste and run it');
    console.error('');
    process.exit(1);
  }
}

runMigration();
