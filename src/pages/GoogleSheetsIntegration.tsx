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

  // Form state for new integration
  const [formData, setFormData] = useState({
    spreadsheetId: '',
    spreadsheetName: '',
    sheetName: '',
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

  const fetchConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('google_sheets_connections')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
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

      // Get current session to ensure auth header is sent
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error('Nu ești autentificat. Te rog să te loghezi din nou.');
      }

      console.log('Calling google-sheets-oauth-init with session...');
      console.log('Access token exists:', !!sessionData.session.access_token);

      // Use dedicated Google Sheets OAuth flow with explicit auth header
      const { data, error } = await supabase.functions.invoke('google-sheets-oauth-init', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      console.log('OAuth init response:', { data, error });

      // Handle both error formats (supabase error and response error)
      if (error) {
        throw new Error(error.message);
      }

      // Check if the response contains an error (e.g., 401 response body)
      if (data?.error || data?.code === 'UNAUTHORIZED') {
        throw new Error(data?.userMessage || data?.message || 'Eroare de autentificare');
      }

      if (!data?.success || !data?.authUrl) {
        throw new Error(data?.error || data?.userMessage || 'Failed to initialize OAuth');
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl;

    } catch (error: any) {
      console.error('Google connect error:', error);

      let errorMessage = error.message || 'Eroare la conectarea cu Google';
      if (errorMessage.includes('429') || (error.status === 429)) {
        errorMessage = 'Prea multe încercări. Te rog așteaptă un minut și încearcă din nou.';
      }

      toast({
        title: 'Eroare',
        description: errorMessage,
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
        sheetName: '',
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
        sheetName: '',
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
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-gray-900" />
                  </div>
                  Google Sheets Integration
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Exportă conversațiile și lead-urile în Google Sheets pentru analiză automată
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHelpDialogOpen(true)}
                className="flex items-center gap-2 border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
              >
                <HelpCircle className="h-4 w-4" />
                Ajutor
              </Button>
            </div>
          </div>
        </div>

        {/* Help Dialog */}
        <GoogleSheetsHelpDialog
          open={helpDialogOpen}
          onOpenChange={setHelpDialogOpen}
        />

        <div className="px-6 py-8 space-y-6">
          {/* Setup Instructions */}
          <Card className="border border-gray-200 bg-white rounded-2xl shadow-none">
            <CardHeader className="border-b border-gray-200 bg-white">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-900 font-semibold">
                <Settings className="w-5 h-5 text-gray-900" />
                Instrucțiuni de configurare
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">1.</span>
                <p className="text-gray-700">Creează un Google Sheet nou sau folosește unul existent</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">2.</span>
                <p className="text-gray-700">Obține Google Sheets API key din <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline font-medium">Google Cloud Console</a></p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">3.</span>
                <p className="text-gray-700">Copiază Spreadsheet ID din URL-ul sheet-ului (partea după /d/)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-gray-900">4.</span>
                <p className="text-gray-700">Completează formularul și activează sincronizarea automată</p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-50 border border-gray-200 p-1">
              <TabsTrigger
                value="setup"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-gray-600"
              >
                Configurare API
              </TabsTrigger>
              <TabsTrigger
                value="campaigns"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-gray-600"
              >
                Campanii din Sheets
              </TabsTrigger>
            </TabsList>

            {/* Setup Tab */}
            <TabsContent value="setup">
              <Card className="border border-gray-200 bg-white rounded-2xl shadow-none">
                <CardHeader className="border-b border-gray-200 bg-white">
                  <CardTitle className="text-gray-900 font-semibold">Adaugă Integrare Nouă</CardTitle>
                  <CardDescription className="text-gray-600 text-sm">Conectează un Google Sheet pentru export și campanii automate</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Google OAuth Connect */}
                    {connection?.status === 'connected' ? (
                      <div className="p-6 border-2 border-green-200 rounded-2xl bg-green-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-green-900">Conectat la Google Sheets</h3>
                              <p className="text-sm text-green-700">{connection.google_email}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnect}
                            className="border-green-300 text-green-700 hover:bg-green-100"
                          >
                            Deconectează
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4 p-8 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                        <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400" />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Conectează-te cu Google</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Autentifică-te cu Google pentru a accesa foile tale private și a selecta ce date să exporți
                          </p>
                        </div>
                        <Button
                          onClick={handleGoogleConnect}
                          disabled={connecting}
                          size="lg"
                          className="w-full max-w-md"
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          {connecting ? 'Se conectează...' : 'Conectează cu Google Sheets'}
                        </Button>
                      </div>
                    )}

                    <Separator className="bg-gray-200" />

                    {/* File Browser */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-900 font-medium text-sm">Selectează Google Sheet</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFilePickerOpen(true)}
                          className="border-gray-200 text-gray-900 hover:bg-gray-50"
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Browser Fișiere
                        </Button>
                      </div>

                      <Separator className="bg-gray-200" />

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="spreadsheetId" className="text-gray-900 font-medium text-sm">Spreadsheet ID *</Label>
                          <Input
                            id="spreadsheetId"
                            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                            value={formData.spreadsheetId}
                            onChange={(e) => setFormData({ ...formData, spreadsheetId: e.target.value })}
                            required
                            className="bg-white border-gray-200"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="spreadsheetName" className="text-gray-900 font-medium text-sm">Nume Spreadsheet *</Label>
                          <Input
                            id="spreadsheetName"
                            placeholder="Agent Automation Export"
                            value={formData.spreadsheetName}
                            onChange={(e) => setFormData({ ...formData, spreadsheetName: e.target.value })}
                            required
                            className="bg-white border-gray-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sheetName" className="text-gray-900 font-medium text-sm">Nume Sheet</Label>
                        <Input
                          id="sheetName"
                          placeholder="Numele foii (opțional - se detectează automat)"
                          value={formData.sheetName}
                          onChange={(e) => setFormData({ ...formData, sheetName: e.target.value })}
                          className="bg-white border-gray-200"
                        />
                        <div className="flex items-center gap-3 pt-2">
                          <Button type="button" onClick={openMapperWithManualId} className="">
                            Încarcă structura din ID (OAuth)
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setFilePickerOpen(true)} className="border-gray-200 text-gray-900 hover:bg-gray-50">
                            Sau alege din Browser
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-gray-200" />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200">
                        <div className="space-y-0.5">
                          <Label className="text-gray-900 font-medium">Export automat conversații</Label>
                          <p className="text-sm text-gray-600">Exportă conversațiile finalizate automat</p>
                        </div>
                        <Switch
                          checked={formData.autoExportConversations}
                          onCheckedChange={(checked) => setFormData({ ...formData, autoExportConversations: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200">
                        <div className="space-y-0.5">
                          <Label className="text-gray-900 font-medium">Export automat lead-uri</Label>
                          <p className="text-sm text-gray-600">Exportă lead-urile noi automat</p>
                        </div>
                        <Switch
                          checked={formData.autoExportLeads}
                          onCheckedChange={(checked) => setFormData({ ...formData, autoExportLeads: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns">
              <div className="space-y-4">
                {integrations.length === 0 ? (
                  <Card className="border border-gray-200 bg-white rounded-2xl shadow-none">
                    <CardContent className="py-12 text-center">
                      <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold mb-2 text-gray-900">Nicio integrare configurată</h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        Configurează prima integrare Google Sheets din tab-ul "Configurare API"
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <Card className="border border-gray-200 bg-white rounded-2xl shadow-none">
                      <CardHeader className="border-b border-gray-200 bg-white">
                        <CardTitle className="font-semibold text-gray-900">Selectează o integrare pentru campanii:</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid gap-3">
                          {integrations.map((integration) => (
                            <div
                              key={integration.id}
                              className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors"
                              onClick={() => setViewingIntegration(integration)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center">
                                  <FileSpreadsheet className="w-5 h-5 text-gray-900" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{integration.spreadsheet_name}</div>
                                  <div className="text-sm text-gray-600">{integration.sheet_name}</div>
                                </div>
                              </div>
                              {integration.is_active ? (
                                <Badge className="bg-gray-900 text-white">Activ</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-200 text-gray-600">Inactiv</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {viewingIntegration && (
                      <GoogleSheetsCampaignManager
                        integrationId={viewingIntegration.id}
                        spreadsheetId={viewingIntegration.spreadsheet_id}
                        spreadsheetUrl={`https://docs.google.com/spreadsheets/d/${viewingIntegration.spreadsheet_id}`}
                      />
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Existing Integrations */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">Integrări Active</h2>

            {loading ? (
              <Card className="border border-gray-200 bg-white rounded-2xl shadow-none">
                <CardContent className="py-8 text-center text-gray-600">
                  Se încarcă...
                </CardContent>
              </Card>
            ) : integrations.length === 0 ? (
              <Card className="border border-gray-200 bg-white rounded-2xl shadow-none">
                <CardContent className="py-8 text-center text-gray-600">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Nu ai nicio integrare configurată încă</p>
                </CardContent>
              </Card>
            ) : (
              integrations.map((integration) => (
                <Card key={integration.id} className="border border-gray-200 bg-white rounded-2xl shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 text-gray-900" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">{integration.spreadsheet_name}</h3>
                          {integration.is_active ? (
                            <Badge className="bg-gray-900 text-white">Activ</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-200 text-gray-600">Inactiv</Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 ml-[52px]">
                          <p>Sheet: {integration.sheet_name}</p>
                          <p>Spreadsheet ID: {integration.spreadsheet_id}</p>
                          {integration.last_sync_at && (
                            <p>Ultima sincronizare: {new Date(integration.last_sync_at).toLocaleString('ro-RO')}</p>
                          )}
                        </div>

                        <div className="flex gap-4 mt-3 ml-[52px]">
                          {integration.auto_export_conversations && (
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                              <CheckCircle2 className="w-4 h-4 text-gray-900" />
                              <span>Export conversații</span>
                            </div>
                          )}
                          {integration.auto_export_leads && (
                            <div className="flex items-center gap-1 text-sm text-gray-700">
                              <CheckCircle2 className="w-4 h-4 text-gray-900" />
                              <span>Export leads</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(integration.id)}
                          disabled={syncing || !integration.is_active}
                          title="Sincronizează manual"
                          className="border-gray-200 text-gray-900 hover:bg-gray-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewingIntegration(integration);
                            setColumnMapperOpen(true);
                          }}
                          title="Configurează coloane și lansează campanii"
                          className="border-gray-200 text-gray-900 hover:bg-gray-50"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(integration.id, integration.is_active)}
                          className="border-gray-200 text-gray-900 hover:bg-gray-50"
                        >
                          {integration.is_active ? 'Dezactivează' : 'Activează'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 border-gray-200 hover:bg-red-50"
                          onClick={() => {
                            setSelectedIntegration(integration.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="border-gray-200 text-gray-900 hover:bg-gray-50"
                        >
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${integration.spreadsheet_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
              <AlertDialogDescription>
                Această acțiune va șterge integrarea Google Sheets. Datele din sheet nu vor fi afectate.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Șterge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* File Picker Dialog */}
        <GoogleSheetsFilePicker
          open={filePickerOpen}
          onOpenChange={setFilePickerOpen}
          onFileSelected={handleFileSelected}
        />

        {/* Column Mapper Dialog */}
        {selectedFile && (
          <GoogleSheetsColumnMapper
            open={columnMapperOpen}
            onOpenChange={setColumnMapperOpen}
            spreadsheetId={selectedFile.id}
            sheetName={formData.sheetName}
            onMappingComplete={handleMappingComplete}
          />
        )}

        {/* Column Mapper for existing integrations */}
        {viewingIntegration && (
          <GoogleSheetsColumnMapper
            open={columnMapperOpen && !selectedFile}
            onOpenChange={setColumnMapperOpen}
            spreadsheetId={viewingIntegration.spreadsheet_id}
            sheetName={viewingIntegration.sheet_name}
            onMappingComplete={async (mapping, autoUpdate) => {
              await supabase
                .from('google_sheets_integrations')
                .update({
                  column_mapping: mapping as any,
                  auto_update_on_call: autoUpdate
                })
                .eq('id', viewingIntegration.id);

              setColumnMapperOpen(false);
              setViewingIntegration(null);
              fetchIntegrations();

              toast({
                title: 'Salvat!',
                description: 'Configurarea coloanelor a fost salvată.',
              });
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default GoogleSheetsIntegration;
