import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  ChevronDown,
  Play,
  Loader2,
  ExternalLink,
  Clock,
  ArrowLeft,
  Zap,
  Trash2,
  Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { N8NExpressionSelector } from './N8NExpressionSelector';
import { supabase } from '@/integrations/supabase/client';

// Kalina Icon
const KalinaIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="12" fill="url(#kalina-gradient)" />
    <path d="M8 7L12 12L8 17M12 7L16 12L12 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="kalina-gradient" x1="0" y1="0" x2="24" y2="24">
        <stop offset="0%" stopColor="#ff6b5a"/>
        <stop offset="100%" stopColor="#ff8a7a"/>
      </linearGradient>
    </defs>
  </svg>
);

interface DroppedField {
  key: string;
  path: string;
  expression: string;
}

interface KalinaCallConfig {
  agentId: string;
  phoneNumberId: string;
  phoneField: string;
  phoneFieldSource: 'manual' | 'workflow';
  nameField: string;
  nameFieldSource: 'manual' | 'workflow';
  callInterval: number;
  droppedFields: DroppedField[];
  pinnedData?: any;
}

interface Agent {
  id: string;
  name: string;
  agent_id: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  label?: string;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NKalinaCallConfigNewProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: KalinaCallConfig;
  };
  onClose: () => void;
  onSave: (config: KalinaCallConfig) => void;
  inputData?: any;
  outputData?: any;
  nodeSources?: NodeData[];
  previousNodeLabel?: string;
}

export const N8NKalinaCallConfigNew: React.FC<N8NKalinaCallConfigNewProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  nodeSources,
}) => {
  const [config, setConfig] = useState<KalinaCallConfig>(() => ({
    agentId: node.config?.agentId || '',
    phoneNumberId: node.config?.phoneNumberId || '',
    phoneField: node.config?.phoneField || '',
    phoneFieldSource: node.config?.phoneFieldSource || 'manual',
    nameField: node.config?.nameField || '',
    nameFieldSource: node.config?.nameFieldSource || 'manual',
    callInterval: node.config?.callInterval || 30,
    droppedFields: node.config?.droppedFields || [],
  }));

  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Data from Supabase
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Expression selector state
  const [showExpressionSelector, setShowExpressionSelector] = useState(false);
  const [activeFieldTarget, setActiveFieldTarget] = useState<'phoneField' | 'nameField' | 'infoField' | null>(null);

  // Pin data state
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);

  // Use pinned data as fallback when no live input data
  const effectiveInputData = inputData || pinnedData;

  // Handler for pinning data
  const handlePinData = (data: any) => {
    setPinnedData(data);
    toast.success('Data pinned! You can now test without re-running previous nodes.');
  };

  // Deep search for a field in nested objects
  const findFieldDeep = (obj: any, fieldName: string, maxDepth: number = 5): any => {
    if (!obj || maxDepth <= 0) return undefined;

    // Direct property
    if (obj[fieldName] !== undefined) return obj[fieldName];

    // Search in nested objects
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const found = findFieldDeep(obj[key], fieldName, maxDepth - 1);
        if (found !== undefined) return found;
      }
    }

    return undefined;
  };

  // Helper function to get value from inputData using path
  const getValueByPath = (path: string): any => {
    if (!path || !effectiveInputData) return undefined;

    // Start with the raw effectiveInputData (not pre-selecting [0])
    let value: any = effectiveInputData;

    // Parse path - handle both dot notation and array indices
    // e.g., "0.contact_phone" or "contact.price" or "name"
    const parts = path.split('.');

    for (const part of parts) {
      if (value === undefined || value === null) break;

      // Check if this part is a numeric index
      const numIndex = parseInt(part, 10);
      if (!isNaN(numIndex) && Array.isArray(value)) {
        value = value[numIndex];
      } else {
        // Regular property access
        value = value[part];
      }
    }

    // If not found, try deep search using the last part of path (field name)
    if (value === undefined || value === null) {
      const fieldName = parts[parts.length - 1];
      value = findFieldDeep(effectiveInputData, fieldName);
    }

    return value;
  };

  // Extract field path from expression like {{ $json.fieldName }}
  const extractFieldPath = (expression: string): string | null => {
    const match = expression.match(/\{\{\s*\$json\.([^\s}]+)\s*\}\}/);
    return match ? match[1] : null;
  };

  // Check if we have valid config
  const hasValidConfig = config.agentId && config.phoneNumberId && config.phoneField;

  // Fetch agents and phone numbers
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const { data: agentsData, error: agentsError } = await supabase
          .from('kalina_agents')
          .select('id, name, agent_id')
          .order('name');

        if (agentsError) throw agentsError;
        setAgents(agentsData || []);

        const { data: phonesData, error: phonesError } = await supabase
          .from('phone_numbers')
          .select('id, phone_number, label')
          .order('phone_number');

        if (phonesError) throw phonesError;
        setPhoneNumbers(phonesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Handle expression selection
  const handleExpressionSelect = (expression: string, displayValue: string) => {
    if (activeFieldTarget === 'phoneField') {
      setConfig(prev => ({ ...prev, phoneField: expression }));
    } else if (activeFieldTarget === 'nameField') {
      setConfig(prev => ({ ...prev, nameField: expression }));
    } else if (activeFieldTarget === 'infoField') {
      // Add to droppedFields
      const fieldPath = extractFieldPath(expression);
      if (fieldPath && !config.droppedFields.find(f => f.path === fieldPath)) {
        setConfig(prev => ({
          ...prev,
          droppedFields: [...prev.droppedFields, {
            key: fieldPath.split('.').pop() || fieldPath,
            path: fieldPath,
            expression: expression,
          }]
        }));
      }
    }
    setShowExpressionSelector(false);
    setActiveFieldTarget(null);
  };

  // Execute step
  const executeStep = async () => {
    if (!hasValidConfig) return;

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
      const infoLines: string[] = [];

      if (data && config.droppedFields.length > 0) {
        config.droppedFields.forEach(field => {
          const parts = field.path.split('.');
          let value: any = data;
          for (const part of parts) {
            value = value?.[part];
          }
          const displayValue = value !== undefined ? String(value) : 'N/A';
          infoLines.push(`${field.key}: ${displayValue}`);
        });
      }

      const selectedAgent = agents.find(a => a.agent_id === config.agentId);
      const selectedPhone = phoneNumbers.find(p => p.id === config.phoneNumberId);

      // Evaluate phone field
      let evaluatedPhone = config.phoneField;
      if (config.phoneFieldSource === 'workflow') {
        const fieldPath = extractFieldPath(config.phoneField);
        if (fieldPath && data) {
          evaluatedPhone = getValueByPath(fieldPath) || config.phoneField;
        }
      }

      // Evaluate name field
      let evaluatedName = config.nameField;
      if (config.nameFieldSource === 'workflow') {
        const fieldPath = extractFieldPath(config.nameField);
        if (fieldPath && data) {
          evaluatedName = getValueByPath(fieldPath) || config.nameField;
        }
      }

      setExecutionResult({
        success: true,
        agent: selectedAgent?.name || 'Unknown',
        phoneNumber: selectedPhone?.phone_number || 'Unknown',
        phoneField: evaluatedPhone,
        nameField: evaluatedName,
        infoFields: infoLines,
        callInterval: config.callInterval,
        message: 'Configuration validated. Ready to make calls.',
      });
    } catch (error: any) {
      setExecutionResult({ success: false, error: error.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const currentOutputData = outputData || executionResult || null;

  const modalContent = (
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
      {/* Back to canvas button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      {/* Main layout */}
      <div
        className="flex items-stretch"
        style={{
          height: '85vh',
          maxWidth: '98vw',
          width: '95%',
        }}
      >
        {/* INPUT Panel */}
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
              data={effectiveInputData}
              enableDrag={true}
              nodeSources={nodeSources}
              onPinData={handlePinData}
              isPinned={!!pinnedData}
            />
          </div>
        </div>

        {/* Main Config Panel */}
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
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333' }}
          >
            <div className="flex items-center gap-3">
              <KalinaIcon size={24} />
              <span style={{ color: '#d0d0d0', fontSize: '14px', fontWeight: 600 }}>
                Kalina Call
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={executeStep}
                disabled={!hasValidConfig || isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: hasValidConfig ? '#3b82f6' : '#333',
                  color: hasValidConfig ? '#fff' : '#666',
                  cursor: hasValidConfig ? 'pointer' : 'not-allowed',
                }}
              >
                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Execute
              </button>
              <button onClick={onClose} className="p-1 hover:bg-[#333] rounded transition-colors">
                <X className="w-4 h-4" style={{ color: '#888' }} />
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
                  borderBottom: activeTab === tab ? '2px solid #60a5fa' : '2px solid transparent',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            <a
              href="https://agentauto.app/docs"
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
                {/* Agent Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Agent
                  </label>
                  <div className="relative">
                    <select
                      value={config.agentId}
                      onChange={(e) => setConfig(prev => ({ ...prev, agentId: e.target.value }))}
                      disabled={loadingData}
                      className="w-full px-3 py-2 rounded text-sm appearance-none cursor-pointer"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    >
                      <option value="">Select an agent...</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.agent_id}>{agent.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#888' }} />
                  </div>
                  <p className="text-xs" style={{ color: '#666' }}>
                    The AI agent that will handle the calls
                  </p>
                </div>

                {/* Phone Number Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Phone Number
                  </label>
                  <div className="relative">
                    <select
                      value={config.phoneNumberId}
                      onChange={(e) => setConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                      disabled={loadingData}
                      className="w-full px-3 py-2 rounded text-sm appearance-none cursor-pointer"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    >
                      <option value="">Select a phone number...</option>
                      {phoneNumbers.map(phone => (
                        <option key={phone.id} value={phone.id}>
                          {phone.label ? `${phone.label} (${phone.phone_number})` : phone.phone_number}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#888' }} />
                  </div>
                  <p className="text-xs" style={{ color: '#666' }}>
                    The phone number to call from
                  </p>
                </div>

                {/* Phone Field - with drag & drop support */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#fff' }}>
                    Phone Field <span className="text-red-400">*</span>
                  </label>

                  {/* Drop zone for phone field */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#4ade80';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = '#333';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#333';
                      try {
                        const data = JSON.parse(e.dataTransfer.getData('application/json'));
                        if (data.path) {
                          const expression = `{{ $json.${data.path} }}`;
                          setConfig(prev => ({
                            ...prev,
                            phoneField: expression,
                            phoneFieldSource: 'workflow'
                          }));
                        }
                      } catch (err) {
                        console.error('Drop error:', err);
                      }
                    }}
                    onClick={() => {
                      if (config.phoneFieldSource === 'workflow') {
                        setActiveFieldTarget('phoneField');
                        setShowExpressionSelector(true);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-3 rounded cursor-pointer transition-all"
                    style={{
                      backgroundColor: '#252525',
                      border: '2px dashed #333',
                      minHeight: '48px',
                    }}
                  >
                    {config.phoneField ? (
                      <>
                        <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-mono text-green-400 block truncate">
                            {config.phoneField}
                          </span>
                          {effectiveInputData && (
                            <span className="text-xs text-gray-400 block mt-0.5">
                              = {(() => {
                                const path = extractFieldPath(config.phoneField);
                                const value = path ? getValueByPath(path) : undefined;
                                return value !== undefined ? String(value) : '(no value)';
                              })()}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfig(prev => ({ ...prev, phoneField: '', phoneFieldSource: 'manual' }));
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">
                        🎯 Drag a field here or click to select
                      </span>
                    )}
                  </div>

                  <p className="text-xs" style={{ color: '#666' }}>
                    Drag & drop phone field from INPUT panel
                  </p>
                </div>

                {/* Name Field - with drag & drop support */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#fff' }}>
                    Name Field
                  </label>

                  {/* Drop zone for name field */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#4ade80';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = '#333';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#333';
                      try {
                        const data = JSON.parse(e.dataTransfer.getData('application/json'));
                        if (data.path) {
                          const expression = `{{ $json.${data.path} }}`;
                          setConfig(prev => ({
                            ...prev,
                            nameField: expression,
                            nameFieldSource: 'workflow'
                          }));
                        }
                      } catch (err) {
                        console.error('Drop error:', err);
                      }
                    }}
                    onClick={() => {
                      if (config.nameFieldSource === 'workflow') {
                        setActiveFieldTarget('nameField');
                        setShowExpressionSelector(true);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-3 rounded cursor-pointer transition-all"
                    style={{
                      backgroundColor: '#252525',
                      border: '2px dashed #333',
                      minHeight: '48px',
                    }}
                  >
                    {config.nameField ? (
                      <>
                        <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-mono text-green-400 block truncate">
                            {config.nameField}
                          </span>
                          {effectiveInputData && (
                            <span className="text-xs text-gray-400 block mt-0.5">
                              = {(() => {
                                const path = extractFieldPath(config.nameField);
                                const value = path ? getValueByPath(path) : undefined;
                                return value !== undefined ? String(value) : '(no value)';
                              })()}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfig(prev => ({ ...prev, nameField: '', nameFieldSource: 'manual' }));
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">
                        🎯 Drag a field here or click to select
                      </span>
                    )}
                  </div>

                  <p className="text-xs" style={{ color: '#666' }}>
                    Drag & drop name field from INPUT panel
                  </p>
                </div>

                {/* Additional Fields - Info for Agent */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: '#fff' }}>
                      Fields
                    </label>
                    <button
                      onClick={() => {
                        setActiveFieldTarget('infoField');
                        setShowExpressionSelector(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#333] text-gray-300 hover:text-white transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      Add Field
                    </button>
                  </div>

                  <p className="text-xs" style={{ color: '#666' }}>
                    Câmpurile adăugate vor fi trimise agentului ca variabila {'{{info}}'}
                  </p>

                  {/* List of added fields */}
                  {config.droppedFields.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {config.droppedFields.map((field, idx) => {
                        const fieldValue = getValueByPath(field.path);
                        return (
                          <div
                            key={field.path}
                            className="flex items-center justify-between px-3 py-2 rounded-lg"
                            style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                          >
                            <div className="flex flex-col gap-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <Zap className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-green-400 font-mono">
                                  {field.expression}
                                </span>
                              </div>
                              {fieldValue !== undefined && (
                                <span className="text-[10px] text-gray-400 ml-5">
                                  = {String(fieldValue).substring(0, 50)}{String(fieldValue).length > 50 ? '...' : ''}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setConfig(prev => ({
                                ...prev,
                                droppedFields: prev.droppedFields.filter((_, i) => i !== idx)
                              }))}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Preview what will be sent */}
                  {config.droppedFields.length > 0 && (
                    <div
                      className="rounded p-3 mt-3"
                      style={{ backgroundColor: '#0d0d0d', border: '1px solid #333' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-400">
                          Se va trimite la agent ca {'{{info}}'}:
                        </span>
                      </div>
                      <div className="text-xs font-mono p-2 rounded" style={{ backgroundColor: '#161616', color: '#4ade80' }}>
                        {config.droppedFields.map(field => {
                          const fieldValue = getValueByPath(field.path);
                          return (
                            <div key={field.path}>
                              {field.key}: {fieldValue !== undefined ? String(fieldValue) : '<value>'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* No input data message */}
                {!effectiveInputData && (
                  <div
                    className="rounded p-3 text-center"
                    style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                  >
                    <p className="text-xs" style={{ color: '#888' }}>
                      No input data available. Run the workflow to see available fields.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'settings' && (
              <>
                {/* Call Interval */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Call Interval (seconds)
                  </label>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4" style={{ color: '#ff6b5a' }} />
                    <input
                      type="number"
                      value={config.callInterval}
                      onChange={(e) => setConfig(prev => ({ ...prev, callInterval: parseInt(e.target.value) || 30 }))}
                      min={5}
                      max={300}
                      className="flex-1 px-3 py-2 rounded text-sm"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: '#666' }}>
                    Time to wait between calls (5-300 seconds)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex justify-end gap-2 px-4 py-3"
            style={{ borderTop: '1px solid #333', backgroundColor: '#222' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm transition-colors"
              style={{
                backgroundColor: '#333',
                color: '#fff',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({ ...config, pinnedData })}
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                background: 'linear-gradient(135deg, #ff6b5a 0%, #ff8a7a 100%)',
                color: '#fff',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* OUTPUT Panel */}
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
      {showExpressionSelector && effectiveInputData && (
        <N8NExpressionSelector
          inputData={effectiveInputData}
          onSelect={handleExpressionSelect}
          onClose={() => {
            setShowExpressionSelector(false);
            setActiveFieldTarget(null);
          }}
          currentValue={
            activeFieldTarget === 'phoneField' ? config.phoneField :
            activeFieldTarget === 'nameField' ? config.nameField : undefined
          }
        />
      )}
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
