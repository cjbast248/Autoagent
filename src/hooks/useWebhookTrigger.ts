import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from 'sonner';
import { ENV } from '@/config/environment';

export interface WebhookTrigger {
  id: string;
  workflow_id: string | null;
  user_id: string;
  webhook_path: string;
  http_method: string;
  auth_type: string;
  auth_config: any;
  respond_mode: string;
  response_mode: 'sync' | 'async' | 'callback' | 'immediately' | 'using-node' | null;
  sync_timeout_seconds: number;
  rate_limit_per_minute: number;
  signature_secret: string | null;
  callback_url: string | null;
  allowed_origins: string[] | null;
  custom_headers: any;
  timeout_seconds: number;
  is_active: boolean;
  is_listening: boolean;
  total_triggers: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookTriggerLog {
  id: string;
  webhook_trigger_id: string;
  workflow_id: string | null;
  user_id: string | null;
  request_method: string;
  request_headers: any;
  request_body: any;
  request_query: any;
  source_ip: string | null;
  response_status: number;
  response_body: any;
  execution_time_ms: number;
  is_test: boolean;
  triggered_at: string;
}

export interface WebhookConfig {
  http_method?: string;
  auth_type?: string;
  auth_config?: {
    username?: string;
    password?: string;
    headerName?: string;
    headerValue?: string;
    jwt_secret?: string;
  };
  respond_mode?: string;
  response_mode?: 'sync' | 'async' | 'callback' | 'immediately' | 'using-node';
  sync_timeout_seconds?: number;
  rate_limit_per_minute?: number;
  signature_secret?: string;
  callback_url?: string;
  allowed_origins?: string[];
  custom_headers?: Record<string, string>;
  timeout_seconds?: number;
}

export const useWebhookTrigger = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [testEvents, setTestEvents] = useState<WebhookTriggerLog[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const currentWebhookPathRef = useRef<string | null>(null);

  const generateWebhookPath = () => {
    return `wh_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  };

  const getWebhookUrls = (webhookPath: string) => {
    const baseUrl = `${ENV.SUPABASE_URL}/functions/v1`;
    return {
      testUrl: `${baseUrl}/workflow-webhook-test/${webhookPath}`,
      productionUrl: `${baseUrl}/workflow-webhook/${webhookPath}`,
    };
  };

  const createWebhookTrigger = useCallback(async (
    workflowId: string | null,
    config: WebhookConfig = {}
  ): Promise<WebhookTrigger | null> => {
    if (!user) {
      toast.error('Trebuie să fii autentificat');
      return null;
    }

    setIsLoading(true);
    try {
      const webhookPath = generateWebhookPath();
      
      const { data, error } = await supabase
        .from('workflow_webhook_triggers')
        .insert({
          workflow_id: workflowId,
          user_id: user.id,
          webhook_path: webhookPath,
          http_method: config.http_method || 'POST',
          auth_type: config.auth_type || 'none',
          auth_config: config.auth_config || {},
          respond_mode: config.respond_mode || 'immediately',
          allowed_origins: config.allowed_origins || null,
          custom_headers: config.custom_headers || {},
          timeout_seconds: config.timeout_seconds || 30,
          sync_timeout_seconds: config.sync_timeout_seconds || 30, // For sync/last_node/webhook_node modes
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Webhook trigger creat cu succes');
      return data as WebhookTrigger;
    } catch (error: any) {
      console.error('Error creating webhook trigger:', error);
      toast.error('Eroare la crearea webhook-ului');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateWebhookTrigger = useCallback(async (
    triggerId: string,
    config: Partial<WebhookConfig & { is_active?: boolean; workflow_id?: string }>
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const updateData: any = {};

      if (config.http_method !== undefined) updateData.http_method = config.http_method;
      if (config.auth_type !== undefined) updateData.auth_type = config.auth_type;
      if (config.auth_config !== undefined) updateData.auth_config = config.auth_config;
      if (config.respond_mode !== undefined) updateData.respond_mode = config.respond_mode;
      if (config.response_mode !== undefined) updateData.response_mode = config.response_mode;
      if (config.sync_timeout_seconds !== undefined) updateData.sync_timeout_seconds = config.sync_timeout_seconds;
      if (config.rate_limit_per_minute !== undefined) updateData.rate_limit_per_minute = config.rate_limit_per_minute;
      if (config.signature_secret !== undefined) updateData.signature_secret = config.signature_secret;
      if (config.callback_url !== undefined) updateData.callback_url = config.callback_url;
      if (config.allowed_origins !== undefined) updateData.allowed_origins = config.allowed_origins;
      if (config.custom_headers !== undefined) updateData.custom_headers = config.custom_headers;
      if (config.timeout_seconds !== undefined) updateData.timeout_seconds = config.timeout_seconds;
      if (config.is_active !== undefined) updateData.is_active = config.is_active;
      if (config.workflow_id !== undefined) updateData.workflow_id = config.workflow_id;

      console.log('[Webhook] 📝 Updating webhook trigger:', triggerId);
      console.log('[Webhook] 📝 Config received:', config);
      console.log('[Webhook] 📝 Update data being sent:', updateData);

      const { error, data } = await supabase
        .from('workflow_webhook_triggers')
        .update(updateData)
        .eq('id', triggerId)
        .select('id, respond_mode, response_mode');

      console.log('[Webhook] 📝 Update result:', { error, data });

      if (error) throw error;

      toast.success('Webhook actualizat');
      return true;
    } catch (error: any) {
      console.error('Error updating webhook trigger:', error);
      toast.error('Eroare la actualizarea webhook-ului');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteWebhookTrigger = useCallback(async (triggerId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workflow_webhook_triggers')
        .delete()
        .eq('id', triggerId);

      if (error) throw error;
      
      toast.success('Webhook șters');
      return true;
    } catch (error: any) {
      console.error('Error deleting webhook trigger:', error);
      toast.error('Eroare la ștergerea webhook-ului');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWebhookTrigger = useCallback(async (
    triggerId?: string,
    webhookPath?: string
  ): Promise<WebhookTrigger | null> => {
    try {
      let query = supabase.from('workflow_webhook_triggers').select('*');
      
      if (triggerId) {
        query = query.eq('id', triggerId);
      } else if (webhookPath) {
        query = query.eq('webhook_path', webhookPath);
      } else {
        return null;
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) {
        console.error('[Webhook] getWebhookTrigger error:', error);
        return null;
      }
      
      return data as WebhookTrigger;
    } catch (error: any) {
      console.error('Error fetching webhook trigger:', error);
      return null;
    }
  }, []);

  const getWebhooksByWorkflow = useCallback(async (
    workflowId: string
  ): Promise<WebhookTrigger[]> => {
    try {
      const { data, error } = await supabase
        .from('workflow_webhook_triggers')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as WebhookTrigger[];
    } catch (error: any) {
      console.error('Error fetching webhooks:', error);
      return [];
    }
  }, []);

  const realtimeChannelRef = useRef<any>(null);

  const setupRealtimeSubscription = useCallback((triggerId: string, webhookPath: string) => {
    // Clean up existing subscription if any
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    console.log('[Webhook] 🔌 Setting up realtime subscription for trigger:', triggerId);
    
    // Use stable channel name without Date.now() to prevent channel proliferation
    const channelName = `webhook-logs-${triggerId}`;
    
    realtimeChannelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_trigger_logs',
          filter: `webhook_trigger_id=eq.${triggerId}`
        },
        (payload) => {
          console.log('[Webhook] 🎉 REALTIME event received:', payload);
          const newEvent = payload.new as WebhookTriggerLog;
          // Add new event to the top of the list
          setTestEvents((prev) => {
            const filtered = prev.filter(e => e.id !== newEvent.id);
            return [newEvent, ...filtered].slice(0, 10);
          });
          toast.success('📥 Webhook event primit în real-time!');
        }
      )
      .subscribe((status) => {
        console.log('[Webhook] Realtime subscription status:', status, 'channel:', channelName);
        
        // Don't auto-reconnect - polling is the backup. Just log the status.
        if (status === 'SUBSCRIBED') {
          console.log('[Webhook] ✅ Realtime channel subscribed successfully');
        } else if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && isListeningRef.current) {
          console.log('[Webhook] ⚠️ Realtime channel issue, polling will handle updates');
        }
      });
  }, []);

  const startListening = useCallback(async (webhookPath: string) => {
    setIsListening(true);
    isListeningRef.current = true;
    currentWebhookPathRef.current = webhookPath;
    setTestEvents([]);
    console.log('[Webhook] 🚀 Starting to listen on path:', webhookPath);

    // First, get the trigger ID for this webhook path
    const { data: trigger, error: triggerError } = await supabase
      .from('workflow_webhook_triggers')
      .select('id')
      .eq('webhook_path', webhookPath)
      .limit(1)
      .maybeSingle();

    if (triggerError) {
      console.error('[Webhook] ❌ Error fetching trigger:', triggerError);
    }

    const triggerId = trigger?.id;
    console.log('[Webhook] Trigger ID for realtime:', triggerId, 'webhookPath:', webhookPath);

    // Start polling for test events - faster interval (1 second)
    let pollCount = 0;
    const pollEvents = async () => {
      // Check if still listening BEFORE the poll
      if (!isListeningRef.current) {
        console.log('[Webhook] ⏹️ Polling stopped - isListeningRef is false');
        return;
      }
      
      pollCount++;
      console.log(`[Webhook] 📡 Polling #${pollCount} for path:`, webhookPath);
      
      try {
        const pollUrl = `${ENV.SUPABASE_URL}/functions/v1/workflow-webhook-test/${webhookPath}?action=poll`;
        const response = await fetch(pollUrl);
        
        if (!response.ok) {
          console.error('[Webhook] ❌ Poll response not OK:', response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        console.log(`[Webhook] 📡 Poll #${pollCount} response:`, { eventsCount: data.events?.length || 0, isListening: data.is_listening });
        
        if (data.events && data.events.length > 0) {
          console.log('[Webhook] ✅ Poll found', data.events.length, 'events:', data.events.map((e: any) => e.id));
          setTestEvents(prev => {
            // Merge new events with existing, avoiding duplicates
            const existingIds = new Set(prev.map(e => e.id));
            const newEvents = data.events.filter((e: WebhookTriggerLog) => !existingIds.has(e.id));
            if (newEvents.length > 0) {
              console.log('[Webhook] 🆕 Adding', newEvents.length, 'new events to state');
              return [...newEvents, ...prev].slice(0, 10);
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('[Webhook] ❌ Error polling test events:', error);
        // Don't stop polling on error - just log and continue
      }
    };

    // Poll immediately and then every 1 second for faster updates
    console.log('[Webhook] 🔄 Starting polling interval...');
    pollEvents();
    pollingIntervalRef.current = setInterval(() => {
      // Extra safety check in the interval callback
      if (isListeningRef.current) {
        pollEvents();
      } else {
        console.log('[Webhook] ⏹️ Clearing interval - no longer listening');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 1000);

    // Subscribe to real-time updates for instant notifications
    if (triggerId) {
      setupRealtimeSubscription(triggerId, webhookPath);
    }

    // Update listening status in DB
    try {
      await fetch(
        `${ENV.SUPABASE_URL}/functions/v1/workflow-webhook-test/${webhookPath}?action=start-listening`,
        { method: 'POST' }
      );
    } catch (error) {
      console.error('Error starting listening:', error);
    }
  }, [setupRealtimeSubscription]);

  const stopListening = useCallback(async (webhookPath: string) => {
    console.log('[Webhook] 🛑 Stopping listening on path:', webhookPath);
    setIsListening(false);
    isListeningRef.current = false;
    currentWebhookPathRef.current = null;
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Cleanup realtime subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // Update listening status in DB
    try {
      await fetch(
        `${ENV.SUPABASE_URL}/functions/v1/workflow-webhook-test/${webhookPath}?action=stop-listening`,
        { method: 'POST' }
      );
    } catch (error) {
      console.error('Error stopping listening:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Sync webhook trigger with workflow activation status
  const syncWebhookWithWorkflow = useCallback(async (
    workflowId: string,
    isActive: boolean,
    existingWebhookPath?: string
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      // PRIORITY 1: Search by webhook_path first (from node config)
      if (existingWebhookPath) {
        const { data: triggerByPath, error: pathError } = await supabase
          .from('workflow_webhook_triggers')
          .select('*')
          .eq('webhook_path', existingWebhookPath)
          .eq('user_id', user.id)
          .single();

        if (!pathError && triggerByPath) {
          // Update existing webhook with workflow_id and active status
          const { error: updateError } = await supabase
            .from('workflow_webhook_triggers')
            .update({ 
              workflow_id: workflowId,  // Link to workflow!
              is_active: isActive 
            })
            .eq('id', triggerByPath.id);

          if (updateError) throw updateError;
          console.log('Updated existing webhook by path:', existingWebhookPath, 'with workflow_id:', workflowId);
          return triggerByPath.webhook_path;
        }
      }

      // PRIORITY 2: Search by workflow_id
      const { data: existingTriggers, error: fetchError } = await supabase
        .from('workflow_webhook_triggers')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      if (existingTriggers && existingTriggers.length > 0) {
        // Update existing trigger
        const trigger = existingTriggers[0];
        const { error } = await supabase
          .from('workflow_webhook_triggers')
          .update({ is_active: isActive })
          .eq('id', trigger.id);

        if (error) throw error;
        return trigger.webhook_path;
      } else if (isActive) {
        // Create new trigger when activating (use existing path if provided)
        const newPath = existingWebhookPath || generateWebhookPath();
        const { data, error } = await supabase
          .from('workflow_webhook_triggers')
          .insert({
            workflow_id: workflowId,
            user_id: user.id,
            webhook_path: newPath,
            http_method: 'ALL',
            auth_type: 'none',
            respond_mode: 'immediately',
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data?.webhook_path || null;
      }

      return null;
    } catch (error: any) {
      console.error('Error syncing webhook with workflow:', error);
      return null;
    }
  }, [user]);

  /**
   * Submit a response for a pending webhook (sync mode)
   * This is called by the frontend after executing the workflow
   * The Edge Function is polling for this response
   */
  const submitWebhookResponse = useCallback(async (
    logId: string,
    response: {
      statusCode?: number;
      body: any;
      headers?: Record<string, string>;
      contentType?: string;
    }
  ): Promise<boolean> => {
    try {
      console.log('[Webhook] Submitting response for log:', logId);

      // Build response body with webhook metadata
      const responseBody = {
        webhookResponse: response.body,
        webhookStatusCode: response.statusCode || 200,
        webhookResponseType: response.contentType === 'application/xml' ? 'xml' : 'json',
        webhookHeaders: response.headers || {},
      };

      const { error } = await supabase
        .from('workflow_trigger_logs')
        .update({
          response_status: response.statusCode || 200,
          response_body: responseBody,
        })
        .eq('id', logId)
        .is('response_status', null); // Only update if still pending

      if (error) {
        console.error('[Webhook] Failed to submit response:', error);
        return false;
      }

      console.log('[Webhook] ✅ Response submitted successfully for log:', logId);
      return true;
    } catch (error) {
      console.error('[Webhook] Error submitting response:', error);
      return false;
    }
  }, []);

  /**
   * Mark a webhook response as failed
   */
  const markWebhookFailed = useCallback(async (
    logId: string,
    errorMessage: string
  ): Promise<boolean> => {
    try {
      console.log('[Webhook] Marking webhook as failed:', logId, errorMessage);

      const { error } = await supabase
        .from('workflow_trigger_logs')
        .update({
          response_status: 500,
          response_body: {
            error: true,
            message: errorMessage,
            webhookResponse: { error: errorMessage },
            webhookStatusCode: 500,
          },
        })
        .eq('id', logId)
        .is('response_status', null);

      if (error) {
        console.error('[Webhook] Failed to mark as failed:', error);
        return false;
      }

      console.log('[Webhook] ✅ Marked as failed:', logId);
      return true;
    } catch (error) {
      console.error('[Webhook] Error marking as failed:', error);
      return false;
    }
  }, []);

  return {
    isLoading,
    isListening,
    testEvents,
    createWebhookTrigger,
    updateWebhookTrigger,
    deleteWebhookTrigger,
    getWebhookTrigger,
    getWebhooksByWorkflow,
    getWebhookUrls,
    startListening,
    stopListening,
    syncWebhookWithWorkflow,
    submitWebhookResponse,
    markWebhookFailed,
  };
};
