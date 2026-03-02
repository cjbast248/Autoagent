import React, { useState, useMemo, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, ChevronDown, ExternalLink, TrendingUp } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';

// Types
interface CallData {
  call_date?: string;
  created_at?: string;
  duration_seconds?: number;
  call_status?: string;
  agent_id?: string;
  agent_name?: string;
}

// Metric Tab type for the main chart
type MetricKey = 'calls' | 'minutes' | 'score' | 'response' | 'quality';

const RetellDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d'>('30d');
  const [activeMetric, setActiveMetric] = useState<MetricKey>('calls');

  // Fetch all call history data
  const { data: analyticsStats, isLoading: analyticsLoading } = useQuery({
    queryKey: ['retell-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: conversations, error } = await supabase
        .from('call_history')
        .select('*')
        .eq('user_id', user.id)
        .order('call_date', { ascending: false });

      if (error) {
        console.error('Error fetching call_history:', error);
        return null;
      }

      const allConversations = conversations || [];
      const totalCalls = allConversations.length;
      const totalSeconds = allConversations.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0);

      // Success rate
      const successfulCalls = allConversations.filter((c: any) => c.call_status === 'done').length;
      const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

      // Response rate
      const answeredCalls = allConversations.filter((c: any) =>
        c.call_status !== 'failed' && c.call_status !== 'no-answer' && c.call_status !== 'test_failed'
      ).length;
      const responseRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;

      // Quality score
      const avgDuration = totalCalls > 0 ? totalSeconds / totalCalls : 0;
      const durationBonus = Math.min(avgDuration / 60, 20);
      const qualityScore = Math.min(100, Math.round(successRate * 0.6 + durationBonus + responseRate * 0.2));

      // Overall score
      const overallScore = Math.round((successRate + responseRate + qualityScore) / 3);

      // Distribution by time of day
      let morning = 0, afternoon = 0, evening = 0;
      allConversations.forEach((c: any) => {
        const dateStr = c.created_at || c.call_date;
        if (dateStr) {
          const hour = new Date(dateStr).getHours();
          if (hour >= 6 && hour < 12) morning++;
          else if (hour >= 12 && hour < 18) afternoon++;
          else evening++;
        }
      });

      // Top agents
      const agentCounts: Record<string, { agent_id: string; agent_name: string; count: number }> = {};
      allConversations.forEach((c: any) => {
        if (c.agent_id) {
          if (!agentCounts[c.agent_id]) {
            agentCounts[c.agent_id] = {
              agent_id: c.agent_id,
              agent_name: c.agent_name || 'Agent',
              count: 0
            };
          }
          agentCounts[c.agent_id].count++;
        }
      });
      const topAgents = Object.values(agentCounts).sort((a, b) => b.count - a.count).slice(0, 5);

      // Monthly comparison
      const now = new Date();
      const thisMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1).toString().padStart(2, '0')}`;

      const thisMonthCalls = allConversations.filter((c: any) =>
        (c.call_date || c.created_at || '').startsWith(thisMonthStr)
      ).length;
      const lastMonthCalls = allConversations.filter((c: any) =>
        (c.call_date || c.created_at || '').startsWith(lastMonthStr)
      ).length;

      const monthTrend = lastMonthCalls > 0
        ? Math.round(((thisMonthCalls - lastMonthCalls) / lastMonthCalls) * 100)
        : (thisMonthCalls > 0 ? 100 : 0);

      return {
        totalCalls,
        totalSeconds,
        successRate,
        responseRate,
        qualityScore,
        overallScore,
        distribution: { morning, afternoon, evening },
        topAgents,
        thisMonthCalls,
        lastMonthCalls,
        monthTrend,
        allConversations
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('retell-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_history',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['retell-dashboard-stats', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Calculate chart data based on selected period
  const chartData = useMemo(() => {
    if (!analyticsStats?.allConversations) return [];

    const days = selectedPeriod === '7d' ? 7 : 30;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayCalls = (analyticsStats.allConversations || []).filter((c: any) => {
        const callDateStr = c.call_date || c.created_at;
        if (!callDateStr) return false;
        return callDateStr.startsWith(dateStr);
      });

      const daySeconds = dayCalls.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0);
      const dayMinutes = Math.round((daySeconds / 60) * 10) / 10;

      // Calculate day-specific metrics
      const daySuccessful = dayCalls.filter((c: any) => c.call_status === 'done').length;
      const dayAnswered = dayCalls.filter((c: any) =>
        c.call_status !== 'failed' && c.call_status !== 'no-answer'
      ).length;

      const daySuccessRate = dayCalls.length > 0 ? Math.round((daySuccessful / dayCalls.length) * 100) : 0;
      const dayResponseRate = dayCalls.length > 0 ? Math.round((dayAnswered / dayCalls.length) * 100) : 0;
      const dayQualityScore = Math.round((daySuccessRate * 0.6 + dayResponseRate * 0.4));

      result.push({
        name: date.getDate().toString().padStart(2, '0'),
        fullDate: dateStr,
        calls: dayCalls.length,
        minutes: dayMinutes,
        score: Math.round((daySuccessRate + dayResponseRate + dayQualityScore) / 3),
        response: dayResponseRate,
        quality: dayQualityScore,
      });
    }

    return result;
  }, [analyticsStats?.allConversations, selectedPeriod]);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format time for display
  const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Metrics for tabs
  const metrics = {
    calls: {
      label: t('dashboard.totalCalls') || 'Total Calls',
      value: analyticsStats?.totalCalls || 0,
      displayValue: String(analyticsStats?.totalCalls || 0),
    },
    minutes: {
      label: t('dashboard.minutesSpoken') || 'Minutes Spoken',
      value: Math.round((analyticsStats?.totalSeconds || 0) / 60),
      displayValue: formatTotalTime(analyticsStats?.totalSeconds || 0),
    },
    score: {
      label: t('dashboard.overallScore') || 'Overall Score',
      value: analyticsStats?.overallScore || 0,
      displayValue: `${analyticsStats?.overallScore || 0}%`,
    },
    response: {
      label: t('dashboard.response') || 'Response Rate',
      value: analyticsStats?.responseRate || 0,
      displayValue: `${analyticsStats?.responseRate || 0}%`,
    },
    quality: {
      label: t('dashboard.quality') || 'Quality Score',
      value: analyticsStats?.qualityScore || 0,
      displayValue: `${analyticsStats?.qualityScore || 0}%`,
    },
  };

  // Get performance status
  const getPerformanceStatus = (score: number) => {
    if (score >= 70) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 40) return { label: 'Needs attention', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: 'Needs attention', color: 'text-red-600', bg: 'bg-red-50' };
  };

  // Redirect if not authenticated
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const performanceStatus = getPerformanceStatus(analyticsStats?.overallScore || 0);

  // Donut chart data
  const donutData = [
    {
      name: t('dashboard.morning') || 'Morning',
      value: analyticsStats?.distribution?.morning || 0,
      color: '#FCA5A5',
      timeRange: '6:00 - 12:00'
    },
    {
      name: t('dashboard.afternoon') || 'Afternoon',
      value: analyticsStats?.distribution?.afternoon || 0,
      color: '#DC2626',
      timeRange: '12:00 - 18:00'
    },
    {
      name: t('dashboard.evening') || 'Evening',
      value: analyticsStats?.distribution?.evening || 0,
      color: '#111827',
      timeRange: '18:00 - 6:00'
    },
  ];

  const totalDistribution = donutData.reduce((sum, d) => sum + d.value, 0) || 1;

  // Custom tooltip for main chart
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0]?.value || 0;
      const metricLabel = metrics[activeMetric].label;
      const unit = activeMetric === 'minutes' ? ' min' : activeMetric !== 'calls' ? '%' : '';

      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg">
          <div className="text-gray-400 text-xs mb-1">Day {label}</div>
          <div className="font-semibold">{value}{unit}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white">
        <div className="px-6 py-6 space-y-6">

          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Active calls pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-full text-sm">
                <span className="w-2 h-2 bg-black rounded-full"></span>
                <span className="text-gray-700">Active calls: 0</span>
              </div>
              {/* New features pill */}
              <div className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-full text-sm cursor-pointer hover:bg-gray-800 transition-colors">
                <span>New features</span>
                <span>&gt;</span>
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Header with greeting and filters */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">My Workspace</p>
              <h1 className="text-2xl font-bold text-gray-900">
                Good morning, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Agent filter */}
              <button className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Agent
                <ChevronDown className="w-4 h-4" />
              </button>
              {/* Period filter */}
              <button className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Last 30 days
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Analytics Card */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Metric Tabs */}
            <div className="flex border-b border-gray-200">
              {(Object.keys(metrics) as MetricKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  className={`flex-1 p-5 text-left transition-colors relative ${
                    activeMetric === key ? 'bg-white' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm text-gray-500 mb-2">{metrics[key].label}</div>
                  {analyticsLoading ? (
                    <div className="h-7 bg-gray-200 rounded w-16 animate-pulse" />
                  ) : (
                    <div className="text-2xl font-semibold text-gray-900">{metrics[key].displayValue}</div>
                  )}
                  {/* Active indicator */}
                  {activeMetric === key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                  )}
                </button>
              ))}
            </div>

            {/* Chart Area */}
            <div className="p-6">
              <div className="h-80">
                {analyticsLoading ? (
                  <div className="h-full bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        interval={selectedPeriod === '30d' ? 4 : 0}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        width={30}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey={activeMetric}
                        stroke="#2563eb"
                        strokeWidth={2}
                        fill="url(#colorMetric)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#2563eb' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-4 flex justify-end">
              <button
                onClick={() => navigate('/account/conversation-analytics')}
                className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View calls
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Second Row - 3 Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Minutes Spoken Card */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Minutes Spoken</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-gray-100 rounded-full p-0.5">
                    <button
                      onClick={() => setSelectedPeriod('7d')}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        selectedPeriod === '7d'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      7 days
                    </button>
                    <button
                      onClick={() => setSelectedPeriod('30d')}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        selectedPeriod === '30d'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      30 days
                    </button>
                  </div>
                  <button className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
                    View Report
                  </button>
                </div>
              </div>

              {analyticsLoading ? (
                <div className="h-10 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
              ) : (
                <div className="text-4xl font-bold text-gray-900 mb-4">
                  {formatTotalTime(analyticsStats?.totalSeconds || 0)}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 rounded-xl mb-4">
                {analyticsLoading ? (
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">{Math.round((analyticsStats?.totalSeconds || 0) / 60)}</span>
                      <span className="text-xs text-gray-400">min</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">{analyticsStats?.totalCalls || 0}</span>
                      <span className="text-xs text-gray-400">calls</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">~</span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatTime(analyticsStats?.totalCalls ? Math.round((analyticsStats?.totalSeconds || 0) / analyticsStats.totalCalls) : 0)}
                      </span>
                      <span className="text-xs text-gray-400">/call</span>
                    </div>
                  </>
                )}
              </div>

              {/* Mini chart */}
              <div className="h-32">
                {analyticsLoading ? (
                  <div className="h-full bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="minuteGradient2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#DC2626" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        interval={selectedPeriod === '30d' ? 6 : 0}
                      />
                      <YAxis hide />
                      <Area
                        type="monotone"
                        dataKey="minutes"
                        stroke="#DC2626"
                        strokeWidth={2}
                        fill="url(#minuteGradient2)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-red-600 rounded-full"></div>
                  <span className="text-xs text-gray-600">Minutes spoken</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-gray-700 rounded-full"></div>
                  <span className="text-xs text-gray-600">Call count</span>
                </div>
              </div>
            </div>

            {/* Call Distribution Donut Chart */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-sm font-medium text-gray-600">Call Distribution</h3>
                <button className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
                  View Report
                </button>
              </div>

              {analyticsLoading ? (
                <div className="h-4 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
              ) : (
                <p className="text-sm text-gray-500 mb-4">Total: {analyticsStats?.totalCalls || 0} calls</p>
              )}

              {/* Donut Chart */}
              <div className="h-48 relative flex items-center justify-center">
                {analyticsLoading ? (
                  <div className="w-48 h-48 bg-gray-100 rounded-full animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4">
                {analyticsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-8 animate-pulse" />
                    </div>
                  ))
                ) : (
                  donutData.map((item, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></span>
                        <span className="text-xs text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round((item.value / totalDistribution) * 100)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Empty placeholder for third card (or add more metrics) */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white opacity-0">
              {/* Placeholder */}
            </div>
          </div>

          {/* Third Row - Performance, Top Agents, Total Calls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Performance Card */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Performance</h3>
                  <p className="text-xs text-gray-500">Real-time metrics</p>
                </div>
                {analyticsLoading ? (
                  <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse" />
                ) : (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${performanceStatus.bg} ${performanceStatus.color}`}>
                    <TrendingUp className="w-3 h-3" />
                    {performanceStatus.label}
                  </div>
                )}
              </div>

              {/* Overall Score */}
              <div className="flex items-center gap-3 mb-5 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm">
                  {analyticsLoading ? (
                    <div className="h-6 bg-gray-200 rounded w-10 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold text-red-600">{analyticsStats?.overallScore || 0}%</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Overall Score</p>
                  <p className="text-xs text-gray-500">Average of all metrics</p>
                </div>
              </div>

              {/* Circular Metrics */}
              <div className="grid grid-cols-3 gap-2">
                {analyticsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-[70px] h-[70px] bg-gray-200 rounded-full animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-12 mt-2 animate-pulse" />
                    </div>
                  ))
                ) : (
                  <>
                    {/* Response */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-[70px] h-[70px]">
                        <svg className="transform -rotate-90" width={70} height={70}>
                          <circle cx={35} cy={35} r={29} fill="none" stroke="#E5E7EB" strokeWidth={5} />
                          <circle
                            cx={35}
                            cy={35}
                            r={29}
                            fill="none"
                            stroke="#111111"
                            strokeWidth={5}
                            strokeDasharray={182}
                            strokeDashoffset={182 - (182 * (analyticsStats?.responseRate || 0)) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-base font-bold text-gray-900">{analyticsStats?.responseRate || 0}%</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 mt-2">Response</span>
                    </div>

                    {/* Quality */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-[70px] h-[70px]">
                        <svg className="transform -rotate-90" width={70} height={70}>
                          <circle cx={35} cy={35} r={29} fill="none" stroke="#E5E7EB" strokeWidth={5} />
                          <circle
                            cx={35}
                            cy={35}
                            r={29}
                            fill="none"
                            stroke="#6B7280"
                            strokeWidth={5}
                            strokeDasharray={182}
                            strokeDashoffset={182 - (182 * (analyticsStats?.qualityScore || 0)) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-base font-bold text-gray-900">{analyticsStats?.qualityScore || 0}%</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 mt-2">Quality</span>
                    </div>

                    {/* Success */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-[70px] h-[70px]">
                        <svg className="transform -rotate-90" width={70} height={70}>
                          <circle cx={35} cy={35} r={29} fill="none" stroke="#E5E7EB" strokeWidth={5} />
                          <circle
                            cx={35}
                            cy={35}
                            r={29}
                            fill="none"
                            stroke="#DC2626"
                            strokeWidth={5}
                            strokeDasharray={182}
                            strokeDashoffset={182 - (182 * (analyticsStats?.successRate || 0)) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-base font-bold text-gray-900">{analyticsStats?.successRate || 0}%</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 mt-2">Success</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Based on last 30 days</span>
                  <button className="text-red-600 font-medium cursor-pointer hover:underline">
                    See details →
                  </button>
                </div>
              </div>
            </div>

            {/* Top Agents Card */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Top Agents</h3>
              <p className="text-sm text-gray-500 mb-5">By number of calls (total)</p>

              <div className="space-y-3">
                {analyticsLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
                    </div>
                  ))
                ) : (
                  (analyticsStats?.topAgents || []).slice(0, 4).map((agent: any) => (
                    <div key={agent.agent_id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          <img
                            src={`https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(agent.agent_name)}&backgroundColor=transparent`}
                            alt={agent.agent_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{agent.agent_name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{agent.count} calls</span>
                    </div>
                  ))
                )}
                {!analyticsLoading && (!analyticsStats?.topAgents || analyticsStats.topAgents.length === 0) && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No agents yet
                  </div>
                )}
              </div>
            </div>

            {/* Total Calls Card */}
            <div className="border border-gray-200 rounded-xl p-6 bg-white">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-sm font-medium text-gray-600">Total Calls</h3>
                <button className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors">
                  View Report
                </button>
              </div>

              {analyticsLoading ? (
                <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse" />
              ) : (
                <div className="text-3xl font-bold text-gray-900 mb-1">{analyticsStats?.totalCalls || 0}</div>
              )}

              {/* Trend */}
              <div className="flex items-center gap-1.5 mb-2">
                {analyticsLoading ? (
                  <>
                    <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                  </>
                ) : (
                  <>
                    <TrendingUp className={`w-3.5 h-3.5 ${(analyticsStats?.monthTrend || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                    <span className={`text-sm font-medium ${(analyticsStats?.monthTrend || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(analyticsStats?.monthTrend || 0) >= 0 ? '+' : ''}{analyticsStats?.monthTrend || 0}%
                    </span>
                    <span className="text-sm text-gray-500">vs last month</span>
                  </>
                )}
              </div>

              {analyticsLoading ? (
                <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
              ) : (
                <p className="text-sm text-gray-500 mb-4">This month: {analyticsStats?.thisMonthCalls || 0} calls</p>
              )}

              {/* Mini Line Chart */}
              <div className="h-24">
                {analyticsLoading ? (
                  <div className="h-full bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.slice(-7)}>
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      />
                      <YAxis hide />
                      <Line
                        type="monotone"
                        dataKey="calls"
                        stroke="#DC2626"
                        strokeWidth={2}
                        dot={{ fill: '#DC2626', strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5, fill: '#DC2626' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  <span className="text-xs text-gray-600">Last 7 days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row - Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-xl p-4 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Saved transcripts</p>
                  <p className="text-lg font-semibold text-gray-900">0</p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-lg font-semibold text-gray-900">{analyticsStats?.successRate || 0}%</p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total calls</p>
                  <p className="text-lg font-semibold text-gray-900">{analyticsStats?.totalCalls || 0}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default RetellDashboard;
