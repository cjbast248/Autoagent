import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const ASTERISK_CONFIG_API = 'http://193.53.40.79:3080';
const ASTERISK_API_KEY = '64b84af15a2d2bb768b373eb05db606dd4a4c3b37a746857052069be8a3b6770';

Deno.serve(async (req: Request) => {
  console.log('Delete phone number called:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_id, user_id } = await req.json();

    console.log('🗑️ Deleting phone number:', { phone_id, user_id });

    if (!phone_id || !user_id) {
      throw new Error('Missing required fields: phone_id, user_id');
    }

    // Get phone number details first (verify ownership and get IDs)
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('id', phone_id)
      .eq('user_id', user_id)
      .single();

    if (phoneError || !phoneData) {
      throw new Error('Phone number not found or access denied');
    }

    console.log('📱 Phone number found:', {
      phone_number: phoneData.phone_number,
      elevenlabs_phone_id: phoneData.elevenlabs_phone_id,
      label: phoneData.label,
    });

    const results = {
      elevenlabs_deleted: false,
      asterisk_deleted: false,
      database_deleted: false,
      errors: [] as string[],
    };

    // 1. Delete from ElevenLabs
    if (phoneData.elevenlabs_phone_id) {
      const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
      if (apiKey) {
        try {
          console.log('🔗 Deleting from ElevenLabs:', phoneData.elevenlabs_phone_id);
          const elevenlabsResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneData.elevenlabs_phone_id}`,
            {
              method: 'DELETE',
              headers: {
                'xi-api-key': apiKey,
              },
            }
          );

          if (elevenlabsResponse.ok || elevenlabsResponse.status === 404) {
            results.elevenlabs_deleted = true;
            console.log('✅ ElevenLabs phone deleted');
          } else {
            const errorText = await elevenlabsResponse.text();
            console.error('❌ ElevenLabs delete failed:', errorText);
            results.errors.push(`ElevenLabs: ${errorText}`);
          }
        } catch (e) {
          console.error('❌ ElevenLabs delete error:', e);
          results.errors.push(`ElevenLabs: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      } else {
        console.warn('⚠️ ELEVENLABS_API_KEY not configured');
        results.errors.push('ElevenLabs: API key not configured');
      }
    } else {
      console.log('ℹ️ No ElevenLabs phone ID, skipping');
      results.elevenlabs_deleted = true; // Nothing to delete
    }

    // 2. Delete from Asterisk
    // Use the stored config ID, or generate it from label (same as create function)
    const configId = phoneData.asterisk_config_id ||
                     (phoneData.label || 'phone').toLowerCase().replace(/[^a-z0-9]/g, '');

    try {
      console.log('🔗 Deleting from Asterisk:', configId);
      const asteriskResponse = await fetch(
        `${ASTERISK_CONFIG_API}/api/phone-numbers/${configId}`,
        {
          method: 'DELETE',
          headers: {
            'x-api-key': ASTERISK_API_KEY,
          },
        }
      );

      const asteriskResult = await asteriskResponse.json();

      if (asteriskResponse.ok || asteriskResult.status === 'ok') {
        results.asterisk_deleted = true;
        console.log('✅ Asterisk config deleted:', asteriskResult);
      } else if (asteriskResponse.status === 404) {
        results.asterisk_deleted = true; // Already gone
        console.log('ℹ️ Asterisk config not found (already deleted)');
      } else {
        console.error('❌ Asterisk delete failed:', asteriskResult);
        results.errors.push(`Asterisk: ${asteriskResult.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('❌ Asterisk delete error:', e);
      results.errors.push(`Asterisk: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 3. Delete from Supabase database
    // Only proceed if at least ElevenLabs was deleted (or had nothing to delete)
    if (results.elevenlabs_deleted) {
      const { error: deleteError } = await supabase
        .from('phone_numbers')
        .delete()
        .eq('id', phone_id)
        .eq('user_id', user_id);

      if (deleteError) {
        console.error('❌ Database delete error:', deleteError);
        results.errors.push(`Database: ${deleteError.message}`);
      } else {
        results.database_deleted = true;
        console.log('✅ Database record deleted');
      }
    } else {
      results.errors.push('Database: Skipped because ElevenLabs deletion failed');
    }

    const success = results.database_deleted;

    console.log('🏁 Delete complete:', results);

    return new Response(
      JSON.stringify({
        success,
        message: success
          ? 'Phone number deleted successfully from all services'
          : 'Partial deletion - check errors',
        phone_id,
        phone_number: phoneData.phone_number,
        results,
      }),
      {
        status: success ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in delete-phone-number:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
