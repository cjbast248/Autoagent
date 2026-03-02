import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages, Loader2, Save } from 'lucide-react';
import { LANGUAGE_MAP } from '@/constants/constants';
import { toast } from '@/components/ui/use-toast';
import { TranslationController } from '../controllers/TranslationController';
import { AgentResponse } from '../types/dtos';
import { VoiceController } from "@/controllers/VoiceController";

interface MultilingualFirstMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLanguage: string;
  additionalLanguages: string[];
  messages: Record<string, string>;
  onMessagesUpdate: (messages: Record<string, string>) => void;
  agentId?: string;
  agentData?: AgentResponse;
  onAgentDataRefresh?: (agentData: AgentResponse) => void;
}

const MultilingualFirstMessageModal: React.FC<MultilingualFirstMessageModalProps> = ({
  isOpen,
  onClose,
  defaultLanguage,
  additionalLanguages,
  messages,
  onMessagesUpdate,
  agentId,
  agentData,
  onAgentDataRefresh,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localMessages, setLocalMessages] = useState<Record<string, string>>(messages);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalMessages(messages);
    setHasChanges(false);
  }, [messages]);

  useEffect(() => {
    if (isOpen && !selectedLanguage) {
      setSelectedLanguage(defaultLanguage);
    }
  }, [isOpen, defaultLanguage]);

  const getLanguageLabel = (languageId: string) => {
    return LANGUAGE_MAP[languageId as keyof typeof LANGUAGE_MAP] || languageId;
  };

  const getLanguageDisplayName = (languageId: string) => {
    const languageName = getLanguageLabel(languageId);
    return `${languageName}`;
  };

  const allLanguages = [defaultLanguage, ...additionalLanguages];

  const handleMessageChange = (language: string, message: string) => {
    const updatedMessages = { ...localMessages, [language]: message };
    setLocalMessages(updatedMessages);
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!agentId || !agentData) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut identifica agentul pentru salvare.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare the update payload with only language_presets changes
      const updatePayload = VoiceController.prepareUpdatePayload(agentData, localMessages);

      // Make the API call to update the agent
      await VoiceController.updateAgent(agentId, updatePayload);

      toast({
        title: "Succes!",
        description: "Mesajele multilinguale au fost salvate cu succes.",
      });

      // Fetch fresh agent data to get the updated state
      const refreshedAgentData = await VoiceController.getAgent(agentId);

      // Extract the updated multilingual messages
      const updatedMessages: Record<string, string> = {};

      // Add default language message
      if (refreshedAgentData.conversation_config?.agent?.first_message) {
        updatedMessages[defaultLanguage] = refreshedAgentData.conversation_config.agent.first_message;
      }

      // Add messages from language presets
      if (refreshedAgentData.conversation_config?.language_presets) {
        Object.entries(refreshedAgentData.conversation_config.language_presets).forEach(([languageId, preset]) => {
          if (preset.overrides?.agent?.first_message) {
            updatedMessages[languageId] = preset.overrides.agent.first_message;
          } else if (preset.first_message_translation?.text) {
            updatedMessages[languageId] = preset.first_message_translation.text;
          }
        });
      }

      console.log("updatedMessages = " + JSON.stringify(updatedMessages))

      // Update local state with refreshed data
      setLocalMessages(updatedMessages);
      setHasChanges(false);

      // Update the parent component with the new messages
      onMessagesUpdate(updatedMessages);

      // Refresh the agent data on the edit page
      if (onAgentDataRefresh) {
        onAgentDataRefresh(refreshedAgentData);
      }

    } catch (error) {
      console.error('Error saving multilingual messages:', error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la salvarea mesajelor. Te rog încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        "Ai modificări nesalvate. Ești sigur că vrei să închizi fără să salvezi?"
      );
      if (!confirmClose) return;
    }
    setHasChanges(false);
    onClose();
  };

  const translateToAllLanguages = async () => {
    const defaultMessage = localMessages[defaultLanguage];
    if (!defaultMessage?.trim()) {
      toast({
        title: "Eroare",
        description: "Te rog introdu un mesaj în limba principală pentru a-l traduce.",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);

    try {
      // Use TranslationController.translateToMultipleLanguages for batch translation
      const request = {
        text: defaultMessage,
        fromLanguage: defaultLanguage,
        toLanguages: additionalLanguages,
      };
      const result = await TranslationController.translateToMultipleLanguages(request);
      const translations: Record<string, string> = {};
      if (result && Array.isArray(result.translations)) {
          for (const t of result.translations) {
              translations[t.targetLanguage] = t.translatedText;
          }
      }
      const updatedMessages = { ...localMessages, ...translations };
      console.log("updatedMessages = " + JSON.stringify(updatedMessages))
      setLocalMessages(updatedMessages);
      setHasChanges(true);
      
      toast({
        title: "Succes!",
        description: "Mesajele au fost traduse în toate limbile.",
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la traducere. Te rog încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Primul mesaj - Suport multilingual
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configurează primul mesaj pentru fiecare limbă disponibilă. Folosește traducerea automată pentru a genera mesajele în toate limbile.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-foreground">Limba selectată:</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-[250px] glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allLanguages.map((language) => (
                    <SelectItem key={language} value={language}>
                      {getLanguageDisplayName(language)}
                      {language === defaultLanguage && " (principală)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {additionalLanguages.length > 0 && (
              <Button
                onClick={translateToAllLanguages}
                disabled={isTranslating || !localMessages[defaultLanguage]?.trim()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Languages className="w-4 h-4" />
                )}
                Tradu automat în toate limbile
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Edit Panel */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="multilingual-message" className="text-foreground font-semibold">
                  Editează mesajul pentru {getLanguageDisplayName(selectedLanguage)}
                  {selectedLanguage === defaultLanguage && " (limba principală)"}
                </Label>
                <Textarea
                  id="multilingual-message"
                  value={localMessages[selectedLanguage] || ''}
                  onChange={(e) => handleMessageChange(selectedLanguage, e.target.value)}
                  className="glass-input min-h-[150px] mt-2"
                  placeholder={`Introdu primul mesaj în ${getLanguageLabel(selectedLanguage).toLowerCase()}...`}
                />
                {selectedLanguage === defaultLanguage && additionalLanguages.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Acest mesaj va fi folosit ca sursă pentru traducerea automată în celelalte limbi.
                  </p>
                )}
              </div>

              {hasChanges && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Ai modificări nesalvate. Apasă "Salvează modificările" pentru a le aplica.
                  </p>
                </div>
              )}
            </div>

            {/* Preview Panel */}
            <div className="space-y-4">
              <Label className="text-foreground font-semibold">Previzualizare toate limbile</Label>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {allLanguages.map((language) => (
                  <div key={language} className="p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {getLanguageDisplayName(language)}
                        {language === defaultLanguage && " (principală)"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLanguage(language)}
                        className="text-xs"
                      >
                        Editează
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground break-words">
                      {localMessages[language] || "Niciun mesaj configurat"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {hasChanges ? "Anulează" : "Închide"}
            </Button>
            
            <div className="flex gap-2">
              {hasChanges && (
                <Button 
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? "Se salvează..." : "Salvează modificările"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultilingualFirstMessageModal;
