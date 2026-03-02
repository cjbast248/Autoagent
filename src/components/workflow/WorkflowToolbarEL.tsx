import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  Play, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Trash2,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/utils/utils';

interface WorkflowToolbarELProps {
  onSave: () => void;
  onRun: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onClear: () => void;
  onTemplates?: () => void;
  zoom: number;
  isSaved: boolean;
}

export const WorkflowToolbarEL: React.FC<WorkflowToolbarELProps> = ({
  onSave,
  onRun,
  onZoomIn,
  onZoomOut,
  onFitView,
  onClear,
  onTemplates,
  zoom,
  isSaved,
}) => {
  return (
    <>
      {/* Top Left - Templates Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={onTemplates}
          className="gap-2 bg-white shadow-sm border-slate-200 hover:bg-slate-50"
        >
          <LayoutGrid className="w-4 h-4" />
          Templates
        </Button>
      </div>

      {/* Top Center - Main Actions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm">
        {/* Save Button */}
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
        >
          <Save className="w-4 h-4" />
          Salvează
        </Button>

        {/* Run Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRun}
          className="gap-2 border-slate-200 hover:bg-slate-50"
        >
          <Play className="w-4 h-4" />
          Rulează
        </Button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Zoom Controls */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="w-8 h-8 hover:bg-slate-100"
        >
          <ZoomIn className="w-4 h-4 text-slate-600" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="w-8 h-8 hover:bg-slate-100"
        >
          <ZoomOut className="w-4 h-4 text-slate-600" />
        </Button>

        <span className="text-sm text-slate-500 min-w-[3rem] text-center font-medium">
          {Math.round(zoom * 100)}%
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={onFitView}
          className="w-8 h-8 hover:bg-slate-100"
        >
          <Maximize2 className="w-4 h-4 text-slate-600" />
        </Button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Delete All */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm('Ștergi tot workflow-ul?')) {
              onClear();
            }
          }}
          className="w-8 h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Save Status */}
        <div className="flex items-center gap-2 px-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isSaved ? "bg-emerald-500" : "bg-amber-500"
          )} />
          <span className="text-xs text-slate-500">
            {isSaved ? 'Salvat' : 'Modificat'}
          </span>
        </div>
      </div>
    </>
  );
};
