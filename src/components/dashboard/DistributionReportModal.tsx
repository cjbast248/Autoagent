import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface CallData {
  call_date: string;
  duration_seconds?: number;
}

interface DistributionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  callHistory: CallData[];
}

type Period = 'day' | 'week' | 'month' | 'year';
type ViewType = 'donut' | 'bar';

const DistributionReportModal: React.FC<DistributionReportModalProps> = ({
  isOpen,
  onClose,
  title,
  callHistory,
}) => {
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<Period>('week');
  const [viewType, setViewType] = useState<ViewType>('donut');
  const [offset, setOffset] = useState(0);

  const getLocale = () => {
    switch (language) {
      case 'ru': return 'ru-RU';
      case 'en': return 'en-US';
      default: return 'ro-RO';
    }
  };

  const periodConfig = {
    day: { label: t('reports.day'), days: 1 },
    week: { label: t('reports.week'), days: 7 },
    month: { label: t('reports.month'), days: 30 },
    year: { label: t('reports.year'), days: 365 },
  };

  const { chartData, periodLabel, totalCalls } = useMemo(() => {
    const config = periodConfig[period];
    const locale = getLocale();
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (offset * config.days));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - config.days + 1);

    const formatDate = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const periodLabelText = period === 'day' 
      ? endDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
      : `${formatDate(startDate)} - ${formatDate(endDate)}`;

    // Filter calls in period
    const periodCalls = (callHistory || []).filter(c => {
      const callDate = new Date(c.call_date);
      return callDate >= startDate && callDate <= endDate;
    });

    // Categorize by time of day
    const morning = periodCalls.filter(c => {
      const hour = new Date(c.call_date).getHours();
      return hour >= 6 && hour < 12;
    });
    const afternoon = periodCalls.filter(c => {
      const hour = new Date(c.call_date).getHours();
      return hour >= 12 && hour < 18;
    });
    const evening = periodCalls.filter(c => {
      const hour = new Date(c.call_date).getHours();
      return hour >= 18 || hour < 6;
    });

    const total = morning.length + afternoon.length + evening.length || 1;

    const data = [
      { 
        name: t('dashboard.morning'), 
        value: morning.length, 
        color: '#FCA5A5',
        gradient: ['#FCA5A5', '#F87171'],
        percentage: Math.round((morning.length / total) * 100),
        timeRange: '6:00 - 12:00',
        minutes: Math.round(morning.reduce((sum, c) => sum + (c.duration_seconds || 0) / 60, 0)),
      },
      { 
        name: t('dashboard.afternoon'), 
        value: afternoon.length, 
        color: '#DC2626',
        gradient: ['#EF4444', '#DC2626'],
        percentage: Math.round((afternoon.length / total) * 100),
        timeRange: '12:00 - 18:00',
        minutes: Math.round(afternoon.reduce((sum, c) => sum + (c.duration_seconds || 0) / 60, 0)),
      },
      { 
        name: t('dashboard.evening'), 
        value: evening.length, 
        color: '#111827',
        gradient: ['#374151', '#111827'],
        percentage: Math.round((evening.length / total) * 100),
        timeRange: '18:00 - 6:00',
        minutes: Math.round(evening.reduce((sum, c) => sum + (c.duration_seconds || 0) / 60, 0)),
      },
    ];

    return { chartData: data, periodLabel: periodLabelText, totalCalls: total };
  }, [callHistory, period, offset]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-xl">
          <div className="font-semibold text-gray-900 mb-2">{data.name}</div>
          <div className="text-sm text-gray-500 mb-2">{data.timeRange}</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">{t('reports.calls')}:</span>
              <span className="font-bold text-gray-900">{data.value}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">{t('reports.minutes')}:</span>
              <span className="font-bold text-gray-900">{data.minutes}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">{t('reports.percent')}:</span>
              <span className="font-bold text-gray-900">{data.percentage}%</span>
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

            {/* View Type */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewType('donut')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  viewType === 'donut' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('reports.circle')}
              </button>
              <button
                onClick={() => setViewType('bar')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  viewType === 'bar' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('reports.bars')}
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="px-8 py-8">
          <div className="h-[350px] flex items-center justify-center">
            {viewType === 'donut' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={150}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  {/* Center text */}
                  <text x="50%" y="45%" textAnchor="middle" className="text-4xl font-bold fill-gray-900">
                    {totalCalls}
                  </text>
                  <text x="50%" y="55%" textAnchor="middle" className="text-sm fill-gray-500">
                    {t('reports.totalCalls')}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={true} vertical={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#374151', fontSize: 14, fontWeight: 500 }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend Cards */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {chartData.map((item, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{item.percentage}%</div>
                <div className="text-sm text-gray-500">{item.value} {t('reports.calls')} · {item.minutes} min</div>
                <div className="text-xs text-gray-400 mt-1">{item.timeRange}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionReportModal;
