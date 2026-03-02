import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';
import { useCallInitiation } from '@/hooks/useCallInitiation';
import { useCallHistory } from '@/hooks/useCallHistory';
import { useUserPhoneNumbers } from '@/hooks/useUserPhoneNumbers';
import { useUserAgents } from '@/hooks/useUserAgents';
import { toast } from '@/hooks/use-toast';
import { Phone, Upload, History, Settings, Play, Zap, Users, BarChart3, CheckCircle2, RotateCcw, FolderOpen, ChevronLeft, Clock, Search, Download, Table2, Plus, Trash2, Pencil, Pause, Square, Layers, ArrowLeft, Bot, UploadCloud, Rocket, ChevronDown, Variable, AlertTriangle, ExternalLink, Check, X, RefreshCw, Wifi } from 'lucide-react';
import { VoiceController } from '@/controllers/VoiceController';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

// Import refactored components
import { OutboundHeader } from '@/components/outbound/OutboundHeader';
import { CallHistoryTab } from '@/components/outbound/CallHistoryTab';
import { BatchStatusPanel } from '@/components/outbound/BatchStatusPanel';
import { ContactsList } from '@/components/outbound/ContactsList';
import { CSVUploadSection } from '@/components/outbound/CSVUploadSection';
interface Contact {
  id: string;
  name: string;
  phone: string;
  phones?: string[]; // All phone numbers for this contact
  language: string;
  location: string;
  email?: string;
  info?: string;
  status?: string;
  raion?: string;
  // Store all original CSV columns
  extraFields?: Record<string, string>;
  // Dynamic variables to send to agent
  dynamicVariables?: Record<string, string>;
}
interface SMSConfig {
  enabled: boolean;
  apiToken: string;
  senderId: string;
  message: string;
  delay: number;
}
interface RetrySettings {
  enabled: boolean;
  retryMinutes: number;
  maxRetries: number;
}
// Parse CSV line handling quoted values with commas
const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last field
  values.push(current.trim());

  return values;
};

// Normalize phone numbers to international format +373XXXXXXXX
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove + from middle if exists (e.g., +(373))
  if (cleaned.includes('+') && !cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/\+/g, '');
  }

  // Remove leading + for processing
  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.substring(1);
  }

  // Skip if too short to be a valid phone number
  if (cleaned.length < 6) {
    return '';
  }

  // If starts with 0 and has 9 digits (Moldovan mobile: 079416481 or landline: 022383527)
  if (/^0\d{8}$/.test(cleaned)) {
    return '+373' + cleaned.substring(1);
  }

  // If starts with 0 and has 10 digits (some formats)
  if (/^0\d{9}$/.test(cleaned)) {
    return '+373' + cleaned.substring(1);
  }

  // If starts with 373 (already has country code)
  if (/^373\d{8}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  // If has only 8 digits (79416481 or 22383527 - without leading 0)
  if (/^\d{8}$/.test(cleaned)) {
    return '+373' + cleaned;
  }

  // If has only 6-7 digits (short landline like 383527)
  if (/^\d{6,7}$/.test(cleaned)) {
    // Assume Chișinău area code 22
    return '+37322' + cleaned;
  }

  // For Romanian numbers starting with 4 (40...)
  if (/^40\d{9}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  // For other international formats, just ensure + prefix
  if (cleaned.length >= 10) {
    return '+' + cleaned;
  }

  return '';
};

// Extract all phone numbers from a text that might contain multiple numbers
const extractPhoneNumbers = (text: string): string[] => {
  if (!text) return [];

  // Split by common separators: comma, semicolon, newline, or multiple spaces
  const parts = text.split(/[,;\n]|\s{2,}/);
  const phones: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Skip if it looks like a coordinate (contains decimal point)
    if (trimmed.includes('.')) continue;

    // Skip if it's too long to be a phone number (coordinates can be long)
    if (trimmed.replace(/\D/g, '').length > 15) continue;

    // Check if this part looks like a phone number (has digits)
    if (/\d/.test(trimmed)) {
      const normalized = normalizePhoneNumber(trimmed);
      if (normalized && normalized.length >= 10 && normalized.length <= 16) {
        phones.push(normalized);
      }
    }
  }

  return phones;
};

// Custom Dropdown Component - Sidebar Style
interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface CustomDropdownProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  searchPlaceholder?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  icon,
  placeholder,
  value,
  onChange,
  options,
  searchPlaceholder = 'Caută...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.sublabel?.toLowerCase().includes(search.toLowerCase())
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
          isOpen
            ? 'bg-white border-zinc-300 shadow-lg'
            : 'bg-zinc-50 border-zinc-100 hover:border-zinc-200 hover:bg-white'
        }`}
      >
        <span className={`${selectedOption ? 'text-zinc-700' : 'text-zinc-400'}`}>
          {icon}
        </span>
        <span className={`flex-1 text-left text-sm ${selectedOption ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-zinc-200 shadow-xl overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-zinc-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 border border-zinc-100 rounded-lg focus:outline-none focus:border-zinc-300 focus:bg-white transition"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">
                Nu s-a găsit nimic
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors ${
                    option.value === value ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${option.value === value ? 'bg-blue-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${option.value === value ? 'text-blue-700 font-medium' : 'text-zinc-700'}`}>
                      {option.label}
                    </div>
                    {option.sublabel && (
                      <div className="text-[10px] text-zinc-400 truncate">
                        {option.sublabel}
                      </div>
                    )}
                  </div>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Outbound = () => {
  const { t } = useLanguage();
  const {
    user
  } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(() => {
    // If we have saved contacts, go directly to create view
    try {
      const saved = localStorage.getItem('outbound_contacts');
      const contacts = saved ? JSON.parse(saved) : [];
      return contacts.length > 0 ? 'create' : null;
    } catch {
      return null;
    }
  });
  const [isDragOver, setIsDragOver] = useState(false);

  // Load csvHeaders from localStorage
  const [csvHeaders, setCsvHeaders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('outbound_csvHeaders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [contactLists, setContactLists] = useState<Array<{ id: string; name: string; contact_count: number }>>([]);
  const [showFolderDialog, setShowFolderDialog] = useState(false);

  // Load batchName from localStorage
  const [batchName, setBatchName] = useState(() => {
    try {
      const saved = localStorage.getItem('outbound_batchName');
      return saved || 'Untitled Batch';
    } catch {
      return 'Untitled Batch';
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('outbound_currentBatchId') || null;
    } catch {
      return null;
    }
  });
  const [activeBatchInfo, setActiveBatchInfo] = useState<{
    id: string;
    name: string;
    agentName: string;
    recipientCount: number;
    contacts: Contact[];
  } | null>(() => {
    try {
      const saved = localStorage.getItem('outbound_activeBatchInfo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // State for configuration - persist to localStorage
  const [selectedAgentId, setSelectedAgentId] = useState(() => {
    try {
      return localStorage.getItem('outbound_selectedAgentId') || '';
    } catch {
      return '';
    }
  });
  const [selectedPhoneId, setSelectedPhoneId] = useState(() => {
    try {
      return localStorage.getItem('outbound_selectedPhoneId') || '';
    } catch {
      return '';
    }
  });

  // Load contacts from localStorage on init
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('outbound_contacts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('outbound_selectedContacts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [batchStartTime, setBatchStartTime] = useState<Date | undefined>();
  const [smsConfig, setSmsConfig] = useState<SMSConfig>({
    enabled: false,
    apiToken: '',
    senderId: 'aichat',
    message: '',
    delay: 2
  });
  const [retrySettings, setRetrySettings] = useState<RetrySettings>({
    enabled: false,
    retryMinutes: 10,
    // Changed default from 15 to 10 minutes
    maxRetries: 2 // Default 2 retries maximum (3 total attempts)
  });
  const [concurrentCalls, setConcurrentCalls] = useState(1);

  // Variables for Agent system
  const [selectedVariables, setSelectedVariables] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('outbound_selectedVariables');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [agentPrompt, setAgentPrompt] = useState<string>('');
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [agentName, setAgentName] = useState<string>('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);
  const [fullAgentData, setFullAgentData] = useState<any>(null);
  const [draggingVariable, setDraggingVariable] = useState<string | null>(null);
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
  const [webhookSyncStatus, setWebhookSyncStatus] = useState<'idle' | 'synced' | 'error'>('idle');
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastCursorPositionRef = useRef<number>(0);

  // Helper to insert variable at cursor position
  const insertVariableAtCursor = (variable: string) => {
    const pos = lastCursorPositionRef.current;
    console.log('Inserting variable at position:', pos, 'text length:', editedPrompt.length);
    const newText = editedPrompt.slice(0, pos) + variable + editedPrompt.slice(pos);
    setEditedPrompt(newText);
    // Update cursor position for next insert
    const newPos = pos + variable.length;
    lastCursorPositionRef.current = newPos;
    // Focus and set cursor position
    setTimeout(() => {
      const textarea = promptTextareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = newPos;
      }
    }, 0);
  };

  // When entering edit mode, set cursor to end
  useEffect(() => {
    if (isEditingPrompt && editedPrompt) {
      lastCursorPositionRef.current = editedPrompt.length;
      setTimeout(() => {
        const textarea = promptTextareaRef.current;
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = editedPrompt.length;
        }
      }, 10);
    }
  }, [isEditingPrompt]);

  // Sync webhook for agent to enable real-time call status updates
  const syncAgentWebhook = async () => {
    if (!selectedAgentId) {
      toast({
        title: "Selectează un agent",
        description: "Trebuie să selectezi un agent pentru a sincroniza webhook-ul",
        variant: "destructive"
      });
      return;
    }

    setIsSyncingWebhook(true);
    setWebhookSyncStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('sync-single-agent-webhook', {
        body: { agentId: selectedAgentId }
      });

      if (error) {
        console.error('Webhook sync error:', error);
        setWebhookSyncStatus('error');
        toast({
          title: "Eroare la sincronizare",
          description: error.message || "Nu s-a putut configura webhook-ul",
          variant: "destructive"
        });
        return;
      }

      console.log('🔴 Webhook synced successfully:', data);
      setWebhookSyncStatus('synced');
      toast({
        title: "Webhook sincronizat!",
        description: "Acum vei primi actualizări în timp real când apelurile se termină"
      });

      // Reset status after 5 seconds
      setTimeout(() => setWebhookSyncStatus('idle'), 5000);
    } catch (err: any) {
      console.error('Webhook sync exception:', err);
      setWebhookSyncStatus('error');
      toast({
        title: "Eroare",
        description: err.message || "Eroare necunoscută",
        variant: "destructive"
      });
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  // Schedule settings
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleTimeSlots, setScheduleTimeSlots] = useState<Array<{ startTime: string; endTime: string }>>([
    { startTime: '09:00', endTime: '18:00' }
  ]);
  // State for scheduled batches waiting to start
  const [isScheduledWaiting, setIsScheduledWaiting] = useState(false);
  const scheduleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingBatchRef = useRef<{ contacts: Contact[], agentId: string } | null>(null);

  // Refs to avoid stale closures in interval callbacks
  const scheduleModeRef = useRef(scheduleMode);
  const scheduleTimeSlotsRef = useRef(scheduleTimeSlots);

  // Keep refs in sync with state
  useEffect(() => {
    scheduleModeRef.current = scheduleMode;
  }, [scheduleMode]);

  useEffect(() => {
    scheduleTimeSlotsRef.current = scheduleTimeSlots;
  }, [scheduleTimeSlots]);

  // Persist contacts to localStorage
  useEffect(() => {
    if (contacts.length > 0) {
      localStorage.setItem('outbound_contacts', JSON.stringify(contacts));
    } else {
      localStorage.removeItem('outbound_contacts');
    }
  }, [contacts]);

  // Persist selectedContacts to localStorage
  useEffect(() => {
    if (selectedContacts.size > 0) {
      localStorage.setItem('outbound_selectedContacts', JSON.stringify([...selectedContacts]));
    } else {
      localStorage.removeItem('outbound_selectedContacts');
    }
  }, [selectedContacts]);

  // Persist csvHeaders to localStorage
  useEffect(() => {
    if (csvHeaders.length > 0) {
      localStorage.setItem('outbound_csvHeaders', JSON.stringify(csvHeaders));
    } else {
      localStorage.removeItem('outbound_csvHeaders');
    }
  }, [csvHeaders]);

  // Persist batchName to localStorage
  useEffect(() => {
    if (batchName && batchName !== 'Untitled Batch') {
      localStorage.setItem('outbound_batchName', batchName);
    }
  }, [batchName]);

  // Persist selectedVariables to localStorage
  useEffect(() => {
    if (selectedVariables.length > 0) {
      localStorage.setItem('outbound_selectedVariables', JSON.stringify(selectedVariables));
    } else {
      localStorage.removeItem('outbound_selectedVariables');
    }
  }, [selectedVariables]);

  // Persist selectedAgentId to localStorage
  useEffect(() => {
    if (selectedAgentId) {
      localStorage.setItem('outbound_selectedAgentId', selectedAgentId);
    } else {
      localStorage.removeItem('outbound_selectedAgentId');
    }
  }, [selectedAgentId]);

  // Persist selectedPhoneId to localStorage
  useEffect(() => {
    if (selectedPhoneId) {
      localStorage.setItem('outbound_selectedPhoneId', selectedPhoneId);
    } else {
      localStorage.removeItem('outbound_selectedPhoneId');
    }
  }, [selectedPhoneId]);

  // Persist currentBatchId to localStorage
  useEffect(() => {
    if (currentBatchId) {
      localStorage.setItem('outbound_currentBatchId', currentBatchId);
    } else {
      localStorage.removeItem('outbound_currentBatchId');
    }
  }, [currentBatchId]);

  // Persist activeBatchInfo to localStorage
  useEffect(() => {
    if (activeBatchInfo) {
      localStorage.setItem('outbound_activeBatchInfo', JSON.stringify(activeBatchInfo));
    } else {
      localStorage.removeItem('outbound_activeBatchInfo');
    }
  }, [activeBatchInfo]);

  // Load agent prompt when agent is selected
  useEffect(() => {
    const loadAgentPrompt = async () => {
      if (!selectedAgentId) {
        setAgentPrompt('');
        setEditedPrompt('');
        setAgentName('');
        setFullAgentData(null);
        return;
      }

      setIsLoadingPrompt(true);
      try {
        const agent = await VoiceController.getAgent(selectedAgentId);
        const prompt = agent.conversation_config?.agent?.prompt?.prompt || '';
        setAgentPrompt(prompt);
        setEditedPrompt(prompt);
        setAgentName(agent.name || 'Agent');
        setFullAgentData(agent);
        setIsEditingPrompt(false);
        console.log('📝 Agent prompt loaded:', prompt.substring(0, 100) + '...');
      } catch (error) {
        console.error('Failed to load agent prompt:', error);
        setAgentPrompt('');
        setEditedPrompt('');
        setAgentName('');
        setFullAgentData(null);
      } finally {
        setIsLoadingPrompt(false);
      }
    };

    loadAgentPrompt();
  }, [selectedAgentId]);

  // Save edited prompt
  const handleSavePrompt = async () => {
    if (!selectedAgentId || !fullAgentData) return;

    setIsSavingPrompt(true);
    try {
      // Update the agent data with new prompt
      const updatedAgentData = {
        ...fullAgentData,
        conversation_config: {
          ...fullAgentData.conversation_config,
          agent: {
            ...fullAgentData.conversation_config?.agent,
            prompt: {
              ...fullAgentData.conversation_config?.agent?.prompt,
              prompt: editedPrompt
            }
          }
        }
      };

      // Get the first message for the update payload
      const firstMessage = fullAgentData.conversation_config?.agent?.first_message || '';
      const language = fullAgentData.conversation_config?.agent?.language || 'ro';

      // Prepare update payload using VoiceController
      const updatePayload = VoiceController.prepareUpdatePayload(
        updatedAgentData,
        { [language]: firstMessage }
      );

      // Update the prompt in the payload
      if (updatePayload.conversation_config?.agent?.prompt) {
        updatePayload.conversation_config.agent.prompt.prompt = editedPrompt;
      }

      await VoiceController.updateAgent(selectedAgentId, updatePayload);

      setAgentPrompt(editedPrompt);
      setIsEditingPrompt(false);

      toast({
        title: "Salvat!",
        description: "Prompt-ul agentului a fost actualizat",
      });
    } catch (error: any) {
      console.error('Failed to save agent prompt:', error);
      toast({
        title: "Eroare",
        description: `Nu s-a putut salva: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Helper function to get available variables from CSV headers
  const getAvailableVariables = () => {
    return csvHeaders
      .filter(header => header && header.trim() !== '') // Filter out empty headers
      .map(header => ({
        name: header,
        variable: `{{${header.toLowerCase().replace(/\s+/g, '_')}}}`
      }));
  };

  // Check if a variable exists in the agent prompt (check edited version when editing)
  const checkVariableInPrompt = (variable: string): boolean => {
    const promptToCheck = isEditingPrompt ? editedPrompt : agentPrompt;
    if (!promptToCheck) return false;
    return promptToCheck.includes(variable);
  };

  // Toggle a variable selection
  const toggleVariable = (variableName: string) => {
    setSelectedVariables(prev => {
      if (prev.includes(variableName)) {
        return prev.filter(v => v !== variableName);
      } else {
        return [...prev, variableName];
      }
    });
  };

  // Select/Deselect all variables
  const toggleAllVariables = () => {
    const availableVars = getAvailableVariables();
    if (selectedVariables.length === availableVars.length) {
      setSelectedVariables([]);
    } else {
      setSelectedVariables(availableVars.map(v => v.name));
    }
  };

  // Get sample value for a variable from first contact
  const getSampleValue = (variableName: string): string => {
    if (contacts.length === 0) return '';
    const firstContact = contacts[0];
    return firstContact.extraFields?.[variableName] || '';
  };

  // Get user's phone numbers and agents
  const {
    data: phoneNumbers
  } = useUserPhoneNumbers();
  const { data: agents = [] } = useUserAgents();
  const {
    processBatchCalls,
    isProcessingBatch,
    isPaused,
    isStopped,
    currentProgress,
    totalCalls,
    callStatuses,
    currentCallStatus,
    pauseBatch,
    resumeBatch,
    stopBatch,
    markCallCompleted,
    callInterval,
    setCallInterval,
    nextCallCountdown
  } = useCallInitiation({
    agentId: selectedAgentId,
    phoneId: selectedPhoneId,
    smsConfig: smsConfig,
    retrySettings: retrySettings,
    concurrentCalls: concurrentCalls
  });
  const {
    callHistory,
    isLoading: historyLoading,
    refetch: refetchHistory
  } = useCallHistory();

  // Cleanup schedule check interval on unmount
  useEffect(() => {
    return () => {
      if (scheduleCheckIntervalRef.current) {
        clearInterval(scheduleCheckIntervalRef.current);
      }
    };
  }, []);

  // Fetch contact lists
  useEffect(() => {
    if (user) {
      fetchContactLists();
    }
  }, [user]);

  const fetchContactLists = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select(`
          *,
          workflow_contacts(count)
        `)
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;

      const listsWithCount = data?.map(list => ({
        id: list.id,
        name: list.name,
        contact_count: list.workflow_contacts?.[0]?.count || 0
      })) || [];

      setContactLists(listsWithCount);
    } catch (error) {
      console.error('Error fetching contact lists:', error);
    }
  };

  const loadContactsFromFolder = async (listId: string) => {
    try {
      const { data, error } = await supabase
        .from('workflow_contacts')
        .select('*')
        .eq('list_id', listId)
        .order('created_at');

      if (error) throw error;

      const parsedContacts: Contact[] = data?.map((contact, index) => {
        const infoJson = contact.info_json as Record<string, any> | null;
        return {
          id: contact.id,
          name: contact.full_name || `Contact ${index + 1}`,
          phone: normalizePhoneNumber(contact.phone_e164 || ''),
          language: infoJson?.language || 'ro',
          location: infoJson?.location || 'Necunoscut'
        };
      }) || [];

      setContacts(parsedContacts);
      setSelectedContacts(new Set(parsedContacts.map(c => c.id)));
      setActiveSection('create');
      setShowFolderDialog(false);

      toast({
        title: 'Succes',
        description: `${parsedContacts.length} contacte încărcate din dosar`
      });
    } catch (error) {
      console.error('Error loading contacts from folder:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca contactele din dosar',
        variant: 'destructive'
      });
    }
  };

  // Check if we received preloaded contacts from navigation (e.g., from Analytics)
  useEffect(() => {
    const state = location.state as {
      preloadedContacts?: Contact[];
      source?: string;
      filterSummary?: any;
    } | null;
    if (state?.preloadedContacts && state.preloadedContacts.length > 0) {
      console.log('📞 Received contacts from Analytics:', state.preloadedContacts.length);

      // Set the contacts
      setContacts(state.preloadedContacts);

      // Auto-select all contacts
      setSelectedContacts(new Set(state.preloadedContacts.map(c => c.id)));

      // Switch to create view
      setActiveSection('create');

      // Show success toast with filter summary
      toast({
        title: t('outbound.contactsLoaded'),
        description: `${state.preloadedContacts.length} ${t('outbound.uniqueNumbersReady')}`
      });

      // Clear the navigation state to prevent re-loading on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast({
        title: t('outbound.error'),
        description: t('outbound.selectCSV'),
        variant: "destructive"
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const originalHeaders = parseCSVLine(lines[0]);
      const headers = originalHeaders.map(h => h.toLowerCase().trim());

      // Extended header recognition for various CSV formats
      const nameIndex = headers.findIndex(h =>
        h.includes('name') || h.includes('nume') || h.includes('denumire') ||
        h.includes('companie') || h.includes('firma')
      );
      const phoneIndex = headers.findIndex(h =>
        h.includes('phone') || h.includes('telefon') || h.includes('primaria') ||
        h.includes('numar') || h.includes('mobil') || h.includes('tel')
      );
      const languageIndex = headers.findIndex(h =>
        h.includes('language') || h.includes('limba') || h.includes('lang')
      );
      const locationIndex = headers.findIndex(h =>
        h.includes('location') || h.includes('locatie') || h.includes('localitate') ||
        h.includes('oras') || h.includes('city')
      );
      const emailIndex = headers.findIndex(h =>
        h.includes('email') || h.includes('mail') || h.includes('e-mail')
      );
      const infoIndex = headers.findIndex(h => h.includes('info'));
      const statusIndex = headers.findIndex(h => h.includes('status'));
      const raionIndex = headers.findIndex(h => h.includes('raion') || h.includes('id_raion'));

      // Debug: log detected columns
      console.log('📊 CSV Headers detected:', headers);
      console.log('📊 Original headers:', originalHeaders);
      console.log('📊 Column indices - Name:', nameIndex, 'Phone:', phoneIndex, 'Location:', locationIndex, 'Email:', emailIndex);

      if (phoneIndex === -1) {
        toast({
          title: t('outbound.error'),
          description: `${t('outbound.csvMustContainPhone')}. Coloane găsite: ${headers.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // Save headers for table display
      setCsvHeaders(originalHeaders);

      // Parse contacts - ONE contact per row, with multiple phones stored in phones array
      const parsedContacts: Contact[] = [];
      let skippedRows = 0;

      lines.slice(1).forEach((line, rowIndex) => {
        const values = parseCSVLine(line);

        // Get phone data ONLY from the identified phone column
        const rawPhones = values[phoneIndex] || '';

        // Extract phone numbers only from the phone column
        const phoneNumbers = extractPhoneNumbers(rawPhones);

        if (phoneNumbers.length === 0) {
          skippedRows++;
          console.log(`⚠️ Row ${rowIndex + 1} skipped - no valid phones found in: "${rawPhones.substring(0, 50)}..."`);
          return;
        }

        // Get all field values
        const contactName = nameIndex >= 0 ? values[nameIndex]?.trim() || '' : '';
        const contactLocation = locationIndex >= 0 ? values[locationIndex]?.trim() || '' : '';
        const contactLanguage = languageIndex >= 0 ? values[languageIndex]?.trim() || 'ro' : 'ro';
        const contactEmail = emailIndex >= 0 ? values[emailIndex]?.trim() || '' : '';
        const contactInfo = infoIndex >= 0 ? values[infoIndex]?.trim() || '' : '';
        const contactStatus = statusIndex >= 0 ? values[statusIndex]?.trim() || '' : '';
        const contactRaion = raionIndex >= 0 ? values[raionIndex]?.trim() || '' : '';

        // Build extraFields with ALL original columns
        const extraFields: Record<string, string> = {};
        originalHeaders.forEach((header, idx) => {
          if (values[idx] !== undefined) {
            extraFields[header] = values[idx]?.trim() || '';
          }
        });

        // Determine display name
        let displayName = contactName;
        if (!displayName && contactEmail) {
          displayName = contactEmail.split('@')[0];
        }
        if (!displayName) {
          displayName = `Contact ${rowIndex + 1}`;
        }

        // Create ONE contact with all phones
        parsedContacts.push({
          id: `contact-${rowIndex}`,
          name: displayName,
          phone: phoneNumbers[0], // Primary phone for calling
          phones: phoneNumbers,   // All phones
          language: contactLanguage,
          location: contactLocation,
          email: contactEmail,
          info: contactInfo,
          status: contactStatus,
          raion: contactRaion,
          extraFields: extraFields
        });
      });

      console.log(`📊 CSV parsing complete: ${parsedContacts.length} contacts from ${lines.length - 1} rows (${skippedRows} skipped)`);

      if (parsedContacts.length === 0) {
        toast({
          title: t('outbound.error'),
          description: `Nu s-au găsit numere de telefon valide în fișier. Verifică că fișierul conține o coloană cu numere de telefon.`,
          variant: "destructive"
        });
        return;
      }

      // Keep ALL rows from CSV - no deduplication
      setContacts(parsedContacts);
      setSelectedContacts(new Set(parsedContacts.map(c => c.id)));
      setActiveSection('create');

      const totalRows = lines.length - 1;

      let description = `${parsedContacts.length} rânduri încărcate din ${totalRows}`;
      if (skippedRows > 0) {
        description += ` (${skippedRows} rânduri fără telefon valid)`;
      }

      toast({
        title: t('outbound.success'),
        description
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.endsWith('.csv')) {
        toast({
          title: t('outbound.error'),
          description: t('outbound.selectCSV'),
          variant: "destructive"
        });
        return;
      }
      // Create a synthetic event to reuse handleCSVUpload logic
      const syntheticEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleCSVUpload(syntheticEvent);
    }
  };

  const handleContactSelect = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
  };
  const handleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  // Update a contact field
  const handleContactUpdate = (contactId: string, field: keyof Contact, value: string) => {
    setContacts(prevContacts => 
      prevContacts.map(contact => 
        contact.id === contactId 
          ? { ...contact, [field]: value }
          : contact
      )
    );
  };

  // Delete a contact
  const handleContactDelete = (contactId: string) => {
    setContacts(prevContacts => prevContacts.filter(c => c.id !== contactId));
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      newSet.delete(contactId);
      return newSet;
    });
  };

  // Helper function to check if current time is within schedule
  // useRef version for interval callbacks to avoid stale closures
  const isWithinScheduleRef = (): boolean => {
    if (scheduleModeRef.current === 'immediate') return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return scheduleTimeSlotsRef.current.some(slot => {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      return currentTime >= startMinutes && currentTime <= endMinutes;
    });
  };

  // State version for regular use
  const isWithinSchedule = (): boolean => {
    if (scheduleMode === 'immediate') return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return scheduleTimeSlots.some(slot => {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      return currentTime >= startMinutes && currentTime <= endMinutes;
    });
  };

  // Get next available time slot
  const getNextSlotStart = (): { hours: number; minutes: number } | null => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (const slot of scheduleTimeSlots.sort((a, b) => {
      const aStart = parseInt(a.startTime.split(':')[0]) * 60 + parseInt(a.startTime.split(':')[1]);
      const bStart = parseInt(b.startTime.split(':')[0]) * 60 + parseInt(b.startTime.split(':')[1]);
      return aStart - bStart;
    })) {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      
      if (startMinutes > currentTime) {
        return { hours: startHour, minutes: startMin };
      }
    }
    
    // Return first slot for next day
    if (scheduleTimeSlots.length > 0) {
      const [startHour, startMin] = scheduleTimeSlots[0].startTime.split(':').map(Number);
      return { hours: startHour, minutes: startMin };
    }
    
    return null;
  };

  const handleBatchProcess = async () => {
    if (!selectedAgentId || selectedContacts.size === 0) {
      toast({
        title: t('outbound.error'),
        description: t('outbound.selectAgentAndContact'),
        variant: "destructive"
      });
      return;
    }
    if (!selectedPhoneId) {
      toast({
        title: t('outbound.error'),
        description: t('outbound.selectPhoneNumber'),
        variant: "destructive"
      });
      return;
    }

    // Check if we're within scheduled hours
    if (scheduleMode === 'scheduled' && !isWithinSchedule()) {
      const nextSlot = getNextSlotStart();
      if (nextSlot) {
        toast({
          title: "Scheduled for later",
          description: `Calls will start at ${nextSlot.hours.toString().padStart(2, '0')}:${nextSlot.minutes.toString().padStart(2, '0')}. The batch is now queued.`,
        });
      }
      
      // Still save the batch info but don't start processing yet
      const contactsToProcess = contacts.filter(c => selectedContacts.has(c.id));
      const batchId = currentBatchId || `batch-${Date.now()}`;
      
      setActiveBatchInfo({
        id: batchId,
        name: batchName,
        agentName: selectedAgentId,
        recipientCount: contactsToProcess.length,
        contacts: contactsToProcess
      });
      
      // Save pending batch info to ref for interval callback
      pendingBatchRef.current = {
        contacts: contactsToProcess,
        agentId: selectedAgentId
      };
      
      setIsScheduledWaiting(true);
      setActiveSection(null);
      
      // Clear any existing interval
      if (scheduleCheckIntervalRef.current) {
        clearInterval(scheduleCheckIntervalRef.current);
      }
      
      // Start a timer to check every 30 seconds if we're in schedule
      // Uses isWithinScheduleRef to avoid stale closures
      scheduleCheckIntervalRef.current = setInterval(() => {
        if (isWithinScheduleRef() && pendingBatchRef.current) {
          clearInterval(scheduleCheckIntervalRef.current!);
          scheduleCheckIntervalRef.current = null;
          setIsScheduledWaiting(false);
          // Start the batch
          processBatchCalls(pendingBatchRef.current.contacts, pendingBatchRef.current.agentId);
          pendingBatchRef.current = null;
          toast({
            title: "Batch started",
            description: "The scheduled batch has started processing.",
          });
        }
      }, 30000); // Check every 30 seconds for faster response
      
      return;
    }

    console.log(`🚀 BATCH PROCESS STARTED:`, {
      retrySettings: retrySettings,
      retryMinutes: retrySettings.retryMinutes,
      maxRetries: retrySettings.maxRetries,
      retryEnabled: retrySettings.enabled,
      contactCount: selectedContacts.size,
      selectedVariables: selectedVariables
    });
    setBatchStartTime(new Date());

    // Prepare contacts with dynamic variables
    const contactsToProcess = contacts
      .filter(c => selectedContacts.has(c.id))
      .map(contact => {
        // Build dynamic variables from selected variables
        const dynamicVariables: Record<string, string> = {
          name: contact.name // Always include name
        };

        // Add selected variables from CSV columns
        if (selectedVariables.length > 0) {
          for (const varName of selectedVariables) {
            const variableKey = varName.toLowerCase().replace(/\s+/g, '_');
            const value = contact.extraFields?.[varName] || '';
            dynamicVariables[variableKey] = value;
          }
          console.log(`📦 Contact ${contact.name} variables:`, dynamicVariables);
        }

        return {
          ...contact,
          dynamicVariables
        };
      });

    const batchId = currentBatchId || `batch-${Date.now()}`;

    // Save active batch info with contacts
    setActiveBatchInfo({
      id: batchId,
      name: batchName,
      agentName: selectedAgentId,
      recipientCount: contactsToProcess.length,
      contacts: contactsToProcess
    });

    // Go back to list view to see the active batch card
    setActiveSection(null);

    try {
      await processBatchCalls(contactsToProcess, selectedAgentId);
    } catch (error: any) {
      console.error('Batch processing error:', error);
      toast({
        title: t('outbound.error'),
        description: `Batch processing failed: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      // Clear active batch when done (success or failure)
      setActiveBatchInfo(null);
      setCurrentBatchId(null);

      setTimeout(() => {
        refetchHistory();
      }, 2000);
    }
  };
  const downloadTemplate = () => {
    // Template with multiple format examples that the parser supports
    const csvContent = `denumire,telefon,email,localitate,limba
"Primaria Comunei Exemple","0-22-383527, 0-22-383528",primaria@example.md,Chișinău,ro
Ion Popescu,079123456,ion@mail.md,Bălți,ro
"SRL Companie",022766571;022766572,office@companie.md,Comrat,ro
Maria Ionescu,+37369123456,,Cahul,ro
Contact Simplu,068987654,,Orhei,`;
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_contacte.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Dot pattern background style
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#f4f4f5 1.5px, transparent 1.5px)',
    backgroundSize: '32px 32px'
  };

  return <DashboardLayout>
      <div className="min-h-screen bg-white flex flex-col" style={dotPatternStyle}>

        {/* Main List View */}
        {!activeSection && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <header className="flex items-end justify-between px-12 py-10 shrink-0">
              <h1 className="text-2xl font-bold tracking-tight text-black">Batch Calling</h1>

              <div className="relative group w-64">
                <Search className="absolute left-0 top-2.5 w-4 h-4 text-zinc-300 group-hover:text-black transition" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 py-2 text-sm text-zinc-900 placeholder-zinc-300 bg-transparent border-b border-zinc-200 focus:border-black focus:outline-none transition"
                />
              </div>
            </header>

            {/* Active Batch Card - show when processing OR scheduled waiting */}
            {activeBatchInfo && (isProcessingBatch || isScheduledWaiting) && (
              <div className="px-12 mb-8">
                <div className={`bg-white border-2 ${isScheduledWaiting ? 'border-yellow-500' : 'border-green-500'} rounded-2xl p-6 shadow-lg relative overflow-hidden max-w-md`}>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200">
                    <div
                      className={`h-full ${isScheduledWaiting ? 'bg-yellow-500' : 'bg-green-500'} transition-all duration-300`}
                      style={{ width: `${totalCalls > 0 ? (currentProgress / totalCalls) * 100 : 0}%` }}
                    />
                  </div>
                  <div
                    className="mb-4 cursor-pointer hover:opacity-80"
                    onClick={() => {
                      if (activeBatchInfo.contacts) {
                        setContacts(activeBatchInfo.contacts);
                        setSelectedContacts(new Set(activeBatchInfo.contacts.map(c => c.id)));
                        setBatchName(activeBatchInfo.name);
                        setCurrentBatchId(activeBatchInfo.id);
                      }
                      setActiveSection('create');
                    }}
                  >
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                      {activeBatchInfo.name}
                      <Pencil className="w-3 h-3 text-zinc-400" />
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {activeBatchInfo.recipientCount} recipient{activeBatchInfo.recipientCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {currentProgress} / {totalCalls} calls
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      isScheduledWaiting
                        ? 'bg-yellow-100 text-yellow-700'
                        : isPaused
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {isScheduledWaiting ? (
                        <>
                          <Clock className="w-3 h-3" />
                          Scheduled
                        </>
                      ) : isPaused ? (
                        <>
                          <Pause className="w-3 h-3" />
                          Paused
                        </>
                      ) : (
                        <>
                          <Phone className="w-3 h-3 animate-pulse" />
                          Active
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (activeBatchInfo.contacts) {
                            setContacts(activeBatchInfo.contacts);
                            setSelectedContacts(new Set(activeBatchInfo.contacts.map(c => c.id)));
                            setBatchName(activeBatchInfo.name);
                            setCurrentBatchId(activeBatchInfo.id);
                          }
                          setActiveSection('create');
                        }}
                        className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-600 transition"
                        title="Edit batch"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isScheduledWaiting && (
                        <button
                          onClick={() => {
                            if (scheduleCheckIntervalRef.current) {
                              clearInterval(scheduleCheckIntervalRef.current);
                              scheduleCheckIntervalRef.current = null;
                            }
                            if (pendingBatchRef.current) {
                              setIsScheduledWaiting(false);
                              processBatchCalls(pendingBatchRef.current.contacts, pendingBatchRef.current.agentId);
                              pendingBatchRef.current = null;
                              toast({
                                title: "Batch started",
                                description: "The batch has started processing immediately.",
                              });
                            }
                          }}
                          className="p-2 rounded-xl hover:bg-green-100 text-green-600 transition"
                          title="Start now"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {!isScheduledWaiting && (
                        <button
                          onClick={isPaused ? resumeBatch : pauseBatch}
                          className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-600 transition"
                        >
                          {isPaused ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Pause className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (isScheduledWaiting) {
                            if (scheduleCheckIntervalRef.current) {
                              clearInterval(scheduleCheckIntervalRef.current);
                              scheduleCheckIntervalRef.current = null;
                            }
                            pendingBatchRef.current = null;
                            setIsScheduledWaiting(false);
                            setActiveBatchInfo(null);
                            toast({
                              title: "Batch cancelled",
                              description: "The scheduled batch has been cancelled.",
                            });
                          } else {
                            stopBatch();
                          }
                        }}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-600 transition"
                        title={isScheduledWaiting ? "Cancel scheduled batch" : "Stop batch"}
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State - Zen Style */}
            {!activeBatchInfo && !isProcessingBatch && (
              <main className="flex-1 flex flex-col items-center justify-center -mt-20">
                {/* Icon */}
                <div className="mb-8 p-6 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                  <Layers className="w-8 h-8 text-zinc-300" />
                </div>

                <h2 className="text-lg font-medium text-black mb-2">No Active Batches</h2>
                <p className="text-sm text-zinc-400 mb-10 max-w-xs text-center leading-relaxed">
                  Your workspace is clear. Ready to initiate a new sequence?
                </p>

                {/* Monolith Button */}
                <button
                  onClick={() => {
                    const newBatchId = `batch-${Date.now()}`;
                    setCurrentBatchId(newBatchId);
                    setContacts([]);
                    setCsvHeaders([]);
                    setSelectedContacts(new Set());
                    setBatchName('Untitled Batch');
                    setSelectedAgentId('');
                    setSelectedVariables([]);
                    setIsVariablesPanelOpen(false);
                    setActiveSection('create');
                  }}
                  className="group relative bg-black text-white px-8 py-4 rounded-2xl flex items-center gap-4 shadow-xl shadow-zinc-200 transition-all duration-400 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]"
                >
                  <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center group-hover:bg-white group-hover:text-black transition duration-300">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="text-left pr-4">
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Start New</span>
                    <span className="block text-sm font-bold text-white">Batch Campaign</span>
                  </div>
                </button>
              </main>
            )}

            {/* Footer Links - placeholder for future features */}
            <footer className="py-8 flex justify-center gap-8 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
              <span>Templates</span>
              <span>Segments</span>
              <span>History</span>
            </footer>
          </div>
        )}

        {/* Create Batch View - Zen Style */}
        {activeSection === 'create' && (
          <div className="flex h-screen overflow-hidden">
            {/* Left Panel - Form */}
            <aside className="w-[480px] flex flex-col h-full border-r border-zinc-100 bg-white z-10 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {/* Header */}
              <div className="px-8 pt-8 pb-4">
                <button
                  onClick={() => {
                    setActiveSection(null);
                    setIsVariablesPanelOpen(false);
                    // Don't clear contacts - they're persisted in localStorage
                    // User can start a "new" batch from the main view if they want to clear
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-black transition mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Untitled Batch Call"
                  className="w-full text-2xl font-bold text-black bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-black pb-1 transition-colors placeholder-zinc-300 focus:outline-none"
                />
              </div>

              {/* Active Processing Banner */}
              {isProcessingBatch && activeBatchInfo && currentBatchId === activeBatchInfo.id && (
                <div className="mx-8 mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-900 text-sm">Batch Active</h4>
                      <p className="text-xs text-green-700">{currentProgress} / {totalCalls} calls completed</p>
                    </div>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${totalCalls > 0 ? (currentProgress / totalCalls) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={isPaused ? resumeBatch : pauseBatch}
                      className="px-3 py-1.5 text-xs font-bold text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition"
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      onClick={stopBatch}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              )}

              {/* Form Content */}
              <div className="flex-1 px-8 py-4 space-y-10">
                {/* Section 1: Caller Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">1</span>
                    <h3 className="text-sm font-bold text-zinc-900">Caller Configuration</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Agent Select - Custom Dropdown */}
                    <CustomDropdown
                      icon={<Bot className="w-4 h-4" />}
                      placeholder="Selectează Agent"
                      value={selectedAgentId}
                      onChange={setSelectedAgentId}
                      options={agents.map(agent => ({
                        value: agent.elevenlabs_agent_id || agent.agent_id || '',
                        label: agent.name,
                        sublabel: agent.elevenlabs_agent_id?.slice(0, 8) + '...'
                      }))}
                      searchPlaceholder="Caută agent..."
                    />

                    {/* Sync Webhook Button - for real-time call status */}
                    {selectedAgentId && (
                      <button
                        onClick={syncAgentWebhook}
                        disabled={isSyncingWebhook}
                        className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                          webhookSyncStatus === 'synced'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : webhookSyncStatus === 'error'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                        }`}
                      >
                        {isSyncingWebhook ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : webhookSyncStatus === 'synced' ? (
                          <Wifi className="w-3.5 h-3.5" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isSyncingWebhook
                            ? 'Se sincronizează...'
                            : webhookSyncStatus === 'synced'
                            ? '✓ Webhook sincronizat'
                            : 'Sincronizează Webhook (Real-time)'}
                        </span>
                      </button>
                    )}

                    {/* Phone Select - Custom Dropdown */}
                    <CustomDropdown
                      icon={<Phone className="w-4 h-4" />}
                      placeholder="Selectează Număr"
                      value={selectedPhoneId}
                      onChange={setSelectedPhoneId}
                      options={(phoneNumbers || []).map(phone => ({
                        value: phone.id,
                        label: phone.label || phone.phone_number,
                        sublabel: phone.phone_number
                      }))}
                      searchPlaceholder="Caută număr..."
                    />

                    {/* Call Interval - Zen Style */}
                    <div className="flex items-center justify-between px-1">
                      <label className="text-xs font-medium text-zinc-500">Call Interval</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={callInterval}
                          onChange={(e) => setCallInterval(Math.max(5, Math.min(300, parseInt(e.target.value) || 20)))}
                          min={5}
                          max={300}
                          className="w-12 text-center bg-zinc-50 border-b border-zinc-200 text-sm font-bold focus:border-black focus:outline-none transition"
                        />
                        <span className="text-xs text-zinc-400">seconds</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Audience */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-bold">2</span>
                    <h3 className="text-sm font-bold text-zinc-900">Audience</h3>
                  </div>

                  {/* Upload Toggle */}
                  <div className="flex bg-zinc-50 p-1 rounded-lg">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm text-black"
                    >
                      Upload CSV
                    </button>
                    <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
                      <DialogTrigger asChild>
                        <button className="flex-1 py-1.5 text-xs font-bold rounded-md text-zinc-500 hover:text-black transition">
                          Saved Folders
                        </button>
                      </DialogTrigger>
                      <DialogContent className="!rounded-2xl !p-0 !max-w-md">
                        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-100">
                          <DialogTitle className="text-lg font-bold">Select Folder</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-2">
                          {contactLists.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500">
                              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                              <p className="text-sm">No folders created yet</p>
                            </div>
                          ) : (
                            contactLists.map((list) => (
                              <button
                                key={list.id}
                                onClick={() => loadContactsFromFolder(list.id)}
                                className="w-full p-4 rounded-xl border border-zinc-100 hover:bg-zinc-50 text-left transition-colors flex items-center gap-3"
                              >
                                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center">
                                  <FolderOpen className="w-5 h-5 text-zinc-500" />
                                </div>
                                <div>
                                  <span className="text-sm font-bold text-zinc-900 block">{list.name}</span>
                                  <span className="text-xs text-zinc-400">{list.contact_count} contacts</span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Upload Area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group ${
                      isDragOver
                        ? 'border-black bg-zinc-100 scale-[1.02]'
                        : 'border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition ${
                      isDragOver ? 'bg-black scale-110' : 'bg-zinc-50 group-hover:scale-110'
                    }`}>
                      <UploadCloud className={`w-5 h-5 transition ${
                        isDragOver ? 'text-white' : 'text-zinc-400 group-hover:text-black'
                      }`} />
                    </div>
                    <p className="text-xs font-bold text-zinc-700">
                      {isDragOver ? 'Drop CSV file here' : 'Click to upload CSV'}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1">or drag and drop here</p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTemplate();
                      }}
                      className="mt-4 text-[10px] font-bold text-zinc-400 flex items-center gap-1 hover:text-black transition"
                    >
                      <Download className="w-3 h-3" />
                      Download Template
                    </button>
                  </div>
                </div>

                {/* Section 3: Variables for Agent - Collapsible */}
                {csvHeaders.length > 0 && (
                  <div className="space-y-4">
                    {/* Clickable header to toggle */}
                    <div
                      onClick={() => setIsVariablesPanelOpen(!isVariablesPanelOpen)}
                      className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                        isVariablesPanelOpen
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-zinc-50 border border-zinc-100 hover:bg-zinc-100'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isVariablesPanelOpen ? 'bg-green-500 text-white' : 'bg-zinc-200 text-zinc-500'
                      }`}>
                        <Variable className="w-3 h-3" />
                      </span>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-zinc-900">Variabile pentru Agent</h3>
                        <p className="text-[10px] text-zinc-400">
                          {selectedVariables.length > 0
                            ? `${selectedVariables.length} variabile selectate`
                            : 'Trimite date din CSV la agent'}
                        </p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${
                        isVariablesPanelOpen ? 'rotate-180' : ''
                      }`} />
                    </div>

                    {/* Expanded content */}
                    {isVariablesPanelOpen && (
                      <div className="space-y-3 pl-2 animate-in slide-in-from-top-2 duration-200">
                        <p className="text-xs text-zinc-500">
                          Selectează ce informații vrei să trimiți la agent:
                        </p>

                        {/* Variable selection */}
                        <div className="space-y-2">
                          {getAvailableVariables().map(({ name, variable }) => {
                            const isSelected = selectedVariables.includes(name);
                            const sampleValue = getSampleValue(name);

                            return (
                              <label
                                key={name}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-green-50 border border-green-200'
                                    : 'bg-white border border-zinc-100 hover:bg-zinc-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleVariable(name)}
                                  className="w-4 h-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                                      isSelected ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
                                    }`}>
                                      {variable}
                                    </code>
                                    <span className="text-xs text-zinc-400">{name}</span>
                                  </div>
                                  {sampleValue && (
                                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                                      Ex: "{sampleValue.substring(0, 30)}{sampleValue.length > 30 ? '...' : ''}"
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {/* Select all / Deselect all */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={toggleAllVariables}
                            className="text-[10px] font-bold text-zinc-500 hover:text-black transition"
                          >
                            {selectedVariables.length === getAvailableVariables().length
                              ? 'Deselectează tot'
                              : 'Selectează tot'}
                          </button>
                          <button
                            onClick={() => setIsVariablesPanelOpen(false)}
                            className="ml-auto text-[10px] font-bold text-green-600 hover:text-green-700 transition"
                          >
                            Gata
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 4: Schedule */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-50 pb-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-bold">{csvHeaders.length > 0 ? '4' : '3'}</span>
                    <h3 className="text-sm font-bold text-zinc-900">Schedule</h3>
                  </div>

                  <div
                    onClick={() => setScheduleMode(scheduleMode === 'immediate' ? 'scheduled' : 'immediate')}
                    className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl cursor-pointer hover:bg-zinc-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">Send Immediately</p>
                        <p className="text-[10px] text-zinc-400">Campaign starts on launch</p>
                      </div>
                    </div>

                    <Switch
                      checked={scheduleMode === 'immediate'}
                      onCheckedChange={(checked) => setScheduleMode(checked ? 'immediate' : 'scheduled')}
                    />
                  </div>

                  {/* Schedule Time Slots */}
                  {scheduleMode === 'scheduled' && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-zinc-900">Active Hours</span>
                        <button
                          onClick={() => setScheduleTimeSlots([...scheduleTimeSlots, { startTime: '09:00', endTime: '18:00' }])}
                          className="text-[10px] text-black hover:text-zinc-600 font-bold flex items-center gap-1 transition"
                        >
                          <Plus className="w-3 h-3" />
                          Add slot
                        </button>
                      </div>

                      <div className="space-y-3">
                        {scheduleTimeSlots.map((slot, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => {
                                const newSlots = [...scheduleTimeSlots];
                                newSlots[index].startTime = e.target.value;
                                setScheduleTimeSlots(newSlots);
                              }}
                              className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-1 focus:ring-black focus:border-black focus:outline-none"
                            />
                            <span className="text-zinc-300">→</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => {
                                const newSlots = [...scheduleTimeSlots];
                                newSlots[index].endTime = e.target.value;
                                setScheduleTimeSlots(newSlots);
                              }}
                              className="flex-1 h-9 px-3 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-1 focus:ring-black focus:border-black focus:outline-none"
                            />
                            {scheduleTimeSlots.length > 1 && (
                              <button
                                onClick={() => {
                                  const newSlots = scheduleTimeSlots.filter((_, i) => i !== index);
                                  setScheduleTimeSlots(newSlots);
                                }}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Retry Settings */}
                <div
                  onClick={() => setRetrySettings({ ...retrySettings, enabled: !retrySettings.enabled })}
                  className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl cursor-pointer hover:bg-zinc-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-500">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Auto-retry failed calls</p>
                      <p className="text-[10px] text-zinc-400">
                        {retrySettings.enabled
                          ? `Retry after ${retrySettings.retryMinutes}min, max ${retrySettings.maxRetries} retries`
                          : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={retrySettings.enabled}
                    onCheckedChange={enabled => setRetrySettings({ ...retrySettings, enabled })}
                    disabled={isProcessingBatch}
                  />
                </div>

                {retrySettings.enabled && (
                  <div className="grid grid-cols-2 gap-3 px-4">
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block font-bold uppercase tracking-wider">Retry after</label>
                      <Select
                        value={retrySettings.retryMinutes.toString()}
                        onValueChange={value => setRetrySettings({ ...retrySettings, retryMinutes: Math.max(1, Math.min(60, parseInt(value) || 10)) })}
                      >
                        <SelectTrigger className="h-9 bg-zinc-50 border-zinc-100 rounded-lg text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 min</SelectItem>
                          <SelectItem value="10">10 min</SelectItem>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block font-bold uppercase tracking-wider">Max retries</label>
                      <Select
                        value={retrySettings.maxRetries.toString()}
                        onValueChange={value => setRetrySettings({ ...retrySettings, maxRetries: Math.max(1, Math.min(10, parseInt(value) || 2)) })}
                      >
                        <SelectTrigger className="h-9 bg-zinc-50 border-zinc-100 rounded-lg text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 retry</SelectItem>
                          <SelectItem value="2">2 retries</SelectItem>
                          <SelectItem value="3">3 retries</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-50 bg-white">
                <button
                  onClick={handleBatchProcess}
                  disabled={!selectedAgentId || !selectedPhoneId || selectedContacts.size === 0}
                  className="w-full bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-zinc-200 transition active:scale-95 flex items-center justify-center gap-2 group"
                >
                  <Rocket className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  Launch Campaign
                </button>
              </div>
            </aside>

            {/* Right Panel - Recipients Preview OR Agent Prompt */}
            <main className="flex-1 bg-zinc-50 flex flex-col relative overflow-hidden">
              {/* Dot pattern background */}
              <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:24px_24px] opacity-50 pointer-events-none" />

              {/* Show Agent Prompt Panel when variables panel is open */}
              {isVariablesPanelOpen ? (
                <div className="flex-1 w-full min-w-0 flex flex-col relative z-10 p-6 overflow-y-auto">
                  {/* No agent selected state */}
                  {!selectedAgentId ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center max-w-sm">
                        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Bot className="w-8 h-8 text-zinc-300" />
                        </div>
                        <h3 className="font-bold text-zinc-900 mb-2">Selectează un Agent</h3>
                        <p className="text-sm text-zinc-500">
                          Alege un agent din stânga pentru a vedea prompt-ul și a verifica variabilele.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-900">{agentName || 'Agent'}</h3>
                            <p className="text-xs text-zinc-500">Prompt-ul agentului</p>
                          </div>
                        </div>
                        <a
                          href={`/agents?edit=${selectedAgentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition"
                        >
                          <Pencil className="w-3 h-3" />
                          Editează
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Variable status warning - Draggable */}
                      {selectedVariables.length > 0 && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-yellow-800">
                                Verifică variabilele în prompt:
                                <span className="font-normal text-yellow-600 ml-1">(trage în prompt)</span>
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {selectedVariables.map(varName => {
                                  const variable = `{{${varName.toLowerCase().replace(/\s+/g, '_')}}}`;
                                  const isInPrompt = checkVariableInPrompt(variable);

                                  return (
                                    <span
                                      key={varName}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', variable);
                                        e.dataTransfer.effectAllowed = 'copy';
                                        setDraggingVariable(variable);
                                        // Custom drag image
                                        const dragEl = document.createElement('div');
                                        dragEl.innerHTML = `📌 ${variable}`;
                                        dragEl.style.cssText = 'position:absolute;top:-1000px;padding:8px 12px;background:#22c55e;color:white;border-radius:8px;font-family:monospace;font-size:12px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
                                        document.body.appendChild(dragEl);
                                        e.dataTransfer.setDragImage(dragEl, 20, 20);
                                        setTimeout(() => dragEl.remove(), 0);
                                      }}
                                      onDragEnd={() => {
                                        setDraggingVariable(null);
                                      }}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono cursor-grab active:cursor-grabbing select-none hover:scale-105 transition-transform ${
                                        isInPrompt
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                                      } ${draggingVariable === variable ? 'opacity-50 scale-95' : ''}`}
                                      title="Trage în prompt pentru a adăuga"
                                    >
                                      {isInPrompt ? (
                                        <Check className="w-3 h-3" />
                                      ) : (
                                        <X className="w-3 h-3" />
                                      )}
                                      {variable}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Agent Prompt Content - Editable */}
                      <div className="flex-1 w-full bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col min-w-0">
                        <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">System Prompt</span>
                            {isLoadingPrompt && (
                              <div className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                            )}
                            {isEditingPrompt && (
                              <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                                Editare
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditingPrompt ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditedPrompt(agentPrompt);
                                    setIsEditingPrompt(false);
                                  }}
                                  disabled={isSavingPrompt}
                                  className="text-[10px] font-bold text-zinc-500 hover:text-zinc-700 transition px-2 py-1"
                                >
                                  Anulează
                                </button>
                                <button
                                  onClick={handleSavePrompt}
                                  disabled={isSavingPrompt || editedPrompt === agentPrompt}
                                  className="text-[10px] font-bold text-white bg-green-500 hover:bg-green-600 disabled:bg-zinc-300 transition px-3 py-1 rounded-lg flex items-center gap-1"
                                >
                                  {isSavingPrompt ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Salvare...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Salvează
                                    </>
                                  )}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setIsEditingPrompt(true)}
                                className="text-[10px] font-bold text-zinc-500 hover:text-black transition px-2 py-1 flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Editează
                              </button>
                            )}
                          </div>
                        </div>
                        <div
                          className="flex-1 w-full overflow-auto p-4"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                            // Visual feedback via DOM
                            e.currentTarget.style.backgroundColor = '#f0fdf4';
                            e.currentTarget.style.outline = '2px dashed #86efac';
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '';
                            e.currentTarget.style.outline = '';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Reset visual feedback
                            e.currentTarget.style.backgroundColor = '';
                            e.currentTarget.style.outline = '';

                            const variable = e.dataTransfer.getData('text/plain');
                            if (variable && variable.startsWith('{{')) {
                              // Enable editing mode if not already
                              if (!isEditingPrompt) {
                                setIsEditingPrompt(true);
                                // Set cursor to end for new editing session
                                lastCursorPositionRef.current = editedPrompt.length;
                              }
                              // Use insertVariableAtCursor for precise positioning
                              insertVariableAtCursor(variable);
                            }
                          }}
                        >
                          {isEditingPrompt ? (
                            <textarea
                              ref={promptTextareaRef}
                              value={editedPrompt}
                              onChange={(e) => {
                                setEditedPrompt(e.target.value);
                                lastCursorPositionRef.current = e.target.selectionStart;
                              }}
                              onKeyUp={(e) => { lastCursorPositionRef.current = e.currentTarget.selectionStart; }}
                              onClick={(e) => { lastCursorPositionRef.current = e.currentTarget.selectionStart; }}
                              onSelect={(e) => { lastCursorPositionRef.current = e.currentTarget.selectionStart; }}
                              onBlur={(e) => {
                                // Don't save on blur during drag - we want to use drop position
                                if (!(e.relatedTarget === null)) {
                                  lastCursorPositionRef.current = e.currentTarget.selectionStart;
                                }
                              }}
                              onMouseUp={(e) => { lastCursorPositionRef.current = e.currentTarget.selectionStart; }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Visual feedback - pulsing green border
                                const textarea = e.currentTarget;
                                textarea.style.backgroundColor = '#f0fdf4';
                                textarea.style.outline = '3px solid #22c55e';
                                textarea.style.outlineOffset = '2px';
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '';
                                e.currentTarget.style.outline = '';
                                e.currentTarget.style.outlineOffset = '';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Reset visual feedback
                                const textarea = e.currentTarget;
                                textarea.style.backgroundColor = '';
                                textarea.style.outline = '';
                                textarea.style.outlineOffset = '';

                                const variable = e.dataTransfer.getData('text/plain');
                                if (variable && variable.startsWith('{{')) {
                                  // Insert at last known cursor position
                                  const pos = lastCursorPositionRef.current;
                                  const newText = editedPrompt.slice(0, pos) + variable + editedPrompt.slice(pos);
                                  setEditedPrompt(newText);
                                  // Update cursor position
                                  const newPos = pos + variable.length;
                                  lastCursorPositionRef.current = newPos;
                                  setTimeout(() => {
                                    textarea.focus();
                                    textarea.selectionStart = textarea.selectionEnd = newPos;
                                  }, 0);
                                }
                              }}
                              onFocus={(e) => {
                                // When focusing, if cursor tracking hasn't been set, position at end
                                setTimeout(() => {
                                  const textarea = e.target as HTMLTextAreaElement;
                                  if (textarea) {
                                    lastCursorPositionRef.current = textarea.selectionStart;
                                  }
                                }, 0);
                              }}
                              placeholder="Scrie prompt-ul agentului aici... (poți trage variabile aici)"
                              className="w-full h-full min-h-[300px] text-sm text-zinc-700 font-mono leading-relaxed resize-none border-0 focus:outline-none focus:ring-0 bg-transparent"
                              autoFocus
                            />
                          ) : agentPrompt ? (
                            <pre
                              className="text-sm text-zinc-700 whitespace-pre-wrap break-words font-mono leading-relaxed cursor-pointer hover:bg-zinc-50 p-2 -m-2 rounded-lg transition w-full"
                              onClick={() => setIsEditingPrompt(true)}
                              title="Click pentru a edita"
                            >
                              {agentPrompt}
                            </pre>
                          ) : (
                            <div
                              className="flex items-center justify-center h-full text-zinc-400 text-sm cursor-pointer hover:text-zinc-600"
                              onClick={() => setIsEditingPrompt(true)}
                            >
                              {isLoadingPrompt ? 'Se încarcă...' : 'Click pentru a adăuga prompt'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Help text with quick insert buttons */}
                      <div className="mt-3 space-y-2">
                        {isEditingPrompt && selectedVariables.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-700 font-medium mb-2 flex items-center gap-2">
                              <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
                              Click în prompt unde vrei să inserezi, apoi apasă pe o variabilă:
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {selectedVariables.map(varName => {
                                const variable = `{{${varName.toLowerCase().replace(/\s+/g, '_')}}}`;
                                return (
                                  <button
                                    key={varName}
                                    onClick={() => insertVariableAtCursor(variable)}
                                    className="text-xs font-mono bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition shadow-sm hover:shadow"
                                  >
                                    + {variable}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-blue-500 mt-2 italic">
                              💡 Sau trage o variabilă din lista de mai sus direct în prompt
                            </p>
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-400 text-center">
                          Variabilele precum <code className="bg-zinc-100 px-1 rounded">{'{{denumire}}'}</code> vor fi înlocuite automat cu datele din CSV
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center relative z-10 p-8">
                  <div className="text-center max-w-md">
                    <div className="w-24 h-24 bg-white rounded-3xl border border-zinc-100 shadow-xl flex items-center justify-center mx-auto mb-6 rotate-3 hover:rotate-0 transition duration-500">
                      <Users className="w-10 h-10 text-zinc-300" />
                    </div>

                    <h2 className="text-xl font-bold text-zinc-900 mb-2">No Recipients Yet</h2>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Upload a CSV file or select a folder from the left panel to preview your call list and estimated costs here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full relative z-10">
                  {/* Header - fixed */}
                  <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-100 z-20">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">
                        {contacts.length} Recipients
                      </h3>
                      {csvHeaders.length > 0 && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {csvHeaders.length} coloane {contacts.some(c => c.phones && c.phones.length > 1) ? `• + ${Math.max(...contacts.map(c => (c.phones?.length || 1) - 1))} tel. extra ` : ''}• scroll ↔️
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedContacts.size > 0 && (
                        <button
                          onClick={() => {
                            // Delete all selected contacts
                            setContacts(prev => prev.filter(c => !selectedContacts.has(c.id)));
                            setSelectedContacts(new Set());
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-700 transition px-3 py-1.5 rounded-lg hover:bg-red-50 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Șterge ({selectedContacts.size})
                        </button>
                      )}
                      <button
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-zinc-400 hover:text-black transition px-3 py-1.5 rounded-lg hover:bg-white"
                      >
                        {selectedContacts.size === contacts.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                  </div>

                  {/* Table Container - scrollable both ways */}
                  <div className="flex-1 relative">
                    <div
                      className="absolute inset-0 overflow-auto"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#d4d4d8 transparent'
                      }}
                    >
                      <table
                        className="border-collapse bg-white"
                        style={{
                          tableLayout: 'fixed',
                          width: 'max-content',
                          minWidth: '100%'
                        }}
                      >
                          {/* Define column widths */}
                          <colgroup>
                            <col style={{ width: '48px', minWidth: '48px' }} />
                            <col style={{ width: '140px', minWidth: '140px' }} />
                            {csvHeaders.length > 0 ? (
                              csvHeaders.map((_, idx) => (
                                <col key={idx} style={{ width: '150px', minWidth: '150px' }} />
                              ))
                            ) : (
                              <>
                                <col style={{ width: '150px', minWidth: '150px' }} />
                                <col style={{ width: '150px', minWidth: '150px' }} />
                              </>
                            )}
                            {contacts.some(c => c.phones && c.phones.length > 1) && (
                              Array.from({ length: Math.max(...contacts.map(c => (c.phones?.length || 1) - 1)) }, (_, i) => (
                                <col key={`phone-col-${i}`} style={{ width: '140px', minWidth: '140px' }} />
                              ))
                            )}
                            <col style={{ width: '48px', minWidth: '48px' }} />
                          </colgroup>
                          <thead className="sticky top-0 z-10 bg-white">
                            <tr className="bg-white border-b border-zinc-200">
                              {/* Checkbox column - sticky */}
                              <th className="px-2 py-2 bg-white sticky left-0 z-20 border-r border-zinc-100" style={{ width: '48px' }}>
                                <span className="text-zinc-400 text-[10px]">#</span>
                              </th>
                              {/* Primary Phone column */}
                              <th className="px-3 py-2 text-left text-[10px] font-bold text-green-600 uppercase tracking-wider whitespace-nowrap bg-white border-r border-zinc-100">
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  Telefon
                                </div>
                              </th>
                              {/* Dynamic columns from CSV headers */}
                              {csvHeaders.length > 0 ? (
                                csvHeaders.map((header, idx) => (
                                  <th key={idx} className="px-3 py-2 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap bg-white border-r border-zinc-100">
                                    <span className="truncate block">{header}</span>
                                  </th>
                                ))
                              ) : (
                                <>
                                  <th className="px-3 py-2 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-white border-r border-zinc-100">Name</th>
                                  <th className="px-3 py-2 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-white border-r border-zinc-100">Location</th>
                                </>
                              )}
                              {/* Extra phones columns */}
                              {contacts.some(c => c.phones && c.phones.length > 1) && (
                                <>
                                  {Array.from({ length: Math.max(...contacts.map(c => (c.phones?.length || 1) - 1)) }, (_, i) => (
                                    <th key={`phone-${i + 2}`} className="px-3 py-2 text-left text-[10px] font-bold text-green-600 uppercase tracking-wider whitespace-nowrap bg-white border-r border-zinc-100">
                                      Tel {i + 2}
                                    </th>
                                  ))}
                                </>
                              )}
                              {/* Actions column */}
                              <th className="w-12 bg-white px-2 py-2 text-[10px] font-bold text-zinc-400 uppercase">
                                <Trash2 className="w-3 h-3 mx-auto" />
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {contacts.map((contact, rowIdx) => {
                              const callStatus = callStatuses.find(cs => cs.contactId === contact.id);
                              const isCompleted = callStatus?.status === 'completed';
                              const isFailed = callStatus?.status === 'failed';
                              const isCalling = callStatus?.status === 'calling' || callStatus?.status === 'in-progress';
                              const isProcessingCall = callStatus?.status === 'processing';
                              const isDisabled = isCompleted || isFailed || isCalling || isProcessingCall;
                              const rowBg = isCalling ? 'bg-green-100' :
                                           isProcessingCall ? 'bg-blue-50' :
                                           isCompleted ? 'bg-green-50/50' :
                                           isFailed ? 'bg-red-50/50' :
                                           selectedContacts.has(contact.id) ? 'bg-blue-50/30' :
                                           rowIdx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50';

                              return (
                                <tr
                                  key={contact.id}
                                  className={`border-b border-zinc-100 group hover:bg-zinc-50 ${rowBg} ${
                                    isCalling ? 'ring-2 ring-green-500 ring-inset animate-pulse' : ''
                                  } ${isProcessingCall ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                                >
                                  {/* Checkbox - sticky */}
                                  <td className={`px-2 py-1.5 sticky left-0 z-10 border-r border-zinc-100 ${rowBg}`}>
                                    <div className="flex items-center justify-center">
                                      {isCompleted ? (
                                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                        </div>
                                      ) : isFailed ? (
                                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                                          <span className="text-white text-[10px] font-bold">!</span>
                                        </div>
                                      ) : isCalling ? (
                                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                                          <Phone className="w-2.5 h-2.5 text-white" />
                                        </div>
                                      ) : (
                                        <input
                                          type="checkbox"
                                          checked={selectedContacts.has(contact.id)}
                                          onChange={e => handleContactSelect(contact.id, e.target.checked)}
                                          className="w-3.5 h-3.5 rounded border-zinc-300 cursor-pointer"
                                        />
                                      )}
                                    </div>
                                  </td>
                                  {/* Primary Phone column */}
                                  <td className="px-3 py-1.5 whitespace-nowrap overflow-hidden border-r border-zinc-100">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-mono font-medium truncate ${isCalling ? 'text-green-600' : 'text-green-700'}`}>
                                        {contact.phone}
                                      </span>
                                      {isCalling && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                          <Phone className="w-3 h-3" />
                                          INIȚIERE...
                                        </span>
                                      )}
                                      {isProcessingCall && (
                                        <div className="inline-flex items-center gap-2">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                            <Phone className="w-3 h-3 animate-bounce" />
                                            ÎN CONVORBIRE
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              markCallCompleted(contact.id);
                                              toast({
                                                title: "Marcat ca terminat",
                                                description: `Apelul către ${contact.name} a fost marcat ca terminat manual`
                                              });
                                            }}
                                            className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded hover:bg-green-200 transition"
                                            title="Click pentru a marca apelul ca terminat"
                                          >
                                            ✓ Terminat?
                                          </button>
                                        </div>
                                      )}
                                      {isCompleted && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                          <CheckCircle2 className="w-3 h-3" />
                                          TERMINAT
                                        </span>
                                      )}
                                      {isFailed && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                          <X className="w-3 h-3" />
                                          EȘUAT
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  {/* Dynamic data columns from CSV */}
                                  {csvHeaders.length > 0 ? (
                                    csvHeaders.map((header, idx) => {
                                      const value = contact.extraFields?.[header] || '';
                                      return (
                                        <td key={idx} className="px-3 py-1.5 whitespace-nowrap overflow-hidden border-r border-zinc-100">
                                          <span className="text-sm text-zinc-700 truncate block" title={value}>
                                            {value || '—'}
                                          </span>
                                        </td>
                                      );
                                    })
                                  ) : (
                                    <>
                                      <td className="px-3 py-1.5 whitespace-nowrap overflow-hidden border-r border-zinc-100">
                                        <span className="text-sm text-zinc-700 truncate block">{contact.name}</span>
                                      </td>
                                      <td className="px-3 py-1.5 whitespace-nowrap overflow-hidden border-r border-zinc-100">
                                        <span className="text-sm text-zinc-400 truncate block">{contact.location || '—'}</span>
                                      </td>
                                    </>
                                  )}
                                  {/* Extra phones */}
                                  {contacts.some(c => c.phones && c.phones.length > 1) && (
                                    <>
                                      {Array.from({ length: Math.max(...contacts.map(c => (c.phones?.length || 1) - 1)) }, (_, i) => (
                                        <td key={`phone-${i + 2}`} className="px-3 py-1.5 whitespace-nowrap overflow-hidden border-r border-zinc-100">
                                          <span className="text-sm font-mono text-green-600 truncate block">
                                            {contact.phones?.[i + 1] || '—'}
                                          </span>
                                        </td>
                                      ))}
                                    </>
                                  )}
                                  {/* Actions */}
                                  <td className={`px-2 py-1.5 ${rowBg}`}>
                                    {!isDisabled && (
                                      <button
                                        onClick={() => handleContactDelete(contact.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                        title="Șterge contact"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
              )}
            </main>
          </div>
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
      </div>
    </DashboardLayout>;
};
export default Outbound;