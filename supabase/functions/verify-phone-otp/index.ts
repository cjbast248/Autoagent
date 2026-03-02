// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_ATTEMPTS = 5; // Maximum verification attempts

// Simple hash function for OTP (must match send-phone-otp)
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    const { otp_code, phone_number } = await req.json();

    console.log('Verify Phone OTP Request:', { userId: user.id, phone: phone_number?.substring(0, 6) + '***' });

    if (!otp_code || !phone_number) {
      throw new Error('Missing required parameters: otp_code and phone_number');
    }

    // Normalize phone number
    let normalizedPhone = phone_number.toString().trim();
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    normalizedPhone = normalizedPhone.replace(/[\s-]/g, '');

    // Get the most recent verification for this user and phone
    const { data: verifications, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching verification:', fetchError);
      throw new Error('Nu am putut găsi codul de verificare');
    }

    if (!verifications || verifications.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Cod invalid sau expirat. Te rugăm să soliciti un cod nou.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const verification = verifications[0];

    // Check if max attempts exceeded
    if (verification.attempts >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Ai depășit numărul maxim de încercări. Te rugăm să soliciti un cod nou.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429
      });
    }

    // Hash the provided OTP and compare
    const otpHash = await hashOTP(otp_code);
    const isValid = otpHash === verification.otp_code;

    if (!isValid) {
      // Increment attempts
      const newAttempts = verification.attempts + 1;
      await supabase
        .from('phone_verifications')
        .update({
          attempts: newAttempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', verification.id);

      const remainingAttempts = MAX_ATTEMPTS - newAttempts;

      return new Response(JSON.stringify({
        success: false,
        error: remainingAttempts > 0
          ? `Cod invalid. Mai ai ${remainingAttempts} ${remainingAttempts === 1 ? 'încercare' : 'încercări'}.`
          : 'Cod invalid. Ai depășit numărul maxim de încercări.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // OTP is valid - mark as verified
    const { error: updateVerificationError } = await supabase
      .from('phone_verifications')
      .update({
        verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    if (updateVerificationError) {
      console.error('Error updating verification:', updateVerificationError);
      throw new Error('A apărut o eroare la actualizarea verificării');
    }

    // Update user profile with verified phone
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        phone_number: normalizedPhone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError);
      throw new Error('A apărut o eroare la actualizarea profilului');
    }

    console.log('Phone verification successful for user:', user.id);

    // Clean up old verifications for this user
    await supabase
      .from('phone_verifications')
      .delete()
      .eq('user_id', user.id)
      .neq('id', verification.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Numărul de telefon a fost verificat cu succes!',
      phone: normalizedPhone,
      verified: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in verify-phone-otp function:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'A apărut o eroare la verificarea codului OTP'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
