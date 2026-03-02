
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy } from 'lucide-react';

import { useClipboard } from '@/hooks/useClipboard';
import CreativitySelector from '@/components/CreativitySelector';
import TimezoneSelector from '@/components/TimezoneSelector';
import {AgentResponse} from "@/types/dtos.ts";

interface AgentGeneralInfoProps {
  agentData: AgentResponse;
  setAgentData: React.Dispatch<React.SetStateAction<AgentResponse | null>>;
}

const AgentGeneralInfo: React.FC<AgentGeneralInfoProps> = ({ agentData, setAgentData }) => {
  const { copyToClipboard } = useClipboard();

  const handleCreativityChange = (temperature: number) => {
    setAgentData({
      ...agentData,
      conversation_config: {
        ...agentData.conversation_config,
        agent: {
          ...agentData.conversation_config?.agent,
          prompt: {
            ...agentData.conversation_config?.agent?.prompt,
            temperature: temperature
          }
        }
      }
    });
  };

  return (
    <Card className="bg-[#FAFAFA] border border-gray-200 rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-gray-900">Informații Generale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="agent-name" className="text-sm font-medium text-gray-700">Numele Agentului</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="agent-name" 
              value={agentData.name || ''} 
              onChange={e => setAgentData({
                ...agentData,
                name: e.target.value
              })} 
              className="border border-gray-300 bg-white text-sm rounded-lg" 
            />
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(agentData.name)} className="border border-gray-300 bg-white">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>



        <div className="w-full">
          <CreativitySelector 
            value={agentData.conversation_config?.agent?.prompt?.temperature ?? 0.5} 
            onChange={handleCreativityChange} 
          />
        </div>

        <TimezoneSelector
          value={agentData.conversation_config?.agent?.timezone || ''}
          onChange={(timezone) => setAgentData({
            ...agentData,
            conversation_config: {
              ...agentData.conversation_config,
              agent: {
                ...agentData.conversation_config?.agent,
                timezone: timezone
              }
            }
          })}
        />
      </CardContent>
    </Card>
  );
};

export default AgentGeneralInfo;
