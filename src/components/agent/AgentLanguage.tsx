import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LANGUAGES } from '@/constants/constants';
import { AgentResponse } from "@/types/dtos.ts";
import { useLanguage } from '@/contexts/LanguageContext';

interface AgentLanguageProps {
  agentData: AgentResponse;
  setAgentData: React.Dispatch<React.SetStateAction<AgentResponse | null>>;
}

const AgentLanguage: React.FC<AgentLanguageProps> = ({ agentData, setAgentData }) => {
  const { t } = useLanguage();
  
  return (
    <Card className="bg-[#FAFAFA] border border-gray-200 rounded-xl shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{t('agentEdit.agentLanguage')}</h3>
            <p className="text-xs text-gray-500">{t('agentEdit.agentLanguageDesc')}</p>
          </div>
          <div className="ml-4">
            <Select 
              value={agentData.conversation_config?.agent?.language || ''} 
              onValueChange={value => setAgentData({
                ...agentData,
                conversation_config: {
                  ...agentData.conversation_config,
                  agent: {
                    ...agentData.conversation_config?.agent,
                    language: value
                  }
                }
              })}
            >
              <SelectTrigger className="border border-gray-300 bg-white text-sm rounded-lg w-48">
                <SelectValue placeholder={t('agentEdit.selectLanguage')} />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <ScrollArea className="h-[200px]">
                  {LANGUAGES.map(language => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentLanguage;