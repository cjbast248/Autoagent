import React, { useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  action,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPosition, setGlowPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setGlowPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative min-h-[180px]">
      {/* Border glow - DOAR pe bordură */}
      <div
        className="pointer-events-none absolute inset-[-2px] rounded-lg transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(350px circle at ${glowPosition.x}px ${glowPosition.y}px, rgba(220, 38, 38, 1), transparent 50%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          padding: '2px',
        }}
      />
      <div
        ref={cardRef}
        className="relative bg-white rounded-lg p-6 flex flex-col justify-between h-full"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ border: '2px solid #E5E7EB' }}
      >
      
        {/* Header */}
        <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700">
              {icon}
            </div>
          )}
          <span className="text-sm font-medium text-gray-600">{title}</span>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-medium text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <div className="text-3xl font-bold text-gray-900 tracking-tight">{value}</div>
        {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{isPositive ? '+' : ''}{trend}%</span>
          </div>
          {trendLabel && <span className="text-xs text-gray-500">{trendLabel}</span>}
        </div>
      )}
      </div>
    </div>
  );
}
