import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  X,
  Check,
  Play,
  Loader2,
  Plus,
} from 'lucide-react';
import { GroqIcon } from './BrandIcons';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NGroqChatModelConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      credential?: string;
    };
  };
  onClose: () => void;
  onSave: (config: any) => void;
  onExecutionUpdate?: (nodeId: string, data: { input?: any; output?: any }) => void;
  inputData?: any;
  outputData?: any;
  parentNodeId?: string;
  nodeSources?: NodeData[];
}

// ============================================
// CONSTANTS
// ============================================

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'llama-3.3-70b-versatile' },
  { id: 'llama-3.1-8b-instant', name: 'llama-3.1-8b-instant' },
  { id: 'mixtral-8x7b-32768', name: 'mixtral-8x7b-32768' },
  { id: 'gemma2-9b-it', name: 'gemma2-9b-it' },
  { id: 'llama-3.2-90b-vision-preview', name: 'llama-3.2-90b-vision-preview' },
  { id: 'llama-3.2-11b-vision-preview', name: 'llama-3.2-11b-vision-preview' },
];

const GROQ_CREDENTIALS = [
  { id: 'groq-account-1', name: 'Groq account' },
  { id: 'groq-account-6', name: 'Groq account 6' },
];

// Exact n8n colors
const colors = {
  bgBody: '#111111',
  bgPanel: '#232323',
  bgInput: '#1d1d1d',
  borderInput: '#383838',
  textWhite: '#e8e8e8',
  textLabel: '#ccc',
  textPlaceholder: '#666',
  n8nOrange: '#ff6d5a',
  n8nGreen: '#2ecc71',
};

// ============================================
// HELPER COMPONENTS
// ============================================

const N8NDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hasCheckIcon?: boolean;
}> = ({ value, onChange, options, hasCheckIcon }) => (
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
        paddingRight: hasCheckIcon ? '40px' : '24px',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ backgroundColor: colors.bgPanel }}>
          {opt.label}
        </option>
      ))}
    </select>
    {hasCheckIcon && (
      <Check size={14} style={{ color: colors.n8nGreen, position: 'absolute', right: '32px' }} />
    )}
    <ChevronDown size={12} style={{ color: '#999', position: 'absolute', right: '12px', pointerEvents: 'none' }} />
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const N8NGroqChatModelConfig: React.FC<N8NGroqChatModelConfigProps> = ({
  node,
  onClose,
  onSave,
  onExecutionUpdate,
  inputData,
  outputData,
  parentNodeId,
  nodeSources,
}) => {
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [model, setModel] = useState(node.config?.model || 'llama-3.3-70b-versatile');
  const [credential, setCredential] = useState(node.config?.credential || 'groq-account-6');
  const [temperature, setTemperature] = useState(node.config?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(node.config?.maxTokens ?? 2048);
  const [topP, setTopP] = useState(node.config?.topP ?? 1);
  const [frequencyPenalty, setFrequencyPenalty] = useState(node.config?.frequencyPenalty ?? 0);
  const [presencePenalty, setPresencePenalty] = useState(node.config?.presencePenalty ?? 0);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(outputData || null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Auto-save on config change
  useEffect(() => {
    const config = {
      model,
      credential,
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
    };
    onSave(config);
  }, [model, credential, temperature, maxTokens, topP, frequencyPenalty, presencePenalty]);

  const handleSave = () => {
    onSave({
      model,
      credential,
      temperature,
      maxTokens,
      topP,
      frequencyPenalty,
      presencePenalty,
    });
    onClose();
  };

  // Execute the model
  const handleExecuteStep = async () => {
    if (!inputData) {
      toast.error('No input data. Execute previous nodes first.');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      // Get messages from input data
      const messages = inputData?.messages || [];

      console.log('[Groq Chat Model] Executing with:', { model, messages, temperature });

      // Call Groq API through edge function
      const response = await fetch('https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-groq-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZmN6enh3amZ4b21xemhod3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NDg2MzAsImV4cCI6MjA2MjEyNDYzMH0.I_7kfYOQMl_R6TqIGhSvLoL7dAiP8As4-aZ2jr88DnE',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZmN6enh3amZ4b21xemhod3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NDg2MzAsImV4cCI6MjA2MjEyNDYzMH0.I_7kfYOQMl_R6TqIGhSvLoL7dAiP8As4-aZ2jr88DnE',
        },
        body: JSON.stringify({
          messages: messages.length > 0 ? messages : [{ role: 'user', content: JSON.stringify(inputData) }],
          model,
          temperature,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      const outputResult = {
        response: {
          generations: [
            {
              'generations[0]': {
                '0[0]': {
                  text: result.analysis || result.rawAnalysis,
                },
              },
            },
          ],
        },
        generationInfo: {
          finish_reason: 'stop',
        },
        tokenUsage: result.tokenUsage || {
          completionTokens: 0,
          promptTokens: 0,
          totalTokens: 0,
        },
      };

      setExecutionResult(outputResult);
      toast.success('Execution complete!');

      // Update execution data
      if (onExecutionUpdate) {
        onExecutionUpdate(node.id, { input: inputData, output: outputResult });
      }
    } catch (error: any) {
      console.error('[Groq Chat Model] Error:', error);
      setExecutionError(error.message);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const displayOutputData = executionResult || outputData;

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

      {/* Chain icon at top center */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          backgroundColor: '#333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>

      {/* 3-panel layout */}
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
            data={inputData}
            enableDrag={true}
            nodeSources={nodeSources}
          />
        </div>

        {/* Main Config Panel */}
        <div
          style={{
            width: '500px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Groq icon with green border */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  border: '2px solid #10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GroqIcon size={20} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: colors.textWhite }}>
                Groq Chat Model
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '24px', marginLeft: '20px', height: '54px' }}>
                <div
                  onClick={() => setActiveTab('parameters')}
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: activeTab === 'parameters' ? colors.n8nOrange : '#999',
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
                        background: colors.n8nOrange,
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
                    color: activeTab === 'settings' ? colors.n8nOrange : '#999',
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
                        background: colors.n8nOrange,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href="https://console.groq.com/docs/models"
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
                {/* Credential to connect with */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Credential to connect with
                  </label>
                  <N8NDropdown
                    value={credential}
                    onChange={setCredential}
                    options={GROQ_CREDENTIALS.map(c => ({ value: c.id, label: c.name }))}
                    hasCheckIcon={true}
                  />
                </div>

                {/* Model */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Model
                  </label>
                  <N8NDropdown
                    value={model}
                    onChange={setModel}
                    options={GROQ_MODELS.map(m => ({ value: m.id, label: m.name }))}
                  />
                </div>

                {/* Options */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Options
                  </label>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>No properties</div>
                  <button
                    style={{
                      width: '100%',
                      backgroundColor: '#2e2e2e',
                      color: '#ccc',
                      border: '1px solid transparent',
                      padding: '9px',
                      fontSize: '12px',
                      fontWeight: 500,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    Add Option <ChevronDown size={10} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Temperature */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: colors.n8nGreen }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666', marginTop: '4px' }}>
                    <span>Precise (0)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Max Tokens
                  </label>
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
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: colors.textWhite,
                        width: '100%',
                        outline: 'none',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                {/* Top P */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Top P: {topP}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: colors.n8nGreen }}
                  />
                </div>

                {/* Frequency Penalty */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Frequency Penalty: {frequencyPenalty}
                  </label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={frequencyPenalty}
                    onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: colors.n8nGreen }}
                  />
                </div>

                {/* Presence Penalty */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Presence Penalty: {presencePenalty}
                  </label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={presencePenalty}
                    onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: colors.n8nGreen }}
                  />
                </div>
              </div>
            )}
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
            data={displayOutputData}
            isLoading={isExecuting}
            error={executionError}
            enableDrag={false}
          />
        </div>
      </div>

      {/* Groq Chat Model indicator at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: '#1f1f1f',
          border: '1px solid #3f3f46',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#1a1a1a',
            border: '2px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GroqIcon size={16} />
        </div>
        <span style={{ fontSize: '12px', color: '#fff' }}>Groq Chat Model</span>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default N8NGroqChatModelConfig;
