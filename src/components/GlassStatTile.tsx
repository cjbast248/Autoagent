import React, { useRef, useState } from 'react';

type TrendType = 'up' | 'down' | 'neutral';

type GlassStatTileProps = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: number;
  trendType?: TrendType;
  icon: React.ReactNode;
  isLoading?: boolean;
};

const GlassStatTile: React.FC<GlassStatTileProps> = ({ label, value, sub, trend, trendType, icon, isLoading = false }) => {
  const isDown = trendType === 'down' || (typeof trend === 'number' && trend < 0);
  const isUp = trendType === 'up' || (typeof trend === 'number' && trend > 0);
  const trendColor = isUp ? 'text-emerald-600' : isDown ? 'text-rose-600' : 'text-gray-500';
  const trendPrefix = isUp ? '+' : '';

  const cardRef = useRef<HTMLDivElement>(null);
  const [glowPosition, setGlowPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setGlowPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative">
      {/* Border glow - DOAR pe bordură */}
      <div
        className="pointer-events-none absolute inset-[-2px] rounded-2xl transition-opacity duration-300 z-10"
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
        className="relative rounded-2xl bg-white"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ border: '2px solid #9CA3AF' }}
      >
        <div className="relative flex items-center justify-between p-5">
          <div className="min-w-0">
            <div className="text-xs text-gray-600">{label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
              ) : (
                <div className="text-xl font-extrabold tracking-tight text-gray-900 truncate">{value}</div>
              )}
              {!isLoading && typeof trend === 'number' && (
                <div className={`text-xs font-semibold ${trendColor}`}>{trendPrefix}{trend}%</div>
              )}
              {isLoading && (
                <div className="h-4 bg-gray-200 rounded w-10 animate-pulse" />
              )}
            </div>
            {sub && !isLoading && (
              <div className="text-xs text-gray-500 mt-1 truncate">{sub}</div>
            )}
          </div>
          <div className="shrink-0 grid h-11 w-11 place-items-center rounded-xl bg-neutral-900 text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlassStatTile;
