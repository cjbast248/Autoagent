import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Phone, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface CallData {
  call_date?: string;
  created_at?: string;
  duration_seconds?: number;
  call_status?: string;
  agent_name?: string;
}

interface CallsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  callHistory: CallData[];
  totalCalls: number;
  thisMonthCalls: number;
  lastMonthCalls: number;
}

type Period = 'week' | 'month' | 'quarter' | 'year';
type ViewType = 'line' | 'bar';

const CallsReportModal: React.FC<CallsReportModalProps> = ({
  isOpen,
  onClose,
  title,
  callHistory,
  totalCalls,
  thisMonthCalls,
  lastMonthCalls,
}) => {
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<Period>('month');
  const [viewType, setViewType] = useState<ViewType>('bar');
  const [offset, setOffset] = useState(0);

  const getLocale = () => {
    switch (language) {
      case 'ru': return 'ru-RU';
      case 'en': return 'en-US';
      default: return 'ro-RO';
    }
  };

  const periodConfig = {
    week: { label: t('reports.week'), days: 7, format: 'day' },
    month: { label: t('reports.month'), days: 30, format: 'day' },
    quarter: { label: t('reports.quarter'), days: 90, format: 'week' },
    year: { label: t('reports.year'), days: 365, format: 'month' },
  };

  const { chartData, periodLabel, periodCalls, periodMinutes, avgPerDay } = useMemo(() => {
    const config = periodConfig[period];
    const locale = getLocale();
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (offset * config.days));
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - config.days + 1);

    const formatDate = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const periodLabelText = `${formatDate(startDate)} - ${formatDate(endDate)}`;

    // Filter calls in period
    const filteredCalls = (callHistory || []).filter(c => {
      const callDateStr = c.call_date || c.created_at;
      if (!callDateStr) return false;
      const callDate = new Date(callDateStr);
      return callDate >= startDate && callDate <= endDate;
    });

    const totalMinutes = Math.round(filteredCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60);
    const avgCalls = Math.round(filteredCalls.length / config.days * 10) / 10;

    // Generate chart data based on period
    const data: { name: string; apeluri: number; minute: number }[] = [];
    
    if (period === 'week' || period === 'month') {
      // Daily data
      for (let i = config.days - 1; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayCalls = filteredCalls.filter(c => {
          const cd = (c.call_date || c.created_at || '').split('T')[0];
          return cd === dateStr;
        });
        
        data.push({
          name: date.getDate().toString(),
          apeluri: dayCalls.length,
          minute: Math.round(dayCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60),
        });
      }
    } else if (period === 'quarter') {
      // Weekly data
      for (let i = 12; i >= 0; i--) {
        const weekEnd = new Date(endDate);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        
        const weekCalls = filteredCalls.filter(c => {
          const callDate = new Date(c.call_date || c.created_at || '');
          return callDate >= weekStart && callDate <= weekEnd;
        });
        
        data.push({
          name: `S${13 - i}`,
          apeluri: weekCalls.length,
          minute: Math.round(weekCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60),
        });
      }
    } else {
      // Monthly data
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(endDate);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStr = `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const monthCalls = (callHistory || []).filter(c => {
          const cd = c.call_date || c.created_at || '';
          return cd.startsWith(monthStr);
        });
        
        data.push({
          name: monthDate.toLocaleDateString(locale, { month: 'short' }),
          apeluri: monthCalls.length,
          minute: Math.round(monthCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / 60),
        });
      }
    }

    return {
      chartData: data,
      periodLabel: periodLabelText,
      periodCalls: filteredCalls.length,
      periodMinutes: totalMinutes,
      avgPerDay: avgCalls,
    };
  }, [callHistory, period, offset]);

  const monthTrend = lastMonthCalls > 0 
    ? Math.round(((thisMonthCalls - lastMonthCalls) / lastMonthCalls) * 100)
    : (thisMonthCalls > 0 ? 100 : 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('reports.detailedCallStats')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Phone className="w-4 h-4" />
              <span>{t('reports.totalCalls')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalCalls.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              <span>{t('reports.thisMonth')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{thisMonthCalls.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              <span>{t('reports.lastMonth')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{lastMonthCalls.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              {monthTrend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              )}
              <span>{t('reports.trend')}</span>
            </div>
            <div className={`text-2xl font-bold ${monthTrend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {monthTrend >= 0 ? '+' : ''}{monthTrend}%
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          {/* Period Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(offset + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
              {periodLabel}
            </span>
            <button
              onClick={() => setOffset(Math.max(0, offset - 1))}
              disabled={offset === 0}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            {(['week', 'month', 'quarter', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setOffset(0); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  period === p
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {periodConfig[p].label}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewType('bar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
              }`}
            >
              {t('reports.bars')}
            </button>
            <button
              onClick={() => setViewType('line')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === 'line' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'
              }`}
            >
              {t('reports.line')}
            </button>
          </div>
        </div>

        {/* Period Stats */}
        <div className="px-6 py-3 bg-red-50 flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-600">{t('reports.selectedPeriod')}: </span>
            <span className="font-semibold text-red-700">{periodCalls} {t('reports.calls')}</span>
          </div>
          <div>
            <span className="text-gray-600">{t('reports.minutesSpoken')}: </span>
            <span className="font-semibold text-red-700">{periodMinutes} min</span>
          </div>
          <div>
            <span className="text-gray-600">{t('reports.dailyAverage')}: </span>
            <span className="font-semibold text-red-700">{avgPerDay} {t('reports.callsPerDay')}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="p-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {viewType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === 'apeluri' ? t('reports.calls') : t('reports.minutes')
                    ]}
                  />
                  <Bar 
                    dataKey="apeluri" 
                    fill="#DC2626"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="apeluri" 
                    stroke="#DC2626"
                    strokeWidth={2}
                    dot={{ fill: '#DC2626', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#DC2626' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 pb-6 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-600"></span>
            <span className="text-sm text-gray-600">{t('reports.callCount')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallsReportModal;
