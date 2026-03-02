import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Shield, Database, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface GDPRAlert {
  id: string;
  type: 'old_data' | 'unprocessed_request' | 'unauthorized_access' | 'backup_failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  details?: any;
}

export const GDPRAlerts = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<GDPRAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');

  useEffect(() => {
    fetchAlerts();
    // Refresh every 2 minutes
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('gdpr-monitoring', {
        body: { action: 'get_alerts' }
      });

      if (error) {
        console.error('GDPR Alerts Error:', error);
        
        // More specific error messages
        let errorMessage = "Nu s-au putut încărca alertele GDPR.";
        
        if (error.message?.includes('Unauthorized')) {
          errorMessage = "Nu sunteți autentificat. Vă rugăm să vă autentificați din nou.";
        } else if (error.message?.includes('Forbidden')) {
          errorMessage = "Nu aveți permisiuni de admin pentru a accesa alertele GDPR.";
        } else if (error.message?.includes('Missing authorization')) {
          errorMessage = "Sesiune expirată. Vă rugăm să vă autentificați din nou.";
        }
        
        throw new Error(errorMessage);
      }
      
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching GDPR alerts:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-au putut încărca alertele GDPR.",
        variant: "destructive"
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const { error } = await supabase.functions.invoke('gdpr-monitoring', {
        body: { 
          action: 'acknowledge_alert',
          alert_id: alertId
        }
      });

      if (error) throw error;
      
      toast({
        title: "Alertă confirmată",
        description: "Alerta a fost marcată ca recunoscută."
      });
      
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut confirma alerta.",
        variant: "destructive"
      });
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const { error } = await supabase.functions.invoke('gdpr-monitoring', {
        body: { 
          action: 'resolve_alert',
          alert_id: alertId
        }
      });

      if (error) throw error;
      
      toast({
        title: "Alertă rezolvată",
        description: "Alerta a fost marcată ca rezolvată."
      });
      
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut rezolva alerta.",
        variant: "destructive"
      });
    }
  };

  const getAlertIcon = (type: GDPRAlert['type']) => {
    switch (type) {
      case 'old_data': return Clock;
      case 'unprocessed_request': return AlertTriangle;
      case 'unauthorized_access': return Shield;
      case 'backup_failed': return Database;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: GDPRAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'active') return alert.status === 'active';
    if (filter === 'resolved') return alert.status === 'resolved';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Toate ({alerts.length})
        </Button>
        <Button 
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active ({alerts.filter(a => a.status === 'active').length})
        </Button>
        <Button 
          variant={filter === 'resolved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('resolved')}
        >
          Rezolvate ({alerts.filter(a => a.status === 'resolved').length})
        </Button>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-semibold mb-2">Nicio alertă</h3>
          <p className="text-muted-foreground">
            {filter === 'active' 
              ? "Nu există alerte active în acest moment."
              : filter === 'resolved'
              ? "Nu există alerte rezolvate."
              : "Nu există alerte în sistem."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <Card 
                key={alert.id} 
                className={`p-4 border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold">{alert.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        {alert.status === 'resolved' && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                            Rezolvată
                          </Badge>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                            Confirmată
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {alert.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString('ro-RO')}
                      </span>
                      
                      {alert.status === 'active' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirmă
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleResolve(alert.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rezolvă
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
