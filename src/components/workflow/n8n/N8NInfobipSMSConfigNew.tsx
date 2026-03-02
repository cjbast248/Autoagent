import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Play,
  Loader2,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  ArrowLeft,
  Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';

// Infobip SMS Icon
const InfobipSMSIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#00B5AD"/>
    <path d="M7 8H17M7 12H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5 6C5 4.89543 5.89543 4 7 4H17C18.1046 4 19 4.89543 19 6V14C19 15.1046 18.1046 16 17 16H9L5 20V6Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

interface DroppedField {
  key: string;
  path: string;
  expression: string;
}

interface InfobipSMSConfig {
  from: string;
  toNumber: string;
  message: string;
  useCustomAccount: boolean;
  // Dropped fields for dynamic content
  toNumberField: DroppedField | null;
  messageFields: DroppedField[];
  pinnedData?: any;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}


interface N8NInfobipSMSConfigNewProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: InfobipSMSConfig;
  };
  onClose: () => void;
  onSave: (config: InfobipSMSConfig) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
  nodeSources?: NodeData[];
}

export const N8NInfobipSMSConfigNew: React.FC<N8NInfobipSMSConfigNewProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  previousNodeLabel,
  nodeSources,
}) => {
  const [config, setConfig] = useState<InfobipSMSConfig>(() => {
    console.log('SMS Init - node.config:', node.config);
    return {
      from: node.config?.from || 'Agentauto',
      toNumber: node.config?.toNumber || '',
      message: node.config?.message || '',
      useCustomAccount: node.config?.useCustomAccount || false,
      toNumberField: node.config?.toNumberField || null,
      messageFields: node.config?.messageFields || [],
    };
  });
  
  console.log('SMS Render - inputData:', inputData, 'previousNodeLabel:', previousNodeLabel, 'config:', config);
  
  // Sync config when node.config changes
  React.useEffect(() => {
    if (node.config) {
      console.log('SMS useEffect - syncing node.config:', node.config);
      setConfig({
        from: node.config.from || 'Agentauto',
        toNumber: node.config.toNumber || '',
        message: node.config.message || '',
        useCustomAccount: node.config.useCustomAccount || false,
        toNumberField: node.config.toNumberField || null,
        messageFields: node.config.messageFields || [],
      });
      // Also update mode toggles
      setToNumberMode(node.config.toNumberField ? 'workflow' : 'fixed');
      setMessageMode(node.config.messageFields?.length > 0 ? 'workflow' : 'fixed');
    }
  }, [node.config]);
  
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  
  // Drag & Drop states
  const [isToNumberDragOver, setIsToNumberDragOver] = useState(false);
  const [isMessageDragOver, setIsMessageDragOver] = useState(false);
  
  // Mode toggles
  const [toNumberMode, setToNumberMode] = useState<'fixed' | 'workflow'>(node.config?.toNumberField ? 'workflow' : 'workflow');
  const [messageMode, setMessageMode] = useState<'fixed' | 'workflow'>(node.config?.messageFields?.length > 0 ? 'workflow' : 'fixed');

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
  const hasValidConfig = config.from && (config.toNumber || config.toNumberField) && (config.message || config.messageFields.length > 0);
  
  // Execute step - simulate sending SMS
  const executeStep = async () => {
    if (!hasValidConfig) return;
    
    setIsExecuting(true);
    setExecutionResult(null);
    
    try {
      // Get the data
      const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
      
      // Build SMS preview
      let toNumber = config.toNumber;
      
      if (config.toNumberField && data) {
        const parts = config.toNumberField.path.split('.');
        let value: any = data;
        for (const part of parts) {
          value = value?.[part];
        }
        toNumber = value || 'N/A';
      }
      
      // Simulate execution result
      setExecutionResult({
        success: true,
        from: config.from,
        to: toNumber,
        messageFieldsCount: config.messageFields.length,
        message: 'SMS configuration validated. Ready to send.',
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
            style={{ backgroundColor: '#00B5AD' }}
          >
            <div className="flex items-center gap-3">
              <InfobipSMSIcon size={24} />
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                Infobip SMS
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
                  borderBottom: activeTab === tab ? '2px solid #00B5AD' : '2px solid transparent',
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
                    ℹ️ Se va folosi contul Infobip Agentauto. SMS-urile vor fi trimise de pe numerele configurate în platforma Agentauto.
                  </div>
                )}

                {/* From (Sender ID) */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    De la (Sender ID) *
                  </label>
                  <input
                    type="text"
                    value={config.from}
                    onChange={(e) => setConfig(prev => ({ ...prev, from: e.target.value }))}
                    placeholder="Agentauto"
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      color: '#fff',
                    }}
                  />
                  <p className="text-xs" style={{ color: '#666' }}>
                    Numele sau numărul care va apărea ca expeditor
                  </p>
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

                {/* To Number - with mode toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: '#888' }}>
                      📱 Număr telefon destinatar *
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setToNumberMode('fixed')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: toNumberMode === 'fixed' ? '#00B5AD' : '#333',
                          color: '#fff',
                        }}
                      >
                        Fix
                      </button>
                      <button
                        onClick={() => setToNumberMode('workflow')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: toNumberMode === 'workflow' ? '#00B5AD' : '#333',
                          color: '#fff',
                        }}
                      >
                        Din Workflow
                      </button>
                    </div>
                  </div>
                  
                  {toNumberMode === 'fixed' ? (
                    <input
                      type="tel"
                      value={config.toNumber}
                      onChange={(e) => setConfig(prev => ({ ...prev, toNumber: e.target.value }))}
                      placeholder="+40712345678"
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
                        isToNumberDragOver 
                          ? 'bg-teal-500/20 border-teal-500 border-2 border-dashed' 
                          : 'bg-[#252525] border border-[#333] border-dashed'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsToNumberDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsToNumberDragOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsToNumberDragOver(false);
                        
                        try {
                          const jsonData = e.dataTransfer.getData('application/json');
                          if (jsonData) {
                            const field = JSON.parse(jsonData);
                            setConfig(prev => ({ ...prev, toNumberField: {
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
                      {config.toNumberField ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-teal-400 font-mono">
                            📱 {config.toNumberField.expression}
                          </span>
                          <button
                            onClick={() => setConfig(prev => ({ ...prev, toNumberField: null }))}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Trage câmpul telefon din INPUT...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Message Content - with mode toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: '#888' }}>
                      💬 Mesaj SMS *
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setMessageMode('fixed')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: messageMode === 'fixed' ? '#00B5AD' : '#333',
                          color: '#fff',
                        }}
                      >
                        Fix
                      </button>
                      <button
                        onClick={() => setMessageMode('workflow')}
                        className="px-2 py-1 text-xs rounded"
                        style={{
                          backgroundColor: messageMode === 'workflow' ? '#00B5AD' : '#333',
                          color: '#fff',
                        }}
                      >
                        Din Workflow
                      </button>
                    </div>
                  </div>
                  
                  {messageMode === 'fixed' ? (
                    <div className="space-y-1">
                      <textarea
                        value={config.message}
                        onChange={(e) => setConfig(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Scrie mesajul SMS aici..."
                        rows={4}
                        maxLength={160}
                        className="w-full px-3 py-2 rounded text-sm resize-none"
                        style={{
                          backgroundColor: '#252525',
                          border: '1px solid #333',
                          color: '#fff',
                        }}
                      />
                      <p className="text-xs text-right" style={{ color: '#666' }}>
                        {config.message.length}/160 caractere
                      </p>
                    </div>
                  ) : (
                    <div 
                      className={`rounded-lg p-4 min-h-[120px] transition-all ${
                        isMessageDragOver 
                          ? 'bg-teal-500/20 border-teal-500 border-2 border-dashed' 
                          : 'bg-[#252525] border border-[#333] border-dashed'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMessageDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMessageDragOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMessageDragOver(false);
                        
                        try {
                          const jsonData = e.dataTransfer.getData('application/json');
                          if (jsonData) {
                            const field = JSON.parse(jsonData);
                            // Add field if not already present
                            if (!config.messageFields.find(f => f.path === field.path)) {
                              setConfig(prev => ({ ...prev, messageFields: [...prev.messageFields, {
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
                      {config.messageFields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-4">
                          <div className="text-2xl mb-2">💬</div>
                          <p className="text-sm text-gray-400">
                            Trage câmpuri din INPUT pentru mesaj SMS
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {config.messageFields.map((field, idx) => (
                            <div 
                              key={field.path}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-teal-500/10 border border-teal-500/30"
                            >
                              <span className="text-xs text-teal-400 font-mono">
                                {field.expression}
                              </span>
                              <button
                                onClick={() => setConfig(prev => ({ ...prev, messageFields: prev.messageFields.filter((_, i) => i !== idx) }))}
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
                    <MessageSquare className="w-4 h-4" style={{ color: '#00B5AD' }} />
                    <span className="text-xs font-medium" style={{ color: '#00B5AD' }}>
                      Preview SMS:
                    </span>
                  </div>
                  <div className="text-xs space-y-1" style={{ color: '#fff' }}>
                    <div>📤 From: {config.from}</div>
                    <div>📱 To: {config.toNumberField ? <span className="text-teal-400">{config.toNumberField.expression}</span> : config.toNumber || '(nu e setat)'}</div>
                    <div>💬 Message: {messageMode === 'fixed' ? (config.message || '(nu e setat)') : (
                      config.messageFields.length > 0 ? 
                        <span className="text-teal-400">{config.messageFields.length} câmpuri</span> : 
                        '(nu e setat)'
                    )}</div>
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
                console.log('SMS Save clicked - config:', config);
                onSave({ ...config, pinnedData });
              }}
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: '#00B5AD',
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
