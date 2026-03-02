import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Loader2, ChevronDown, Plus, Play, Pin, History, RotateCcw, Trash2, Clock, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWebhookTrigger, WebhookTrigger } from '@/hooks/useWebhookTrigger';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { toast } from 'sonner';

interface N8NWebhookTriggerConfigNewProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: Record<string, unknown>;
  };
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
  inputData?: unknown;
  outputData?: unknown;
  onWebhookPathChange?: (webhookPath: string) => void;
  workflowId?: string | null;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
const AUTH_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'header', label: 'Header Auth' },
];
const RESPOND_MODES = [
  { value: 'immediately', label: 'Immediately', description: 'Return 202 Accepted instantly, workflow runs in background' },
  { value: 'last_node', label: 'When Last Node Finishes', description: 'Wait for workflow to complete, return last node output' },
  { value: 'webhook_node', label: "Using 'Respond to Webhook' Node", description: 'Use dedicated node to configure response' },
];

export const N8NWebhookTriggerConfigNew: React.FC<N8NWebhookTriggerConfigNewProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  onWebhookPathChange,
  workflowId,
}) => {
  const {
    isLoading,
    isListening,
    testEvents,
    createWebhookTrigger,
    updateWebhookTrigger,
    getWebhookTrigger,
    getWebhookUrls,
    startListening,
    stopListening,
  } = useWebhookTrigger();

  const [webhookTrigger, setWebhookTrigger] = useState<WebhookTrigger | null>(null);
  const [urlType, setUrlType] = useState<'test' | 'production'>('test');
  const [httpMethod, setHttpMethod] = useState('POST');
  const [authType, setAuthType] = useState('none');
  const [respondMode, setRespondMode] = useState('immediately');
  const [syncTimeout, setSyncTimeout] = useState(30); // Timeout for sync/last_node/webhook_node modes
  const [copied, setCopied] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Auth config fields
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [headerName, setHeaderName] = useState('X-Webhook-Auth');
  const [headerValue, setHeaderValue] = useState('');

  // Pin data & History features
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedData, setPinnedData] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<any>(null);

  // ✅ PATCH #02: Защита от бесконечного рендера
  const isInitializedRef = React.useRef(false);
  const isCreatingRef = React.useRef(false);
  const isMountedRef = React.useRef(true);

  // Auto-create webhook on mount if none exists
  useEffect(() => {
    const initWebhook = async () => {
      // PATCH #02: Жёсткая защита от повторного запуска (включая гонки во время async)
      if (isInitializedRef.current || isCreatingRef.current) {
        console.log('[WebhookConfig] Init already in progress or done, skipping');
        return;
      }

      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log('[WebhookConfig] Component unmounted, skipping');
        return;
      }

      // PATCH #02: ВАЖНО - помечаем как "в процессе" ДО любых await
      isCreatingRef.current = true;
      isInitializedRef.current = true;

      try {
      // Helper to fix missing workflow_id on existing webhook
      const ensureWorkflowIdLinked = async (trigger: WebhookTrigger) => {
        if (workflowId && !trigger.workflow_id) {
          console.log('[WebhookConfig] Linking webhook to workflow:', trigger.webhook_path, '->', workflowId);
          await updateWebhookTrigger(trigger.id, { workflow_id: workflowId });
          // Update local state with workflow_id
          trigger.workflow_id = workflowId;
        }
      };
      // If already has webhookTriggerId, load it
      if (node.config?.webhookTriggerId) {
        const trigger = await getWebhookTrigger(node.config.webhookTriggerId as string);
        if (trigger) {
          await ensureWorkflowIdLinked(trigger);
          setWebhookTrigger(trigger);
          setHttpMethod(trigger.http_method || 'POST');
          setAuthType(trigger.auth_type || 'none');
          setSyncTimeout(trigger.sync_timeout_seconds || 30);
          // Map database response_mode back to UI respond_mode
          // DB uses 'using-node', UI uses 'webhook_node'
          const dbMode = trigger.response_mode || trigger.respond_mode || 'immediately';
          const uiMode = dbMode === 'using-node' ? 'webhook_node' : dbMode;
          console.log('[WebhookConfig] Loading webhook config:', {
            db_response_mode: trigger.response_mode,
            db_respond_mode: trigger.respond_mode,
            resolved_mode: uiMode,
            sync_timeout: trigger.sync_timeout_seconds,
          });
          setRespondMode(uiMode);

          if (trigger.auth_config) {
            setBasicUsername(trigger.auth_config.username || '');
            setBasicPassword(trigger.auth_config.password || '');
            setHeaderName(trigger.auth_config.headerName || 'X-Webhook-Auth');
            setHeaderValue(trigger.auth_config.headerValue || '');
          }
          return;
        }
      }

      // If has webhookPath, load by path
      if (node.config?.webhookPath) {
        const trigger = await getWebhookTrigger(undefined, node.config.webhookPath as string);
        if (trigger) {
          await ensureWorkflowIdLinked(trigger);
          setWebhookTrigger(trigger);
          setHttpMethod(trigger.http_method || 'POST');
          setAuthType(trigger.auth_type || 'none');
          setSyncTimeout(trigger.sync_timeout_seconds || 30);
          // Map database response_mode back to UI respond_mode
          const dbMode = trigger.response_mode || trigger.respond_mode || 'immediately';
          const uiMode = dbMode === 'using-node' ? 'webhook_node' : dbMode;
          console.log('[WebhookConfig] Loading webhook by path:', {
            db_response_mode: trigger.response_mode,
            db_respond_mode: trigger.respond_mode,
            resolved_mode: uiMode,
            sync_timeout: trigger.sync_timeout_seconds,
          });
          setRespondMode(uiMode);
          return;
        }
      }

      // No webhook exists - auto-create one
      console.log('[WebhookConfig] Auto-creating webhook for node:', node.id, 'workflowId:', workflowId);
      const trigger = await createWebhookTrigger(workflowId || null, {
        http_method: 'POST',
        auth_type: 'none',
        respond_mode: 'immediately',
      });

      if (trigger) {
        setWebhookTrigger(trigger);

        // PATCH #02: Сохраняем в node.config ОДИН раз
        // Защита от циклов: сохраняем только если реально отсутствует
        if (!node.config?.webhookTriggerId && !node.config?.webhookPath) {
          onSave({
            ...(node.config || {}),
            webhookTriggerId: trigger.id,
            webhookPath: trigger.webhook_path,
            httpMethod: 'POST',
            authType: 'none',
            respondMode: 'immediately',
          });
        } else {
          console.log('[WebhookConfig] Node already has webhook config, skipping onSave');
        }

        // Notify parent about new webhook path
        onWebhookPathChange?.(trigger.webhook_path);
      }
      } finally {
        isCreatingRef.current = false;
      }
    };

    // ✅ PATCH #02: Выполнить только один раз
    if (!isInitializedRef.current && !isCreatingRef.current) {
      initWebhook();
    }

    // Load pinned data from config if exists
    if (node.config?.pinnedData) {
      setPinnedData(node.config.pinnedData);
      setIsPinned(true);
    }

    // Load event history from localStorage
    const historyKey = `webhook_history_${node.id}`;
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      try {
        setEventHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse event history:', e);
      }
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [node.id]); // Only node.id in dependencies to prevent infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleUpdateWebhook = async () => {
    if (!webhookTrigger) return;

    // Map UI respond_mode values to database response_mode values
    // UI uses 'webhook_node', DB/Edge Function expects 'using-node' or 'webhook_node'
    const dbResponseMode = respondMode === 'webhook_node' ? 'using-node' : respondMode;

    console.log('[WebhookConfig] Saving webhook config:', {
      respond_mode: respondMode,
      response_mode: dbResponseMode,
      sync_timeout_seconds: syncTimeout,
    });

    const success = await updateWebhookTrigger(webhookTrigger.id, {
      http_method: httpMethod,
      auth_type: authType,
      auth_config: getAuthConfig(),
      respond_mode: respondMode,
      // Also set the new response_mode field for sync mode support
      // Use 'using-node' for database compatibility when UI shows 'webhook_node'
      response_mode: dbResponseMode as 'sync' | 'async' | 'callback' | 'immediately' | 'using-node',
      // Timeout for sync/last_node/webhook_node modes (in seconds)
      sync_timeout_seconds: syncTimeout,
    });

    if (success) {
      const newConfig = {
        ...node.config,
        webhookTriggerId: webhookTrigger.id,
        webhookPath: webhookTrigger.webhook_path,
        httpMethod,
        authType,
        respondMode,
        syncTimeout,
      };
      onSave(newConfig);
      // Notify parent about webhook path change
      onWebhookPathChange?.(webhookTrigger.webhook_path);
      toast.success('Webhook salvat!');
    }
  };

  const getAuthConfig = () => {
    switch (authType) {
      case 'basic':
        return { username: basicUsername, password: basicPassword };
      case 'header':
        return { headerName, headerValue };
      default:
        return {};
    }
  };

  // Pin/Unpin current data
  const handlePinData = () => {
    if (testEvents.length > 0) {
      const dataToPin = {
        body: testEvents[0].request_body,
        headers: testEvents[0].request_headers,
        query: testEvents[0].request_query,
        method: testEvents[0].request_method,
        triggered_at: testEvents[0].triggered_at,
      };
      setPinnedData(dataToPin);
      setIsPinned(true);

      onSave({
        ...node.config,
        pinnedData: dataToPin,
      });

      toast.success('Date fixate! Vor fi folosite pentru execuție.');
    }
  };

  const handleUnpinData = () => {
    setPinnedData(null);
    setIsPinned(false);

    const newConfig = { ...node.config };
    delete newConfig.pinnedData;
    onSave(newConfig);

    toast.success('Date eliberate.');
  };

  // Add event to history
  const addToHistory = (event: any) => {
    const historyEntry = {
      id: Date.now().toString(),
      body: event.request_body,
      headers: event.request_headers,
      query: event.request_query,
      method: event.request_method,
      triggered_at: event.triggered_at,
      savedAt: new Date().toISOString(),
    };

    const newHistory = [historyEntry, ...eventHistory].slice(0, 20);
    setEventHistory(newHistory);

    const historyKey = `webhook_history_${node.id}`;
    localStorage.setItem(historyKey, JSON.stringify(newHistory));
  };

  // Use data from history for testing
  const handleUseHistoryData = (historyEvent: any) => {
    setSelectedHistoryEvent(historyEvent);
    setPinnedData(historyEvent);
    setIsPinned(true);
    setShowHistory(false);

    onSave({
      ...node.config,
      pinnedData: historyEvent,
    });

    toast.success('Date din istoric selectate pentru execuție!');
  };

  // Clear history
  const handleClearHistory = () => {
    setEventHistory([]);
    const historyKey = `webhook_history_${node.id}`;
    localStorage.removeItem(historyKey);
    toast.success('Istoric șters.');
  };

  // Delete single history entry
  const handleDeleteHistoryEntry = (entryId: string) => {
    const newHistory = eventHistory.filter(e => e.id !== entryId);
    setEventHistory(newHistory);

    const historyKey = `webhook_history_${node.id}`;
    localStorage.setItem(historyKey, JSON.stringify(newHistory));
  };

  const handleCopyUrl = () => {
    if (!webhookTrigger) return;

    const urls = getWebhookUrls(webhookTrigger.webhook_path);
    const url = urlType === 'test' ? urls.testUrl : urls.productionUrl;

    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('URL copiat în clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleListening = () => {
    if (!webhookTrigger) return;

    if (isListening) {
      stopListening(webhookTrigger.webhook_path);
    } else {
      startListening(webhookTrigger.webhook_path);
    }
  };

  const urls = webhookTrigger ? getWebhookUrls(webhookTrigger.webhook_path) : null;
  const currentUrl = urls ? (urlType === 'test' ? urls.testUrl : urls.productionUrl) : '';

  // Build output data - prefer pinned data, then test events, then outputData
  const webhookOutputData = isPinned && pinnedData
    ? pinnedData
    : testEvents.length > 0
      ? {
          body: testEvents[0].request_body,
          headers: testEvents[0].request_headers,
          query: testEvents[0].request_query,
          method: testEvents[0].request_method,
          triggered_at: testEvents[0].triggered_at,
        }
      : outputData;

  // Auto-add new events to history
  React.useEffect(() => {
    if (testEvents.length > 0) {
      const latestEvent = testEvents[0];
      const alreadyInHistory = eventHistory.some(e => e.triggered_at === latestEvent.triggered_at);

      if (!alreadyInHistory) {
        addToHistory(latestEvent);
      }
    }
  }, [testEvents]);

  // Show toast when new test event arrives
  React.useEffect(() => {
    if (testEvents.length > 0 && isListening) {
      toast.success('Webhook event primit!', {
        description: `${testEvents[0].request_method} request received`,
      });
    }
  }, [testEvents.length, isListening]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: '#131419',
        backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Back to canvas button - absolute positioned */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      {/* Floating Assembly - toate 3 panourile */}
      <div
        className="flex items-stretch"
        style={{
          height: '85vh',
          maxWidth: '98vw',
          width: '95%',
        }}
      >
        {/* INPUT Panel - Left (Ghost Style) */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '400px',
            
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <h3 className="text-base font-bold text-white mb-5">Pull in events from Webhook</h3>
            <button
              onClick={handleToggleListening}
              className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold text-white mb-4"
              style={{
                backgroundColor: isListening ? '#dc2626' : '#ff6d5a',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              }}
            >
              {isListening ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Listening...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Listen for test event
                </>
              )}
            </button>
            <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
              Once you've finished building your workflow, run it using the production webhook URL.{' '}
              <span style={{ color: '#ff6d5a' }}>More info</span>
            </p>
          </div>

          {/* Footer */}
          <div
            className="p-4"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          >
            <div className="flex items-center justify-between text-xs cursor-pointer mb-2" style={{ color: '#bbb' }}>
              <span>When will this node trigger my flow?</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Main Config Panel - Center (Solid & Prominent) */}
        <div
          className="flex flex-col"
          style={{
            width: '650px',
            flexShrink: 0,
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px #4a4a4a',
            borderRadius: '8px',
            zIndex: 5,
            transform: 'scale(1.01)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5"
            style={{
              height: '56px',
              borderBottom: '1px solid #4a4a4a',
            }}
          >
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="text-lg">◎</span>
              <span>Webhook</span>
            </div>
            <button
              onClick={handleToggleListening}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white"
              style={{ backgroundColor: '#ff6d5a' }}
            >
              <Play className="w-3 h-3 fill-current" />
              Listen for test event
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex px-5"
            style={{ borderBottom: '1px solid #4a4a4a' }}
          >
            <Tabs defaultValue="parameters" className="w-full">
              <TabsList className="w-full bg-transparent border-b-0 p-0 h-auto flex">
                <TabsTrigger
                  value="parameters"
                  className="py-3.5 mr-5 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-[#ff6d5a] data-[state=active]:bg-transparent data-[state=active]:text-[#ff6d5a] data-[state=active]:font-medium"
                  style={{ color: '#9ca3af' }}
                >
                  Parameters
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="py-3.5 mr-5 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-[#ff6d5a] data-[state=active]:bg-transparent data-[state=active]:text-[#ff6d5a]"
                  style={{ color: '#9ca3af' }}
                >
                  Settings
                </TabsTrigger>
                <a
                  href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto py-3.5 text-xs flex items-center gap-1"
                  style={{ color: '#888' }}
                >
                  Docs <ExternalLink className="w-3 h-3" />
                </a>
              </TabsList>

              {/* Content - scrollable area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(85vh - 220px)' }}>
                <TabsContent value="parameters" className="space-y-4 mt-0">
                  {/* Webhook URLs - n8n style */}
                  <div className="space-y-2">
                    <Label className="text-xs cursor-pointer" style={{ color: '#ff6d5a' }}>▼ Webhook URLs</Label>
                    <div className="flex gap-1 mb-2">
                      <button
                        onClick={() => setUrlType('test')}
                        className={`px-2 py-1 text-[11px] rounded ${
                          urlType === 'test'
                            ? 'bg-[#444] text-white'
                            : 'text-[#888] cursor-pointer'
                        }`}
                      >
                        Test URL
                      </button>
                      <button
                        onClick={() => setUrlType('production')}
                        className={`px-2 py-1 text-[11px] ${
                          urlType === 'production'
                            ? 'bg-[#444] text-white rounded'
                            : 'text-[#888] cursor-pointer'
                        }`}
                      >
                        Production URL
                      </button>
                    </div>

                    {/* URL Box */}
                    <div
                      className="flex items-center p-1.5 rounded"
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #4a4a4a',
                      }}
                    >
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold mr-2.5"
                        style={{
                          backgroundColor: '#333',
                          border: '1px solid #444',
                          color: '#ccc',
                        }}
                      >
                        {httpMethod}
                      </span>
                      <span
                        className="font-mono text-[#eee] overflow-hidden whitespace-nowrap text-ellipsis flex-1 text-xs"
                      >
                        {webhookTrigger ? currentUrl : 'Se creează webhook...'}
                      </span>
                      {webhookTrigger && (
                        <button
                          onClick={handleCopyUrl}
                          className="p-1 ml-2 hover:bg-[#404040] rounded transition-colors"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* HTTP Method */}
                  <div className="space-y-1.5">
                    <label className="block text-xs" style={{ color: '#9ca3af' }}>HTTP Method</label>
                    <Select value={httpMethod} onValueChange={setHttpMethod}>
                      <SelectTrigger
                        className="w-full h-9 rounded"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #4a4a4a',
                          color: '#fff',
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]" style={{ backgroundColor: '#1a1a1a', border: '1px solid #4a4a4a' }}>
                        {HTTP_METHODS.map((method) => (
                          <SelectItem key={method} value={method} className="text-white hover:bg-[#3d3d3d]">
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Path */}
                  <div className="space-y-1.5">
                    <label className="block text-xs" style={{ color: '#9ca3af' }}>Path</label>
                    <div
                      className="w-full px-2.5 py-2 rounded text-xs"
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #4a4a4a',
                        color: '#fff',
                      }}
                    >
                      {webhookTrigger?.webhook_path || 'Se generează...'}
                    </div>
                  </div>

                  {/* Authentication */}
                  <div className="space-y-1.5">
                    <label className="block text-xs" style={{ color: '#9ca3af' }}>Authentication</label>
                    <Select value={authType} onValueChange={setAuthType}>
                      <SelectTrigger
                        className="w-full h-9 rounded"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #4a4a4a',
                          color: '#fff',
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]" style={{ backgroundColor: '#1a1a1a', border: '1px solid #4a4a4a' }}>
                        {AUTH_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-white hover:bg-[#3d3d3d]">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Auth config fields */}
                    {authType === 'basic' && (
                      <div className="space-y-2 mt-2 p-3 rounded" style={{ backgroundColor: '#1a1a1a', border: '1px solid #4a4a4a' }}>
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs">Username</Label>
                          <Input
                            value={basicUsername}
                            onChange={(e) => setBasicUsername(e.target.value)}
                            className="bg-[#252525] border-[#4a4a4a] text-white text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs">Password</Label>
                          <Input
                            type="password"
                            value={basicPassword}
                            onChange={(e) => setBasicPassword(e.target.value)}
                            className="bg-[#252525] border-[#4a4a4a] text-white text-xs h-8"
                          />
                        </div>
                      </div>
                    )}

                    {authType === 'header' && (
                      <div className="space-y-2 mt-2 p-3 rounded" style={{ backgroundColor: '#1a1a1a', border: '1px solid #4a4a4a' }}>
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs">Header Name</Label>
                          <Input
                            value={headerName}
                            onChange={(e) => setHeaderName(e.target.value)}
                            className="bg-[#252525] border-[#4a4a4a] text-white text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-500 text-xs">Header Value</Label>
                          <Input
                            value={headerValue}
                            onChange={(e) => setHeaderValue(e.target.value)}
                            className="bg-[#252525] border-[#4a4a4a] text-white text-xs h-8"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Respond Mode */}
                  <div className="space-y-1.5">
                    <label className="block text-xs" style={{ color: '#9ca3af' }}>Respond</label>
                    <Select value={respondMode} onValueChange={setRespondMode}>
                      <SelectTrigger
                        className="w-full h-9 rounded"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #4a4a4a',
                          color: '#fff',
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]" style={{ backgroundColor: '#1a1a1a', border: '1px solid #4a4a4a' }}>
                        {RESPOND_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value} className="text-white hover:bg-[#3d3d3d]">
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {respondMode !== 'immediately' && (
                      <>
                        {/* Timeout setting for sync modes */}
                        <div className="mt-3 space-y-1.5">
                          <label className="block text-xs" style={{ color: '#9ca3af' }}>
                            Response Timeout (seconds)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={5}
                              max={50}
                              value={syncTimeout}
                              onChange={(e) => setSyncTimeout(Math.min(50, Math.max(5, parseInt(e.target.value) || 30)))}
                              className="w-24 px-2.5 py-2 rounded text-xs"
                              style={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #4a4a4a',
                                color: '#fff',
                              }}
                            />
                            <span className="text-xs" style={{ color: '#666' }}>
                              (5-50s, recomand 30s pentru scraping)
                            </span>
                          </div>
                        </div>
                        <div
                          className="p-3 rounded text-xs leading-relaxed mt-2"
                          style={{
                            backgroundColor: 'rgba(184, 134, 11, 0.15)',
                            border: '1px solid #8a733e',
                            color: '#ddd',
                          }}
                        >
                          If you are sending back a response, add a "Content-Type" response header with the appropriate value to avoid unexpected behavior
                        </div>
                      </>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-1.5">
                    <label className="block text-xs" style={{ color: '#9ca3af' }}>Options</label>
                    <div className="text-xs mb-1" style={{ color: '#666' }}>No properties</div>
                    <button
                      className="w-full text-left px-3 py-2 rounded text-xs flex justify-between items-center"
                      style={{
                        backgroundColor: '#2f2f2f',
                        border: '1px solid #444',
                        color: '#ccc',
                      }}
                    >
                      Add option <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 mt-0">
                  <div className="p-4 rounded" style={{ backgroundColor: '#1a1a1a' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-white text-sm font-medium">Webhook Settings</span>
                    </div>
                    <div className="space-y-2 text-xs" style={{ color: '#9ca3af' }}>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #333' }}>
                        <span>Total Triggers:</span>
                        <span className="text-white font-medium">{webhookTrigger?.total_triggers || 0}</span>
                      </div>
                      <div className="flex justify-between py-1" style={{ borderBottom: '1px solid #333' }}>
                        <span>Last Triggered:</span>
                        <span className="text-white">
                          {webhookTrigger?.last_triggered_at
                            ? new Date(webhookTrigger.last_triggered_at).toLocaleString()
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Status:</span>
                        <span className={webhookTrigger?.is_active ? 'text-green-400' : 'text-gray-500'}>
                          {webhookTrigger?.is_active ? '● Active' : '○ Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Test Events Display */}
                  {testEvents.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide" style={{ color: '#9ca3af' }}>Recent Test Events</Label>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {testEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-2 rounded text-xs"
                            style={{ backgroundColor: '#1a1a1a' }}
                          >
                            <div className="flex justify-between" style={{ color: '#9ca3af' }}>
                              <span className="text-green-400 font-medium">{event.request_method}</span>
                              <span>{new Date(event.triggered_at).toLocaleTimeString()}</span>
                            </div>
                            <pre className="mt-1 text-gray-300 overflow-x-auto text-[10px]">
                              {JSON.stringify(event.request_body, null, 2).slice(0, 200)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer with Pin/History */}
          <div
            className="px-5 py-3 space-y-2"
            style={{
              backgroundColor: '#1a1a1a',
              borderTop: '1px solid #4a4a4a',
            }}
          >
            {/* Pin Data & History Row */}
            <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid #333' }}>
              <button
                onClick={isPinned ? handleUnpinData : handlePinData}
                disabled={!isPinned && testEvents.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  isPinned
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-[#3d3d3d] text-gray-400 hover:text-white disabled:opacity-50'
                }`}
              >
                <Pin className={`w-3 h-3 ${isPinned ? 'fill-current' : ''}`} />
                {isPinned ? 'Pinned' : 'Pin data'}
              </button>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  showHistory
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-[#3d3d3d] text-gray-400 hover:text-white'
                }`}
              >
                <History className="w-3 h-3" />
                History ({eventHistory.length})
              </button>

              {isPinned && pinnedData && (
                <button
                  onClick={() => {
                    toast.success('Re-execuție cu datele fixate!');
                    onSave({
                      ...node.config,
                      pinnedData,
                      executeWithPinnedData: true,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-execute
                </button>
              )}
            </div>

            {/* History Dropdown */}
            {showHistory && (
              <div className="max-h-48 overflow-y-auto space-y-2 pt-2">
                {eventHistory.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-4">
                    No events in history.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-xs font-medium">Event History</span>
                      <button
                        onClick={handleClearHistory}
                        className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear all
                      </button>
                    </div>
                    {eventHistory.map((event) => (
                      <div
                        key={event.id}
                        className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                          selectedHistoryEvent?.id === event.id
                            ? 'bg-purple-500/20 border border-purple-500/30'
                            : 'bg-[#252525] hover:bg-[#2a2a2a]'
                        }`}
                        onClick={() => handleUseHistoryData(event)}
                      >
                        <div className="flex items-center justify-between text-gray-400">
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 font-medium">{event.method}</span>
                            <Clock className="w-3 h-3" />
                            <span>{new Date(event.triggered_at).toLocaleString()}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistoryEntry(event.id);
                            }}
                            className="text-gray-500 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <pre className="mt-1 text-gray-300 overflow-x-auto text-[10px]">
                          {JSON.stringify(event.body, null, 2).slice(0, 100)}...
                        </pre>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Main Actions Row - Fixed at bottom */}
          <div className="flex justify-end gap-2 p-4 border-t border-[#333] bg-[#1a1a1a] flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-[#404040] text-gray-300 hover:bg-[#3d3d3d] bg-transparent"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateWebhook}
              disabled={isLoading || !webhookTrigger}
              className="bg-[#ff6d5a] hover:bg-[#ff5a45] text-white"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Save
            </Button>
          </div>
        </div>

        {/* OUTPUT Panel - Right (Ghost Style) */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '400px',
            
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Pinned indicator if applicable */}
          {isPinned && pinnedData && (
            <div className="p-3 border-b border-[#333]">
              <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-400 inline-flex items-center gap-1">
                <Pin className="w-3 h-3 fill-current" />
                Data pinned
              </div>
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="OUTPUT"
              data={webhookOutputData}
              enableDrag={true}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
