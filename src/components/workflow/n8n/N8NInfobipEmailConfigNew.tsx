import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Play,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Mail,
  ArrowLeft,
  Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';

// Infobip Email Icon
const InfobipEmailIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#FF6B35"/>
    <path d="M4 8L12 13L20 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="4" y="6" width="16" height="12" rx="2" stroke="white" strokeWidth="2"/>
  </svg>
);

interface DroppedField {
  key: string;
  path: string;
  expression: string;
}

interface InfobipEmailConfig {
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  bodyType: 'text' | 'html';
  body: string;
  useCustomAccount: boolean;
  // Dropped fields for dynamic content
  toEmailField: DroppedField | null;
  subjectField: DroppedField | null;
  bodyFields: DroppedField[];
  pinnedData?: any;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}


interface N8NInfobipEmailConfigNewProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: InfobipEmailConfig;
  };
  onClose: () => void;
  onSave: (config: InfobipEmailConfig) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
  nodeSources?: NodeData[];
}

export const N8NInfobipEmailConfigNew: React.FC<N8NInfobipEmailConfigNewProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  previousNodeLabel,
  nodeSources,
}) => {
  const [config, setConfig] = useState<InfobipEmailConfig>(() => {
    console.log('Email Init - node.config:', node.config);
    return {
      fromEmail: node.config?.fromEmail || 'noreplay@airlane.space',
      fromName: node.config?.fromName || 'Agentauto',
      toEmail: node.config?.toEmail || '',
      subject: node.config?.subject || '',
      bodyType: node.config?.bodyType || 'text',
      body: node.config?.body || '',
      useCustomAccount: node.config?.useCustomAccount || false,
      toEmailField: node.config?.toEmailField || null,
      subjectField: node.config?.subjectField || null,
      bodyFields: node.config?.bodyFields || [],
    };
  });
  
  console.log('Email Render - inputData:', inputData, 'previousNodeLabel:', previousNodeLabel, 'config:', config);
  
  // Sync config when node.config changes
  React.useEffect(() => {
    if (node.config) {
      console.log('Email useEffect - syncing node.config:', node.config);
      setConfig({
        fromEmail: node.config.fromEmail || 'noreplay@airlane.space',
        fromName: node.config.fromName || 'Agentauto',
        toEmail: node.config.toEmail || '',
        subject: node.config.subject || '',
        bodyType: node.config.bodyType || 'text',
        body: node.config.body || '',
        useCustomAccount: node.config.useCustomAccount || false,
        toEmailField: node.config.toEmailField || null,
        subjectField: node.config.subjectField || null,
        bodyFields: node.config.bodyFields || [],
      });
      // Also update mode toggles
      setToEmailMode(node.config.toEmailField ? 'workflow' : 'fixed');
      setSubjectMode(node.config.subjectField ? 'workflow' : 'fixed');
      setBodyMode(node.config.bodyFields?.length > 0 ? 'workflow' : 'fixed');
    }
  }, [node.config]);
  
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  
  // Drag & Drop states
  const [isToEmailDragOver, setIsToEmailDragOver] = useState(false);
  const [isSubjectDragOver, setIsSubjectDragOver] = useState(false);
  const [isBodyDragOver, setIsBodyDragOver] = useState(false);
  
  // Mode toggles
  const [toEmailMode, setToEmailMode] = useState<'fixed' | 'workflow'>(node.config?.toEmailField ? 'workflow' : 'fixed');
  const [subjectMode, setSubjectMode] = useState<'fixed' | 'workflow'>(node.config?.subjectField ? 'workflow' : 'fixed');
  const [bodyMode, setBodyMode] = useState<'fixed' | 'workflow'>(node.config?.bodyFields?.length > 0 ? 'workflow' : 'fixed');

  // Pin data state
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);

  // Use pinned data as fallback when no live input data
  const effectiveInputData = inputData || pinnedData;

  // Handler for pinning data
  const handlePinData = (data: any) => {
    setPinnedData(data);
    toast.success('Data pinned! You can now test without re-running previous nodes.');
  };
  
  // Check if we have valid config
  const hasValidConfig = config.fromEmail && (config.toEmail || config.toEmailField) && (config.subject || config.subjectField);
  
  // Execute step - simulate sending email
  const executeStep = async () => {
    if (!hasValidConfig) return;
    
    setIsExecuting(true);
    setExecutionResult(null);
    
    try {
      // Get the data
      const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
      
      // Build email preview
      let toEmail = config.toEmail;
      let subject = config.subject;
      
      if (config.toEmailField && data) {
        const parts = config.toEmailField.path.split('.');
        let value: any = data;
        for (const part of parts) {
          value = value?.[part];
        }
        toEmail = value || 'N/A';
      }
      
      if (config.subjectField && data) {
        const parts = config.subjectField.path.split('.');
        let value: any = data;
        for (const part of parts) {
          value = value?.[part];
        }
        subject = value || 'N/A';
      }
      
      // Simulate execution result
      setExecutionResult({
        success: true,
        from: `${config.fromName} <${config.fromEmail}>`,
        to: toEmail,
        subject: subject,
        bodyType: config.bodyType,
        message: 'Email configuration validated. Ready to send.',
      });
      
    } catch (error: any) {
      setExecutionResult({ success: false, error: error.message });
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Prepare output data - prioritize loaded data from execution history
  const currentOutputData = outputData || executionResult || null;
  
  const modalContent = <div
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
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#FF6B35' }}
          >
            <div className="flex items-center gap-3">
              <InfobipEmailIcon size={24} />
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                Infobip Email
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={executeStep}
                disabled={!hasValidConfig || isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: hasValidConfig ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: hasValidConfig ? 'pointer' : 'not-allowed',
                }}
              >
                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Execute step
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
                  borderBottom: activeTab === tab ? '2px solid #FF6B35' : '2px solid transparent',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            <a
              href="https://www.infobip.com/docs/api"
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
                {/* Use Custom Account Checkbox */}
                <div 
                  className="flex items-center gap-3 p-3 rounded"
                  style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                >
                  <input
                    type="checkbox"
                    checked={config.useCustomAccount}
                    onChange={(e) => setConfig(prev => ({ ...prev, useCustomAccount: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="text-sm text-white">Folosește cont Infobip propriu</span>
                    <p className="text-xs text-gray-500">Bifează pentru a conecta propriul cont Infobip</p>
                  </div>
                </div>

                {!config.useCustomAccount && (
                  <div 
                    className="p-3 rounded text-xs"
                    style={{ backgroundColor: '#1a3d5c', border: '1px solid #2d5a8a', color: '#7db8e8' }}
                  >
                    ℹ️ Se va folosi contul Infobip Agentauto. Emailurile vor fi trimise de pe domeniile configurate în platforma Agentauto.
                  </div>
                )}

                {/* From Email */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    De la (From Email) *
                  </label>
                  <input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="noreply@domain.com"
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      color: '#fff',
                    }}
                  />
                </div>

                {/* From Name */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Nume expeditor
                  </label>
                  <input
                    type="text"
                    value={config.fromName}
                    onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Agentauto"
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      color: '#fff',
                    }}
                  />
                </div>

                {/* Connection Status */}
                {previousNodeLabel && (
                  <div 
                    className="flex items-center gap-2 p-3 rounded" 
                    style={{ backgroundColor: '#1a3d1a', border: '1px solid #2d5a2d' }}
                  >
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#4ade80' }} />
                    <span className="text-xs" style={{ color: '#4ade80' }}>
                      Conectat la: {previousNodeLabel}
                    </span>
                  </div>
                )}

                {/* To Email - with mode toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: '#888' }}>
                      Către (To Email) *
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setToEmailMode('fixed')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: toEmailMode === 'fixed' ? '#FF6B35' : '#333',
                          color: '#fff',
                        }}
                      >
                        Fix
                      </button>
                      <button
                        onClick={() => setToEmailMode('workflow')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: toEmailMode === 'workflow' ? '#FF6B35' : '#333',
                          color: '#fff',
                        }}
                      >
                        Din Workflow
                      </button>
                    </div>
                  </div>
                  
                  {toEmailMode === 'fixed' ? (
                    <input
                      type="email"
                      value={config.toEmail}
                      onChange={(e) => setConfig(prev => ({ ...prev, toEmail: e.target.value }))}
                      placeholder="destinatar@email.com"
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                  ) : (
                    <div 
                      className={`rounded-lg p-3 min-h-[50px] transition-all flex items-center ${
                        isToEmailDragOver 
                          ? 'bg-orange-500/20 border-orange-500 border-2 border-dashed' 
                          : 'bg-[#252525] border border-[#333] border-dashed'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsToEmailDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsToEmailDragOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsToEmailDragOver(false);
                        
                        try {
                          const jsonData = e.dataTransfer.getData('application/json');
                          if (jsonData) {
                            const field = JSON.parse(jsonData);
                            setConfig(prev => ({ ...prev, toEmailField: {
                              key: field.key,
                              path: field.path,
                              expression: field.expression,
                            }}));
                          }
                        } catch (err) {
                          console.error('Drop error:', err);
                        }
                      }}
                    >
                      {config.toEmailField ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-orange-400 font-mono">
                            📧 {config.toEmailField.expression}
                          </span>
                          <button
                            onClick={() => setConfig(prev => ({ ...prev, toEmailField: null }))}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Trage câmpul email din INPUT...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Subject - with mode toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: '#888' }}>
                      Subiect *
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSubjectMode('fixed')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: subjectMode === 'fixed' ? '#FF6B35' : '#333',
                          color: '#fff',
                        }}
                      >
                        Fix
                      </button>
                      <button
                        onClick={() => setSubjectMode('workflow')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: subjectMode === 'workflow' ? '#FF6B35' : '#333',
                          color: '#fff',
                        }}
                      >
                        Din Workflow
                      </button>
                    </div>
                  </div>
                  
                  {subjectMode === 'fixed' ? (
                    <input
                      type="text"
                      value={config.subject}
                      onChange={(e) => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Subiectul emailului"
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                  ) : (
                    <div 
                      className={`rounded-lg p-3 min-h-[50px] transition-all flex items-center ${
                        isSubjectDragOver 
                          ? 'bg-orange-500/20 border-orange-500 border-2 border-dashed' 
                          : 'bg-[#252525] border border-[#333] border-dashed'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsSubjectDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsSubjectDragOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsSubjectDragOver(false);
                        
                        try {
                          const jsonData = e.dataTransfer.getData('application/json');
                          if (jsonData) {
                            const field = JSON.parse(jsonData);
                            setConfig(prev => ({ ...prev, subjectField: {
                              key: field.key,
                              path: field.path,
                              expression: field.expression,
                            }}));
                          }
                        } catch (err) {
                          console.error('Drop error:', err);
                        }
                      }}
                    >
                      {config.subjectField ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-orange-400 font-mono">
                            📝 {config.subjectField.expression}
                          </span>
                          <button
                            onClick={() => setConfig(prev => ({ ...prev, subjectField: null }))}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Trage câmpul subiect din INPUT...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Body Type Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Tip conținut
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, bodyType: 'text' }))}
                      className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: config.bodyType === 'text' ? '#333' : '#252525',
                        color: config.bodyType === 'text' ? '#fff' : '#888',
                        border: '1px solid #333',
                      }}
                    >
                      Text simplu
                    </button>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, bodyType: 'html' }))}
                      className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: config.bodyType === 'html' ? '#FF6B35' : '#252525',
                        color: config.bodyType === 'html' ? '#fff' : '#888',
                        border: '1px solid #333',
                      }}
                    >
                      HTML
                    </button>
                  </div>
                </div>

                {/* Body Content - with mode toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: '#888' }}>
                      Conținut email *
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setBodyMode('fixed')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: bodyMode === 'fixed' ? '#FF6B35' : '#333',
                          color: '#fff',
                        }}
                      >
                        Fix
                      </button>
                      <button
                        onClick={() => setBodyMode('workflow')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: bodyMode === 'workflow' ? '#FF6B35' : '#333',
                          color: '#fff',
                        }}
                      >
                        Din Workflow
                      </button>
                    </div>
                  </div>
                  
                  {bodyMode === 'fixed' ? (
                    <textarea
                      value={config.body}
                      onChange={(e) => setConfig(prev => ({ ...prev, body: e.target.value }))}
                      placeholder={config.bodyType === 'html' ? '<!DOCTYPE html>...' : 'Conținutul emailului...'}
                      rows={6}
                      className="w-full px-3 py-2 rounded text-sm resize-none font-mono"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                  ) : (
                    <div 
                      className={`rounded-lg p-4 min-h-[120px] transition-all ${
                        isBodyDragOver 
                          ? 'bg-orange-500/20 border-orange-500 border-2 border-dashed' 
                          : 'bg-[#252525] border border-[#333] border-dashed'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBodyDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBodyDragOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsBodyDragOver(false);
                        
                        try {
                          const jsonData = e.dataTransfer.getData('application/json');
                          if (jsonData) {
                            const field = JSON.parse(jsonData);
                            // Add field if not already present
                            if (!config.bodyFields.find(f => f.path === field.path)) {
                              setConfig(prev => ({ ...prev, bodyFields: [...prev.bodyFields, {
                                key: field.key,
                                path: field.path,
                                expression: field.expression,
                              }]}));
                            }
                          }
                        } catch (err) {
                          console.error('Drop error:', err);
                        }
                      }}
                    >
                      {config.bodyFields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-4">
                          <div className="text-2xl mb-2">📧</div>
                          <p className="text-sm text-gray-400">
                            Trage câmpuri din INPUT pentru conținut email
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {config.bodyFields.map((field, idx) => (
                            <div 
                              key={field.path}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30"
                            >
                              <span className="text-xs text-orange-400 font-mono">
                                {field.expression}
                              </span>
                              <button
                                onClick={() => setConfig(prev => ({ ...prev, bodyFields: prev.bodyFields.filter((_, i) => i !== idx) }))}
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div 
                  className="rounded p-3 space-y-2"
                  style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" style={{ color: '#FF6B35' }} />
                    <span className="text-xs font-medium" style={{ color: '#FF6B35' }}>
                      Preview:
                    </span>
                  </div>
                  <div className="text-xs space-y-1" style={{ color: '#fff' }}>
                    <div>📤 From: {config.fromName} &lt;{config.fromEmail}&gt;</div>
                    <div>📥 To: {config.toEmailField ? <span className="text-orange-400">{config.toEmailField.expression}</span> : config.toEmail || '(not set)'}</div>
                    <div>📝 Subject: {config.subjectField ? <span className="text-orange-400">{config.subjectField.expression}</span> : config.subject || '(not set)'}</div>
                    <div>📄 Type: {config.bodyType.toUpperCase()}</div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'settings' && (
              <>
                <div 
                  className="rounded p-4"
                  style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                >
                  <p className="text-xs text-center" style={{ color: '#666' }}>
                    Setări adiționale vor fi disponibile curând...
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
              Anulează
            </button>
            <button
              onClick={() => {
                console.log('Email Save clicked - config:', config);
                onSave({ ...config, pinnedData });
              }}
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#FF6B35',
                color: '#fff',
              }}
            >
              Salvează
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
    </div>
  ;

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};
