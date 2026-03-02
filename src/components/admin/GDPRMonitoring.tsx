import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GDPRMetrics } from './GDPRMetrics';
import { GDPRAlerts } from './GDPRAlerts';
import { GDPRLogs } from './GDPRLogs';
import { Shield, AlertTriangle, FileText, Activity } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const GDPRMonitoring = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_admin_user', {
          _user_id: user.id
        });

        if (error) throw error;
        setIsAuthorized(data || false);
      } catch (error) {
        console.error('Error checking authorization:', error);
        setIsAuthorized(false);
        toast({
          title: "Eroare de autorizare",
          description: "Nu s-a putut verifica accesul GDPR.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Se verifică permisiunile...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <Card className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Acces Restricționat</h3>
        <p className="text-muted-foreground">
          Nu aveți permisiuni pentru a accesa dashboard-ul GDPR.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Monitorizare GDPR</h2>
          <p className="text-sm text-muted-foreground">
            Dashboard pentru conformitate și protecția datelor
          </p>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="metrics" className="gap-2">
            <Activity className="w-4 h-4" />
            Metrici
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerte
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="w-4 h-4" />
            Loguri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4 mt-6">
          <GDPRMetrics />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-6">
          <GDPRAlerts />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-6">
          <GDPRLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};
