import React from 'react';
import { WorkflowNode } from '@/hooks/useWorkflowBuilder';

interface MiniMapProps {
  nodes: WorkflowNode[];
  viewportBounds: { x: number; y: number; width: number; height: number };
  onNavigate: (x: number, y: number) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({ nodes, viewportBounds, onNavigate }) => {
  const scale = 0.1; // 10% of actual size
  const width = 200;
  const height = 150;

  // Early return if no nodes
  if (nodes.length === 0) {
    return (
      <div className="absolute bottom-4 right-4 bg-card border rounded-lg p-4 shadow-lg text-sm text-muted-foreground">
        Trage noduri pe canvas
      </div>
    );
  }

  // Calculate bounds of all nodes
  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      maxX: Math.max(acc.maxX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxY: Math.max(acc.maxY, node.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  const canvasWidth = bounds.maxX - bounds.minX + 200;
  const canvasHeight = bounds.maxY - bounds.minY + 200;

  return (
    <div className="absolute bottom-4 right-4 bg-card border rounded-lg p-2 shadow-lg">
      <svg
        width={width}
        height={height}
        className="cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / scale;
          const y = (e.clientY - rect.top) / scale;
          onNavigate(x, y);
        }}
      >
        {/* Background */}
        <rect width={width} height={height} fill="hsl(var(--muted))" />

        {/* Nodes */}
        {nodes.map((node) => (
          <rect
            key={node.id}
            x={(node.x - bounds.minX) * scale}
            y={(node.y - bounds.minY) * scale}
            width={20}
            height={10}
            fill="hsl(var(--primary))"
            opacity={0.6}
          />
        ))}

        {/* Viewport indicator */}
        <rect
          x={viewportBounds.x * scale}
          y={viewportBounds.y * scale}
          width={viewportBounds.width * scale}
          height={viewportBounds.height * scale}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          opacity={0.5}
        />
      </svg>
    </div>
  );
};
