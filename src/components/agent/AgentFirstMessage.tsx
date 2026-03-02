
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Languages } from 'lucide-react';
import { LANGUAGE_MAP } from '@/constants/constants';
import {AgentResponse} from "@/types/dtos.ts";
import { useLanguage } from '@/contexts/LanguageContext';

interface AgentFirstMessageProps {
  agentData: AgentResponse;
  setAgentData: React.Dispatch<React.SetStateAction<AgentResponse | null>>;
  additionalLanguages: string[];
  onOpenMultilingualModal: () => void;
}

const AgentFirstMessage: React.FC<AgentFirstMessageProps> = ({ 
  agentData, 
  setAgentData, 
  additionalLanguages = [], 
  onOpenMultilingualModal 
}) => {
  const { t } = useLanguage();
  
  const getLanguageLabel = (languageId: string) => {
    return LANGUAGE_MAP[languageId as keyof typeof LANGUAGE_MAP] || languageId;
  };

  return (
    <Card className="bg-[#FAFAFA] border border-gray-200 rounded-xl shadow-sm">
      <CardHeader>
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <CardTitle className="text-gray-900">{t('agentEdit.firstMessage')}</CardTitle>
            <p className="text-xs text-gray-500">
              {t('agentEdit.firstMessageDesc')}
            </p>
          </div>
          {additionalLanguages.length > 0 && (
            <Button 
              onClick={onOpenMultilingualModal} 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 w-full lg:w-auto"
            >
              <Languages className="w-4 h-4" />
              {t('agentEdit.multilingualConfig')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <Label htmlFor="first-message" className="text-sm font-medium text-gray-700">
            {additionalLanguages.length > 0 && (
              <span className="text-xs text-gray-500 ml-2 block lg:inline">
                ({t('agentEdit.mainLanguage')}: {getLanguageLabel(agentData?.conversation_config?.agent?.language || 'en')})
              </span>
            )}
          </Label>
          <Textarea 
            id="first-message" 
            value={agentData.conversation_config?.agent?.first_message || ''} 
            onChange={(e) => setAgentData({
              ...agentData,
              conversation_config: {
                ...agentData.conversation_config,
                agent: {
                  ...agentData.conversation_config?.agent,
                  first_message: e.target.value
                }
              }
            })} 
            className="border border-gray-300 bg-white min-h-[120px] lg:min-h-[80px] text-sm rounded-lg" 
            placeholder={t('agentEdit.firstMessagePlaceholder')} 
          />
          {additionalLanguages.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {t('agentEdit.firstMessageNote')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentFirstMessage;
