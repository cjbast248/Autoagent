import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  ChevronDown,
  Send,
  Eye,
  EyeOff,
  Zap,
  Play,
  Loader2,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Pin,
} from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { N8NExpressionSelector } from './N8NExpressionSelector';

// Telegram Icon
const TelegramIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="12" fill="#2AABEE" />
    <path 
      d="M17.0516 7.22147C17.1785 6.55006 16.5396 5.99857 15.9073 6.23534L5.72566 10.0575C5.05935 10.3075 5.03009 11.2517 5.67797 11.5419L8.22816 12.683L14.1851 9.06614C14.3553 8.96263 14.5344 9.19478 14.3874 9.32689L9.95001 13.3195L9.62175 16.5008C9.58012 16.9041 10.0563 17.1614 10.3648 16.8996L12.2026 15.3336L14.8086 17.3C15.1921 17.5821 15.7392 17.3712 15.8411 16.8987L17.0516 7.22147Z" 
      fill="white"
    />
  </svg>
);

interface DroppedField {
  key: string;
  path: string;
  expression: string;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
  text: string;
  parseMode: 'none' | 'Markdown' | 'HTML' | 'MarkdownV2';
  selectedFields: string[];
  droppedFields: DroppedField[];
  pinnedData?: any;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NTelegramConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: TelegramConfig;
  };
  onClose: () => void;
  onSave: (config: TelegramConfig) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
  nodeSources?: NodeData[];
}

const TELEGRAM_CREDENTIALS_KEY = 'kalina-telegram-credentials';

const loadSavedCredentials = (): { botToken: string; chatId: string } => {
  try {
    const saved = localStorage.getItem(TELEGRAM_CREDENTIALS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        botToken: parsed.botToken || '',
        chatId: parsed.chatId || '',
      };
    }
  } catch (e) {
    console.error('Failed to load Telegram credentials:', e);
  }
  return { botToken: '', chatId: '' };
};

const saveCredentials = (botToken: string, chatId: string) => {
  try {
    localStorage.setItem(TELEGRAM_CREDENTIALS_KEY, JSON.stringify({ botToken, chatId }));
  } catch (e) {
    console.error('Failed to save Telegram credentials:', e);
  }
};

const parseModeOptions = [
  { value: 'none', label: 'None' },
  { value: 'Markdown', label: 'Markdown' },
  { value: 'HTML', label: 'HTML' },
  { value: 'MarkdownV2', label: 'MarkdownV2' },
];

// Extract available fields from input data
const extractFieldsFromData = (data: any): { key: string; label: string; type: string }[] => {
  if (!data) return [];
  
  const fields: { key: string; label: string; type: string }[] = [];
  
  const processObject = (obj: any, prefix = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    // If it's an array, process the first item
    if (Array.isArray(obj) && obj.length > 0) {
      processObject(obj[0], prefix);
      return;
    }
    
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const type = typeof value;
      
      // Skip internal fields
      if (key.startsWith('$') || key.startsWith('_')) return;
      
      // Get icon based on type and key
      let icon = '📄';
      if (key.toLowerCase().includes('email')) icon = '📧';
      else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) icon = '📱';
      else if (key.toLowerCase().includes('name')) icon = '👤';
      else if (key.toLowerCase().includes('id')) icon = '🆔';
      else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) icon = '📅';
      else if (type === 'number') icon = '🔢';
      else if (type === 'boolean') icon = '✅';
      else if (Array.isArray(value)) icon = '📋';
      else if (type === 'object' && value !== null) icon = '📦';
      
      fields.push({
        key: fullKey,
        label: `${icon} ${key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}`,
        type: type,
      });
    });
  };
  
  processObject(data);
  return fields;
};

export const N8NTelegramConfigNew: React.FC<N8NTelegramConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  previousNodeLabel,
  nodeSources,
}) => {
  const savedCreds = loadSavedCredentials();
  
  const [config, setConfig] = useState<TelegramConfig>(() => ({
    botToken: node.config?.botToken || savedCreds.botToken || '',
    chatId: node.config?.chatId || savedCreds.chatId || '',
    text: node.config?.text || '',
    parseMode: node.config?.parseMode || 'none',
    selectedFields: node.config?.selectedFields || [],
    droppedFields: node.config?.droppedFields || [],
  }));
  
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [showToken, setShowToken] = useState(false);
  const [textMode, setTextMode] = useState<'fixed' | 'expression'>('expression');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showExpressionSelector, setShowExpressionSelector] = useState(false);
  const [activeFieldTarget, setActiveFieldTarget] = useState<'text' | 'chatId' | null>(null);
  
  // Drag & Drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Pinned data state
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);

  // Effective input data: prefer live inputData, fallback to pinnedData
  const effectiveInputData = inputData || pinnedData;

  // Handle pin data
  const handlePinData = (data: any) => {
    setPinnedData(data);
  };

  // Helper to update droppedFields in config
  const setDroppedFields = (updater: (prev: DroppedField[]) => DroppedField[]) => {
    setConfig(prev => ({ ...prev, droppedFields: updater(prev.droppedFields) }));
  };
  
  // Available fields from input data
  const availableFields = extractFieldsFromData(effectiveInputData);
  
  // Check if we have valid credentials
  const hasCredentials = config.botToken && config.chatId;
  
  // Update credentials in localStorage when they change
  useEffect(() => {
    if (config.botToken && config.chatId) {
      saveCredentials(config.botToken, config.chatId);
    }
  }, [config.botToken, config.chatId]);
  
  // Build message preview
  const buildMessagePreview = (): string => {
    if (textMode === 'fixed') {
      return config.text;
    }
    
    if (config.droppedFields.length === 0) {
      return '(Trage câmpuri din INPUT aici)';
    }
    
    const lines = config.droppedFields.map(field => {
      return `• ${field.key}: ${field.expression}`;
    });
    
    return 'Se va trimite:\n' + lines.join('\n');
  };
  
  // Execute step - send test message
  const executeStep = async () => {
    if (!hasCredentials) return;
    
    setIsExecuting(true);
    setExecutionResult(null);
    
    try {
      // Build message text
      let messageText = '';

      const cleanMarkdownArtifacts = (text: string): string => {
        if (!text || typeof text !== 'string') return text;
        let cleaned = text;
        cleaned = cleaned.replace(/^rawAnalysis:\s*/i, '');
        cleaned = cleaned.replace(/^analysis:\s*/i, '');
        cleaned = cleaned.replace(/^result:\s*/i, '');
        cleaned = cleaned.replace(/^output:\s*/i, '');
        cleaned = cleaned.replace(/^```json\s*/i, '');
        cleaned = cleaned.replace(/^```\s*/i, '');
        cleaned = cleaned.replace(/\s*```$/i, '');
        return cleaned.trim();
      };

      if (textMode === 'fixed') {
        messageText = cleanMarkdownArtifacts(config.text);
      } else {
        // Build message from dropped fields
        const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
        const lines: string[] = [];

        console.log('Telegram executeStep - effectiveInputData:', effectiveInputData);
        console.log('Telegram executeStep - data:', data);
        console.log('Telegram executeStep - using pinned data:', !inputData && !!pinnedData);
        console.log('Telegram executeStep - droppedFields:', config.droppedFields);

        if (data && config.droppedFields.length > 0) {
          // Add dropped fields (VALUES ONLY)
          config.droppedFields.forEach(field => {
            console.log('Processing field:', field);
            const parts = field.path.split('.');
            let value: any = data;
            for (const part of parts) {
              value = value?.[part];
              console.log(`  Navigating to ${part}:`, value);
            }
            const displayValueRaw = value !== undefined && value !== null ? String(value) : '';
            const displayValue = cleanMarkdownArtifacts(displayValueRaw);
            if (displayValue) lines.push(displayValue);
          });
        }

        messageText = lines.length > 0 ? lines.join('\n\n') : 'No fields configured - drag fields from INPUT panel';
      }
      
      // Send to Telegram
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: messageText,
          parse_mode: config.parseMode !== 'none' ? config.parseMode : undefined,
        }),
      });
      
      const result = await response.json();
      setExecutionResult(result);
      
    } catch (error: any) {
      setExecutionResult({ ok: false, error: error.message });
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

        {/* Main Config Panel - Center */}
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
            style={{ backgroundColor: '#2AABEE' }}
          >
            <div className="flex items-center gap-3">
              <TelegramIcon size={24} />
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                Telegram
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={executeStep}
                disabled={!hasCredentials || isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: hasCredentials ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: hasCredentials ? 'pointer' : 'not-allowed',
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
                  borderBottom: activeTab === tab ? '2px solid #2AABEE' : '2px solid transparent',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            <a
              href="https://core.telegram.org/bots/api"
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
                {/* Bot API Token */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Bot API Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={config.botToken}
                      onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
                      placeholder="Enter your bot token from @BotFather"
                      className="w-full px-3 py-2 pr-10 rounded text-sm"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                    >
                      {showToken ? (
                        <EyeOff className="w-4 h-4" style={{ color: '#888' }} />
                      ) : (
                        <Eye className="w-4 h-4" style={{ color: '#888' }} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: '#666' }}>
                    Get your token from @BotFather on Telegram
                  </p>
                </div>

                {/* Chat ID */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Chat ID
                  </label>
                  <input
                    type="text"
                    value={config.chatId}
                    onChange={(e) => setConfig(prev => ({ ...prev, chatId: e.target.value }))}
                    placeholder="User ID, Group ID, or Channel username (@channel)"
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      color: '#fff',
                    }}
                  />
                  <p className="text-xs" style={{ color: '#666' }}>
                    User ID, Group ID, or Channel username (@channel)
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

                {/* Text Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Ce să trimită în Telegram
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTextMode('fixed')}
                      className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: textMode === 'fixed' ? '#2AABEE' : '#252525',
                        color: textMode === 'fixed' ? '#fff' : '#888',
                        border: '1px solid #333',
                      }}
                    >
                      Fixed
                    </button>
                    <button
                      onClick={() => setTextMode('expression')}
                      className="flex-1 px-3 py-2 rounded text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: textMode === 'expression' ? '#2AABEE' : '#252525',
                        color: textMode === 'expression' ? '#fff' : '#888',
                        border: '1px solid #333',
                      }}
                    >
                      Expression
                    </button>
                  </div>
                </div>

                {textMode === 'expression' && (
                  <>
                    {/* Drag & Drop Zone */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium" style={{ color: '#888' }}>
                        Câmpuri de trimis (trage din INPUT)
                      </label>
                      
                      <div 
                        className={`rounded-lg p-4 min-h-[120px] transition-all ${
                          isDragOver 
                            ? 'bg-green-500/20 border-green-500 border-2 border-dashed' 
                            : 'bg-[#252525] border border-[#333] border-dashed'
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragOver(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragOver(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragOver(false);
                          
                          try {
                            const jsonData = e.dataTransfer.getData('application/json');
                            if (jsonData) {
                              const field = JSON.parse(jsonData);
                              // Add field if not already present
                              if (!config.droppedFields.find(f => f.path === field.path)) {
                                setDroppedFields(prev => [...prev, {
                                  key: field.key,
                                  path: field.path,
                                  expression: field.expression,
                                }]);
                              }
                            }
                          } catch (err) {
                            console.error('Drop error:', err);
                          }
                        }}
                      >
                        {config.droppedFields.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center py-4">
                            <div className="text-2xl mb-2">🎯</div>
                            <p className="text-sm text-gray-400">
                              Trage câmpuri din panoul INPUT aici
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {config.droppedFields.map((field, idx) => (
                              <div 
                                key={field.path}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-green-400 font-mono">
                                    {field.expression}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setDroppedFields(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preview */}
                    <div 
                      className="rounded p-3 space-y-2"
                      style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                    >
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" style={{ color: '#2AABEE' }} />
                        <span className="text-xs font-medium" style={{ color: '#2AABEE' }}>
                          Se va trimite:
                        </span>
                      </div>
                      <div className="text-xs space-y-1" style={{ color: '#fff' }}>
                        {/* Show dropped fields first */}
                        {config.droppedFields.map(field => (
                          <div key={field.path} className="text-green-400">
                            • {field.key}: <span className="font-mono text-[10px]">{field.expression}</span>
                          </div>
                        ))}
                        {/* Then selected fields */}
                        {config.selectedFields.map(fieldKey => {
                          const field = availableFields.find(f => f.key === fieldKey);
                          return (
                            <div key={fieldKey}>
                              • {field?.label || fieldKey}
                            </div>
                          );
                        })}
                        {config.selectedFields.length === 0 && config.droppedFields.length === 0 && (
                          <div style={{ color: '#888', fontStyle: 'italic' }}>
                            Niciun câmp selectat
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {textMode === 'fixed' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium" style={{ color: '#888' }}>
                      Text mesaj
                    </label>
                    <textarea
                      value={config.text}
                      onChange={(e) => setConfig(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Scrie mesajul de trimis..."
                      rows={4}
                      className="w-full px-3 py-2 rounded text-sm resize-none"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    />
                  </div>
                )}

                {/* No input data message */}
                {!inputData && textMode === 'expression' && (
                  <div 
                    className="rounded p-3 text-center"
                    style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                  >
                    <p className="text-xs" style={{ color: '#888' }}>
                      Nu sunt date disponibile. Rulează workflow-ul pentru a vedea datele.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'settings' && (
              <>
                {/* Parse Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#888' }}>
                    Parse Mode
                  </label>
                  <select
                    value={config.parseMode}
                    onChange={(e) => setConfig(prev => ({ ...prev, parseMode: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded text-sm appearance-none cursor-pointer"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      color: '#fff',
                    }}
                  >
                    {parseModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                backgroundColor: '#2AABEE',
                color: '#fff',
              }}
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
              error={executionResult?.error || (executionResult?.ok === false ? executionResult?.description : null)}
            />
          </div>
        </div>
      </div>

      {/* Expression Selector Modal */}
      {showExpressionSelector && (
        <N8NExpressionSelector
          inputData={inputData}
          currentValue={activeFieldTarget === 'text' ? config.text : config.chatId}
          onClose={() => {
            setShowExpressionSelector(false);
            setActiveFieldTarget(null);
          }}
          onSelect={(expression) => {
            if (activeFieldTarget === 'text') {
              setConfig(prev => ({ ...prev, text: expression }));
            } else if (activeFieldTarget === 'chatId') {
              setConfig(prev => ({ ...prev, chatId: expression }));
            }
            setShowExpressionSelector(false);
            setActiveFieldTarget(null);
          }}
        />
      )}
    </div>;

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};
