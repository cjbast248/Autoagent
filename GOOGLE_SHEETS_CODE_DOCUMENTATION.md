# DOCUMENTAȚIE COMPLETĂ - INTEGRARE GOOGLE SHEETS

## Descriere Proiect
Aceasta este o aplicație Voice AI (Kallina) care are integrare cu Google Sheets pentru:
- Importul contactelor din Google Sheets
- Exportul rezultatelor apelurilor în Google Sheets
- Sincronizare automată după fiecare apel

## PROBLEME CUNOSCUTE (DE REZOLVAT)
1. **URL-uri hardcodate** - Supabase URL scris direct în cod
2. **Tokeni OAuth în plain text** - Risc de securitate
3. **Logica refresh token duplicată** - În mai multe funcții
4. **Validare insuficientă** - Numere de telefon, spreadsheet ID
5. **Auto-export nu funcționează** - Flag-urile există dar nu sunt implementate
6. **CORS permisiv** - `Access-Control-Allow-Origin: '*'`
7. **Lipsă rate limiting**

---

## STRUCTURA BAZEI DE DATE

### Tabel: google_sheets_integrations
```sql
CREATE TABLE IF NOT EXISTS public.google_sheets_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  spreadsheet_name TEXT NOT NULL,
  sheet_name TEXT DEFAULT 'Kalina Data',
  credentials JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT DEFAULT 'manual',
  auto_export_conversations BOOLEAN DEFAULT false,
  auto_export_leads BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Coloane adăugate ulterior:
  oauth_access_token text,
  oauth_refresh_token text,
  oauth_token_expiry timestamp with time zone,
  column_mapping jsonb DEFAULT '{}'::jsonb,
  auto_update_on_call boolean DEFAULT true,
  update_strategy text DEFAULT 'realtime',
  last_import_at timestamp with time zone,
  total_contacts integer DEFAULT 0,
  UNIQUE(user_id, spreadsheet_id)
);
```

### Tabel: google_sheets_contacts
```sql
CREATE TABLE IF NOT EXISTS public.google_sheets_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id uuid NOT NULL REFERENCES public.google_sheets_integrations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  row_number integer NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  location text,
  language text DEFAULT 'ro',
  metadata jsonb DEFAULT '{}'::jsonb,
  call_status text DEFAULT 'pending',
  last_call_at timestamp with time zone,
  conversation_id text,
  call_result jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

### Tabel: google_sheets_connections (OAuth tokens)
```sql
CREATE TABLE IF NOT EXISTS public.google_sheets_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  google_email TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Tabel: google_sheets_oauth_states (CSRF protection)
```sql
CREATE TABLE IF NOT EXISTS public.google_sheets_oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  state TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Tabel: google_sheets_templates
```sql
CREATE TABLE IF NOT EXISTS public.google_sheets_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  column_mapping JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

---

## VARIABILE DE MEDIU NECESARE

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Google OAuth
GOOGLE_SHEETS_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_SHEETS_CLIENT_SECRET=GOCSPX-xxxxx

# App URL (pentru redirect)
APP_URL=https://your-app-url.com
```

---

## FLOW OAUTH ACTUAL

1. User click "Conectează cu Google"
2. Frontend apelează `google-sheets-oauth-init`
3. Backend generează state token și URL OAuth
4. User este redirecționat la Google pentru autorizare
5. Google redirecționează înapoi la `google-sheets-oauth-callback`
6. Backend validează state, schimbă code pentru tokens
7. Tokenii sunt salvați în `google_sheets_connections`
8. User este redirecționat înapoi la aplicație cu `?success=true`

---

## CODUL SURSĂ COMPLET

### 1. PAGINA PRINCIPALĂ: GoogleSheetsIntegration.tsx

```tsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { GoogleSheetsFilePicker } from '@/components/integrations/GoogleSheetsFilePicker';
import { GoogleSheetsColumnMapper } from '@/components/integrations/GoogleSheetsColumnMapper';
import { GoogleSheetsCampaignManager } from '@/components/integrations/GoogleSheetsCampaignManager';
import { GoogleSheetsHelpDialog } from '@/components/integrations/GoogleSheetsHelpDialog';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Settings,
  Trash2,
  ExternalLink,
  FolderOpen,
  HelpCircle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GoogleSheetsIntegration {
  id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_name: string;
  is_active: boolean;
  last_sync_at: string | null;
  auto_export_conversations: boolean;
  auto_export_leads: boolean;
  created_at: string;
  credentials: {
    api_key?: string;
  };
}

interface GoogleSheetsConnection {
  id: string;
  google_email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const GoogleSheetsIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<GoogleSheetsIntegration[]>([]);
  const [connection, setConnection] = useState<GoogleSheetsConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [columnMapperOpen, setColumnMapperOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [viewingIntegration, setViewingIntegration] = useState<GoogleSheetsIntegration | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [autoOpenedPicker, setAutoOpenedPicker] = useState(false);

  // Form state for new integration
  const [formData, setFormData] = useState({
    spreadsheetId: '',
    spreadsheetName: '',
    sheetName: 'Kalina Data',
    apiKey: '',
    autoExportConversations: false,
    autoExportLeads: false
  });

  useEffect(() => {
    if (user) {
      fetchIntegrations();
      fetchConnection();

      // Check URL params for OAuth callback results
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');

      if (success === 'true') {
        toast({
          title: 'Conectat cu succes!',
          description: 'Contul Google Sheets a fost conectat.',
        });
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        // Refresh connection status
        fetchConnection();
        // Auto-open file picker
        setTimeout(() => setFilePickerOpen(true), 500);
      } else if (error) {
        toast({
          title: 'Eroare la conectare',
          description: `Nu s-a putut conecta: ${error}`,
          variant: 'destructive'
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user]);

  // Auto-open file picker once after successful connection
  useEffect(() => {
    if (autoOpenedPicker || !connection) return;
    if (connection.status === 'connected') {
      setFilePickerOpen(true);
      setAutoOpenedPicker(true);
    }
  }, [connection, autoOpenedPicker]);

  const fetchConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('google_sheets_connections')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching connection:', error);
      }
      setConnection(data as GoogleSheetsConnection || null);
    } catch (error) {
      console.error('Error fetching connection:', error);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('google_sheets_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data as GoogleSheetsIntegration[] || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca integrările',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      setConnecting(true);

      // Use dedicated Google Sheets OAuth flow
      const { data, error } = await supabase.functions.invoke('google-sheets-oauth-init');

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success || !data?.authUrl) {
        throw new Error(data?.error || 'Failed to initialize OAuth');
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl;

    } catch (error: any) {
      console.error('Google connect error:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Eroare la conectarea cu Google',
        variant: 'destructive'
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('google_sheets_connections')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      setConnection(null);
      toast({
        title: 'Deconectat',
        description: 'Contul Google Sheets a fost deconectat.'
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut deconecta contul',
        variant: 'destructive'
      });
    }
  };

  const handleFileSelected = (file: any) => {
    setSelectedFile(file);
    setFormData(prev => ({
      ...prev,
      spreadsheetId: file.id,
      spreadsheetName: file.name,
    }));
    setColumnMapperOpen(true);
  };

  // Fallback: deschide mapper-ul direct folosind Spreadsheet ID introdus manual (OAuth)
  const openMapperWithManualId = () => {
    if (!formData.spreadsheetId) {
      toast({
        title: 'Eroare',
        description: 'Introdu un Spreadsheet ID valid.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile({ id: formData.spreadsheetId, name: formData.spreadsheetName || formData.spreadsheetId });
    setColumnMapperOpen(true);
  };

  const handleMappingComplete = async (mapping: any, autoUpdate: boolean) => {
    try {
      const { error } = await supabase
        .from('google_sheets_integrations')
        .insert({
          user_id: user?.id,
          spreadsheet_id: formData.spreadsheetId,
          spreadsheet_name: formData.spreadsheetName,
          sheet_name: formData.sheetName,
          credentials: { auth_method: 'oauth' },
          column_mapping: mapping,
          auto_update_on_call: autoUpdate,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Integrarea Google Sheets a fost configurată!'
      });

      fetchIntegrations();
      setFormData({
        spreadsheetId: '',
        spreadsheetName: '',
        sheetName: 'Kalina Data',
        apiKey: '',
        autoExportConversations: false,
        autoExportLeads: false
      });
    } catch (error: any) {
      console.error('Error creating integration:', error);
      toast({
        title: 'Eroare',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.apiKey) {
      toast({
        title: 'Eroare',
        description: 'Te rog completează API Key',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('google_sheets_integrations')
        .insert({
          user_id: user?.id,
          spreadsheet_id: formData.spreadsheetId,
          spreadsheet_name: formData.spreadsheetName,
          sheet_name: formData.sheetName,
          credentials: { api_key: formData.apiKey },
          auto_export_conversations: formData.autoExportConversations,
          auto_export_leads: formData.autoExportLeads
        });

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Integrare Google Sheets creată cu succes'
      });

      // Reset form
      setFormData({
        spreadsheetId: '',
        spreadsheetName: '',
        sheetName: 'Kalina Data',
        apiKey: '',
        autoExportConversations: false,
        autoExportLeads: false
      });

      fetchIntegrations();
    } catch (error: any) {
      console.error('Error creating integration:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu am putut crea integrarea',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (integrationId: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-sheets', {
        body: { integration_id: integrationId }
      });

      if (error) throw error;

      toast({
        title: 'Sincronizare reușită',
        description: `${data.rows_exported} rânduri exportate în Google Sheets`
      });

      fetchIntegrations();
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast({
        title: 'Eroare la sincronizare',
        description: error.message || 'Nu am putut sincroniza datele',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActive = async (integrationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('google_sheets_integrations')
        .update({ is_active: !currentStatus })
        .eq('id', integrationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Actualizat',
        description: `Integrare ${!currentStatus ? 'activată' : 'dezactivată'}`
      });

      fetchIntegrations();
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut actualiza integrarea',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedIntegration) return;

    try {
      const { error } = await supabase
        .from('google_sheets_integrations')
        .delete()
        .eq('id', selectedIntegration)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Șters',
        description: 'Integrare ștearsă cu succes'
      });

      fetchIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut șterge integrarea',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedIntegration(null);
    }
  };

  return (
    <DashboardLayout>
      {/* ... restul componentei - vezi fișierul original pentru UI complet */}
    </DashboardLayout>
  );
};

export default GoogleSheetsIntegration;
```

---

### 2. BACKEND: google-sheets-oauth-init/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const clientId = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID');
    if (!clientId) {
      throw new Error('Google Sheets Client ID not configured');
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in database for validation
    const { error: stateError } = await supabaseClient
      .from('google_sheets_oauth_states')
      .insert({
        user_id: user.id,
        state: state,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      throw new Error('Failed to initialize OAuth flow');
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-sheets-oauth-callback`;

    // Google Sheets specific scopes
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('Generated Google Sheets OAuth URL for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        authUrl: authUrl.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in google-sheets-oauth-init:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

---

### 3. BACKEND: google-sheets-oauth-callback/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const appUrl = Deno.env.get('APP_URL') || 'https://preview--kalina-voice-ai.lovable.app';

    if (error) {
      console.error('Google OAuth error:', error);
      return Response.redirect(`${appUrl}/account/integrations/google-sheets?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return Response.redirect(`${appUrl}/account/integrations/google-sheets?error=missing_params`);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate state and get user_id
    const { data: stateData, error: stateError } = await supabaseAdmin
      .from('google_sheets_oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .single();

    if (stateError || !stateData) {
      console.error('Invalid or expired state:', stateError);
      return Response.redirect(`${appUrl}/account/integrations/google-sheets?error=invalid_state`);
    }

    // Check if state has expired
    if (new Date(stateData.expires_at) < new Date()) {
      console.error('State has expired');
      await supabaseAdmin.from('google_sheets_oauth_states').delete().eq('state', state);
      return Response.redirect(`${appUrl}/account/integrations/google-sheets?error=expired_state`);
    }

    const userId = stateData.user_id;

    // Delete used state
    await supabaseAdmin.from('google_sheets_oauth_states').delete().eq('state', state);

    // Exchange code for tokens
    const clientId = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-sheets-oauth-callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return Response.redirect(`${appUrl}/account/integrations/google-sheets?error=token_exchange_failed`);
    }

    console.log('Token exchange successful for user:', userId);

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userInfo = await userInfoResponse.json();
    console.log('Google user info:', userInfo.email);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Store or update connection
    const { error: upsertError } = await supabaseAdmin
      .from('google_sheets_connections')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        google_email: userInfo.email,
        status: 'connected',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error storing connection:', upsertError);
      return Response.redirect(`${appUrl}/account/integrations/google-sheets?error=storage_failed`);
    }

    console.log('Google Sheets connection stored successfully for user:', userId);

    return Response.redirect(`${appUrl}/account/integrations/google-sheets?success=true`);

  } catch (error) {
    console.error('Error in google-sheets-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const appUrl = Deno.env.get('APP_URL') || 'https://preview--kalina-voice-ai.lovable.app';
    return Response.redirect(`${appUrl}/account/integrations/google-sheets?error=${encodeURIComponent(errorMessage)}`);
  }
});
```

---

### 4. BACKEND: list-google-sheets-oauth/index.ts

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== list-google-sheets-oauth INVOKED ===');
  console.log('Request method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse user_id from URL query parameters (more reliable than body)
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    console.log('Received user_id from URL:', userId);

    if (!userId) {
      console.log('No user_id provided in request body');
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use Service Role Key for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user exists in profiles table
    console.log('Verifying user exists:', userId);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.log('User not found or invalid:', profileError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User verified successfully:', userId);

    // Get the user's dedicated Google Sheets connection
    console.log('Fetching Google Sheets connection for user:', userId);
    const { data: connection, error: connError } = await supabaseAdmin
      .from('google_sheets_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('Connection query result:', connection ? 'FOUND' : 'NOT FOUND');
    if (connError) {
      console.log('Connection query error:', connError.message);
    }

    if (connError || !connection) {
      console.log('No Google Sheets connection found for user:', userId);
      return new Response(
        JSON.stringify({
          error: 'No Google Sheets connection found. Please connect your Google account.',
          code: 'NO_CONNECTION'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let accessToken = connection.access_token;

    // Check if token is expired and try to refresh
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      console.log('Access token expired, attempting refresh for user:', userId);

      if (!connection.refresh_token) {
        return new Response(
          JSON.stringify({
            error: 'Token expired and no refresh token available. Please reconnect.',
            code: 'OAUTH_TOKEN_EXPIRED'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Refresh the token
      const clientId = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET');

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok || !refreshData.access_token) {
        console.error('Token refresh failed:', refreshData);
        return new Response(
          JSON.stringify({
            error: 'Failed to refresh token. Please reconnect.',
            code: 'OAUTH_TOKEN_EXPIRED'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update the stored token
      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();

      await supabaseAdmin
        .from('google_sheets_connections')
        .update({
          access_token: accessToken,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      console.log('Token refreshed successfully for user:', userId);
    }

    console.log('Fetching Google Sheets files for user:', userId);
    console.log('Access token (first 30 chars):', accessToken?.substring(0, 30) + '...');

    // Build Drive API request
    const params = new URLSearchParams({
      q: "(mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') and trashed=false",
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: '100',
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
    });

    const driveUrl = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    console.log('Calling Google Drive API...');

    const response = await fetch(driveUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    console.log('Google Drive API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch Google Sheets:', response.status, errorText);
      console.error('Full error response:', errorText);

      if (response.status === 401) {
        return new Response(
          JSON.stringify({
            error: 'Your Google session has expired. Please reconnect your Google account.',
            code: 'OAUTH_TOKEN_EXPIRED'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else if (response.status === 403) {
        return new Response(
          JSON.stringify({
            error: 'Access denied. Please reconnect your Google account and grant access to Google Drive.',
            code: 'OAUTH_ACCESS_DENIED'
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to fetch Google Sheets',
          details: errorText,
          code: 'REQUEST_FAILED'
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('Google Drive API success! Files count:', data.files?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        files: data.files || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in list-google-sheets-oauth:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

### 5. BACKEND: import-google-sheets-contacts/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  integration_id: string;
  start_row?: number;
  end_row?: number;
}

function getColumnValue(row: any[], columnLetter: string): string | null {
  if (!columnLetter) return null;
  const index = columnLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
  return row[index] || null;
}

function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Basic validation: contains digits and common phone chars
  return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 9;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { integration_id, start_row = 2, end_row } = await req.json() as ImportRequest;

    if (!integration_id) {
      throw new Error('integration_id is required');
    }

    console.log(`Starting import for integration: ${integration_id}`);

    // Get integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('google_sheets_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found');
    }

    const { spreadsheet_id, sheet_name, column_mapping, credentials } = integration;
    const apiKey = credentials.api_key;

    if (!spreadsheet_id || !apiKey) {
      throw new Error('Invalid integration configuration');
    }

    console.log(`Fetching data from sheet: ${sheet_name}`);

    // Read data from Google Sheets
    const range = `${sheet_name}!A${start_row}:Z${end_row || 1000}`;
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    const response = await fetch(dataUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch sheet data:', errorText);
      throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
    }

    const dataResult = await response.json();
    const rows = dataResult.values || [];

    console.log(`Found ${rows.length} rows to process`);

    // Delete existing contacts for this integration
    const { error: deleteError } = await supabaseClient
      .from('google_sheets_contacts')
      .delete()
      .eq('integration_id', integration_id);

    if (deleteError) {
      console.error('Failed to delete existing contacts:', deleteError);
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = start_row + i;

      try {
        const name = getColumnValue(row, column_mapping.name_column);
        const phone = getColumnValue(row, column_mapping.phone_column);

        if (!name || !phone) {
          skipped++;
          continue;
        }

        if (!validatePhoneNumber(phone)) {
          skipped++;
          errors.push(`Row ${rowNumber}: Invalid phone number: ${phone}`);
          continue;
        }

        // Extract optional fields
        const email = getColumnValue(row, column_mapping.email_column);
        const location = getColumnValue(row, column_mapping.location_column);
        const language = getColumnValue(row, column_mapping.language_column) || 'ro';

        // Store all other columns in metadata
        const metadata: any = {};
        for (let j = 0; j < row.length; j++) {
          const colLetter = String.fromCharCode(65 + j);
          if (row[j]) {
            metadata[`col_${colLetter}`] = row[j];
          }
        }

        // Insert contact
        const { error: insertError } = await supabaseClient
          .from('google_sheets_contacts')
          .insert({
            integration_id,
            user_id: user.id,
            row_number: rowNumber,
            name,
            phone,
            email,
            location,
            language,
            metadata,
            call_status: 'pending',
          });

        if (insertError) {
          console.error(`Failed to insert row ${rowNumber}:`, insertError);
          errors.push(`Row ${rowNumber}: ${insertError.message}`);
          skipped++;
        } else {
          imported++;
        }
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${rowNumber}: ${errorMessage}`);
        skipped++;
      }
    }

    // Update integration with import stats
    await supabaseClient
      .from('google_sheets_integrations')
      .update({
        last_import_at: new Date().toISOString(),
        total_contacts: imported,
      })
      .eq('id', integration_id);

    console.log(`Import complete: ${imported} imported, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        errors: errors.slice(0, 10), // Return first 10 errors only
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in import-google-sheets-contacts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

---

## RESTUL FUNCȚIILOR BACKEND

Funcțiile rămase se găsesc în directorul `/supabase/functions/`:
- `sync-google-sheets/index.ts` - Sincronizare conversații în sheet
- `update-google-sheets-contact/index.ts` - Update contact după apel
- `execute-google-sheets/index.ts` - Operații CRUD complete
- `get-sheet-structure/index.ts` - Structură sheet cu API Key
- `get-sheet-structure-oauth/index.ts` - Structură sheet cu OAuth
- `list-google-sheets-files/index.ts` - Listare fișiere cu API Key

---

## COMPONENTE FRONTEND ADIȚIONALE

Componentele complete se găsesc în `/src/components/integrations/`:
- `GoogleSheetsFilePicker.tsx` - Dialog pentru selectare fișier
- `GoogleSheetsColumnMapper.tsx` - Dialog pentru mapare coloane
- `GoogleSheetsCampaignManager.tsx` - Manager campanii
- `GoogleSheetsHelpDialog.tsx` - Dialog ajutor

Hook pentru campanii: `/src/hooks/useGoogleSheetsCampaign.ts`

---

## CE TREBUIE REFĂCUT

### Priorități:

1. **Creează aplicație nouă în Google Cloud Console**
   - OAuth consent screen configurat pentru producție
   - Credențiale noi (Client ID + Secret)
   - Redirect URI corect

2. **Centralizează logica de refresh token**
   - Un singur serviciu/funcție pentru refresh
   - Evită duplicarea codului

3. **Securitate**
   - Criptează tokenii în baza de date
   - Mută URL-urile în env variables
   - Restricționează CORS

4. **Testare completă**
   - Flow OAuth complet
   - Import/export
   - Token refresh automat
   - Error handling

---

## CONTACT

Pentru întrebări despre cod, contactați echipa de dezvoltare.
