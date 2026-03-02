
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AgentResponse } from "@/types/dtos.ts";
import { useInputSanitization } from '@/hooks/useInputSanitization';
import { useAuth } from '@/components/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface AgentSystemPromptProps {
  agentData: AgentResponse;
  setAgentData: React.Dispatch<React.SetStateAction<AgentResponse | null>>;
}

const AgentSystemPrompt: React.FC<AgentSystemPromptProps> = ({ agentData, setAgentData }) => {
  const { sanitizeSystemPrompt } = useInputSanitization();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Check if user is banned/restricted
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const isRestricted = userProfile?.account_type === 'banned';

  const handlePromptChange = (value: string) => {
    const sanitizedValue = sanitizeSystemPrompt(value);
    setAgentData({
      ...agentData,
      conversation_config: {
        ...agentData.conversation_config,
        agent: {
          ...agentData.conversation_config?.agent,
          prompt: {
            ...agentData.conversation_config?.agent?.prompt,
            prompt: sanitizedValue
          }
        }
      }
    });
  };

  return (
    <Card className="bg-[#FAFAFA] border border-gray-200 rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900">{t('agentEdit.systemPrompt')}</CardTitle>
        <p className="text-xs text-gray-500">{t('agentEdit.systemPromptDesc')} <span className="underline cursor-pointer">{t('agentEdit.learnMore')}</span></p>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <Textarea 
            id="system-prompt" 
            value={agentData.conversation_config?.agent?.prompt?.prompt || ''} 
            onChange={e => handlePromptChange(e.target.value)}
            className="border border-gray-300 bg-white min-h-[300px] w-full text-sm rounded-lg" 
            placeholder={isRestricted ? t('agentEdit.accountRestricted') : t('agentEdit.systemPromptPlaceholder')}
            disabled={isRestricted}
            readOnly={isRestricted}
          />
          {isRestricted && (
            <p className="text-sm text-amber-600 mt-2">
              {t('agentEdit.promptEditingRestricted')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentSystemPrompt;
