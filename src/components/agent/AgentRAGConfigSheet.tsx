import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RAGConfig {
  max_chunks?: number;
  similarity_threshold?: number;
  enabled?: boolean;
  model?: string;
}

interface AgentRAGConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: RAGConfig;
  onChange: (config: RAGConfig) => void;
}

export const AgentRAGConfigSheet: React.FC<AgentRAGConfigSheetProps> = ({
  open,
  onOpenChange,
  config,
  onChange,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-white border-l border-gray-200">
        <SheetHeader>
          <SheetTitle className="text-gray-900">Configure RAG</SheetTitle>
          <SheetDescription className="text-gray-500">
            Configure Retrieval-Augmented Generation settings for the knowledge base.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Enable RAG */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <Label className="text-sm font-medium text-gray-900">Enable RAG</Label>
              <p className="text-xs text-gray-500 mt-1">Use knowledge base for agent responses</p>
            </div>
            <Switch
              checked={config.enabled ?? true}
              onCheckedChange={(checked) => onChange({ ...config, enabled: checked })}
              className="data-[state=checked]:bg-gray-900"
            />
          </div>

          {/* Max Chunks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-900">Max Chunks</Label>
              <span className="text-sm text-gray-500">{config.max_chunks ?? 5}</span>
            </div>
            <p className="text-xs text-gray-500">Maximum number of knowledge chunks to retrieve per query.</p>
            <Slider
              value={[config.max_chunks ?? 5]}
              onValueChange={(value) => onChange({ ...config, max_chunks: value[0] })}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
          </div>

          {/* Similarity Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-900">Similarity Threshold</Label>
              <span className="text-sm text-gray-500">{((config.similarity_threshold ?? 0.7) * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-gray-500">Minimum similarity score for retrieved chunks.</p>
            <Slider
              value={[config.similarity_threshold ?? 0.7]}
              onValueChange={(value) => onChange({ ...config, similarity_threshold: value[0] })}
              min={0.1}
              max={1}
              step={0.05}
              className="w-full"
            />
          </div>

          {/* Embedding Model */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">Embedding Model</Label>
            <Select
              value={config.model ?? 'default'}
              onValueChange={(value) => onChange({ ...config, model: value })}
            >
              <SelectTrigger className="h-10 border-gray-200 bg-white rounded-lg text-sm">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
