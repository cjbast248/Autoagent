import React from 'react';
import { Phone } from 'lucide-react';
import { useActiveCalls } from '@/contexts/ActiveCallsContext';

export const GlobalCallIndicator: React.FC = () => {
  const { totalActiveCalls } = useActiveCalls();

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-full">
      <div className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-300"></span>
      </div>
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">System Idle</span>
      <span className="text-[10px] text-zinc-400">• <span className="text-zinc-700 font-bold">{totalActiveCalls}</span> active {totalActiveCalls === 1 ? 'call' : 'calls'}</span>
    </div>
  );
};

// Compact version for sidebar
export const GlobalCallIndicatorCompact: React.FC = () => {
  const { isMonitoring, totalActiveCalls } = useActiveCalls();

  if (!isMonitoring) return null;

  if (totalActiveCalls === 0) {
    return (
      <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-md">
        <div className="relative">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-500 animate-ping opacity-50" />
        </div>
        <span className="text-[10px] font-medium text-zinc-400">IDLE</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-md animate-pulse">
      <Phone className="w-3 h-3 text-green-400" />
      <span className="text-[10px] font-bold text-green-400">
        {totalActiveCalls} LIVE
      </span>
    </div>
  );
};

export default GlobalCallIndicator;
