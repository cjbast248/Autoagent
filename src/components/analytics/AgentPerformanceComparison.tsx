import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { TrendingUp, ArrowUpDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';

// Generate Open Peeps avatar URL based on agent name (black and white)
function getAgentAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&skinColor=f5f5f5&clothingColor=000000,333333,666666&hairColor=000000,333333`;
}

// Avatar background - simple gray for black and white look
function getAvatarBackground(): string {
  return 'bg-gray-100';
}

interface CallData {
  agent_id: string | null;
  call_date: string;
  duration_seconds: number | null;
  call_status: string;
  cost_usd: number | null;
}

interface AgentStats {
  agentId: string;
  agentName: string;
  totalCalls: number;
  successRate: number;
  totalDurationSeconds: number;
  avgDurationSeconds: number;
  totalCost: number;
  avgCost: number;
  efficiency: number;
}

type SortKey = keyof AgentStats;
type SortDirection = 'asc' | 'desc';

const COLORS = {
  charcoal: '#2C3E50',
  slate: '#34495E',
  red: '#E74C3C',
  green: '#27AE60',
  amber: '#F39C12',
  blue: '#3498DB',
  background: '#FEFEFE'
};

const AgentPerformanceComparison: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [callData, setCallData] = useState<CallData[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<SortKey>('totalCalls');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [loadedCalls, setLoadedCalls] = useState(0);
  const [batchCount, setBatchCount] = useState(0);
  const [timeGrouping, setTimeGrouping] = useState<'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch call history with pagination to bypass 1000-row limit
        const pageSize = 1000;
        let from = 0;
        let to = pageSize - 1;
        let allCalls: CallData[] = [];
        let batches = 0;

        while (true) {
          const { data: page, error: pageError } = await supabase
            .from('call_history')
            .select('agent_id, call_date, duration_seconds, call_status, cost_usd')
            .eq('user_id', user.id)
            .not('agent_id', 'is', null)
            .order('call_date', { ascending: false })
            .range(from, to);

          if (pageError) throw pageError;
          allCalls = allCalls.concat(page || []);
          batches++;
          if (!page || page.length < pageSize) break;
          from += pageSize;
          to += pageSize;
        }

        setLoadedCalls(allCalls.length);
        setBatchCount(batches);

        

        // Fetch agent names
        const { data: agents, error: agentsError } = await supabase
          .from('kalina_agents')
          .select('agent_id, name')
          .eq('user_id', user.id);

        if (agentsError) throw agentsError;

        const namesMap: Record<string, string> = {};
        agents?.forEach(agent => {
          if (agent.agent_id) {
            namesMap[agent.agent_id] = agent.name || agent.agent_id.slice(0, 8);
          }
        });

        setCallData(allCalls || []);
        setAgentNames(namesMap);
      } catch (error) {
        console.error('Error fetching agent performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate agent statistics
  const agentStats: AgentStats[] = useMemo(() => {
    const statsMap: Record<string, AgentStats> = {};

    callData.forEach(call => {
      if (!call.agent_id) return;

      if (!statsMap[call.agent_id]) {
        statsMap[call.agent_id] = {
          agentId: call.agent_id,
          agentName: agentNames[call.agent_id] || call.agent_id.slice(0, 8),
          totalCalls: 0,
          successRate: 0,
          totalDurationSeconds: 0,
          avgDurationSeconds: 0,
          totalCost: 0,
          avgCost: 0,
          efficiency: 0
        };
      }

      const stats = statsMap[call.agent_id];
      stats.totalCalls++;
      
      if (call.call_status === 'done') {
        stats.successRate++;
      }

      stats.totalDurationSeconds += call.duration_seconds || 0;
      // Calculate cost from duration at $0.15/minute
      const calculatedCost = ((call.duration_seconds || 0) / 60) * 0.15;
      stats.totalCost += calculatedCost;
    });

    // Calculate derived metrics
    return Object.values(statsMap).map(stats => {
      stats.successRate = stats.totalCalls > 0 ? (stats.successRate / stats.totalCalls) * 100 : 0;
      stats.avgDurationSeconds = stats.totalCalls > 0 ? stats.totalDurationSeconds / stats.totalCalls : 0;
      stats.avgCost = stats.totalCalls > 0 ? stats.totalCost / stats.totalCalls : 0;
      stats.efficiency = stats.totalCost > 0 ? stats.totalDurationSeconds / stats.totalCost : 0;
      return stats;
    });
  }, [callData, agentNames]);

  // Sorting function
  const sortedStats = useMemo(() => {
    const sorted = [...agentStats].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return sortDirection === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return sorted;
  }, [agentStats, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Agent',
      'Total Apeluri',
      'Rata Succes (%)',
      'Timp Total (secunde)',
      'Timp Total (formatat)',
      'Durată Medie (secunde)',
      'Cost Total (USD)',
      'Cost Mediu (USD)',
      'Eficiență (sec/USD)'
    ];

    const rows = sortedStats.map(stats => [
      stats.agentName,
      stats.totalCalls.toString(),
      stats.successRate.toFixed(1),
      stats.totalDurationSeconds.toString(),
      formatTime(stats.totalDurationSeconds),
      stats.avgDurationSeconds.toFixed(0),
      stats.totalCost.toFixed(2),
      stats.avgCost.toFixed(3),
      stats.efficiency.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `statistici-agenti-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data
  const successRateData = useMemo(() => 
    sortedStats.slice(0, 10).map(s => ({ 
      name: s.agentName.slice(0, 15), 
      rate: Number(s.successRate.toFixed(1)) 
    })),
    [sortedStats]
  );

  const callVolumeData = useMemo(() => 
    sortedStats.slice(0, 10).map(s => ({ 
      name: s.agentName.slice(0, 15), 
      calls: s.totalCalls 
    })),
    [sortedStats]
  );

  const avgDurationData = useMemo(() => 
    sortedStats.slice(0, 10).map(s => ({ 
      name: s.agentName.slice(0, 15), 
      duration: Number(s.avgDurationSeconds.toFixed(0)) 
    })),
    [sortedStats]
  );

  const costEfficiencyData = useMemo(() => 
    sortedStats.slice(0, 10).map(s => ({ 
      name: s.agentName.slice(0, 15),
      avgCost: Number(s.avgCost.toFixed(3)),
      avgDuration: Number(s.avgDurationSeconds.toFixed(0))
    })),
    [sortedStats]
  );

  // Time evolution data
  const timeEvolutionData = useMemo(() => {
    if (callData.length === 0) return [];

    const timeSeriesMap: Record<string, Record<string, { calls: number; successfulCalls: number; totalCost: number }>> = {};

    callData.forEach(call => {
      if (!call.agent_id || !call.call_date) return;

      const date = new Date(call.call_date);
      let periodKey: string;

      if (timeGrouping === 'monthly') {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // Weekly grouping
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const weekNumber = Math.ceil((((date.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
        periodKey = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      }

      const agentName = agentNames[call.agent_id] || call.agent_id.slice(0, 8);

      if (!timeSeriesMap[periodKey]) {
        timeSeriesMap[periodKey] = {};
      }

      if (!timeSeriesMap[periodKey][agentName]) {
        timeSeriesMap[periodKey][agentName] = { calls: 0, successfulCalls: 0, totalCost: 0 };
      }

      timeSeriesMap[periodKey][agentName].calls++;
      if (call.call_status === 'done') {
        timeSeriesMap[periodKey][agentName].successfulCalls++;
      }
      // Calculate cost from duration at $0.15/minute
      const calculatedCost = ((call.duration_seconds || 0) / 60) * 0.15;
      timeSeriesMap[periodKey][agentName].totalCost += calculatedCost;
    });

    // Convert to array format for recharts
    const periods = Object.keys(timeSeriesMap).sort();
    const agents = sortedStats.slice(0, 5).map(s => s.agentName); // Top 5 agents

    return periods.map(period => {
      const dataPoint: any = { period };
      agents.forEach(agentName => {
        const agentData = timeSeriesMap[period][agentName] || { calls: 0, successfulCalls: 0, totalCost: 0 };
        dataPoint[agentName] = agentData.calls;
      });
      return dataPoint;
    });
  }, [callData, agentNames, sortedStats, timeGrouping]);

  const CustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 5} fill={COLORS.slate} textAnchor="middle" fontSize={10}>
        {value}
      </text>
    );
  };

  const CustomPercentLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 5} fill={COLORS.slate} textAnchor="middle" fontSize={10}>
        {value > 0 ? `${value}%` : ''}
      </text>
    );
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (agentStats.length === 0) {
    return (
      <Card className="w-full" style={{ backgroundColor: COLORS.background }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg" style={{ color: COLORS.slate }}>
            <TrendingUp className="h-5 w-5" />
            {t('agentComparison.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-gray-600">{t('agentComparison.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" style={{ backgroundColor: COLORS.background }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg" style={{ color: COLORS.slate }}>
            <TrendingUp className="h-5 w-5" />
            {t('agentComparison.title')}
          </CardTitle>
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('agentComparison.exportCSV')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th 
                  className="text-left p-3 font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('agentName')}
                  style={{ color: COLORS.slate }}
                >
                  <div className="flex items-center gap-2">
                    {t('agentComparison.agent')}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('totalCalls')}
                  style={{ color: COLORS.slate }}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('agentComparison.calls')}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('successRate')}
                  style={{ color: COLORS.slate }}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('agentComparison.successRate')}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('totalDurationSeconds')}
                  style={{ color: COLORS.slate }}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('agentComparison.totalTime')}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('avgDurationSeconds')}
                  style={{ color: COLORS.slate }}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('agentComparison.avgDuration')}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('totalCost')}
                  style={{ color: COLORS.slate }}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('agentComparison.totalCost')}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="text-right p-3 font-medium cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('avgCost')}
                  style={{ color: COLORS.slate }}
                >
                  <div className="flex items-center justify-end gap-2">
                    {t('agentComparison.avgCost')}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((stats, index) => (
                <tr 
                  key={stats.agentId} 
                  className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                >
                  <td className="p-3 font-medium" style={{ color: COLORS.charcoal }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${getAvatarBackground()}`}>
                        <img 
                          src={getAgentAvatarUrl(stats.agentName)} 
                          alt={stats.agentName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="truncate">{stats.agentName}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold" style={{ color: COLORS.charcoal }}>
                    {stats.totalCalls}
                  </td>
                  <td className="p-3 text-right font-bold" style={{ 
                    color: stats.successRate >= 50 ? COLORS.green : COLORS.red 
                  }}>
                    {stats.successRate.toFixed(1)}%
                  </td>
                  <td className="p-3 text-right" style={{ color: COLORS.slate }}>
                    {formatTime(stats.totalDurationSeconds)}
                  </td>
                  <td className="p-3 text-right" style={{ color: COLORS.slate }}>
                    {stats.avgDurationSeconds.toFixed(0)}s
                  </td>
                  <td className="p-3 text-right font-bold" style={{ color: COLORS.charcoal }}>
                    ${stats.totalCost.toFixed(2)}
                  </td>
                  <td className="p-3 text-right" style={{ color: COLORS.amber }}>
                    ${stats.avgCost.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Load Info */}
        <div className="text-center text-sm mt-4" style={{ color: COLORS.slate }}>
          Încărcate <span className="font-semibold">{loadedCalls.toLocaleString()}</span> apeluri în <span className="font-semibold">{batchCount}</span> {batchCount === 1 ? 'lot' : 'loturi'}
        </div>

        {/* Time Evolution Chart */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium" style={{ color: COLORS.slate }}>
              Evoluție în Timp (Top 5 Agenți)
            </h3>
            <Tabs value={timeGrouping} onValueChange={(v) => setTimeGrouping(v as 'weekly' | 'monthly')}>
              <TabsList>
                <TabsTrigger value="weekly">Săptămânal</TabsTrigger>
                <TabsTrigger value="monthly">Lunar</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timeEvolutionData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
              <XAxis 
                dataKey="period" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'Număr Apeluri', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '4px' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              {sortedStats.slice(0, 5).map((agent, index) => (
                <Line 
                  key={agent.agentId}
                  type="monotone" 
                  dataKey={agent.agentName} 
                  stroke={[COLORS.charcoal, COLORS.blue, COLORS.green, COLORS.amber, COLORS.red][index]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          {/* Success Rate Comparison */}
          <div>
            <h3 className="text-center mb-4 text-sm font-medium" style={{ color: COLORS.slate }}>
              Rata de Succes (%)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={successRateData} margin={{ top: 20, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="rate" fill={COLORS.green} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="rate" content={<CustomPercentLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Call Volume */}
          <div>
            <h3 className="text-center mb-4 text-sm font-medium" style={{ color: COLORS.slate }}>
              Volum Apeluri
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={callVolumeData} margin={{ top: 20, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="calls" fill={COLORS.charcoal} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="calls" content={<CustomLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Average Duration */}
          <div>
            <h3 className="text-center mb-4 text-sm font-medium" style={{ color: COLORS.slate }}>
              Durată Medie (secunde)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={avgDurationData} margin={{ top: 20, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="duration" fill={COLORS.blue} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="duration" content={<CustomLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost Efficiency Scatter */}
          <div>
            <h3 className="text-center mb-4 text-sm font-medium" style={{ color: COLORS.slate }}>
              Eficiență Cost vs Durată
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
                <XAxis 
                  type="number" 
                  dataKey="avgCost" 
                  name="Cost Mediu"
                  label={{ value: 'Cost Mediu (USD)', position: 'insideBottom', offset: -5, style: { fontSize: 10 } }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="avgDuration" 
                  name="Durată Medie"
                  label={{ value: 'Durată (s)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm text-xs">
                          <p className="font-semibold">{data.name}</p>
                          <p>Cost Mediu: ${data.avgCost.toFixed(3)}</p>
                          <p>Durată Medie: {data.avgDuration}s</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={costEfficiencyData} fill={COLORS.amber}>
                  {costEfficiencyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={[COLORS.amber, COLORS.green, COLORS.blue, COLORS.red][index % 4]} 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentPerformanceComparison;
