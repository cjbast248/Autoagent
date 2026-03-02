import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Globe, ArrowRight } from 'lucide-react';

interface Step1PromptGenerationProps {
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  additionalPrompt: string;
  setAdditionalPrompt: (prompt: string) => void;
  generatedPrompt: string;
  setGeneratedPrompt: (prompt: string) => void;
  onGeneratePrompt: () => void;
  onNextStep: () => void;
  isGenerating: boolean;
  isPromptGenerated?: boolean;
}

export const Step1PromptGeneration: React.FC<Step1PromptGenerationProps> = ({
                                                                               websiteUrl,
                                                                               setWebsiteUrl,
                                                                               additionalPrompt,
                                                                               setAdditionalPrompt,
                                                                               generatedPrompt,
                                                                               setGeneratedPrompt,
                                                                               onGeneratePrompt,
                                                                               onNextStep,
                                                                               isGenerating,
                                                                               isPromptGenerated = false,
                                                                             }) => {
  // Updated logic: button is enabled only if:
  // 1. Website URL is provided
  // 2. Generated prompt field has content
  // 3. Prompt was successfully generated (or manually entered)
  const canProceed = websiteUrl.trim() !== '' &&
      generatedPrompt.trim() !== '' &&
      (isPromptGenerated || generatedPrompt.trim() !== '');

  return (
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="w-5 h-5 text-accent" />
            Pas 1: Configurare Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="website-url" className="text-foreground">
              URL Site Web *
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
            <Label htmlFor="additional-prompt" className="text-foreground">
              Prompt Aditional
            </Label>
            <Textarea
                id="additional-prompt"
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="De exemplu: Atrage atenția că în următoarele 3 luni avem reducere 30%"
                className="glass-input"
                rows={3}
            />
          </div>

          <div>
            <Label htmlFor="generated-prompt" className="text-foreground">
              Prompt Generat (Opțional) *
            </Label>
            <Textarea
                id="generated-prompt"
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                placeholder="Prompt-ul generat va apărea aici sau poți scrie unul manual..."
                className="glass-input"
                rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
                onClick={onGeneratePrompt}
                disabled={isGenerating || !websiteUrl.trim()}
                variant="outline"
                className="glass-button border-border"
            >
              {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Se Generează...
                  </>
              ) : (
                  'Generează Prompt'
              )}
            </Button>

            <Button
                onClick={onNextStep}
                disabled={!canProceed}
                className="bg-accent text-white hover:bg-accent/90"

            >
              Următorul Pas
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            * Câmpurile marcate sunt obligatorii pentru a continua. Prompt-ul trebuie generat cu succes sau completat manual.
          </p>
        </CardContent>
      </Card>
  );
};
