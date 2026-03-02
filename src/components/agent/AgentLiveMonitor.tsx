import React, { useState } from 'react';
import { Radio, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/utils/utils';
import { useActiveCalls } from '@/contexts/ActiveCallsContext';

interface AgentLiveMonitorProps {
  agentId: string;
  agentName: string;
}

export const AgentLiveMonitor: React.FC<AgentLiveMonitorProps> = ({
  agentId,
  agentName,
}) => {
  const { startMonitoring, stopMonitoring, monitoredAgents, activeCalls } = useActiveCalls();
  const [isLoading, setIsLoading] = useState(false);

  const isMonitoring = monitoredAgents.has(agentId);
  const activeCount = activeCalls.filter(c => c.agent_id === agentId).length;

  const toggleMonitoring = (enabled: boolean) => {
    if (enabled) {
      setIsLoading(true);
      startMonitoring(agentId, agentName);
      // Small delay to show loading state
      setTimeout(() => setIsLoading(false), 500);
    } else {
      stopMonitoring(agentId);
    }
  };

  // Note: No cleanup on unmount - monitoring persists across navigation

  // Custom toggle switch exact din mockup
  return (
    <label className="flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={isMonitoring}
        onChange={(e) => toggleMonitoring(e.target.checked)}
        disabled={isLoading}
        className="hidden"
      />
      <div className={cn(
        "relative w-11 h-6 rounded-full transition-colors",
        isMonitoring ? "bg-black" : "bg-zinc-200"
      )}>
        <div className={cn(
          "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
          isMonitoring ? "translate-x-[22px]" : "translate-x-0.5"
        )} />
      </div>
      {isLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-400 ml-2" />}
    </label>
  );
};

export default AgentLiveMonitor;
