import React from 'react';

interface ConnectionLineELProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isSelected: boolean;
  onClick: () => void;
  type?: 'normal' | 'success' | 'failure';
}

export const ConnectionLineEL: React.FC<ConnectionLineELProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  isSelected,
  onClick,
  type = 'normal',
}) => {
  // Calculate the path - ElevenLabs uses stepped lines (vertical down, horizontal, vertical down)
  const midY = fromY + (toY - fromY) / 2;
  
  // For branch connections, we might need horizontal segments
  const needsHorizontal = Math.abs(fromX - toX) > 10;
  
  let path: string;
  
  if (needsHorizontal) {
    // Stepped path: down -> horizontal -> down
    path = `M ${fromX} ${fromY} 
            L ${fromX} ${midY} 
            L ${toX} ${midY} 
            L ${toX} ${toY}`;
  } else {
    // Simple vertical line
    path = `M ${fromX} ${fromY} L ${toX} ${toY}`;
  }

  // Color based on type
  const getStrokeColor = () => {
    if (isSelected) return '#3B82F6'; // blue-500
    switch (type) {
      case 'success':
        return '#10B981'; // emerald-500
      case 'failure':
        return '#EF4444'; // red-500
      default:
        return '#CBD5E1'; // slate-300
    }
  };

  const strokeColor = getStrokeColor();
  const uniqueId = `${fromX}-${fromY}-${toX}-${toY}-${type}`;

  return (
    <g onClick={onClick} className="cursor-pointer group">
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
      />
      
      {/* Main connection line */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all"
      />
      
      {/* Arrow marker at the end */}
      <defs>
        <marker
          id={`arrow-${uniqueId}`}
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 8 4 L 0 8 z"
            fill={strokeColor}
          />
        </marker>
      </defs>
      
      {/* Arrow at the end of the line */}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : 2}
        markerEnd={`url(#arrow-${uniqueId})`}
        className="transition-all"
      />
    </g>
  );
};
