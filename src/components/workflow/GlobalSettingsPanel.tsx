import React from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';

interface GlobalSettingsPanelProps {
  preventInfiniteLoops: boolean;
  onPreventInfiniteLoopsChange: (value: boolean) => void;
}

export const GlobalSettingsPanel: React.FC<GlobalSettingsPanelProps> = ({
  preventInfiniteLoops,
  onPreventInfiniteLoopsChange,
}) => {
  return (
    <Card className="w-80 border-l border-slate-200 rounded-none h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Global settings</h3>
      </div>

      {/* Settings Content */}
      <div className="p-4 space-y-6">
        {/* Info Box */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            To disable a workflow, disconnect the start node.
          </p>
        </div>

        {/* Prevent Infinite Loops Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label 
              htmlFor="prevent-loops" 
              className="text-sm font-medium text-slate-900 cursor-pointer"
            >
              Prevent infinite loops
            </Label>
            <Switch
              id="prevent-loops"
              checked={preventInfiniteLoops}
              onCheckedChange={onPreventInfiniteLoopsChange}
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Prevents the workflow from continuously transiting in a loop when all conditions are true.
          </p>
        </div>
      </div>
    </Card>
  );
};
