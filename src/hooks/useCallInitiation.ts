import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useCallSessionTracking } from '@/hooks/useCallSessionTracking';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useSMSService } from './useSMSService';
import { validateUserHasPhoneNumber } from '@/utils/phoneNumberUtils';
import { ENV } from '@/config/environment';
import { getAccessTokenSync } from '@/utils/sessionManager';

// Helper pentru Edge Function calls cu timeout
const invokeEdgeFunction = async (functionName: string, body: any, timeoutMs = 30000): Promise<{ data?: any; error?: any }> => {
  console.log(`📡 invokeEdgeFunction: Starting ${functionName}...`);

  const accessToken = getAccessTokenSync();
  if (!accessToken) {
    console.error('📡 invokeEdgeFunction: No access token!');
    return { error: { message: 'No access token available' } };
  }

  const url = `${ENV.SUPABASE_URL}/functions/v1/${functionName}`;
  console.log(`📡 invokeEdgeFunction: URL = ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`📡 invokeEdgeFunction: TIMEOUT after ${timeoutMs}ms!`);
    controller.abort();
  }, timeoutMs);

  try {
    console.log(`📡 invokeEdgeFunction: Fetching...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'apikey': ENV.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log(`📡 invokeEdgeFunction: Got response, status = ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`📡 invokeEdgeFunction: HTTP error ${response.status}: ${errorText}`);
      return { error: { message: `HTTP ${response.status}: ${errorText}` } };
    }

    const data = await response.json();
    console.log(`📡 invokeEdgeFunction: Success!`, data);
    return { data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`📡 invokeEdgeFunction: Exception`, err);
    if (err.name === 'AbortError') {
      return { error: { message: `Edge function ${functionName} timed out after ${timeoutMs}ms` } };
    }
    return { error: { message: err.message } };
  }
};

interface SMSConfig {
  enabled: boolean;
  apiToken: string;
  senderId: string;
  message: string;
  delay: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  language: string;
  location: string;
  // Dynamic variables to send to agent
  dynamicVariables?: Record<string, string>;
}

interface RetrySettings {
  enabled: boolean;
  retryMinutes: number;
  maxRetries: number;
}

interface UseCallInitiationProps {
  agentId: string;
  phoneId?: string;
  smsConfig?: SMSConfig;
  retrySettings?: RetrySettings;
  concurrentCalls?: number;
}

interface CallStatus {
  contactId: string;
  contactName: string;
  status: 'waiting' | 'calling' | 'in-progress' | 'processing' | 'completed' | 'failed';
  conversationId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  cost?: number;
}

export const useCallInitiation = ({
  agentId,
  phoneId,
  smsConfig,
  retrySettings,
  concurrentCalls = 1,
}: UseCallInitiationProps) => {
  const { user } = useAuth();
  const { scheduleSMS } = useSMSService();
  const { saveCallSession } = useCallSessionTracking();
  const [isInitiating, setIsInitiating] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [currentContact, setCurrentContact] = useState<string>('');
  const [callStatuses, setCallStatuses] = useState<CallStatus[]>([]);
  const [currentCallStatus, setCurrentCallStatus] = useState<string>('');
  const [callInterval, setCallInterval] = useState<number>(20); // Default 20 seconds for continuous calling
  const [nextCallCountdown, setNextCallCountdown] = useState<number>(0);

  // Use refs for pause/stop states to avoid closure issues in continuous mode
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isStoppedRef.current = isStopped;
  }, [isStopped]);

  // Enhanced logging function
  const logStep = (step: string, details: any = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`🔍 [${timestamp}] ${step}:`, details);
  };

  // Get all conversations for an agent with enhanced logging
  const getAgentConversations = async (targetAgentId: string): Promise<any> => {
    try {
      logStep('STEP: Getting agent conversations', { targetAgentId });

      const { data, error } = await invokeEdgeFunction('get-agent-conversations', { agentId: targetAgentId });

      if (error) {
        logStep('ERROR: Edge function error in getAgentConversations', { error, targetAgentId });
        return { error: error.message, status: 'api_error' };
      }

      if (data?.error) {
        logStep('ERROR: ElevenLabs API error in getAgentConversations', { error: data.error, status: data.status });
        return { error: data.error, status: data.status || 'api_error' };
      }

      logStep('SUCCESS: Agent conversations retrieved', { 
        conversationCount: data?.conversations?.length || 0,
        targetAgentId 
      });
      return data;
    } catch (error: any) {
      logStep('CRITICAL ERROR: Exception in getAgentConversations', { error: error.message, targetAgentId });
      return { error: error.message, status: 'critical_error' };
    }
  };

  // Get conversation details with enhanced logging
  const getConversationDetails = async (conversationId: string): Promise<any> => {
    try {
      logStep('STEP: Getting conversation details', { conversationId });

      const { data, error } = await invokeEdgeFunction('get-elevenlabs-conversation', { conversationId });

      if (error) {
        logStep('ERROR: Edge function error in getConversationDetails', { error, conversationId });
        return { error: error.message, status: 'api_error' };
      }

      if (data?.error) {
        logStep('ERROR: ElevenLabs API error in getConversationDetails', { error: data.error, status: data.status });
        return { error: data.error, status: data.status || 'api_error' };
      }

      logStep('SUCCESS: Conversation details retrieved', { conversationId, hasData: !!data });
      return data;
    } catch (error: any) {
      logStep('CRITICAL ERROR: Exception in getConversationDetails', { error: error.message, conversationId });
      return { error: error.message, status: 'critical_error' };
    }
  };

  // Get existing conversation IDs from call_history
  const getExistingConversationIds = async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('conversation_id')
        .not('conversation_id', 'is', null);

      if (error) {
        logStep('ERROR: Failed to get existing conversation IDs', { error });
        return [];
      }

      const existingIds = (data || [])
        .map(item => item.conversation_id)
        .filter(id => id && id.trim() !== '');

      logStep('SUCCESS: Retrieved existing conversation IDs', { count: existingIds.length });
      return existingIds;
    } catch (error: any) {
      logStep('CRITICAL ERROR: Exception in getExistingConversationIds', { error: error.message });
      return [];
    }
  };

  // Monitor call and detect new conversations
  const monitorCall = async (targetAgentId: string, contact: Contact, callStartTime: Date): Promise<any[]> => {
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const pollInterval = 30000; // 30 seconds
    const startTime = Date.now();

    logStep('MONITOR: Starting conversation monitoring', {
      targetAgentId,
      contactName: contact.name,
      maxWaitTime: maxWaitTime / 1000 + 's',
      pollInterval: pollInterval / 1000 + 's'
    });

    // Get existing conversation IDs before monitoring
    const existingIds = await getExistingConversationIds();
    logStep('MONITOR: Existing conversation IDs retrieved', { count: existingIds.length });

    let foundNewConversations: any[] = [];
    let attempts = 0;

    while (Date.now() - startTime < maxWaitTime && foundNewConversations.length === 0) {
      attempts++;
      
      try {
        logStep(`MONITOR ATTEMPT ${attempts}: Checking for new conversations`, {
          contactName: contact.name,
          elapsedTime: Math.round((Date.now() - startTime) / 1000) + 's'
        });

        const conversationsResponse = await getAgentConversations(targetAgentId);
        
        if (conversationsResponse.error) {
          logStep(`MONITOR ATTEMPT ${attempts}: Error getting conversations`, { 
            error: conversationsResponse.error,
            contactName: contact.name 
          });
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        const allConversations = conversationsResponse?.conversations || [];
        
        // Filter for new conversations that started after our call initiation
        const newConversations = allConversations.filter((conv: any) => {
          const convStartTime = new Date(conv.start_time || conv.created_at);
          const conversationId = conv.conversation_id || conv.id;
          
          const isAfterCallStart = convStartTime >= callStartTime;
          const isNotExisting = !existingIds.includes(conversationId);
          
          logStep(`MONITOR: Evaluating conversation`, {
            conversationId,
            convStartTime: convStartTime.toISOString(),
            callStartTime: callStartTime.toISOString(),
            isAfterCallStart,
            isNotExisting,
            include: isAfterCallStart && isNotExisting
          });

          return isAfterCallStart && isNotExisting;
        });

        if (newConversations.length > 0) {
          logStep(`MONITOR SUCCESS: Found ${newConversations.length} new conversations`, {
            contactName: contact.name,
            attempts,
            conversations: newConversations.map(c => ({
              id: c.conversation_id || c.id,
              startTime: c.start_time || c.created_at
            }))
          });
          
          foundNewConversations = newConversations;
          break;
        } else {
          logStep(`MONITOR ATTEMPT ${attempts}: No new conversations found yet`, {
            contactName: contact.name,
            totalConversations: allConversations.length,
            timeRemaining: Math.round((maxWaitTime - (Date.now() - startTime)) / 1000) + 's'
          });
        }

      } catch (monitorError: any) {
        logStep(`MONITOR ATTEMPT ${attempts}: Exception during monitoring`, {
          error: monitorError.message,
          contactName: contact.name
        });
      }

      // Wait before next attempt
      if (foundNewConversations.length === 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    if (foundNewConversations.length === 0) {
      logStep('MONITOR TIMEOUT: No new conversations found within time limit', {
        contactName: contact.name,
        totalAttempts: attempts,
        totalWaitTime: Math.round((Date.now() - startTime) / 1000) + 's'
      });
    }

    return foundNewConversations;
  };

  // Schedule retry call
  const scheduleRetryCall = async (contact: Contact, isRetryAttempt: boolean = false) => {
    if (!retrySettings?.enabled) return;

    try {
      const { data, error } = await invokeEdgeFunction('detect-callback-intent', {
        conversation_id: `retry_${contact.id}_${Date.now()}`,
        user_id: user?.id,
        contact_name: contact.name,
        phone_number: contact.phone,
        agent_id: agentId,
        retry_minutes: retrySettings.retryMinutes || 10,
        max_retries: retrySettings.maxRetries || 2,
      });

      if (error) {
        logStep('ERROR: Failed to schedule retry call', { error, contactName: contact.name });
      } else {
        logStep('SUCCESS: Retry call scheduled', { 
          contactName: contact.name,
          retryMinutes: retrySettings.retryMinutes
        });
        toast({
          title: "Re-apelare programată",
          description: `Apel către ${contact.name} programat pentru re-încercare în ${retrySettings.retryMinutes} minute`,
        });
      }
    } catch (error: any) {
      logStep('CRITICAL ERROR: Exception scheduling retry call', { 
        error: error.message, 
        contactName: contact.name 
      });
    }
  };

  // Save complete call data with enhanced logging
  const saveCompleteCallData = async (conversationData: any, contact: Contact, conversationId: string) => {
    try {
      logStep('STEP: Saving complete call data', { 
        conversationId,
        contactName: contact.name,
        hasConversationData: !!conversationData 
      });

      const cost = conversationData?.cost || conversationData?.usage?.cost || 0;
      const duration = conversationData?.duration_seconds || 
                      conversationData?.duration || 
                      (conversationData?.end_time && conversationData?.start_time ? 
                        Math.floor((new Date(conversationData.end_time).getTime() - 
                                   new Date(conversationData.start_time).getTime()) / 1000) : 0);

      const callRecord = {
        user_id: user?.id,
        phone_number: contact.phone,
        contact_name: contact.name,
        call_status: conversationData?.status === 'completed' ? 'completed' : 
                    conversationData?.status === 'failed' ? 'failed' : 'completed',
        summary: conversationData?.summary || `Conversație ${conversationData?.status || 'completă'} cu ${contact.name}`,
        dialog_json: JSON.stringify({
          full_conversation_data: conversationData,
          contact_info: contact,
          processing_timestamp: new Date().toISOString()
        }, null, 2),
        call_date: new Date().toISOString(),
        cost_usd: Number(cost) || 0,
        duration_seconds: Number(duration) || 0,
        agent_id: agentId,
        conversation_id: conversationId,
        language: 'ro'
      };

      console.log(`📝 Inserting call record for ${contact.name}:`, callRecord);

      const { data: insertData, error: insertError } = await supabase
        .from('call_history')
        .insert(callRecord)
        .select();

      if (insertError) {
        console.error(`❌ Error saving call data for ${contact.name}:`, insertError);
        toast({
          title: "Eroare salvare",
          description: `Nu s-au putut salva datele pentru ${contact.name}: ${insertError.message}`,
          variant: "destructive",
        });
      } else {
        console.log(`✅ Successfully saved call data for ${contact.name}:`, insertData);
        toast({
          title: "Date salvate",
          description: `Datele complete pentru apelul către ${contact.name} au fost salvate în istoric`,
        });
      }
      
      return insertData;
    } catch (error: any) {
      console.error(`💥 Critical error saving call data for ${contact.name}:`, error);
      toast({
        title: "Eroare salvare",
        description: `Nu s-au putut salva datele pentru ${contact.name}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Enhanced continuous batch processing - calls every 20 seconds regardless of status
  const processBatchCalls = useCallback(async (contacts: Contact[], targetAgentId: string) => {
    logStep('START: Continuous batch processing initiated', { 
      contactCount: contacts.length,
      targetAgentId,
      callInterval: callInterval + 's'
    });

    if (!targetAgentId || contacts.length === 0) {
      logStep('ERROR: Missing required parameters for batch processing', { 
        hasAgentId: !!targetAgentId,
        contactCount: contacts.length 
      });
      toast({
        title: "Eroare",
        description: "Agent ID și contactele sunt obligatorii",
        variant: "destructive",
      });
      return;
    }

    // Validate user has phone number before starting batch
    if (!phoneId) {
      toast({
        title: "Număr de telefon lipsă",
        description: "Te rog selectează un număr de telefon pentru apeluri",
        variant: "destructive",
      });
      return;
    }

    // Get selected phone number info
    if (user?.id) {
      const { data: selectedPhone } = await supabase
        .from('user_phone_numbers')
        .select('phone_number, label')
        .eq('id', phoneId)
        .single();

      if (selectedPhone) {
        toast({
          title: "Începe campania",
          description: `Apelurile vor fi făcute de pe: ${selectedPhone.label || selectedPhone.phone_number}`,
        });
      }
    }

    setIsProcessingBatch(true);
    setIsPaused(false);
    setIsStopped(false);
    setTotalCalls(contacts.length);
    setCurrentProgress(0);
    setCurrentCallStatus('Începe procesarea continuă...');
    
    // Initialize all contacts with 'waiting' status
    const initialStatuses: CallStatus[] = contacts.map(contact => ({
      contactId: contact.id,
      contactName: contact.name,
      status: 'waiting'
    }));
    setCallStatuses(initialStatuses);

    try {
      // Process contacts sequentially with continuous flow
      for (let contactIndex = 0; contactIndex < contacts.length; contactIndex++) {
        // Check if stopped using ref to avoid stale closure
        if (isStoppedRef.current) {
          logStep('CONTINUOUS PROCESSING: STOPPED by user');
          setCurrentCallStatus('🛑 Procesare oprită de utilizator');
          break;
        }

        // Handle pause state
        while (isPausedRef.current && !isStoppedRef.current) {
          setCurrentCallStatus('⏸️ Procesare în pauză...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Check again if stopped after pause
        if (isStoppedRef.current) {
          logStep('CONTINUOUS PROCESSING: STOPPED by user after pause');
          setCurrentCallStatus('🛑 Procesare oprită de utilizator');
          break;
        }

        const contact = contacts[contactIndex];
        const callStartTime = new Date();
        
        logStep(`CONTINUOUS CALL ${contactIndex + 1}/${contacts.length}: Initiating call`, { 
          contactName: contact.name,
          phone: contact.phone,
          startTime: callStartTime.toISOString() 
        });

        setCurrentCallStatus(`Inițiază apelul către ${contact.name}...`);

        // Update contact status to 'calling' and increment progress immediately
        setCallStatuses(prevStatuses => 
          prevStatuses.map(status => 
            status.contactId === contact.id
              ? { ...status, status: 'calling', startTime: callStartTime }
              : status
          )
        );

        // Fire the call and get conversationId
        const callPromise = initiateCall(contact, targetAgentId).then(async (conversationId) => {
          if (!conversationId) {
            logStep(`CONTINUOUS CALL ${contactIndex + 1}: Call failed - no conversationId`, {
              contactName: contact.name
            });
            setCallStatuses(prevStatuses =>
              prevStatuses.map(status =>
                status.contactId === contact.id
                  ? { ...status, status: 'failed', endTime: new Date() }
                  : status
              )
            );
            return;
          }

          logStep(`CONTINUOUS CALL ${contactIndex + 1}: Call initiated with conversationId`, {
            contactName: contact.name,
            conversationId
          });

          // Update status to processing (call was initiated, now monitoring)
          setCallStatuses(prevStatuses =>
            prevStatuses.map(status =>
              status.contactId === contact.id
                ? { ...status, status: 'processing', conversationId }
                : status
            )
          );

          // Start direct monitoring using conversationId (don't await - runs in background)
          const backgroundMonitoring = async () => {
            try {
              // Use direct monitoring with the conversationId - polls every 5 seconds
              const conversationDetails = await monitorConversationById(conversationId, contact);

              if (conversationDetails && !conversationDetails.error) {
                await saveCompleteCallData(conversationDetails, contact, conversationId);

                // Update final status to completed
                setCallStatuses(prevStatuses =>
                  prevStatuses.map(status =>
                    status.contactId === contact.id
                      ? {
                          ...status,
                          status: 'completed',
                          conversationId,
                          endTime: new Date(),
                          duration: conversationDetails.duration_seconds || conversationDetails.metadata?.call_duration_secs || 0,
                          cost: conversationDetails.cost || 0
                        }
                      : status
                  )
                );

                logStep(`BACKGROUND MONITOR: Call completed for ${contact.name}`, {
                  conversationId,
                  duration: conversationDetails.duration_seconds || conversationDetails.metadata?.call_duration_secs
                });
              } else {
                logStep(`BACKGROUND MONITOR: Error or no details for ${contact.name}`, {
                  error: conversationDetails?.error
                });

                // Still mark as completed after timeout (call likely finished, just no data)
                setCallStatuses(prevStatuses =>
                  prevStatuses.map(status =>
                    status.contactId === contact.id
                      ? { ...status, status: 'completed', endTime: new Date() }
                      : status
                  )
                );
              }
            } catch (monitorError: any) {
              logStep(`BACKGROUND MONITOR: Exception for ${contact.name}`, {
                error: monitorError.message
              });

              // Mark as completed anyway - the call was initiated successfully
              setCallStatuses(prevStatuses =>
                prevStatuses.map(status =>
                  status.contactId === contact.id
                    ? { ...status, status: 'completed', endTime: new Date() }
                    : status
                )
              );
            }
          };
          
          // Run monitoring in background without waiting
          backgroundMonitoring();
          
        }).catch((callError) => {
          logStep(`CONTINUOUS CALL ${contactIndex + 1}: Call initiation failed`, { 
            contactName: contact.name,
            error: callError.message
          });
          
          setCallStatuses(prevStatuses => 
            prevStatuses.map(status => 
              status.contactId === contact.id
                ? { ...status, status: 'failed', endTime: new Date() }
                : status
            )
          );
        });

        // Don't await the call - let it run in background
        // The promise is intentionally not awaited to allow parallel processing

        // Immediately increment progress (contact processed, regardless of result)
        setCurrentProgress(contactIndex + 1);
        
        logStep(`CONTINUOUS CALL ${contactIndex + 1}: Progress updated`, { 
          currentProgress: contactIndex + 1,
          totalCalls: contacts.length
        });

        // Wait for the call interval before next call (but not after the last call)
        if (contactIndex < contacts.length - 1 && !isPausedRef.current && !isStoppedRef.current) {
          logStep(`⏳ Waiting ${callInterval} seconds before next call...`);
          
          setCurrentCallStatus(`Următorul apel în ${callInterval} secunde...`);
          
          // Countdown timer for next call
          for (let countdown = callInterval; countdown > 0 && !isPausedRef.current && !isStoppedRef.current; countdown--) {
            setNextCallCountdown(countdown);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          setNextCallCountdown(0);
        }
      }

      logStep('CONTINUOUS PROCESSING: COMPLETED', { 
        totalContacts: contacts.length,
        processedCalls: contacts.length
      });

      setCurrentCallStatus('✅ Toate apelurile au fost inițiate!');

    } catch (continuousError: any) {
      logStep('CONTINUOUS PROCESSING: CRITICAL ERROR', { 
        error: continuousError.message,
        stack: continuousError.stack 
      });

      toast({
        title: "Eroare critică",
        description: `Eroare în procesarea continuă: ${continuousError.message}`,
        variant: "destructive",
      });
      setCurrentCallStatus('❌ Eroare în procesare');
    } finally {
      setIsProcessingBatch(false);
      setNextCallCountdown(0);
    }
  }, [agentId, phoneId, user, smsConfig, retrySettings, callInterval, scheduleSMS]);

  // Monitor a specific conversation by ID until it's done
  const monitorConversationById = async (conversationId: string, contact: Contact, maxWaitTime = 3 * 60 * 1000): Promise<any> => {
    const pollInterval = 5000; // Check every 5 seconds
    const startTime = Date.now();

    logStep('DIRECT MONITOR: Starting conversation monitoring', { conversationId, contactName: contact.name });

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const details = await getConversationDetails(conversationId);

        if (details.error) {
          logStep('DIRECT MONITOR: Error getting details', { error: details.error });
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        // Check if conversation has ended
        const status = details.status || details.call_status;
        logStep('DIRECT MONITOR: Conversation status', { conversationId, status, elapsed: Math.round((Date.now() - startTime) / 1000) + 's' });

        if (status === 'done' || status === 'ended' || status === 'completed' || details.end_time) {
          logStep('DIRECT MONITOR: Conversation completed!', { conversationId, status });
          return details;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (err: any) {
        logStep('DIRECT MONITOR: Exception', { error: err.message });
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    logStep('DIRECT MONITOR: Timeout - marking as completed anyway', { conversationId });
    // After timeout, return what we have - the call likely finished but API is slow
    return await getConversationDetails(conversationId);
  };

  // Individual call initiation - returns conversationId if successful
  const initiateCall = useCallback(async (contact: Contact, targetAgentId: string): Promise<string | null> => {
    if (!targetAgentId) {
      toast({
        title: "Eroare",
        description: "Agent ID este obligatoriu",
        variant: "destructive",
      });
      return null;
    }

    setIsInitiating(true);
    console.log('🚀 initiateCall: Starting call initiation...');

    try {
      const phoneNumber = contact.phone?.startsWith('+') ? contact.phone : `+${contact.phone}`;
      const contactName = contact.name || `KALINA - ${phoneNumber}`;

      // Prepare dynamic variables - use contact's dynamicVariables if available, otherwise default to name
      const dynamicVars = contact.dynamicVariables && Object.keys(contact.dynamicVariables).length > 0
        ? contact.dynamicVariables
        : { name: contactName };

      console.log('🚀 initiateCall: Calling invokeEdgeFunction...', {
        targetAgentId,
        phoneNumber,
        contactName,
        dynamicVariables: dynamicVars
      });

      const { data, error } = await invokeEdgeFunction('initiate-scheduled-call', {
        agent_id: targetAgentId,
        phone_number: phoneNumber,
        contact_name: contactName,
        user_id: user?.id,
        phone_id: phoneId,
        language: contact.language || 'ro',
        name_user: user?.email?.split('@')[0] || 'utilizator',
        dynamic_variables: dynamicVars
      });

      console.log('🚀 initiateCall: invokeEdgeFunction returned', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        toast({
          title: "Eroare",
          description: `Eroare Supabase: ${error.message}`,
          variant: "destructive",
        });
        return null;
      }

      if (data?.success && data.conversationId) {
        toast({
          title: "Apel inițiat",
          description: `Apelul către ${contactName} a fost inițiat cu succes!`,
        });

        // Save to session tracking
        saveCallSession.mutate({
          session_id: data.conversationId,
          agent_id: targetAgentId,
          contact_name: contactName,
          phone_number: phoneNumber,
          session_type: 'phone_call'
        });

        return data.conversationId;
      } else {
        console.error('ElevenLabs API error:', data);
        toast({
          title: "Eroare",
          description: `Apel eșuat: ${data?.error || 'Eroare necunoscută'}`,
          variant: "destructive",
        });
        return null;
      }
    } catch (error: any) {
      console.error('Critical error:', error);
      toast({
        title: "Eroare critică",
        description: `Nu s-a putut iniția apelul: ${error.message}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsInitiating(false);
    }
  }, [user?.id, saveCallSession]);

  const handleInitiateCall = useCallback(async (contact: Contact) => {
    await initiateCall(contact, agentId);
  }, [initiateCall, agentId]);

  // Batch control functions
  const pauseBatch = useCallback(() => {
    setIsPaused(true);
    logStep('BATCH CONTROL: Paused by user');
  }, []);

  const resumeBatch = useCallback(() => {
    setIsPaused(false);
    logStep('BATCH CONTROL: Resumed by user');
  }, []);

  const stopBatch = useCallback(() => {
    setIsStopped(true);
    setIsPaused(false);
    logStep('BATCH CONTROL: Stopped by user');
  }, []);

  // Manually mark a call as completed
  const markCallCompleted = useCallback((contactId: string) => {
    setCallStatuses(prevStatuses =>
      prevStatuses.map(status =>
        status.contactId === contactId
          ? { ...status, status: 'completed', endTime: new Date() }
          : status
      )
    );
    logStep('MANUAL: Call marked as completed by user', { contactId });
  }, []);

  // ============================================
  // 🔴 REALTIME: Subscribe to call_history for instant updates
  // When ElevenLabs webhook saves a completed call, update UI immediately
  // ============================================
  const realtimeChannelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    // Subscribe when batch processing starts
    if (isProcessingBatch && !isSubscribedRef.current) {
      logStep('REALTIME: 🔴 Starting subscription to call_history...');
      isSubscribedRef.current = true;

      const channel = supabase
        .channel('call-history-realtime-' + Date.now()) // Unique channel name
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_history'
          },
          (payload: any) => {
            const newRecord = payload.new;
            console.log('🔴 REALTIME EVENT RECEIVED:', {
              conversation_id: newRecord?.conversation_id,
              duration: newRecord?.duration_seconds,
              cost: newRecord?.cost_usd,
              full_payload: newRecord
            });

            if (newRecord?.conversation_id) {
              // Check if this conversation_id matches any active call
              setCallStatuses(prevStatuses => {
                console.log('🔴 REALTIME: Checking against statuses:',
                  prevStatuses.map(s => ({ id: s.contactId, convId: s.conversationId, status: s.status }))
                );

                const matchIndex = prevStatuses.findIndex(
                  s => s.conversationId === newRecord.conversation_id
                );

                if (matchIndex === -1) {
                  console.log('🔴 REALTIME: No matching call found for conversation_id:', newRecord.conversation_id);
                  return prevStatuses;
                }

                console.log('🔴 REALTIME: ✅ MATCH FOUND! Updating to COMPLETED:', {
                  conversationId: newRecord.conversation_id,
                  contactName: prevStatuses[matchIndex].contactName
                });

                return prevStatuses.map(status =>
                  status.conversationId === newRecord.conversation_id
                    ? {
                        ...status,
                        status: 'completed' as const,
                        endTime: new Date(),
                        duration: newRecord.duration_seconds || 0,
                        cost: newRecord.cost_usd || 0
                      }
                    : status
                );
              });
            }
          }
        )
        .subscribe((status, err) => {
          console.log('🔴 REALTIME: Subscription status:', status, err ? `Error: ${err}` : '');
          if (status === 'SUBSCRIBED') {
            console.log('🔴 REALTIME: ✅ Successfully subscribed to call_history!');
          }
        });

      realtimeChannelRef.current = channel;
    }

    // Cleanup when batch processing ends
    if (!isProcessingBatch && isSubscribedRef.current && realtimeChannelRef.current) {
      console.log('🔴 REALTIME: Batch ended, unsubscribing...');
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
      isSubscribedRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (realtimeChannelRef.current) {
        console.log('🔴 REALTIME: Component unmounting, cleaning up...');
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [isProcessingBatch]);

  return {
    processBatchCalls,
    initiateCall,
    handleInitiateCall,
    isInitiating,
    isProcessingBatch,
    isPaused,
    isStopped,
    currentProgress,
    totalCalls,
    currentContact,
    callStatuses,
    currentCallStatus,
    pauseBatch,
    resumeBatch,
    stopBatch,
    markCallCompleted,
    callInterval,
    setCallInterval,
    nextCallCountdown,
  };
};