import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
interface CallData {
  call_date: string;
  duration_seconds: number | null;
  call_status: string;
  cost_usd: number | null;
  agent_id: string | null;
  contact_name: string | null;
}
const COLORS = {
  charcoal: '#2C3E50',
  slate: '#34495E',
  red: '#E74C3C',
  green: '#27AE60',
  amber: '#F39C12',
  blue: '#3498DB',
  background: '#FEFEFE'
};
const HourlyCallPatterns: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [callData, setCallData] = useState<CallData[]>([]);
  useEffect(() => {
    const fetchCallData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('call_history').select('call_date, duration_seconds, call_status, cost_usd, agent_id, contact_name').eq('user_id', user.id).order('call_date', {
          ascending: false
        }).limit(10000);
        if (error) throw error;
        setCallData(data || []);
      } catch (error) {
        console.error('Error fetching call data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCallData();
  }, [user]);

  // Process data for hourly volume chart
  const hourlyVolumeData = useMemo(() => {
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;
    callData.forEach(call => {
      if (call.call_date) {
        const hour = new Date(call.call_date).getHours();
        hourCounts[hour]++;
      }
    });
    return Object.entries(hourCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      calls: count
    }));
  }, [callData]);

  // Process data for hourly success rate chart
  const hourlySuccessData = useMemo(() => {
    const hourStats: Record<number, {
      total: number;
      success: number;
    }> = {};
    for (let i = 0; i < 24; i++) hourStats[i] = {
      total: 0,
      success: 0
    };
    callData.forEach(call => {
      if (call.call_date) {
        const hour = new Date(call.call_date).getHours();
        hourStats[hour].total++;
        if (call.call_status === 'done') {
          hourStats[hour].success++;
        }
      }
    });
    return Object.entries(hourStats).map(([hour, stats]) => ({
      hour: parseInt(hour),
      rate: stats.total > 0 ? stats.success / stats.total * 100 : 0
    }));
  }, [callData]);

  // Process data for duration distribution
  const durationDistribution = useMemo(() => {
    const categories = {
      '0-10s': 0,
      '10-30s': 0,
      '30s-1m': 0,
      '1-2m': 0,
      '2-5m': 0,
      '5m+': 0
    };
    callData.forEach(call => {
      const duration = call.duration_seconds || 0;
      if (duration <= 10) categories['0-10s']++;else if (duration <= 30) categories['10-30s']++;else if (duration <= 60) categories['30s-1m']++;else if (duration <= 120) categories['1-2m']++;else if (duration <= 300) categories['2-5m']++;else categories['5m+']++;
    });
    return Object.entries(categories).map(([category, count]) => ({
      category,
      count
    }));
  }, [callData]);

  // Process data for cost vs duration efficiency
  const costEfficiencyData = useMemo(() => {
    const agentStats: Record<string, {
      totalCost: number;
      totalDuration: number;
      count: number;
      name: string;
    }> = {};
    callData.forEach(call => {
      if (call.agent_id && call.duration_seconds && call.cost_usd) {
        if (!agentStats[call.agent_id]) {
          agentStats[call.agent_id] = {
            totalCost: 0,
            totalDuration: 0,
            count: 0,
            name: call.contact_name || call.agent_id.slice(0, 8)
          };
        }
        agentStats[call.agent_id].totalCost += call.cost_usd;
        agentStats[call.agent_id].totalDuration += call.duration_seconds;
        agentStats[call.agent_id].count++;
      }
    });
    return Object.entries(agentStats).map(([id, stats]) => ({
      name: stats.name,
      avgCost: stats.count > 0 ? stats.totalCost / stats.count : 0,
      avgDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0
    })).slice(0, 10); // Top 10 agents
  }, [callData]);
  const CustomLabel = (props: any) => {
    const {
      x,
      y,
      width,
      value
    } = props;
    return <text x={x + width / 2} y={y - 5} fill={COLORS.slate} textAnchor="middle" fontSize={10} fontFamily="sans-serif">
        {value}
      </text>;
  };
  const CustomPercentLabel = (props: any) => {
    const {
      x,
      y,
      width,
      value
    } = props;
    return <text x={x + width / 2} y={y - 5} fill={COLORS.slate} textAnchor="middle" fontSize={10} fontFamily="sans-serif">
        {value > 0 ? `${value.toFixed(1)}%` : ''}
      </text>;
  };
  if (loading) {
    return <Card className="w-full">
        <CardContent className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </CardContent>
      </Card>;
  }
  return <Card className="w-full" style={{
    backgroundColor: COLORS.background
  }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg" style={{
      color: COLORS.slate
    }}>
          <Clock className="h-5 w-5" />
          {t('hourlyPatterns.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Hourly Call Volume */}
          <div>
            <h3 className="text-center mb-4 text-sm font-medium" style={{
            color: COLORS.slate
          }}>
              {t('hourlyPatterns.callVolumeByHour')}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyVolumeData} margin={{
              top: 20,
              right: 10,
              left: 0,
              bottom: 20
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
                <XAxis dataKey="hour" label={{
                value: t('hourlyPatterns.hourOfDay'),
                position: 'insideBottom',
                offset: -10,
                style: {
                  fontSize: 11
                }
              }} tick={{
                fontSize: 10
              }} interval={1} />
                <YAxis label={{
                value: t('hourlyPatterns.numberOfCalls'),
                angle: -90,
                position: 'insideLeft',
                style: {
                  fontSize: 11
                }
              }} tick={{
                fontSize: 10
              }} />
                <Tooltip />
                <Bar dataKey="calls" fill={COLORS.charcoal} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="calls" content={<CustomLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Success Rate */}
          <div>
            <h3 className="text-center mb-4 text-sm font-medium" style={{
            color: COLORS.slate
          }}>
              {t('hourlyPatterns.successRateByHour')}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlySuccessData} margin={{
              top: 20,
              right: 10,
              left: 0,
              bottom: 20
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
                <XAxis dataKey="hour" label={{
                value: t('hourlyPatterns.hourOfDay'),
                position: 'insideBottom',
                offset: -10,
                style: {
                  fontSize: 11
                }
              }} tick={{
                fontSize: 10
              }} interval={1} />
                <YAxis label={{
                value: t('hourlyPatterns.successRatePercent'),
                angle: -90,
                position: 'insideLeft',
                style: {
                  fontSize: 11
                }
              }} tick={{
                fontSize: 10
              }} />
                <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                <Bar dataKey="rate" fill={COLORS.green} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="rate" content={<CustomPercentLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Call Duration Distribution */}
          <div>
            <h3 className="text-center mb-4 text-sm font-medium" style={{
            color: COLORS.slate
          }}>
              {t('hourlyPatterns.durationDistribution')}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={durationDistribution} margin={{
              top: 20,
              right: 10,
              left: 0,
              bottom: 40
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={60} label={{
                value: t('hourlyPatterns.durationCategory'),
                position: 'insideBottom',
                offset: -35,
                style: {
                  fontSize: 11
                }
              }} tick={{
                fontSize: 10
              }} />
                <YAxis label={{
                value: t('hourlyPatterns.numberOfCalls'),
                angle: -90,
                position: 'insideLeft',
                style: {
                  fontSize: 11
                }
              }} tick={{
                fontSize: 10
              }} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.blue} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" content={<CustomLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost vs Duration Efficiency */}
          <div>
            <h3 className="text-center mb-4 text-sm font-medium" style={{
            color: COLORS.slate
          }}>
              {t('hourlyPatterns.costEfficiency')}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{
              top: 20,
              right: 20,
              left: 0,
              bottom: 20
            }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.3} />
                <XAxis type="number" dataKey="avgCost" name="Avg Cost" label={{
                value: t('hourlyPatterns.avgCostPerCall'),
                position: 'insideBottom',
                offset: -10,
                style: {
                  fontSize: 11
                }
              }} tick={{
                fontSize: 10
              }} />
                <YAxis type="number" dataKey="avgDuration" name="Avg Duration" label={{
                value: t('hourlyPatterns.avgDurationSeconds'),
                angle: -90,
                position: 'insideLeft',
                style: {
                  fontSize: 11
                }
              }} tick={{
                fontSize: 10
              }} />
                <Tooltip cursor={{
                strokeDasharray: '3 3'
              }} content={({
                active,
                payload
              }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return <div className="bg-white p-2 border border-gray-200 rounded shadow-sm text-xs">
                          <p className="font-semibold">{data.name}</p>
                          <p>Avg Cost: ${data.avgCost.toFixed(2)}</p>
                          <p>Avg Duration: {data.avgDuration.toFixed(0)}s</p>
                        </div>;
                }
                return null;
              }} />
                <Scatter data={costEfficiencyData} fill={COLORS.amber}>
                  {costEfficiencyData.map((entry, index) => <Cell key={`cell-${index}`} fill={[COLORS.amber, COLORS.green, COLORS.blue, COLORS.red][index % 4]} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>;
};
export default HourlyCallPatterns;