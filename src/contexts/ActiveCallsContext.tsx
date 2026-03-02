import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

interface ActiveCall {
  conversation_id: string;
  agent_id: string;
  agent_name?: string;
  status: 'active' | 'ringing' | 'ended';
  caller_number?: string;
  started_at: string;
}

interface ActiveCallsContextType {
  activeCalls: ActiveCall[];
  isMonitoring: boolean;
  monitoredAgents: Map<string, string>; // agentId -> agentName
  startMonitoring: (agentId: string, agentName: string) => void;
  stopMonitoring: (agentId: string) => void;
  totalActiveCalls: number;
}

const ActiveCallsContext = createContext<ActiveCallsContextType | undefined>(undefined);

export const useActiveCalls = () => {
  const context = useContext(ActiveCallsContext);
  if (!context) {
    throw new Error('useActiveCalls must be used within ActiveCallsProvider');
  }
  return context;
};

const STORAGE_KEY = 'agentauto_monitored_agents';

// Load from localStorage
const loadMonitoredAgents = (): Map<string, string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.error('Error loading monitored agents:', e);
  }
  return new Map();
};

// Save to localStorage
const saveMonitoredAgents = (agents: Map<string, string>) => {
  try {
    const obj = Object.fromEntries(agents);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Error saving monitored agents:', e);
  }
};

export const ActiveCallsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [monitoredAgents, setMonitoredAgents] = useState<Map<string, string>>(() => loadMonitoredAgents());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAllActiveCalls = useCallback(async () => {
    if (!user || monitoredAgents.size === 0) return;

    const allCalls: ActiveCall[] = [];

    for (const [agentId, agentName] of monitoredAgents.entries()) {
      try {
        const { data, error } = await supabase.functions.invoke('get-agent-active-calls', {
          body: { agentId }
        });

        // Silently ignore errors - edge function might not be deployed yet
        if (error) continue;

        if (data?.conversations) {
          const now = new Date();
          const filtered = data.conversations
            .filter((conv: { started_at: string }) => {
              const startedAt = new Date(conv.started_at);
              const ageSeconds = (now.getTime() - startedAt.getTime()) / 1000;
              return ageSeconds < 120;
            })
            .map((conv: ActiveCall) => ({
              ...conv,
              agent_name: agentName
            }));
          allCalls.push(...filtered);
        }
      } catch {
        // Silently ignore - edge function might not be deployed
      }
    }

    setActiveCalls(allCalls);
  }, [user, monitoredAgents]);

  // Start/stop polling based on monitored agents
  useEffect(() => {
    if (monitoredAgents.size > 0) {
      // Initial fetch
      fetchAllActiveCalls();

      // Start polling
      pollingIntervalRef.current = setInterval(() => {
        fetchAllActiveCalls();
      }, 3000);
    } else {
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setActiveCalls([]);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [monitoredAgents, fetchAllActiveCalls]);

  const startMonitoring = useCallback((agentId: string, agentName: string) => {
    setMonitoredAgents(prev => {
      const next = new Map(prev);
      next.set(agentId, agentName);
      saveMonitoredAgents(next);
      return next;
    });
  }, []);

  const stopMonitoring = useCallback((agentId: string) => {
    setMonitoredAgents(prev => {
      const next = new Map(prev);
      next.delete(agentId);
      saveMonitoredAgents(next);
      return next;
    });
  }, []);

  return (
    <ActiveCallsContext.Provider
      value={{
        activeCalls,
        isMonitoring: monitoredAgents.size > 0,
        monitoredAgents,
        startMonitoring,
        stopMonitoring,
        totalActiveCalls: activeCalls.length,
      }}
    >
      {children}
    </ActiveCallsContext.Provider>
  );
};
