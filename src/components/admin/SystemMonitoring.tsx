import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { Activity, Server, Database, Cpu, HardDrive, Wifi, AlertTriangle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  queueSize: number;
  errorRate: number;
  uptime: string;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  latency: number;
  lastCheck: string;
}

const SystemMonitoring = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      
      // Simulate system metrics (în realitate ar veni din monitoring API)
      const mockMetrics: SystemMetrics = {
        cpuUsage: Math.floor(Math.random() * 30) + 20, // 20-50%
        memoryUsage: Math.floor(Math.random() * 25) + 45, // 45-70%
        diskUsage: Math.floor(Math.random() * 20) + 35, // 35-55%
        networkLatency: Math.floor(Math.random() * 50) + 10, // 10-60ms
        activeConnections: Math.floor(Math.random() * 200) + 150,
        queueSize: Math.floor(Math.random() * 50) + 5,
        errorRate: Math.random() * 2, // 0-2%
        uptime: '15d 7h 32m'
      };

      setMetrics(mockMetrics);

      // Mock services status
      const mockServices: ServiceStatus[] = [
        {
          name: 'Supabase Database',
          status: 'healthy',
          latency: 15,
          lastCheck: new Date().toISOString()
        },
        {
          name: 'ElevenLabs API',
          status: 'healthy',
          latency: 120,
          lastCheck: new Date().toISOString()
        },
        {
          name: 'OpenAI API',
          status: 'warning',
          latency: 280,
          lastCheck: new Date().toISOString()
        },
        {
          name: 'SMS Service',
          status: 'healthy',
          latency: 45,
          lastCheck: new Date().toISOString()
        },
        {
          name: 'Email Service',
          status: 'healthy',
          latency: 32,
          lastCheck: new Date().toISOString()
        }
      ];

      setServices(mockServices);

      // Fetch recent error logs (simulat)
      const mockLogs = [
        {
          id: '1',
          level: 'error',
          message: 'API rate limit exceeded for OpenAI',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          service: 'OpenAI API'
        },
        {
          id: '2',
          level: 'warning',
          message: 'High memory usage detected',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          service: 'System'
        },
        {
          id: '3',
          level: 'info',
          message: 'Database backup completed successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          service: 'Database'
        },
        {
          id: '4',
          level: 'error',
          message: 'Failed to send SMS notification',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          service: 'SMS Service'
        }
      ];

      setRecentLogs(mockLogs);

    } catch (error) {
      console.error('Error fetching system metrics:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut încărca metrici de sistem.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = () => {
    fetchSystemMetrics();
    toast({
      title: "Actualizat",
      description: "Metrici de sistem actualizate.",
    });
  };

  useEffect(() => {
    fetchSystemMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Monitorizare Sistem</h2>
          <p className="text-muted-foreground">
            Monitorizarea în timp real a performanței și stării sistemului
          </p>
        </div>
        <Button onClick={refreshMetrics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizează
        </Button>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                <h2 className="text-2xl font-bold">{metrics.cpuUsage}%</h2>
              </div>
              <Cpu className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={metrics.cpuUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Memory Usage</p>
                <h2 className="text-2xl font-bold">{metrics.memoryUsage}%</h2>
              </div>
              <Server className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={metrics.memoryUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disk Usage</p>
                <h2 className="text-2xl font-bold">{metrics.diskUsage}%</h2>
              </div>
              <HardDrive className="h-8 w-8 text-purple-600" />
            </div>
            <Progress value={metrics.diskUsage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Network Latency</p>
                <h2 className="text-2xl font-bold">{metrics.networkLatency}ms</h2>
              </div>
              <Wifi className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Active Connections</span>
              <Badge variant="outline">{metrics.activeConnections}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Queue Size</span>
              <Badge variant={metrics.queueSize > 20 ? "destructive" : "outline"}>
                {metrics.queueSize}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Error Rate</span>
              <Badge variant={metrics.errorRate > 1 ? "destructive" : "outline"}>
                {metrics.errorRate.toFixed(2)}%
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Uptime</span>
              <Badge variant="outline">{metrics.uptime}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`${getStatusColor(service.status)}`}>
                      {getStatusIcon(service.status)}
                    </div>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.latency}ms</p>
                    </div>
                  </div>
                  <Badge variant={service.status === 'healthy' ? 'default' : 
                                service.status === 'warning' ? 'secondary' : 'destructive'}>
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Logs</CardTitle>
          <CardDescription>Ultimele evenimente de sistem și erori</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between border-b pb-2">
                <div className="flex items-start space-x-3">
                  <Badge className={getLogLevelColor(log.level)}>
                    {log.level.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="font-medium">{log.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.service} • {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMonitoring;