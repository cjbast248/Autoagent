import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserAgents } from '@/hooks/useUserAgents';
import { Bot, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AgentSelectorProps {
  selectedAgentId: string;
  onAgentSelect: (agentId: string) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgentId,
  onAgentSelect,
}) => {
  const { data: agents, isLoading } = useUserAgents();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{t('outbound.loadingAgents')}</span>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        {t('outbound.noAgentsYet')}{' '}
        <a href="/account/kalina-agents" className="text-primary hover:underline">
          {t('outbound.kalinaAgents')}
        </a>{' '}
        {t('outbound.toCreateFirstAgent')}
      </div>
    );
  }

  return (
    <Select value={selectedAgentId} onValueChange={onAgentSelect}>
      <SelectTrigger className="w-full">
        <div className="flex items-center space-x-2">
          <Bot className="w-4 h-4 text-gray-500" />
          <SelectValue placeholder={t('outbound.selectAgent')} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.agent_id}>
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium">{agent.name}</span>
              </div>
              <div className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                agent.is_active 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {agent.is_active ? t('outbound.active') : t('outbound.inactive')}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};