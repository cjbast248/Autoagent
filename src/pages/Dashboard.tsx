import React, { useState, useMemo, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ArrowUpRight, ArrowRight, Check, PhoneCall, Clock, Coins, BrainCircuit, Calendar } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { GlobalCallIndicator } from '@/components/GlobalCallIndicator';
import { toast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Metric Tab type for the main chart
type MetricKey = 'calls' | 'avgDuration' | 'totalCost' | 'avgCost' | 'llmCost' | 'avgLlmCost';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, session } = useAuth();
  const { displayName } = useUserProfile();

  // Check if user needs phone verification
  useEffect(() => {
    if (!authLoading && user) {
      // Check if user signed up with phone (dummy email)
      const isPhoneSignup = user.email?.includes('@agentauto.temp');

      if (isPhoneSignup) {
        // Check if phone is verified
        supabase
          .from('profiles')
          .select('phone_verified, phone_number')
          .eq('id', user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              if (!data.phone_verified && data.phone_number) {
                // Phone not verified - redirect to verification page
                navigate('/phone-verification-pending', { replace: true });
              }
            }
          })
          .catch((err) => {
            console.error('Error checking phone verification status:', err);
          });
      }
    }
  }, [user, authLoading, navigate]);

  // Persist period filter to localStorage
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>(() => {
    const saved = localStorage.getItem('dashboard-period');
    return (saved === '7d' || saved === '30d' || saved === '90d') ? saved : '30d';
  });
  const handlePeriodChange = (period: '7d' | '30d' | '90d') => {
    setSelectedPeriod(period);
    localStorage.setItem('dashboard-period', period);
  };

  const [activeMetric, setActiveMetric] = useState<MetricKey>('calls');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentSearch, setAgentSearch] = useState('');

  // Helper function to get start date based on period
  const getStartDate = (period: '7d' | '30d' | '90d') => {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    now.setDate(now.getDate() - days);
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  };

  // Fetch conversations for selected period - filtered on server for speed
  const { data: analyticsStats, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, selectedPeriod],
    queryFn: async () => {
      if (!user) return null;

      const startDate = getStartDate(selectedPeriod);

      // Fetch conversations and agents in parallel for speed
      const [conversationsResult, agentsResult] = await Promise.all([
        supabase
          .from('call_history')
          .select('*')
          .eq('user_id', user.id)
          .gte('call_date', startDate)
          .order('call_date', { ascending: false }),
        supabase
          .from('kalina_agents')
          .select('agent_id, name')
          .eq('user_id', user.id)
      ]);

      if (conversationsResult.error) {
        console.error('Error fetching call_history:', conversationsResult.error);
        return null;
      }

      const allConversations = conversationsResult.data || [];
      const agentsData = agentsResult.data || [];

      // Create agent name lookup map
      const agentNameMap: Record<string, string> = {};
      agentsData.forEach((agent: any) => {
        if (agent.agent_id) {
          agentNameMap[agent.agent_id] = agent.name || 'Agent';
        }
      });

      // Extract unique agents with correct names
      const agentCounts: Record<string, { agent_id: string; agent_name: string; count: number }> = {};
      allConversations.forEach((c: any) => {
        if (c.agent_id) {
          if (!agentCounts[c.agent_id]) {
            agentCounts[c.agent_id] = {
              agent_id: c.agent_id,
              agent_name: agentNameMap[c.agent_id] || c.agent_name || 'Agent',
              count: 0
            };
          }
          agentCounts[c.agent_id].count++;
        }
      });
      const allAgentsList = Object.values(agentCounts).sort((a, b) => b.count - a.count);

      return {
        allConversations,
        allAgentsList
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Send Telegram notification for new users on first dashboard visit
  useEffect(() => {
    if (!user || !session) return;

    const sendNewUserNotification = async () => {
      const notificationKey = `telegram_notified_${user.id}`;
      const existingFlag = localStorage.getItem(notificationKey);

      // Check if already notified
      if (existingFlag) {
        return;
      }

      // Check if user is new (created within last 60 minutes)
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      if (minutesSinceCreation > 60) {
        // Not a new user, mark as notified to skip future checks
        localStorage.setItem(notificationKey, 'old_user');
        return;
      }

      // Mark as notified immediately to prevent duplicate sends
      localStorage.setItem(notificationKey, new Date().toISOString());

      try {
        // Get provider from app_metadata
        const provider = user.app_metadata?.provider || 'email';

        // Get name from user_metadata
        const fullName = user.user_metadata?.full_name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || user.user_metadata?.first_name || '';
        const lastName = nameParts.slice(1).join(' ') || user.user_metadata?.last_name || '';

        const response = await supabase.functions.invoke('telegram-notify-signup', {
          body: {
            user_id: user.id,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            is_basic: true,
            provider: provider
          }
        });

      } catch (err) {
        console.error('⚠️ Failed to send Telegram notification:', err);
        // Don't remove the flag - we tried, don't spam
      }
    };

    sendNewUserNotification();
  }, [user, session]);

  // Real-time subscription with debouncing
  useEffect(() => {
    if (!user) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_history',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Debounce: coalesce multiple events (500ms window)
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats', user.id, selectedPeriod] });
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, selectedPeriod]);

  // Filter conversations by selected agent (period is already filtered on server)
  const filteredConversations = useMemo(() => {
    if (!analyticsStats?.allConversations) return [];

    // If no agent selected, return all (already filtered by period from server)
    if (!selectedAgentId) return analyticsStats.allConversations;

    // Filter by agent
    return analyticsStats.allConversations.filter((c: any) => c.agent_id === selectedAgentId);
  }, [analyticsStats?.allConversations, selectedAgentId]);

  // Recalculate stats based on filtered conversations (by period AND agent)
  const filteredStats = useMemo(() => {
    const conversations = filteredConversations;
    const totalCalls = conversations.length;
    const totalSeconds = conversations.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0);

    // Calculate costs (assuming credits_used field exists, otherwise estimate)
    const totalCredits = conversations.reduce((sum: number, c: any) => sum + (c.credits_used || Math.round((c.duration_seconds || 0) / 60 * 100)), 0);
    const avgCreditsPerCall = totalCalls > 0 ? Math.round(totalCredits / totalCalls) : 0;

    // LLM costs (estimate based on duration - roughly $0.03/min)
    const totalMinutes = totalSeconds / 60;
    const totalLlmCost = totalMinutes * 0.03;
    const avgLlmCostPerMin = totalMinutes > 0 ? totalLlmCost / totalMinutes : 0;

    const avgDuration = totalCalls > 0 ? totalSeconds / totalCalls : 0;

    return {
      totalCalls,
      totalSeconds,
      avgDuration,
      totalCredits,
      avgCreditsPerCall,
      totalLlmCost,
      avgLlmCostPerMin
    };
  }, [filteredConversations]);

  // Calculate chart data based on selected period AND filtered conversations
  const chartData = useMemo(() => {
    const conversations = filteredConversations;
    if (!conversations.length) return [];

    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayCalls = conversations.filter((c: any) => {
        const callDateStr = c.call_date || c.created_at;
        if (!callDateStr) return false;
        return callDateStr.startsWith(dateStr);
      });

      const daySeconds = dayCalls.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0);
      const dayMinutes = daySeconds / 60;
      const dayCredits = dayCalls.reduce((sum: number, c: any) => sum + (c.credits_used || Math.round((c.duration_seconds || 0) / 60 * 100)), 0);

      result.push({
        name: date.getDate().toString().padStart(2, '0'),
        fullDate: dateStr,
        calls: dayCalls.length,
        avgDuration: dayCalls.length > 0 ? Math.round(daySeconds / dayCalls.length) : 0,
        totalCost: dayCredits,
        avgCost: dayCalls.length > 0 ? Math.round(dayCredits / dayCalls.length) : 0,
        llmCost: Math.round(dayMinutes * 0.03 * 100) / 100,
        avgLlmCost: dayMinutes > 0 ? Math.round((dayMinutes * 0.03 / dayMinutes) * 1000) / 1000 : 0,
      });
    }

    return result;
  }, [filteredConversations, selectedPeriod]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCredits = (credits: number) => {
    if (credits >= 1000000) return `${(credits / 1000000).toFixed(1)}M`;
    if (credits >= 1000) return `${(credits / 1000).toFixed(1)}K`;
    return String(credits);
  };

  // Metrics for tabs - use filtered stats
  const metrics: Record<MetricKey, { label: string; value: number; displayValue: string; suffix?: string }> = {
    calls: {
      label: 'Number of calls',
      value: filteredStats.totalCalls,
      displayValue: String(filteredStats.totalCalls),
    },
    avgDuration: {
      label: 'Average duration',
      value: filteredStats.avgDuration,
      displayValue: formatDuration(filteredStats.avgDuration),
    },
    totalCost: {
      label: 'Total cost',
      value: filteredStats.totalCredits,
      displayValue: formatCredits(filteredStats.totalCredits),
      suffix: 'credits',
    },
    avgCost: {
      label: 'Average cost',
      value: filteredStats.avgCreditsPerCall,
      displayValue: formatCredits(filteredStats.avgCreditsPerCall),
      suffix: 'credits/call',
    },
    llmCost: {
      label: 'Total LLM cost',
      value: filteredStats.totalLlmCost,
      displayValue: `$${filteredStats.totalLlmCost.toFixed(1)}`,
    },
    avgLlmCost: {
      label: 'Average LLM cost',
      value: filteredStats.avgLlmCostPerMin,
      displayValue: `$${filteredStats.avgLlmCostPerMin.toFixed(3)}`,
      suffix: '/min',
    },
  };

  // Show loading state first to prevent redirect race conditions
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect if not authenticated (check session for better reliability)
  if (!session && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to email verification if email not confirmed
  if (user && !user.email_confirmed_at) {
    return <Navigate to="/email-verification-pending" replace />;
  }

  // Custom tooltip for main chart - Zen Style
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0]?.value || 0;
      const metric = metrics[activeMetric];
      let displayVal = value;
      let suffix = '';

      if (activeMetric === 'avgDuration') {
        displayVal = formatDuration(value);
      } else if (activeMetric === 'totalCost' || activeMetric === 'avgCost') {
        displayVal = formatCredits(value);
      } else if (activeMetric === 'llmCost' || activeMetric === 'avgLlmCost') {
        displayVal = `$${value.toFixed(3)}`;
      } else if (activeMetric === 'calls') {
        suffix = ' Calls';
      }

      return (
        <div className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
          {displayVal}{suffix}
        </div>
      );
    }
    return null;
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get selected agent name
  const getSelectedAgentName = () => {
    if (!selectedAgentId) return 'All agents';
    const agent = analyticsStats?.allAgentsList?.find((a: any) => a.agent_id === selectedAgentId);
    return agent?.agent_name || 'Agent';
  };

  // Get period label
  const getPeriodLabel = () => {
    if (selectedPeriod === '7d') return 'Last 7 days';
    if (selectedPeriod === '30d') return 'Last month';
    return 'Last 90 days';
  };

  // Get chart date range labels
  const getDateRangeLabels = () => {
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return { start: formatDate(startDate), end: formatDate(endDate) };
  };

  const dateRange = getDateRangeLabels();

  return (
    <DashboardLayout>
      <div className="min-h-screen p-4 md:p-10 pb-32 bg-white">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <header className="flex flex-col gap-6 mb-8 md:mb-16">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
              {/* System Status - Dynamic Call Indicator */}
              <GlobalCallIndicator />

              {/* Right Side Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toast({ title: "În curând", description: "Pagina cu noutăți va fi disponibilă în curând." })}
                  className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-black transition"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  NEW FEATURES
                </button>
                <div className="h-4 w-px bg-zinc-200"></div>

                {/* Period Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 shadow-sm hover:border-zinc-300 transition cursor-pointer">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-700">{getPeriodLabel()}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handlePeriodChange('7d')}
                      className="flex items-center justify-between"
                    >
                      Last 7 days
                      {selectedPeriod === '7d' && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePeriodChange('30d')}
                      className="flex items-center justify-between"
                    >
                      Last month
                      {selectedPeriod === '30d' && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handlePeriodChange('90d')}
                      className="flex items-center justify-between"
                    >
                      Last 90 days
                      {selectedPeriod === '90d' && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Greeting */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 text-black">
                {getGreeting()}, <span className="text-zinc-400">{displayName || user?.email?.split('@')[0] || 'User'}.</span>
              </h1>
              <p className="text-zinc-500">Here's what's happening in your workspace today.</p>
            </div>
          </header>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {/* Total Calls - Primary Card */}
            <div
              onClick={() => setActiveMetric('calls')}
              className={`stat-card p-6 rounded-2xl cursor-pointer group transition-all duration-300 hover:-translate-y-0.5 ${activeMetric === 'calls'
                ? 'border border-zinc-200 bg-zinc-50'
                : 'border border-zinc-100 bg-white hover:border-zinc-200'
                }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeMetric === 'calls'
                  ? 'bg-black text-white'
                  : 'bg-white border border-zinc-200 text-zinc-500 group-hover:bg-black group-hover:text-white'
                  }`}>
                  <PhoneCall className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <span className="flex items-center text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" /> 12%
                </span>
              </div>
              <div>
                <h3 className="text-4xl font-bold tracking-tight group-hover:scale-105 transition-transform origin-left text-black">
                  {filteredStats.totalCalls}
                </h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">Total Calls Processed</p>
              </div>
            </div>

            {/* Avg Duration */}
            <div
              onClick={() => setActiveMetric('avgDuration')}
              className={`stat-card p-6 rounded-2xl cursor-pointer group transition-all duration-300 hover:-translate-y-0.5 ${activeMetric === 'avgDuration'
                ? 'border border-zinc-200 bg-zinc-50'
                : 'border border-zinc-100 bg-white hover:border-zinc-200'
                }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeMetric === 'avgDuration'
                  ? 'bg-black text-white'
                  : 'bg-zinc-50 border border-zinc-100 text-zinc-500 group-hover:bg-black group-hover:text-white'
                  }`}>
                  <Clock className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-zinc-900">{formatDuration(filteredStats.avgDuration)}</h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">Avg. Duration (min)</p>
              </div>
            </div>

            {/* Credits Used */}
            <div
              onClick={() => setActiveMetric('totalCost')}
              className={`stat-card p-6 rounded-2xl cursor-pointer group transition-all duration-300 hover:-translate-y-0.5 ${activeMetric === 'totalCost'
                ? 'border border-zinc-200 bg-zinc-50'
                : 'border border-zinc-100 bg-white hover:border-zinc-200'
                }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeMetric === 'totalCost'
                  ? 'bg-black text-white'
                  : 'bg-zinc-50 border border-zinc-100 text-zinc-500 group-hover:bg-black group-hover:text-white'
                  }`}>
                  <Coins className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-zinc-900">{formatCredits(filteredStats.totalCredits)}</h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">Credits Used</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">~{filteredStats.avgCreditsPerCall} credits / call</p>
              </div>
            </div>

            {/* LLM Cost */}
            <div
              onClick={() => setActiveMetric('llmCost')}
              className={`stat-card p-6 rounded-2xl cursor-pointer group transition-all duration-300 hover:-translate-y-0.5 ${activeMetric === 'llmCost'
                ? 'border border-zinc-200 bg-zinc-50'
                : 'border border-zinc-100 bg-white hover:border-zinc-200'
                }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeMetric === 'llmCost'
                  ? 'bg-black text-white'
                  : 'bg-zinc-50 border border-zinc-100 text-zinc-500 group-hover:bg-black group-hover:text-white'
                  }`}>
                  <BrainCircuit className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-zinc-900">${filteredStats.totalLlmCost.toFixed(2)}</h3>
                <p className="text-xs font-medium text-zinc-500 mt-1">Total LLM Cost</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">${filteredStats.avgLlmCostPerMin.toFixed(3)} / min</p>
              </div>
            </div>
          </div>

          {/* Chart Card - Premium Design */}
          <div className="relative w-full rounded-3xl border overflow-hidden bg-white border-zinc-100">

            {/* Chart Header */}
            <div className="relative z-10 flex justify-between items-center px-8 pt-8 pb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-bold text-zinc-900">Call Volume Trend</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-600" />
                  <span className="text-[10px] font-medium text-zinc-400">{metrics[activeMetric].label}</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/account/conversation-analytics')}
                className="text-xs font-medium text-zinc-400 hover:text-black flex items-center gap-1 transition group"
              >
                View Report <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Chart Container - always show, empty when no data */}
            <div className="relative h-64 px-8 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    {/* Premium gradient fill */}
                    <linearGradient id="chartGradientPremium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#18181b" stopOpacity={0.15} />
                      <stop offset="50%" stopColor="#18181b" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                    {/* Glow effect for the line */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <Tooltip
                    content={<CustomChartTooltip />}
                    cursor={{
                      stroke: '#a1a1aa',
                      strokeWidth: 1,
                      strokeDasharray: '4 4'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={activeMetric}
                    stroke="#18181b"
                    strokeWidth={2.5}
                    fill="url(#chartGradientPremium)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: '#18181b',
                      stroke: '#fff',
                      strokeWidth: 3,
                      filter: 'url(#glow)'
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* X-axis with better styling */}
            <div className="relative px-8 pb-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-px bg-zinc-200" />
                <span className="text-[10px] font-mono text-zinc-400">{dateRange.start}</span>
              </div>
              <div className="flex-1 mx-4 h-px bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-400">{dateRange.end}</span>
                <div className="w-8 h-px bg-zinc-200" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
