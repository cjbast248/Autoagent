import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface CallData {
  call_date: string;
  duration_seconds?: number;
}

interface DetailedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  callHistory: CallData[];
}

type Period = 'day' | 'week' | 'month' | 'year';
type ChartType = 'bar' | 'line' | 'area';

const DetailedReportModal: React.FC<DetailedReportModalProps> = ({
  isOpen,
  onClose,
  title,
  callHistory,
}) => {
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<Period>('week');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [offset, setOffset] = useState(0);

  const periodConfig = {
    day: { label: t('reports.day'), days: 1, format: 'hour', intervals: 24 },
    week: { label: t('reports.week'), days: 7, format: 'day', intervals: 7 },
    month: { label: t('reports.month'), days: 30, format: 'day', intervals: 30 },
    year: { label: t('reports.year'), days: 365, format: 'month', intervals: 12 },
  };

  const getLocale = () => {
    switch (language) {
      case 'ru': return 'ru-RU';
      case 'en': return 'en-US';
      default: return 'ro-RO';
    }
  };

  const { chartData, periodLabel } = useMemo(() => {
    const config = periodConfig[period];
    const result = [];
    const locale = getLocale();
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (offset * config.days));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - config.days + 1);

    const formatDate = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const periodLabelText = period === 'day' 
      ? endDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
      : `${formatDate(startDate)} - ${formatDate(endDate)}`;

    if (period === 'day') {
      for (let hour = 0; hour < 24; hour++) {
        const hourCalls = (callHistory || []).filter(c => {
          const callDate = new Date(c.call_date);
          return callDate.toDateString() === endDate.toDateString() && callDate.getHours() === hour;
        });
        
        const minutes = hourCalls.reduce((sum, c) => sum + (c.duration_seconds || 0) / 60, 0);
        const calls = hourCalls.length;
        
        result.push({
          name: `${hour.toString().padStart(2, '0')}:00`,
          minute: Math.round(minutes * 10) / 10,
          apeluri: calls,
        });
      }
    } else if (period === 'year') {
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(endDate);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthCalls = (callHistory || []).filter(c => {
          const callDate = new Date(c.call_date);
          return callDate >= monthStart && callDate <= monthEnd;
        });
        
        const minutes = monthCalls.reduce((sum, c) => sum + (c.duration_seconds || 0) / 60, 0);
        const calls = monthCalls.length;
        
        result.push({
          name: monthDate.toLocaleDateString(locale, { month: 'short' }),
          minute: Math.round(minutes * 10) / 10,
          apeluri: calls,
        });
      }
    } else {
      for (let i = config.days - 1; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        
        const dayCalls = (callHistory || []).filter(c => {
          const callDate = new Date(c.call_date);
          return callDate.toDateString() === date.toDateString();
        });
        
        const minutes = dayCalls.reduce((sum, c) => sum + (c.duration_seconds || 0) / 60, 0);
        const calls = dayCalls.length;
        
        result.push({
          name: period === 'week' 
            ? date.toLocaleDateString(locale, { weekday: 'short' })
            : date.getDate().toString(),
          minute: Math.round(minutes * 10) / 10,
          apeluri: calls,
          fullDate: date.toLocaleDateString(locale),
        });
      }
    }

    return { chartData: result, periodLabel: periodLabelText };
  }, [callHistory, period, offset]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-xl">
          <div className="font-medium text-gray-900 mb-2">{payload[0]?.payload?.fullDate || label}</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
              <span className="text-gray-600 text-sm">{t('reports.minutes')}:</span>
              <span className="font-semibold text-gray-900">{payload[0]?.value}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-900"></div>
              <span className="text-gray-600 text-sm">{t('reports.calls')}:</span>
              <span className="font-semibold text-gray-900">{payload[1]?.value}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-gray-900/60 to-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-red-600 via-gray-900 to-black p-[1px] rounded-t-[32px]">
          <div className="bg-white rounded-t-[31px] px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-gray-500 mt-1">{periodLabel}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1.5">
            {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setOffset(0); }}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  period === p 
                    ? 'bg-white text-gray-900 shadow-md' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {periodConfig[p].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Time Navigation */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setOffset(o => o + 1)}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setOffset(0)}
                disabled={offset === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-40"
              >
                {t('reports.today')}
              </button>
              <button
                onClick={() => setOffset(o => Math.max(0, o - 1))}
                disabled={offset === 0}
                className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Chart Type */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              {(['bar', 'line', 'area'] as ChartType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    chartType === type 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {type === 'bar' ? t('reports.bars') : type === 'line' ? t('reports.line') : t('reports.area')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-8 py-6">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(220, 38, 38, 0.05)' }} />
                  <Bar dataKey="minute" fill="url(#gradientRed)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="apeluri" fill="url(#gradientBlack)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  <defs>
                    <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                    <linearGradient id="gradientBlack" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#374151" />
                      <stop offset="100%" stopColor="#111111" />
                    </linearGradient>
                  </defs>
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="minute" 
                    stroke="url(#lineGradientRed)" 
                    strokeWidth={3} 
                    dot={{ fill: '#DC2626', strokeWidth: 0, r: 5 }}
                    activeDot={{ r: 7, fill: '#DC2626', stroke: '#fff', strokeWidth: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="apeluri" 
                    stroke="url(#lineGradientBlack)" 
                    strokeWidth={2} 
                    dot={{ fill: '#111111', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#111111', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <defs>
                    <linearGradient id="lineGradientRed" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#DC2626" />
                      <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                    <linearGradient id="lineGradientBlack" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#111111" />
                      <stop offset="100%" stopColor="#374151" />
                    </linearGradient>
                  </defs>
                </LineChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <defs>
                    <linearGradient id="areaGradientRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DC2626" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#DC2626" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="areaGradientBlack" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111111" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#111111" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="minute" 
                    fill="url(#areaGradientRed)" 
                    stroke="#DC2626" 
                    strokeWidth={2.5}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="apeluri" 
                    fill="url(#areaGradientBlack)" 
                    stroke="#111111" 
                    strokeWidth={2}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-10 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-600"></div>
              <span className="text-sm font-medium text-gray-700">{t('reports.minutesSpoken')}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-900"></div>
              <span className="text-sm font-medium text-gray-700">{t('reports.callCount')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedReportModal;
