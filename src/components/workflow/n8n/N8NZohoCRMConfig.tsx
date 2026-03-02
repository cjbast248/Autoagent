import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ChevronDown,
  Play,
  Loader2,
  ExternalLink,
  X,
  ArrowLeft,
  Plus,
  Trash2,
  Link,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

// Exact n8n colors from HTML template (matching HTTP node)
const colors = {
  bgBody: '#111111',
  bgPanel: '#232323',
  bgInput: '#1d1d1d',
  borderInput: '#383838',
  borderHover: '#555',
  textWhite: '#e8e8e8',
  textLabel: '#ccc',
  textPlaceholder: '#666',
  zohoRed: '#D32F2F',
  n8nGreen: '#2ecc71',
  codeKey: '#9cdcfe',
  codeStr: '#ce9178',
  codePunct: '#d4d4d4',
};

// Zoho CRM Icon
const ZohoCRMIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="4" fill="#D32F2F" />
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Z</text>
  </svg>
);

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface FieldValue {
  id: string;
  field: string;
  value: string;
  valueSource?: 'static' | 'workflow';
  workflowField?: string;
  isExpression?: boolean;
}

interface ZohoCRMConfig {
  resource: string;
  operation: string;
  recordId?: string;
  recordIdSource?: 'manual' | 'workflow';
  recordIdIsExpression?: boolean;
  picklistField?: string;
  fields: FieldValue[];
  filters: FilterCondition[];
  combineFilters: 'AND' | 'OR';
  returnAll: boolean;
  limit: number;
  duplicateCheckFields: string[];
  pinnedData?: any;
}

interface ZohoField {
  api_name: string;
  display_label: string;
  data_type: string;
  required: boolean;
  pick_list_values?: { display_value: string; actual_value?: string }[];
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NZohoCRMConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: ZohoCRMConfig;
  };
  onClose: () => void;
  onSave: (config: ZohoCRMConfig) => void;
  onExecutionUpdate?: (data: { input?: any; output?: any }) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
  nodeSources?: NodeData[];
}

const ZOHO_RESOURCES = [
  { value: 'Leads', label: 'Lead' },
  { value: 'Contacts', label: 'Contact' },
  { value: 'Accounts', label: 'Account' },
  { value: 'Deals', label: 'Deal' },
  { value: 'Products', label: 'Product' },
  { value: 'Quotes', label: 'Quote' },
  { value: 'Sales_Orders', label: 'Sales Order' },
  { value: 'Purchase_Orders', label: 'Purchase Order' },
  { value: 'Invoices', label: 'Invoice' },
  { value: 'Vendors', label: 'Vendor' },
];

const ZOHO_OPERATIONS = [
  { value: 'create', label: 'Create', description: 'Create a new record' },
  { value: 'create_or_update', label: 'Create or Update', description: 'Create or update a record (upsert)' },
  { value: 'delete', label: 'Delete', description: 'Delete a record' },
  { value: 'get', label: 'Get', description: 'Get a single record' },
  { value: 'get_many', label: 'Get Many', description: 'Get multiple records' },
  { value: 'get_fields', label: 'Get Fields', description: 'Get available fields for a module' },
  { value: 'get_picklist_values', label: 'Get Picklist Values', description: 'Get dropdown values for a specific field (e.g., Lead Status, Stage)' },
  { value: 'update', label: 'Update', description: 'Update an existing record' },
];

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

// n8n Style Toggle Switch Component (same as HTTP node)
const ToggleSwitch: React.FC<{
  active: boolean;
  onClick: () => void;
}> = ({ active, onClick }) => (
  <div
    onClick={onClick}
    style={{
      width: '32px',
      height: '18px',
      backgroundColor: active ? colors.n8nGreen : '#4a4a4a',
      borderRadius: '9px',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '2px',
        left: active ? '16px' : '2px',
        width: '14px',
        height: '14px',
        background: 'white',
        borderRadius: '50%',
        transition: 'left 0.2s',
      }}
    />
  </div>
);

// n8n Style Dropdown Component (same as HTTP node)
const N8NDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div
    style={{
      width: '100%',
      backgroundColor: colors.bgInput,
      border: `1px solid ${colors.borderInput}`,
      borderRadius: '4px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      cursor: 'pointer',
      justifyContent: 'space-between',
      position: 'relative',
    }}
  >
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'transparent',
        border: 'none',
        color: colors.textWhite,
        width: '100%',
        outline: 'none',
        fontFamily: 'inherit',
        fontSize: '13px',
        cursor: 'pointer',
        appearance: 'none',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ backgroundColor: colors.bgPanel }}>
          {opt.label}
        </option>
      ))}
    </select>
    <ChevronDown size={12} style={{ color: '#999', position: 'absolute', right: '12px', pointerEvents: 'none' }} />
  </div>
);

// n8n Style Parameter Input with Fixed/Expression toggle (same as HTTP node)
const N8NParameterInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'number';
  isExpression?: boolean;
  onToggleExpression?: () => void;
  resolvedValue?: string;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}> = ({ value, onChange, placeholder, type = 'text', isExpression, onToggleExpression, resolvedValue, onDrop, isDragOver }) => {
  const hasExpression = value?.includes('{{') && value?.includes('}}');
  const effectiveIsExpression = isExpression !== undefined ? isExpression : hasExpression;

  return (
    <div style={{ position: 'relative' }}>
      {/* Fixed/Expression toggle buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '6px',
        }}
      >
        <div style={{ color: '#666', fontSize: '11px', marginRight: '4px' }}>⊡</div>
        <div style={{ color: '#666', fontSize: '11px', marginRight: '8px' }}>⋮</div>
        <button
          onClick={() => {
            if (effectiveIsExpression && onToggleExpression) onToggleExpression();
          }}
          style={{
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '3px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: !effectiveIsExpression ? '#3a3a3a' : 'transparent',
            color: !effectiveIsExpression ? '#fff' : '#888',
          }}
        >
          Fixed
        </button>
        <button
          onClick={() => {
            if (!effectiveIsExpression && onToggleExpression) onToggleExpression();
          }}
          style={{
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '3px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: effectiveIsExpression ? '#3a3a3a' : 'transparent',
            color: effectiveIsExpression ? '#fff' : '#888',
          }}
        >
          Expression
        </button>
      </div>

      {/* Input field with drag support */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={onDrop}
        style={{
          width: '100%',
          backgroundColor: isDragOver ? '#0d1f0d' : colors.bgInput,
          border: isDragOver ? '2px dashed #4ade80' : `1px solid ${effectiveIsExpression ? '#5c4095' : colors.borderInput}`,
          borderRadius: '4px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s',
        }}
      >
        {/* fx badge for expression mode */}
        {effectiveIsExpression && (
          <div
            style={{
              width: '28px',
              height: '100%',
              backgroundColor: 'rgba(92, 64, 149, 0.3)',
              borderRight: '1px solid #5c4095',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a78bfa',
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: '12px',
              userSelect: 'none',
            }}
          >
            fx
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isDragOver ? '📥 Drop field here...' : placeholder}
          style={{
            flex: 1,
            padding: '0 12px',
            background: 'transparent',
            border: 'none',
            color: effectiveIsExpression ? colors.n8nGreen : colors.textWhite,
            fontFamily: effectiveIsExpression ? "'Roboto Mono', monospace" : 'inherit',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      {/* Resolved value preview for expressions */}
      {effectiveIsExpression && resolvedValue && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ color: '#999' }}>Result:</span>
          <span style={{ color: colors.n8nGreen, fontFamily: "'Roboto Mono', monospace" }}>
            {resolvedValue}
          </span>
        </div>
      )}
    </div>
  );
};

// Simple input without toggle
const N8NInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'number';
}> = ({ value, onChange, placeholder, type = 'text' }) => (
  <div
    style={{
      width: '100%',
      backgroundColor: colors.bgInput,
      border: `1px solid ${colors.borderInput}`,
      borderRadius: '4px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
    }}
  >
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: 'transparent',
        border: 'none',
        color: colors.textWhite,
        width: '100%',
        outline: 'none',
        fontFamily: 'inherit',
        fontSize: '13px',
      }}
    />
  </div>
);

export const N8NZohoCRMConfig: React.FC<N8NZohoCRMConfigProps> = ({
  node,
  onClose,
  onSave,
  onExecutionUpdate,
  inputData,
  outputData,
  previousNodeLabel,
  nodeSources,
}) => {
  console.log('[ZohoCRM] Component rendering, node:', node?.id);

  const { user } = useAuth();
  console.log('[ZohoCRM] User:', user?.id);
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [availableFields, setAvailableFields] = useState<ZohoField[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [zohoRegion, setZohoRegion] = useState('eu');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);

  // Drag state
  const [isDragOverRecordId, setIsDragOverRecordId] = useState(false);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);

  // Use pinned data as fallback when no live input data
  const effectiveInputData = inputData || pinnedData;

  // Handler for pinning data
  const handlePinData = (data: any) => {
    setPinnedData(data);
    toast.success('Data pinned! You can now test without re-running previous nodes.');
  };

  // Parse initial config from node label
  const parseNodeLabel = () => {
    const label = node.label.toLowerCase();
    let resource = 'Leads';
    let operation = 'get_many';

    if (label.includes('lead')) resource = 'Leads';
    else if (label.includes('contact')) resource = 'Contacts';
    else if (label.includes('account')) resource = 'Accounts';
    else if (label.includes('deal')) resource = 'Deals';
    else if (label.includes('product')) resource = 'Products';
    else if (label.includes('quote')) resource = 'Quotes';
    else if (label.includes('sales order')) resource = 'Sales_Orders';
    else if (label.includes('purchase order')) resource = 'Purchase_Orders';
    else if (label.includes('invoice')) resource = 'Invoices';
    else if (label.includes('vendor')) resource = 'Vendors';

    if (label.includes('create or update') || label.includes('upsert')) operation = 'create_or_update';
    else if (label.includes('create')) operation = 'create';
    else if (label.includes('delete')) operation = 'delete';
    else if (label.includes('update')) operation = 'update';
    else if (label.includes('get many') || label.includes('get all')) operation = 'get_many';
    else if (label.includes('get field')) operation = 'get_fields';
    else if (label.includes('get')) operation = 'get';

    return { resource, operation };
  };

  const initialParsed = parseNodeLabel();

  const [config, setConfig] = useState<ZohoCRMConfig>({
    resource: node.config?.resource || initialParsed.resource,
    operation: node.config?.operation || initialParsed.operation,
    recordId: node.config?.recordId || '',
    recordIdSource: node.config?.recordIdSource || 'manual',
    recordIdIsExpression: node.config?.recordIdIsExpression || false,
    fields: node.config?.fields || [],
    filters: node.config?.filters || [],
    combineFilters: node.config?.combineFilters || 'AND',
    returnAll: node.config?.returnAll ?? false,
    limit: node.config?.limit || 50,
    duplicateCheckFields: node.config?.duplicateCheckFields || ['Email'],
  });

  // Helper to get nested value from path
  const getValueFromPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;
    const parts = path.split(/\.(?![^\[]*\])/);
    let value = obj;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, indexStr] = arrayMatch;
        value = value[arrayName];
        if (Array.isArray(value)) {
          value = value[parseInt(indexStr, 10)];
        } else {
          return undefined;
        }
      } else {
        value = value[part];
      }
    }
    return value;
  };

  // Build node context from nodeSources for expression resolution
  const buildNodeContext = (): Record<string, any> => {
    const context: Record<string, any> = {};
    if (nodeSources) {
      for (const source of nodeSources) {
        if (source.data) {
          context[source.nodeName] = source.data;
        }
      }
    }
    if (effectiveInputData) {
      context['$json'] = effectiveInputData;
      context['$input'] = effectiveInputData;
    }
    return context;
  };

  // Resolve expressions
  const resolveExpression = (text: string, data: any): string => {
    if (!text) return text;

    const nodeContext = buildNodeContext();
    let resolved = text;

    // Handle {{ $('NodeName').item.json['path'] }}
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\['([^']+)'\]\s*\}\}/g,
      (match, nodeName, bracketPath) => {
        const nodeData = nodeContext[nodeName];
        if (!nodeData) return match;
        const value = bracketPath ? getValueFromPath(nodeData, bracketPath.trim()) : nodeData;
        if (value !== undefined) {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return match;
      });

    // Handle {{ $('NodeName').item.json.path }}
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\.([^}\s]+)\s*\}\}/g,
      (match, nodeName, dotPath) => {
        const nodeData = nodeContext[nodeName];
        if (!nodeData) return match;
        const value = dotPath ? getValueFromPath(nodeData, dotPath.trim()) : nodeData;
        if (value !== undefined) {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return match;
      });

    // Handle {{ $json.path }}
    resolved = resolved.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      return match;
    });

    return resolved;
  };

  // Check Zoho connection
  useEffect(() => {
    const checkConnection = async () => {
      if (!user?.id) return;

      setIsCheckingConnection(true);
      try {
        const { data, error } = await supabase
          .from('zoho_crm_connections')
          .select('status, zoho_email')
          .eq('user_id', user.id)
          .eq('status', 'connected')
          .maybeSingle();

        setIsConnected(!!data && data.status === 'connected');
      } catch (err) {
        console.error('Error checking Zoho connection:', err);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkConnection();
  }, [user?.id]);

  // Disconnect Zoho CRM
  const handleDisconnect = async () => {
    if (!user?.id) return;
    try {
      setIsCheckingConnection(true);
      const { error } = await supabase
        .from('zoho_crm_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      toast.success('Zoho CRM disconnected successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect Zoho CRM');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Load fields when resource changes
  useEffect(() => {
    if (isConnected && config.resource) {
      loadFields();
    }
  }, [isConnected, config.resource]);

  const loadFields = async () => {
    if (!user?.id) return;

    setIsLoadingFields(true);
    try {
      const response = await fetch(
        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/zoho-crm-get-fields?user_id=${user.id}&module=${config.resource}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
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

  const handleConnect = async () => {
    if (!user?.id) return;

    if (!clientId || !clientSecret) {
      toast.error('Client ID și Client Secret sunt obligatorii');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('zoho-oauth-init', {
        body: {
          user_id: user.id,
          client_id: clientId,
          client_secret: clientSecret,
          zoho_region: zohoRegion
        },
      });

      if (error) throw error;

      const authUrl = data?.authUrl || data?.authorization_url;
      if (authUrl) {
        const popup = window.open(authUrl, 'zoho-oauth', 'width=600,height=700');

        let pollCount = 0;
        const maxPolls = 60; // 2 minute max (60 * 2 seconds)

        const pollInterval = setInterval(async () => {
          pollCount++;

          // Stop polling after 2 minutes or if popup is closed
          if (pollCount >= maxPolls || popup?.closed) {
            clearInterval(pollInterval);
            if (!popup?.closed) {
              popup?.close();
            }
            return;
          }

          const { data: conn } = await supabase
            .from('zoho_crm_connections')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'connected')
            .maybeSingle();

          if (conn) {
            clearInterval(pollInterval);
            setIsConnected(true);
            setShowCredentialsForm(false);
            popup?.close();
            toast.success('Connected to Zoho CRM');
          }
        }, 2000);

        setTimeout(() => clearInterval(pollInterval), 120000);
      } else {
        console.error('No auth URL returned:', data);
        toast.error('Failed to get authorization URL');
      }
    } catch (err) {
      console.error('Error initiating Zoho OAuth:', err);
      toast.error('Failed to connect');
    }
  };

  // Field management
  const addField = () => {
    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, { id: `field-${Date.now()}`, field: '', value: '', valueSource: 'static', isExpression: false }],
    }));
  };

  const updateField = (id: string, key: keyof FieldValue, value: string | boolean) => {
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

  // Filter management
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

  // Handle drop on field
  const handleFieldDrop = (fieldId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFieldId(null);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const droppedField = JSON.parse(jsonData);
        const expression = droppedField.expression || `{{ $json.${droppedField.path} }}`;
        updateField(fieldId, 'value', expression);
        updateField(fieldId, 'isExpression', true);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Handle drop on record ID
  const handleRecordIdDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverRecordId(false);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const field = JSON.parse(jsonData);
        const expression = field.expression || `{{ $json.${field.path} }}`;
        setConfig(prev => ({ ...prev, recordId: expression, recordIdIsExpression: true }));
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Execute step
  const executeStep = async () => {
    if (!user?.id) return;

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      let endpoint = '';
      let method = 'POST';
      let body: any = { user_id: user.id, module: config.resource };

      // Resolve expressions in field values
      const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
      const resolvedRecordId = config.recordIdIsExpression && config.recordId
        ? resolveExpression(config.recordId, data)
        : config.recordId;

      const resolvedFields: Record<string, any> = {};
      config.fields.forEach(f => {
        if (f.field) {
          resolvedFields[f.field] = f.isExpression ? resolveExpression(f.value, data) : f.value;
        }
      });

      switch (config.operation) {
        case 'get':
          endpoint = 'zoho-crm-get';
          method = 'GET';
          break;
        case 'get_many':
          endpoint = 'zoho-crm-get-many';
          body.filters = config.filters;
          body.limit = config.returnAll ? 200 : config.limit;
          break;
        case 'get_fields':
          endpoint = 'zoho-crm-get-fields';
          method = 'GET';
          break;
        case 'create':
          endpoint = 'zoho-crm-create';
          body.data = resolvedFields;
          break;
        case 'update':
          endpoint = 'zoho-crm-update';
          body.record_id = resolvedRecordId;
          body.data = resolvedFields;
          break;
        case 'delete':
          endpoint = 'zoho-crm-delete';
          body.record_id = resolvedRecordId;
          break;
        case 'create_or_update':
          endpoint = 'zoho-crm-upsert';
          body.data = resolvedFields;
          body.duplicate_check_fields = config.duplicateCheckFields;
          break;
      }

      const url = method === 'GET'
        ? `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/${endpoint}?user_id=${user.id}&module=${config.resource}${resolvedRecordId ? `&record_id=${resolvedRecordId}` : ''}`
        : `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        ...(method !== 'GET' && { body: JSON.stringify(body) }),
      });

      const result = await response.json();
      setExecutionResult(result);

      if (result.error) {
        setExecutionError(result.error);
        toast.error('Execution failed: ' + result.error);
      } else {
        toast.success('Execution successful');

        if (onExecutionUpdate) {
          onExecutionUpdate({
            input: effectiveInputData,
            output: result.data || result,
          });
        }
      }
    } catch (err: any) {
      setExecutionError(err.message);
      setExecutionResult({ error: err.message });
      toast.error('Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const needsRecordId = ['get', 'update', 'delete'].includes(config.operation);
  const needsFields = ['create', 'update', 'create_or_update'].includes(config.operation);
  const needsFilters = config.operation === 'get_many';
  const needsDuplicateCheck = config.operation === 'create_or_update';

  const handleSave = () => {
    onSave({ ...config, pinnedData });
    onClose();
  };

  useEffect(() => {
    onSave({ ...config, pinnedData });
  }, [config, pinnedData]);

  const displayOutput = executionResult || outputData;

  console.log('[ZohoCRM] About to render modal, config:', config?.operation);

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgBody,
        backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Back to canvas button */}
      <button
        onClick={handleSave}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#999',
          background: '#2d2f36',
          border: '1px solid #3e4149',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={12} />
        Back to canvas
      </button>

      {/* Main container */}
      <div
        style={{
          display: 'flex',
          height: '85vh',
          maxWidth: '98vw',
          width: '95%',
        }}
      >
        {/* INPUT Panel */}
        <div
          style={{
            flex: 1,
            minWidth: '350px',
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <N8NNodeIOPanel
            title="INPUT"
            data={effectiveInputData}
            enableDrag={true}
            nodeSources={nodeSources}
            onPinData={handlePinData}
            isPinned={!!pinnedData}
          />
        </div>

        {/* Main Config Panel */}
        <div
          style={{
            width: '650px',
            flexShrink: 0,
            backgroundColor: colors.bgPanel,
            boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px #4a4a4a',
            borderRadius: '8px',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              height: '54px',
              minHeight: '54px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #111',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ZohoCRMIcon size={16} />
              <div style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.3px', color: colors.textWhite }}>
                Zoho CRM
              </div>

              {/* Tabs in header */}
              <div style={{ display: 'flex', gap: '24px', marginLeft: '30px', height: '54px' }}>
                <div
                  onClick={() => setActiveTab('parameters')}
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: activeTab === 'parameters' ? colors.zohoRed : '#999',
                    fontWeight: 500,
                    fontSize: '13px',
                    position: 'relative',
                  }}
                >
                  Parameters
                  {activeTab === 'parameters' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: colors.zohoRed,
                      }}
                    />
                  )}
                </div>
                <div
                  onClick={() => setActiveTab('settings')}
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: activeTab === 'settings' ? colors.zohoRed : '#999',
                    fontWeight: 500,
                    fontSize: '13px',
                    position: 'relative',
                  }}
                >
                  Settings
                  {activeTab === 'settings' && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: colors.zohoRed,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <a
                href="https://www.zoho.com/crm/developer/docs/api/v2/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#999',
                  textDecoration: 'none',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Docs <ExternalLink size={10} />
              </a>
              <button
                onClick={executeStep}
                disabled={!isConnected || isExecuting}
                style={{
                  backgroundColor: colors.zohoRed,
                  color: 'white',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '100px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: isConnected ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 5px rgba(211, 47, 47, 0.2)',
                  opacity: isConnected ? 1 : 0.6,
                }}
              >
                {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} />}
                Execute step
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            {activeTab === 'parameters' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Connection Status */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Credential to connect with
                  </label>
                  {isCheckingConnection ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px',
                        backgroundColor: colors.bgInput,
                        border: `1px solid ${colors.borderInput}`,
                        borderRadius: '4px',
                      }}
                    >
                      <Loader2 size={14} style={{ color: '#888' }} className="animate-spin" />
                      <span style={{ fontSize: '12px', color: '#888' }}>Checking connection...</span>
                    </div>
                  ) : isConnected ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '12px',
                        backgroundColor: '#1a3d1a',
                        border: '1px solid #2d5a2d',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={14} style={{ color: '#4ade80' }} />
                        <span style={{ fontSize: '12px', color: '#4ade80' }}>Connected to Zoho CRM</span>
                      </div>
                      <button
                        onClick={handleDisconnect}
                        disabled={isCheckingConnection}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.5)',
                          borderRadius: '4px',
                          color: '#ef4444',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: isCheckingConnection ? 'not-allowed' : 'pointer',
                          opacity: isCheckingConnection ? 0.5 : 1,
                        }}
                      >
                        <X size={12} />
                        Disconnect
                      </button>
                    </div>
                  ) : !showCredentialsForm ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          padding: '12px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '4px',
                        }}
                      >
                        <p style={{ fontSize: '11px', color: colors.textLabel, marginBottom: '8px', fontWeight: 600 }}>
                          📋 Pași pentru configurare:
                        </p>
                        <ol style={{ fontSize: '10px', color: colors.textLabel, paddingLeft: '16px', margin: 0, lineHeight: '1.6' }}>
                          <li>Deschide Zoho API Console pentru regiunea ta</li>
                          <li>Creează "Self Client" (Homepage URL: <code style={{ backgroundColor: colors.bgInput, padding: '1px 3px', borderRadius: '2px', fontSize: '9px' }}>https://app.agentauto.app</code>)</li>
                          <li>Adaugă Redirect URI: <code style={{ backgroundColor: colors.bgInput, padding: '2px 4px', borderRadius: '2px', fontSize: '9px', display: 'inline-block', maxWidth: '100%', wordBreak: 'break-all' }}>https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/zoho-oauth-callback</code></li>
                          <li>Copiază Client ID și Client Secret</li>
                        </ol>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <a
                            href="https://api-console.zoho.eu/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              color: '#3b82f6',
                              textDecoration: 'none',
                            }}
                          >
                            🇪🇺 EU Console <ExternalLink size={9} />
                          </a>
                          <a
                            href="https://api-console.zoho.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              color: '#3b82f6',
                              textDecoration: 'none',
                            }}
                          >
                            🇺🇸 US Console <ExternalLink size={9} />
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCredentialsForm(true)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px',
                          backgroundColor: colors.zohoRed,
                          border: 'none',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <Link size={14} />
                        Configurează OAuth Credentials
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Zoho Region */}
                      <div>
                        <label style={{ display: 'block', color: colors.textLabel, marginBottom: '6px', fontSize: '11px', fontWeight: 600 }}>
                          Zoho Region
                        </label>
                        <select
                          value={zohoRegion}
                          onChange={(e) => setZohoRegion(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: colors.bgInput,
                            border: `1px solid ${colors.borderInput}`,
                            borderRadius: '4px',
                            color: colors.textWhite,
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        >
                          <option value="eu">Europe (.eu)</option>
                          <option value="com">United States (.com)</option>
                          <option value="in">India (.in)</option>
                          <option value="au">Australia (.au)</option>
                          <option value="jp">Japan (.jp)</option>
                        </select>
                        <p style={{ fontSize: '10px', color: colors.textPlaceholder, marginTop: '4px' }}>
                          Selectează data center-ul unde este configurat contul tău Zoho
                        </p>
                      </div>

                      {/* Client ID */}
                      <div>
                        <label style={{ display: 'block', color: colors.textLabel, marginBottom: '6px', fontSize: '11px', fontWeight: 600 }}>
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXX"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: colors.bgInput,
                            border: `1px solid ${colors.borderInput}`,
                            borderRadius: '4px',
                            color: colors.textWhite,
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Client Secret */}
                      <div>
                        <label style={{ display: 'block', color: colors.textLabel, marginBottom: '6px', fontSize: '11px', fontWeight: 600 }}>
                          Client Secret
                        </label>
                        <input
                          type="password"
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder="••••••••••••••••••••••••"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: colors.bgInput,
                            border: `1px solid ${colors.borderInput}`,
                            borderRadius: '4px',
                            color: colors.textWhite,
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleConnect}
                          disabled={!clientId || !clientSecret}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px',
                            backgroundColor: (!clientId || !clientSecret) ? colors.borderInput : colors.zohoRed,
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: (!clientId || !clientSecret) ? 'not-allowed' : 'pointer',
                            opacity: (!clientId || !clientSecret) ? 0.5 : 1,
                          }}
                        >
                          <Link size={14} />
                          Conectează Zoho CRM
                        </button>
                        <button
                          onClick={() => setShowCredentialsForm(false)}
                          style={{
                            padding: '10px 16px',
                            backgroundColor: colors.bgInput,
                            border: `1px solid ${colors.borderInput}`,
                            borderRadius: '4px',
                            color: colors.textLabel,
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Anulează
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resource */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Resource <span style={{ color: colors.zohoRed }}>*</span>
                  </label>
                  <N8NDropdown
                    value={config.resource}
                    onChange={(v) => setConfig(prev => ({ ...prev, resource: v }))}
                    options={ZOHO_RESOURCES}
                  />
                </div>

                {/* Operation */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Operation <span style={{ color: colors.zohoRed }}>*</span>
                  </label>
                  <N8NDropdown
                    value={config.operation}
                    onChange={(v) => setConfig(prev => ({ ...prev, operation: v }))}
                    options={ZOHO_OPERATIONS.map(op => ({ value: op.value, label: op.label }))}
                  />
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                    {ZOHO_OPERATIONS.find(op => op.value === config.operation)?.description}
                  </p>
                </div>

                {/* Picklist Field Selection - for get_picklist_values operation */}
                {config.operation === 'get_picklist_values' && (
                  <div>
                    <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                      Picklist Field <span style={{ color: colors.zohoRed }}>*</span>
                    </label>
                    <select
                      value={config.picklistField || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, picklistField: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: colors.bgInput,
                        border: `1px solid ${colors.borderInput}`,
                        borderRadius: '4px',
                        color: colors.textWhite,
                        fontSize: '12px',
                      }}
                    >
                      <option value="">Select a field...</option>
                      {availableFields
                        .filter(f => f.data_type === 'picklist' || f.data_type === 'multiselectpicklist')
                        .map((f) => (
                          <option key={f.api_name} value={f.api_name}>
                            {f.display_label} ({f.api_name})
                          </option>
                        ))}
                    </select>
                    <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                      📌 <strong>Usage:</strong> Extract dropdown values (e.g., "New Lead", "Contacted") to use in filters or create records. Values are returned in <code style={{ background: '#1d1d1d', padding: '2px 4px', borderRadius: '2px' }}>zoho_picklist_values</code>.
                    </p>
                  </div>
                )}

                {/* Record ID */}
                {needsRecordId && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOverRecordId(true);
                    }}
                    onDragLeave={() => setIsDragOverRecordId(false)}
                  >
                    <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                      Record ID <span style={{ color: colors.zohoRed }}>*</span>
                    </label>
                    <N8NParameterInput
                      value={config.recordId || ''}
                      onChange={(v) => setConfig(prev => ({ ...prev, recordId: v }))}
                      placeholder="Enter Zoho Record ID or drag from INPUT"
                      isExpression={config.recordIdIsExpression}
                      onToggleExpression={() => setConfig(prev => ({ ...prev, recordIdIsExpression: !prev.recordIdIsExpression }))}
                      resolvedValue={config.recordIdIsExpression && effectiveInputData ? resolveExpression(config.recordId || '', effectiveInputData) : undefined}
                      onDrop={handleRecordIdDrop}
                      isDragOver={isDragOverRecordId}
                    />
                  </div>
                )}

                {/* Duplicate Check Fields */}
                {needsDuplicateCheck && (
                  <div>
                    <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                      Duplicate Check Fields
                    </label>
                    <N8NInput
                      value={config.duplicateCheckFields.join(', ')}
                      onChange={(v) => setConfig(prev => ({
                        ...prev,
                        duplicateCheckFields: v.split(',').map(s => s.trim()).filter(Boolean),
                      }))}
                      placeholder="Email, Phone"
                    />
                    <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                      Comma-separated field names to check for duplicates
                    </p>
                  </div>
                )}

                {/* Fields */}
                {needsFields && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ color: colors.textLabel, fontSize: '12px', fontWeight: 600 }}>
                        Fields
                      </label>
                      {isLoadingFields && <Loader2 size={12} style={{ color: '#888' }} className="animate-spin" />}
                    </div>

                    {config.fields.length === 0 ? (
                      <div
                        style={{
                          padding: '20px',
                          textAlign: 'center',
                          backgroundColor: colors.bgInput,
                          border: '1px dashed #444',
                          borderRadius: '4px',
                        }}
                      >
                        <p style={{ fontSize: '12px', color: '#666' }}>No fields added yet</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {config.fields.map((field) => (
                          <div
                            key={field.id}
                            style={{
                              padding: '12px',
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #333',
                              borderRadius: '4px',
                            }}
                          >
                            {/* Field selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              <select
                                value={field.field}
                                onChange={(e) => updateField(field.id, 'field', e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  backgroundColor: colors.bgInput,
                                  border: `1px solid ${colors.borderInput}`,
                                  borderRadius: '4px',
                                  color: colors.textWhite,
                                  fontSize: '12px',
                                }}
                              >
                                <option value="">Select Zoho field...</option>
                                {availableFields.map((f) => {
                                  // Check if this field is already selected in another field mapping
                                  const isAlreadySelected = config.fields.some(
                                    existingField => existingField.id !== field.id && existingField.field === f.api_name
                                  );

                                  return (
                                    <option
                                      key={f.api_name}
                                      value={f.api_name}
                                      disabled={isAlreadySelected}
                                      style={{
                                        color: isAlreadySelected ? '#666' : colors.textWhite,
                                        fontStyle: isAlreadySelected ? 'italic' : 'normal'
                                      }}
                                    >
                                      {f.display_label} {f.required && '*'} {isAlreadySelected && '(already used)'}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                onClick={() => removeField(field.id)}
                                style={{
                                  padding: '8px',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  color: '#ef4444',
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Value input */}
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverFieldId(field.id);
                              }}
                              onDragLeave={() => setDragOverFieldId(null)}
                            >
                              <N8NParameterInput
                                value={field.value}
                                onChange={(v) => updateField(field.id, 'value', v)}
                                placeholder="Enter value or drag from INPUT"
                                isExpression={field.isExpression}
                                onToggleExpression={() => updateField(field.id, 'isExpression', !field.isExpression)}
                                resolvedValue={field.isExpression && effectiveInputData ? resolveExpression(field.value, effectiveInputData) : undefined}
                                onDrop={(e) => handleFieldDrop(field.id, e)}
                                isDragOver={dragOverFieldId === field.id}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={addField}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '10px',
                        backgroundColor: '#2e2e2e',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ccc',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={14} />
                      Add Field
                    </button>
                  </div>
                )}

                {/* Filters */}
                {needsFilters && (
                  <>
                    <div>
                      <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                        Filters
                      </label>

                      {config.filters.length === 0 ? (
                        <div
                          style={{
                            padding: '20px',
                            textAlign: 'center',
                            backgroundColor: colors.bgInput,
                            border: '1px dashed #444',
                            borderRadius: '4px',
                          }}
                        >
                          <p style={{ fontSize: '12px', color: '#666' }}>No filters added. All records will be returned.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {config.filters.map((filter, idx) => (
                            <div
                              key={filter.id}
                              style={{
                                padding: '12px',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '4px',
                              }}
                            >
                              {idx > 0 && (
                                <div style={{ textAlign: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #333' }}>
                                  <select
                                    value={config.combineFilters}
                                    onChange={(e) => setConfig(prev => ({ ...prev, combineFilters: e.target.value as 'AND' | 'OR' }))}
                                    style={{
                                      padding: '4px 12px',
                                      backgroundColor: colors.bgInput,
                                      border: `1px solid ${colors.borderInput}`,
                                      borderRadius: '4px',
                                      color: colors.zohoRed,
                                      fontSize: '11px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <option value="AND">AND</option>
                                    <option value="OR">OR</option>
                                  </select>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                                <div>
                                  <label style={{ display: 'block', color: '#666', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}>Field</label>
                                  <select
                                    value={filter.field}
                                    onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px',
                                      backgroundColor: colors.bgInput,
                                      border: `1px solid ${colors.borderInput}`,
                                      borderRadius: '4px',
                                      color: colors.textWhite,
                                      fontSize: '12px',
                                    }}
                                  >
                                    <option value="">Select...</option>
                                    {availableFields.map((f) => (
                                      <option key={f.api_name} value={f.api_name}>{f.display_label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', color: '#666', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}>Operator</label>
                                  <select
                                    value={filter.operator}
                                    onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px',
                                      backgroundColor: colors.bgInput,
                                      border: `1px solid ${colors.borderInput}`,
                                      borderRadius: '4px',
                                      color: colors.textWhite,
                                      fontSize: '12px',
                                    }}
                                  >
                                    {FILTER_OPERATORS.map((op) => (
                                      <option key={op.value} value={op.value}>{op.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', color: '#666', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase' }}>Value</label>
                                  <input
                                    type="text"
                                    value={filter.value}
                                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                    placeholder="Enter value..."
                                    style={{
                                      width: '100%',
                                      padding: '8px',
                                      backgroundColor: colors.bgInput,
                                      border: `1px solid ${colors.borderInput}`,
                                      borderRadius: '4px',
                                      color: colors.textWhite,
                                      fontSize: '12px',
                                    }}
                                  />
                                </div>
                                <button
                                  onClick={() => removeFilter(filter.id)}
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={addFilter}
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '10px',
                          backgroundColor: '#2e2e2e',
                          border: '1px dashed #444',
                          borderRadius: '4px',
                          color: '#ccc',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Plus size={14} />
                        Add Filter
                      </button>
                    </div>

                    {/* Return All / Limit */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '24px' }}>
                      <span style={{ fontSize: '12px', color: colors.textWhite, fontWeight: 500 }}>Return All</span>
                      <ToggleSwitch
                        active={config.returnAll}
                        onClick={() => setConfig(prev => ({ ...prev, returnAll: !prev.returnAll }))}
                      />
                    </div>

                    {!config.returnAll && (
                      <div>
                        <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                          Limit
                        </label>
                        <N8NInput
                          type="number"
                          value={String(config.limit)}
                          onChange={(v) => setConfig(prev => ({ ...prev, limit: parseInt(v) || 50 }))}
                          placeholder="50"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Options footer notice */}
                <div
                  style={{
                    marginTop: '24px',
                    backgroundColor: '#3d3423',
                    border: '1px solid #63502b',
                    color: '#e6cd99',
                    padding: '10px 16px',
                    fontSize: '12px',
                    borderRadius: '2px',
                  }}
                >
                  Drag fields from the INPUT panel to map workflow data to Zoho CRM fields
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: colors.bgInput,
                    border: '1px dashed #444',
                    borderRadius: '4px',
                  }}
                >
                  <p style={{ fontSize: '12px', color: '#666' }}>Additional settings coming soon</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '12px 16px',
              borderTop: '1px solid #333',
              backgroundColor: '#222',
            }}
          >
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: colors.zohoRed,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* OUTPUT Panel */}
        <div
          style={{
            flex: 1,
            minWidth: '350px',
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <N8NNodeIOPanel
            title="OUTPUT"
            data={displayOutput}
            isLoading={isExecuting}
            error={executionError}
            enableDrag={false}
          />
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default N8NZohoCRMConfig;
