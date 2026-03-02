import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Clock, TrendingUp, Zap, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface CallData {
  call_date: string;
  call_status: string;
}

interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
  successRate: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const COLORS = {
  charcoal: '#2C3E50',
  slate: '#34495E',
  red: '#E74C3C',
  green: '#27AE60',
  amber: '#F39C12',
  blue: '#3498DB',
  background: '#FFFFFF',
  lightGray: '#F7F8FA',
  veryLightGray: '#FAFBFC',
  borderGray: '#E5E7EB'
};

const CallActivityHeatmap: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [callData, setCallData] = useState<CallData[]>([]);
  const [viewMode, setViewMode] = useState<'count' | 'success'>('count');

  // Translated days
  const DAYS = [
    t('calendar.days.monday'),
    t('calendar.days.tuesday'),
    t('calendar.days.wednesday'),
    t('calendar.days.thursday'),
    t('calendar.days.friday'),
    t('calendar.days.saturday'),
    t('calendar.days.sunday')
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch call history with pagination
        const pageSize = 1000;
        let from = 0;
        let to = pageSize - 1;
        let allCalls: CallData[] = [];

        while (true) {
          const { data: page, error: pageError } = await supabase
            .from('call_history')
            .select('call_date, call_status')
            .eq('user_id', user.id)
            .not('call_date', 'is', null)
            .order('call_date', { ascending: false })
            .range(from, to);

          if (pageError) throw pageError;
          allCalls = allCalls.concat(page || []);
          if (!page || page.length < pageSize) break;
          from += pageSize;
          to += pageSize;
        }

        setCallData(allCalls);
      } catch (error) {
        console.error('Error fetching call activity data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    const dataMap = new Map<string, { count: number; successful: number }>();

    callData.forEach(call => {
      const date = new Date(call.call_date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const hour = date.getHours();
      
      // Convert Sunday (0) to 6, and shift others down by 1 to make Monday = 0
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const key = `${adjustedDay}-${hour}`;
      const existing = dataMap.get(key) || { count: 0, successful: 0 };
      
      existing.count++;
      if (call.call_status === 'done') {
        existing.successful++;
      }
      
      dataMap.set(key, existing);
    });

    // Convert to array format
    const heatmapCells: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const data = dataMap.get(key) || { count: 0, successful: 0 };
        heatmapCells.push({
          day,
          hour,
          count: data.count,
          successRate: data.count > 0 ? (data.successful / data.count) * 100 : 0
        });
      }
    }

    return heatmapCells;
  }, [callData]);

  // Find max values for normalization
  const maxCount = useMemo(() => Math.max(...heatmapData.map(cell => cell.count), 1), [heatmapData]);
  const maxSuccessRate = useMemo(() => Math.max(...heatmapData.map(cell => cell.successRate), 1), [heatmapData]);

  // Get color based on intensity
  const getCellColor = (cell: HeatmapCell) => {
    if (cell.count === 0) return COLORS.veryLightGray;
    
    if (viewMode === 'count') {
      const intensity = cell.count / maxCount;
      if (intensity > 0.75) return COLORS.charcoal;
      if (intensity > 0.5) return COLORS.slate;
      if (intensity > 0.25) return COLORS.blue;
      return COLORS.lightGray;
    } else {
      const rate = cell.successRate;
      if (rate >= 75) return COLORS.green;
      if (rate >= 50) return COLORS.blue;
      if (rate >= 25) return COLORS.amber;
      return COLORS.red;
    }
  };

  // Get tooltip text
  const getTooltipText = (cell: HeatmapCell) => {
    if (cell.count === 0) return `${DAYS[cell.day]} ${cell.hour}:00\nNu sunt apeluri`;
    
    return `${DAYS[cell.day]} ${cell.hour}:00\nApeluri: ${cell.count}\nRata succes: ${cell.successRate.toFixed(1)}%`;
  };

  // Statistics
  const stats = useMemo(() => {
    const hourStats = new Map<number, number>();
    const dayStats = new Map<number, number>();
    
    heatmapData.forEach(cell => {
      if (cell.count > 0) {
        hourStats.set(cell.hour, (hourStats.get(cell.hour) || 0) + cell.count);
        dayStats.set(cell.day, (dayStats.get(cell.day) || 0) + cell.count);
      }
    });

    const bestHour = Array.from(hourStats.entries()).sort((a, b) => b[1] - a[1])[0];
    const bestDay = Array.from(dayStats.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      bestHour: bestHour ? `${bestHour[0]}:00` : 'N/A',
      bestHourCalls: bestHour ? bestHour[1] : 0,
      bestDay: bestDay ? DAYS[bestDay[0]] : 'N/A',
      bestDayCalls: bestDay ? bestDay[1] : 0
    };
  }, [heatmapData]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (callData.length === 0) {
    return (
      <Card className="w-full" style={{ backgroundColor: COLORS.background }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg" style={{ color: COLORS.slate }}>
            <Clock className="h-5 w-5" />
            {t('heatmap.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-gray-600">{t('heatmap.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" style={{ backgroundColor: COLORS.background }}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2 text-lg" style={{ color: COLORS.slate }}>
            <Clock className="h-5 w-5" />
            {t('heatmap.title')}
          </CardTitle>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'count' | 'success')}>
            <TabsList>
              <TabsTrigger value="count">{t('heatmap.callVolume')}</TabsTrigger>
              <TabsTrigger value="success">{t('heatmap.successRate')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Statistics Cards - Modern Glass Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Best Hour Card */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{t('heatmap.peakHour')}</span>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Zap className="h-3 w-3 mr-1" />
                  Peak
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.bestHour}</p>
              <p className="text-sm text-gray-600">{stats.bestHourCalls.toLocaleString()} {t('heatmap.calls')}</p>
            </div>
          </div>
          
          {/* Best Day Card */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl"></div>
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{t('heatmap.peakDay')}</span>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Best
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.bestDay}</p>
              <p className="text-sm text-gray-600">{stats.bestDayCalls.toLocaleString()} {t('heatmap.calls')}</p>
            </div>
          </div>
        </div>

        {/* Heatmap - Enhanced Design - Full Width */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="w-full overflow-x-auto">
            <div className="min-w-full">
              <div className="flex gap-1">
                {/* Day labels - Fixed alignment */}
                <div className="flex flex-col gap-1 justify-start" style={{ paddingTop: '44px' }}>
                  {DAYS.map((day) => (
                    <div 
                      key={day} 
                      className="h-8 flex items-center justify-end pr-3 text-xs font-semibold text-gray-700"
                      style={{ minWidth: '70px' }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Heatmap grid - Full width */}
                <div className="flex-1 min-w-0">
                  {/* Hour labels - Better spacing */}
                  <div className="flex gap-1 mb-1 h-11">
                    {HOURS.map(hour => (
                      <div 
                        key={hour}
                        className="flex-1 text-center text-xs font-semibold text-gray-700 flex items-end justify-center pb-1"
                      >
                        {hour % 3 === 0 ? `${hour}:00` : ''}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap cells - Fixed alignment */}
                  {DAYS.map((_, dayIdx) => (
                    <div key={dayIdx} className="flex gap-1 mb-1">
                      {HOURS.map(hour => {
                        const cell = heatmapData.find(c => c.day === dayIdx && c.hour === hour);
                        if (!cell) return <div key={`${dayIdx}-${hour}`} className="flex-1 h-8" />;
                        
                        return (
                          <div
                            key={`${dayIdx}-${hour}`}
                            className="group relative flex-1 h-8 rounded-lg cursor-pointer transition-all duration-200 hover:scale-110 hover:z-[100] hover:shadow-lg"
                            style={{ backgroundColor: getCellColor(cell) }}
                          >
                            {/* Tooltip on hover - Fixed positioning */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[200]">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-2xl">
                                <div className="font-semibold">{DAYS[cell.day]} {cell.hour}:00</div>
                                <div className="text-gray-300 mt-1">
                                  {cell.count > 0 ? (
                                    <>
                                      <div>{t('agentComparison.calls')}: {cell.count}</div>
                                      <div>{t('heatmap.successRate')}: {cell.successRate.toFixed(1)}%</div>
                                    </>
                                  ) : (
                                    <div>{t('heatmap.noCalls')}</div>
                                  )}
                                </div>
                                {/* Arrow - centered */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                  <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend - Modern Design */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-4">
          <span className="text-sm font-semibold text-gray-700 mr-2">{t('heatmap.legend')}:</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg border border-gray-200" style={{ backgroundColor: COLORS.veryLightGray }}></div>
            <span className="text-xs font-medium text-gray-600">{t('heatmap.noActivity')}</span>
          </div>
          {viewMode === 'count' ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: COLORS.lightGray }}></div>
                <span className="text-xs font-medium text-gray-600">{t('heatmap.low')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: COLORS.blue }}></div>
                <span className="text-xs font-medium text-gray-600">{t('heatmap.medium')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: COLORS.slate }}></div>
                <span className="text-xs font-medium text-gray-600">{t('heatmap.high')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: COLORS.charcoal }}></div>
                <span className="text-xs font-medium text-gray-600">{t('heatmap.veryHigh')}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: COLORS.red }}></div>
                <span className="text-xs font-medium text-gray-600">&lt;25%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: COLORS.amber }}></div>
                <span className="text-xs font-medium text-gray-600">25-50%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: COLORS.blue }}></div>
                <span className="text-xs font-medium text-gray-600">50-75%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: COLORS.green }}></div>
                <span className="text-xs font-medium text-gray-600">&gt;75%</span>
              </div>
            </>
          )}
        </div>

        {/* Insights - Modern Design */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-lg">{t('heatmap.recommendations')}</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Ziua Optimă</p>
                    <p className="text-sm text-gray-900">
                      Programează în <span className="font-bold text-blue-700">{stats.bestDay}</span> pentru volum maxim
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Ora Optimă</p>
                    <p className="text-sm text-gray-900">
                      Apelează la <span className="font-bold text-blue-700">{stats.bestHour}</span> pentru cele mai bune rezultate
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Eficiență</p>
                    <p className="text-sm text-gray-900">
                      Evită orele cu activitate scăzută pentru productivitate maximă
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CallActivityHeatmap;
