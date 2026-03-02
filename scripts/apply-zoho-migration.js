#!/usr/bin/env node

/**
 * Script to apply Zoho CRM per-user credentials migration directly to Supabase
 * This adds client_id, client_secret, and zoho_region columns to zoho_crm_connections table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pwfczzxwjfxomqzhhwvj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZmN6enh3amZ4b21xemhod3ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODQ0Mjk0NiwiZXhwIjoyMDY0MDE4OTQ2fQ.DVNQYmeTMs4SkQEQEYBopoVL4uAILvoq7IHp8NNFjLY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- Add client_id and client_secret columns to zoho_crm_connections for per-user OAuth credentials
ALTER TABLE public.zoho_crm_connections
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS client_secret TEXT,
ADD COLUMN IF NOT EXISTS zoho_region TEXT DEFAULT 'eu';

-- Add comment to document the change
COMMENT ON COLUMN public.zoho_crm_connections.client_id IS 'User-provided Zoho OAuth Client ID from their own Zoho API Console application';
COMMENT ON COLUMN public.zoho_crm_connections.client_secret IS 'User-provided Zoho OAuth Client Secret from their own Zoho API Console application';
COMMENT ON COLUMN public.zoho_crm_connections.zoho_region IS 'Zoho data center region: eu, com (US), in (India), au (Australia), jp (Japan)';
`;

async function applyMigration() {
  console.log('🔄 Applying Zoho CRM per-user credentials migration...');

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('📋 Columns added to zoho_crm_connections:');
    console.log('   - client_id (TEXT)');
    console.log('   - client_secret (TEXT)');
    console.log('   - zoho_region (TEXT, default: eu)');
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    process.exit(1);
  }
}

applyMigration();
