import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { action, phoneId, targetUserId, sharedPhoneId } = await req.json();

    if (action === 'share') {
      console.log('[admin-share-phone] Share action started');
      console.log('[admin-share-phone] phoneId:', phoneId, 'targetUserId:', targetUserId, 'user.id:', user.id);

      // Share phone number with user (direct update, no RPC)
      const { data: phone, error: fetchError } = await supabase
        .from('phone_numbers')
        .select('id, user_id, owner_user_id, status')
        .eq('id', phoneId)
        .single();

      console.log('[admin-share-phone] Fetched phone:', phone, 'error:', fetchError);

      if (fetchError || !phone) throw new Error('Număr de telefon inexistent');

      // Only the owner can share
      const isOwner = phone.user_id === user.id || phone.owner_user_id === user.id;
      console.log('[admin-share-phone] isOwner check:', isOwner, 'phone.user_id:', phone.user_id, 'phone.owner_user_id:', phone.owner_user_id);

      if (!isOwner) throw new Error('Permisiune insuficientă pentru partajare');

      if (phone.status !== 'active') throw new Error('Numărul nu este activ');

      const updateData = {
        is_shared: true,
        owner_user_id: phone.owner_user_id || user.id,
        shared_with_user_id: targetUserId,
        updated_at: new Date().toISOString()
      };
      console.log('[admin-share-phone] Update data:', updateData);

      const { data: updateResult, error: updateError } = await supabase
        .from('phone_numbers')
        .update(updateData)
        .eq('id', phoneId)
        .select();

      console.log('[admin-share-phone] Update result:', updateResult, 'error:', updateError);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          sharedPhoneId: phoneId,
          message: 'Numărul de telefon a fost partajat cu succes' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (action === 'unshare') {
      // Revoke phone number sharing (direct update, no RPC)
      const { data: phone, error: fetchError } = await supabase
        .from('phone_numbers')
        .select('id, user_id, owner_user_id, shared_with_user_id')
        .eq('id', sharedPhoneId)
        .single();

      if (fetchError || !phone) throw new Error('Partajare inexistentă');

      const isOwner = phone.owner_user_id === user.id || phone.user_id === user.id;
      if (!isOwner) throw new Error('Permisiune insuficientă pentru revocare');

      const { error: updateError } = await supabase
        .from('phone_numbers')
        .update({
          is_shared: false,
          shared_with_user_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sharedPhoneId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Numărul de telefon a fost revocat cu succes' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (action === 'list') {
      // List all shared phone numbers for a user
      const { data: sharedPhones, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('is_shared', true)
        .eq('shared_with_user_id', targetUserId)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, sharedPhones }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else {
      throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in admin-share-phone:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
