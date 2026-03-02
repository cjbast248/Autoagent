import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import DetailedReportModal from './DetailedReportModal';
import GlowCard from './GlowCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface AnalyticsData {
  call_date?: string;
  created_at?: string;
  duration_seconds?: number;
  call_status?: string;
}

interface MinutesChartProps {
  title: string;
  value: string; // Total all-time (for reference)
  analyticsData: AnalyticsData[];
  onViewReport?: () => void;
  isLoading?: boolean;
}

type Period = '7d' | '30d';

const MinutesChart: React.FC<MinutesChartProps> = ({
  title,
  value,
  analyticsData,
  onViewReport,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>('30d');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate ALL-TIME stats first
  const allTimeStats = useMemo(() => {
    const data = analyticsData || [];
    const totalCalls = data.length;
    const totalSeconds = data.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    let formattedTime = '';
    if (hours > 0) {
      formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return {
      totalCalls,
      totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      formattedTime,
      avgCallDuration: totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0
    };
  }, [analyticsData]);

  // Calculate chart data AND period totals
  const { chartData, periodStats } = useMemo(() => {
    const days = period === '7d' ? 7 : 30;
    const result = [];
    let totalSeconds = 0;
    let totalCalls = 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayNum = date.getDate();
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Filter calls for this day using both call_date and created_at
      const dayCalls = (analyticsData || []).filter(c => {
        const callDateStr = c.call_date || c.created_at;
        if (!callDateStr) return false;
        return callDateStr.startsWith(dateStr);
      });
      
      // Calculate seconds for this day
      const daySeconds = dayCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
      const dayMinutes = daySeconds / 60;
      
      // Count calls
      const callCount = dayCalls.length;
      
      // Add to totals
      totalSeconds += daySeconds;
      totalCalls += callCount;
      
      result.push({
        name: dayNum.toString().padStart(2, '0'),
        minute: Math.round(dayMinutes * 10) / 10, // Round to 1 decimal
        apeluri: callCount,
      });
    }
    
    // Format period total time
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    let formattedTime = '';
    if (hours > 0) {
      formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    const totalMinutes = Math.round(totalSeconds / 60);
    
    return {
      chartData: result,
      periodStats: {
        formattedTime,
        totalSeconds,
        totalMinutes,
        totalCalls,
        avgCallDuration: totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0
      }
    };
  }, [analyticsData, period]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const minutes = payload[0]?.value || 0;
      const calls = payload[1]?.value || 0;
      
      return (
        <div 
          className="px-4 py-3 rounded-xl shadow-2xl border border-white/10"
          style={{ 
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          }}
        >
          <div className="text-white/60 text-xs mb-2">{t('dashboard.day')} {label}</div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-red-700 to-red-500"></div>
              <div>
                <div className="text-white font-bold text-lg">{minutes.toFixed(1)}</div>
                <div className="text-white/50 text-xs">{t('dashboard.minutes')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-gray-800 to-gray-600"></div>
              <div>
                <div className="text-white font-bold text-lg">{calls}</div>
                <div className="text-white/50 text-xs">{t('dashboard.calls')}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
    <GlowCard>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center bg-gray-100 rounded-full p-0.5">
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                period === '7d'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('dashboard.days7')}
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                period === '30d'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('dashboard.days30')}
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
          >
            {t('dashboard.viewReport')}
          </button>
        </div>
      </div>

      {/* Value - Clean stats display */}
      <div className="mb-5">
        {/* Main time display */}
        <div className="flex items-baseline gap-2 mb-4">
          {isLoading ? (
            <div className="h-10 bg-gray-200 rounded w-28 animate-pulse" />
          ) : (
            <span className="text-4xl font-bold text-gray-900 tracking-tight">{allTimeStats.formattedTime}</span>
          )}
        </div>

        {/* All stats in one elegant row */}
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
            boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-4 w-full">
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
            </div>
          ) : (
            <>
              {/* Left side - Total stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-gray-900">{allTimeStats.totalMinutes}</span>
                  <span className="text-xs text-gray-400">min</span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-gray-900">{allTimeStats.totalCalls}</span>
                  <span className="text-xs text-gray-400">{t('dashboard.calls')}</span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">~</span>
                  <span className="text-sm font-bold text-gray-900">{Math.round(allTimeStats.avgCallDuration / 60)}:{(allTimeStats.avgCallDuration % 60).toString().padStart(2, '0')}</span>
                  <span className="text-xs text-gray-400">/{t('dashboard.perCall')}</span>
                </div>
              </div>

              {/* Right side - Period stats */}
              {periodStats.totalCalls > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-px h-4 bg-gray-200"></div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-50">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    </div>
                    <span className="text-xs text-gray-500">{period === '7d' ? '7z' : '30z'}:</span>
                    <span className="text-sm font-bold text-red-600">{periodStats.totalCalls}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-sm font-bold text-red-600">{periodStats.formattedTime}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chart - cu efect de scufundare și linii curbe ca semnal */}
      <div
        className="h-44 rounded-xl p-3"
        style={{
          background: 'linear-gradient(145deg, #f5f5f5, #ffffff)',
          boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.08), inset -2px -2px 6px rgba(255,255,255,0.9)',
        }}
      >
        {isLoading ? (
          <div className="h-full w-full bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="minuteGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#DC2626" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111827" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#111827" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#111827" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="minuteLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="50%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#B91C1C" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 10 }}
                interval={period === '30d' ? 4 : 0}
              />
              <YAxis hide />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#DC2626', strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.3 }}
              />
              <Area
                type="monotone"
                dataKey="apeluri"
                stroke="#374151"
                strokeWidth={2}
                fill="url(#callsGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#111827', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="minute"
                stroke="url(#minuteLineGradient)"
                strokeWidth={2.5}
                fill="url(#minuteGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#DC2626', stroke: '#fff', strokeWidth: 2, filter: 'url(#glow)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 rounded-full bg-gradient-to-r from-red-400 via-red-600 to-red-800"></div>
            <span className="text-xs text-gray-600">{t('reports.minutesSpoken')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 rounded-full bg-gray-700"></div>
            <span className="text-xs text-gray-600">{t('reports.callCount')}</span>
          </div>
        </div>
      </div>
    </GlowCard>

    {/* Detailed Report Modal */}
    <DetailedReportModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title={t('reports.detailedMinutesReport')}
      callHistory={analyticsData.map(c => ({
        call_date: c.call_date || c.created_at || '',
        duration_seconds: c.duration_seconds
      }))}
    />
    </>
  );
};

export default MinutesChart;
