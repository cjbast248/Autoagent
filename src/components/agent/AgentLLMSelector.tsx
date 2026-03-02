import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { LLM_GROUPS } from '@/constants/constants';
import { Cpu, X, BarChart2 } from 'lucide-react';

interface AgentLLMSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLLM: string;
  onSelect: (llm: string) => void;
}

export function AgentLLMSelector({ open, onOpenChange, selectedLLM, onSelect }: AgentLLMSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return LLM_GROUPS;

    const query = searchQuery.toLowerCase();
    return LLM_GROUPS.map(group => ({
      ...group,
      models: group.models.filter(model =>
        model.label.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query) ||
        group.group.toLowerCase().includes(query)
      )
    })).filter(group => group.models.length > 0);
  }, [searchQuery]);

  const providerCount = LLM_GROUPS.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[440px] sm:max-w-[440px] p-0 border-l border-zinc-100 bg-white"
      >
        <aside className="h-full flex flex-col pt-6 px-8">
          {/* Header */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xs font-bold text-black uppercase tracking-widest">Select Primary LLM</h2>
                <span className="text-[9px] text-zinc-300 font-mono">{providerCount} PROVIDERS</span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="text-zinc-300 hover:text-black transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Cpu className="w-3.5 h-3.5 text-zinc-300" />
              <input
                type="text"
                placeholder="Search model or provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-zinc-600 placeholder-zinc-300 border-none bg-transparent p-0 text-[13px] focus:outline-none"
              />
            </div>
          </div>

          {/* LLM List */}
          <div className="flex-1 overflow-y-auto pb-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {filteredGroups.map((group) => (
              <div key={group.group}>
                {/* Group Header */}
                <div className="text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider mb-3 mt-6 first:mt-0">
                  {group.group}
                </div>

                {/* Models */}
                {group.models.map((model: any) => {
                  const isSelected = selectedLLM === model.id;

                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        onSelect(model.id);
                        onOpenChange(false);
                      }}
                      className={`cursor-pointer group flex items-center justify-between mb-4 transition-all duration-200 ${
                        isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-100 hover:pl-0.5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Dot indicator */}
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : ''}`} />

                        <div>
                          {/* Model name with optional badge */}
                          <div className="flex items-center gap-2">
                            <span className={`text-sm transition ${
                              isSelected
                                ? 'font-bold text-black'
                                : 'font-medium text-zinc-600 group-hover:text-black'
                            }`}>
                              {model.label}
                            </span>

                            {model.badge && (
                              <span className="px-1 py-0.5 rounded bg-zinc-100 text-[8px] font-bold text-zinc-400">
                                {model.badge}
                              </span>
                            )}
                          </div>

                          {/* Description if available */}
                          {model.description && isSelected && (
                            <span className="text-[9px] text-zinc-400 block font-normal">
                              {model.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Latency and cost */}
                      {model.latency && model.cost && (
                        <div className="text-right">
                          <span className={`text-[10px] font-mono block transition ${
                            isSelected
                              ? 'text-black'
                              : 'text-zinc-400 group-hover:text-zinc-600'
                          }`}>
                            {model.latency}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-300 block">
                            {model.cost}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className="text-center text-zinc-300 text-sm py-8">
                No models found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-50 pb-4">
            <button
              className="flex items-center gap-2 text-[10px] font-bold text-zinc-300 hover:text-black transition uppercase tracking-widest"
            >
              <BarChart2 className="w-3 h-3" />
              View Detailed Costs
            </button>
          </div>
        </aside>

        {/* CSS for scrollbar */}
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </SheetContent>
    </Sheet>
  );
}
