import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    console.log('🔐 Verifying email token:', token?.substring(0, 8) + '...');

    if (!token) {
      return new Response(
        generateErrorPage("Token de verificare lipsește"),
        { 
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user with this token
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id, email, first_name')
      .eq('email_verification_token', token)
      .maybeSingle();

    if (findError || !profile) {
      console.error('❌ Token not found or expired:', findError);
      return new Response(
        generateErrorPage("Token invalid sau expirat. Te rugăm să soliciți un nou email de verificare."),
        { 
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    console.log('✅ Found user for token:', profile.email);

    // Update profile - set verified and clear token
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        custom_email_verified_at: new Date().toISOString(),
        email_verification_token: null
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      return new Response(
        generateErrorPage("Eroare la verificarea emailului. Te rugăm să încerci din nou."),
        { 
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        }
      );
    }

    console.log('✅ Email verified successfully for user:', profile.id);

    // Redirect to app
    const appUrl = Deno.env.get("APP_URL") || "https://agentauto.ai";
    
    return new Response(
      generateSuccessPage(appUrl, profile.first_name),
      { 
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  } catch (error: any) {
    console.error('❌ Error in verify-custom-email:', error);
    return new Response(
      generateErrorPage("A apărut o eroare neașteptată."),
      { 
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }
    );
  }
});

function generateSuccessPage(appUrl: string, firstName?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Confirmat - Agent Automation</title>
      <meta http-equiv="refresh" content="3;url=${appUrl}">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 48px;
          max-width: 420px;
          text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .icon {
          width: 72px;
          height: 72px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .icon svg {
          width: 36px;
          height: 36px;
          color: white;
        }
        h1 {
          font-size: 24px;
          font-weight: 700;
          color: #111;
          margin-bottom: 12px;
        }
        p {
          font-size: 15px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .btn {
          display: inline-block;
          background: #111;
          color: white;
          padding: 14px 32px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          border-radius: 8px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .loading {
          font-size: 13px;
          color: #888;
          margin-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h1>Email Confirmat! 🎉</h1>
        <p>${firstName ? `Salut ${firstName}! ` : ''}Adresa ta de email a fost verificată cu succes. Acum ai acces complet la Agent Automation.</p>
        <a href="${appUrl}" class="btn">Mergi la Dashboard</a>
        <p class="loading">Redirecționare automată în 3 secunde...</p>
      </div>
    </body>
    </html>
  `;
}

function generateErrorPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Eroare Verificare - Agent Automation</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 48px;
          max-width: 420px;
          text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .icon {
          width: 72px;
          height: 72px;
          background: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .icon svg {
          width: 36px;
          height: 36px;
          color: white;
        }
        h1 {
          font-size: 24px;
          font-weight: 700;
          color: #111;
          margin-bottom: 12px;
        }
        p {
          font-size: 15px;
          color: #666;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h1>Eroare la Verificare</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}
