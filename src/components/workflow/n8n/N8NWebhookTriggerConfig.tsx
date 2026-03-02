import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Loader2, Radio, ChevronDown, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWebhookTrigger, WebhookTrigger } from '@/hooks/useWebhookTrigger';
import { toast } from 'sonner';

interface N8NWebhookTriggerConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: any;
  };
  onClose: () => void;
  onSave: (config: any) => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
const AUTH_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'header', label: 'Header Auth' },
  { value: 'jwt', label: 'JWT Auth' },
];
const RESPOND_MODES = [
  { value: 'immediately', label: 'Immediately' },
  { value: 'last_node', label: 'When Last Node Finishes' },
  { value: 'webhook_node', label: "Using 'Respond to Webhook' Node" },
];

export const N8NWebhookTriggerConfig: React.FC<N8NWebhookTriggerConfigProps> = ({
  node,
  onClose,
  onSave,
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
  const [copied, setCopied] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  
  // Auth config fields
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [headerName, setHeaderName] = useState('X-Webhook-Auth');
  const [headerValue, setHeaderValue] = useState('');

  // Load existing config
  useEffect(() => {
    const loadConfig = async () => {
      if (node.config?.webhookTriggerId) {
        const trigger = await getWebhookTrigger(node.config.webhookTriggerId);
        if (trigger) {
          setWebhookTrigger(trigger);
          setHttpMethod(trigger.http_method || 'POST');
          setAuthType(trigger.auth_type || 'none');
          setRespondMode(trigger.respond_mode || 'immediately');
          
          if (trigger.auth_config) {
            setBasicUsername(trigger.auth_config.username || '');
            setBasicPassword(trigger.auth_config.password || '');
            setHeaderName(trigger.auth_config.headerName || 'X-Webhook-Auth');
            setHeaderValue(trigger.auth_config.headerValue || '');
          }
        }
      } else if (node.config?.webhookPath) {
        const trigger = await getWebhookTrigger(undefined, node.config.webhookPath);
        if (trigger) {
          setWebhookTrigger(trigger);
          setHttpMethod(trigger.http_method || 'POST');
          setAuthType(trigger.auth_type || 'none');
          setRespondMode(trigger.respond_mode || 'immediately');
        }
      }
    };
    loadConfig();
  }, [node.config, getWebhookTrigger]);

  const handleCreateWebhook = async () => {
    const trigger = await createWebhookTrigger(null, {
      http_method: httpMethod,
      auth_type: authType,
      auth_config: getAuthConfig(),
      respond_mode: respondMode,
    });
    
    if (trigger) {
      setWebhookTrigger(trigger);
      onSave({
        ...node.config,
        webhookTriggerId: trigger.id,
        webhookPath: trigger.webhook_path,
        httpMethod,
        authType,
        respondMode,
      });
    }
  };

  const handleUpdateWebhook = async () => {
    if (!webhookTrigger) return;
    
    const success = await updateWebhookTrigger(webhookTrigger.id, {
      http_method: httpMethod,
      auth_type: authType,
      auth_config: getAuthConfig(),
      respond_mode: respondMode,
    });
    
    if (success) {
      onSave({
        ...node.config,
        webhookTriggerId: webhookTrigger.id,
        webhookPath: webhookTrigger.webhook_path,
        httpMethod,
        authType,
        respondMode,
      });
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

  return (
    <div
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        right: '20px',
        top: '100px',
        width: '420px',
        maxHeight: '80vh',
        backgroundColor: '#1e1e1e',
        border: '1px solid #444',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: '#252525', borderBottom: '1px solid #333' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: '32px', height: '32px', backgroundColor: '#7c3aed' }}
          >
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-medium text-sm">Webhook Trigger</div>
            <div className="text-gray-500 text-xs">Starts the workflow when called</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isListening ? 'destructive' : 'default'}
            onClick={handleToggleListening}
            disabled={!webhookTrigger}
            className={isListening ? 'animate-pulse' : ''}
          >
            {isListening ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Listening...
              </>
            ) : (
              'Listen for test event'
            )}
          </Button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#333] transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="w-full bg-[#252525]">
            <TabsTrigger value="parameters" className="flex-1">Parameters</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-4 mt-4">
            {/* Webhook URLs */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Webhook URLs</Label>
              <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#252525' }}>
                <button
                  onClick={() => setUrlType('test')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    urlType === 'test'
                      ? 'bg-[#333] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Test URL
                </button>
                <button
                  onClick={() => setUrlType('production')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    urlType === 'production'
                      ? 'bg-[#333] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Production URL
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <div
                  className="flex-shrink-0 px-2 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: '#333', color: '#10b981' }}
                >
                  {httpMethod}
                </div>
                <div className="flex-1 relative">
                  <Input
                    value={webhookTrigger ? currentUrl : 'Click "Create Webhook" first'}
                    readOnly
                    className="bg-[#252525] border-[#333] text-gray-300 text-xs pr-10"
                  />
                  {webhookTrigger && (
                    <button
                      onClick={handleCopyUrl}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#333] rounded"
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
            </div>

            {/* HTTP Method */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">HTTP Method</Label>
              <Select value={httpMethod} onValueChange={setHttpMethod}>
                <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Path (read-only if exists) */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Path</Label>
              <Input
                value={webhookTrigger?.webhook_path || 'Auto-generated on create'}
                readOnly
                className="bg-[#252525] border-[#333] text-gray-300 text-xs"
              />
            </div>

            {/* Authentication */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Authentication</Label>
              <Select value={authType} onValueChange={setAuthType}>
                <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTH_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Auth config fields */}
              {authType === 'basic' && (
                <div className="space-y-2 mt-2 p-3 rounded-lg" style={{ backgroundColor: '#252525' }}>
                  <div className="space-y-1">
                    <Label className="text-gray-500 text-xs">Username</Label>
                    <Input
                      value={basicUsername}
                      onChange={(e) => setBasicUsername(e.target.value)}
                      className="bg-[#1e1e1e] border-[#333] text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500 text-xs">Password</Label>
                    <Input
                      type="password"
                      value={basicPassword}
                      onChange={(e) => setBasicPassword(e.target.value)}
                      className="bg-[#1e1e1e] border-[#333] text-white text-xs"
                    />
                  </div>
                </div>
              )}

              {authType === 'header' && (
                <div className="space-y-2 mt-2 p-3 rounded-lg" style={{ backgroundColor: '#252525' }}>
                  <div className="space-y-1">
                    <Label className="text-gray-500 text-xs">Header Name</Label>
                    <Input
                      value={headerName}
                      onChange={(e) => setHeaderName(e.target.value)}
                      className="bg-[#1e1e1e] border-[#333] text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500 text-xs">Header Value</Label>
                    <Input
                      value={headerValue}
                      onChange={(e) => setHeaderValue(e.target.value)}
                      className="bg-[#1e1e1e] border-[#333] text-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Respond Mode */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs font-medium">Respond</Label>
              <Select value={respondMode} onValueChange={setRespondMode}>
                <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPOND_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {respondMode !== 'immediately' && (
                <p className="text-xs text-amber-500">
                  ⚠️ If you are sending back a response, add a "Content-Type" response header
                </p>
              )}
            </div>

            {/* Options (Collapsible) */}
            <Collapsible open={optionsOpen} onOpenChange={setOptionsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-gray-400 text-xs font-medium hover:text-white">
                <span>Options</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${optionsOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <div
                  className="p-3 rounded-lg text-center text-gray-500 text-xs"
                  style={{ backgroundColor: '#252525' }}
                >
                  No properties
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed border-[#333] text-gray-400"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add option
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#252525' }}>
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-white text-sm font-medium">Webhook Settings</span>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Total Triggers:</span>
                  <span className="text-white">{webhookTrigger?.total_triggers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Triggered:</span>
                  <span className="text-white">
                    {webhookTrigger?.last_triggered_at
                      ? new Date(webhookTrigger.last_triggered_at).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={webhookTrigger?.is_active ? 'text-green-500' : 'text-red-500'}>
                    {webhookTrigger?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Test Events Display */}
        {isListening && testEvents.length > 0 && (
          <div className="space-y-2">
            <Label className="text-gray-400 text-xs font-medium">Recent Test Events</Label>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {testEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-2 rounded text-xs"
                  style={{ backgroundColor: '#252525' }}
                >
                  <div className="flex justify-between text-gray-400">
                    <span>{event.request_method}</span>
                    <span>{new Date(event.triggered_at).toLocaleTimeString()}</span>
                  </div>
                  <pre className="mt-1 text-green-400 overflow-x-auto">
                    {JSON.stringify(event.request_body, null, 2).slice(0, 200)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex justify-end gap-2 px-4 py-3"
        style={{ backgroundColor: '#252525', borderTop: '1px solid #333' }}
      >
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        {webhookTrigger ? (
          <Button size="sm" onClick={handleUpdateWebhook} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Save Changes
          </Button>
        ) : (
          <Button size="sm" onClick={handleCreateWebhook} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Create Webhook
          </Button>
        )}
      </div>
    </div>
  );
};
