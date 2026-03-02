import React from 'react';

type TrendType = 'up' | 'down' | 'neutral';

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode; // optional small caption under the value
  trend?: number; // positive for up, negative for down, 0 or undefined hides color emphasis
  trendType?: TrendType;
  icon: React.ReactNode;
};

const StatTile: React.FC<StatTileProps> = ({ label, value, sub, trend, trendType, icon }) => {
  const isDown = trendType === 'down' || (trend !== undefined && trend < 0);
  const isUp = trendType === 'up' || (trend !== undefined && trend > 0);
  const trendColor = isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-gray-400';
  const trendPrefix = isUp ? '+' : '';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1220] to-[#0e1a2c] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]">
      {/* Subtle radial light */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),transparent_60%)]" />

      <div className="relative flex items-center justify-between p-5">
        <div className="min-w-0">
          <div className="text-xs text-gray-300/90">{label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-xl font-extrabold tracking-tight text-white truncate">{value}</div>
            {typeof trend === 'number' && (
              <div className={`text-xs font-semibold ${trendColor}`}>{trendPrefix}{trend}%</div>
            )}
          </div>
          {sub && (
            <div className="text-xs text-gray-400 mt-1 truncate">{sub}</div>
          )}
        </div>
        <div className="shrink-0">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.8)]">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatTile;
