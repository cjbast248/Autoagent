/**
 * CORS configuration for Google Sheets Edge Functions
 * Security: Never allow wildcard origins in production
 */

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS') || '';
  const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);

  // Default allowed origins
  const defaultOrigins = [
    // Production
    'https://agentauto.app',
    'https://www.agentauto.app',
    'https://app.agentauto.app',
    // Development
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
  ];

  const allAllowedOrigins = [...new Set([...defaultOrigins, ...allowedOrigins])];

  // Check if request origin is allowed
  let origin = 'null';
  if (requestOrigin && allAllowedOrigins.includes(requestOrigin)) {
    origin = requestOrigin;
  } else if (!requestOrigin && allowedOrigins.length === 0) {
    // Development mode fallback - only if no ALLOWED_ORIGINS configured
    origin = 'http://localhost:3000';
  }

  // In production, never return wildcard
  const isProduction = Deno.env.get('DENO_ENV') === 'production' ||
                       allowedOriginsEnv.includes('agentauto.app');

  if (isProduction && origin === 'null') {
    console.warn('CORS: Request from unauthorized origin blocked in production');
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsPreflightRequest(requestOrigin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(requestOrigin),
  });
}
