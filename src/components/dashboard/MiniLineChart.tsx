import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import CallsReportModal from './CallsReportModal';
import GlowCard from './GlowCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface CallData {
  call_date?: string;
  created_at?: string;
  duration_seconds?: number;
  call_status?: string;
}

interface MiniLineChartProps {
  title: string;
  value: string;
  trend: number;
  trendLabel: string;
  subtitle: string;
  data: { name: string; value: number }[];
  callHistory?: CallData[];
  totalCalls?: number;
  thisMonthCalls?: number;
  lastMonthCalls?: number;
  onViewReport?: () => void;
  isLoading?: boolean;
}

const MiniLineChart: React.FC<MiniLineChartProps> = ({
  title,
  value,
  trend,
  trendLabel,
  subtitle,
  data,
  callHistory = [],
  totalCalls = 0,
  thisMonthCalls = 0,
  lastMonthCalls = 0,
  onViewReport,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isPositive = trend >= 0;

  return (
    <>
    <GlowCard>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
        >
          {t('dashboard.viewReport')}
        </button>
      </div>

      {/* Value */}
      <div className="mb-1">
        {isLoading ? (
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
        ) : (
          <span className="text-3xl font-bold text-gray-900">{value}</span>
        )}
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1.5 mb-2">
        {isLoading ? (
          <>
            <div className="h-4 bg-gray-200 rounded w-12 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
          </>
        ) : (
          <>
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? '+' : ''}{trend}%
            </span>
            <span className="text-sm text-gray-500">{trendLabel}</span>
          </>
        )}
      </div>

      {/* Subtitle */}
      {isLoading ? (
        <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
      ) : (
        <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      )}

      {/* Chart */}
      <div className="h-24">
        {isLoading ? (
          <div className="h-full bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
              />
              <YAxis hide />
              <Line
                type="monotone"
                dataKey="value"
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
          <span className="text-xs text-gray-600">{t('dashboard.last7Days')}</span>
        </div>
      </div>
    </GlowCard>

    {/* Calls Report Modal */}
    <CallsReportModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title={t('reports.detailedCallsReport')}
      callHistory={callHistory}
      totalCalls={totalCalls}
      thisMonthCalls={thisMonthCalls}
      lastMonthCalls={lastMonthCalls}
    />
    </>
  );
};

export default MiniLineChart;
