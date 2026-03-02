import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, PlugZap, Loader2, CheckCircle2, AlertCircle, RefreshCw, ExternalLink,
  Play, ChevronDown, Plus, Trash2, Zap, ArrowLeft, HelpCircle
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Bitrix24Icon } from './BrandIcons';
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
  valueSource?: 'static' | 'workflow';
}

// Help tooltip component with multiline support - positioned for center panel visibility
const HelpTooltip: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400" />
      </button>
      {isVisible && (
        <div
          className="fixed z-[9999] px-3 py-2.5 text-[11px] text-white bg-[#1a1a1a] border border-[#444] rounded-lg shadow-2xl min-w-[220px] max-w-[280px]"
          style={{
            // Position in center of viewport, slightly above middle
            left: '50%',
            top: '35%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface FieldValue {
  id: string;
  field: string;
  value: string;
  valueSource?: 'static' | 'workflow';
  workflowField?: string;
}

interface Bitrix24Config {
  portalDomain: string;
  status?: string;
  connectedAt?: string;
  resource: string;
  operation: string;
  recordId?: string;
  recordIdSource?: 'manual' | 'workflow';
  pipelineId?: string; // For get_stages operation
  fields: FieldValue[];
  filters: FilterCondition[];
  combineFilters: 'AND' | 'OR';
  returnAll: boolean;
  limit: number;
}

interface N8NBitrix24ConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: Bitrix24Config;
  };
  onClose: () => void;
  onSave: (config: Bitrix24Config) => void;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  previousNodeLabel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BITRIX24_RESOURCES = [
  { value: 'leads', label: 'Lead', description: 'Manage leads in CRM' },
  { value: 'deals', label: 'Deal', description: 'Manage deals/opportunities' },
  { value: 'contacts', label: 'Contact', description: 'Manage contact information' },
  { value: 'companies', label: 'Company', description: 'Manage companies/organizations' },
  { value: 'tasks', label: 'Task', description: 'Manage tasks' },
  { value: 'activities', label: 'Activity', description: 'Manage activities' },
];

const BITRIX24_OPERATIONS = [
  { value: 'get', label: 'Get', description: 'Get a single record by ID' },
  { value: 'get_many', label: 'Get Many', description: 'Get multiple records with filters' },
  { value: 'create', label: 'Create', description: 'Create a new record' },
  { value: 'update', label: 'Update', description: 'Update an existing record' },
  { value: 'delete', label: 'Delete', description: 'Delete a record' },
  { value: 'get_fields', label: 'Get Fields', description: 'Get available fields for entity' },
  { value: 'get_statuses', label: 'Get Statuses', description: 'Get all CRM statuses' },
  { value: 'get_stages', label: 'Get Stages', description: 'Get deal stages for a pipeline' },
  { value: 'get_pipelines', label: 'Get Pipelines', description: 'Get deal pipelines (funnels)' },
  { value: 'get_users', label: 'Get Users', description: 'Get all users from portal' },
];

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'greater_equal', label: 'Greater or Equal' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'less_equal', label: 'Less or Equal' },
];

// Bitrix24 filterable fields per resource
const BITRIX24_FILTER_FIELDS: Record<string, Array<{ value: string; label: string; type?: string }>> = {
  leads: [
    { value: 'ID', label: 'ID' },
    { value: 'TITLE', label: 'Title' },
    { value: 'STATUS_ID', label: 'Status', type: 'status' },
    { value: 'SOURCE_ID', label: 'Source' },
    { value: 'ASSIGNED_BY_ID', label: 'Assigned To', type: 'user' },
    { value: 'CREATED_BY_ID', label: 'Created By', type: 'user' },
    { value: 'DATE_CREATE', label: 'Date Created', type: 'date' },
    { value: 'DATE_MODIFY', label: 'Date Modified', type: 'date' },
    { value: 'OPPORTUNITY', label: 'Opportunity (Amount)' },
    { value: 'CURRENCY_ID', label: 'Currency' },
    { value: 'OPENED', label: 'Opened (Y/N)' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'NAME', label: 'First Name' },
    { value: 'LAST_NAME', label: 'Last Name' },
    { value: 'COMPANY_TITLE', label: 'Company Name' },
  ],
  deals: [
    { value: 'ID', label: 'ID' },
    { value: 'TITLE', label: 'Title' },
    { value: 'STAGE_ID', label: 'Stage', type: 'stage' },
    { value: 'CATEGORY_ID', label: 'Pipeline/Funnel', type: 'pipeline' },
    { value: 'TYPE_ID', label: 'Type' },
    { value: 'ASSIGNED_BY_ID', label: 'Assigned To', type: 'user' },
    { value: 'CREATED_BY_ID', label: 'Created By', type: 'user' },
    { value: 'DATE_CREATE', label: 'Date Created', type: 'date' },
    { value: 'DATE_MODIFY', label: 'Date Modified', type: 'date' },
    { value: 'CLOSEDATE', label: 'Close Date', type: 'date' },
    { value: 'OPPORTUNITY', label: 'Amount' },
    { value: 'CURRENCY_ID', label: 'Currency' },
    { value: 'OPENED', label: 'Opened (Y/N)' },
    { value: 'CLOSED', label: 'Closed (Y/N)' },
    { value: 'COMPANY_ID', label: 'Company ID' },
    { value: 'CONTACT_ID', label: 'Contact ID' },
  ],
  contacts: [
    { value: 'ID', label: 'ID' },
    { value: 'NAME', label: 'First Name' },
    { value: 'LAST_NAME', label: 'Last Name' },
    { value: 'SECOND_NAME', label: 'Middle Name' },
    { value: 'TYPE_ID', label: 'Type' },
    { value: 'SOURCE_ID', label: 'Source' },
    { value: 'ASSIGNED_BY_ID', label: 'Assigned To', type: 'user' },
    { value: 'CREATED_BY_ID', label: 'Created By', type: 'user' },
    { value: 'DATE_CREATE', label: 'Date Created', type: 'date' },
    { value: 'DATE_MODIFY', label: 'Date Modified', type: 'date' },
    { value: 'OPENED', label: 'Opened (Y/N)' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'COMPANY_ID', label: 'Company ID' },
    { value: 'BIRTHDATE', label: 'Birthday', type: 'date' },
  ],
  companies: [
    { value: 'ID', label: 'ID' },
    { value: 'TITLE', label: 'Company Name' },
    { value: 'COMPANY_TYPE', label: 'Company Type' },
    { value: 'INDUSTRY', label: 'Industry' },
    { value: 'REVENUE', label: 'Revenue' },
    { value: 'CURRENCY_ID', label: 'Currency' },
    { value: 'ASSIGNED_BY_ID', label: 'Assigned To', type: 'user' },
    { value: 'CREATED_BY_ID', label: 'Created By', type: 'user' },
    { value: 'DATE_CREATE', label: 'Date Created', type: 'date' },
    { value: 'DATE_MODIFY', label: 'Date Modified', type: 'date' },
    { value: 'OPENED', label: 'Opened (Y/N)' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'EMAIL', label: 'Email' },
  ],
  tasks: [
    { value: 'ID', label: 'ID' },
    { value: 'TITLE', label: 'Title' },
    { value: 'STATUS', label: 'Status' },
    { value: 'PRIORITY', label: 'Priority' },
    { value: 'RESPONSIBLE_ID', label: 'Responsible', type: 'user' },
    { value: 'CREATED_BY', label: 'Created By', type: 'user' },
    { value: 'CREATED_DATE', label: 'Created Date', type: 'date' },
    { value: 'DEADLINE', label: 'Deadline', type: 'date' },
    { value: 'START_DATE_PLAN', label: 'Planned Start', type: 'date' },
    { value: 'END_DATE_PLAN', label: 'Planned End', type: 'date' },
    { value: 'GROUP_ID', label: 'Group ID' },
  ],
  activities: [
    { value: 'ID', label: 'ID' },
    { value: 'SUBJECT', label: 'Subject' },
    { value: 'TYPE_ID', label: 'Activity Type' },
    { value: 'DIRECTION', label: 'Direction' },
    { value: 'COMPLETED', label: 'Completed (Y/N)' },
    { value: 'RESPONSIBLE_ID', label: 'Responsible', type: 'user' },
    { value: 'START_TIME', label: 'Start Time', type: 'date' },
    { value: 'END_TIME', label: 'End Time', type: 'date' },
    { value: 'DEADLINE', label: 'Deadline', type: 'date' },
    { value: 'OWNER_TYPE_ID', label: 'Owner Type' },
    { value: 'OWNER_ID', label: 'Owner ID' },
  ],
};

// Bitrix24 fields for create/update per resource
const BITRIX24_ENTITY_FIELDS: Record<string, Array<{ value: string; label: string; required?: boolean }>> = {
  leads: [
    { value: 'TITLE', label: 'Title', required: true },
    { value: 'NAME', label: 'First Name' },
    { value: 'LAST_NAME', label: 'Last Name' },
    { value: 'SECOND_NAME', label: 'Middle Name' },
    { value: 'COMPANY_TITLE', label: 'Company Name' },
    { value: 'STATUS_ID', label: 'Status' },
    { value: 'SOURCE_ID', label: 'Source' },
    { value: 'OPPORTUNITY', label: 'Amount' },
    { value: 'CURRENCY_ID', label: 'Currency' },
    { value: 'ASSIGNED_BY_ID', label: 'Assigned To' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'WEB', label: 'Website' },
    { value: 'COMMENTS', label: 'Comments' },
  ],
  deals: [
    { value: 'TITLE', label: 'Title', required: true },
    { value: 'STAGE_ID', label: 'Stage' },
    { value: 'CATEGORY_ID', label: 'Pipeline/Funnel' },
    { value: 'TYPE_ID', label: 'Type' },
    { value: 'OPPORTUNITY', label: 'Amount' },
    { value: 'CURRENCY_ID', label: 'Currency' },
    { value: 'ASSIGNED_BY_ID', label: 'Assigned To' },
    { value: 'COMPANY_ID', label: 'Company ID' },
    { value: 'CONTACT_ID', label: 'Contact ID' },
    { value: 'CLOSEDATE', label: 'Close Date' },
    { value: 'COMMENTS', label: 'Comments' },
  ],
  contacts: [
    { value: 'NAME', label: 'First Name', required: true },
    { value: 'LAST_NAME', label: 'Last Name' },
    { value: 'SECOND_NAME', label: 'Middle Name' },
    { value: 'TYPE_ID', label: 'Contact Type' },
    { value: 'SOURCE_ID', label: 'Source' },
    { value: 'ASSIGNED_BY_ID', label: 'Assigned To' },
    { value: 'COMPANY_ID', label: 'Company ID' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'WEB', label: 'Website' },
    { value: 'BIRTHDATE', label: 'Birthday' },
    { value: 'COMMENTS', label: 'Comments' },
  ],
  companies: [
    { value: 'TITLE', label: 'Company Name', required: true },
    { value: 'COMPANY_TYPE', label: 'Company Type' },
    { value: 'INDUSTRY', label: 'Industry' },
    { value: 'REVENUE', label: 'Revenue' },
    { value: 'CURRENCY_ID', label: 'Currency' },
    { value: 'ASSIGNED_BY_ID', label: 'Assigned To' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'WEB', label: 'Website' },
    { value: 'COMMENTS', label: 'Comments' },
  ],
  tasks: [
    { value: 'TITLE', label: 'Title', required: true },
    { value: 'DESCRIPTION', label: 'Description' },
    { value: 'RESPONSIBLE_ID', label: 'Responsible' },
    { value: 'PRIORITY', label: 'Priority' },
    { value: 'DEADLINE', label: 'Deadline' },
    { value: 'START_DATE_PLAN', label: 'Planned Start' },
    { value: 'END_DATE_PLAN', label: 'Planned End' },
    { value: 'GROUP_ID', label: 'Group ID' },
    { value: 'TAGS', label: 'Tags' },
  ],
  activities: [
    { value: 'SUBJECT', label: 'Subject', required: true },
    { value: 'DESCRIPTION', label: 'Description' },
    { value: 'TYPE_ID', label: 'Activity Type' },
    { value: 'DIRECTION', label: 'Direction' },
    { value: 'RESPONSIBLE_ID', label: 'Responsible' },
    { value: 'START_TIME', label: 'Start Time' },
    { value: 'END_TIME', label: 'End Time' },
    { value: 'OWNER_TYPE_ID', label: 'Owner Type' },
    { value: 'OWNER_ID', label: 'Owner ID' },
  ],
};

// Bitrix24 API method mapping
const RESOURCE_METHODS: Record<string, { add: string; update: string; get: string; list: string; delete: string; fields: string }> = {
  leads: {
    add: 'crm.lead.add',
    update: 'crm.lead.update',
    get: 'crm.lead.get',
    list: 'crm.lead.list',
    delete: 'crm.lead.delete',
    fields: 'crm.lead.fields',
  },
  deals: {
    add: 'crm.deal.add',
    update: 'crm.deal.update',
    get: 'crm.deal.get',
    list: 'crm.deal.list',
    delete: 'crm.deal.delete',
    fields: 'crm.deal.fields',
  },
  contacts: {
    add: 'crm.contact.add',
    update: 'crm.contact.update',
    get: 'crm.contact.get',
    list: 'crm.contact.list',
    delete: 'crm.contact.delete',
    fields: 'crm.contact.fields',
  },
  companies: {
    add: 'crm.company.add',
    update: 'crm.company.update',
    get: 'crm.company.get',
    list: 'crm.company.list',
    delete: 'crm.company.delete',
    fields: 'crm.company.fields',
  },
  tasks: {
    add: 'tasks.task.add',
    update: 'tasks.task.update',
    get: 'tasks.task.get',
    list: 'tasks.task.list',
    delete: 'tasks.task.delete',
    fields: 'tasks.task.getfields',
  },
  activities: {
    add: 'crm.activity.add',
    update: 'crm.activity.update',
    get: 'crm.activity.get',
    list: 'crm.activity.list',
    delete: 'crm.activity.delete',
    fields: 'crm.activity.fields',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const N8NBitrix24Config: React.FC<N8NBitrix24ConfigProps> = ({
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
  const [connectionPortalDomain, setConnectionPortalDomain] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<Record<string, unknown> | null>(null);

  // Expression selector state
  const [showExpressionSelector, setShowExpressionSelector] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldTarget, setActiveFieldTarget] = useState<'value' | 'recordId' | 'filterValue' | null>(null);

  // Per-user credentials state
  const [showCredentialsForm, setShowCredentialsForm] = useState(true); // Default open since it's required
  const [perUserClientId, setPerUserClientId] = useState('');
  const [perUserClientSecret, setPerUserClientSecret] = useState('');
  const [perUserPortalDomain, setPerUserPortalDomain] = useState(''); // e.g., mycompany.bitrix24.com

  // OAuth state
  const [oauthState, setOauthState] = useState<string | null>(null);

  // Bitrix24 data cache (fetched from API)
  const [bitrix24Users, setBitrix24Users] = useState<Array<{ id: string; name: string }>>([]);
  const [bitrix24Statuses, setBitrix24Statuses] = useState<Array<{ STATUS_ID: string; NAME: string; ENTITY_ID?: string }>>([]);
  const [bitrix24Pipelines, setBitrix24Pipelines] = useState<Array<{ ID: string; NAME: string; stages?: Array<{ STATUS_ID: string; NAME: string }> }>>([]);
  const [isLoadingBitrixData, setIsLoadingBitrixData] = useState(false);

  // Main config state
  const [config, setConfig] = useState<Bitrix24Config>({
    portalDomain: node.config?.portalDomain || '',
    status: node.config?.status || 'pending',
    connectedAt: node.config?.connectedAt,
    resource: node.config?.resource || 'leads',
    operation: node.config?.operation || 'get_many',
    recordId: node.config?.recordId || '',
    recordIdSource: node.config?.recordIdSource || 'manual',
    pipelineId: node.config?.pipelineId || '0',
    fields: node.config?.fields || [],
    filters: node.config?.filters || [],
    combineFilters: node.config?.combineFilters || 'AND',
    returnAll: node.config?.returnAll ?? false,
    limit: node.config?.limit || 50,
  });

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ============================================================================
  // BITRIX24 DATA FETCHING
  // ============================================================================

  const proxyUrl = 'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/bitrix24-api';

  const fetchBitrix24Data = async () => {
    if (!isConnected || isLoadingBitrixData) return;

    setIsLoadingBitrixData(true);
    console.log('[Bitrix24] Fetching users, statuses, pipelines...');

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      };

      // Fetch users
      try {
        const usersResponse = await fetch(proxyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ method: 'user.get', params: {} }),
        });
        const usersData = await usersResponse.json();
        if (usersData.result && Array.isArray(usersData.result)) {
          const formattedUsers = usersData.result.map((u: Record<string, unknown>) => ({
            id: String(u.ID),
            name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim() || `User ${u.ID}`,
          }));
          setBitrix24Users(formattedUsers);
          console.log('[Bitrix24] Fetched', formattedUsers.length, 'users');
        }
      } catch (e) {
        console.warn('[Bitrix24] Could not fetch users:', e);
      }

      // Fetch CRM statuses
      try {
        const statusesResponse = await fetch(proxyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ method: 'crm.status.list', params: {} }),
        });
        const statusesData = await statusesResponse.json();
        if (statusesData.result && Array.isArray(statusesData.result)) {
          setBitrix24Statuses(statusesData.result);
          console.log('[Bitrix24] Fetched', statusesData.result.length, 'statuses');
        }
      } catch (e) {
        console.warn('[Bitrix24] Could not fetch statuses:', e);
      }

      // Fetch deal pipelines with stages
      try {
        const pipelinesResponse = await fetch(proxyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ method: 'crm.dealcategory.list', params: {} }),
        });
        const pipelinesData = await pipelinesResponse.json();

        // Add default pipeline and fetch stages for each
        const allPipelines = [
          { ID: '0', NAME: 'Default Pipeline' },
          ...(pipelinesData.result || []),
        ];

        // Fetch stages for each pipeline
        const pipelinesWithStages = await Promise.all(
          allPipelines.map(async (pipeline: { ID: string; NAME: string }) => {
            try {
              const stagesResponse = await fetch(proxyUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  method: 'crm.dealcategory.stage.list',
                  params: { id: pipeline.ID },
                }),
              });
              const stagesData = await stagesResponse.json();
              return {
                ...pipeline,
                stages: stagesData.result || [],
              };
            } catch {
              return { ...pipeline, stages: [] };
            }
          })
        );

        setBitrix24Pipelines(pipelinesWithStages);
        console.log('[Bitrix24] Fetched', pipelinesWithStages.length, 'pipelines with stages');
      } catch (e) {
        console.warn('[Bitrix24] Could not fetch pipelines:', e);
      }

    } catch (error) {
      console.error('[Bitrix24] Error fetching data:', error);
    } finally {
      setIsLoadingBitrixData(false);
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

  // Fetch Bitrix24 data when connected
  useEffect(() => {
    if (isConnected && bitrix24Users.length === 0) {
      fetchBitrix24Data();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Generate OAuth state
  useEffect(() => {
    if (user?.id && !oauthState) {
      const randomPart = crypto.randomUUID().substring(0, 8);
      setOauthState(`${user.id}_${randomPart}`);
    }
  }, [user?.id, oauthState]);

  // Listen for postMessage from Bitrix24 popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'bitrix24_connected') {
        if (event.data.success) {
          toast({
            title: 'Bitrix24 conectat!',
            description: event.data.portal_domain ? `Portal: ${event.data.portal_domain}` : 'Conexiune reușită!'
          });
          setIsConnected(true);
          setConnectionPortalDomain(event.data.portal_domain || '');
          setConfig(prev => ({ ...prev, status: 'connected' }));
          // Generate new state for next connection attempt
          const randomPart = crypto.randomUUID().substring(0, 8);
          setOauthState(`${user?.id}_${randomPart}`);
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

  const handleBitrix24Connect = async () => {
    if (!oauthState || !user?.id) return;

    const usePerUserCredentials = !!(perUserClientId && perUserClientSecret);

    try {
      // Create pending connection
      const connectionData: Record<string, unknown> = {
        user_id: user.id,
        state: oauthState,
        status: 'pending',
      };

      if (usePerUserCredentials) {
        connectionData.client_id = perUserClientId;
        connectionData.client_secret = perUserClientSecret;
      }

      const { error: upsertError } = await (supabase as unknown as { from: (table: string) => { upsert: (data: Record<string, unknown>, options: { onConflict: string }) => Promise<{ error: Error | null }> } })
        .from('bitrix24_connections')
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

      // Get OAuth URL
      const session = (await supabase.auth.getSession()).data.session;

      let oauthInitUrl = `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/bitrix24-oauth-init?state=${oauthState}`;
      if (usePerUserCredentials) {
        oauthInitUrl += `&client_id=${encodeURIComponent(perUserClientId)}&client_secret=${encodeURIComponent(perUserClientSecret)}`;
      }
      if (perUserPortalDomain) {
        // Clean portal domain (remove https:// if present)
        const cleanDomain = perUserPortalDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        oauthInitUrl += `&portal_domain=${encodeURIComponent(cleanDomain)}`;
      }

      const response = await fetch(oauthInitUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const result = await response.json();

      if (result.error) {
        if (result.requires_credentials) {
          setShowCredentialsForm(true);
          toast({
            title: 'Credențiale necesare',
            description: 'Trebuie să introduci client_id și client_secret din aplicația Bitrix24.',
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
      console.log('[Bitrix24] Opening OAuth URL:', authUrl);

      // Open popup
      const popup = window.open(authUrl, 'bitrix24_auth', 'width=600,height=700,left=200,top=100');

      if (popup) {
        // Clear any existing poll before starting a new one
        clearPoll();

        pollRef.current = setInterval(() => {
          checkConnection(true);
        }, 3000);

        // Auto-clear after 2 minutes
        setTimeout(() => clearPoll(), 120000);
      }
    } catch (err) {
      console.error('Error initiating Bitrix24 connection:', err);
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
      const { data, error } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: { status: string; portal_domain: string; updated_at: string } | null; error: Error | null }> } } } } })
        .from('bitrix24_connections')
        .select('status, portal_domain, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'connected')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsConnected(true);
        setConnectionPortalDomain(data.portal_domain || '');
        if (!config.portalDomain && data.portal_domain) {
          setConfig(prev => ({ ...prev, portalDomain: data.portal_domain, status: 'connected' }));
        }
        if (!silent) toast({ title: 'Bitrix24 conectat', description: data.portal_domain || 'Portal verificat' });
        clearPoll();
      } else {
        setIsConnected(false);
        if (!silent) toast({ title: 'Nu există conexiune Bitrix24', description: 'Apasă Connect pentru a te conecta.' });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Nu am putut verifica statusul.';
      if (!silent) toast({ title: 'Eroare conexiune', description: errorMessage });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    try {
      setIsChecking(true);
      const { error } = await (supabase as unknown as { from: (table: string) => { delete: () => { eq: (column: string, value: string) => Promise<{ error: Error | null }> } } })
        .from('bitrix24_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setConnectionPortalDomain('');
      setConfig(prev => ({ ...prev, status: 'pending' }));
      toast({ title: 'Deconectat', description: 'Conexiunea Bitrix24 a fost eliminată.' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Nu am putut deconecta.';
      toast({ title: 'Eroare', description: errorMessage });
    } finally {
      setIsChecking(false);
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
      filters: [...prev.filters, { id: `filter-${Date.now()}`, field: '', operator: 'equals', value: '', valueSource: 'static' }],
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
      // Get API method based on operation
      const methods = RESOURCE_METHODS[config.resource];
      if (!methods && !['get_statuses', 'get_pipelines', 'get_users'].includes(config.operation)) {
        throw new Error(`Resource necunoscut: ${config.resource}`);
      }

      let apiMethod = '';
      let params: Record<string, unknown> = {};

      switch (config.operation) {
        case 'get': {
          if (!config.recordId) {
            throw new Error('Record ID este obligatoriu pentru operația Get');
          }
          apiMethod = methods.get;
          params = config.resource === 'tasks' ? { taskId: config.recordId } : { id: config.recordId };
          break;
        }

        case 'get_many': {
          apiMethod = methods.list;
          // Build filters
          if (config.filters && config.filters.length > 0) {
            const filter: Record<string, unknown> = {};
            for (const f of config.filters) {
              let filterKey = f.field.toUpperCase();
              switch (f.operator) {
                case 'greater_than': filterKey = `>${f.field.toUpperCase()}`; break;
                case 'less_than': filterKey = `<${f.field.toUpperCase()}`; break;
                case 'not_equals': filterKey = `!${f.field.toUpperCase()}`; break;
                case 'contains': filterKey = `%${f.field.toUpperCase()}`; break;
              }
              filter[filterKey] = f.value;
            }
            params.filter = filter;
          }
          break;
        }

        case 'create': {
          apiMethod = methods.add;
          const payload: Record<string, unknown> = {};
          for (const field of config.fields) {
            if (field.field && field.value) {
              payload[field.field.toUpperCase()] = field.value;
            }
          }
          params = { fields: payload };
          break;
        }

        case 'update': {
          if (!config.recordId) {
            throw new Error('Record ID este obligatoriu pentru operația Update');
          }
          apiMethod = methods.update;
          const updatePayload: Record<string, unknown> = {};
          for (const field of config.fields) {
            if (field.field && field.value) {
              updatePayload[field.field.toUpperCase()] = field.value;
            }
          }
          params = config.resource === 'tasks'
            ? { taskId: config.recordId, fields: updatePayload }
            : { id: config.recordId, fields: updatePayload };
          break;
        }

        case 'delete': {
          if (!config.recordId) {
            throw new Error('Record ID este obligatoriu pentru operația Delete');
          }
          apiMethod = methods.delete;
          params = config.resource === 'tasks' ? { taskId: config.recordId } : { id: config.recordId };
          break;
        }

        case 'get_fields': {
          apiMethod = methods.fields;
          break;
        }

        case 'get_statuses': {
          apiMethod = 'crm.status.list';
          break;
        }

        case 'get_stages': {
          apiMethod = 'crm.dealcategory.stage.list';
          params = { id: config.pipelineId || '0' };
          break;
        }

        case 'get_pipelines': {
          apiMethod = 'crm.dealcategory.list';
          break;
        }

        case 'get_users': {
          apiMethod = 'user.get';
          break;
        }

        default:
          throw new Error(`Operație necunoscută: ${config.operation}`);
      }

      // Make API call through proxy (to avoid CORS)
      const session = (await supabase.auth.getSession()).data.session;
      const proxyUrl = 'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/bitrix24-api';

      console.log('[Bitrix24 Execute] Calling via proxy:', apiMethod, params);

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ method: apiMethod, params }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`Bitrix24 API: ${data.error} - ${data.error_description || ''}`);
      }

      // Format result based on operation (matching worker output format)
      let formattedResult: Record<string, unknown> = {
        _operation: config.operation,
        _resource: config.resource,
        _timestamp: new Date().toISOString(),
      };

      switch (config.operation) {
        case 'get':
          formattedResult.bitrix24_record = config.resource === 'tasks'
            ? (data.result as Record<string, unknown>)?.task
            : data.result;
          break;
        case 'get_many':
          const records = config.resource === 'tasks'
            ? (data.result as Record<string, unknown>)?.tasks
            : data.result;
          formattedResult.bitrix24_records = records;
          formattedResult.bitrix24_total = data.total || (Array.isArray(records) ? records.length : 0);
          formattedResult.bitrix24_fetched = Array.isArray(records) ? records.length : 0;
          break;
        case 'create': {
          const createdId = data.result;
          formattedResult.bitrix24_created_id = createdId;
          formattedResult.bitrix24_result = data;
          // Fetch the created record for preview (matching worker behavior)
          if (createdId) {
            try {
              const getMethod = RESOURCE_METHODS[config.resource]?.get;
              const getParams = config.resource === 'tasks' ? { taskId: createdId } : { id: createdId };
              const session = (await supabase.auth.getSession()).data.session;
              const getResponse = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ method: getMethod, params: getParams }),
              });
              const getData = await getResponse.json();
              formattedResult.bitrix24_record = config.resource === 'tasks'
                ? (getData.result as Record<string, unknown>)?.task
                : getData.result;
            } catch {
              console.warn('[Bitrix24 Execute] Could not fetch created record');
            }
          }
          break;
        }
        case 'update': {
          const updateSuccess = data.result === true;
          formattedResult.bitrix24_updated = updateSuccess;
          formattedResult.bitrix24_updated_id = config.recordId;
          formattedResult.bitrix24_result = data;
          // Fetch the updated record for preview
          if (updateSuccess && config.recordId) {
            try {
              const getMethod = RESOURCE_METHODS[config.resource]?.get;
              const getParams = config.resource === 'tasks' ? { taskId: config.recordId } : { id: config.recordId };
              const session = (await supabase.auth.getSession()).data.session;
              const getResponse = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ method: getMethod, params: getParams }),
              });
              const getData = await getResponse.json();
              formattedResult.bitrix24_record = config.resource === 'tasks'
                ? (getData.result as Record<string, unknown>)?.task
                : getData.result;
            } catch {
              console.warn('[Bitrix24 Execute] Could not fetch updated record');
            }
          }
          break;
        }
        case 'delete': {
          const deleteSuccess = data.result === true;
          formattedResult.bitrix24_deleted = deleteSuccess;
          formattedResult.bitrix24_deleted_id = config.recordId;
          formattedResult.bitrix24_result = data;
          break;
        }
        case 'get_fields':
          formattedResult.bitrix24_fields = data.result;
          break;
        case 'get_statuses':
          formattedResult.bitrix24_statuses = data.result;
          formattedResult.bitrix24_total = Array.isArray(data.result) ? data.result.length : 0;
          break;
        case 'get_stages':
          formattedResult.bitrix24_stages = data.result;
          formattedResult.bitrix24_pipeline_id = config.pipelineId || '0';
          formattedResult.bitrix24_total = Array.isArray(data.result) ? data.result.length : 0;
          break;
        case 'get_pipelines':
          formattedResult.bitrix24_pipelines = data.result;
          formattedResult.bitrix24_total = Array.isArray(data.result) ? data.result.length : 0;
          break;
        case 'get_users':
          formattedResult.bitrix24_users = data.result;
          formattedResult.bitrix24_total = Array.isArray(data.result) ? data.result.length : 0;
          break;
      }

      setExecutionResult(formattedResult);
      toast({
        title: 'Execuție reușită',
        description: `${config.operation} pe ${config.resource} finalizat`
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Eroare necunoscută';
      console.error('[Bitrix24 Execute] Error:', err);
      setExecutionResult({ error: errorMessage });
      toast({
        title: 'Execuție eșuată',
        description: errorMessage,
        variant: 'destructive'
      });
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

  // Clean output data - return arrays directly for proper Table view display
  const currentOutputData = (() => {
    const rawData = executionResult || outputData || null;
    if (!rawData || typeof rawData !== 'object') return rawData;

    // Extract only the meaningful data, removing internal metadata
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (key.startsWith('_')) continue;
      cleaned[key] = value;
    }

    // Get Many - return records array directly (Table view shows each as row)
    if ('bitrix24_records' in cleaned && Array.isArray(cleaned.bitrix24_records)) {
      return cleaned.bitrix24_records;
    }

    // Get single record - return as array with one item
    if ('bitrix24_record' in cleaned && cleaned.bitrix24_record) {
      return [cleaned.bitrix24_record];
    }

    // Create - show created record
    if ('bitrix24_created_id' in cleaned && cleaned.bitrix24_record) {
      return [cleaned.bitrix24_record];
    }
    if ('bitrix24_created_id' in cleaned) {
      return [{ ID: cleaned.bitrix24_created_id, _status: 'created' }];
    }

    // Update - show updated record
    if ('bitrix24_updated' in cleaned && cleaned.bitrix24_record) {
      return [cleaned.bitrix24_record];
    }
    if ('bitrix24_updated' in cleaned) {
      return [{ ID: cleaned.bitrix24_updated_id, _status: cleaned.bitrix24_updated ? 'updated' : 'failed' }];
    }

    // Delete
    if ('bitrix24_deleted' in cleaned) {
      return [{ ID: cleaned.bitrix24_deleted_id, _status: cleaned.bitrix24_deleted ? 'deleted' : 'failed' }];
    }

    // Fields - convert object to array
    if ('bitrix24_fields' in cleaned && typeof cleaned.bitrix24_fields === 'object') {
      const fields = cleaned.bitrix24_fields as Record<string, unknown>;
      return Object.entries(fields).map(([key, val]) => ({
        field: key,
        ...(typeof val === 'object' && val !== null ? val as Record<string, unknown> : { value: val })
      }));
    }

    // Statuses, stages, pipelines, users - return arrays directly
    if ('bitrix24_statuses' in cleaned && Array.isArray(cleaned.bitrix24_statuses)) {
      return cleaned.bitrix24_statuses;
    }
    if ('bitrix24_stages' in cleaned && Array.isArray(cleaned.bitrix24_stages)) {
      return cleaned.bitrix24_stages;
    }
    if ('bitrix24_pipelines' in cleaned && Array.isArray(cleaned.bitrix24_pipelines)) {
      return cleaned.bitrix24_pipelines;
    }
    if ('bitrix24_users' in cleaned && Array.isArray(cleaned.bitrix24_users)) {
      return cleaned.bitrix24_users;
    }

    // Default: return cleaned or original
    return Object.keys(cleaned).length > 0 ? cleaned : rawData;
  })();

  const handleSave = () => {
    onSave(config);
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
      {/* Back to canvas button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      <div className="flex items-stretch" style={{ height: '85vh', maxWidth: '98vw', width: '95%' }}>
        {/* INPUT Panel - Left */}
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
            style={{ backgroundColor: '#2FC6F6' }}
          >
            <div className="flex items-center gap-3">
              <Bitrix24Icon size={24} />
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                Bitrix24
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
                onClick={() => setActiveTab(tab as 'parameters' | 'settings')}
                className="flex-1 px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  color: activeTab === tab ? '#fff' : '#888',
                  borderBottom: activeTab === tab ? '2px solid #2FC6F6' : '2px solid transparent',
                }}
              >
                {tab === 'parameters' ? 'Parameters' : 'Settings'}
              </button>
            ))}
            <a
              href="https://dev.1c-bitrix.ru/rest_help/"
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
                      <PlugZap className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-sm text-white font-semibold">Conexiune Bitrix24</div>
                        <div className="text-xs text-gray-400">OAuth2 authentication</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <span className="text-xs text-cyan-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Connected
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> Not connected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connected portal info */}
                  {isConnected && connectionPortalDomain && (
                    <p className="text-xs text-cyan-400">Portal: {connectionPortalDomain}</p>
                  )}

                  {/* Per-user credentials form - always required for local apps */}
                  {!isConnected && (
                    <div className="space-y-3">
                      {showCredentialsForm && (
                        <div className="p-3 rounded-lg space-y-3 bg-[#1a2a2a] border border-cyan-900/50">
                          <div className="text-xs text-cyan-400 font-medium">
                            Configurare aplicație Bitrix24
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            Creează o aplicație locală în portalul tău Bitrix24:{' '}
                            <strong>Developer resources → Local integrations → Add local application</strong>.
                          </p>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wide text-gray-500">Portal Domain <span className="text-red-400">*</span></label>
                            <input
                              type="text"
                              value={perUserPortalDomain}
                              onChange={(e) => setPerUserPortalDomain(e.target.value)}
                              placeholder="mycompany.bitrix24.com"
                              className="w-full px-3 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white placeholder:text-gray-600"
                            />
                            <p className="text-[10px] text-gray-500">Domeniul portalului tău Bitrix24 (fără https://)</p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wide text-gray-500">Client ID (Application Code) <span className="text-red-400">*</span></label>
                            <input
                              type="text"
                              value={perUserClientId}
                              onChange={(e) => setPerUserClientId(e.target.value)}
                              placeholder="local.xxxxxxxxxxxxxxxx.xxxxxxxx"
                              className="w-full px-3 py-2 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white placeholder:text-gray-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wide text-gray-500">Client Secret (Application Key) <span className="text-red-400">*</span></label>
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
                              <strong>Important:</strong> Handler path în aplicația Bitrix24:{' '}
                              <code className="bg-black/30 px-1 rounded text-[9px]">https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/bitrix24-oauth-callback</code>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Connect button */}
                      <button
                        onClick={handleBitrix24Connect}
                        disabled={!oauthState || !perUserClientId || !perUserClientSecret || !perUserPortalDomain}
                        className="w-full px-4 py-3 rounded-lg bg-[#2FC6F6] hover:bg-[#25a8d4] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {!oauthState ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <PlugZap className="w-5 h-5" />
                            Conectează Bitrix24
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
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-400">
                      Resource <span className="text-red-400">*</span>
                    </label>
                    <HelpTooltip>
                      <div className="space-y-1">
                        <div><span className="text-cyan-400 font-medium">Lead</span> — potențiali clienți noi</div>
                        <div><span className="text-green-400 font-medium">Deal</span> — oportunități/tranzacții în lucru</div>
                        <div><span className="text-amber-400 font-medium">Contact</span> — persoane fizice</div>
                        <div><span className="text-purple-400 font-medium">Company</span> — persoane juridice</div>
                        <div><span className="text-pink-400 font-medium">Task</span> — sarcini</div>
                        <div><span className="text-orange-400 font-medium">Activity</span> — apeluri, întâlniri</div>
                      </div>
                    </HelpTooltip>
                  </div>
                  <div className="relative">
                    <select
                      value={config.resource}
                      onChange={(e) => setConfig(prev => ({ ...prev, resource: e.target.value, fields: [], filters: [] }))}
                      className="w-full px-3 py-2 rounded-lg text-sm appearance-none cursor-pointer bg-[#252525] border border-[#333] text-white"
                    >
                      {BITRIX24_RESOURCES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">
                    {BITRIX24_RESOURCES.find(r => r.value === config.resource)?.description}
                  </p>
                </div>

                {/* Operation Selector */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-400">
                      Operation <span className="text-red-400">*</span>
                    </label>
                    <HelpTooltip>
                      <div className="space-y-1">
                        <div><span className="text-cyan-400 font-medium">Get</span> — citește un singur record după ID</div>
                        <div><span className="text-green-400 font-medium">Get Many</span> — citește mai multe cu filtre</div>
                        <div><span className="text-emerald-400 font-medium">Create</span> — creează înregistrare nouă</div>
                        <div><span className="text-amber-400 font-medium">Update</span> — actualizează după ID</div>
                        <div><span className="text-red-400 font-medium">Delete</span> — șterge după ID</div>
                      </div>
                    </HelpTooltip>
                  </div>
                  <div className="relative">
                    <select
                      value={config.operation}
                      onChange={(e) => setConfig(prev => ({ ...prev, operation: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm appearance-none cursor-pointer bg-[#252525] border border-[#333] text-white"
                    >
                      {BITRIX24_OPERATIONS.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">
                    {BITRIX24_OPERATIONS.find(op => op.value === config.operation)?.description}
                  </p>
                </div>

                {/* Pipeline ID (for get_stages operation) */}
                {config.operation === 'get_stages' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-medium text-gray-400">
                        Pipeline ID
                      </label>
                      <HelpTooltip>
                        <div className="space-y-1">
                          <div className="text-gray-300">Selectează pipeline-ul pentru care vrei să obții stage-urile:</div>
                          <div><span className="text-cyan-400 font-medium">0</span> — Default Pipeline</div>
                          <div className="text-[10px] text-gray-500 mt-1">
                            Lasă "0" pentru pipeline-ul implicit sau specifică alt ID
                          </div>
                        </div>
                      </HelpTooltip>
                    </div>
                    <div className="relative">
                      <select
                        value={config.pipelineId || '0'}
                        onChange={(e) => setConfig(prev => ({ ...prev, pipelineId: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm appearance-none cursor-pointer bg-[#252525] border border-[#333] text-white"
                      >
                        <option value="0">Default Pipeline (0)</option>
                        {bitrix24Pipelines.map((p) => (
                          <option key={p.ID} value={p.ID}>{p.NAME} ({p.ID})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Stage-urile sunt etapele unui deal într-un anumit pipeline (ex: New, Preparation, Won)
                    </p>
                  </div>
                )}

                {/* Record ID (for get, update, delete) */}
                {needsRecordId && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-400">
                      Record ID <span className="text-red-400">*</span>
                    </label>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#252525]">
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, recordIdSource: 'manual', recordId: '' }))}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          config.recordIdSource === 'manual' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
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
                          placeholder="Introdu Bitrix24 Record ID"
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
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-gray-400">Fields</label>
                        <HelpTooltip>
                          <div className="space-y-1.5">
                            <div className="text-gray-300">Adaugă câmpurile pe care vrei să le setezi:</div>
                            <div><span className="text-cyan-400 font-medium">Static</span> — valori fixe (text, număr)</div>
                            <div><span className="text-green-400 font-medium">From Workflow</span> — preia din noduri anterioare</div>
                            <div className="text-[10px] text-gray-500 mt-1">Ex: {"{{$input.bitrix24_record.ID}}"}</div>
                          </div>
                        </HelpTooltip>
                      </div>
                      <button
                        onClick={addField}
                        className="px-2 py-1 text-xs rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Field
                      </button>
                    </div>

                    {config.fields.length === 0 ? (
                      <div className="p-4 rounded-lg text-center bg-[#252525] border border-dashed border-[#444]">
                        <p className="text-xs text-gray-500">Adaugă câmpuri pentru {config.resource} (ex: TITLE, STATUS_ID, etc.)</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.fields.map((field) => {
                          const availableFields = BITRIX24_ENTITY_FIELDS[config.resource] || [];
                          const isCustomField = field.field && !availableFields.some(f => f.value === field.field) && field.field !== '_custom';

                          return (
                            <div key={field.id} className="p-3 rounded-lg space-y-2 bg-[#252525] border border-[#333]">
                              <div className="flex items-center gap-2">
                                <select
                                  value={isCustomField ? '_custom' : field.field}
                                  onChange={(e) => {
                                    if (e.target.value === '_custom') {
                                      updateField(field.id, 'field', '');
                                    } else {
                                      updateField(field.id, 'field', e.target.value);
                                    }
                                  }}
                                  className="flex-1 px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                >
                                  <option value="">Selectează câmpul...</option>
                                  {availableFields.map((f) => (
                                    <option key={f.value} value={f.value}>
                                      {f.label} {f.required ? '*' : ''}
                                    </option>
                                  ))}
                                  <option value="_custom">📝 Custom field (UF_*)...</option>
                                </select>
                                <button
                                  onClick={() => removeField(field.id)}
                                  className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </button>
                              </div>

                              {(isCustomField || field.field === '' && config.fields.find(f => f.id === field.id)) && (
                                <input
                                  type="text"
                                  value={isCustomField ? field.field : ''}
                                  onChange={(e) => updateField(field.id, 'field', e.target.value.toUpperCase())}
                                  placeholder="Custom field name (e.g., UF_CRM_123456)"
                                  className="w-full px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-amber-500/50 text-amber-400"
                                />
                              )}

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateField(field.id, 'valueSource', 'static')}
                                  className={`px-2 py-1 rounded text-xs transition-colors ${
                                    (field.valueSource || 'static') === 'static'
                                      ? 'bg-cyan-600 text-white'
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
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => updateField(field.id, 'value', e.target.value)}
                                  placeholder="Value"
                                  className="w-full px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Filters (for get_many) */}
                {needsFilters && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-400">Filters</label>
                        <HelpTooltip>
                          <div className="space-y-1.5">
                            <div className="text-amber-400 font-medium">⚠️ IMPORTANT:</div>
                            <div><span className="text-amber-300">Leads</span> → folosește câmpul <code className="text-cyan-400">Status</code></div>
                            <div><span className="text-green-300">Deals</span> → folosește câmpul <code className="text-cyan-400">Stage</code></div>
                            <div className="text-[10px] text-gray-400 mt-1 border-t border-[#444] pt-1">
                              Dropdown-urile verzi = date din portalul tău
                            </div>
                          </div>
                        </HelpTooltip>
                        {isConnected && (
                          <button
                            onClick={fetchBitrix24Data}
                            disabled={isLoadingBitrixData}
                            className="p-1 rounded hover:bg-cyan-500/20 transition-colors"
                            title="Refresh users, statuses & pipelines"
                          >
                            <RefreshCw className={`w-3 h-3 text-cyan-400 ${isLoadingBitrixData ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {bitrix24Users.length > 0 && (
                          <span className="text-[10px] text-green-400">
                            ✓ {bitrix24Users.length} users, {bitrix24Statuses.length} statuses
                          </span>
                        )}
                      </div>
                      <button
                        onClick={addFilter}
                        className="px-2 py-1 text-xs rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Filter
                      </button>
                    </div>

                    {config.filters.length === 0 ? (
                      <div className="p-4 rounded-lg text-center bg-[#252525] border border-dashed border-[#444]">
                        <p className="text-xs text-gray-500">
                          {isLoadingBitrixData ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Se încarcă datele Bitrix24...
                            </span>
                          ) : (
                            'Adaugă filtre pentru a rafina rezultatele'
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.filters.map((filter, idx) => {
                          const availableFields = BITRIX24_FILTER_FIELDS[config.resource] || [];
                          const selectedFieldConfig = availableFields.find(f => f.value === filter.field);
                          const fieldType = selectedFieldConfig?.type;

                          // Get statuses filtered by entity type for leads
                          const getStatusesForResource = () => {
                            if (config.resource === 'leads') {
                              return bitrix24Statuses.filter(s => String(s.ENTITY_ID || '').startsWith('STATUS'));
                            }
                            return bitrix24Statuses;
                          };

                          // Get all stages from all pipelines
                          const getAllStages = () => {
                            const allStages: Array<{ STATUS_ID: string; NAME: string; pipelineName?: string }> = [];
                            for (const pipeline of bitrix24Pipelines) {
                              for (const stage of (pipeline.stages || [])) {
                                allStages.push({
                                  ...stage,
                                  pipelineName: pipeline.NAME,
                                });
                              }
                            }
                            return allStages;
                          };

                          return (
                            <div key={filter.id} className="p-3 rounded-lg space-y-2 bg-[#252525] border border-[#333]">
                              {idx > 0 && (
                                <div className="flex items-center justify-center pb-2 border-b border-[#333]">
                                  <select
                                    value={config.combineFilters}
                                    onChange={(e) => setConfig(prev => ({ ...prev, combineFilters: e.target.value as 'AND' | 'OR' }))}
                                    className="px-3 py-1.5 rounded text-xs font-medium bg-[#1a1a1a] border border-[#444] text-cyan-400"
                                  >
                                    <option value="AND">AND</option>
                                    <option value="OR">OR</option>
                                  </select>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <select
                                  value={filter.field}
                                  onChange={(e) => {
                                    updateFilter(filter.id, 'field', e.target.value);
                                    updateFilter(filter.id, 'value', ''); // Clear value when field changes
                                  }}
                                  className="flex-1 px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                >
                                  <option value="">Selectează câmpul...</option>
                                  {availableFields.map((f) => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                  ))}
                                  <option value="_custom">📝 Custom field...</option>
                                </select>
                                <select
                                  value={filter.operator}
                                  onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                                  className="px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                >
                                  {FILTER_OPERATORS.map((op) => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => removeFilter(filter.id)}
                                  className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </button>
                              </div>

                              {/* Custom field input */}
                              {filter.field === '_custom' && (
                                <input
                                  type="text"
                                  value=""
                                  onChange={(e) => updateFilter(filter.id, 'field', e.target.value.toUpperCase())}
                                  placeholder="Custom field name (e.g., UF_CRM_123)"
                                  className="w-full px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-amber-500/50 text-amber-400"
                                />
                              )}

                              {/* Value Source Toggle (Static vs Workflow) */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateFilter(filter.id, 'valueSource', 'static')}
                                  className={`px-2 py-1 rounded text-xs transition-colors ${
                                    (filter.valueSource || 'static') === 'static'
                                      ? 'bg-cyan-600 text-white'
                                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  Static
                                </button>
                                <button
                                  onClick={() => updateFilter(filter.id, 'valueSource', 'workflow')}
                                  className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                    filter.valueSource === 'workflow'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  <Zap className="w-3 h-3" />
                                  From Workflow
                                </button>
                              </div>

                              {/* Value input based on source type */}
                              {filter.valueSource === 'workflow' ? (
                                <div
                                  onClick={() => {
                                    setActiveFieldId(filter.id);
                                    setActiveFieldTarget('filterValue');
                                    setShowExpressionSelector(true);
                                  }}
                                  className="w-full px-3 py-2 rounded text-xs cursor-pointer flex items-center gap-2 group hover:border-green-400 transition-colors bg-[#0d1f0d] border border-green-400 text-green-400"
                                >
                                  <Zap className="w-3 h-3 flex-shrink-0" />
                                  <code className="flex-1 font-mono truncate">
                                    {filter.value || 'Click to select field from INPUT...'}
                                  </code>
                                </div>
                              ) : (
                                <>
                                  {/* Smart value selector based on field type */}
                                  {fieldType === 'user' && bitrix24Users.length > 0 ? (
                                    <select
                                      value={filter.value}
                                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                      className="w-full px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-emerald-500/50 text-emerald-400"
                                    >
                                      <option value="">Selectează utilizator...</option>
                                      {bitrix24Users.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name} (ID: {u.id})</option>
                                      ))}
                                    </select>
                                  ) : fieldType === 'status' && getStatusesForResource().length > 0 ? (
                                    <select
                                      value={filter.value}
                                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                      className="w-full px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-emerald-500/50 text-emerald-400"
                                    >
                                      <option value="">Selectează status...</option>
                                      {getStatusesForResource().map((s) => (
                                        <option key={s.STATUS_ID} value={s.STATUS_ID}>{s.NAME}</option>
                                      ))}
                                    </select>
                                  ) : fieldType === 'pipeline' && bitrix24Pipelines.length > 0 ? (
                                    <select
                                      value={filter.value}
                                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                      className="w-full px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-emerald-500/50 text-emerald-400"
                                    >
                                      <option value="">Selectează pipeline...</option>
                                      {bitrix24Pipelines.map((p) => (
                                        <option key={p.ID} value={p.ID}>{p.NAME}</option>
                                      ))}
                                    </select>
                                  ) : fieldType === 'stage' && getAllStages().length > 0 ? (
                                    <select
                                      value={filter.value}
                                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                      className="w-full px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-emerald-500/50 text-emerald-400"
                                    >
                                      <option value="">Selectează etapa...</option>
                                      {getAllStages().map((s) => (
                                        <option key={s.STATUS_ID} value={s.STATUS_ID}>
                                          {s.NAME} {s.pipelineName ? `(${s.pipelineName})` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      value={filter.value}
                                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                      placeholder={fieldType === 'date' ? 'YYYY-MM-DD' : 'Value'}
                                      className="w-full px-2 py-1.5 rounded text-xs bg-[#1a1a1a] border border-[#444] text-white"
                                    />
                                  )}
                                </>
                              )}

                              {/* Loading indicator for special fields */}
                              {(filter.valueSource || 'static') === 'static' && fieldType && ['user', 'status', 'pipeline', 'stage'].includes(fieldType) && isLoadingBitrixData && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Se încarcă opțiunile...
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Limit */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={config.returnAll}
                            onChange={(e) => setConfig(prev => ({ ...prev, returnAll: e.target.checked }))}
                            className="rounded bg-[#252525] border-[#444]"
                          />
                          <span className="text-xs text-gray-400">Return All</span>
                        </label>
                      </div>
                      {!config.returnAll && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-400">Limit:</label>
                          <input
                            type="number"
                            value={config.limit}
                            onChange={(e) => setConfig(prev => ({ ...prev, limit: parseInt(e.target.value) || 50 }))}
                            min={1}
                            max={500}
                            className="w-20 px-2 py-1.5 rounded text-xs bg-[#252525] border border-[#333] text-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Field Reference Guide */}
                <div className="bg-[#252525] border border-[#333] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <div className="text-sm text-white font-semibold">Ghid Câmpuri Importante</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="text-amber-400 font-medium">Pentru Leads:</div>
                      <div className="text-gray-400">• <code className="text-cyan-400">STATUS_ID</code> - Etapa lead-ului</div>
                      <div className="text-gray-400">• <code className="text-cyan-400">ASSIGNED_BY_ID</code> - Responsabil</div>
                      <div className="text-gray-400">• <code className="text-cyan-400">SOURCE_ID</code> - Sursa</div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-green-400 font-medium">Pentru Deals:</div>
                      <div className="text-gray-400">• <code className="text-cyan-400">STAGE_ID</code> - Etapa deal-ului</div>
                      <div className="text-gray-400">• <code className="text-cyan-400">CATEGORY_ID</code> - Pipeline/Funnel</div>
                      <div className="text-gray-400">• <code className="text-cyan-400">OPPORTUNITY</code> - Suma</div>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-amber-900/20 border border-amber-500/30">
                    <p className="text-[10px] text-amber-400">
                      <strong>⚠️ Nu confunda:</strong> STATUS_ID este pentru Lead-uri, STAGE_ID este pentru Deals!
                    </p>
                  </div>
                </div>

                {/* Workflow Variables Info */}
                <div className="bg-[#252525] border border-[#333] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-400" />
                    <div className="text-sm text-white font-semibold">Variabile Workflow</div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Poți folosi date din nodurile anterioare folosind expresii. Apasă butonul <span className="text-green-400">"From Workflow"</span> pentru a selecta câmpuri din INPUT.
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="text-gray-400">Exemple expresii:</div>
                    <code className="block px-2 py-1 rounded bg-[#1a1a1a] text-green-400 text-[10px]">{"{{$input.bitrix24_record.ID}}"}</code>
                    <code className="block px-2 py-1 rounded bg-[#1a1a1a] text-green-400 text-[10px]">{"{{$input.bitrix24_records[0].TITLE}}"}</code>
                    <code className="block px-2 py-1 rounded bg-[#1a1a1a] text-green-400 text-[10px]">{"{{$input.amocrm_lead_id}}"}</code>
                  </div>
                </div>

                {/* Note about local apps */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                  <div className="text-sm text-amber-400 font-semibold">Notă Aplicații Locale</div>
                  <p className="text-xs text-gray-400">
                    Fiecare portal Bitrix24 trebuie să aibă propria aplicație locală configurată.
                    Aplicațiile locale nu necesită verificare și pot fi create instant în:
                    <strong className="text-white"> Developer resources → Local integrations → Add local application</strong>
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
              className="px-4 py-2 rounded text-xs font-medium transition-colors hover:opacity-90 bg-cyan-600 text-white"
            >
              Save
            </button>
          </div>
        </div>

        {/* OUTPUT Panel - Right */}
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
              error={typeof executionResult?.error === 'string' ? executionResult.error : undefined}
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
              : activeFieldTarget === 'filterValue' && activeFieldId
                ? (() => {
                    const filter = config.filters.find(f => f.id === activeFieldId);
                    return filter?.value;
                  })()
                : activeFieldId
                  ? (() => {
                      const field = config.fields.find(f => f.id === activeFieldId);
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
            } else if (activeFieldTarget === 'filterValue' && activeFieldId) {
              // Update filter value with workflow expression
              updateFilter(activeFieldId, 'value', expression);
            } else if (activeFieldId && activeFieldTarget === 'value') {
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
