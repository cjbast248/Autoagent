import React, { useEffect, useId, useMemo, useState } from 'react';

type CircularStatProps = {
  /** 0-100 percentage of the ring */
  percent: number;
  /** Text (or node) displayed in the center */
  display: React.ReactNode;
  /** Small text under the donut */
  caption?: string;
  size?: number;
  strokeWidth?: number;
  /** Gradient colors for the active stroke */
  gradientColors?: [string, string];
  /** Background track color */
  trackColor?: string;
  /** Adds a soft glow on the ring */
  glow?: boolean;
  /** Draw a dot at the end of the arc */
  capDot?: boolean;
  /** Optional icon shown inside the donut center, above the value */
  icon?: React.ReactNode;
};

const CircularStat: React.FC<CircularStatProps> = ({
  percent,
  display,
  caption,
  size = 112,
  strokeWidth = 12,
  gradientColors = ['#06b6d4', '#0ea5e9'],
  trackColor = '#eef2ff',
  glow = true,
  capDot = true,
  icon,
}) => {
  const [animated, setAnimated] = useState(0);
  const id = useId();

  useEffect(() => {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    const t = setTimeout(() => setAnimated(p), 50);
    return () => clearTimeout(t);
  }, [percent]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = useMemo(() => (animated / 100) * circumference, [animated, circumference]);
  const angle = useMemo(() => (-90 + (animated / 100) * 360) * (Math.PI / 180), [animated]);
  const dot = useMemo(() => ({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) }), [radius, angle]);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="block">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientColors[0]} />
            <stop offset="100%" stopColor={gradientColors[1]} />
          </linearGradient>
          {glow && (
            <filter id={`glow-${id}`}>
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <circle r={radius} fill="transparent" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle
            r={radius}
            fill="transparent"
            stroke={`url(#grad-${id})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform="rotate(-90)"
            style={{ transition: 'stroke-dasharray 900ms ease' }}
            filter={glow ? `url(#glow-${id})` : undefined}
          />
          {capDot && (
            <circle
              cx={dot.x}
              cy={dot.y}
              r={strokeWidth / 2.2}
              fill={gradientColors[1]}
              opacity={0.95}
              filter={glow ? `url(#glow-${id})` : undefined}
            />
          )}
        </g>
      </svg>
      <div className="-mt-24 flex flex-col items-center select-none">
        {icon && <div className="mb-1 text-gray-800">{icon}</div>}
        <div className="text-2xl font-extrabold text-gray-900 leading-none">{display}</div>
        {caption && <div className="text-sm text-gray-600 mt-2 text-center">{caption}</div>}
      </div>
    </div>
  );
};

export default CircularStat;
