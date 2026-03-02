import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface RevenueChartProps {
  title: string;
  value: string;
  subtitle: string;
  trend: number;
  trendLabel: string;
  data: { name: string; value: number; highlight?: boolean }[];
  onViewReport?: () => void;
}

const RevenueChart: React.FC<RevenueChartProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  data,
  onViewReport,
}) => {
  const isPositive = trend >= 0;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 h-full transition-all duration-300 hover:border-red-400 hover:shadow-lg hover:shadow-red-100/50">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {onViewReport && (
          <button
            onClick={onViewReport}
            className="px-4 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 transition-colors"
          >
            View Report
          </button>
        )}
      </div>

      {/* Value */}
      <div className="mb-1">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1.5 mb-2">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
        )}
        <span className={`text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isPositive ? '+' : ''}{trend}%
        </span>
        <span className="text-sm text-gray-500">{trendLabel}</span>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis hide />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.highlight ? '#6366F1' : '#E5E7EB'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span className="text-xs text-gray-600">Last 6 days</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-300"></span>
          <span className="text-xs text-gray-600">Last Week</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
