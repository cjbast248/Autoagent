import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Minus, Plus } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
}) => {
  return (
    <div
      className="absolute bottom-6 right-6 z-10 flex flex-col gap-1 rounded-lg overflow-hidden shadow-lg"
      style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #2a2a2a',
      }}
    >
      {/* Zoom In */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-none h-10 w-10"
        style={{ borderBottom: '1px solid #2a2a2a' }}
      >
        <Plus className="w-4 h-4" />
      </Button>

      {/* Zoom Level */}
      <div
        className="flex items-center justify-center text-xs font-medium h-10 w-10"
        style={{ color: '#e0e0e0', borderBottom: '1px solid #2a2a2a' }}
      >
        {Math.round(zoom * 100)}%
      </div>

      {/* Zoom Out */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-none h-10 w-10"
        style={{ borderBottom: '1px solid #2a2a2a' }}
      >
        <Minus className="w-4 h-4" />
      </Button>

      {/* Fit View */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onFitView}
        className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-none h-10 w-10"
        title="Fit to screen"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
};
