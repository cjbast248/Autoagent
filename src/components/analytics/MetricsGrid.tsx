
import React from 'react';
import { Clock, MessageSquare, VolumeX, Zap } from 'lucide-react';

interface MetricsGridProps {
  metrics: {
    talk_time: number;
    interruptions: number;
    silence_percent: number;
    speech_speed: number;
  };
}

const MetricsGrid = ({ metrics }: MetricsGridProps) => {
  const metricCards = [
    {
      label: 'Talk Time',
      value: `${Math.floor(metrics.talk_time / 60)}:${(metrics.talk_time % 60).toString().padStart(2, '0')}`,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Interruptions',
      value: metrics.interruptions.toString(),
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Silence',
      value: `${metrics.silence_percent}%`,
      icon: VolumeX,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      label: 'Speed',
      value: `${metrics.speech_speed} wpm`,
      icon: Zap,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {metricCards.map((metric, index) => (
        <div 
          key={index}
          className={`${metric.bgColor} rounded-lg p-3 border border-gray-100`}
        >
          <div className="flex items-center justify-between mb-2">
            <metric.icon size={16} className={metric.color} />
            <div className="w-12 h-6 bg-gray-200 rounded-full">
              {/* Mini sparkline placeholder */}
              <div className="w-full h-full bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-50 rounded-full" />
            </div>
          </div>
          <div className="text-lg font-semibold text-gray-900">{metric.value}</div>
          <div className="text-xs text-gray-600">{metric.label}</div>
        </div>
      ))}
    </div>
  );
};

export default MetricsGrid;
