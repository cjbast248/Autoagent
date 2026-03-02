// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Agentauto's default Infobip credentials (from environment)
const AGENTAUTO_INFOBIP_API_KEY = Deno.env.get('INFOBIP_API_KEY');
const AGENTAUTO_INFOBIP_BASE_URL = Deno.env.get('INFOBIP_BASE_URL') || 'https://api.infobip.com';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      from, 
      to, 
      text,
      // Custom account credentials (optional)
      useCustomAccount,
      apiKey: customApiKey,
      baseUrl: customBaseUrl 
    } = await req.json();
    
    console.log('Infobip SMS Request:', { from, to, textLength: text?.length, useCustomAccount });
    
    if (!to || !text) {
      console.error('Missing required parameters');
      throw new Error('Missing required parameters: to or text');
    }

    // Determine which credentials to use
    const apiKey = useCustomAccount && customApiKey ? customApiKey : AGENTAUTO_INFOBIP_API_KEY;
    const baseUrl = useCustomAccount && customBaseUrl ? customBaseUrl : AGENTAUTO_INFOBIP_BASE_URL;

    if (!apiKey) {
      console.error('Infobip API key not configured');
      throw new Error('Infobip API key not configured. Please set INFOBIP_API_KEY in environment or provide custom credentials.');
    }

    // Normalize phone number (ensure it has + prefix)
    let toNumber = to.toString().trim();
    if (!toNumber.startsWith('+')) {
      toNumber = '+' + toNumber;
    }
    // Remove any spaces or dashes
    toNumber = toNumber.replace(/[\s-]/g, '');

    // Prepare SMS payload for Infobip
    const smsPayload = {
      messages: [
        {
          destinations: [
            { to: toNumber }
          ],
          from: from || 'Agentauto',
          text: text
        }
      ]
    };

    console.log('Infobip SMS payload:', JSON.stringify(smsPayload, null, 2));

    // Call Infobip SMS API
    const smsResponse = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(smsPayload)
    });

    const smsResult = await smsResponse.json();
    
    console.log('Infobip SMS API response status:', smsResponse.status);
    console.log('Infobip SMS API response:', JSON.stringify(smsResult, null, 2));

    if (!smsResponse.ok) {
      console.error('Infobip SMS API error:', smsResult);
      const errorMessage = smsResult.requestError?.serviceException?.text || 
                          smsResult.requestError?.serviceException?.messageId ||
                          smsResult.error?.message ||
                          'Unknown Infobip error';
      throw new Error(`Infobip SMS API error: ${errorMessage}`);
    }

    // Extract message ID from response
    const messageId = smsResult.messages?.[0]?.messageId || null;
    const status = smsResult.messages?.[0]?.status?.name || 'SENT';

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'SMS sent successfully via Infobip',
      messageId,
      status,
      to: toNumber,
      infobipResponse: smsResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in infobip-send-sms function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

