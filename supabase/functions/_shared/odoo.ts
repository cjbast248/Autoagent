import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface OdooCredentials {
  base_url: string;
  db: string;
  username: string;
  api_key: string;
  uid?: number;
}

export interface OdooConnection {
  id: string;
  user_id: string;
  base_url: string;
  db: string;
  username: string;
  api_key: string;
  uid: number | null;
  status: string;
  last_checked: string | null;
  error: string | null;
}

/**
 * Get Odoo credentials for a user
 * Priority: explicit params > saved connection > error
 */
export async function getOdooCredentials(
  supabaseClient: any,
  userId: string,
  explicitCreds?: Partial<OdooCredentials>
): Promise<OdooCredentials> {
  // If all explicit credentials provided, use them
  if (
    explicitCreds?.base_url &&
    explicitCreds?.db &&
    explicitCreds?.username &&
    explicitCreds?.api_key
  ) {
    return explicitCreds as OdooCredentials;
  }

  // Otherwise, fetch from database
  const { data: connections, error } = await supabaseClient
    .from("odoo_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "connected")
    .order("last_checked", { ascending: false })
    .limit(1);

  if (error || !connections || connections.length === 0) {
    throw new Error("No Odoo connection found. Please configure Odoo credentials first.");
  }

  const connection: OdooConnection = connections[0];

  return {
    base_url: explicitCreds?.base_url || connection.base_url,
    db: explicitCreds?.db || connection.db,
    username: explicitCreds?.username || connection.username,
    api_key: explicitCreds?.api_key || connection.api_key,
    uid: connection.uid || undefined,
  };
}

/**
 * Authenticate with Odoo and get session info
 */
export async function authenticateOdoo(
  credentials: OdooCredentials
): Promise<{ uid: number; session_id?: string }> {
  const authResponse = await fetch(`${credentials.base_url}/web/session/authenticate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      params: {
        db: credentials.db,
        login: credentials.username,
        password: credentials.api_key,
      },
    }),
  });

  const authData = await authResponse.json();

  if (authData.error) {
    throw new Error(authData.error.data?.message || "Odoo authentication failed");
  }

  if (!authData.result?.uid) {
    throw new Error("Invalid Odoo authentication response");
  }

  return {
    uid: authData.result.uid,
    session_id: authData.result.session_id,
  };
}

/**
 * Execute an Odoo XML-RPC call via JSON-RPC
 */
export async function executeOdooKw(
  credentials: OdooCredentials,
  model: string,
  method: string,
  args: any[] = [],
  kwargs: Record<string, any> = {}
): Promise<any> {
  // Authenticate first if no UID
  let uid = credentials.uid;
  if (!uid) {
    const authResult = await authenticateOdoo(credentials);
    uid = authResult.uid;
  }

  const response = await fetch(`${credentials.base_url}/jsonrpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          credentials.db,
          uid,
          credentials.api_key,
          model,
          method,
          args,
          kwargs,
        ],
      },
      id: Date.now(),
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.data?.message || data.error.message || "Odoo API error");
  }

  return data.result;
}

/**
 * Get user ID from Supabase auth header
 */
export function getUserIdFromRequest(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }
  // In Supabase Edge Functions, we'll verify the JWT
  // For now, we'll use createClient which handles this
  return ""; // Will be set by createClient
}

/**
 * Create Supabase client from request
 */
export function createSupabaseClient(req: Request) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );
}

/**
 * CORS headers
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};
