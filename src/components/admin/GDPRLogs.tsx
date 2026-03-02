import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Filter, Eye, User, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GDPRLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  client_name?: string;
  action_type: string;
  action_description: string;
  ip_address?: string;
  details?: any;
}

export const GDPRLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<GDPRLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('gdpr-monitoring', {
        body: { action: 'get_logs' }
      });

      if (error) {
        console.error('GDPR Logs Error:', error);
        
        // More specific error messages
        let errorMessage = "Nu s-au putut încărca logurile GDPR.";
        
        if (error.message?.includes('Unauthorized')) {
          errorMessage = "Nu sunteți autentificat. Vă rugăm să vă autentificați din nou.";
        } else if (error.message?.includes('Forbidden')) {
          errorMessage = "Nu aveți permisiuni de admin pentru a accesa logurile GDPR.";
        } else if (error.message?.includes('Missing authorization')) {
          errorMessage = "Sesiune expirată. Vă rugăm să vă autentificați din nou.";
        }
        
        throw new Error(errorMessage);
      }
      
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching GDPR logs:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-au putut încărca logurile GDPR.",
        variant: "destructive"
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const filteredLogs = getFilteredLogs();
      
      // Create CSV content
      const headers = ['Timestamp', 'User Email', 'Client Name', 'Action Type', 'Description', 'IP Address'];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          new Date(log.timestamp).toLocaleString('ro-RO'),
          log.user_email,
          log.client_name || 'N/A',
          log.action_type,
          `"${log.action_description}"`,
          log.ip_address || 'N/A'
        ].join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `gdpr_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export reușit",
        description: "Logurile au fost exportate cu succes."
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut exporta logurile.",
        variant: "destructive"
      });
    }
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action_description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
      const matchesUser = userFilter === 'all' || log.user_id === userFilter;
      
      return matchesSearch && matchesAction && matchesUser;
    });
  };

  const uniqueUsers = Array.from(new Set(logs.map(log => ({ id: log.user_id, email: log.user_email }))));
  const uniqueActions = Array.from(new Set(logs.map(log => log.action_type)));

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'destructive';
    if (action.includes('CREATE') || action.includes('ADD')) return 'default';
    if (action.includes('UPDATE') || action.includes('MODIFY')) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </Card>
      </div>
    );
  }

  const filteredLogs = getFilteredLogs();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Caută după email, client sau acțiune..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tip Acțiune" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate Acțiunile</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Utilizator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toți Utilizatorii</SelectItem>
              {uniqueUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportLogs} variant="outline" className="w-full lg:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data & Ora</TableHead>
                <TableHead>Utilizator</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Tip Acțiune</TableHead>
                <TableHead>Descriere</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nu au fost găsite loguri</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(log.timestamp).toLocaleString('ro-RO')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm">{log.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{log.client_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action_type)}>
                        {log.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {log.action_description}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ip_address || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Afișare {filteredLogs.length} din {logs.length} loguri
          </span>
          <span className="text-muted-foreground">
            Ultimul log: {logs.length > 0 ? new Date(logs[0].timestamp).toLocaleString('ro-RO') : 'N/A'}
          </span>
        </div>
      </Card>
    </div>
  );
};
