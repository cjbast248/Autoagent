
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bot, Copy } from 'lucide-react';
import { VOICES, LANGUAGES } from '../constants/constants';

interface Step2Props {
  agentName: string;
  setAgentName: (name: string) => void;
  agentLanguage: string;
  setAgentLanguage: React.Dispatch<React.SetStateAction<string>>;
  selectedVoice: string;
  setSelectedVoice: React.Dispatch<React.SetStateAction<string>>;
  createdAgentId: string;
  onCreateAgent: () => void;
  onCopyAgentId: () => void;
  onNextStep: () => void;
  isCreating: boolean;
}

export const Step2AgentCreation: React.FC<Step2Props> = ({
  agentName,
  setAgentName,
  agentLanguage,
  setAgentLanguage,
  selectedVoice,
  setSelectedVoice,
  createdAgentId,
  onCreateAgent,
  onCopyAgentId,
  onNextStep,
  isCreating,
}) => {
  const canCreate = agentName.trim() !== '';
  const canProceed = createdAgentId !== '';

  return (
    <Card className="liquid-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Bot className="w-5 h-5 text-accent" />
          Pas 2: Creare Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="agent-name" className="text-foreground">
            Numele Agentului
          </Label>
          <Input
            id="agent-name"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Agent Consultant Site"
            className="glass-input"
          />
        </div>

        <div>
          <Label htmlFor="agent-language" className="text-foreground">
            Limba
          </Label>
          <Select value={agentLanguage} onValueChange={setAgentLanguage}>
            <SelectTrigger className="glass-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200">
              {LANGUAGES.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="voice-select" className="text-foreground">
            Vocea Agentului
          </Label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="glass-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200">
              {VOICES.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={onCreateAgent}
          disabled={!canCreate || isCreating}
          className="bg-foreground text-background hover:bg-foreground/90 w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Se Creează Agent
            </>
          ) : (
            'Creează Agent'
          )}
        </Button>

        {createdAgentId && (
          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent font-medium">
                  ✅ Agent creat cu succes!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ID Agent: {createdAgentId}
                </p>
              </div>
              <Button
                onClick={onCopyAgentId}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-accent/30 text-accent hover:bg-accent/10"
              >
                <Copy className="w-4 h-4" />
                Copiază ID
              </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
