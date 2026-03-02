import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, PlugZap, RefreshCw, Plus, Trash2, Loader2, Wand2, CheckCircle2, AlertCircle, Database, Beaker, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { N8NExpressionSelector } from './N8NExpressionSelector';
import { OdooIcon } from './BrandIcons';

interface OdooFieldValue {
  id: string;
  field: string;
  value: string;
  source?: 'static' | 'workflow';
  workflowField?: string;
}

interface OdooFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface OdooFieldMeta {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  help?: string | null;
}

interface OdooConfig {
  baseUrl: string;
  db: string;
  username: string;
  apiKey: string;
  model: string;
  operation: 'search_read' | 'read' | 'create' | 'update' | 'delete' | 'fields_get' | 'execute_kw';
  recordId?: string;
  recordIdSource?: 'manual' | 'workflow';
  recordIdWorkflowField?: string;
  fields: OdooFieldValue[];
  filters: OdooFilter[];
  combineFilters: 'AND' | 'OR';
  returnAll: boolean;
  limit: number;
  offset: number;
  methodName?: string;
  methodArgs?: string;
  methodKwargs?: string;
  saveConnection?: boolean;
}

interface N8NOdooConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: OdooConfig;
  };
  onClose: () => void;
  onSave: (config: OdooConfig) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
}

const DEFAULT_MODELS = [
  { value: 'crm.lead', label: 'crm.lead (Leads)' },
  { value: 'res.partner', label: 'res.partner (Contacts)' },
  { value: 'sale.order', label: 'sale.order (Sales Orders)' },
  { value: 'account.move', label: 'account.move (Invoices)' },
  { value: 'res.users', label: 'res.users (Users)' },
  { value: 'res.company', label: 'res.company (Company)' },
];

const OPERATIONS: Array<{ value: OdooConfig['operation']; label: string; description: string }> = [
  { value: 'search_read', label: 'Search Records', description: 'List records with domain filters (search_read)' },
  { value: 'read', label: 'Get Record', description: 'Read a record by ID' },
  { value: 'create', label: 'Create Record', description: 'Create a new record' },
  { value: 'update', label: 'Update Record', description: 'Update an existing record' },
  { value: 'delete', label: 'Delete Record', description: 'Delete a record' },
  { value: 'fields_get', label: 'Get Fields', description: 'Inspect model fields (fields_get)' },
  { value: 'execute_kw', label: 'Execute Method', description: 'Call a custom method via execute_kw' },
];

const FILTER_OPERATORS = [
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: 'Not Equals (!=)' },
  { value: 'ilike', label: 'Contains (ilike)' },
  { value: 'like', label: 'Starts With (like)' },
  { value: '>', label: 'Greater Than (>)' },
  { value: '<', label: 'Less Than (<)' },
  { value: 'in', label: 'In list' },
  { value: 'not in', label: 'Not in list' },
  { value: 'child_of', label: 'Child Of' },
];

export const N8NOdooConfig: React.FC<N8NOdooConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  previousNodeLabel,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [availableFields, setAvailableFields] = useState<OdooFieldMeta[]>([]);
  const [showExpressionSelector, setShowExpressionSelector] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldTarget, setActiveFieldTarget] = useState<'value' | 'recordId'>('value');

  const parsedDefaults = useMemo(() => {
    const label = node.label.toLowerCase();
    let model = 'crm.lead';
    let operation: OdooConfig['operation'] = 'search_read';

    if (label.includes('contact')) model = 'res.partner';
    if (label.includes('invoice')) model = 'account.move';
    if (label.includes('sale')) model = 'sale.order';

    if (label.includes('get') && label.includes('record')) operation = 'read';
    if (label.includes('create')) operation = 'create';
    if (label.includes('update')) operation = 'update';
    if (label.includes('delete')) operation = 'delete';
    if (label.includes('fields')) operation = 'fields_get';
    if (label.includes('execute')) operation = 'execute_kw';

    return { model, operation };
  }, [node.label]);

  const [config, setConfig] = useState<OdooConfig>({
    baseUrl: node.config?.baseUrl || '',
    db: node.config?.db || '',
    username: node.config?.username || '',
    apiKey: node.config?.apiKey || '',
    model: node.config?.model || parsedDefaults.model,
    operation: node.config?.operation || parsedDefaults.operation,
    recordId: node.config?.recordId || '',
    recordIdSource: node.config?.recordIdSource || 'manual',
    recordIdWorkflowField: node.config?.recordIdWorkflowField || 'id',
    fields: node.config?.fields || [],
    filters: node.config?.filters || [],
    combineFilters: node.config?.combineFilters || 'AND',
    returnAll: node.config?.returnAll ?? false,
    limit: node.config?.limit || 50,
    offset: node.config?.offset || 0,
    methodName: node.config?.methodName || '',
    methodArgs: node.config?.methodArgs || '',
    methodKwargs: node.config?.methodKwargs || '',
    saveConnection: node.config?.saveConnection ?? true,
  });

  useEffect(() => {
    if (!user) return;
    // quick probe to see if we already have a stored connection
    const checkExisting = async () => {
      try {
        setIsCheckingConnection(true);
        const { data, error } = await (supabase as any)
          .from('odoo_connections')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'connected')
          .maybeSingle();

        if (!error && data) {
          setIsConnected(true);
        }
      } catch (err) {
        console.log('Odoo connection check skipped:', err);
      } finally {
        setIsCheckingConnection(false);
      }
    };
    checkExisting();
  }, [user]);

  const handleTestConnection = async () => {
    if (!user) {
      toast({ title: 'Autentificare necesara', description: 'Conecteaza-te pentru a salva conexiunea Odoo.' });
      return;
    }

    if (!config.baseUrl || !config.db || !config.username || !config.apiKey) {
      toast({ title: 'Completeaza datele Odoo', description: 'URL, baza de date, username si API key sunt obligatorii.' });
      return;
    }

    try {
      setIsCheckingConnection(true);
      const response = await fetch(
        'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/odoo-auth-test',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            base_url: config.baseUrl,
            db: config.db,
            username: config.username,
            api_key: config.apiKey,
            save: config.saveConnection,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        toast({ title: 'Conexiune Odoo esuata', description: result.error || 'Verifica credentialele.' });
        setIsConnected(false);
        return;
      }

      setIsConnected(true);
      toast({ title: 'Conectat la Odoo', description: `Uid: ${result.uid}` });
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message || 'Nu am putut verifica conexiunea.' });
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleLoadFields = async () => {
    if (!config.model) {
      toast({ title: 'Model necesar', description: 'Alege modelul Odoo inainte de a incarca campurile.' });
      return;
    }
    if (!user) {
      toast({ title: 'Autentificare necesara', description: 'Conecteaza-te pentru a accesa campurile Odoo.' });
      return;
    }
    try {
      setIsLoadingFields(true);
      const response = await fetch(
        'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/odoo-fields-get',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            model: config.model,
            base_url: config.baseUrl || undefined,
            db: config.db || undefined,
            username: config.username || undefined,
            api_key: config.apiKey || undefined,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast({ title: 'Nu pot prelua campurile', description: result.error || 'Verifica modelul si conexiunea.' });
        return;
      }

      const fields: OdooFieldMeta[] = Object.entries(result.fields || {}).map(([name, meta]: any) => ({
        name,
        label: meta.string || name,
        type: meta.type || 'char',
        required: meta.required || false,
        help: meta.help || null,
      }));
      setAvailableFields(fields);
      toast({ title: 'Campuri incarcate', description: `${fields.length} campuri disponibile.` });
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message || 'Nu am putut incarca campurile.' });
    } finally {
      setIsLoadingFields(false);
    }
  };

  const addFieldRow = () => {
    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, { id: crypto.randomUUID(), field: '', value: '', source: 'static' }],
    }));
  };

  const updateFieldRow = (id: string, patch: Partial<OdooFieldValue>) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const removeFieldRow = (id: string) => {
    setConfig(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
  };

  const addFilterRow = () => {
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, { id: crypto.randomUUID(), field: '', operator: '=', value: '' }],
    }));
  };

  const updateFilterRow = (id: string, patch: Partial<OdooFilter>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const removeFilterRow = (id: string) => {
    setConfig(prev => ({ ...prev, filters: prev.filters.filter(f => f.id !== id) }));
  };

  const handleSave = () => {
    onSave(config);
  };

  const handleExpressionSelect = (expression: string, displayValue: string) => {
    if (activeFieldTarget === 'recordId') {
      setConfig(prev => ({ ...prev, recordIdWorkflowField: displayValue || expression }));
    } else if (activeFieldId) {
      updateFieldRow(activeFieldId, { workflowField: displayValue || expression, source: 'workflow' });
    }
    setShowExpressionSelector(false);
    setActiveFieldId(null);
  };

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
            width: '700px',
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            zIndex: 5,
          }}
        >
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#7C3AED' }}>
          <div className="flex items-center gap-3">
            <OdooIcon size={28} />
            <div>
              <div className="text-white font-semibold text-sm">Odoo</div>
              <div className="text-xs text-white/70">Integreaza orice model Odoo via XML-RPC</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex border-b border-white/5">
          <button
            className={`px-4 py-2 text-sm ${activeTab === 'parameters' ? 'text-white border-b-2 border-emerald-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('parameters')}
          >
            Parameters
          </button>
          <button
            className={`px-4 py-2 text-sm ${activeTab === 'settings' ? 'text-white border-b-2 border-emerald-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Connection */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlugZap className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-sm text-white font-semibold">Conexiune Odoo</div>
                  <div className="text-xs text-gray-400">Seteaza URL, DB, user si API key</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Connected</span>
                ) : (
                  <span className="text-xs text-amber-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Not connected</span>
                )}
                <button
                  onClick={handleTestConnection}
                  className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1"
                  disabled={isCheckingConnection}
                >
                  {isCheckingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Test
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Base URL</label>
                <input
                  className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="https://mycompany.odoo.com"
                  value={config.baseUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Database</label>
                <input
                  className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="database name"
                  value={config.db}
                  onChange={(e) => setConfig(prev => ({ ...prev, db: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Username / Login</label>
                <input
                  className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="user@domain.com"
                  value={config.username}
                  onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">API Key (sau parola)</label>
                <input
                  className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="api key"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={config.saveConnection}
                onChange={(e) => setConfig(prev => ({ ...prev, saveConnection: e.target.checked }))}
              />
              Salveaza conexiunea in cont
            </label>
          </div>

          {/* Parameters */}
          {activeTab === 'parameters' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Model</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      value={DEFAULT_MODELS.find(m => m.value === config.model) ? config.model : ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value || prev.model }))}
                    >
                      <option value="">Custom</option>
                      {DEFAULT_MODELS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <input
                      className="flex-1 bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      placeholder="ex: crm.lead sau x_custom_model"
                      value={config.model}
                      onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Operation</label>
                  <select
                    className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    value={config.operation}
                    onChange={(e) => setConfig(prev => ({ ...prev, operation: e.target.value as OdooConfig['operation'] }))}
                  >
                    {OPERATIONS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">{OPERATIONS.find(o => o.value === config.operation)?.description}</p>
                </div>
              </div>

              {/* Record ID */}
              {['read', 'update', 'delete'].includes(config.operation) && (
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400">Record ID</label>
                    {config.recordIdSource === 'manual' ? (
                      <input
                        className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        placeholder="ex: 123"
                        value={config.recordId}
                        onChange={(e) => setConfig(prev => ({ ...prev, recordId: e.target.value }))}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          placeholder="camp din workflow (ex: id, lead_id)"
                          value={config.recordIdWorkflowField}
                          onChange={(e) => setConfig(prev => ({ ...prev, recordIdWorkflowField: e.target.value }))}
                        />
                        <button
                          className="px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white flex items-center gap-1"
                          onClick={() => { setActiveFieldTarget('recordId'); setShowExpressionSelector(true); }}
                        >
                          <Wand2 className="w-4 h-4" /> Pick
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Source</label>
                    <select
                      className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      value={config.recordIdSource}
                      onChange={(e) => setConfig(prev => ({ ...prev, recordIdSource: e.target.value as 'manual' | 'workflow' }))}
                    >
                      <option value="manual">Manual</option>
                      <option value="workflow">From workflow</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Fields mapping */}
              {['create', 'update', 'execute_kw'].includes(config.operation) && (
                <div className="bg-[#151518] border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white font-semibold">Mapare campuri</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLoadFields}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white flex items-center gap-1"
                        disabled={isLoadingFields}
                      >
                        {isLoadingFields ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        Load fields
                      </button>
                      <button
                        onClick={addFieldRow}
                        className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add field
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {config.fields.length === 0 && (
                      <div className="text-xs text-gray-500">Adauga campurile pe care vrei sa le trimiti spre Odoo.</div>
                    )}
                    {config.fields.map(field => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-white/5 border border-white/10 rounded-lg p-2">
                        <div className="col-span-3">
                          <select
                            className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                            value={field.field}
                            onChange={(e) => updateFieldRow(field.id, { field: e.target.value })}
                          >
                            <option value="">-- camp --</option>
                            {availableFields.map(f => (
                              <option key={f.name} value={f.name}>{f.label} ({f.type})</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <select
                            className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                            value={field.source || 'static'}
                            onChange={(e) => updateFieldRow(field.id, { source: e.target.value as 'static' | 'workflow' })}
                          >
                            <option value="static">Static</option>
                            <option value="workflow">From workflow</option>
                          </select>
                        </div>
                        <div className="col-span-5">
                          {field.source === 'workflow' ? (
                            <div className="flex gap-2">
                              <input
                                className="flex-1 bg-[#1a1a1c] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                                placeholder="ex: analysis.Description"
                                value={field.workflowField || ''}
                                onChange={(e) => updateFieldRow(field.id, { workflowField: e.target.value })}
                              />
                              <button
                                className="px-2 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white flex items-center gap-1"
                                onClick={() => { setActiveFieldId(field.id); setActiveFieldTarget('value'); setShowExpressionSelector(true); }}
                              >
                                <Wand2 className="w-4 h-4" /> Pick
                              </button>
                            </div>
                          ) : (
                            <input
                              className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                              placeholder="valoare"
                              value={field.value}
                              onChange={(e) => updateFieldRow(field.id, { value: e.target.value })}
                            />
                          )}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button className="p-1 text-gray-400 hover:text-red-400" onClick={() => removeFieldRow(field.id)}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {config.operation === 'execute_kw' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400">Method name</label>
                        <input
                          className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          placeholder="ex: action_convert"
                          value={config.methodName}
                          onChange={(e) => setConfig(prev => ({ ...prev, methodName: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Args (JSON array)</label>
                          <input
                            className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                            placeholder='ex: ["param1", 2]'
                            value={config.methodArgs}
                            onChange={(e) => setConfig(prev => ({ ...prev, methodArgs: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Kwargs (JSON object)</label>
                          <input
                            className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                            placeholder='ex: {"context": {"lang": "ro_RO"}}'
                            value={config.methodKwargs}
                            onChange={(e) => setConfig(prev => ({ ...prev, methodKwargs: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filters for search */}
              {config.operation === 'search_read' && (
                <div className="bg-[#151518] border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white font-semibold">Filtre (domain)</div>
                    <div className="flex items-center gap-3">
                      <select
                        className="bg-[#1a1a1c] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                        value={config.combineFilters}
                        onChange={(e) => setConfig(prev => ({ ...prev, combineFilters: e.target.value as 'AND' | 'OR' }))}
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                      <button
                        onClick={addFilterRow}
                        className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add filter
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {config.filters.length === 0 && <div className="text-xs text-gray-500">Optional: defineste domeniul de cautare.</div>}
                    {config.filters.map(filter => (
                      <div key={filter.id} className="grid grid-cols-12 gap-2 items-center bg-white/5 border border-white/10 rounded-lg p-2">
                        <div className="col-span-4">
                          <input
                            className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                            placeholder="field"
                            value={filter.field}
                            onChange={(e) => updateFilterRow(filter.id, { field: e.target.value })}
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                            value={filter.operator}
                            onChange={(e) => updateFilterRow(filter.id, { operator: e.target.value })}
                          >
                            {FILTER_OPERATORS.map(op => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <input
                            className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                            placeholder="value"
                            value={filter.value}
                            onChange={(e) => updateFilterRow(filter.id, { value: e.target.value })}
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button className="p-1 text-gray-400 hover:text-red-400" onClick={() => removeFilterRow(filter.id)}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Limit</label>
                      <input
                        type="number"
                        className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        value={config.limit}
                        onChange={(e) => setConfig(prev => ({ ...prev, limit: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Offset</label>
                      <input
                        type="number"
                        className="w-full bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        value={config.offset}
                        onChange={(e) => setConfig(prev => ({ ...prev, offset: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={config.returnAll}
                          onChange={(e) => setConfig(prev => ({ ...prev, returnAll: e.target.checked }))}
                        />
                        Return all (ignora limit)
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Beaker className="w-4 h-4 text-emerald-400" />
                  Debug & tips
                </div>
                <ul className="mt-2 text-xs text-gray-400 space-y-1 list-disc list-inside">
                  <li>Folosește API Key generată in Odoo (My Profile → Account Security).</li>
                  <li>Model custom începe cu <code className="text-white">x_</code> (ex: x_custom_model).</li>
                  <li>Operators: =, !=, ilike, like, &gt;, &lt;, in, not in, child_of.</li>
                  <li>execute_kw acceptă args/kwargs în format JSON; metoda primește context automat.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

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
              className="px-4 py-2 rounded text-xs font-medium transition-colors hover:opacity-90 bg-emerald-600 text-white flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
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
              data={outputData}
            />
          </div>
        </div>
      </div>

      {showExpressionSelector && (
        <N8NExpressionSelector
          inputData={inputData}
          onSelect={handleExpressionSelect}
          onClose={() => setShowExpressionSelector(false)}
          currentValue={activeFieldTarget === 'recordId' ? config.recordIdWorkflowField : undefined}
        />
      )}
    </div>,
    document.body
  );
};

export default N8NOdooConfig;
