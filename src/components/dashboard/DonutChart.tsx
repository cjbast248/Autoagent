import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import DistributionReportModal from './DistributionReportModal';
import GlowCard from './GlowCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface CallData {
  call_date: string;
  duration_seconds?: number;
}

interface DonutChartProps {
  title: string;
  subtitle: string;
  data: { name: string; value: number; color: string; percentage: number }[];
  callHistory?: CallData[];
  onViewReport?: () => void;
  isLoading?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({
  title,
  subtitle,
  data,
  callHistory = [],
  onViewReport,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const bgColor = item.color;
      const isLight = bgColor === '#FCA5A5';
      const textColor = isLight ? 'text-gray-900' : 'text-white';
      const subTextColor = isLight ? 'text-gray-600' : 'text-white/70';
      
      return (
        <div 
          className="px-4 py-3 rounded-xl shadow-2xl border border-white/20"
          style={{ backgroundColor: bgColor }}
        >
          <div className={`font-semibold text-base ${textColor}`}>{item.name}</div>
          <div className={`text-xs ${subTextColor} mb-2`}>{item.timeRange}</div>
          <div className={`text-2xl font-bold ${textColor}`}>{item.count || item.value}</div>
          <div className={`text-xs ${subTextColor}`}>{t('dashboard.calls')}</div>
        </div>
      );
    }
    return null;
  };

  // Calculează umbra în funcție de culoarea activă
  const getInsetShadow = () => {
    if (!activeColor) {
      return 'inset 3px 3px 8px rgba(0,0,0,0.1), inset -3px -3px 8px rgba(255,255,255,0.8)';
    }
    if (activeColor === '#FCA5A5') {
      return 'inset 3px 3px 12px rgba(220, 38, 38, 0.3), inset -3px -3px 8px rgba(255,255,255,0.6)';
    }
    if (activeColor === '#DC2626') {
      return 'inset 3px 3px 12px rgba(220, 38, 38, 0.5), inset -3px -3px 8px rgba(255,255,255,0.4)';
    }
    // Negru
    return 'inset 3px 3px 12px rgba(0, 0, 0, 0.4), inset -3px -3px 8px rgba(255,255,255,0.3)';
  };

  const getBackgroundGradient = () => {
    if (!activeColor) {
      return 'linear-gradient(145deg, #e6e6e6, #ffffff)';
    }
    if (activeColor === '#FCA5A5') {
      return 'linear-gradient(145deg, #fef2f2, #ffffff)';
    }
    if (activeColor === '#DC2626') {
      return 'linear-gradient(145deg, #fee2e2, #ffffff)';
    }
    return 'linear-gradient(145deg, #e5e7eb, #ffffff)';
  };

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

      {/* Subtitle */}
      {isLoading ? (
        <div className="h-4 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
      ) : (
        <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      )}

      {/* Chart - efect de scufundare cu culoare dinamică */}
      <div className="h-48 relative flex items-center justify-center">
        {isLoading ? (
          <div
            className="rounded-full animate-pulse"
            style={{
              width: 190,
              height: 190,
              background: 'linear-gradient(145deg, #e6e6e6, #f5f5f5)',
            }}
          />
        ) : (
          <div
            className="relative rounded-full transition-all duration-300"
            style={{
              width: 190,
              height: 190,
              background: getBackgroundGradient(),
              boxShadow: getInsetShadow(),
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, index) => setActiveColor(data[index].color)}
                  onMouseLeave={() => setActiveColor(null)}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer" />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip />}
                  position={{ x: 220, y: 60 }}
                  wrapperStyle={{ zIndex: 100 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-8 animate-pulse" />
            </div>
          ))
        ) : (
          data.map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-xs text-gray-600">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{item.percentage}%</span>
            </div>
          ))
        )}
      </div>
    </GlowCard>

    {/* Distribution Report Modal */}
    <DistributionReportModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title={t('reports.detailedDistributionReport')}
      callHistory={callHistory}
    />
    </>
  );
};

export default DonutChart;
