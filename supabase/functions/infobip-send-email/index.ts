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
      fromEmail,
      fromName,
      toEmail,
      subject,
      body,
      bodyType, // 'text' or 'html'
      // Custom account credentials (optional)
      useCustomAccount,
      apiKey: customApiKey,
      baseUrl: customBaseUrl 
    } = await req.json();
    
    console.log('Infobip Email Request:', { 
      fromEmail, 
      fromName, 
      toEmail, 
      subject, 
      bodyType,
      bodyLength: body?.length,
      useCustomAccount 
    });
    
    if (!fromEmail || !toEmail || !subject) {
      console.error('Missing required parameters');
      throw new Error('Missing required parameters: fromEmail, toEmail, or subject');
    }

    // Determine which credentials to use
    const apiKey = useCustomAccount && customApiKey ? customApiKey : AGENTAUTO_INFOBIP_API_KEY;
    const baseUrl = useCustomAccount && customBaseUrl ? customBaseUrl : AGENTAUTO_INFOBIP_BASE_URL;

    if (!apiKey) {
      console.error('Infobip API key not configured');
      throw new Error('Infobip API key not configured. Please set INFOBIP_API_KEY in environment or provide custom credentials.');
    }

    // Prepare Email payload for Infobip
    // Using the Email Send API: https://www.infobip.com/docs/api/channels/email/send-email
    const emailPayload = {
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: toEmail,
      subject: subject,
    };

    // Add body based on type
    if (bodyType === 'html') {
      emailPayload.html = body || '<p></p>';
    } else {
      emailPayload.text = body || '';
    }

    console.log('Infobip Email payload:', JSON.stringify(emailPayload, null, 2));

    // Infobip Email API uses form-data for the simple API endpoint
    // For simplicity, we'll use the JSON API if available, otherwise multipart
    
    // Create FormData for Infobip Email API
    const formData = new FormData();
    formData.append('from', emailPayload.from);
    formData.append('to', emailPayload.to);
    formData.append('subject', emailPayload.subject);
    
    if (bodyType === 'html') {
      formData.append('html', emailPayload.html);
    } else {
      formData.append('text', emailPayload.text);
    }

    // Call Infobip Email API
    const emailResponse = await fetch(`${baseUrl}/email/3/send`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Accept': 'application/json'
        // Note: Don't set Content-Type for FormData, browser/fetch will set it automatically with boundary
      },
      body: formData
    });

    const emailResult = await emailResponse.json();
    
    console.log('Infobip Email API response status:', emailResponse.status);
    console.log('Infobip Email API response:', JSON.stringify(emailResult, null, 2));

    if (!emailResponse.ok) {
      console.error('Infobip Email API error:', emailResult);
      const errorMessage = emailResult.requestError?.serviceException?.text || 
                          emailResult.requestError?.serviceException?.messageId ||
                          emailResult.error?.message ||
                          emailResult.message ||
                          'Unknown Infobip error';
      throw new Error(`Infobip Email API error: ${errorMessage}`);
    }

    // Extract message ID from response
    const messageId = emailResult.messages?.[0]?.messageId || 
                     emailResult.bulkId ||
                     emailResult.messageId || 
                     null;
    const status = emailResult.messages?.[0]?.status?.name || 
                  emailResult.status?.name ||
                  'SENT';

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully via Infobip',
      messageId,
      status,
      to: toEmail,
      infobipResponse: emailResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in infobip-send-email function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

