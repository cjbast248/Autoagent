
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-http-method, x-http-url, x-http-headers, x-http-body',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request details from headers
    const targetUrl = req.headers.get('x-http-url');
    const targetMethod = req.headers.get('x-http-method') || 'GET';
    const targetHeadersRaw = req.headers.get('x-http-headers');
    
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: true, message: 'Missing x-http-url header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[HTTP Proxy] ${targetMethod} ${targetUrl}`);

    // Parse target headers
    let targetHeaders: Record<string, string> = {};
    if (targetHeadersRaw) {
      try {
        targetHeaders = JSON.parse(targetHeadersRaw);
      } catch (e) {
        console.error('Failed to parse target headers:', e);
      }
    }

    // Get body for non-GET requests
    let body: string | undefined;
    if (targetMethod !== 'GET' && targetMethod !== 'HEAD') {
      try {
        body = await req.text();
        if (body) {
          console.log(`[HTTP Proxy] Body length: ${body.length}`);
        }
      } catch (e) {
        console.error('Failed to read body:', e);
      }
    }

    const startTime = Date.now();

    // Make the actual request
    const response = await fetch(targetUrl, {
      method: targetMethod,
      headers: targetHeaders,
      body: body || undefined,
    });

    const duration = Date.now() - startTime;
    console.log(`[HTTP Proxy] Response: ${response.status} in ${duration}ms`);

    // Get response data
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }
    } else {
      responseData = await response.text();
    }

    // Build response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      // Skip headers that might cause issues
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    // Return proxied response
    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData,
      duration: `${duration}ms`,
      url: targetUrl,
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[HTTP Proxy] Error:', error.message);
    
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || 'Proxy request failed',
        details: error.toString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
