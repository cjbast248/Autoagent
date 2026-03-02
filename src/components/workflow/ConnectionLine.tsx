import React from 'react';
import { Wrench } from 'lucide-react';

interface ConnectionLineProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isSelected: boolean;
  onClick: () => void;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  isSelected,
  onClick,
}) => {
  // Calculate Bezier curve control points
  const dx = toX - fromX;
  const controlPointOffset = Math.abs(dx) * 0.5;
  
  const path = `M ${fromX} ${fromY} C ${fromX + controlPointOffset} ${fromY}, ${toX - controlPointOffset} ${toY}, ${toX} ${toY}`;
  const uniqueId = `${fromX}-${fromY}-${toX}-${toY}`;
  
  // Calculate midpoint for the wrench icon
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  return (
    <>
      <defs>
        <marker
          id={`arrowhead-${uniqueId}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill={isSelected ? '#ff6d5a' : '#555'}
          />
        </marker>
        
        {/* Animated dots gradient */}
        <linearGradient id={`dot-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
          <stop offset="50%" stopColor="#60A5FA" stopOpacity="1" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      <g onClick={onClick} className="cursor-pointer group">
        {/* Invisible wider path for easier clicking */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="20"
        />
        
        {/* Main connection line - n8n style */}
        <path
          d={path}
          fill="none"
          stroke={isSelected ? '#ff6d5a' : '#666'}
          strokeWidth={isSelected ? '2.5' : '2'}
          markerEnd={`url(#arrowhead-${uniqueId})`}
          className="transition-all"
        />

        {/* Animated dots overlay - only when selected */}
        {isSelected && (
          <path
            d={path}
            fill="none"
            stroke="#ff6d5a"
            strokeWidth="2.5"
            strokeDasharray="6 14"
            strokeLinecap="round"
            className="animate-connection-flow opacity-60"
          />
        )}
        
        {/* Plus button at midpoint - n8n style (only on hover) */}
        <g
          transform={`translate(${midX - 12}, ${midY - 12})`}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="#2a2a2a"
            stroke="#ff6d5a"
            strokeWidth="2"
            className="transition-all cursor-pointer hover:fill-[#333]"
          />
          <text
            x="12"
            y="12"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ff6d5a"
            fontSize="16"
            fontWeight="bold"
            className="pointer-events-none"
          >
            +
          </text>
        </g>
      </g>

      <style>{`
        @keyframes connection-flow {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -28;
          }
        }
        
        .animate-connection-flow {
          animation: connection-flow 1.5s linear infinite;
        }
      `}</style>
    </>
  );
};
