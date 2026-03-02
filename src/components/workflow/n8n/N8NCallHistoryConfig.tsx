import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronDown,
  Phone,
  Filter,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  Volume2,
  FileText,
  Zap,
  Database,
  Activity,
  Users,
  DollarSign,
  MessageSquare,
  Bot,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';

interface CallHistoryConfig {
  mode: 'trigger' | 'action'; // NEW: Trigger mode or Action mode
  filterType: 'all' | 'conditions';
  // Condiții pentru filtrare
  conditions: {
    // Status
    statusFilter: 'any' | 'success' | 'failed' | 'test' | 'test_failed';
    // Scor AI
    scoreEnabled: boolean;
    scoreOperator: 'greater' | 'less' | 'equal' | 'between';
    scoreValue: number;
    scoreValueMax?: number;
    // Durată
    durationEnabled: boolean;
    durationOperator: 'greater' | 'less' | 'equal' | 'between';
    durationValue: number; // în secunde
    durationValueMax?: number;
    // Replici
    repliesEnabled: boolean;
    repliesOperator: 'greater' | 'less' | 'equal';
    repliesValue: number;
    // Agent
    agentFilter: string;
  };
  // Ce date să trimită mai departe
  outputData: {
    includeTranscription: boolean;
    includeAudio: boolean;
    includeConclusion: boolean;
    includeCallDetails: boolean;
    includePhoneNumber: boolean;
    includeAgentInfo: boolean;
    includeCost: boolean;
    includeScore: boolean;
    includeDuration: boolean;
    includeSummary: boolean;
  };
  // Limitare și output
  limit: number;
  returnAll: boolean;
}

interface N8NCallHistoryConfigProps {
  isOpen: boolean;
  onClose: () => void;
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: CallHistoryConfig;
  } | null;
  onUpdateConfig?: (nodeId: string, config: CallHistoryConfig) => void;
  inputData?: any;
  outputData?: any;
}

const defaultConfig: CallHistoryConfig = {
  mode: 'trigger', // Default to trigger mode
  filterType: 'conditions',
  conditions: {
    statusFilter: 'any',
    scoreEnabled: false,
    scoreOperator: 'greater',
    scoreValue: 80,
    durationEnabled: false,
    durationOperator: 'greater',
    durationValue: 60, // 1 minut
    repliesEnabled: false,
    repliesOperator: 'greater',
    repliesValue: 5,
    agentFilter: 'any',
  },
  outputData: {
    includeTranscription: true,
    includeAudio: true,
    includeConclusion: true,
    includeCallDetails: true,
    includePhoneNumber: true,
    includeAgentInfo: true,
    includeCost: true,
    includeScore: true,
    includeDuration: true,
    includeSummary: true,
  },
  limit: 10,
  returnAll: false,
};

const statusOptions = [
  { value: 'any', label: 'Oricare', color: '#888' },
  { value: 'success', label: 'Success', color: '#22c55e' },
  { value: 'failed', label: 'Failed', color: '#ef4444' },
  { value: 'test', label: 'Test', color: '#f59e0b' },
  { value: 'test_failed', label: 'Test Failed', color: '#f97316' },
];

const operatorOptions = [
  { value: 'greater', label: 'Mai mare decât' },
  { value: 'less', label: 'Mai mic decât' },
  { value: 'equal', label: 'Egal cu' },
  { value: 'between', label: 'Între' },
];

export const N8NCallHistoryConfig: React.FC<N8NCallHistoryConfigProps> = ({
  isOpen,
  onClose,
  node,
  onUpdateConfig,
  inputData,
  outputData,
}) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<CallHistoryConfig>(defaultConfig);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; agent_id: string }>>([]);
  const [triggerStats, setTriggerStats] = useState<{ total: number; lastTriggered: string | null }>({ total: 0, lastTriggered: null });

  // Load user's agents
  useEffect(() => {
    const loadAgents = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('kalina_agents')
        .select('id, name, agent_id, elevenlabs_agent_id')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (data) {
        setAgents(data.map(a => ({ id: a.elevenlabs_agent_id || a.agent_id, name: a.name, agent_id: a.agent_id })));
      }
    };
    loadAgents();
  }, [user]);

  useEffect(() => {
    if (node?.config) {
      setConfig({ ...defaultConfig, ...node.config });
    } else {
      setConfig(defaultConfig);
    }
  }, [node]);

  useEffect(() => {
    const handleClickOutside = () => openDropdown && setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const updateConfig = (updates: Partial<CallHistoryConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
  };

  const updateConditions = (updates: Partial<CallHistoryConfig['conditions']>) => {
    updateConfig({ conditions: { ...config.conditions, ...updates } });
  };

  const updateOutputData = (updates: Partial<CallHistoryConfig['outputData']>) => {
    updateConfig({ outputData: { ...config.outputData, ...updates } });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !node) return null;

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
        style={{ backgroundColor: config.mode === 'trigger' ? '#7c3aed' : '#ff6b5a' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {config.mode === 'trigger' ? (
              <Zap style={{ width: '18px', height: '18px', color: '#fff' }} />
            ) : (
              <Database style={{ width: '18px', height: '18px', color: '#fff' }} />
            )}
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
              Call History {config.mode === 'trigger' ? 'Trigger' : 'Node'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
              {config.mode === 'trigger' ? 'Se activează automat la apeluri noi' : 'Obține istoricul apelurilor'}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Mode Toggle */}
      <div
        className="px-4 py-3"
        style={{ backgroundColor: '#252525', borderBottom: '1px solid #333' }}
      >
        <div className="flex items-center gap-2 p-1 rounded-lg" style={{ backgroundColor: '#1e1e1e' }}>
          <button
            onClick={() => updateConfig({ mode: 'trigger' })}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
              config.mode === 'trigger' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Trigger Mode</span>
          </button>
          <button
            onClick={() => updateConfig({ mode: 'action' })}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
              config.mode === 'action' ? 'bg-[#ff6b5a] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">Action Mode</span>
          </button>
        </div>
        
        {config.mode === 'trigger' && (
          <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: '#2a1f4e', border: '1px solid #7c3aed40' }}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-violet-300">
                Când activezi workflow-ul, acest trigger va monitoriza toate conversațiile noi și va executa workflow-ul automat când filtrele sunt îndeplinite.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: '55vh' }}
      >
        {/* Agent Filter */}
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: '#252525', border: '1px solid #333' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Bot style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
              Filtru Agent
            </span>
          </div>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(openDropdown === 'agent' ? null : 'agent');
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg"
              style={{ backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff', fontSize: '13px' }}
            >
              <span>
                {config.conditions.agentFilter === 'any' 
                  ? '🤖 Orice agent' 
                  : agents.find(a => a.id === config.conditions.agentFilter)?.name || config.conditions.agentFilter}
              </span>
              <ChevronDown style={{ width: '14px', height: '14px', color: '#888' }} />
            </button>
            
            {openDropdown === 'agent' && (
              <div 
                className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10 max-h-48 overflow-y-auto"
                style={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateConditions({ agentFilter: 'any' });
                    setOpenDropdown(null);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#383838] flex items-center gap-2"
                  style={{ color: '#fff', fontSize: '13px' }}
                >
                  🤖 Orice agent
                </button>
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateConditions({ agentFilter: agent.id });
                      setOpenDropdown(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#383838] flex items-center gap-2"
                    style={{ color: '#fff', fontSize: '13px' }}
                  >
                    <Bot className="w-3 h-3 text-violet-400" />
                    {agent.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter Section */}
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: '#252525', border: '1px solid #333' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter style={{ width: '16px', height: '16px', color: '#ff6b5a' }} />
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
              Condiții de filtrare
            </span>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="block mb-2" style={{ color: '#aaa', fontSize: '12px' }}>
              Status apel
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === 'status' ? null : 'status');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff', fontSize: '13px' }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusOptions.find(s => s.value === config.conditions.statusFilter)?.color }}
                  />
                  {statusOptions.find(s => s.value === config.conditions.statusFilter)?.label}
                </div>
                <ChevronDown style={{ width: '14px', height: '14px', color: '#888' }} />
              </button>
              
              {openDropdown === 'status' && (
                <div 
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10"
                  style={{ backgroundColor: '#2d2d2d', border: '1px solid #444' }}
                >
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConditions({ statusFilter: option.value as any });
                        setOpenDropdown(null);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#383838] flex items-center gap-2"
                      style={{ color: '#fff', fontSize: '13px' }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }} />
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Duration Filter */}
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#2a2a2a' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                <span style={{ color: '#fff', fontSize: '13px' }}>Durată apel</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.conditions.durationEnabled}
                  onChange={(e) => updateConditions({ durationEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#444] peer-checked:bg-[#ff6b5a] rounded-full transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
              </label>
            </div>
            
            {config.conditions.durationEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={config.conditions.durationOperator}
                    onChange={(e) => updateConditions({ durationOperator: e.target.value as any })}
                    className="px-2 py-1.5 rounded bg-[#333] text-white text-xs border border-[#444] outline-none"
                  >
                    {operatorOptions.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={config.conditions.durationValue}
                    onChange={(e) => updateConditions({ durationValue: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2 py-1.5 rounded bg-[#333] text-white text-xs border border-[#444] outline-none"
                  />
                  <span style={{ color: '#888', fontSize: '12px' }}>secunde</span>
                </div>
                <p style={{ color: '#666', fontSize: '11px' }}>
                  💡 60s = 1 minut | 240s = 4 minute
                </p>
              </div>
            )}
          </div>

          {/* AI Score Filter */}
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#2a2a2a' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
                <span style={{ color: '#fff', fontSize: '13px' }}>Scor AI</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.conditions.scoreEnabled}
                  onChange={(e) => updateConditions({ scoreEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#444] peer-checked:bg-[#ff6b5a] rounded-full transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
              </label>
            </div>
            
            {config.conditions.scoreEnabled && (
              <div className="flex items-center gap-2">
                <select
                  value={config.conditions.scoreOperator}
                  onChange={(e) => updateConditions({ scoreOperator: e.target.value as any })}
                  className="px-2 py-1.5 rounded bg-[#333] text-white text-xs border border-[#444] outline-none"
                >
                  {operatorOptions.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.conditions.scoreValue}
                  onChange={(e) => updateConditions({ scoreValue: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1.5 rounded bg-[#333] text-white text-xs border border-[#444] outline-none"
                />
                {config.conditions.scoreOperator === 'between' && (
                  <>
                    <span style={{ color: '#888', fontSize: '12px' }}>și</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config.conditions.scoreValueMax || 100}
                      onChange={(e) => updateConditions({ scoreValueMax: parseInt(e.target.value) || 100 })}
                      className="w-16 px-2 py-1.5 rounded bg-[#333] text-white text-xs border border-[#444] outline-none"
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Replies Filter */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#2a2a2a' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare style={{ width: '14px', height: '14px', color: '#22c55e' }} />
                <span style={{ color: '#fff', fontSize: '13px' }}>Număr replici</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.conditions.repliesEnabled}
                  onChange={(e) => updateConditions({ repliesEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#444] peer-checked:bg-[#ff6b5a] rounded-full transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
              </label>
            </div>
            
            {config.conditions.repliesEnabled && (
              <div className="flex items-center gap-2">
                <select
                  value={config.conditions.repliesOperator}
                  onChange={(e) => updateConditions({ repliesOperator: e.target.value as any })}
                  className="px-2 py-1.5 rounded bg-[#333] text-white text-xs border border-[#444] outline-none"
                >
                  {operatorOptions.slice(0, 3).map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={config.conditions.repliesValue}
                  onChange={(e) => updateConditions({ repliesValue: parseInt(e.target.value) || 0 })}
                  className="w-16 px-2 py-1.5 rounded bg-[#333] text-white text-xs border border-[#444] outline-none"
                />
                <span style={{ color: '#888', fontSize: '12px' }}>replici</span>
              </div>
            )}
          </div>
        </div>

        {/* Output Data Section */}
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: '#252525', border: '1px solid #333' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Volume2 style={{ width: '16px', height: '16px', color: '#22c55e' }} />
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
              Date de trimis
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'includeCallDetails', label: 'Detalii apel', icon: Phone, color: '#3b82f6' },
              { key: 'includePhoneNumber', label: 'Număr telefon', icon: Phone, color: '#8b5cf6' },
              { key: 'includeAgentInfo', label: 'Info agent', icon: Bot, color: '#f59e0b' },
              { key: 'includeDuration', label: 'Durată', icon: Clock, color: '#22c55e' },
              { key: 'includeCost', label: 'Cost apel', icon: DollarSign, color: '#ef4444' },
              { key: 'includeTranscription', label: 'Transcriere', icon: FileText, color: '#8b5cf6' },
              { key: 'includeAudio', label: 'Link audio', icon: Volume2, color: '#3b82f6' },
              { key: 'includeConclusion', label: 'Concluzie AI', icon: Star, color: '#f59e0b' },
              { key: 'includeScore', label: 'Scor AI', icon: Activity, color: '#22c55e' },
              { key: 'includeSummary', label: 'Rezumat', icon: MessageSquare, color: '#ec4899' },
            ].map(item => (
              <label 
                key={item.key}
                className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-[#2a2a2a] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={config.outputData[item.key as keyof typeof config.outputData]}
                  onChange={(e) => updateOutputData({ [item.key]: e.target.checked })}
                  className="w-4 h-4 rounded border-[#444] bg-[#333] text-[#ff6b5a] focus:ring-[#ff6b5a]"
                />
                <item.icon style={{ width: '12px', height: '12px', color: item.color }} />
                <span style={{ color: '#ccc', fontSize: '12px' }}>{item.label}</span>
              </label>
            ))}
          </div>
          
          {/* Select All / Deselect All */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => updateOutputData({
                includeTranscription: true,
                includeAudio: true,
                includeConclusion: true,
                includeCallDetails: true,
                includePhoneNumber: true,
                includeAgentInfo: true,
                includeCost: true,
                includeScore: true,
                includeDuration: true,
                includeSummary: true,
              })}
              className="text-xs px-2 py-1 rounded bg-[#333] text-gray-300 hover:bg-[#444]"
            >
              Selectează tot
            </button>
            <button
              onClick={() => updateOutputData({
                includeTranscription: false,
                includeAudio: false,
                includeConclusion: false,
                includeCallDetails: false,
                includePhoneNumber: false,
                includeAgentInfo: false,
                includeCost: false,
                includeScore: false,
                includeDuration: false,
                includeSummary: false,
              })}
              className="text-xs px-2 py-1 rounded bg-[#333] text-gray-300 hover:bg-[#444]"
            >
              Deselectează tot
            </button>
          </div>
        </div>

        {/* Action Mode specific - Limit */}
        {config.mode === 'action' && (
          <div 
            className="rounded-lg p-4"
            style={{ backgroundColor: '#252525', border: '1px solid #333' }}
          >
            <label className="block mb-2" style={{ color: '#aaa', fontSize: '13px' }}>
              Limită rezultate
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.limit}
              onChange={(e) => updateConfig({ limit: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2.5 rounded-lg outline-none"
              style={{ backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff', fontSize: '13px' }}
            />
            
            <div className="flex items-center justify-between mt-3">
              <span style={{ color: '#ccc', fontSize: '12px' }}>Returnează toate apelurile</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.returnAll}
                  onChange={(e) => updateConfig({ returnAll: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#444] peer-checked:bg-[#ff6b5a] rounded-full transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
              </label>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div 
          className="rounded-lg p-3"
          style={{ backgroundColor: config.mode === 'trigger' ? '#2a1f4e' : '#2a3441', border: `1px solid ${config.mode === 'trigger' ? '#7c3aed40' : '#3a4a5a'}` }}
        >
          <p style={{ color: config.mode === 'trigger' ? '#c4b5fd' : '#8ab4f8', fontSize: '12px', lineHeight: 1.5 }}>
            {config.mode === 'trigger' ? (
              <>
                <strong>🔔 Mod Trigger:</strong><br />
                1. Configurează filtrele (agent, durată, scor)<br />
                2. Selectează ce date să trimită<br />
                3. Conectează la Telegram sau alt nod<br />
                4. Activează workflow-ul<br />
                5. Primești automat notificări când apar apeluri noi!
              </>
            ) : (
              <>
                <strong>📊 Mod Action:</strong><br />
                1. Activează filtrele dorite (Scor AI {'>'} 80, Durată {'>'} 4 min)<br />
                2. Selectează datele de trimis<br />
                3. Conectează la Telegram pentru notificări<br />
                4. Execută workflow pentru a procesa apelurile existente
              </>
            )}
          </p>
        </div>
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
          onClick={() => {
            if (onUpdateConfig && node) {
              onUpdateConfig(node.id, config);
            }
            onClose();
          }}
          className="px-4 py-2 rounded text-xs font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: config.mode === 'trigger' ? '#7c3aed' : '#ff6b5a', color: '#fff' }}
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
              data={outputData}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
