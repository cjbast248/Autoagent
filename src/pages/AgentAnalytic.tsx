import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthContext';
import { useUserAgents } from '@/hooks/useUserAgents';
import { useAgentConversations } from '@/hooks/useAgentConversations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Play, CheckCircle, AlertCircle, Clock, CalendarIcon, Maximize2,
  Phone, TrendingUp, Search, BarChart2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useLanguage } from '@/contexts/LanguageContext';
import { SyncConversationsButton } from '@/components/SyncConversationsButton';

// Get Open Peeps avatar URL from DiceBear (black and white)
const getOpenPeepsAvatar = (seed: string) => {
  return `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&skinColor=f5f5f5&clothingColor=000000,333333,666666&hairColor=000000,333333`;
};

// Grayscale backgrounds for avatar circles
const avatarBackgrounds = [
  'bg-gradient-to-br from-gray-100 to-gray-200',
  'bg-gradient-to-br from-slate-100 to-slate-200',
  'bg-gradient-to-br from-zinc-100 to-zinc-200',
  'bg-gradient-to-br from-neutral-100 to-neutral-200',
  'bg-gradient-to-br from-stone-100 to-stone-200',
];

const getAvatarBackground = (seed: string) => {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarBackgrounds[hash % avatarBackgrounds.length];
};

const AgentAnalytic = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: agents, isLoading: agentsLoading } = useUserAgents();

  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [durationRange, setDurationRange] = useState<[number, number]>([0, 600]); // 0 sec to 10 min
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentStats, setAgentStats] = useState<Record<string, { call_count: number; total_duration_seconds: number }>>({});

  // Fetch agent stats (call_count) from get_user_top_agents
  useEffect(() => {
    const fetchAgentStats = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase.rpc('get_user_top_agents', {
          p_user_id: user.id,
          p_limit: 100
        });

        if (error) {
          console.error('Error fetching agent stats:', error);
          return;
        }

        // Create a map of agent_id -> stats
        const statsMap: Record<string, { call_count: number; total_duration_seconds: number }> = {};
        (data || []).forEach((stat: any) => {
          statsMap[stat.agent_id] = {
            call_count: stat.call_count || 0,
            total_duration_seconds: stat.total_duration_seconds || 0
          };
        });

        setAgentStats(statsMap);
      } catch (err) {
        console.error('Error fetching agent stats:', err);
      }
    };

    fetchAgentStats();
  }, [user?.id]);

  const { data: conversations, isLoading: conversationsLoading, loadingProgress } = useAgentConversations(
    selectedAgent?.agent_id
  );

  // Filter conversations based on duration and date
  const filteredConversations = conversations?.filter((conv: any) => {
    // Duration filter
    const duration = conv.duration_seconds || 0;
    if (duration < durationRange[0] || duration > durationRange[1]) {
      return false;
    }

    // Date filter
    if (dateFrom || dateTo) {
      const callDate = new Date(conv.call_date);
      if (dateFrom && callDate < dateFrom) {
        return false;
      }
      if (dateTo) {
        const dateToEnd = new Date(dateTo);
        dateToEnd.setHours(23, 59, 59, 999);
        if (callDate > dateToEnd) {
          return false;
        }
      }
    }

    return true;
  });

  const handleAgentSelect = (agent: any) => {
    setSelectedAgent(agent);
    setSelectedConversations([]);
    setAnalysisResults([]);
  };

  const handleBackToAgents = () => {
    setSelectedAgent(null);
    setSelectedConversations([]);
    setAnalysisResults([]);
  };

  const handleToggleConversation = (conversationId: string) => {
    setSelectedConversations(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedConversations.length === filteredConversations?.length) {
      setSelectedConversations([]);
    } else {
      setSelectedConversations(filteredConversations?.map((c: any) => c.conversation_id) || []);
    }
  };

  const handleAnalyze = async () => {
    if (selectedConversations.length === 0) {
      toast.error('Select at least one conversation');
      return;
    }

    if (!systemPrompt.trim()) {
      toast.error('Enter an analysis prompt');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversations-custom', {
        body: {
          conversationIds: selectedConversations,
          systemPrompt: systemPrompt,
          userId: user?.id
        }
      });

      if (error) throw error;

      setAnalysisResults(data.results || []);

      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.length - successCount;

      toast.success(`Analysis complete: ${successCount} conversations processed${failCount > 0 ? `, ${failCount} failed` : ''}`);

    } catch (error: any) {
      console.error('Error analyzing conversations:', error);
      toast.error('Error processing conversations: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate stats using agentStats
  const totalConversations = agents?.reduce((sum: number, agent: any) => sum + (agentStats[agent.agent_id]?.call_count || 0), 0) || 0;
  const activeAgents = agents?.filter((a: any) => (agentStats[a.agent_id]?.call_count || 0) > 0).length || 0;
  const totalAgents = agents?.length || 0;

  if (agentsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  // Dotted background pattern
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px',
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-4 md:p-10 pb-32" style={dotPatternStyle}>
        <div className="max-w-5xl mx-auto">
          {/* Agents Selection View */}
          {!selectedAgent && (() => {
            // Filter agents by search
            const filteredAgents = agents?.filter((agent: any) =>
              !searchQuery ||
              (agent.name || '').toLowerCase().includes(searchQuery.toLowerCase())
            ) || [];

            // Sort agents by call count (top performers first), then by created_at
            const sortedAgents = [...filteredAgents].sort((a: any, b: any) => {
              const aCallCount = agentStats[a.agent_id]?.call_count || 0;
              const bCallCount = agentStats[b.agent_id]?.call_count || 0;

              // First sort by call count (descending)
              if (bCallCount !== aCallCount) {
                return bCallCount - aCallCount;
              }

              // Then sort by created_at (newest first)
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            return (
              <>
                {/* Header */}
                <header className="mb-8">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-black tracking-tight">Performance</h1>
                    <span className="w-fit px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-500">
                      {format(new Date(), 'MMMM yyyy').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-zinc-500">Agent performance analytics</p>
                    <span className="text-zinc-300">•</span>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Live Metrics
                    </span>
                  </div>
                </header>

                {/* Search Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Filter agents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-full text-sm focus:outline-none focus:border-zinc-400 transition w-64 placeholder-zinc-400"
                    />
                  </div>
                </div>

                {/* Bento Grid Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {/* Main Stats Card - Dark */}
                  <div className="col-span-1 md:col-span-2 bg-black text-white rounded-2xl p-6 relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Conversations</p>
                      <h2 className="text-4xl font-bold tracking-tight">{totalConversations.toLocaleString()}</h2>

                      {/* Bar Chart */}
                      <div className="mt-6 flex items-end gap-1.5 h-20">
                        <div className="flex-1 bg-zinc-800 rounded-t h-[40%]"></div>
                        <div className="flex-1 bg-zinc-800 rounded-t h-[60%]"></div>
                        <div className="flex-1 bg-zinc-800 rounded-t h-[35%]"></div>
                        <div className="flex-1 bg-zinc-800 rounded-t h-[75%]"></div>
                        <div className="flex-1 bg-zinc-800 rounded-t h-[50%]"></div>
                        <div className="flex-1 bg-white rounded-t h-[90%]"></div>
                        <div className="flex-1 bg-zinc-800/50 rounded-t h-[25%]"></div>
                      </div>
                    </div>
                  </div>

                  {/* Side Stats */}
                  <div className="flex flex-col gap-4">
                    <div className="flex-1 bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col justify-center">
                      <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Active Agents</p>
                      <div className="flex items-center gap-2">
                        <h3 className="text-3xl font-bold text-zinc-900">{activeAgents}</h3>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">/ {totalAgents} total</p>
                    </div>

                    <div className="flex-1 bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col justify-center">
                      <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Avg. Success Rate</p>
                      <h3 className="text-3xl font-bold text-zinc-900">94.2%</h3>
                      <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-black h-full w-[94%] rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Performers Section */}
                <div className="mb-4">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Top Performers</h3>
                </div>

                {/* Agent Rows */}
                <div className="space-y-3">
                  {sortedAgents.map((agent: any, index: number) => {
                    const callCount = agentStats[agent.agent_id]?.call_count || 0;
                    const isActive = callCount > 0;

                    return (
                      <div
                        key={agent.id}
                        onClick={() => handleAgentSelect(agent)}
                        className="group bg-white border border-zinc-200 rounded-2xl p-4 px-6 grid grid-cols-1 md:grid-cols-[2fr_2fr_1.5fr] gap-4 md:gap-0 items-center cursor-pointer transition-all hover:border-zinc-400 hover:shadow-md hover:-translate-y-px"
                      >
                        {/* Agent Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-[42px] h-[42px] rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center group-hover:grayscale-0 transition">
                            <img
                              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${agent.name || agent.agent_id}`}
                              alt={agent.name}
                              className={`w-full h-full object-cover ${!isActive ? 'grayscale' : 'grayscale group-hover:grayscale-0'} transition`}
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-black">{agent.name || 'Unnamed Agent'}</h4>
                            <p className="text-[11px] text-zinc-400">
                              {isActive ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                        </div>

                        {/* Sparkline */}
                        <div className="flex justify-center">
                          {isActive ? (
                            <svg width="120" height="24" viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60 group-hover:opacity-100 transition">
                              <path d="M2 18L15 12L28 16L42 8L56 14L70 10L84 16L98 6L118 12" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg width="120" height="24" viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-30">
                              <path d="M2 18L118 18" stroke="black" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>

                        {/* Call Count */}
                        <div className="text-right">
                          <span className={`text-sm font-bold ${isActive ? 'text-black' : 'text-zinc-400'}`}>{callCount}</span>
                          <span className="text-[11px] text-zinc-400 block">calls this month</span>
                        </div>
                      </div>
                    );
                  })}

                </div>

                {/* Empty State */}
                {(!agents || agents.length === 0) && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-4">
                      <BarChart2 className="w-8 h-8 text-zinc-300" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-900 mb-2">No agents yet</h3>
                    <p className="text-sm text-zinc-500 mb-4">Create your first agent to see performance analytics</p>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/account/agents')}
                    >
                      Create Agent
                    </Button>
                  </div>
                )}

                {/* No Search Results */}
                {agents && agents.length > 0 && filteredAgents.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-zinc-300" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-900 mb-2">No agents found</h3>
                    <p className="text-sm text-zinc-500">Try a different search term</p>
                  </div>
                )}
              </>
            );
          })()}

          {/* Analysis View */}
          {selectedAgent && (
            <div className="pb-32">
              {/* Back Button */}
              <button
                onClick={handleBackToAgents}
                className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-black transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm">Back to agents</span>
              </button>

              {/* Header */}
              <header className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-black tracking-tight">AI Analysis</h1>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-500">
                        {selectedAgent.name?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">Configure conversation analysis parameters</p>
                  </div>
                  <SyncConversationsButton
                    agentId={selectedAgent?.elevenlabs_agent_id || selectedAgent?.agent_id}
                    variant="outline"
                    size="sm"
                  />
                </div>
              </header>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {/* Left Column - Data Source (1/3) */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Data Source Card */}
                  <div className="bg-white border border-zinc-200 rounded-2xl p-6">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Data Source</p>

                    {/* Conversations Count */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-zinc-900">
                          {selectedConversations.length > 0 ? selectedConversations.length.toLocaleString() : (filteredConversations?.length || 0).toLocaleString()}
                        </span>
                        <span className="text-sm text-zinc-400">conversations</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {selectedConversations.length > 0 ? 'selected for analysis' : 'available'}
                      </p>
                    </div>

                    {/* Time Range */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Period</span>
                        <span className="text-xs font-medium text-zinc-600">
                          {dateFrom && dateTo
                            ? `${format(dateFrom, 'dd MMM')} - ${format(dateTo, 'dd MMM yyyy')}`
                            : dateFrom
                              ? `From ${format(dateFrom, 'dd MMM yyyy')}`
                              : dateTo
                                ? `Until ${format(dateTo, 'dd MMM yyyy')}`
                                : 'All time'
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Duration</span>
                        <span className="text-xs font-medium text-zinc-600">
                          {durationRange[0] >= 60 ? `${Math.floor(durationRange[0] / 60)}m` : `${durationRange[0]}s`} - {durationRange[1] >= 60 ? `${Math.floor(durationRange[1] / 60)}m` : `${durationRange[1]}s`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Agent</span>
                        <span className="text-xs font-medium text-zinc-600">{selectedAgent.name}</span>
                      </div>
                    </div>

                    {/* Change Selection Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="mt-6 w-full py-2.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 hover:border-zinc-300 transition-colors">
                          Change Selection
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-medium">Select Conversations</DialogTitle>
                          <DialogDescription className="text-sm text-zinc-500">
                            {filteredConversations?.length || 0} of {conversations?.length || 0} conversations available
                          </DialogDescription>
                        </DialogHeader>

                        {/* Filters in Dialog */}
                        <div className="space-y-4 py-4 border-b border-zinc-100">
                          {/* Duration Filter */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Duration: {durationRange[0] >= 60 ? `${Math.floor(durationRange[0] / 60)}m ${durationRange[0] % 60}s` : `${durationRange[0]}s`} - {durationRange[1] >= 60 ? `${Math.floor(durationRange[1] / 60)}m ${durationRange[1] % 60}s` : `${durationRange[1]}s`}
                            </label>
                            <Slider
                              value={durationRange}
                              onValueChange={(value) => setDurationRange(value as [number, number])}
                              min={0}
                              max={600}
                              step={10}
                              minStepsBetweenThumbs={1}
                              className="w-full"
                            />
                          </div>

                          {/* Date Filters */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">From</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-left font-normal text-xs"
                                  >
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Any time"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={dateFrom}
                                    onSelect={setDateFrom}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">To</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-left font-normal text-xs"
                                  >
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Any time"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={dateTo}
                                    onSelect={setDateTo}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          {/* Select All Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            className="text-xs"
                          >
                            {selectedConversations.length === filteredConversations?.length
                              ? 'Deselect all'
                              : 'Select all'
                            }
                          </Button>
                        </div>

                        {/* Conversations List */}
                        <ScrollArea className="h-[400px] -mx-6 px-6">
                          {conversationsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                              <LoadingSpinner />
                              {loadingProgress && (
                                <>
                                  <Progress
                                    value={(loadingProgress.loaded / loadingProgress.total) * 100}
                                    className="w-full max-w-xs"
                                  />
                                  <p className="text-xs text-zinc-400 animate-pulse">
                                    Loading {loadingProgress.loaded.toLocaleString()}/{loadingProgress.total.toLocaleString()} conversations
                                  </p>
                                </>
                              )}
                            </div>
                          ) : filteredConversations?.length === 0 ? (
                            <div className="text-center py-12 text-zinc-400 text-sm">
                              {conversations?.length === 0
                                ? 'No conversations for this agent'
                                : 'No conversations match the selected filters'}
                            </div>
                          ) : (
                            <div className="divide-y divide-zinc-100">
                              {filteredConversations?.map((conv: any) => (
                                <div
                                  key={conv.id}
                                  className="py-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50 -mx-2 px-2 rounded-lg transition-colors"
                                  onClick={() => handleToggleConversation(conv.conversation_id)}
                                >
                                  <Checkbox
                                    checked={selectedConversations.includes(conv.conversation_id)}
                                    onCheckedChange={() => handleToggleConversation(conv.conversation_id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-zinc-900 truncate">
                                        {conv.contact_name || 'Unknown'}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                        {conv.call_status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-zinc-400 font-mono">{conv.phone_number}</span>
                                      <span className="text-zinc-300">•</span>
                                      <span className="text-xs text-zinc-400">
                                        {new Date(conv.call_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                      </span>
                                      {conv.duration_seconds && (
                                        <>
                                          <span className="text-zinc-300">•</span>
                                          <span className="text-xs text-zinc-400">
                                            {Math.floor(conv.duration_seconds / 60)}:{(conv.duration_seconds % 60).toString().padStart(2, '0')}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Results Preview (if any) */}
                  {analysisResults.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-zinc-200">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Results</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="text-xs text-zinc-500 hover:text-black transition-colors flex items-center gap-1">
                              <Maximize2 className="w-3 h-3" />
                              View all
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Analysis Results</DialogTitle>
                              <DialogDescription>
                                {analysisResults.length} results processed
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] rounded-md border bg-zinc-50 p-4">
                              <div className="space-y-4">
                                {analysisResults.map((result, index) => (
                                  <div
                                    key={index}
                                    className="rounded-lg border bg-white p-4 space-y-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      {result.success ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                      )}
                                      <span className="font-medium text-sm">
                                        {result.contactName || 'Conversation'} - {result.phoneNumber}
                                      </span>
                                    </div>
                                    {result.success ? (
                                      <div className="text-sm text-zinc-600 whitespace-pre-wrap">
                                        {result.result}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-red-500">
                                        Error: {result.error}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="space-y-2">
                        {analysisResults.slice(0, 3).map((result, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            {result.success ? (
                              <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                            )}
                            <span className="text-zinc-600 truncate">{result.contactName || 'Conversation'}</span>
                          </div>
                        ))}
                        {analysisResults.length > 3 && (
                          <p className="text-xs text-zinc-400 pl-5">+{analysisResults.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Instructions (2/3) */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                    {/* Textarea Header */}
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Instructions</p>
                      <button className="text-xs text-zinc-400 hover:text-black transition-colors">
                        Use Template →
                      </button>
                    </div>

                    {/* Seamless Textarea */}
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Describe what you want to learn from these conversations...

Examples:
• Extract customer name and main issue
• Identify sentiment: Positive, Negative or Neutral
• Summarize in 2-3 sentences
• List key points in JSON format"
                      className="w-full min-h-[300px] px-6 py-4 text-sm text-zinc-700 placeholder-zinc-300 resize-none focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Floating Bottom Bar */}
              <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50">
                <div className="bg-white/80 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-zinc-200/50 px-4 py-3 md:px-6 flex flex-col md:flex-row items-center gap-4 md:gap-6">
                  {/* Info */}
                  <div className="flex items-center justify-center gap-3 w-full md:w-auto md:pr-6 md:border-r border-zinc-200">
                    <div className="text-center md:text-right">
                      <p className="text-xs font-medium text-zinc-900">
                        {selectedConversations.length > 0 ? selectedConversations.length : (filteredConversations?.length || 0)} conversations
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        ~{Math.ceil((selectedConversations.length > 0 ? selectedConversations.length : (filteredConversations?.length || 0)) * 0.5)} min est.
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      // Auto-select all if none selected
                      if (selectedConversations.length === 0) {
                        setSelectedConversations(filteredConversations?.map((c: any) => c.conversation_id) || []);
                      }
                      handleAnalyze();
                    }}
                    disabled={isAnalyzing || !systemPrompt.trim() || (filteredConversations?.length || 0) === 0}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${isAnalyzing || !systemPrompt.trim() || (filteredConversations?.length || 0) === 0
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-zinc-800 hover:scale-105 shadow-lg'
                      }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Start Analysis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentAnalytic;
