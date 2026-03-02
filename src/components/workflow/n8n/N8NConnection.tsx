import React, { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';

interface N8NConnectionProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isSelected?: boolean;
  isExecuting?: boolean;
  hasData?: boolean;
  itemCount?: number;
  onClick?: () => void;
  onAddNode?: () => void;
  onDelete?: () => void;
}

// Calculate point on cubic Bezier curve at parameter t (0-1)
const getBezierPoint = (
  t: number,
  startX: number,
  startY: number,
  cp1X: number,
  cp1Y: number,
  cp2X: number,
  cp2Y: number,
  endX: number,
  endY: number
): { x: number; y: number } => {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x: mt3 * startX + 3 * mt2 * t * cp1X + 3 * mt * t2 * cp2X + t3 * endX,
    y: mt3 * startY + 3 * mt2 * t * cp1Y + 3 * mt * t2 * cp2Y + t3 * endY,
  };
};

export const N8NConnection: React.FC<N8NConnectionProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  isSelected = false,
  isExecuting = false,
  hasData = false,
  itemCount,
  onClick,
  onAddNode,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // n8n style Bezier curve - smooth curves that handle vertical positioning
  const dx = toX - fromX;
  const dy = toY - fromY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  // Base offset - minimum pentru curbe vizibile
  const baseOffset = Math.max(50, Math.min(absDx * 0.5, 150));
  
  // Când target e mult mai jos/sus, extindem curba orizontal pentru S-curve frumoasă
  const verticalInfluence = absDy > 50 ? Math.min(absDy * 0.4, 120) : 0;
  
  let cp1X: number, cp1Y: number, cp2X: number, cp2Y: number;
  
  if (dx >= 0) {
    // Conexiune normală (target la dreapta)
    cp1X = fromX + baseOffset + verticalInfluence;
    cp1Y = fromY;
    cp2X = toX - baseOffset - verticalInfluence;
    cp2Y = toY;
  } else {
    // Conexiune înapoi (target la stânga) - face un arc mare
    const loopOffset = Math.max(80, absDy * 0.5 + 50);
    cp1X = fromX + loopOffset;
    cp1Y = fromY + (dy > 0 ? Math.min(absDy * 0.3, 60) : -Math.min(absDy * 0.3, 60));
    cp2X = toX - loopOffset;
    cp2Y = toY + (dy > 0 ? -Math.min(absDy * 0.3, 60) : Math.min(absDy * 0.3, 60));
  }

  // SVG path with cubic Bezier
  const pathD = `M ${fromX} ${fromY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${toX} ${toY}`;

  // Calculate center point for + button (t=0.5)
  const centerPoint = useMemo(() => 
    getBezierPoint(0.5, fromX, fromY, cp1X, cp1Y, cp2X, cp2Y, toX, toY),
    [fromX, fromY, cp1X, cp1Y, cp2X, cp2Y, toX, toY]
  );

  // n8n color palette
  const colors = {
    default: '#5e5e5e',      // Gray for inactive
    success: '#10b981',      // Green for success/data flow
    selected: '#ff6b5a',     // Coral when selected
    executing: '#10b981',    // Green when executing
    hover: '#7a7a7a',        // Lighter gray on hover
  };

  // Determine current color based on state
  const getStrokeColor = () => {
    if (isSelected) return colors.selected;
    if (isExecuting || hasData) return colors.success;
    if (isHovered) return colors.hover;
    return colors.default;
  };

  const strokeColor = getStrokeColor();
  const strokeWidth = isSelected || isHovered ? 2.5 : 2;

  // Unique IDs for gradients/markers
  const uniqueId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  const glowId = `glow-${uniqueId}`;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Definitions for effects */}
      <defs>
        {/* Glow filter for selected/executing state */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Invisible wider hit area for easier clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      />

      {/* Shadow/glow layer for depth */}
      {(isSelected || isExecuting) && (
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.2}
          filter={`url(#${glowId})`}
        />
      )}

      {/* Main connection line - n8n style */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={isExecuting ? 'n8n-connection-executing' : ''}
        style={{
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        }}
      />

      {/* Animated flow dots when executing */}
      {isExecuting && (
        <circle r={4} fill="#22c55e">
          <animateMotion
            dur="1s"
            repeatCount="indefinite"
            path={pathD}
          />
        </circle>
      )}

      {/* Data flow indicator - animated dots */}
      {hasData && !isExecuting && (
        <>
          <circle r={3} fill={colors.success} opacity={0.8}>
            <animateMotion
              dur="1.5s"
              repeatCount="indefinite"
              path={pathD}
            />
          </circle>
          <circle r={3} fill={colors.success} opacity={0.5}>
            <animateMotion
              dur="1.5s"
              repeatCount="indefinite"
              path={pathD}
              begin="0.5s"
            />
          </circle>
        </>
      )}

      {/* Item count badge on the line - only show when data has passed through */}
      {hasData && itemCount !== undefined && itemCount > 0 && (
        <g>
          <rect
            x={centerPoint.x - 20}
            y={centerPoint.y - 10}
            width={40}
            height={20}
            rx={10}
            fill="#1a1a1a"
            stroke={colors.success}
            strokeWidth={1}
          />
          <text
            x={centerPoint.x}
            y={centerPoint.y + 4}
            textAnchor="middle"
            fill={colors.success}
            fontSize={11}
            fontWeight={500}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {itemCount} item{itemCount > 1 ? 's' : ''}
          </text>
        </g>
      )}

      {/* Hover controls - + button and delete */}
      {isHovered && !isExecuting && (
        <g>
          {/* Add node button - center */}
          {onAddNode && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                onAddNode();
              }}
              style={{ cursor: 'pointer' }}
              className="n8n-add-node-btn"
            >
              <circle
                cx={centerPoint.x}
                cy={centerPoint.y}
                r={14}
                fill="#2a2a2a"
                stroke="#4a4a4a"
                strokeWidth={1.5}
                className="transition-all duration-150"
              />
              <foreignObject
                x={centerPoint.x - 8}
                y={centerPoint.y - 8}
                width={16}
                height={16}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%'
                }}>
                  <Plus size={14} color="#888888" strokeWidth={2} />
                </div>
              </foreignObject>
            </g>
          )}

          {/* Delete button - appears on right of + button when selected */}
          {isSelected && onDelete && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={centerPoint.x + 35}
                cy={centerPoint.y}
                r={12}
                fill="#dc2626"
                stroke="#b91c1c"
                strokeWidth={1}
              />
              <foreignObject
                x={centerPoint.x + 35 - 6}
                y={centerPoint.y - 6}
                width={12}
                height={12}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%'
                }}>
                  <X size={10} color="#ffffff" strokeWidth={3} />
                </div>
              </foreignObject>
            </g>
          )}
        </g>
      )}

      {/* CSS for animations */}
      <style>{`
        .n8n-connection-executing {
          stroke-dasharray: 8 4;
          animation: n8n-dash 0.5s linear infinite;
        }
        
        @keyframes n8n-dash {
          to {
            stroke-dashoffset: -12;
          }
        }
        
        .n8n-add-node-btn:hover circle {
          fill: #3a3a3a;
          stroke: #10b981;
        }
        
        .n8n-add-node-btn:hover svg {
          color: #10b981 !important;
        }
      `}</style>
    </g>
  );
};

// Temporary connection while dragging
export const N8NTempConnection: React.FC<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}> = ({ fromX, fromY, toX, toY }) => {
  // n8n style - smooth curves for vertical positioning
  const dx = toX - fromX;
  const dy = toY - fromY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  const baseOffset = Math.max(50, Math.min(absDx * 0.5, 150));
  const verticalInfluence = absDy > 50 ? Math.min(absDy * 0.4, 120) : 0;
  
  let cp1X: number, cp1Y: number, cp2X: number, cp2Y: number;
  
  if (dx >= 0) {
    cp1X = fromX + baseOffset + verticalInfluence;
    cp1Y = fromY;
    cp2X = toX - baseOffset - verticalInfluence;
    cp2Y = toY;
  } else {
    const loopOffset = Math.max(80, absDy * 0.5 + 50);
    cp1X = fromX + loopOffset;
    cp1Y = fromY + (dy > 0 ? Math.min(absDy * 0.3, 60) : -Math.min(absDy * 0.3, 60));
    cp2X = toX - loopOffset;
    cp2Y = toY + (dy > 0 ? -Math.min(absDy * 0.3, 60) : Math.min(absDy * 0.3, 60));
  }

  const pathD = `M ${fromX} ${fromY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${toX} ${toY}`;

  return (
    <g>
      {/* Glow effect */}
      <path
        d={pathD}
        fill="none"
        stroke="#10b981"
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.2}
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Main dashed line */}
      <path
        d={pathD}
        fill="none"
        stroke="#10b981"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="8 4"
        style={{
          pointerEvents: 'none',
          animation: 'n8n-dash 0.5s linear infinite',
        }}
      />
      
      {/* Animated dot */}
      <circle r={5} fill="#10b981">
        <animateMotion
          dur="0.6s"
          repeatCount="indefinite"
          path={pathD}
        />
      </circle>
      
      {/* Target indicator */}
      <circle
        cx={toX}
        cy={toY}
        r={8}
        fill="none"
        stroke="#10b981"
        strokeWidth={2}
        opacity={0.6}
      >
        <animate
          attributeName="r"
          values="8;12;8"
          dur="1s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.6;0.2;0.6"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
      
      <style>{`
        @keyframes n8n-dash {
          to {
            stroke-dashoffset: -12;
          }
        }
      `}</style>
    </g>
  );
};