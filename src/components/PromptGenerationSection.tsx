import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Loader2, Globe, Wand2 } from 'lucide-react';
import { VOICES, LANGUAGES, DEFAULT_VALUES } from '../constants/constants';
import { AgentCreationStatusDisplay } from './AgentCreationStatusDisplay.tsx';
import { supabase } from '@/integrations/supabase/client';

interface PromptGenerationSectionProps {
  // Form state
  websiteUrl: string;
  setWebsiteUrl: React.Dispatch<React.SetStateAction<string>>;
  additionalPrompt: string;
  setAdditionalPrompt: React.Dispatch<React.SetStateAction<string>>;
  generatedPrompt: string;
  setGeneratedPrompt: React.Dispatch<React.SetStateAction<string>>;
  agentName: string;
  setAgentName: React.Dispatch<React.SetStateAction<string>>;
  agentLanguage: string;
  setAgentLanguage: React.Dispatch<React.SetStateAction<string>>;
  selectedVoice: string;
  setSelectedVoice: React.Dispatch<React.SetStateAction<string>>;

  // Actions
  onCreateAgent: () => void;
  onCopyAgentId: () => void;

  // Status
  isCreatingAgent: boolean;
  isGeneratingPrompt: boolean;
  createdAgentId: string;
}

export const PromptGenerationSection: React.FC<PromptGenerationSectionProps> = ({
                                                                                   websiteUrl,
                                                                                   setWebsiteUrl,
                                                                                   additionalPrompt,
                                                                                   setAdditionalPrompt,
                                                                                   generatedPrompt,
                                                                                   setGeneratedPrompt,
                                                                                   agentName,
                                                                                   setAgentName,
                                                                                   agentLanguage,
                                                                                   setAgentLanguage,
                                                                                   selectedVoice,
                                                                                   setSelectedVoice,
                                                                                   onCreateAgent,
                                                                                   onCopyAgentId,
                                                                                   isCreatingAgent,
                                                                                   isGeneratingPrompt,
                                                                                   createdAgentId,
                                                                                 }) => {
  
  const handleGeneratePrompt = async () => {
    if (!websiteUrl) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-agent-prompt', {
        body: { websiteUrl }
      });
      
      if (error) throw error;
      
      if (data.success && data.prompt) {
        setGeneratedPrompt(data.prompt);
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
    }
  };
  const renderButtonContent = (): React.ReactNode => {
    if (isCreatingAgent) {
      return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Se Generează Agent
          </>
      );
    }

    if (isGeneratingPrompt) {
      return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Se Generează Prompt
          </>
      );
    }

    return 'Generează Agent';
  };

  const isFormDisabled = isCreatingAgent || isGeneratingPrompt || !websiteUrl || !agentName;

  return (
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="w-5 h-5 text-accent" />
            Pas 1: Generează Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="website-url" className="text-foreground">
              URL Site Web
            </Label>
            <Input
                id="website-url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="glass-input"
            />
          </div>

          <div>
            <Label htmlFor="prompt-aditional" className="text-foreground">
              Prompt Aditional
            </Label>
            <Input
                id="prompt-aditional"
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="De exemplu: Atrage atentia ca in urmatoarele 3 luni avem reducere 30%"
                className="glass-input"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleGeneratePrompt}
              disabled={!websiteUrl || isGeneratingPrompt}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isGeneratingPrompt ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Se generează...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generează Prompt
                </>
              )}
            </Button>
          </div>

          <div>
            <Label htmlFor="generated-prompt" className="text-foreground">
              Prompt Generat (Opțional) *
            </Label>
            <Textarea
              id="generated-prompt"
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              placeholder="Aici va fi generat prompt-ul pentru agent pe baza site-ului analizat..."
              className="glass-input min-h-[200px] text-sm"
              rows={8}
            />
            <p className="text-xs text-muted-foreground mt-1">
              * Prompt-ul va fi generat automat pe baza analizei site-ului sau îl poți edita manual
            </p>
          </div>

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
              disabled={isFormDisabled}
              className="bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center"
          >
            {renderButtonContent()}
          </Button>

          <AgentCreationStatusDisplay
              agentId={createdAgentId}
              onCopyAgentId={onCopyAgentId}
          />
        </CardContent>
      </Card>
  );
};

