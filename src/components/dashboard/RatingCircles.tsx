import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Phone, CheckCircle2, Star, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import GlowCard from './GlowCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface RatingCirclesProps {
  title: string;
  subtitle: string;
  metrics: {
    label: string;
    value: number;
    color: string;
    size: 'sm' | 'md' | 'lg';
    position: { top?: string; left?: string; right?: string; bottom?: string };
  }[];
  isLoading?: boolean;
}

const RatingCircles: React.FC<RatingCirclesProps> = ({
  title,
  subtitle,
  metrics,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  // Find metrics by label (support both RO and translated labels)
  const raspunsMetric = metrics.find(m => m.label === 'Răspuns' || m.label === t('dashboard.response'));
  const calitateMetric = metrics.find(m => m.label === 'Calitate' || m.label === t('dashboard.quality'));
  const succesMetric = metrics.find(m => m.label === 'Succes' || m.label === t('dashboard.success'));

  // Helper to get trend icon and color
  const getTrend = (value: number) => {
    if (value >= 70) return { icon: TrendingUp, color: 'text-gray-900', bg: 'bg-gray-100', label: t('dashboard.excellent') || 'Excellent' };
    if (value >= 40) return { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-50', label: t('dashboard.medium') || 'Medium' };
    return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', label: t('dashboard.needsAttention') || 'Needs attention' };
  };

  // Circular progress component
  const CircularProgress = ({ 
    value, 
    color, 
    size = 80,
    strokeWidth = 6,
    icon: Icon,
    label
  }: { 
    value: number; 
    color: string; 
    size?: number;
    strokeWidth?: number;
    icon: React.ElementType;
    label: string;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;
    
    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          {/* Background circle */}
          <svg className="transform -rotate-90" width={size} height={size}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Icon className="w-3.5 h-3.5 mb-0.5 text-gray-400" />
            <span className="text-base font-bold text-gray-900">{value}%</span>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-500 mt-2">{label}</span>
      </div>
    );
  };

  // Calculate overall score
  const overallScore = Math.round(
    ((raspunsMetric?.value || 0) + (calitateMetric?.value || 0) + (succesMetric?.value || 0)) / 3
  );
  const overallTrend = getTrend(overallScore);
  const OverallTrendIcon = overallTrend.icon;

  return (
    <GlowCard className="p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        {isLoading ? (
          <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse" />
        ) : (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${overallTrend.bg} ${overallTrend.color}`}>
            <OverallTrendIcon className="w-3 h-3" />
            {overallTrend.label}
          </div>
        )}
      </div>

      {/* Overall Score */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-xl">
        <div className="flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          {isLoading ? (
            <div className="h-6 bg-gray-200 rounded w-10 animate-pulse" />
          ) : (
            <span className="text-xl font-bold text-red-600">{overallScore}%</span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white">{t('dashboard.overallScore')}</p>
          <p className="text-xs text-gray-500">{t('dashboard.averageAllMetrics')}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-[70px] h-[70px] bg-gray-200 rounded-full animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-12 mt-2 animate-pulse" />
            </div>
          ))
        ) : (
          <>
            {raspunsMetric && (
              <CircularProgress
                value={raspunsMetric.value}
                color="#111111"
                size={70}
                strokeWidth={5}
                icon={Phone}
                label={t('dashboard.response')}
              />
            )}
            {calitateMetric && (
              <CircularProgress
                value={calitateMetric.value}
                color="#6B7280"
                size={70}
                strokeWidth={5}
                icon={Star}
                label={t('dashboard.quality')}
              />
            )}
            {succesMetric && (
              <CircularProgress
                value={succesMetric.value}
                color="#DC2626"
                size={70}
                strokeWidth={5}
                icon={CheckCircle2}
                label={t('dashboard.success')}
              />
            )}
          </>
        )}
      </div>

      {/* Bottom Stats */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">{t('dashboard.basedOnLast30Days')}</span>
          <button
            onClick={() => setShowDetails(true)}
            className="text-red-600 font-medium cursor-pointer hover:underline"
          >
            {t('dashboard.seeDetails')} →
          </button>
        </div>
      </div>

      {/* Performance Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[500px] bg-white p-0 gap-0 rounded-2xl">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.performanceDetails') || 'Performance Details'}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('dashboard.last30DaysAnalysis') || 'Analysis of the last 30 days'}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Overall Score */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
              <div className="flex items-center justify-center w-16 h-16 bg-white rounded-xl shadow-sm">
                <span className="text-2xl font-bold text-red-600">{overallScore}%</span>
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-900">{t('dashboard.overallScore')}</p>
                <p className="text-sm text-gray-500">{t('dashboard.averageAllMetrics')}</p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${overallTrend.bg} ${overallTrend.color}`}>
                <OverallTrendIcon className="w-4 h-4" />
                {overallTrend.label}
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="space-y-4">
              {/* Response Rate */}
              {raspunsMetric && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{t('dashboard.response')}</p>
                      <span className="text-lg font-bold text-gray-900">{raspunsMetric.value}%</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-500"
                        style={{ width: `${raspunsMetric.value}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('dashboard.responseDesc') || 'Percentage of calls answered successfully'}
                    </p>
                  </div>
                </div>
              )}

              {/* Quality */}
              {calitateMetric && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm">
                    <Star className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{t('dashboard.quality')}</p>
                      <span className="text-lg font-bold text-gray-900">{calitateMetric.value}%</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-500 rounded-full transition-all duration-500"
                        style={{ width: `${calitateMetric.value}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('dashboard.qualityDesc') || 'Quality score based on conversation analysis'}
                    </p>
                  </div>
                </div>
              )}

              {/* Success */}
              {succesMetric && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{t('dashboard.success')}</p>
                      <span className="text-lg font-bold text-red-600">{succesMetric.value}%</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all duration-500"
                        style={{ width: `${succesMetric.value}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('dashboard.successDesc') || 'Rate of successfully completed conversations'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm font-medium text-blue-900 mb-2">{t('dashboard.improvementTips') || 'Tips to improve'}</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• {t('dashboard.tip1') || 'Optimize your agent prompts for better responses'}</li>
                <li>• {t('dashboard.tip2') || 'Review failed conversations to identify patterns'}</li>
                <li>• {t('dashboard.tip3') || 'Ensure your agents have accurate information'}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GlowCard>
  );
};

export default RatingCircles;
