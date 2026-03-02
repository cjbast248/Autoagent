import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { Download, TrendingUp, TrendingDown, Users, Phone, DollarSign, Activity, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalUsers: number;
  newUsersToday: number;
  totalCalls: number;
  callsToday: number;
  totalRevenue: number;
  revenueToday: number;
  activeAgents: number;
  avgCallDuration: number;
  userGrowthRate: number;
  callSuccessRate: number;
}

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch user statistics
        const { data: users, error: usersError } = await supabase.rpc('admin_get_all_users', {
          p_admin_user_id: user.id
        });

        if (usersError) throw usersError;
        if (cancelled) return;

        // Calculate analytics
        const totalUsers = users?.length || 0;
        const totalCalls = users?.reduce((sum: number, u: any) => sum + u.total_calls, 0) || 0;
        const totalCredits = Math.round((users?.reduce((sum: number, u: any) => sum + u.balance_usd, 0) || 0) * 100);
        const totalMinutes = users?.reduce((sum: number, u: any) => sum + u.total_minutes, 0) || 0;

        // Get today's data (simulate for demo)
        const newUsersToday = Math.floor(totalUsers * 0.02);
        const callsToday = Math.floor(totalCalls * 0.1);
        const creditsToday = Math.floor(totalCredits * 0.05);

        // Get active agents count
        const { data: agents } = await supabase
          .from('kalina_agents')
          .select('*')
          .eq('is_active', true);

        if (cancelled) return;

        setAnalytics({
          totalUsers,
          newUsersToday,
          totalCalls,
          callsToday,
          totalRevenue: totalCredits,
          revenueToday: creditsToday,
          activeAgents: agents?.length || 0,
          avgCallDuration: totalCalls > 0 ? Math.round(totalMinutes / totalCalls) : 0,
          userGrowthRate: 12.5, // Simulated
          callSuccessRate: 87.3 // Simulated
        });

        // Set top users
        const sortedUsers = users?.sort((a: any, b: any) => b.total_spent_usd - a.total_spent_usd).slice(0, 5) || [];
        setTopUsers(sortedUsers);

        // Fetch recent activity
        const { data: activity } = await supabase
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (cancelled) return;

        setRecentActivity(activity || []);

      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching analytics:', error);
        toast({
          title: "Eroare",
          description: "Nu am putut încărca datele de analiză.",
          variant: "destructive"
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const exportReport = () => {
    if (!analytics) return;
    
    const report = [
      ['Metric', 'Value'],
      ['Total Users', analytics.totalUsers],
      ['New Users Today', analytics.newUsersToday],
      ['Total Calls', analytics.totalCalls],
      ['Calls Today', analytics.callsToday],
      ['Total Credits', analytics.totalRevenue.toLocaleString()],
      ['Credits Today', analytics.revenueToday.toLocaleString()],
      ['Active Agents', analytics.activeAgents],
      ['Average Call Duration', `${analytics.avgCallDuration} min`],
      ['User Growth Rate', `${analytics.userGrowthRate}%`],
      ['Call Success Rate', `${analytics.callSuccessRate}%`]
    ];

    const csv = report.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Monitorizarea performanței și analiza detaliată a platformei
          </p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Utilizatori</p>
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold">{analytics.totalUsers}</h2>
                  <Badge variant="secondary" className="ml-2">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{analytics.newUsersToday} azi
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Apeluri</p>
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold">{analytics.totalCalls}</h2>
                  <Badge variant="secondary" className="ml-2">
                    +{analytics.callsToday} azi
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Credite</p>
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold">{analytics.totalRevenue.toLocaleString()}</h2>
                  <Badge variant="secondary" className="ml-2">
                    +{analytics.revenueToday.toLocaleString()} azi
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Agenți Activi</p>
                <div className="flex items-center">
                  <h2 className="text-2xl font-bold">{analytics.activeAgents}</h2>
                  <Badge variant="outline" className="ml-2">
                    {analytics.avgCallDuration}min medie
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Rata de Creștere Utilizatori</span>
                <span>{analytics.userGrowthRate}%</span>
              </div>
              <Progress value={analytics.userGrowthRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Rata de Succes Apeluri</span>
                <span>{analytics.callSuccessRate}%</span>
              </div>
              <Progress value={analytics.callSuccessRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Utilizare Agenți</span>
                <span>74%</span>
              </div>
              <Progress value={74} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Utilizatori (Credite)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topUsers.map((user, index) => (
                <div key={user.user_id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-sm text-muted-foreground">{user.total_calls} apeluri</p>
                    </div>
                  </div>
                  <Badge variant="outline">{Math.round((user.total_spent_usd || 0) * 100).toLocaleString()} credite</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activitate Recentă</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {activity.admin_user_id.slice(0, 8)}...
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;