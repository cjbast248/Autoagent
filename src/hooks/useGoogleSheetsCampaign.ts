import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useCallInitiation } from './useCallInitiation';

export interface GoogleSheetsContact {
  id: string;
  integration_id: string;
  user_id: string;
  row_number: number;
  name: string;
  phone: string;
  email?: string;
  location?: string;
  language: string;
  metadata?: any;
  call_status: 'pending' | 'calling' | 'completed' | 'failed';
  last_call_at?: string;
  conversation_id?: string;
  call_result?: any;
  created_at: string;
  updated_at: string;
}

interface UseGoogleSheetsCampaignProps {
  integrationId: string;
}

export const useGoogleSheetsCampaign = ({ integrationId }: UseGoogleSheetsCampaignProps) => {
  const queryClient = useQueryClient();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [agentId, setAgentId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [callInterval, setCallInterval] = useState(20);
  const [isCampaignRunning, setIsCampaignRunning] = useState(false);
  const [currentContactIndex, setCurrentContactIndex] = useState(0);

  // Fetch contacts from database
  const { data: contacts = [], isLoading: isLoadingContacts, refetch: refetchContacts } = useQuery({
    queryKey: ['google-sheets-contacts', integrationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_sheets_contacts')
        .select('*')
        .eq('integration_id', integrationId)
        .order('row_number', { ascending: true });

      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }

      return data as GoogleSheetsContact[];
    },
    enabled: !!integrationId,
  });

  // Import contacts mutation
  const importContactsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('import-google-sheets-contacts', {
        body: { integration_id: integrationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-contacts', integrationId] });
      toast({
        title: 'Import reușit',
        description: `Au fost importate ${data.imported} contacte${data.skipped > 0 ? `. ${data.skipped} contacte omise.` : '.'}`,
      });
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      toast({
        title: 'Eroare la import',
        description: error.message || 'Nu s-au putut importa contactele.',
        variant: 'destructive',
      });
    },
  });

  // Update Google Sheets mutation
  const updateSheetMutation = useMutation({
    mutationFn: async ({ contactId, callResult }: { contactId: string; callResult: any }) => {
      const { data, error } = await supabase.functions.invoke('update-google-sheets-contact', {
        body: {
          integration_id: integrationId,
          contact_id: contactId,
          call_result: callResult,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets-contacts', integrationId] });
    },
    onError: (error: any) => {
      console.error('Update sheet error:', error);
    },
  });

  // Get selected contacts for calling
  const getSelectedContactsData = useCallback(() => {
    return contacts.filter(c => selectedContacts.includes(c.id));
  }, [contacts, selectedContacts]);

  // Initialize call initiation hook
  const callInitiation = useCallInitiation({
    agentId,
    phoneId: phoneNumber,
  });

  // Wrapper to update both local state and callInitiation interval
  const updateCallInterval = useCallback((value: number) => {
    setCallInterval(value);
    callInitiation.setCallInterval(value);
  }, [callInitiation]);

  // Start campaign
  const startCampaign = useCallback(async () => {
    if (!agentId || !phoneNumber) {
      toast({
        title: 'Configurare incompletă',
        description: 'Selectează agentul și numărul de telefon.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedContacts.length === 0) {
      toast({
        title: 'Niciun contact selectat',
        description: 'Selectează cel puțin un contact pentru apelare.',
        variant: 'destructive',
      });
      return;
    }

    setIsCampaignRunning(true);
    setCurrentContactIndex(0);

    const contactsToCall = getSelectedContactsData().map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      language: c.language || 'ro',
      location: c.location || '',
    }));

    await callInitiation.processBatchCalls(contactsToCall, agentId);
    setIsCampaignRunning(false);
  }, [agentId, phoneNumber, selectedContacts, getSelectedContactsData, callInitiation]);

  // Pause campaign
  const pauseCampaign = useCallback(() => {
    callInitiation.pauseBatch();
  }, [callInitiation]);

  // Resume campaign
  const resumeCampaign = useCallback(() => {
    callInitiation.resumeBatch();
  }, [callInitiation]);

  // Stop campaign
  const stopCampaign = useCallback(() => {
    callInitiation.stopBatch();
    setIsCampaignRunning(false);
  }, [callInitiation]);

  // Toggle contact selection
  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  }, []);

  // Select all contacts
  const selectAllContacts = useCallback(() => {
    setSelectedContacts(contacts.map(c => c.id));
  }, [contacts]);

  // Deselect all contacts
  const deselectAllContacts = useCallback(() => {
    setSelectedContacts([]);
  }, []);

  // Calculate campaign stats
  const campaignStats = {
    total: selectedContacts.length,
    completed: contacts.filter(c => selectedContacts.includes(c.id) && c.call_status === 'completed').length,
    failed: contacts.filter(c => selectedContacts.includes(c.id) && c.call_status === 'failed').length,
    pending: contacts.filter(c => selectedContacts.includes(c.id) && c.call_status === 'pending').length,
  };

  return {
    // Contacts data
    contacts,
    isLoadingContacts,
    refetchContacts,
    
    // Selection
    selectedContacts,
    toggleContactSelection,
    selectAllContacts,
    deselectAllContacts,
    
    // Configuration
    agentId,
    setAgentId,
    phoneNumber,
    setPhoneNumber,
    callInterval,
    setCallInterval: updateCallInterval,
    
    // Campaign control
    isCampaignRunning,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    
    // Import
    importContacts: importContactsMutation.mutate,
    isImporting: importContactsMutation.isPending,
    
    // Stats
    campaignStats,
    currentContactIndex,
    
    // Call initiation state
    isInitiating: callInitiation.isInitiating,
    progress: callInitiation.currentProgress,
    totalCalls: callInitiation.totalCalls,
    currentContact: callInitiation.currentContact,
    isPaused: callInitiation.isPaused,
    isStopped: callInitiation.isStopped,
    nextCallCountdown: callInitiation.nextCallCountdown,
  };
};
