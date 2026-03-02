import React from 'react';
import {
  Plus,
  Minus,
  Maximize2,
  Search,
  SidebarOpen,
  LayoutGrid,
  Sparkles,
  AlignHorizontalJustifyCenter
} from 'lucide-react';
import { cn } from '@/utils/utils';

interface N8NToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleMinimap?: () => void;
  showMinimap?: boolean;
  onAddNode?: () => void;
  onSearch?: () => void;
  onToggleSidebar?: () => void;
  onToggleAI?: () => void;
  showAI?: boolean;
  showSidebar?: boolean;
  onAutoLayout?: () => void;
}

export const N8NToolbar: React.FC<N8NToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleMinimap,
  showMinimap,
  onAddNode,
  onSearch,
  onToggleSidebar,
  onToggleAI,
  showAI,
  showSidebar,
  onAutoLayout,
}) => {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[100] pointer-events-auto">
      {/* Add Node */}
      <ToolbarButton icon={Plus} onClick={onAddNode} tooltip="Adaugă nod" />

      <div className="w-9 h-px bg-[#3a3a3a] my-1" />

      {/* Search - uses same handler as Add Node to open node search */}
      <ToolbarButton icon={Search} onClick={onSearch || onAddNode} tooltip="Caută noduri" />

      {/* Toggle Sidebar */}
      <ToolbarButton icon={SidebarOpen} onClick={onToggleSidebar} tooltip="Toggle sidebar" active={showSidebar} />
      
      {/* Minimap */}
      {onToggleMinimap && (
        <ToolbarButton
          icon={LayoutGrid}
          onClick={onToggleMinimap}
          tooltip="Minimapă"
          active={showMinimap}
        />
      )}

      {/* Auto Layout */}
      {onAutoLayout && (
        <ToolbarButton
          icon={AlignHorizontalJustifyCenter}
          onClick={onAutoLayout}
          tooltip="Aranjează noduri"
        />
      )}

      {/* AI */}
      {onToggleAI && (
        <ToolbarButton 
          icon={Sparkles} 
          onClick={onToggleAI} 
          tooltip="Asistent AI" 
          active={showAI} 
        />
      )}
    </div>
  );
};

// Zoom Controls - poziționare fixă sus la mijloc
export const N8NZoomControls: React.FC<{
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}> = ({ zoom, onZoomIn, onZoomOut, onFitView }) => {
  const zoomPercent = Math.round(zoom * 100);
  
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-3 flex items-center gap-1 z-20">
      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-[#1e1e1e] border border-[#3a3a3a] text-slate-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
        title="Micșorează (Ctrl + scroll jos)"
      >
        <Minus className="w-3 h-3" />
      </button>
      
      {/* Zoom Percentage Display */}
      <div className="px-2 h-7 flex items-center justify-center rounded-md bg-[#1e1e1e] border border-[#3a3a3a] text-slate-300 text-[10px] font-medium min-w-[50px]">
        {zoomPercent}%
      </div>
      
      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-[#1e1e1e] border border-[#3a3a3a] text-slate-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
        title="Mărește (Ctrl + scroll sus)"
      >
        <Plus className="w-3 h-3" />
      </button>
      
      {/* Separator */}
      <div className="w-px h-5 bg-[#3a3a3a] mx-0.5" />
      
      {/* Fit View */}
      <button
        onClick={onFitView}
        className="w-7 h-7 flex items-center justify-center rounded-md bg-[#1e1e1e] border border-[#3a3a3a] text-slate-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
        title="Încadrează tot (F)"
      >
        <Maximize2 className="w-3 h-3" />
      </button>
    </div>
  );
};

// Individual toolbar button
const ToolbarButton: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  tooltip?: string;
  active?: boolean;
}> = ({ icon: Icon, onClick, tooltip, active }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-10 h-10 flex items-center justify-center rounded-lg transition-all",
        "border border-[#3a3a3a] shadow-sm",
        active 
          ? "bg-[#3a3a3a] text-white border-[#4a4a4a]" 
          : "bg-[#1e1e1e] text-slate-400 hover:text-white hover:bg-[#2a2a2a] hover:border-[#4a4a4a]"
      )}
      title={tooltip}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};
