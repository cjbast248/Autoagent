// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phoneNumber, message, smsConfig } = await req.json();
    
    console.log('Sending SMS to:', phoneNumber);
    console.log('Message:', message);
    console.log('SMS Config:', { ...smsConfig, apiToken: '[HIDDEN]' });
    
    if (!phoneNumber || !message || !smsConfig) {
      console.error('Missing required parameters');
      throw new Error('Missing required parameters: phoneNumber, message, or smsConfig');
    }
    
    if (!smsConfig.enabled) {
      console.log('SMS is disabled in config');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'SMS is disabled in configuration' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!smsConfig.apiToken) {
      console.error('SMS API token not configured');
      throw new Error('SMS API token not configured');
    }

    // Prepare SMS payload
    const smsPayload = {
      messages: [
        {
          message: message,
          to: phoneNumber
        }
      ],
      sender_id: smsConfig.senderId || 'aichat'
    };

    console.log('SMS payload:', smsPayload);

    // Call SMS.to API
    const smsResponse = await fetch('https://api.sms.to/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${smsConfig.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsPayload)
    });

    const smsResult = await smsResponse.json();
    
    console.log('SMS API response status:', smsResponse.status);
    console.log('SMS API response:', smsResult);

    if (!smsResponse.ok) {
      console.error('SMS API error:', smsResult);
      throw new Error(`SMS API error: ${smsResult.message || 'Unknown error'}`);
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'SMS sent successfully',
      smsResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in send-sms function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});