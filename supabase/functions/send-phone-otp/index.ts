// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const INFOBIP_API_KEY = Deno.env.get('INFOBIP_API_KEY');
const INFOBIP_BASE_URL = Deno.env.get('INFOBIP_BASE_URL') || 'https://api.infobip.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Generate a 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple hash function for OTP (in production, use bcrypt or similar)
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify OTP hash
async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  const otpHash = await hashOTP(otp);
  return otpHash === hash;
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

    const { phone_number } = await req.json();

    console.log('Send Phone OTP Request:', { userId: user.id, phone: phone_number?.substring(0, 6) + '***' });

    if (!phone_number) {
      throw new Error('Missing required parameter: phone_number');
    }

    if (!INFOBIP_API_KEY) {
      throw new Error('Infobip API key not configured');
    }

    // Normalize phone number (ensure E.164 format)
    let normalizedPhone = phone_number.toString().trim();
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    normalizedPhone = normalizedPhone.replace(/[\s-]/g, '');

    // Check for existing recent verification
    const { data: existingVerifications, error: checkError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (checkError) {
      console.error('Error checking existing verifications:', checkError);
    }

    // If there's a recent OTP (less than 1 minute old), don't send a new one
    if (existingVerifications && existingVerifications.length > 0) {
      const lastVerification = existingVerifications[0];
      const timeSinceCreation = Date.now() - new Date(lastVerification.created_at).getTime();

      if (timeSinceCreation < 60000) { // 1 minute
        return new Response(JSON.stringify({
          success: false,
          error: 'Trebuie să aștepți 1 minut înainte de a trimite un nou cod OTP.',
          remainingTime: Math.ceil((60000 - timeSinceCreation) / 1000)
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        });
      }
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpHash = await hashOTP(otpCode);

    // Store OTP in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: verification, error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        user_id: user.id,
        phone_number: normalizedPhone,
        otp_code: otpHash,
        attempts: 0,
        verified: false,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting verification:', insertError);
      throw new Error('Failed to create verification record');
    }

    // Prepare SMS message
    const smsText = `Codul tău de verificare Agent Automation este: ${otpCode}\n\nCodul expiră în 10 minute.\n\nDacă nu ai solicitat acest cod, ignoră acest mesaj.`;

    // Send SMS via Infobip
    const smsPayload = {
      messages: [{
        destinations: [{ to: normalizedPhone }],
        from: 'Agent Automation',
        text: smsText
      }]
    };

    console.log('Sending SMS via Infobip to:', normalizedPhone.substring(0, 6) + '***');

    const smsResponse = await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(smsPayload)
    });

    const smsResult = await smsResponse.json();

    console.log('Infobip SMS response status:', smsResponse.status);

    if (!smsResponse.ok) {
      console.error('Infobip SMS error:', smsResult);

      // Delete the verification record since SMS failed
      await supabase
        .from('phone_verifications')
        .delete()
        .eq('id', verification.id);

      const errorMessage = smsResult.requestError?.serviceException?.text ||
                          smsResult.requestError?.serviceException?.messageId ||
                          'Nu am putut trimite SMS-ul. Verifică numărul de telefon.';
      throw new Error(errorMessage);
    }

    console.log('OTP sent successfully to:', normalizedPhone.substring(0, 6) + '***');

    return new Response(JSON.stringify({
      success: true,
      message: 'Codul OTP a fost trimis cu succes prin SMS',
      verificationId: verification.id,
      expiresAt: expiresAt,
      phone: normalizedPhone
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-phone-otp function:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'A apărut o eroare la trimiterea codului OTP'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
