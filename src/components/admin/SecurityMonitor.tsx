import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Activity, User, Clock } from 'lucide-react';
// Simple date formatter
const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('ro-RO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id?: string | null;
  details?: any;
  ip_address?: string | null;
  created_at: string;
}

export const SecurityMonitor: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = auditLogs.filter(log => {
    if (filter === 'all') return true;
    return log.action.toLowerCase().includes(filter.toLowerCase());
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BAN_USER':
      case 'UNBAN_USER':
        return <Shield className="h-4 w-4" />;
      case 'MODIFY_BALANCE':
        return <User className="h-4 w-4" />;
      case 'VIEW_ALL_USERS':
        return <Activity className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getActionVariant = (action: string): "default" | "destructive" | "secondary" => {
    switch (action) {
      case 'BAN_USER':
        return 'destructive';
      case 'MODIFY_BALANCE':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <div>Se încarcă jurnalul de securitate...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Monitor Securitate</h2>
          <p className="text-muted-foreground">
            Monitorizarea activităților administrative și a evenimentelor de securitate
          </p>
        </div>
        <Button onClick={fetchAuditLogs} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Reîmprospătează
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Toate
        </Button>
        <Button
          variant={filter === 'ban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('ban')}
        >
          Blocare/Deblocare
        </Button>
        <Button
          variant={filter === 'balance' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('balance')}
        >
          Modificări Sold
        </Button>
        <Button
          variant={filter === 'view' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('view')}
        >
          Vizualizări
        </Button>
      </div>

      {filteredLogs.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nu s-au găsit înregistrări în jurnalul de audit pentru filtrul selectat.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Jurnal de Audit ({filteredLogs.length} înregistrări)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <Badge variant={getActionVariant(log.action)}>
                        {log.action.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Admin: {log.admin_user_id.slice(0, 8)}...
                      </div>
                      {log.target_user_id && (
                        <div className="flex items-center gap-1">
                          Target: {log.target_user_id.slice(0, 8)}...
                        </div>
                      )}
                      {log.ip_address && (
                        <div className="text-xs">IP: {log.ip_address}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(log.created_at)}
                    </div>
                    {log.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.details, null, 0)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};