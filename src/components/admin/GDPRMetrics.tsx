import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Database, Clock, FileText, Shield, HardDrive, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface GDPRMetrics {
  totalDataStored: number;
  recordsOlderThan90Days: number;
  recentGDPRRequests: number;
  detectedBreaches: number;
  backupStatus: 'success' | 'warning' | 'error';
  lastBackupDate: string;
}

export const GDPRMetrics = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<GDPRMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('gdpr-monitoring', {
        body: { action: 'get_metrics' }
      });

      if (error) {
        console.error('GDPR Metrics Error:', error);
        
        // More specific error messages
        let errorMessage = "Nu s-au putut încărca metricile GDPR.";
        
        if (error.message?.includes('Unauthorized')) {
          errorMessage = "Nu sunteți autentificat. Vă rugăm să vă autentificați din nou.";
        } else if (error.message?.includes('Forbidden')) {
          errorMessage = "Nu aveți permisiuni de admin pentru a accesa metricile GDPR.";
        } else if (error.message?.includes('Missing authorization')) {
          errorMessage = "Sesiune expirată. Vă rugăm să vă autentificați din nou.";
        }
        
        throw new Error(errorMessage);
      }
      
      setMetrics(data);
    } catch (error: any) {
      console.error('Error fetching GDPR metrics:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-au putut încărca metricile GDPR.",
        variant: "destructive"
      });
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Date Stocate',
      value: metrics?.totalDataStored || 0,
      unit: 'înregistrări',
      icon: Database,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Date > 90 Zile',
      value: metrics?.recordsOlderThan90Days || 0,
      unit: 'înregistrări',
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      warning: (metrics?.recordsOlderThan90Days || 0) > 0
    },
    {
      title: 'Cereri GDPR Recente',
      value: metrics?.recentGDPRRequests || 0,
      unit: 'ultimele 30 zile',
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Breach-uri Detectate',
      value: metrics?.detectedBreaches || 0,
      unit: 'incidente',
      icon: Shield,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      critical: (metrics?.detectedBreaches || 0) > 0
    },
    {
      title: 'Status Backup',
      value: metrics?.backupStatus === 'success' ? '✓ Activ' : '✗ Eroare',
      unit: metrics?.lastBackupDate || 'N/A',
      icon: HardDrive,
      color: metrics?.backupStatus === 'success' ? 'text-green-500' : 'text-red-500',
      bgColor: metrics?.backupStatus === 'success' ? 'bg-green-500/10' : 'bg-red-500/10',
      critical: metrics?.backupStatus !== 'success'
    },
    {
      title: 'Conformitate Generală',
      value: calculateCompliance(metrics),
      unit: '%',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((metric, index) => (
          <Card 
            key={index} 
            className={`p-6 transition-all hover:shadow-md ${
              metric.critical ? 'border-red-500/50 bg-red-500/5' : 
              metric.warning ? 'border-amber-500/50 bg-amber-500/5' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold">
                    {metric.value}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {metric.unit}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Rezumat Conformitate GDPR</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {metrics?.detectedBreaches === 0 && metrics?.recordsOlderThan90Days === 0 && metrics?.backupStatus === 'success'
                ? "Toate sistemele funcționează conform. Nu există probleme critice detectate."
                : "Există unele probleme care necesită atenție. Verificați alertele pentru detalii."}
            </p>
            <div className="flex flex-wrap gap-2">
              {metrics?.backupStatus === 'success' && (
                <span className="px-3 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
                  ✓ Backup Activ
                </span>
              )}
              {metrics?.detectedBreaches === 0 && (
                <span className="px-3 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full border border-green-500/20">
                  ✓ Fără Breach-uri
                </span>
              )}
              {(metrics?.recordsOlderThan90Days || 0) > 0 && (
                <span className="px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                  ⚠ Date Vechi Detectate
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const calculateCompliance = (metrics: GDPRMetrics | null): number => {
  if (!metrics) return 0;
  
  let score = 100;
  
  // Deduct points for issues
  if (metrics.detectedBreaches > 0) score -= 40;
  if (metrics.backupStatus !== 'success') score -= 30;
  if (metrics.recordsOlderThan90Days > 0) score -= 20;
  if (metrics.recordsOlderThan90Days > 100) score -= 10;
  
  return Math.max(0, score);
};
