import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, PlugZap, Loader2, CheckCircle2, AlertCircle, RefreshCw, ExternalLink,
  Play, ChevronDown, Plus, Trash2, Zap, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AmoCRMIcon } from './BrandIcons';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { N8NExpressionSelector } from './N8NExpressionSelector';

// ============================================================================
// INTERFACES
// ============================================================================

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  pipeline_id?: string; // Required for status_id filter in amoCRM API
}

interface FieldValue {
  id: string;
  field: string;
  value: string;
  valueSource?: 'static' | 'workflow';
  workflowField?: string;
}

interface AmoCRMConfig {
  baseDomain: string;
  status?: string;
  connectedAt?: string;
  // Operation settings
  resource: string;
  operation: string;
  // For single record operations
  recordId?: string;
  recordIdSource?: 'manual' | 'workflow';
  // For create/update
  fields: FieldValue[];
  // For get_many
  filters: FilterCondition[];
  combineFilters: 'AND' | 'OR';
  returnAll: boolean;
  limit: number;
  // Note/Description support (amoCRM doesn't have description field, use notes)
  addNote?: boolean;
  noteText?: string;
  noteTextSource?: 'static' | 'workflow';
  noteWorkflowField?: string;
  // For get_statuses operation
  pipelineId?: string;
}

interface AmoCRMField {
  id: string;
  name: string;
  type: string;
  is_required?: boolean;
  enums?: { id: number; value: string; sort: number }[];
}

interface AmoCRMPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  _embedded?: {
    statuses: AmoCRMStatus[];
  };
}

interface AmoCRMStatus {
  id: number;
  name: string;
  sort: number;
  color: string;
  pipeline_id: number;
}

interface AmoCRMUser {
  id: number;
  name: string;
  email: string;
}

interface N8NAmoCRMConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: AmoCRMConfig;
  };
  onClose: () => void;
  onSave: (config: AmoCRMConfig) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AMOCRM_RESOURCES = [
  { value: 'leads', label: 'Lead', description: 'Manage leads in pipeline' },
  { value: 'contacts', label: 'Contact', description: 'Manage contact information' },
  { value: 'companies', label: 'Company', description: 'Manage companies/organizations' },
  { value: 'tasks', label: 'Task', description: 'Manage tasks and activities' },
  { value: 'events', label: 'Event', description: 'Manage calendar events' },
  { value: 'notes', label: 'Note', description: 'Manage notes on entities' },
];

const AMOCRM_OPERATIONS = [
  { value: 'get', label: 'Get', description: 'Get a single record by ID' },
  { value: 'get_many', label: 'Get Many', description: 'Get multiple records with filters' },
  { value: 'create', label: 'Create', description: 'Create a new record' },
  { value: 'update', label: 'Update', description: 'Update an existing record' },
  { value: 'delete', label: 'Delete', description: 'Delete a record' },
  { value: 'get_fields', label: 'Get Fields', description: 'Get available custom fields' },
  { value: 'get_statuses', label: 'Get Statuses', description: 'Get all pipeline statuses with IDs and names' },
  { value: 'get_pipelines', label: 'Get Pipelines', description: 'Get all pipelines with their statuses' },
  { value: 'get_users', label: 'Get Users', description: 'Get all users from the account' },
];

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const N8NAmoCRMConfig: React.FC<N8NAmoCRMConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
}) => {
  const { user } = useAuth();

  // Connection state
  const [isChecking, setIsChecking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionBaseDomain, setConnectionBaseDomain] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [availableFields, setAvailableFields] = useState<AmoCRMField[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Dynamic data for dropdowns
  const [pipelines, setPipelines] = useState<AmoCRMPipeline[]>([]);
  const [users, setUsers] = useState<AmoCRMUser[]>([]);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);

  // Expression selector state
  const [showExpressionSelector, setShowExpressionSelector] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldTarget, setActiveFieldTarget] = useState<'value' | 'recordId' | 'filterValue' | null>(null);

  // Main config state
  const [config, setConfig] = useState<AmoCRMConfig>({
    baseDomain: node.config?.baseDomain || '',
    status: node.config?.status || 'pending',
    connectedAt: node.config?.connectedAt,
    resource: node.config?.resource || 'leads',
    operation: node.config?.operation || 'get_many',
    recordId: node.config?.recordId || '',
    recordIdSource: node.config?.recordIdSource || 'manual',
    fields: node.config?.fields || [],
    filters: node.config?.filters || [],
    combineFilters: node.config?.combineFilters || 'AND',
    returnAll: node.config?.returnAll ?? false,
    limit: node.config?.limit || 50,
    addNote: node.config?.addNote ?? false,
    noteText: node.config?.noteText || '',
    noteTextSource: node.config?.noteTextSource || 'workflow',
    noteWorkflowField: node.config?.noteWorkflowField || '',
  });

  // State for one-click amoCRM button
  const [amoCRMButtonState, setAmoCRMButtonState] = useState<string | null>(null);

  // Per-user credentials state
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [perUserClientId, setPerUserClientId] = useState('');
  const [perUserClientSecret, setPerUserClientSecret] = useState('');

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  useEffect(() => {
    checkConnection(true);
    return () => clearPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Generate state for amoCRM button (includes user_id for webhook matching)
  useEffect(() => {
    if (user?.id && !amoCRMButtonState) {
      const randomPart = crypto.randomUUID().substring(0, 8);
      setAmoCRMButtonState(`${user.id}_${randomPart}`);
    }
  }, [user?.id, amoCRMButtonState]);

  // Listen for postMessage from amoCRM popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'amocrm_connected') {
        if (event.data.success) {
          toast({
            title: 'amoCRM conectat!',
            description: event.data.base_domain ? `Cont: ${event.data.base_domain}` : 'Conexiune reușită!'
          });
          setIsConnected(true);
          setConnectionBaseDomain(event.data.base_domain || '');
          setConfig(prev => ({ ...prev, status: 'connected' }));
          // Generate new state for next connection attempt
          const randomPart = crypto.randomUUID().substring(0, 8);
          setAmoCRMButtonState(`${user?.id}_${randomPart}`);
        } else {
          toast({
            title: 'Eroare la conectare',
            description: event.data.error || 'A apărut o eroare',
            variant: 'destructive'
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user?.id]);

  // Handle amoCRM connect button click
  // Uses STANDARD OAuth flow - supports both per-user credentials and global (marketplace)
  const handleAmoCRMConnect = async () => {
    if (!amoCRMButtonState || !user?.id) return;

    // Check if user needs to provide credentials
    const usePerUserCredentials = !!(perUserClientId && perUserClientSecret);

    try {
      // STEP 1: Create a pending connection record with state and optional per-user credentials
      const connectionData: Record<string, unknown> = {
        user_id: user.id,
        state: amoCRMButtonState,
        status: 'pending',
      };

      if (usePerUserCredentials) {
        connectionData.client_id = perUserClientId;
        connectionData.client_secret = perUserClientSecret;
      }

      const { error: upsertError } = await (supabase as any)
        .from('amocrm_connections')
        .upsert(connectionData, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Failed to create pending connection:', upsertError);
        toast({
          title: 'Eroare',
          description: 'Nu am putut inițializa conexiunea. Încearcă din nou.',
          variant: 'destructive'
        });
        return;
      }

      // STEP 2: Get the OAuth URL from our edge function
      const session = (await supabase.auth.getSession()).data.session;

      // Build URL with optional per-user credentials
      let oauthInitUrl = `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-oauth-init?state=${amoCRMButtonState}`;
      if (usePerUserCredentials) {
        oauthInitUrl += `&client_id=${encodeURIComponent(perUserClientId)}&client_secret=${encodeURIComponent(perUserClientSecret)}`;
      }

      const response = await fetch(oauthInitUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();

      if (result.error) {
        // Check if it requires credentials
        if (result.requires_credentials) {
          setShowCredentialsForm(true);
          toast({
            title: 'Credențiale necesare',
            description: 'Trebuie să introduci client_id și client_secret din integrarea ta amoCRM.',
            variant: 'destructive'
          });
          return;
        }
        toast({
          title: 'Eroare',
          description: result.error,
          variant: 'destructive'
        });
        return;
      }

      const authUrl = result.auth_url;
      console.log('[AmoCRM] Opening OAuth URL:', authUrl);
      console.log('[AmoCRM] Using per-user credentials:', usePerUserCredentials);

      // STEP 3: Open popup
      const popup = window.open(authUrl, 'amocrm_auth', 'width=600,height=700,left=200,top=100');

      // Start polling for connection
      if (popup) {
        const pollInterval = setInterval(() => {
          checkConnection(true);
        }, 3000);

        // Clear interval after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
    } catch (err) {
      console.error('Error initiating amoCRM connection:', err);
      toast({
        title: 'Eroare',
        description: 'A apărut o eroare. Încearcă din nou.',
        variant: 'destructive'
      });
    }
  };

  const checkConnection = async (silent = false) => {
    if (!user?.id) return;
    try {
      setIsChecking(true);
      const { data, error } = await (supabase as any)
        .from('amocrm_connections')
        .select('status, base_domain, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'connected')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsConnected(true);
        setConnectionBaseDomain(data.base_domain || '');
        // Update config with connection data if baseDomain was empty
        if (!config.baseDomain && data.base_domain) {
          setConfig(prev => ({ ...prev, baseDomain: data.base_domain, status: 'connected' }));
        }
        if (!silent) toast({ title: 'amoCRM conectat', description: data.base_domain || 'Cont verificat' });
        clearPoll();
      } else {
        setIsConnected(false);
        if (!silent) toast({ title: 'Nu exista conexiune amoCRM', description: 'Introdu domeniul si apasa Connect.' });
      }
    } catch (err: any) {
      if (!silent) toast({ title: 'Eroare conexiune', description: err.message || 'Nu am putut verifica statusul.' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    try {
      setIsChecking(true);
      const { error } = await (supabase as any)
        .from('amocrm_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setConnectionBaseDomain('');
      setConfig(prev => ({ ...prev, status: 'pending' }));
      toast({ title: 'Deconectat', description: 'Conexiunea amoCRM a fost eliminata.' });
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message || 'Nu am putut deconecta.' });
    } finally {
      setIsChecking(false);
    }
  };

  // ============================================================================
  // FIELDS LOADING
  // ============================================================================

  useEffect(() => {
    if (isConnected && config.resource) {
      loadFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, config.resource]);

  // Load pipelines and users when connected (for leads resource)
  useEffect(() => {
    if (isConnected && config.resource === 'leads') {
      loadPipelines();
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, config.resource]);

  const loadPipelines = async () => {
    if (!user?.id || !isConnected) return;

    setIsLoadingPipelines(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(
        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=get_pipelines`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (result.pipelines) {
        setPipelines(result.pipelines);
        // Auto-select first pipeline if none selected
        if (result.pipelines.length > 0 && !selectedPipelineId) {
          const mainPipeline = result.pipelines.find((p: AmoCRMPipeline) => p.is_main) || result.pipelines[0];
          setSelectedPipelineId(mainPipeline.id);
        }
      }
    } catch (err) {
      console.error('Error loading pipelines:', err);
    } finally {
      setIsLoadingPipelines(false);
    }
  };

  const loadUsers = async () => {
    if (!user?.id || !isConnected) return;

    setIsLoadingUsers(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(
        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=get_users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (result.users) {
        setUsers(result.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Get statuses for selected pipeline (used in Fields section)
  const currentPipelineStatuses = React.useMemo(() => {
    if (!selectedPipelineId || pipelines.length === 0) return [];
    const pipeline = pipelines.find(p => p.id === selectedPipelineId);
    return pipeline?._embedded?.statuses || [];
  }, [selectedPipelineId, pipelines]);

  // Get ALL statuses from ALL pipelines (used in Filters section)
  const allStatuses = React.useMemo(() => {
    if (pipelines.length === 0) return [];
    const statuses: Array<AmoCRMStatus & { pipelineName?: string }> = [];
    for (const pipeline of pipelines) {
      const pipelineStatuses = pipeline._embedded?.statuses || [];
      for (const status of pipelineStatuses) {
        statuses.push({
          ...status,
          pipelineName: pipeline.name
        });
      }
    }
    return statuses;
  }, [pipelines]);

  const loadFields = async () => {
    if (!user?.id || !isConnected) return;

    setIsLoadingFields(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(
        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=get_fields&entity_type=${config.resource}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (result.fields) {
        setAvailableFields(result.fields);
      }
    } catch (err) {
      console.error('Error loading fields:', err);
    } finally {
      setIsLoadingFields(false);
    }
  };

  // ============================================================================
  // FIELDS MANAGEMENT
  // ============================================================================

  const addField = () => {
    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, { id: `field-${Date.now()}`, field: '', value: '', valueSource: 'static', workflowField: '' }],
    }));
  };

  const updateField = (id: string, key: keyof FieldValue, value: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, [key]: value } : f),
    }));
  };

  const removeField = (id: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id),
    }));
  };

  // ============================================================================
  // FILTERS MANAGEMENT
  // ============================================================================

  const addFilter = () => {
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, { id: `filter-${Date.now()}`, field: '', operator: 'equals', value: '' }],
    }));
  };

  const updateFilter = (id: string, key: keyof FilterCondition, value: string) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => f.id === id ? { ...f, [key]: value } : f),
    }));
  };

  const removeFilter = (id: string) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== id),
    }));
  };

  // ============================================================================
  // EXECUTION
  // ============================================================================

  const executeStep = async () => {
    if (!user?.id || !isConnected) return;

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      let endpoint = 'amocrm-api';
      let queryParams = new URLSearchParams();
      let body: any = {};

      queryParams.set('entity_type', config.resource);

      switch (config.operation) {
        case 'get':
          queryParams.set('action', 'get');
          queryParams.set('id', config.recordId || '');
          break;
        case 'get_many':
          queryParams.set('action', 'get_many');
          queryParams.set('limit', String(config.returnAll ? 250 : config.limit));
          if (config.filters.length > 0) {
            queryParams.set('filters', JSON.stringify(config.filters));
          }
          break;
        case 'get_fields':
          queryParams.set('action', 'get_fields');
          break;
        case 'create':
          queryParams.set('action', 'create');
          body = { data: Object.fromEntries(config.fields.filter(f => f.field && f.value).map(f => [f.field, f.value])) };
          break;
        case 'update':
          queryParams.set('action', 'update');
          queryParams.set('id', config.recordId || '');
          body = { data: Object.fromEntries(config.fields.filter(f => f.field && f.value).map(f => [f.field, f.value])) };
          break;
        case 'delete':
          queryParams.set('action', 'delete');
          queryParams.set('id', config.recordId || '');
          break;
        case 'get_statuses':
          queryParams.set('action', 'get_statuses');
          // Optionally filter by pipeline
          if (config.pipelineId) {
            queryParams.set('pipeline_id', config.pipelineId);
          }
          break;
        case 'get_pipelines':
          queryParams.set('action', 'get_pipelines');
          break;
        case 'get_users':
          queryParams.set('action', 'get_users');
          break;
      }

      const url = `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/${endpoint}?${queryParams.toString()}`;
      const isWriteOperation = ['create', 'update'].includes(config.operation);

      const response = await fetch(url, {
        method: isWriteOperation ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        ...(isWriteOperation && { body: JSON.stringify(body) }),
      });

      const result = await response.json();
      setExecutionResult(result);

      if (result.error) {
        toast({ title: 'Executie esuata', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Executie reusita' });
      }
    } catch (err: any) {
      setExecutionResult({ error: err.message });
      toast({ title: 'Executie esuata', variant: 'destructive' });
    } finally {
      setIsExecuting(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const needsRecordId = ['get', 'update', 'delete'].includes(config.operation);
  const needsFields = ['create', 'update'].includes(config.operation);
  const needsFilters = config.operation === 'get_many';

  // Handle different response formats for different operations
  const currentOutputData = executionResult?.data
    || executionResult?.statuses
    || executionResult?.pipelines
    || executionResult?.users
    || executionResult?.fields
    || outputData
    || null;

  const handleSave = () => {
    onSave(config);
    // Don't close - allow user to continue editing or execute
    toast({
      title: "Salvat",
      description: "Configurația a fost salvată cu succes",
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: '#131419',
        backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Back to canvas button - absolute positioned */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      <div className="flex items-stretch" style={{ height: '85vh', maxWidth: '98vw', width: '95%' }}>
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
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="INPUT"
              data={inputData}
              enableDrag
            />
          </div>
        </div>

        {/* Main Config Panel - Center */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            width: '650px',
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            zIndex: 5,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#339933' }}
          >
            <div className="flex items-center gap-3">
              <AmoCRMIcon size={24} />
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                amoCRM
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={executeStep}
                disabled={!isConnected || isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isConnected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: isConnected ? 'pointer' : 'not-allowed',
                }}
              >
                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Execute
              </button>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: '#333', backgroundColor: '#222' }}>
            {['parameters', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className="flex-1 px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  color: activeTab === tab ? '#fff' : '#888',
                  borderBottom: activeTab === tab ? '2px solid #339933' : '2px solid transparent',
                }}
              >
                {tab === 'parameters' ? 'Parameters' : 'Settings'}
              </button>
            ))}
            <a
              href="https://www.amocrm.com/developers/content/crm_platform/platform-abilities/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-4 py-2 text-xs font-medium transition-colors hover:text-white"
              style={{ color: '#888' }}
            >
              Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#1a1a1a' }}>
            {activeTab === 'parameters' && (
              <>
                {/* Connection Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlugZap className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-sm text-white font-semibold">Conexiune amoCRM</div>
                        <div className="text-xs text-gray-400">OAuth2 authentication</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Connected
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Not connected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connected account info */}
                  {isConnected && connectionBaseDomain && (
                    <p className="text-xs text-emerald-400">Conectat la: {connectionBaseDomain}</p>
                  )}

                  {/* Per-user credentials form */}
                  {!isConnected && (
                    <div className="space-y-3">
                      {/* Toggle for showing credentials form */}
                      <button
                        onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                        className="w-full text-left text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${showCredentialsForm ? 'rotate-180' : ''}`} />
                        {showCredentialsForm ? 'Ascunde credențialele' : 'Folosește integrarea ta amoCRM (recomandat)'}
                      </button>

                      {/* Credentials inputs */}
                      {showCredentialsForm && (
                        <div className="p-3 rounded-lg space-y-3 bg-[#1a2a1a] border border-emerald-900/50">
                          <div className="text-xs text-emerald-400 font-medium">
                            Credențiale integrare amoCRM
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            Creează o integrare în contul tău amoCRM:{' '}
                            <strong>Setări → Integrări → Creează integrare → Внешняя интеграция</strong>.
                            Copiază Client ID și Secret Key de acolo.
                          </p>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wide text-gray-500">Client ID (Integration ID)</label>
                            <input
                              type="text"
                              value={perUserClientId}
                              onChange={(e) => setPerUserClientId(e.target.value)}
                              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                              className="w-full px-3 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white placeholder:text-gray-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wide text-gray-500">Secret Key (Client Secret)</label>
                            <input
                              type="password"
                              value={perUserClientSecret}
                              onChange={(e) => setPerUserClientSecret(e.target.value)}
                              placeholder="••••••••••••••••••••"
                              className="w-full px-3 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white placeholder:text-gray-600"
                            />
                          </div>

                          <div className="p-2 rounded bg-amber-900/20 border border-amber-500/30">
                            <p className="text-[10px] text-amber-400">
                              <strong>Important:</strong> Redirect URI în integrarea amoCRM trebuie să fie:{' '}
                              <code className="bg-black/30 px-1 rounded">https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-oauth-callback</code>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Connect button */}
                      <button
                        onClick={handleAmoCRMConnect}
                        disabled={!amoCRMButtonState || (showCredentialsForm && (!perUserClientId || !perUserClientSecret))}
                        className="w-full px-4 py-3 rounded-lg bg-[#339933] hover:bg-[#2d8a2d] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {!amoCRMButtonState ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <PlugZap className="w-5 h-5" />
                            {showCredentialsForm ? 'Conectează cu credențialele tale' : 'Conectează amoCRM'}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Check / Disconnect Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => checkConnection()}
                      className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white flex items-center gap-1"
                      disabled={isChecking}
                    >
                      {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Check
                    </button>
                    {isConnected && (
                      <button
                        onClick={handleDisconnect}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 flex items-center gap-1 disabled:opacity-50"
                        disabled={isChecking}
                      >
                        <X className="w-4 h-4" />
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {/* Resource Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400">
                    Resource <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={config.resource}
                      onChange={(e) => setConfig(prev => ({ ...prev, resource: e.target.value, fields: [], filters: [] }))}
                      className="w-full px-3 py-2 rounded-lg text-sm appearance-none cursor-pointer bg-[#252525] border border-[#333] text-white"
                    >
                      {AMOCRM_RESOURCES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">
                    {AMOCRM_RESOURCES.find(r => r.value === config.resource)?.description}
                  </p>
                </div>

                {/* Operation Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400">
                    Operation <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={config.operation}
                      onChange={(e) => setConfig(prev => ({ ...prev, operation: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm appearance-none cursor-pointer bg-[#252525] border border-[#333] text-white"
                    >
                      {AMOCRM_OPERATIONS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">
                    {AMOCRM_OPERATIONS.find(op => op.value === config.operation)?.description}
                  </p>
                </div>

                {/* Record ID (for get, update, delete) */}
                {needsRecordId && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-400">
                      Record ID <span className="text-red-400">*</span>
                    </label>

                    {/* Record ID Source Toggle */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#252525]">
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, recordIdSource: 'manual', recordId: '' }))}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          config.recordIdSource === 'manual' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Manual
                      </button>
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, recordIdSource: 'workflow' }))}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                          config.recordIdSource === 'workflow' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        Expression
                      </button>
                    </div>

                    {config.recordIdSource === 'manual' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={config.recordId || ''}
                          onChange={(e) => setConfig(prev => ({ ...prev, recordId: e.target.value }))}
                          placeholder="Introdu amoCRM Record ID"
                          className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#252525] border border-[#333] text-white"
                        />
                        <button
                          onClick={() => {
                            setConfig(prev => ({ ...prev, recordIdSource: 'workflow' }));
                            setActiveFieldTarget('recordId');
                            setShowExpressionSelector(true);
                          }}
                          className="p-2 rounded transition-colors hover:bg-green-500/20"
                          title="Use expression from Input"
                        >
                          <Zap className="w-4 h-4 text-green-400" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div
                          onClick={() => {
                            setActiveFieldTarget('recordId');
                            setShowExpressionSelector(true);
                          }}
                          className="w-full px-3 py-2 rounded-lg text-sm cursor-pointer flex items-center gap-2 group hover:border-green-400 transition-colors bg-[#0d1f0d] border border-green-400 text-green-400"
                        >
                          <Zap className="w-4 h-4 flex-shrink-0" />
                          <code className="flex-1 font-mono truncate">
                            {config.recordId || 'Click to select field...'}
                          </code>
                          <span className="text-[10px] text-gray-500 group-hover:text-green-400 transition-colors">
                            Edit
                          </span>
                        </div>
                        <p className="text-xs text-green-400">
                          ID-ul va fi preluat automat din datele workflow-ului
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Fields (for create, update) */}
                {needsFields && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-400">
                        Fields
                      </label>
                      <div className="flex items-center gap-2">
                        {isLoadingFields && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
                        {isLoadingPipelines && <span className="text-[10px] text-gray-500">Loading pipelines...</span>}
                        {isLoadingUsers && <span className="text-[10px] text-gray-500">Loading users...</span>}
                      </div>
                    </div>

                    {/* Quick Pipeline & Status Selection (for leads) */}
                    {config.resource === 'leads' && pipelines.length > 0 && (
                      <div className="p-3 rounded-lg space-y-3 bg-[#1a2a1a] border border-emerald-900/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-emerald-400">Pipeline & Status</span>
                          <span className="text-[10px] text-gray-500">(Auto-loaded from amoCRM)</span>
                        </div>

                        {/* Pipeline Selector */}
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wide text-gray-500">Pipeline</label>
                          <select
                            value={selectedPipelineId || ''}
                            onChange={(e) => {
                              const pipelineId = parseInt(e.target.value);
                              setSelectedPipelineId(pipelineId);
                              // Update or add pipeline_id field
                              const existingField = config.fields.find(f => f.field === 'pipeline_id');
                              if (existingField) {
                                updateField(existingField.id, 'value', String(pipelineId));
                              } else {
                                setConfig(prev => ({
                                  ...prev,
                                  fields: [...prev.fields, {
                                    id: `field-pipeline-${Date.now()}`,
                                    field: 'pipeline_id',
                                    value: String(pipelineId),
                                    valueSource: 'static'
                                  }]
                                }));
                              }
                            }}
                            className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                          >
                            <option value="">Selectează pipeline...</option>
                            {pipelines.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.is_main && '(Main)'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Status Selector - with manual/workflow toggle */}
                        {selectedPipelineId && currentPipelineStatuses.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] uppercase tracking-wide text-gray-500">Status</label>
                              {/* Source Toggle */}
                              <div className="flex items-center gap-1 bg-[#1a1a1a] rounded p-0.5">
                                <button
                                  onClick={() => {
                                    const existingField = config.fields.find(f => f.field === 'status_id');
                                    if (existingField) {
                                      updateField(existingField.id, 'valueSource', 'static');
                                      updateField(existingField.id, 'workflowField', '');
                                    } else {
                                      setConfig(prev => ({
                                        ...prev,
                                        fields: [...prev.fields, {
                                          id: `field-status-${Date.now()}`,
                                          field: 'status_id',
                                          value: '',
                                          valueSource: 'static',
                                          workflowField: ''
                                        }]
                                      }));
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                                    (config.fields.find(f => f.field === 'status_id')?.valueSource || 'static') === 'static'
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  Manual
                                </button>
                                <button
                                  onClick={() => {
                                    const existingField = config.fields.find(f => f.field === 'status_id');
                                    if (existingField) {
                                      updateField(existingField.id, 'valueSource', 'workflow');
                                      updateField(existingField.id, 'value', '');
                                    } else {
                                      setConfig(prev => ({
                                        ...prev,
                                        fields: [...prev.fields, {
                                          id: `field-status-${Date.now()}`,
                                          field: 'status_id',
                                          value: '',
                                          valueSource: 'workflow',
                                          workflowField: ''
                                        }]
                                      }));
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] transition-colors flex items-center gap-1 ${
                                    config.fields.find(f => f.field === 'status_id')?.valueSource === 'workflow'
                                      ? 'bg-green-600 text-white'
                                      : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  Workflow
                                </button>
                              </div>
                            </div>

                            {/* Manual Status Dropdown */}
                            {(config.fields.find(f => f.field === 'status_id')?.valueSource || 'static') === 'static' ? (
                              <select
                                value={config.fields.find(f => f.field === 'status_id')?.value || ''}
                                onChange={(e) => {
                                  const statusId = e.target.value;
                                  const existingField = config.fields.find(f => f.field === 'status_id');
                                  if (existingField) {
                                    updateField(existingField.id, 'value', statusId);
                                  } else {
                                    setConfig(prev => ({
                                      ...prev,
                                      fields: [...prev.fields, {
                                        id: `field-status-${Date.now()}`,
                                        field: 'status_id',
                                        value: statusId,
                                        valueSource: 'static'
                                      }]
                                    }));
                                  }
                                }}
                                className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                              >
                                <option value="">Selectează status...</option>
                                {currentPipelineStatuses.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              /* Workflow Variable Selector */
                              <div
                                onClick={() => {
                                  const existingField = config.fields.find(f => f.field === 'status_id');
                                  if (existingField) {
                                    setActiveFieldId(existingField.id);
                                  } else {
                                    // Create the field first
                                    const newFieldId = `field-status-${Date.now()}`;
                                    setConfig(prev => ({
                                      ...prev,
                                      fields: [...prev.fields, {
                                        id: newFieldId,
                                        field: 'status_id',
                                        value: '',
                                        valueSource: 'workflow',
                                        workflowField: ''
                                      }]
                                    }));
                                    setActiveFieldId(newFieldId);
                                  }
                                  setActiveFieldTarget('value');
                                  setShowExpressionSelector(true);
                                }}
                                className="w-full px-3 py-2 rounded text-xs bg-[#1a1a1a] border border-green-600/50 text-green-400 cursor-pointer hover:bg-[#252525] transition-colors flex items-center gap-2"
                              >
                                <Zap className="w-3 h-3" />
                                {config.fields.find(f => f.field === 'status_id')?.workflowField ? (
                                  <span className="font-mono text-[10px]">
                                    {'{{ $json.' + config.fields.find(f => f.field === 'status_id')?.workflowField + ' }}'}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">Click pentru a selecta variabila...</span>
                                )}
                              </div>
                            )}

                            {/* Helper text for workflow mode */}
                            {config.fields.find(f => f.field === 'status_id')?.valueSource === 'workflow' && (
                              <p className="text-[10px] text-gray-500">
                                Variabila trebuie să conțină ID-ul statusului (ex: 82880210)
                              </p>
                            )}
                          </div>
                        )}

                        {/* Responsible User Selector */}
                        {users.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-wide text-gray-500">Responsible User</label>
                            <select
                              value={config.fields.find(f => f.field === 'responsible_user_id')?.value || ''}
                              onChange={(e) => {
                                const userId = e.target.value;
                                const existingField = config.fields.find(f => f.field === 'responsible_user_id');
                                if (existingField) {
                                  updateField(existingField.id, 'value', userId);
                                } else if (userId) {
                                  setConfig(prev => ({
                                    ...prev,
                                    fields: [...prev.fields, {
                                      id: `field-user-${Date.now()}`,
                                      field: 'responsible_user_id',
                                      value: userId,
                                      valueSource: 'static'
                                    }]
                                  }));
                                }
                              }}
                              className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                            >
                              <option value="">Selectează user...</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.email})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manual Fields - hide auto-populated fields (pipeline_id, status_id, responsible_user_id) */}
                    {(() => {
                      // Filter out fields that are managed by dropdowns above
                      const autoManagedFields = ['pipeline_id', 'status_id', 'responsible_user_id'];
                      const visibleFields = config.fields.filter(f => !autoManagedFields.includes(f.field));

                      return visibleFields.length === 0 ? (
                        <div className="p-4 rounded-lg text-center bg-[#252525] border border-dashed border-[#444]">
                          <p className="text-xs text-gray-500">Adaugă câmpuri pentru lead (ex: name, price, custom fields)</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {visibleFields.map((field) => (
                          <div key={field.id} className="p-3 rounded-lg space-y-2 bg-[#252525] border border-[#333]">
                            {/* Field Selector */}
                            <div className="flex items-center gap-2">
                              <select
                                value={field.field}
                                onChange={(e) => updateField(field.id, 'field', e.target.value)}
                                className="flex-1 px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                              >
                                <option value="">Selectează câmpul...</option>
                                <optgroup label="📋 Câmpuri principale">
                                  <option value="name">Nume lead</option>
                                  <option value="price">Preț / Budget</option>
                                  <option value="pipeline_id">Pipeline (Pâlnie)</option>
                                  <option value="status_id">Status (Coloana)</option>
                                  <option value="responsible_user_id">Responsabil</option>
                                </optgroup>
                                <optgroup label="📞 Date contact">
                                  <option value="contact_phone">Telefon</option>
                                  <option value="contact_email">Email</option>
                                  <option value="contact_name">Nume contact</option>
                                </optgroup>
                                {availableFields.length > 0 && (
                                  <optgroup label="⚙️ Câmpuri personalizate din amoCRM">
                                    {availableFields.map((f) => (
                                      <option key={f.id} value={`custom_${f.id}`}>
                                        {f.name} {f.is_required && '*'}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                              <button
                                onClick={() => removeField(field.id)}
                                className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>

                            {/* Value Source Toggle */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateField(field.id, 'valueSource', 'static')}
                                className={`px-2 py-1 rounded text-xs transition-colors ${
                                  (field.valueSource || 'static') === 'static'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                                }`}
                              >
                                Static
                              </button>
                              <button
                                onClick={() => updateField(field.id, 'valueSource', 'workflow')}
                                className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                  field.valueSource === 'workflow'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                                }`}
                              >
                                <Zap className="w-3 h-3" />
                                From Workflow
                              </button>
                            </div>

                            {/* Value Input */}
                            {field.valueSource === 'workflow' ? (
                              <div
                                onClick={() => {
                                  setActiveFieldId(field.id);
                                  setActiveFieldTarget('value');
                                  setShowExpressionSelector(true);
                                }}
                                className="w-full px-3 py-2 rounded text-xs cursor-pointer flex items-center gap-2 group hover:border-green-400 transition-colors bg-[#0d1f0d] border border-green-400 text-green-400"
                              >
                                <Zap className="w-3 h-3 flex-shrink-0" />
                                <code className="flex-1 font-mono truncate">
                                  {field.value || 'Click to select field from INPUT...'}
                                </code>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => updateField(field.id, 'value', e.target.value)}
                                  placeholder="Valoare statică"
                                  className="flex-1 px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                />
                                <button
                                  onClick={() => {
                                    updateField(field.id, 'valueSource', 'workflow');
                                    setActiveFieldId(field.id);
                                    setActiveFieldTarget('value');
                                    setShowExpressionSelector(true);
                                  }}
                                  className="p-1.5 rounded transition-colors hover:bg-green-500/20"
                                  title="Use expression from Input"
                                >
                                  <Zap className="w-3.5 h-3.5 text-green-400" />
                                </button>
                              </div>
                            )}

                            {/* Field hint */}
                            {field.field === 'name' && (
                              <p className="text-[10px] text-gray-500">
                                💡 Pentru workflow 999.md, folosește: item.title
                              </p>
                            )}
                            {field.field === 'price' && (
                              <p className="text-[10px] text-gray-500">
                                💡 Pentru workflow 999.md, folosește: item.price (va fi convertit automat)
                              </p>
                            )}
                          </div>
                        ))}
                        </div>
                      );
                    })()}

                    <button
                      onClick={addField}
                      className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90 bg-[#333] text-white"
                    >
                      <Plus className="w-3 h-3" />
                      Add Field Mapping
                    </button>

                    {/* Note/Description Section */}
                    {config.resource === 'leads' && (
                      <div className="p-3 rounded-lg space-y-3 bg-[#1a2a2a] border border-cyan-900/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-cyan-400">📝 Adaugă Notă/Descriere</span>
                            <span className="text-[10px] text-gray-500">(amoCRM nu are câmp description)</span>
                          </div>
                          <button
                            onClick={() => setConfig(prev => ({ ...prev, addNote: !prev.addNote }))}
                            className="relative w-10 h-5 rounded-full transition-colors"
                            style={{ backgroundColor: config.addNote ? '#06b6d4' : '#444' }}
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                              style={{ left: config.addNote ? '22px' : '2px' }}
                            />
                          </button>
                        </div>

                        {config.addNote && (
                          <div className="space-y-2 pt-2 border-t border-cyan-900/30">
                            {/* Note Source Toggle */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setConfig(prev => ({ ...prev, noteTextSource: 'static' }))}
                                className={`px-2 py-1 rounded text-xs transition-colors ${
                                  config.noteTextSource === 'static'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                                }`}
                              >
                                Static
                              </button>
                              <button
                                onClick={() => setConfig(prev => ({ ...prev, noteTextSource: 'workflow' }))}
                                className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                  config.noteTextSource === 'workflow'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                                }`}
                              >
                                <Zap className="w-3 h-3" />
                                From Workflow
                              </button>
                            </div>

                            {/* Note Text Input */}
                            {config.noteTextSource === 'workflow' ? (
                              <div className="space-y-2">
                                <textarea
                                  value={config.noteWorkflowField || ''}
                                  onChange={(e) => setConfig(prev => ({ ...prev, noteWorkflowField: e.target.value }))}
                                  placeholder="Combină variabile:\n{{ $json.description }}\n{{ $json.title }} - {{ $json.price }}"
                                  className="w-full px-3 py-2 rounded text-xs font-mono bg-[#0d1f0d] border border-green-500/50 text-green-400 resize-none focus:outline-none focus:border-green-400"
                                  rows={4}
                                />
                                {/* Quick insert buttons */}
                                <div className="flex flex-wrap gap-1">
                                  <span className="text-[10px] text-gray-500 mr-1">Inserează rapid:</span>
                                  {['description', 'title', 'price', 'link', 'phone', 'region'].map(field => (
                                    <button
                                      key={field}
                                      onClick={() => {
                                        const expr = `{{ $json.${field} }}`;
                                        const current = config.noteWorkflowField || '';
                                        const newValue = current ? `${current}\n${expr}` : expr;
                                        setConfig(prev => ({ ...prev, noteWorkflowField: newValue }));
                                      }}
                                      className="px-1.5 py-0.5 text-[10px] rounded bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors"
                                    >
                                      {field}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <textarea
                                value={config.noteText || ''}
                                onChange={(e) => setConfig(prev => ({ ...prev, noteText: e.target.value }))}
                                placeholder="Text notă care va fi adăugată la lead..."
                                className="w-full px-3 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white resize-none"
                                rows={3}
                              />
                            )}

                            <div className="text-[10px] text-cyan-400/70 space-y-1">
                              <p>💡 <strong>Poți combina mai multe variabile:</strong></p>
                              <code className="block bg-black/30 px-2 py-1 rounded text-green-400 whitespace-pre-wrap">{'{{ $json.description }}\nPreț: {{ $json.price }}'}</code>
                              <p className="text-gray-600 mt-1">📝 Link, telefon și regiune se adaugă automat la notă dacă sunt disponibile</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Batch mode info */}
                    {config.operation === 'create' && (
                      <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                        <p className="text-xs text-blue-400">
                          <strong>💡 Batch Mode:</strong> Dacă primești un array din 999.md Scraper,
                          fiecare item va fi creat ca lead separat automat.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Filters (for get_many) */}
                {needsFilters && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400">
                          Filters
                        </label>
                        <div className="flex items-center gap-2">
                          {isLoadingFields && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
                          {isLoadingPipelines && <span className="text-[10px] text-gray-500">Loading pipelines...</span>}
                        </div>
                      </div>

                      {/* Quick filter info */}
                      {pipelines.length > 0 && (
                        <div className="p-2 rounded-lg bg-blue-900/20 border border-blue-500/30 space-y-1">
                          <p className="text-[10px] text-blue-400">
                            💡 <strong>Status</strong> = Coloanele | <strong>Pipeline</strong> = Pâlnia
                          </p>
                          <p className="text-[10px] text-gray-500">
                            📁 {pipelines.length} pipeline(s): {pipelines.map(p => `"${p.name}"`).join(', ')} |
                            📊 {allStatuses.length} status(uri) total
                          </p>
                        </div>
                      )}

                      {config.filters.length === 0 ? (
                        <div className="p-4 rounded-lg text-center bg-[#252525] border border-dashed border-[#444]">
                          <p className="text-xs text-gray-500">No filters added. All records will be returned.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {config.filters.map((filter, idx) => {
                            // Determine if this filter field needs a special value selector
                            const needsPipelineSelector = filter.field === 'pipeline_id';
                            const needsStatusSelector = filter.field === 'status_id';
                            const needsUserSelector = filter.field === 'responsible_user_id';
                            const needsSpecialSelector = needsPipelineSelector || needsStatusSelector || needsUserSelector;

                            // Get statuses for filter - if pipeline filter exists, show only that pipeline's statuses
                            // Otherwise show ALL statuses from ALL pipelines
                            const filterPipelineId = config.filters.find(f => f.field === 'pipeline_id')?.value;
                            const statusesForFilter = filterPipelineId
                              ? pipelines.find(p => p.id === parseInt(filterPipelineId))?._embedded?.statuses || []
                              : allStatuses;

                            return (
                              <div key={filter.id} className="p-3 rounded-lg space-y-3 bg-[#252525] border border-[#333]">
                                {idx > 0 && (
                                  <div className="flex items-center justify-center pb-2 border-b border-[#333]">
                                    <select
                                      value={config.combineFilters}
                                      onChange={(e) => setConfig(prev => ({ ...prev, combineFilters: e.target.value as 'AND' | 'OR' }))}
                                      className="px-3 py-1.5 rounded text-xs font-medium bg-[#1a1a1a] border border-[#444] text-emerald-400"
                                    >
                                      <option value="AND">AND</option>
                                      <option value="OR">OR</option>
                                    </select>
                                  </div>
                                )}

                                <div className="grid grid-cols-12 gap-2 items-end">
                                  {/* Field Selector */}
                                  <div className="col-span-4 space-y-1">
                                    <label className="text-[10px] uppercase tracking-wide text-gray-500">Field</label>
                                    <select
                                      value={filter.field}
                                      onChange={(e) => {
                                        updateFilter(filter.id, 'field', e.target.value);
                                        // Clear value when field changes
                                        updateFilter(filter.id, 'value', '');
                                      }}
                                      className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                    >
                                      <option value="">Selectează câmpul...</option>
                                      <optgroup label="📋 Câmpuri principale">
                                        <option value="id">ID</option>
                                        <option value="name">Nume</option>
                                        <option value="price">Preț / Budget</option>
                                        <option value="status_id">⭐ Status (Coloana)</option>
                                        <option value="pipeline_id">Pipeline (Pâlnie)</option>
                                        <option value="responsible_user_id">Responsabil</option>
                                        <option value="created_at">Data creării</option>
                                        <option value="updated_at">Data modificării</option>
                                      </optgroup>
                                      <optgroup label="📞 Date contact">
                                        <option value="contact_phone">Telefon</option>
                                        <option value="contact_email">Email</option>
                                      </optgroup>
                                      {availableFields.length > 0 && (
                                        <optgroup label="⚙️ Câmpuri personalizate din amoCRM">
                                          {availableFields.map((f) => (
                                            <option key={f.id} value={`cf_${f.id}`}>{f.name}</option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </select>
                                  </div>

                                  {/* Operator */}
                                  <div className="col-span-3 space-y-1">
                                    <label className="text-[10px] uppercase tracking-wide text-gray-500">Operator</label>
                                    <select
                                      value={filter.operator}
                                      onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                                      className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                    >
                                      {FILTER_OPERATORS.map((op) => (
                                        <option key={op.value} value={op.value}>{op.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Value - Dynamic based on field type */}
                                  <div className="col-span-4 space-y-1">
                                    <label className="text-[10px] uppercase tracking-wide text-gray-500">Value</label>

                                    {/* Pipeline Selector */}
                                    {needsPipelineSelector && pipelines.length > 0 ? (
                                      <select
                                        value={filter.value}
                                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                        className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-emerald-500/50 text-emerald-400"
                                      >
                                        <option value="">Selectează pipeline...</option>
                                        {pipelines.map((p) => (
                                          <option key={p.id} value={String(p.id)}>
                                            {p.name} {p.is_main && '(Main)'}
                                          </option>
                                        ))}
                                      </select>
                                    ) : needsStatusSelector && statusesForFilter.length > 0 ? (
                                      /* Status Selector - shows ALL statuses (columns) from amoCRM */
                                      <select
                                        value={filter.value}
                                        onChange={(e) => {
                                          const statusId = e.target.value;
                                          // Find the selected status to get its pipeline_id
                                          const selectedStatus = statusesForFilter.find((s: any) => String(s.id) === statusId);
                                          // Update both value and pipeline_id
                                          setConfig(prev => ({
                                            ...prev,
                                            filters: prev.filters.map(f =>
                                              f.id === filter.id
                                                ? { ...f, value: statusId, pipeline_id: selectedStatus ? String(selectedStatus.pipeline_id) : undefined }
                                                : f
                                            ),
                                          }));
                                        }}
                                        className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-emerald-500/50 text-emerald-400"
                                      >
                                        <option value="">Selectează coloana...</option>
                                        {statusesForFilter.map((s: any) => (
                                          <option key={s.id} value={String(s.id)}>
                                            {s.name} {s.pipelineName && !filterPipelineId ? `(${s.pipelineName})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                    ) : needsUserSelector && users.length > 0 ? (
                                      /* User Selector */
                                      <select
                                        value={filter.value}
                                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                        className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-emerald-500/50 text-emerald-400"
                                      >
                                        <option value="">Selectează user...</option>
                                        {users.map((u) => (
                                          <option key={u.id} value={String(u.id)}>
                                            {u.name}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      /* Default text input */
                                      <input
                                        type="text"
                                        value={filter.value}
                                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                        placeholder={needsSpecialSelector && !isConnected ? 'Conectează amoCRM...' : 'Introdu valoarea...'}
                                        className="w-full px-2 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                      />
                                    )}
                                  </div>

                                  {/* Delete Button */}
                                  <div className="col-span-1 flex justify-center">
                                    <button
                                      onClick={() => removeFilter(filter.id)}
                                      className="p-2 rounded hover:bg-red-500/20 transition-colors"
                                      title="Remove filter"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                  </div>
                                </div>

                                {/* Helper text for special fields */}
                                {needsStatusSelector && !filterPipelineId && pipelines.length > 1 && (
                                  <p className="text-[10px] text-gray-500">
                                    💡 Opțional: Adaugă filtru Pipeline pentru a limita la o singură pâlnie
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button
                        onClick={addFilter}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90 bg-[#333] text-white border border-dashed border-[#444]"
                      >
                        <Plus className="w-4 h-4" />
                        Add Filter
                      </button>
                    </div>

                    {/* Return All / Limit */}
                    <div className="space-y-3 p-3 rounded-lg bg-[#252525] border border-[#333]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400">
                          Return All
                        </label>
                        <button
                          onClick={() => setConfig(prev => ({ ...prev, returnAll: !prev.returnAll }))}
                          className="relative w-11 h-6 rounded-full transition-colors"
                          style={{ backgroundColor: config.returnAll ? '#339933' : '#444' }}
                        >
                          <span
                            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                            style={{ left: config.returnAll ? '24px' : '4px' }}
                          />
                        </button>
                      </div>

                      {!config.returnAll && (
                        <div className="space-y-2 pt-2 border-t border-[#333]">
                          <label className="text-xs font-medium text-gray-400">
                            Limit
                          </label>
                          <input
                            type="number"
                            value={config.limit}
                            onChange={(e) => setConfig(prev => ({ ...prev, limit: parseInt(e.target.value) || 50 }))}
                            min={1}
                            max={250}
                            className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#1a1a1a] border border-[#444] text-white"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Execution Result */}
                {executionResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-400">
                        Output
                      </label>
                      {executionResult.data && Array.isArray(executionResult.data) && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#333] text-emerald-400">
                          {executionResult.data.length} item{executionResult.data.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {executionResult.error ? (
                      <div className="p-3 rounded text-xs bg-red-900/20 border border-red-900/50 text-red-400">
                        <span className="font-medium">Error:</span> {executionResult.error}
                      </div>
                    ) : executionResult.data ? (
                      <pre className="p-3 rounded text-xs overflow-auto max-h-40 bg-[#252525] border border-[#333] text-emerald-400">
                        {JSON.stringify(executionResult.data, null, 2)}
                      </pre>
                    ) : (
                      <div className="p-3 rounded text-xs text-center bg-[#252525] border border-[#333] text-gray-500">
                        No data returned
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="text-sm text-white font-semibold">Conectare amoCRM</div>
                  <p className="text-xs text-gray-400">
                    Pentru a conecta contul tău amoCRM, trebuie să creezi o integrare în amoCRM.
                  </p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                  <div className="text-sm text-emerald-400 font-semibold">Cum să creezi integrarea</div>
                  <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                    <li>Intră în contul tău amoCRM</li>
                    <li>Mergi la <strong>Setări → Integrări</strong></li>
                    <li>Click pe <strong>+ Creează integrare</strong></li>
                    <li>Selectează <strong>Внешняя интеграция</strong> (External Integration)</li>
                    <li>Dă un nume integrării (ex: "Agentauto")</li>
                    <li>La <strong>Redirect URI</strong> pune:
                      <code className="block mt-1 p-2 bg-black/30 rounded text-emerald-400 text-[10px] break-all">
                        https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-oauth-callback
                      </code>
                    </li>
                    <li>Salvează și copiază <strong>Integration ID</strong> (Client ID) și <strong>Secret Key</strong></li>
                    <li>Introdu aceste credențiale în Agentauto și apasă Conectează</li>
                  </ol>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                  <div className="text-sm text-blue-400 font-semibold">Securitate</div>
                  <p className="text-xs text-gray-400">
                    Conexiunea folosește OAuth 2.0. Agent Automation primește acces doar la funcțiile CRM
                    și nu poate modifica setările contului. Credențialele tale sunt stocate criptat.
                  </p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                  <div className="text-sm text-amber-400 font-semibold">Notă</div>
                  <p className="text-xs text-gray-400">
                    Fiecare cont amoCRM trebuie să aibă propria integrare. Integrările create pe un cont
                    nu pot fi folosite pentru alte conturi amoCRM.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-4 py-3"
            style={{ backgroundColor: '#222', borderTop: '1px solid #333' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-medium transition-colors hover:bg-[#444] bg-[#333] text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded text-xs font-medium transition-colors hover:opacity-90 bg-emerald-600 text-white"
            >
              Save
            </button>
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
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="OUTPUT"
              data={currentOutputData}
              isLoading={isExecuting}
              error={executionResult?.error}
            />
          </div>
        </div>
      </div>

      {/* Expression Selector Modal */}
      {showExpressionSelector && (
        <N8NExpressionSelector
          inputData={inputData}
          currentValue={
            activeFieldTarget === 'recordId'
              ? config.recordId
              : activeFieldId
                ? (() => {
                    const field = config.fields.find(f => f.id === activeFieldId);
                    // For workflow mode, prefer workflowField over value
                    return field?.valueSource === 'workflow'
                      ? (field.workflowField || field.value)
                      : field?.value;
                  })()
                : undefined
          }
          onClose={() => {
            setShowExpressionSelector(false);
            setActiveFieldId(null);
            setActiveFieldTarget(null);
          }}
          onSelect={(expression) => {
            if (activeFieldTarget === 'recordId') {
              setConfig(prev => ({ ...prev, recordId: expression }));
            } else if (activeFieldId === 'note-text' && activeFieldTarget === 'value') {
              setConfig(prev => ({ ...prev, noteWorkflowField: expression }));
            } else if (activeFieldId && activeFieldTarget === 'value') {
              // For workflow mode, update both workflowField and value for compatibility
              const field = config.fields.find(f => f.id === activeFieldId);
              if (field?.valueSource === 'workflow') {
                updateField(activeFieldId, 'workflowField', expression);
              }
              updateField(activeFieldId, 'value', expression);
            }
            setShowExpressionSelector(false);
            setActiveFieldId(null);
            setActiveFieldTarget(null);
          }}
        />
      )}
    </div>,
    document.body
  );
};
