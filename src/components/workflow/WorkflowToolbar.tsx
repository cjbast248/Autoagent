import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Play, Settings, Clock, Variable, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowToolbarProps {
  onSave: () => void;
  onRun: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onClear: () => void;
  zoom: number;
  isSaved: boolean;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  onSave,
  onRun,
  onZoomIn,
  onZoomOut,
  onFitView,
  onClear,
  zoom,
  isSaved,
}) => {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-3"
      style={{
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #2a2a2a',
      }}
    >
      {/* Left side - Workflow name and status */}
      <div className="flex items-center gap-4">
        <h2 className="text-white font-semibold text-base">My Workflow</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isSaved ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-xs" style={{ color: '#888' }}>
            {isSaved ? 'Saved' : 'Unsaved changes'}
          </span>
        </div>
      </div>

      {/* Center - Main action buttons */}
      <div className="flex items-center gap-2">
        {/* Execute Workflow - Main button */}
        <Button
          onClick={onRun}
          className="gap-2 text-white font-medium px-6 h-9"
          style={{
            backgroundColor: '#16a34a',
            border: 'none',
          }}
        >
          <Play className="w-4 h-4 fill-white" />
          Execute Workflow
        </Button>

        <div className="w-px h-6 mx-1" style={{ backgroundColor: '#333' }} />

        {/* Save */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          className="gap-2 text-white hover:bg-[#2a2a2a] h-9"
        >
          <Save className="w-4 h-4" />
          Save
        </Button>

        <div className="w-px h-6 mx-1" style={{ backgroundColor: '#333' }} />

        {/* Settings, Executions, Variables */}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
        >
          <Settings className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
        >
          <Clock className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
        >
          <Variable className="w-4 h-4" />
        </Button>
      </div>

      {/* Right side - Utility buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm('Clear entire workflow?')) {
              onClear();
              toast.success('Canvas cleared');
            }
          }}
          className="text-gray-400 hover:text-red-400 hover:bg-[#2a2a2a]"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
