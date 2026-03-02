import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Bot, Save, Upload, FileText, Trash2, TestTube, Database, Plus, Link2, Settings, X, Maximize2, Search, Filter, MessageSquare, Wrench } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCallHistory } from '@/hooks/useCallHistory';
import { calculateCostFromSeconds } from '@/utils/costCalculations';
import { toast } from '@/components/ui/use-toast';
import AgentTestModal from '@/components/AgentTestModal';
import AdditionalLanguagesSection from '@/components/AdditionalLanguagesSection';
import MultilingualFirstMessageModal from '@/components/MultilingualFirstMessageModal';
import { useEnhancedKnowledgeBase } from '@/hooks/useEnhancedKnowledgeBase';
import AgentGeneralInfo from '@/components/agent/AgentGeneralInfo';
import AgentLanguage from '@/components/agent/AgentLanguage';
import AgentSystemPrompt from '@/components/agent/AgentSystemPrompt';
import AgentFirstMessage from '@/components/agent/AgentFirstMessage';
import AgentToolConnection from '@/components/agent/AgentToolConnection';
import { AgentVoiceSelector } from '@/components/agent/AgentVoiceSelector';
import { AgentLanguageSelector } from '@/components/agent/AgentLanguageSelector';
import { AgentLLMSelector } from '@/components/agent/AgentLLMSelector';
import { AgentTimezoneSheet } from '@/components/agent/AgentTimezoneSheet';
import { AgentRAGConfigSheet } from '@/components/agent/AgentRAGConfigSheet';
import { AgentLiveMonitor } from '@/components/agent/AgentLiveMonitor';
import { AgentResponse, LanguagePreset } from "@/types/dtos.ts";
import { VoiceController } from "@/controllers/VoiceController";
import { VOICES, LLM_MODELS, LLM_GROUPS, LANGUAGES, DEFAULT_VALUES } from '@/constants/constants';
import ReactCountryFlag from 'react-country-flag';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/components/AuthContext';

// Get Open Peeps avatar URL from DiceBear (black and white)
const getOpenPeepsAvatar = (seed: string) => {
  return `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&skinColor=f5f5f5&clothingColor=000000,333333,666666&hairColor=000000,333333`;
};

// Grayscale backgrounds for avatar circles
const avatarBackgrounds = [
  'bg-gradient-to-br from-gray-200 to-gray-400',
  'bg-gradient-to-br from-gray-300 to-gray-500',
  'bg-gradient-to-br from-gray-100 to-gray-300',
  'bg-gradient-to-br from-gray-400 to-gray-600',
  'bg-gradient-to-br from-gray-200 to-gray-500',
];

const getAvatarBackground = (seed: string) => {
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarBackgrounds[hash % avatarBackgrounds.length];
};

const AgentEdit = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    agentId
  } = useParams<{
    agentId: string;
  }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [agentData, setAgentData] = useState<AgentResponse | null>(null);
  const [originalAgentData, setOriginalAgentData] = useState<AgentResponse | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [additionalLanguages, setAdditionalLanguages] = useState<string[]>([]);
  const [originalAdditionalLanguages, setOriginalAdditionalLanguages] = useState<string[]>([]);
  const [isMultilingualModalOpen, setIsMultilingualModalOpen] = useState(false);
  const [multilingualMessages, setMultilingualMessages] = useState<Record<string, string>>({});
  const [originalMultilingualMessages, setOriginalMultilingualMessages] = useState<Record<string, string>>({});
  const [selectedExistingDocId, setSelectedExistingDocId] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [activeTab, setActiveTab] = useState('agent');
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isFirstMessageModalOpen, setIsFirstMessageModalOpen] = useState(false);
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sidebar selector states
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const [isLLMSelectorOpen, setIsLLMSelectorOpen] = useState(false);
  const [isTimezoneSheetOpen, setIsTimezoneSheetOpen] = useState(false);
  const [isRAGConfigOpen, setIsRAGConfigOpen] = useState(false);
  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);

  // User's agents list for transfer_to_agent tool
  const [userAgents, setUserAgents] = useState<Array<{ id: string; name: string; elevenlabs_agent_id: string }>>([]);

  // Built-in Tools config state
  const [toolConfigOpen, setToolConfigOpen] = useState(false);
  const [editingToolKey, setEditingToolKey] = useState<string | null>(null);
  const [toolForm, setToolForm] = useState<{
    name: string;
    description: string;
    disable_interruptions: boolean;
    jsonMode: boolean;
    jsonText: string;
    // common optional fields depending on tool
    target_number?: string;
    whisper_message?: string;
    target_agent?: string;
    dtmf_tone?: string;
    timeout_seconds?: number;
    auto_end_call_on_voicemail?: boolean;
    end_message?: string;
    supported_languages?: string; // comma-separated
    skip_reason?: string;
    voicemail_message?: string;
    transfer_rules?: Array<{
      agent_id?: string;
      condition?: string;
      delay_ms?: number;
      transfer_message?: string;
      enable_first_message?: boolean;
    }>;
    human_transfer_rules?: Array<{
      transfer_type?: 'conference' | 'sip_refer';
      destination_type?: 'phone_number' | 'sip_uri';
      phone_number?: string;
      sip_uri?: string;
      condition?: string;
    }>;
  }>({ name: '', description: '', disable_interruptions: false, jsonMode: false, jsonText: '' });

  const BUILT_IN_TOOLS: Array<{ key: string; labelKey: string }> = [
    { key: 'end_call', labelKey: 'agentEdit.endCall' },
    { key: 'detect_language', labelKey: 'agentEdit.detectLanguage' },
    { key: 'skip_turn', labelKey: 'agentEdit.skipTurn' },
    { key: 'transfer_to_agent', labelKey: 'agentEdit.transferToAgent' },
    { key: 'transfer_to_number', labelKey: 'agentEdit.transferToNumber' },
    { key: 'play_keypad_tone', labelKey: 'agentEdit.playKeypadTone' },
    { key: 'voicemail_detection', labelKey: 'agentEdit.voicemailDetection' },
  ];

  const TOOL_DESCRIPTIONS: Record<string, string> = {
    end_call: 'Automatically terminate conversations when appropriate conditions are met.',
    detect_language: 'Enable the agent to detect and adapt to the user\'s preferred language.',
    skip_turn: 'Allow the agent to pause without speaking when appropriate.',
    transfer_to_agent: 'Route conversations between specialized AI agents.',
    transfer_to_number: 'Seamlessly hand off conversations to human operators via phone.',
    play_keypad_tone: 'Play DTMF tones to interact with automated phone systems.',
    voicemail_detection: 'Detect voicemail systems and optionally leave a message.',
  };

  const getBuiltInToolValue = (key: string): any => agentData?.conversation_config?.agent?.prompt?.built_in_tools?.[key];
  const isBuiltInToolEnabled = (key: string): boolean => {
    const val = getBuiltInToolValue(key);
    if (val === undefined || val === null) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'object') {
      if ('enabled' in val) return Boolean((val as any).enabled);
      return true; // treat presence of config object as enabled
    }
    return false;
  };
  const setBuiltInToolEnabled = (key: string, enabled: boolean) => {
    setAgentData(prev => {
      if (!prev) return prev;
      const current = prev.conversation_config?.agent?.prompt?.built_in_tools || {};
      const existing = (current as any)[key];
      let nextValue: any;
      if (!enabled) {
        nextValue = false;
      } else {
        if (typeof existing === 'object' && existing !== null) {
          nextValue = { ...existing, enabled: true };
        } else {
          nextValue = true;
        }
      }
      return {
        ...prev,
        conversation_config: {
          ...prev.conversation_config,
          agent: {
            ...prev.conversation_config.agent,
            prompt: {
              ...prev.conversation_config.agent.prompt,
              built_in_tools: {
                ...current,
                [key]: nextValue,
              },
            },
          },
        },
      };
    });
  };

  const openToolConfig = (key: string) => {
    setEditingToolKey(key);
    const val = getBuiltInToolValue(key);
    let name = '';
    let description = '';
    let disable_interruptions = false;
    // tool-specific defaults
    let target_number: string | undefined;
    let whisper_message: string | undefined;
    let target_agent: string | undefined;
    let dtmf_tone: string | undefined;
    let timeout_seconds: number | undefined;
    let auto_end_call_on_voicemail: boolean | undefined;
    let end_message: string | undefined;
    let supported_languages: string | undefined;
    let skip_reason: string | undefined;
    let voicemail_message: string | undefined;
    let transfer_rules: Array<any> | undefined;
    let human_transfer_rules: Array<any> | undefined;
    if (typeof val === 'object' && val) {
      name = (val as any).name || '';
      description = (val as any).description || '';
      disable_interruptions = Boolean((val as any).disable_interruptions);
      target_number = (val as any).number || (val as any).target_number;
      whisper_message = (val as any).whisper_message;
      // For transfer_to_agent, read agent_id from transfers array if present
      if (Array.isArray((val as any).transfers) && (val as any).transfers.length > 0) {
        target_agent = (val as any).transfers[0].agent_id;
      } else {
        target_agent = (val as any).agent_id || (val as any).target_agent;
      }
      dtmf_tone = (val as any).tone || (val as any).dtmf || (val as any).dtmf_tone;
      timeout_seconds = (val as any).timeout_seconds;
      auto_end_call_on_voicemail = (val as any).auto_end_call_on_voicemail;
      end_message = (val as any).message || (val as any).end_message;
      if (Array.isArray((val as any).languages)) {
        supported_languages = ((val as any).languages as string[]).join(', ');
      } else if (typeof (val as any).languages === 'string') {
        supported_languages = (val as any).languages;
      }
      skip_reason = (val as any).reason || (val as any).skip_reason;
      voicemail_message = (val as any).voicemail_message;
      transfer_rules = (val as any).rules || (val as any).transfer_rules || (val as any).transfers;
      human_transfer_rules = (val as any).human_transfer_rules;
    }
    if (!description) description = TOOL_DESCRIPTIONS[key] || '';
    const payload = typeof val === 'object' && val ? JSON.stringify(val, null, 2) : JSON.stringify({ enabled: true, name, description, disable_interruptions }, null, 2);
    setToolForm({ name, description, disable_interruptions, jsonMode: false, jsonText: payload, target_number, whisper_message, target_agent, dtmf_tone, timeout_seconds, auto_end_call_on_voicemail, end_message, supported_languages, skip_reason, voicemail_message, transfer_rules: transfer_rules || [], human_transfer_rules: human_transfer_rules || [] });
    setToolConfigOpen(true);
  };

  const saveToolConfig = () => {
    if (!editingToolKey) return;
    // Start with enabled flag and optional common fields
    let config: any = { enabled: true };
    if (toolForm.name) config.name = toolForm.name;
    if (toolForm.description) config.description = toolForm.description;
    if (toolForm.disable_interruptions) config.disable_interruptions = true;

    // inject per-tool fields when present and not editing raw JSON
    if (!toolForm.jsonMode) {
      switch (editingToolKey) {
        case 'transfer_to_number':
          if (toolForm.target_number) config.number = toolForm.target_number;
          if (toolForm.whisper_message) config.whisper_message = toolForm.whisper_message;
          if (toolForm.human_transfer_rules && toolForm.human_transfer_rules.length) config.human_transfer_rules = toolForm.human_transfer_rules;
          break;
        case 'transfer_to_agent':
          // transfer_to_agent requires transfers array format
          if (toolForm.target_agent) {
            config.transfers = [{
              agent_id: toolForm.target_agent,
              condition: 'When the user requests to be transferred to another agent or specialist.',
              delay_ms: 0,
              transfer_message: '',
              enable_transferred_agent_first_message: true
            }];
          }
          break;
        case 'play_keypad_tone':
          if (toolForm.dtmf_tone) config.tone = toolForm.dtmf_tone;
          break;
        case 'voicemail_detection':
          // Always include auto_end_call_on_voicemail (default false if undefined)
          config.auto_end_call_on_voicemail = toolForm.auto_end_call_on_voicemail ?? false;
          if (toolForm.voicemail_message) config.voicemail_message = toolForm.voicemail_message;
          break;
        case 'end_call':
          if (toolForm.end_message) config.message = toolForm.end_message;
          break;
        case 'detect_language':
          if (toolForm.supported_languages) {
            const arr = toolForm.supported_languages.split(',').map(s => s.trim()).filter(Boolean);
            if (arr.length) config.languages = arr;
          }
          break;
        case 'skip_turn':
          if (toolForm.skip_reason) config.reason = toolForm.skip_reason;
          break;
      }
    }
    if (toolForm.jsonMode) {
      try {
        const parsed = JSON.parse(toolForm.jsonText || '{}');
        config = parsed;
      } catch (e) {
        toast({ title: 'Invalid JSON', description: 'Please fix the JSON before saving', variant: 'destructive' });
        return;
      }
    }
    setAgentData(prev => {
      if (!prev) return prev;
      const current = prev.conversation_config?.agent?.prompt?.built_in_tools || {};
      return {
        ...prev,
        conversation_config: {
          ...prev.conversation_config,
          agent: {
            ...prev.conversation_config.agent,
            prompt: {
              ...prev.conversation_config.agent.prompt,
              built_in_tools: {
                ...current,
                [editingToolKey!]: config,
              },
            },
          },
        },
      };
    });
    setToolConfigOpen(false);
    setEditingToolKey(null);
    toast({
      title: "Tool configured",
      description: "Don't forget to save the agent to apply changes.",
    });
  };

  // Enhanced Knowledge Base Hook
  const {
    documents,
    existingDocuments,
    selectedExistingDocuments,
    isUpdating: isUpdatingKnowledge,
    isLoadingExisting,
    loadExistingDocuments,
    addExistingDocument,
    addTextDocument,
    addFileDocument,
    removeDocument,
    updateAgentKnowledgeBase,
    processAgentKnowledgeBase
  } = useEnhancedKnowledgeBase({
    agentId: agentId || '',
    onAgentRefresh: refreshedAgentData => {
      setAgentData(refreshedAgentData);
      const parsedAdditionalLanguages = parseAdditionalLanguagesFromResponse(refreshedAgentData);
      setAdditionalLanguages(parsedAdditionalLanguages);
    }
  });

  // Calls & metrics for Analysis
  const {
    callHistory
  } = useCallHistory();
  const agentName = (agentData?.name || '').trim();
  const agentCalls = callHistory.filter(c => (c.agent_name || '').trim() === agentName);
  const totalSeconds = agentCalls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const totalCost = calculateCostFromSeconds(totalSeconds);
  const avgSeconds = agentCalls.length ? Math.round(totalSeconds / agentCalls.length) : 0;
  const formatMMSS = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  // Helper function to parse additional languages from AgentResponse
  const parseAdditionalLanguagesFromResponse = (agentResponse: AgentResponse): string[] => {
    const currentLanguage = agentResponse.conversation_config?.agent?.language;
    const languagePresets = agentResponse.conversation_config?.language_presets;
    if (!languagePresets) return [];
    return Object.keys(languagePresets).filter(lang => lang !== currentLanguage);
  };

  // Remove current language from additional languages when it changes
  useEffect(() => {
    const currentLanguage = agentData?.conversation_config?.agent?.language;
    if (currentLanguage && additionalLanguages.includes(currentLanguage)) {
      setAdditionalLanguages(prev => prev.filter(lang => lang !== currentLanguage));
    }
  }, [agentData?.conversation_config?.agent?.language]);

  // Load user's agents for transfer_to_agent tool
  useEffect(() => {
    const loadUserAgents = async () => {
      if (!user) return;
      try {
        // Add 5s timeout to prevent hanging
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000)
        );
        const queryPromise = supabase
          .from('kalina_agents')
          .select('id, name, elevenlabs_agent_id')
          .eq('user_id', user.id)
          .order('name');

        const result = await Promise.race([queryPromise, timeoutPromise]);

        if (result && 'data' in result && result.data) {
          // Filter out current agent from the list
          setUserAgents(result.data.filter(a => a.elevenlabs_agent_id !== agentId));
        }
      } catch (err) {
        console.error('Error loading user agents:', err);
      }
    };
    loadUserAgents();
  }, [user, agentId]);

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!agentId) return;
      try {
        const data = await VoiceController.getAgent(agentId);

        // Note: We don't validate voice_id anymore because cloned voices are valid too
        // They won't exist in VOICES array but are still valid ElevenLabs voice IDs

        // Fetch agent data from local DB with 5s timeout to prevent hanging
        const localQueryPromise = supabase
          .from('kalina_agents')
          .select('id, name')
          .eq('elevenlabs_agent_id', agentId)
          .single();
        const localTimeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000)
        );
        const localResult = await Promise.race([localQueryPromise, localTimeoutPromise]);
        const localAgent = localResult && 'data' in localResult ? localResult.data : null;

        // Note: timezone column doesn't exist in kalina_agents table
        // Timezone is managed via conversation_config.agent.timezone from ElevenLabs

        setAgentData(data);
        setOriginalAgentData(JSON.parse(JSON.stringify(data))); // Deep copy

        const parsedAdditionalLanguages = parseAdditionalLanguagesFromResponse(data);
        setAdditionalLanguages(parsedAdditionalLanguages);
        setOriginalAdditionalLanguages([...parsedAdditionalLanguages]); // Copy

        try {
          await processAgentKnowledgeBase(data);
        } catch (kbError) {
          console.error('Error processing knowledge base:', kbError);
          toast({
            title: "Attention",
            description: "Could not process agent's knowledge base",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error fetching agent:', error);
        toast({
          title: "Error",
          description: "Could not load agent information",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAgentData();
  }, [agentId, processAgentKnowledgeBase]);

  // Initialize multilingual messages when agent data loads
  useEffect(() => {
    if (agentData?.conversation_config) {
      const defaultLanguage = agentData.conversation_config.agent?.language || 'en';
      const defaultFirstMessage = agentData.conversation_config.agent?.first_message || '';
      // Start with the default language and its first message
      const currentMessages: Record<string, string> = {
        [defaultLanguage]: defaultFirstMessage
      };

      // Add/override with language presets
      if (agentData.conversation_config.language_presets) {
        Object.entries(agentData.conversation_config.language_presets).forEach(([languageId, preset]) => {
          if (preset.overrides?.agent?.first_message) {
            currentMessages[languageId] = preset.overrides.agent.first_message;
          } else if (preset.first_message_translation?.text) {
            currentMessages[languageId] = preset.first_message_translation.text;
          }
        });
      }
      setMultilingualMessages(currentMessages);
      setOriginalMultilingualMessages(JSON.parse(JSON.stringify(currentMessages))); // Deep copy
    }
  }, [agentData]);

  // Detect changes by comparing current data with original data
  useEffect(() => {
    if (!agentData || !originalAgentData) {
      setHasChanges(false);
      return;
    }

    // Compare agent data
    const agentDataChanged = JSON.stringify(agentData) !== JSON.stringify(originalAgentData);

    // Compare additional languages
    const languagesChanged = JSON.stringify(additionalLanguages.sort()) !== JSON.stringify(originalAdditionalLanguages.sort());

    // Compare multilingual messages
    const messagesChanged = JSON.stringify(multilingualMessages) !== JSON.stringify(originalMultilingualMessages);

    // Check if NEW documents were added (not existing ones already saved)
    const newDocuments = documents.filter(doc => doc.type !== 'existing' && !doc.elevenLabsId);
    const documentsChanged = newDocuments.length > 0;
    const hasAnyChanges = agentDataChanged || languagesChanged || messagesChanged || documentsChanged;
    setHasChanges(hasAnyChanges);
  }, [agentData, originalAgentData, additionalLanguages, originalAdditionalLanguages, multilingualMessages, originalMultilingualMessages, documents]);

  // Handle additional languages change - add empty messages for new languages
  const handleAdditionalLanguagesChange = (newLanguages: string[]) => {
    setAdditionalLanguages(newLanguages);
    const defaultLanguage = agentData?.conversation_config?.agent?.language || 'en';
    const updatedMessages = {
      ...multilingualMessages
    };
    newLanguages.forEach(language => {
      if (!updatedMessages[language]) {
        updatedMessages[language] = '';
      }
    });
    Object.keys(updatedMessages).forEach(language => {
      if (language !== defaultLanguage && !newLanguages.includes(language)) {
        delete updatedMessages[language];
      }
    });
    setMultilingualMessages(updatedMessages);
  };
  const handleAgentDataRefresh = (refreshedAgentData: AgentResponse) => {
    // Validate and correct voice_id if it doesn't exist in VOICES array
    // Note: We don't reset voice_id anymore - cloned voices are valid ElevenLabs IDs
    setAgentData(refreshedAgentData);
    const parsedAdditionalLanguages = parseAdditionalLanguagesFromResponse(refreshedAgentData);
    setAdditionalLanguages(parsedAdditionalLanguages);
  };
  const handleSave = async () => {
    if (!agentId || !agentData) return;
    setIsSaving(true);
    try {
      const updatePayload = VoiceController.prepareUpdatePayload(agentData, multilingualMessages);
      const data = await VoiceController.updateAgent(agentId, updatePayload);
      handleAgentDataRefresh(data);

      // Update agent data in local database (name, voice, timezone)
      // We store timezone locally because ElevenLabs doesn't return it in GET response
      if (agentData.name) {
        const currentVoiceId = agentData.conversation_config?.tts?.voice_id;
        const currentTimezone = agentData.conversation_config?.agent?.timezone || null;
        // Check static VOICES first, otherwise it's a cloned voice
        const staticVoice = VOICES.find(v => v.id === currentVoiceId);
        const voiceName = staticVoice?.name || 'Cloned Voice';

        const {
          error: updateError
        } = await supabase.from('kalina_agents').update({
          name: agentData.name,
          voice_id: currentVoiceId,
          voice_name: voiceName,
          timezone: currentTimezone
        }).eq('elevenlabs_agent_id', agentId);
        if (updateError) {
          console.error('Error updating agent in database:', updateError);
        }
      }
      // Only update knowledge base if there are NEW documents to add
      const newDocsToAdd = documents.filter(doc => doc.type !== 'existing' && !doc.elevenLabsId);
      if (newDocsToAdd.length > 0) {
        await updateAgentKnowledgeBase(true);
      }

      // Reset original values after successful save
      setOriginalAgentData(JSON.parse(JSON.stringify(data)));
      setOriginalAdditionalLanguages([...additionalLanguages]);
      setOriginalMultilingualMessages(JSON.parse(JSON.stringify(multilingualMessages)));
      setHasChanges(false);
      toast({
        title: "Success!",
        description: "Agent saved successfully."
      });
    } catch (error: any) {
      console.error('Error saving agent:', error);
      console.error('Error details:', error?.message, error?.details);
      toast({
        title: "Error",
        description: error?.message || error?.details || "Could not save agent",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (same as ElevenLabs)
    const allowedTypes = ['.epub', '.pdf', '.docx', '.txt', '.html', '.md'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Unsupported file type",
        description: `Supported types are: ${allowedTypes.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 21MB, same as ElevenLabs)
    if (file.size > 21 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum allowed size is 21MB",
        variant: "destructive",
      });
      return;
    }

    const success = await addFileDocument(file);
    if (success) {
      event.target.value = '';
    }
  };
  const addManualDocument = async () => {
    if (!newDocName.trim() || !newDocContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in the name and content of the document.",
        variant: "destructive"
      });
      return;
    }
    const success = await addTextDocument(newDocName, newDocContent);
    if (success) {
      setNewDocName('');
      setNewDocContent('');
      setIsAddingDoc(false);
    }
  };
  const handleRemoveDocument = (id: string) => {
    removeDocument(id);
  };
  const handleUpdateKnowledgeBase = async () => {
    await updateAgentKnowledgeBase(false);
  };
  const handleAddExistingDocument = () => {
    if (!selectedExistingDocId) {
      toast({
        title: "Error",
        description: "Please select a document.",
        variant: "destructive"
      });
      return;
    }
    addExistingDocument(selectedExistingDocId);
    setSelectedExistingDocId('');
  };
  const handleCopyLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'The URL to the agent has been copied.'
      });
    } catch (_) { }
  };
  const getAvailableExistingDocuments = () => {
    return existingDocuments.filter(doc => !selectedExistingDocuments.has(doc.id));
  };
  const handleMultilingualMessagesUpdate = (messages: Record<string, string>) => {
    setMultilingualMessages(messages);
    const defaultLanguage = agentData?.conversation_config?.agent?.language || 'en';
    const defaultLanguageFirstMessage = messages[defaultLanguage];
    const sourceHash = JSON.stringify({
      firstMessage: defaultLanguageFirstMessage,
      language: defaultLanguage
    });
    const language_presets: {
      [key: string]: LanguagePreset;
    } = Object.entries(messages).filter(([lang]) => lang !== defaultLanguage).reduce((acc, [lang, firstMessageText]) => {
      acc[lang] = {
        overrides: {
          agent: {
            first_message: firstMessageText
          }
        },
        first_message_translation: {
          source_hash: sourceHash,
          text: firstMessageText
        }
      };
      return acc;
    }, {} as {
      [key: string]: LanguagePreset;
    });
    if (messages[defaultLanguage]) {
      setAgentData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          conversation_config: {
            ...prev.conversation_config,
            agent: {
              ...prev.conversation_config?.agent,
              first_message: messages[defaultLanguage]
            },
            tts: prev.conversation_config?.tts,
            asr: prev.conversation_config?.asr,
            turn: prev.conversation_config?.turn,
            conversation: prev.conversation_config?.conversation,
            language_presets: language_presets
          }
        };
      });
    }
  };
  const openMultilingualModal = () => {
    const defaultLanguage = agentData?.conversation_config?.agent?.language || 'en';
    const currentMessage = agentData?.conversation_config?.agent?.first_message || '';
    const initialMessages = {
      ...multilingualMessages,
      [defaultLanguage]: currentMessage
    };
    setMultilingualMessages(initialMessages);
    setIsMultilingualModalOpen(true);
  };
  if (isLoading) {
    return <DashboardLayout>
      <div className="flex-1 bg-zinc-50/50">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-600 rounded-full animate-spin" />
            <span className="text-sm text-zinc-500">Loading agent...</span>
          </div>
        </div>
      </div>
    </DashboardLayout>;
  }
  if (!agentData) {
    return <DashboardLayout>
      <div className="flex-1 bg-zinc-50/50">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-zinc-400" />
            </div>
            <span className="text-sm text-zinc-500">Agent not found</span>
          </div>
        </div>
      </div>
    </DashboardLayout>;
  }
  // Header styles
  const headerStyles = `
    .agentauto-header {
        height: 52px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid #e4e4e7;
        position: fixed; top: 0; right: 0;
        left: var(--sidebar-width, 16rem);
        z-index: 40;
    }
    .header-content {
        max-width: 1400px; margin: 0 auto; height: 100%;
        padding: 0 32px;
        display: flex; align-items: center; justify-content: space-between;
    }
    .back-btn {
        width: 32px; height: 32px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        color: #71717a; transition: all 0.2s; cursor: pointer;
        background: transparent; border: none;
    }
    .back-btn:hover { background: #f4f4f5; color: #000; }
    .divider { width: 1px; height: 24px; background: #e4e4e7; margin: 0 16px; }
    .page-title { font-size: 14px; font-weight: 600; color: #18181b; }
    .nav-tabs { display: flex; height: 100%; gap: 8px; }
    .tab-item {
        position: relative;
        display: flex; align-items: center;
        padding: 0 12px;
        font-size: 13px; font-weight: 500; color: #71717a;
        cursor: pointer; transition: color 0.2s;
        height: 100%;
        background: transparent; border: none;
    }
    .tab-item:hover { color: #000; }
    .tab-item.active { color: #000; font-weight: 600; }
    .tab-item.active::after {
        content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
        height: 2px; background: #000;
    }

    @media (max-width: 768px) {
        .agentauto-header {
            left: 0;
            top: 60px; /* Below the mobile header */
            padding: 0 16px;
            width: 100%;
        }
        .header-content {
            padding: 0;
            gap: 12px;
        }
        .page-title {
            display: none;
        }
        .nav-tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-right: 16px;
        }
        .nav-tabs::-webkit-scrollbar {
            display: none;
        }
        .tab-item {
            white-space: nowrap;
            padding: 0 12px;
            flex-shrink: 0;
        }
    }
    .action-btn {
        font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px;
        transition: all 0.2s; cursor: pointer;
    }
    .btn-ghost {
        background: #fff; border: 1px solid #e4e4e7; color: #18181b;
    }
    .btn-ghost:hover { border-color: #000; }
    .btn-primary {
        background: #000; border: 1px solid #000; color: #fff;
        display: flex; align-items: center; gap: 6px;
    }
    .btn-primary:hover { background: #27272a; transform: translateY(-1px); }
  `;

  return <DashboardLayout>
    <style>{headerStyles}</style>

    {/* Header */}
    <header className="agentauto-header">
      <div className="header-content">
        {/* Left Section */}
        <div className="flex items-center">
          <button className="back-btn" onClick={() => navigate('/account/kalina-agents')}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="divider" />
          {isEditingName ? (
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => {
                if (tempName.trim()) {
                  setAgentData({ ...agentData, name: tempName.trim() });
                }
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (tempName.trim()) {
                    setAgentData({ ...agentData, name: tempName.trim() });
                  }
                  setIsEditingName(false);
                } else if (e.key === 'Escape') {
                  setIsEditingName(false);
                  setTempName(agentData.name || '');
                }
              }}
              className="page-title border-none bg-transparent p-0 h-auto focus-visible:ring-0 w-auto"
              autoFocus
            />
          ) : (
            <h1
              className="page-title cursor-pointer hover:opacity-70 transition"
              onClick={() => {
                setTempName(agentData.name || '');
                setIsEditingName(true);
              }}
            >
              {agentData.name || 'Agent'}
            </h1>
          )}
        </div>

        {/* Center Tabs */}
        <div className="nav-tabs">
          <div
            onClick={() => setActiveTab('agent')}
            className={`tab-item ${activeTab === 'agent' ? 'active' : ''}`}
          >
            Agent
          </div>
          <div
            onClick={() => setActiveTab('knowledge')}
            className={`tab-item ${activeTab === 'knowledge' ? 'active' : ''}`}
          >
            Knowledge Base
          </div>
          <div
            onClick={() => setActiveTab('tools')}
            className={`tab-item ${activeTab === 'tools' ? 'active' : ''}`}
          >
            Tools
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button className="action-btn btn-ghost">
            Public
          </button>
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="action-btn btn-primary"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Preview
          </button>
        </div>
      </div>
    </header>

    {/* Main Content */}
    <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 md:px-8 py-10 mt-[52px]">
      {activeTab === 'agent' && (
        <div className="grid grid-cols-12 gap-6 md:gap-12">
          {/* Left Column - 8 cols */}
          <div className="col-span-12 lg:col-span-8 space-y-6 md:space-y-12">

            {/* System Prompt */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> System prompt
                </label>
                <button
                  onClick={() => setIsPromptModalOpen(true)}
                  className="text-[10px] font-bold text-zinc-400 hover:text-black transition flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" /> EXPAND
                </button>
              </div>

              <div className="border border-zinc-200 rounded-xl h-[200px] relative overflow-hidden bg-zinc-50 transition-all focus-within:bg-white focus-within:border-black focus-within:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] group">
                <Textarea
                  value={agentData.conversation_config?.agent?.prompt?.prompt || ''}
                  onChange={(e) => {
                    setAgentData(prev => prev ? {
                      ...prev,
                      conversation_config: {
                        ...prev.conversation_config,
                        agent: {
                          ...prev.conversation_config.agent,
                          prompt: {
                            ...prev.conversation_config.agent.prompt,
                            prompt: e.target.value
                          }
                        }
                      }
                    } : prev);
                  }}
                  placeholder="You are a helpful assistant."
                  spellCheck={false}
                  className="w-full h-full bg-transparent border-none outline-none resize-none py-5 px-4 text-sm text-zinc-800 leading-relaxed font-mono placeholder:text-zinc-300 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />

                {/* Character count */}
                <div className="absolute bottom-3 right-4 text-[9px] font-mono text-zinc-300 pointer-events-none group-focus-within:text-zinc-400 transition">
                  {(agentData.conversation_config?.agent?.prompt?.prompt || '').length} chars
                </div>
              </div>
            </div>

            {/* First Message */}
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> First message
              </label>
              <p className="text-[10px] text-zinc-400 mb-3 ml-6">The opening line the agent speaks when the call connects.</p>

              <div className="border border-zinc-200 rounded-xl p-1 relative bg-zinc-50 transition-all focus-within:bg-white focus-within:border-black group">
                <div className="bg-white rounded-lg p-4">
                  <Textarea
                    value={agentData.conversation_config?.agent?.first_message || ''}
                    onChange={(e) => {
                      setAgentData(prev => prev ? {
                        ...prev,
                        conversation_config: {
                          ...prev.conversation_config,
                          agent: {
                            ...prev.conversation_config.agent,
                            first_message: e.target.value
                          }
                        }
                      } : prev);
                    }}
                    placeholder="Type message..."
                    className="w-full bg-transparent border-none outline-none resize-none text-sm text-zinc-900 leading-relaxed h-10 font-medium focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-300"
                  />
                </div>
                <button
                  onClick={() => setIsFirstMessageModalOpen(true)}
                  className="absolute top-4 right-4 text-zinc-300 hover:text-black transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Column - 4 cols */}
          <div className="col-span-12 lg:col-span-4 space-y-8 pt-12">

            {/* Voice Engine */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Voice Engine</h3>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsLanguageSelectorOpen(false);
                  setIsLLMSelectorOpen(false);
                  setIsTimezoneSheetOpen(false);
                  setTimeout(() => setIsVoiceSelectorOpen(true), 10);
                }}
                className="w-full bg-white border border-zinc-200 rounded-xl p-3 flex items-center justify-between cursor-pointer group hover:border-zinc-400 hover:-translate-y-px hover:shadow-[0_4px_12px_-3px_rgba(0,0,0,0.05)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center">
                    <img
                      src={getOpenPeepsAvatar(agentData.conversation_config?.tts?.voice_id || VOICES[0]?.id || '')}
                      alt="Voice"
                      className="w-full h-full opacity-90 grayscale group-hover:grayscale-0 transition"
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-zinc-900">
                      {VOICES.find(v => v.id === agentData.conversation_config?.tts?.voice_id)?.name || (agentData.conversation_config?.tts?.voice_id ? 'Cloned Voice' : 'Select voice')}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">PRIMARY</span>
                  </div>
                </div>

                {/* Waveform animation */}
                <div className="flex items-center gap-0.5 h-4 pr-1">
                  <div className="w-0.5 bg-zinc-300 rounded group-hover:bg-black transition group-hover:animate-pulse" style={{ height: '4px' }} />
                  <div className="w-0.5 bg-zinc-300 rounded group-hover:bg-black transition group-hover:animate-pulse" style={{ height: '8px', animationDelay: '0.2s' }} />
                  <div className="w-0.5 bg-zinc-300 rounded group-hover:bg-black transition group-hover:animate-pulse" style={{ height: '6px', animationDelay: '0.1s' }} />
                  <div className="w-0.5 bg-zinc-300 rounded group-hover:bg-black transition group-hover:animate-pulse" style={{ height: '10px', animationDelay: '0.3s' }} />
                </div>
              </button>
            </div>

            {/* Language */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Language</h3>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsVoiceSelectorOpen(false);
                  setIsLLMSelectorOpen(false);
                  setIsTimezoneSheetOpen(false);
                  setTimeout(() => setIsLanguageSelectorOpen(true), 10);
                }}
                className="w-full bg-white border border-zinc-200 rounded-xl p-3 flex items-center justify-between cursor-pointer group hover:border-zinc-400 hover:-translate-y-px hover:shadow-[0_4px_12px_-3px_rgba(0,0,0,0.05)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-lg grayscale group-hover:grayscale-0 transition">
                    <ReactCountryFlag
                      countryCode={LANGUAGES.find(l => l.value === agentData.conversation_config?.agent?.language)?.countryCode || 'RO'}
                      svg
                      style={{ width: '24px', height: '18px' }}
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-zinc-900">
                      {LANGUAGES.find(l => l.value === agentData.conversation_config?.agent?.language)?.label || 'English'}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">DEFAULT</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-300 group-hover:text-black transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Intelligence (LLM) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Intelligence (LLM)</h3>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsVoiceSelectorOpen(false);
                  setIsLanguageSelectorOpen(false);
                  setIsTimezoneSheetOpen(false);
                  setTimeout(() => setIsLLMSelectorOpen(true), 10);
                }}
                className="w-full bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between cursor-pointer group hover:border-zinc-400 hover:-translate-y-px hover:shadow-[0_4px_12px_-3px_rgba(0,0,0,0.05)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-zinc-400 group-hover:text-black transition" />
                  <span className="text-sm font-bold text-zinc-900">
                    {LLM_MODELS.find(m => m.id === agentData.conversation_config?.agent?.prompt?.llm)?.label || 'Gemini 2.5 Flash'}
                  </span>
                </div>
                <svg className="w-4 h-4 text-zinc-300 group-hover:text-black transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Timezone */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Timezone</h3>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsVoiceSelectorOpen(false);
                  setIsLanguageSelectorOpen(false);
                  setIsLLMSelectorOpen(false);
                  setTimeout(() => setIsTimezoneSheetOpen(true), 10);
                }}
                className="w-full bg-white border border-zinc-200 rounded-xl p-3 flex items-center justify-between cursor-pointer group hover:border-zinc-400 hover:-translate-y-px hover:shadow-[0_4px_12px_-3px_rgba(0,0,0,0.05)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-zinc-500 group-hover:text-black transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-zinc-900">
                      {agentData.conversation_config?.agent?.timezone
                        ? agentData.conversation_config.agent.timezone.replace('_', '/')
                        : 'Auto-detect'}
                    </div>
                    {agentData.conversation_config?.agent?.timezone && (
                      <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                        {agentData.conversation_config.agent.timezone.split('/').pop()?.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-300 group-hover:text-black transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Live Monitor */}
            {agentId && (
              <div className="pt-4">
                <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between hover:border-zinc-400 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-900">Live Monitor</div>
                      <div className="text-[10px] text-zinc-400">Real-time logs</div>
                    </div>
                  </div>

                  <AgentLiveMonitor
                    agentId={agentId}
                    agentName={agentData.name || 'Agent'}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === 'knowledge' && (
        <div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept=".epub,.pdf,.docx,.txt,.html,.md"
            className="hidden"
          />

          {/* Header */}
          <div className="flex justify-between items-end mb-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-black">Knowledge Base</h2>
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-mono text-zinc-500 border border-zinc-200">VECTOR_STORE_INIT</span>
              </div>
              <p className="text-sm text-zinc-500">Upload documents to ground your agent in specific facts and procedures.</p>
            </div>

            <button className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-black transition uppercase tracking-wide">
              <Link2 className="w-4 h-4" /> Connect Web Source
            </button>
          </div>

          {/* Ingest Zone - Blueprint Style */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative w-full h-[400px] rounded-2xl bg-zinc-50 border border-dashed border-zinc-300 hover:border-black hover:bg-zinc-100/50 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center"
          >
            {/* Scanner Line Animation */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-black to-transparent opacity-0 group-hover:opacity-50 group-hover:animate-[scan_2s_linear_infinite]" style={{ '--tw-translate-y': '-100%' } as React.CSSProperties} />

            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-zinc-400 group-hover:border-black group-hover:w-4 group-hover:h-4 transition-all" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-zinc-400 group-hover:border-black group-hover:w-4 group-hover:h-4 transition-all" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-zinc-400 group-hover:border-black group-hover:w-4 group-hover:h-4 transition-all" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-zinc-400 group-hover:border-black group-hover:w-4 group-hover:h-4 transition-all" />

            {/* Upload Icon with Plus Badge */}
            <div className="mb-6 relative">
              <div className="w-20 h-20 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition duration-300">
                <Upload className="w-8 h-8 text-zinc-300 group-hover:text-black transition" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center border-4 border-zinc-50 shadow-lg">
                <Plus className="w-4 h-4" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-black mb-2">Ingest Data Source</h3>
            <p className="text-sm text-zinc-400 mb-8 max-w-sm mx-auto">
              Drag and drop files here to train your agent.<br />
              <span className="text-xs text-zinc-300">Supports text extraction and semantic vectorization.</span>
            </p>

            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="bg-black text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition shadow-lg shadow-zinc-200 mb-10"
            >
              Browse Files
            </button>

            {/* File Type Badges */}
            <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100 transition">
              {['EPUB', 'PDF', 'DOCX', 'TXT', 'HTML', 'MD'].map(type => (
                <span key={type} className="px-2 py-1 rounded-md bg-white text-[10px] font-mono text-zinc-400 border border-zinc-100">
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-4 flex justify-between items-center text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <span>Status: {documents.length > 0 ? `${documents.length} documents loaded` : 'Waiting for input'}</span>
            </div>
            <span>Capacity: Unlimited Tokens</span>
          </div>

          {/* Documents List (if any) */}
          {documents.length > 0 && (
            <div className="mt-8 border border-zinc-200 rounded-xl overflow-hidden bg-white">
              <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Ingested Documents</span>
                <span className="text-[10px] font-mono text-zinc-400">{documents.length} files</span>
              </div>
              <div className="divide-y divide-zinc-50">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50/70 cursor-pointer transition-colors"
                    onClick={() => setSelectedDocumentId(doc.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-zinc-900">{doc.name}</span>
                        <span className="ml-2 text-[10px] font-mono text-zinc-400 uppercase">{doc.type || 'TXT'}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDocument(doc.id);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Document Modal */}
          <Dialog open={isAddDocModalOpen} onOpenChange={setIsAddDocModalOpen}>
            <DialogContent className="max-w-sm p-6 gap-0 bg-white rounded-2xl overflow-hidden [&>button]:hidden">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-black">Add document</h2>
                <button onClick={() => setIsAddDocModalOpen(false)} className="text-zinc-400 hover:text-black transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { fileInputRef.current?.click(); setIsAddDocModalOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-50 transition text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center transition">
                    <Upload className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">Upload file</div>
                    <div className="text-xs text-zinc-500">PDF, TXT, DOC, MD</div>
                  </div>
                </button>
                <button
                  onClick={() => { setIsAddDocModalOpen(false); setIsAddingDoc(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-50 transition text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center transition">
                    <FileText className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">Add text</div>
                    <div className="text-xs text-zinc-500">Enter content manually</div>
                  </div>
                </button>
                <button
                  onClick={() => { loadExistingDocuments(); setIsAddDocModalOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-zinc-50 transition text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center transition">
                    <Database className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">Existing document</div>
                    <div className="text-xs text-zinc-500">From knowledge base</div>
                  </div>
                </button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Text Document Modal */}
          <Dialog open={isAddingDoc} onOpenChange={setIsAddingDoc}>
            <DialogContent className="max-w-lg p-0 gap-0 bg-white rounded-2xl overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-bold text-black mb-5">Add text document</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="doc-name-modal" className="text-sm font-bold text-zinc-700">Document name</Label>
                    <Input id="doc-name-modal" value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="e.g., Product FAQ" className="mt-2 h-11 border-zinc-200 rounded-lg" />
                  </div>
                  <div>
                    <Label htmlFor="doc-content-modal" className="text-sm font-bold text-zinc-700">Content</Label>
                    <Textarea id="doc-content-modal" value={newDocContent} onChange={e => setNewDocContent(e.target.value)} placeholder="Enter the document content..." className="mt-2 min-h-[200px] border-zinc-200 rounded-lg" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
                <button onClick={() => { setIsAddingDoc(false); setNewDocName(''); setNewDocContent(''); }} className="h-9 px-4 text-sm font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg transition">Cancel</button>
                <button onClick={() => { addManualDocument(); setIsAddingDoc(false); }} className="h-9 px-5 text-sm font-bold bg-black hover:bg-zinc-800 text-white rounded-lg transition">Add document</button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Document Preview Modal */}
          <Dialog open={!!selectedDocumentId} onOpenChange={() => setSelectedDocumentId(null)}>
            <DialogContent className="max-w-2xl p-0 gap-0 bg-white rounded-2xl overflow-hidden [&>button]:hidden">
              {selectedDocumentId && (() => {
                const doc = documents.find(d => d.id === selectedDocumentId);
                return doc ? (
                  <>
                    <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-zinc-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-black">{doc.name}</h2>
                          <p className="text-xs text-zinc-500 mt-0.5">{doc.type === 'text' ? 'Text document' : doc.type || 'Document'}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedDocumentId(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6 max-h-[60vh] overflow-auto">
                      {doc.content ? (
                        <p className="text-sm text-zinc-600 whitespace-pre-wrap leading-relaxed">{doc.content}</p>
                      ) : (
                        <p className="text-sm text-zinc-400 italic">No content available for this document.</p>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
                      <button onClick={() => { removeDocument(doc.id); setSelectedDocumentId(null); }} className="h-9 px-4 text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  </>
                ) : null;
              })()}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Tools Tab - With Side Panel Layout */}
      {activeTab === 'tools' && (
        <div className="flex h-full overflow-hidden -mx-8 -my-10">
          {/* Main Content - Tools List */}
          <div className={`flex-1 p-10 overflow-y-auto transition-all duration-400 ${toolConfigOpen ? 'pr-4' : ''}`} style={{ minWidth: '500px' }}>
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-[28px] font-bold text-zinc-900 mb-2">Agent Tools</h1>
              <p className="text-base text-zinc-500">Configure built-in tools to extend your agent's capabilities.</p>
            </div>

            {/* System Tools Section */}
            <div className="mb-10">
              <div className="flex items-center gap-2.5 mb-1.5">
                <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span className="text-base font-semibold text-zinc-900">System Tools</span>
                <span className="bg-zinc-100 text-zinc-500 text-xs px-2 py-1 rounded font-medium">
                  {BUILT_IN_TOOLS.filter(tool => isBuiltInToolEnabled(tool.key)).length} active tools
                </span>
              </div>
              <p className="text-sm text-zinc-500 ml-6">Allow the agent to perform built-in actions.</p>
            </div>

            {/* Tools List */}
            <div className="flex flex-col gap-3 max-w-[900px]">
              {BUILT_IN_TOOLS.map(tool => {
                const enabled = isBuiltInToolEnabled(tool.key);
                const description = TOOL_DESCRIPTIONS[tool.key] || '';
                const isSelected = editingToolKey === tool.key && toolConfigOpen;

                // Icons for each tool
                const getToolIcon = (key: string) => {
                  switch (key) {
                    case 'end_call':
                      return <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
                    case 'detect_language':
                      return <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
                    case 'skip_turn':
                      return <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>;
                    case 'transfer_to_agent':
                      return <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
                    case 'transfer_to_number':
                      return <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" /><polyline points="16 3 21 3 21 8" /><line x1="14" y1="10" x2="21" y2="3" /></svg>;
                    case 'play_keypad_tone':
                      return <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="8" cy="8" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="16" cy="8" r="1" /><circle cx="8" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="16" cy="12" r="1" /><circle cx="8" cy="16" r="1" /><circle cx="12" cy="16" r="1" /><circle cx="16" cy="16" r="1" /></svg>;
                    case 'voicemail_detection':
                      return <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5.5" cy="11.5" r="4.5" /><circle cx="18.5" cy="11.5" r="4.5" /><line x1="5.5" y1="16" x2="18.5" y2="16" /></svg>;
                    default:
                      return <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
                  }
                };

                const getToolLabel = (key: string) => {
                  switch (key) {
                    case 'end_call': return 'End Conversation';
                    case 'detect_language': return 'Detect Language';
                    case 'skip_turn': return 'Skip Turn';
                    case 'transfer_to_agent': return 'Transfer to Agent';
                    case 'transfer_to_number': return 'Transfer to Number';
                    case 'play_keypad_tone': return 'Play Keypad Touch Tone';
                    case 'voicemail_detection': return 'Voicemail Detection';
                    default: return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  }
                };

                return (
                  <div
                    key={tool.key}
                    className={`flex items-center justify-between p-4 px-5 rounded-xl border bg-white transition-all hover:shadow-sm ${isSelected ? 'border-black' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                  >
                    <div className="flex items-start gap-4 overflow-hidden">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                        {getToolIcon(tool.key)}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-[15px] font-semibold text-zinc-900 flex items-center gap-2 mb-1">
                          {getToolLabel(tool.key)}
                          {enabled && (
                            <span className="bg-green-100 text-green-700 text-[11px] px-1.5 py-0.5 rounded font-bold uppercase">
                              Active
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-zinc-500">{description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <button
                        onClick={() => openToolConfig(tool.key)}
                        className="bg-zinc-100 hover:bg-zinc-200 border-none px-4 py-2 rounded-md font-semibold text-[13px] text-zinc-900 transition cursor-pointer"
                      >
                        Configure
                      </button>
                      <label className="relative inline-block w-11 h-6 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => setBuiltInToolEnabled(tool.key, !enabled)}
                          className="opacity-0 w-0 h-0 peer"
                        />
                        <span className="absolute cursor-pointer inset-0 bg-zinc-200 transition-all duration-300 rounded-full peer-checked:bg-black before:absolute before:content-[''] before:h-5 before:w-5 before:left-0.5 before:bottom-0.5 before:bg-white before:transition-all before:duration-300 before:rounded-full before:shadow-md peer-checked:before:translate-x-5" />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Side Panel - Tool Configuration */}
          <div
            className={`bg-white border-l border-zinc-200 flex flex-col transition-all duration-400 overflow-hidden ${toolConfigOpen ? 'w-[550px]' : 'w-0'
              }`}
            style={{ boxShadow: toolConfigOpen ? '-5px 0 15px rgba(0,0,0,0.02)' : 'none' }}
          >
            {/* Panel Header */}
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center">
              <div className="flex items-center gap-2.5 text-base font-semibold text-zinc-900">
                <span className="border border-zinc-200 p-1.5 rounded-md">
                  <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                Edit system tool
              </div>
              <button
                onClick={() => { setToolConfigOpen(false); setEditingToolKey(null); }}
                className="text-zinc-400 hover:text-zinc-900 text-lg p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {/* Configuration Card */}
              <div className="border border-zinc-200 rounded-xl p-5 mb-6 bg-white">
                <h4 className="text-[15px] font-semibold text-zinc-900 mb-1">Configuration</h4>
                <p className="text-[13px] text-zinc-500 mb-5">Describe to the LLM how and when to use the tool.</p>

                <div className="mb-4">
                  <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={toolForm.name || editingToolKey || ''}
                    onChange={(e) => setToolForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[13px] font-semibold text-zinc-900">Description (optional)</label>
                    <button
                      onClick={() => setToolForm(prev => ({ ...prev, description: TOOL_DESCRIPTIONS[editingToolKey || ''] || '' }))}
                      className="text-xs text-zinc-900 font-semibold cursor-pointer hover:underline"
                    >
                      Show Default
                    </button>
                  </div>
                  <textarea
                    value={toolForm.description || ''}
                    onChange={(e) => setToolForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Leave blank to use the default optimized LLM prompt."
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 min-h-[100px] resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className="flex items-start gap-2.5 mt-5">
                  <input
                    type="checkbox"
                    id="disableInterruptions"
                    checked={toolForm.disable_interruptions || false}
                    onChange={(e) => setToolForm(prev => ({ ...prev, disable_interruptions: e.target.checked }))}
                    className="w-[18px] h-[18px] cursor-pointer mt-0.5"
                  />
                  <div>
                    <label htmlFor="disableInterruptions" className="text-sm font-medium text-zinc-900 cursor-pointer">
                      Disable interruptions
                    </label>
                    <p className="text-[13px] text-zinc-500 mt-0.5">
                      Select this box to disable interruptions while the tool is running.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tool-specific Configuration Cards */}
              {editingToolKey === 'end_call' && (
                <div className="border border-zinc-200 rounded-xl p-5 mb-6 bg-white">
                  <h4 className="text-[15px] font-semibold text-zinc-900 mb-1">End Call Configuration</h4>
                  <p className="text-[13px] text-zinc-500 mb-5">Configure the farewell message when ending calls.</p>
                  <div>
                    <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">Farewell Message (optional)</label>
                    <textarea
                      value={toolForm.end_message || ''}
                      onChange={(e) => setToolForm(prev => ({ ...prev, end_message: e.target.value }))}
                      placeholder="Thank you for calling. Goodbye!"
                      className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 min-h-[120px] resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <div className="inline-block bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md text-xs text-zinc-500 mt-2.5">
                      Type <strong>{'{}'}</strong> to add variables
                    </div>
                  </div>
                </div>
              )}

              {editingToolKey === 'detect_language' && (
                <div className="border border-zinc-200 rounded-xl p-5 mb-6 bg-white">
                  <h4 className="text-[15px] font-semibold text-zinc-900 mb-1">Language Detection Configuration</h4>
                  <p className="text-[13px] text-zinc-500 mb-5">Configure supported languages for detection.</p>
                  <div>
                    <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">Supported Languages</label>
                    <input
                      type="text"
                      value={toolForm.supported_languages || ''}
                      onChange={(e) => setToolForm(prev => ({ ...prev, supported_languages: e.target.value }))}
                      placeholder="en, es, fr, de, ro, ru"
                      className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <p className="text-[13px] text-zinc-500 mt-2.5 leading-relaxed">
                      Comma-separated list of language codes the agent can detect and switch to.
                    </p>
                  </div>
                </div>
              )}

              {editingToolKey === 'transfer_to_number' && (
                <div className="border border-zinc-200 rounded-xl p-5 mb-6 bg-white">
                  <h4 className="text-[15px] font-semibold text-zinc-900 mb-1">Transfer Configuration</h4>
                  <p className="text-[13px] text-zinc-500 mb-5">Configure phone transfer settings.</p>
                  <div className="mb-4">
                    <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">Transfer Phone Number</label>
                    <input
                      type="text"
                      value={toolForm.target_number || ''}
                      onChange={(e) => setToolForm(prev => ({ ...prev, target_number: e.target.value }))}
                      placeholder="+40123456789"
                      className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">Client Message (optional)</label>
                    <textarea
                      value={toolForm.whisper_message || ''}
                      onChange={(e) => setToolForm(prev => ({ ...prev, whisper_message: e.target.value }))}
                      placeholder="Please hold while I transfer you to a human agent..."
                      className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 min-h-[100px] resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <div className="inline-block bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md text-xs text-zinc-500 mt-2.5">
                      Type <strong>{'{}'}</strong> to add variables
                    </div>
                  </div>
                </div>
              )}

              {editingToolKey === 'transfer_to_agent' && (
                <div className="border border-zinc-200 rounded-xl p-5 mb-6 bg-white">
                  <h4 className="text-[15px] font-semibold text-zinc-900 mb-1">Agent Transfer Configuration</h4>
                  <p className="text-[13px] text-zinc-500 mb-5">Select the agent to transfer conversations to.</p>
                  <div>
                    <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">Target Agent</label>
                    {userAgents.length > 0 ? (
                      <Select
                        value={toolForm.target_agent || ''}
                        onValueChange={(value) => setToolForm(prev => ({ ...prev, target_agent: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an agent..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userAgents.map((agent) => (
                            <SelectItem key={agent.elevenlabs_agent_id} value={agent.elevenlabs_agent_id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-700">
                          No other agents found. Create another agent to enable transfer functionality.
                        </p>
                      </div>
                    )}
                    {toolForm.target_agent && (
                      <p className="text-xs text-zinc-400 mt-2 font-mono">
                        ID: {toolForm.target_agent}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {editingToolKey === 'play_keypad_tone' && (
                <div className="border border-zinc-200 rounded-xl p-5 mb-6 bg-white">
                  <h4 className="text-[15px] font-semibold text-zinc-900 mb-1">DTMF Tone Configuration</h4>
                  <p className="text-[13px] text-zinc-500 mb-5">Configure keypad touch tones.</p>
                  <div>
                    <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">DTMF Tone Sequence</label>
                    <input
                      type="text"
                      value={toolForm.dtmf_tone || ''}
                      onChange={(e) => setToolForm(prev => ({ ...prev, dtmf_tone: e.target.value }))}
                      placeholder="123#w456"
                      className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <p className="text-[13px] text-zinc-500 mt-2.5 leading-relaxed">
                      Valid characters: 0-9, *, #, w (500ms pause), W (1s pause).
                    </p>
                  </div>
                </div>
              )}

              {editingToolKey === 'voicemail_detection' && (
                <div className="border border-zinc-200 rounded-xl p-5 mb-6 bg-white">
                  <h4 className="text-[15px] font-semibold text-zinc-900 mb-1">Voicemail Configuration</h4>
                  <p className="text-[13px] text-zinc-500 mb-5">Configure the message to leave when voicemail is detected.</p>
                  <div>
                    <label className="block text-[13px] font-semibold text-zinc-900 mb-1.5">Voicemail Message (optional)</label>
                    <div className="relative">
                      <textarea
                        value={toolForm.voicemail_message || ''}
                        onChange={(e) => setToolForm(prev => ({ ...prev, voicemail_message: e.target.value }))}
                        placeholder="Hello, this is an automated call from our service. Please call us back at your convenience. Thank you."
                        className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 min-h-[120px] resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <div className="inline-block bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md text-xs text-zinc-500 mt-2.5">
                      Type <strong>{'{}'}</strong> to add variables
                    </div>
                    <p className="text-[13px] text-zinc-500 mt-4 leading-relaxed">
                      Leave blank to end the call immediately when voicemail is detected. If provided, this message will be played before ending the call.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end items-center bg-white">
              <div className="flex gap-2.5">
                <button
                  onClick={() => { setToolConfigOpen(false); setEditingToolKey(null); }}
                  className="bg-white border border-zinc-200 px-4 py-2 rounded-md font-semibold text-[13px] cursor-pointer hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveToolConfig}
                  className="bg-zinc-900 text-white border-none px-4 py-2 rounded-md font-semibold text-[13px] cursor-pointer hover:bg-zinc-800"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selector Sheets */}
      <AgentVoiceSelector
        open={isVoiceSelectorOpen}
        onOpenChange={setIsVoiceSelectorOpen}
        selectedVoiceId={agentData.conversation_config?.tts?.voice_id || ''}
        onSelect={(voiceId) => {
          setAgentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              conversation_config: {
                ...prev.conversation_config,
                tts: {
                  ...prev.conversation_config.tts,
                  voice_id: voiceId
                }
              }
            };
          });
        }}
        ttsSettings={{
          model_id: agentData.conversation_config?.tts?.model_id,
          stability: agentData.conversation_config?.tts?.stability,
          speed: agentData.conversation_config?.tts?.speed,
          similarity_boost: agentData.conversation_config?.tts?.similarity_boost
        }}
        onTTSSettingsChange={(settings) => {
          setAgentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              conversation_config: {
                ...prev.conversation_config,
                tts: {
                  ...prev.conversation_config.tts,
                  ...settings
                }
              }
            };
          });
        }}
      />
      <AgentLanguageSelector
        open={isLanguageSelectorOpen}
        onOpenChange={setIsLanguageSelectorOpen}
        selectedLanguage={agentData.conversation_config?.agent?.language || 'ro'}
        onSelect={(language) => {
          setAgentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              conversation_config: {
                ...prev.conversation_config,
                agent: {
                  ...prev.conversation_config.agent,
                  language: language
                }
              }
            };
          });
        }}
      />
      <AgentLLMSelector
        open={isLLMSelectorOpen}
        onOpenChange={setIsLLMSelectorOpen}
        selectedLLM={agentData.conversation_config?.agent?.prompt?.llm || 'gemini-1.5-flash'}
        onSelect={(llm) => {
          setAgentData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              conversation_config: {
                ...prev.conversation_config,
                agent: {
                  ...prev.conversation_config.agent,
                  prompt: {
                    ...prev.conversation_config.agent.prompt,
                    llm: llm
                  }
                }
              }
            };
          });
        }}
      />
      <AgentTimezoneSheet
        open={isTimezoneSheetOpen}
        onOpenChange={setIsTimezoneSheetOpen}
        selectedTimezone={agentData.conversation_config?.agent?.timezone || ''}
        onSelect={(timezone) => {
          setAgentData(prev => prev ? {
            ...prev,
            conversation_config: {
              ...prev.conversation_config,
              agent: {
                ...prev.conversation_config.agent,
                timezone: timezone
              },
              tts: prev.conversation_config?.tts
            }
          } : prev);
        }}
      />
      <AgentRAGConfigSheet
        open={isRAGConfigOpen}
        onOpenChange={setIsRAGConfigOpen}
        config={{
          enabled: (agentData.platform_settings as any)?.rag?.enabled ?? true,
          max_chunks: (agentData.platform_settings as any)?.rag?.max_chunks ?? 5,
          similarity_threshold: (agentData.platform_settings as any)?.rag?.similarity_threshold ?? 0.7,
          model: (agentData.platform_settings as any)?.rag?.model ?? 'default',
        }}
        onChange={(config) => {
          setAgentData(prev => prev ? {
            ...prev,
            platform_settings: {
              ...prev.platform_settings,
              rag: config
            } as any
          } : prev);
        }}
      />
    </main>

    {/* Test Modal */}
    <AgentTestModal agent={agentData} isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} />

    {/* Multilingual First Message Modal */}
    <MultilingualFirstMessageModal isOpen={isMultilingualModalOpen} onClose={() => setIsMultilingualModalOpen(false)} defaultLanguage={agentData?.conversation_config?.agent?.language || 'en'} additionalLanguages={additionalLanguages} messages={multilingualMessages} onMessagesUpdate={handleMultilingualMessagesUpdate} agentId={agentId} agentData={agentData} onAgentDataRefresh={handleAgentDataRefresh} />

    {/* System Prompt Expanded Modal */}
    <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 gap-0 bg-white rounded-2xl overflow-hidden [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900">System Prompt</h2>
            <button
              onClick={() => setIsPromptModalOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-hidden flex flex-col p-6">
            <Textarea
              value={agentData?.conversation_config?.agent?.prompt?.prompt || ''}
              onChange={(e) => {
                setAgentData(prev => prev ? {
                  ...prev,
                  conversation_config: {
                    ...prev.conversation_config,
                    agent: {
                      ...prev.conversation_config.agent,
                      prompt: {
                        ...prev.conversation_config.agent.prompt,
                        prompt: e.target.value
                      }
                    }
                  }
                } : prev);
              }}
              placeholder="You are a helpful assistant."
              className="flex-1 text-sm text-zinc-700 bg-transparent border-0 p-0 resize-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 overflow-auto placeholder:text-zinc-400"
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>

    {/* First Message Expanded Modal */}
    <Dialog open={isFirstMessageModalOpen} onOpenChange={setIsFirstMessageModalOpen}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 gap-0 bg-white rounded-2xl overflow-hidden [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="text-base font-semibold text-zinc-900">First Message</h2>
            <button
              onClick={() => setIsFirstMessageModalOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-hidden flex flex-col p-6">
            <Textarea
              value={agentData?.conversation_config?.agent?.first_message || ''}
              onChange={(e) => {
                setAgentData(prev => prev ? {
                  ...prev,
                  conversation_config: {
                    ...prev.conversation_config,
                    agent: {
                      ...prev.conversation_config.agent,
                      first_message: e.target.value
                    }
                  }
                } : prev);
              }}
              placeholder="Hello! How can I help you today?"
              className="flex-1 text-sm text-zinc-700 bg-transparent border-0 p-0 resize-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 overflow-auto placeholder:text-zinc-400"
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>

    {/* Unsaved Changes Bottom Bar - Zen style */}
    {hasChanges && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-4 bg-white border border-zinc-200 rounded-2xl shadow-xl px-5 py-3">
          <div className="flex items-center gap-2.5 text-sm text-zinc-700">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">Unsaved changes</span>
          </div>
          <div className="w-px h-5 bg-zinc-200" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChangesModalOpen(true)}
              className="h-8 px-4 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 px-5 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* View Changes Modal */}
    <Dialog open={isChangesModalOpen} onOpenChange={setIsChangesModalOpen}>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] p-0 gap-0 bg-white rounded-2xl overflow-hidden [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Changes Preview</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Review your modifications before saving</p>
            </div>
            <button
              onClick={() => setIsChangesModalOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content - Changes List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(() => {
              const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];

              // Check name
              if (agentData?.name !== originalAgentData?.name) {
                changes.push({
                  field: 'Name',
                  oldValue: originalAgentData?.name || '(empty)',
                  newValue: agentData?.name || '(empty)'
                });
              }

              // Check system prompt
              const oldPrompt = originalAgentData?.conversation_config?.agent?.prompt?.prompt || '';
              const newPrompt = agentData?.conversation_config?.agent?.prompt?.prompt || '';
              if (oldPrompt !== newPrompt) {
                changes.push({
                  field: 'System Prompt',
                  oldValue: oldPrompt.slice(0, 100) + (oldPrompt.length > 100 ? '...' : '') || '(empty)',
                  newValue: newPrompt.slice(0, 100) + (newPrompt.length > 100 ? '...' : '') || '(empty)'
                });
              }

              // Check first message
              const oldFirstMsg = originalAgentData?.conversation_config?.agent?.first_message || '';
              const newFirstMsg = agentData?.conversation_config?.agent?.first_message || '';
              if (oldFirstMsg !== newFirstMsg) {
                changes.push({
                  field: 'First Message',
                  oldValue: oldFirstMsg.slice(0, 100) + (oldFirstMsg.length > 100 ? '...' : '') || '(empty)',
                  newValue: newFirstMsg.slice(0, 100) + (newFirstMsg.length > 100 ? '...' : '') || '(empty)'
                });
              }

              // Check voice
              const oldVoice = originalAgentData?.conversation_config?.tts?.voice_id || '';
              const newVoice = agentData?.conversation_config?.tts?.voice_id || '';
              if (oldVoice !== newVoice) {
                const oldVoiceName = VOICES.find(v => v.id === oldVoice)?.name || oldVoice || '(none)';
                const newVoiceName = VOICES.find(v => v.id === newVoice)?.name || newVoice || '(none)';
                changes.push({
                  field: 'Voice',
                  oldValue: oldVoiceName,
                  newValue: newVoiceName
                });
              }

              // Check language
              const oldLang = originalAgentData?.conversation_config?.agent?.language || '';
              const newLang = agentData?.conversation_config?.agent?.language || '';
              if (oldLang !== newLang) {
                const oldLangName = LANGUAGES.find(l => l.value === oldLang)?.label || oldLang || '(none)';
                const newLangName = LANGUAGES.find(l => l.value === newLang)?.label || newLang || '(none)';
                changes.push({
                  field: 'Language',
                  oldValue: oldLangName,
                  newValue: newLangName
                });
              }

              // Check LLM
              const oldLLM = originalAgentData?.conversation_config?.agent?.prompt?.llm || '';
              const newLLM = agentData?.conversation_config?.agent?.prompt?.llm || '';
              if (oldLLM !== newLLM) {
                const oldLLMName = LLM_MODELS.find(m => m.id === oldLLM)?.label || oldLLM || '(none)';
                const newLLMName = LLM_MODELS.find(m => m.id === newLLM)?.label || newLLM || '(none)';
                changes.push({
                  field: 'LLM Model',
                  oldValue: oldLLMName,
                  newValue: newLLMName
                });
              }

              // Check timezone
              const oldTz = originalAgentData?.conversation_config?.agent?.timezone || '';
              const newTz = agentData?.conversation_config?.agent?.timezone || '';
              if (oldTz !== newTz) {
                changes.push({
                  field: 'Timezone',
                  oldValue: oldTz || 'Auto-detect',
                  newValue: newTz || 'Auto-detect'
                });
              }

              // Check additional languages
              if (JSON.stringify(additionalLanguages.sort()) !== JSON.stringify(originalAdditionalLanguages.sort())) {
                changes.push({
                  field: 'Additional Languages',
                  oldValue: originalAdditionalLanguages.join(', ') || '(none)',
                  newValue: additionalLanguages.join(', ') || '(none)'
                });
              }

              // Check documents - only count NEW documents (not existing ones already saved)
              const newDocuments = documents.filter(doc => doc.type !== 'existing' && !doc.elevenLabsId);
              if (newDocuments.length > 0) {
                changes.push({
                  field: 'Knowledge Base',
                  oldValue: '(no new documents)',
                  newValue: `+${newDocuments.length} document(s) to add`
                });
              }

              if (changes.length === 0) {
                return (
                  <div className="text-center py-8 text-zinc-400">
                    <p>No changes detected</p>
                  </div>
                );
              }

              return changes.map((change, index) => (
                <div key={index} className="border border-zinc-100 rounded-xl p-4 bg-zinc-50/50">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    {change.field}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-medium text-red-500 mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Before
                      </div>
                      <div className="text-sm text-zinc-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-mono text-xs break-all">
                        {change.oldValue}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-green-600 mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        After
                      </div>
                      <div className="text-sm text-zinc-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2 font-mono text-xs break-all">
                        {change.newValue}
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
            <button
              onClick={() => {
                setAgentData(originalAgentData);
                setAdditionalLanguages(originalAdditionalLanguages);
                setMultilingualMessages(originalMultilingualMessages);
                setHasChanges(false);
                setIsChangesModalOpen(false);
              }}
              className="h-9 px-4 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Discard All
            </button>
            <button
              onClick={() => {
                setIsChangesModalOpen(false);
                handleSave();
              }}
              disabled={isSaving}
              className="h-9 px-5 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

  </DashboardLayout>;
};
export default AgentEdit;