import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZohoCRMConnect } from '@/components/integrations/ZohoCRMConnect';
import { ZohoCRMFieldMapper } from '@/components/integrations/ZohoCRMFieldMapper';
import { ZohoContactsTable } from '@/components/integrations/ZohoContactsTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, Database, Users, Unlink, Settings, Download, Calendar, Building2, Mail, RefreshCw, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ZohoIntegration() {
  const { t } = useLanguage();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Fetch sync history
  const { data: syncHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['zoho-sync-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('zoho_sync_history')
        .select('*')
        .eq('user_id', user.id)
        .order('sync_started_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: isConnected,
  });

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('zoho_crm_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && !error) {
        setIsConnected(true);
        setConnectionData(data);
      } else {
        setIsConnected(false);
        setConnectionData(null);
      }
    } catch (error) {
      console.error('Check connection error:', error);
      setIsConnected(false);
      setConnectionData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Trebuie să fii autentificat");
        return;
      }

      setIsSyncing(true);
      toast.loading("Sincronizare în curs...");

      const { data, error } = await supabase.functions.invoke('zoho-auto-sync', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      toast.dismiss();
      const result = data.results[0];
      toast.success(
        `Sincronizare completă: ${result.total_records} înregistrări (${result.leads_synced} Leads, ${result.contacts_synced} Contacts, ${result.accounts_synced} Accounts, ${result.deals_synced} Deals, ${result.tasks_synced} Tasks)`
      );
      
      // Refresh connection status and history
      checkConnection();
      refetchHistory();
    } catch (error: any) {
      toast.dismiss();
      console.error('Sync error:', error);
      toast.error(`Eroare la sincronizare: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('zoho_crm_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Zoho CRM a fost deconectat cu succes');
      setIsConnected(false);
      setConnectionData(null);
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error('Eroare la deconectare');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Se încarcă...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Zoho CRM</h1>
              <p className="text-sm text-muted-foreground">
                Sincronizare automată cu Zoho CRM
              </p>
            </div>
          </div>
        </div>

        {/* Connection Status Bar */}
        {isConnected && connectionData && (
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">Conectat</span>
            </div>
            {connectionData.zoho_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{connectionData.zoho_email}</span>
              </div>
            )}
            {syncHistory && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Ultima sincronizare: {new Date(syncHistory.sync_completed_at || syncHistory.sync_started_at).toLocaleString('ro-RO')}
                </span>
                {syncHistory.total_records_synced > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {syncHistory.total_records_synced} înregistrări
                  </Badge>
                )}
              </div>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                onClick={handleManualSync}
                disabled={isSyncing}
                size="sm"
                variant="outline"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizează Acum
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isDisconnecting} className="text-destructive hover:text-destructive">
                    {isDisconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Unlink className="h-4 w-4 mr-1" />
                        Deconectează
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Această acțiune va deconecta integrarea cu Zoho CRM.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anulează</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect}>Deconectează</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Content */}
        {!isConnected ? (
          <ZohoCRMConnect onConnectionSuccess={checkConnection} />
        ) : (
          <Tabs defaultValue="contacts" className="w-full">
            <TabsList className="w-fit mb-4">
              <TabsTrigger value="contacts" className="gap-2">
                <Database className="h-4 w-4" />
                Date CRM
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Setări Mapare
              </TabsTrigger>
            </TabsList>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Date Zoho CRM</CardTitle>
                  <CardDescription>
                    Toate datele din Zoho CRM (Leads, Contacts, Accounts, Deals, Tasks) sunt sincronizate automat la fiecare oră. 
                    Poți folosi butonul "Sincronizează Acum" pentru refresh manual.
                  </CardDescription>
                </CardHeader>
              </Card>
              <ZohoContactsTable />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-0">
              <div className="max-w-3xl">
                <ZohoCRMFieldMapper />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
