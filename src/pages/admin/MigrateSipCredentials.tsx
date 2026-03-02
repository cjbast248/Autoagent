import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { encryptSipConfig } from '@/utils/encryption';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Admin page to migrate existing SIP credentials to encrypted format
 * This should be run once after deploying the encryption feature
 */
const MigrateSipCredentials: React.FC = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    migrated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const runMigration = async () => {
    if (!user) return;

    setIsRunning(true);
    setResults(null);

    const migrationResults = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      // Fetch all phone numbers with SIP config
      const { data: phoneNumbers, error } = await supabase
        .from('phone_numbers')
        .select('id, phone_number, sip_config')
        .not('sip_config', 'is', null);

      if (error) throw error;

      migrationResults.total = phoneNumbers?.length || 0;

      for (const phone of phoneNumbers || []) {
        try {
          const sipConfig = phone.sip_config as any;

          // Check if already encrypted
          const inboundEncrypted = sipConfig?.inbound_trunk_config?.credentials?.encrypted;
          const outboundEncrypted = sipConfig?.outbound_trunk_config?.credentials?.encrypted;

          if (inboundEncrypted && outboundEncrypted) {
            // Already encrypted, skip
            migrationResults.skipped++;
            continue;
          }

          // Check if there are any credentials to encrypt
          const hasInboundCreds = sipConfig?.inbound_trunk_config?.credentials?.username ||
                                   sipConfig?.inbound_trunk_config?.credentials?.password;
          const hasOutboundCreds = sipConfig?.outbound_trunk_config?.credentials?.username ||
                                    sipConfig?.outbound_trunk_config?.credentials?.password;

          if (!hasInboundCreds && !hasOutboundCreds) {
            // No credentials to encrypt
            migrationResults.skipped++;
            continue;
          }

          // Encrypt the SIP config
          const encryptedConfig = await encryptSipConfig(sipConfig);

          // Update in database
          const { error: updateError } = await supabase
            .from('phone_numbers')
            .update({ sip_config: encryptedConfig })
            .eq('id', phone.id);

          if (updateError) {
            throw updateError;
          }

          migrationResults.migrated++;
        } catch (phoneError: any) {
          migrationResults.errors.push(`${phone.phone_number}: ${phoneError.message}`);
        }
      }

      setResults(migrationResults);

      if (migrationResults.errors.length === 0) {
        toast({
          title: 'Migration Complete',
          description: `Successfully encrypted ${migrationResults.migrated} phone numbers`,
        });
      } else {
        toast({
          title: 'Migration Complete with Errors',
          description: `Migrated: ${migrationResults.migrated}, Errors: ${migrationResults.errors.length}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast({
        title: 'Migration Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Migrate SIP Credentials</h1>
        <p className="text-muted-foreground mb-6">
          This tool encrypts existing SIP credentials stored in the database.
          Run this once after deploying the encryption feature.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            <strong>Warning:</strong> This operation will encrypt all unencrypted SIP credentials.
            Make sure you have a backup before proceeding.
          </p>
        </div>

        <Button
          onClick={runMigration}
          disabled={isRunning}
          className="mb-6"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Migration...
            </>
          ) : (
            'Run Migration'
          )}
        </Button>

        {results && (
          <div className="bg-muted/30 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold">Migration Results</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{results.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{results.migrated}</div>
                <div className="text-sm text-muted-foreground">Migrated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-500">{results.skipped}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({results.errors.length})
                </h4>
                <ul className="mt-2 space-y-1">
                  {results.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.errors.length === 0 && results.migrated > 0 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>All credentials encrypted successfully!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MigrateSipCredentials;
