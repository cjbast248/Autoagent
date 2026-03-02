import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Play,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  Pin,
} from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { GroqIcon } from './BrandIcons';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// TYPES
// ============================================

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface ChatMessage {
  id: string;
  type: 'system' | 'user' | 'ai';
  message: string;
}

interface N8NBasicLLMChainConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: {
      promptSource?: string;
      userPrompt?: string;
      requireOutputFormat?: boolean;
      enableFallback?: boolean;
      chatMessages?: ChatMessage[];
      model?: string;
      temperature?: number;
      systemPrompt?: string;
      pinnedData?: any; // Pinned input data for testing
    };
  };
  onClose: () => void;
  onSave: (config: any) => void;
  inputData?: any;
  outputData?: any;
  nodeSources?: NodeData[];
}

// ============================================
// CONSTANTS
// ============================================

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'Most capable model' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Fast responses' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: '32K context window' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google Gemma model' },
];

const PROMPT_SOURCES = [
  { id: 'connected', name: 'Connected Chat Trigger Node' },
  { id: 'define', name: 'Define below' },
];

const MESSAGE_TYPES = [
  { id: 'system', name: 'System' },
  { id: 'user', name: 'User (Human)' },
  { id: 'ai', name: 'AI' },
];

// ============================================
// HELPER COMPONENTS
// ============================================

// n8n style toggle switch
const Toggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}> = ({ enabled, onChange, label }) => (
  <button
    onClick={() => onChange(!enabled)}
    className="flex items-center gap-2"
  >
    <div
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ backgroundColor: enabled ? '#10b981' : '#3f3f46' }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow"
        style={{ left: enabled ? '22px' : '2px' }}
      />
    </div>
    {label && <span className="text-xs text-gray-400">{label}</span>}
  </button>
);

// n8n style expression input field
const ExpressionInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resolvedValue?: string;
  onDrop?: (e: React.DragEvent) => void;
  multiline?: boolean;
  rows?: number;
}> = ({ value, onChange, placeholder, resolvedValue, onDrop, multiline = false, rows = 1 }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const isExpression = value.includes('{{');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (onDrop) onDrop(e);
  };

  const commonProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder,
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); },
    onDragLeave: () => setIsDragOver(false),
    onDrop: handleDrop,
    className: `w-full px-3 py-2 text-sm rounded-md transition-all ${isDragOver ? 'ring-2 ring-green-500' : ''}`,
    style: {
      backgroundColor: isExpression ? '#1a2e1a' : '#262626',
      border: `1px solid ${isExpression ? '#2d5a2d' : '#3f3f46'}`,
      color: isExpression ? '#4ade80' : '#fff',
      fontFamily: isExpression ? 'monospace' : 'inherit',
    },
  };

  return (
    <div className="space-y-1">
      {isExpression && (
        <div className="flex items-center gap-1 text-[10px] text-orange-400">
          <span className="px-1.5 py-0.5 bg-orange-500/20 rounded">fx</span>
          <span>Expression</span>
        </div>
      )}
      {multiline ? (
        <textarea {...commonProps} rows={rows} />
      ) : (
        <input type="text" {...commonProps} />
      )}
      {resolvedValue && isExpression && (
        <div className="text-xs text-gray-500 mt-1 truncate">
          = {resolvedValue}
        </div>
      )}
    </div>
  );
};

// Chat message item component
const ChatMessageItem: React.FC<{
  message: ChatMessage;
  onChange: (message: ChatMessage) => void;
  onDelete: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ message, onChange, onDelete, onDrop, isExpanded, onToggleExpand }) => {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: '#262626', border: '1px solid #3f3f46' }}
    >
      {/* Message header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
        onClick={onToggleExpand}
      >
        <GripVertical className="w-3 h-3 text-gray-600 cursor-grab" />
        <div className="w-4 h-4 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          )}
        </div>
        <span className="text-xs text-gray-400 flex-1">
          {MESSAGE_TYPES.find(t => t.id === message.type)?.name || 'Message'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 hover:bg-red-500/20 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-400" />
        </button>
      </div>

      {/* Message content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Type selector */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Type Name or ID</label>
            <select
              value={message.type}
              onChange={(e) => onChange({ ...message, type: e.target.value as ChatMessage['type'] })}
              className="w-full px-3 py-2 text-sm rounded-md"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #3f3f46', color: '#fff' }}
            >
              {MESSAGE_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {/* Message content */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Message</label>
            <ExpressionInput
              value={message.message}
              onChange={(value) => onChange({ ...message, message: value })}
              placeholder="Enter message content..."
              multiline
              rows={4}
              onDrop={onDrop}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const N8NBasicLLMChainConfig: React.FC<N8NBasicLLMChainConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  nodeSources,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [promptSource, setPromptSource] = useState(node.config?.promptSource || 'connected');
  const [userPrompt, setUserPrompt] = useState(node.config?.userPrompt || '{{ $json.chatInput }}');
  const [requireOutputFormat, setRequireOutputFormat] = useState(node.config?.requireOutputFormat || false);
  const [enableFallback, setEnableFallback] = useState(node.config?.enableFallback || false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    node.config?.chatMessages || [
      { id: '1', type: 'system', message: '' }
    ]
  );
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set(['1']));
  const [selectedModel, setSelectedModel] = useState(node.config?.model || 'llama-3.3-70b-versatile');
  const [temperature, setTemperature] = useState(node.config?.temperature || 0.7);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Pinned data state - use pinned data if no live input data
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);

  // Effective input data: prefer live inputData, fallback to pinnedData
  const effectiveInputData = inputData || pinnedData;

  // Helper to get value from path with array support (e.g., "lookupResults[1].pointId")
  const getValueFromPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;

    // Handle paths like "lookupResults[1].pointId" or "lookupResults.[1].pointId"
    // First normalize: remove extra dots before brackets
    const normalizedPath = path.replace(/\.\[/g, '[');

    // Split by dots, but keep array brackets with their preceding property
    const parts: string[] = [];
    let current = '';
    for (let i = 0; i < normalizedPath.length; i++) {
      const char = normalizedPath[i];
      if (char === '.' && current) {
        parts.push(current);
        current = '';
      } else if (char !== '.') {
        current += char;
      }
    }
    if (current) parts.push(current);

    let value = obj;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;

      // Check for array access like "lookupResults[0]" or just "[0]"
      const arrayMatch = part.match(/^([^\[]*)\[(\d+)\](.*)$/);
      if (arrayMatch) {
        const [, arrayName, indexStr, rest] = arrayMatch;
        const index = parseInt(indexStr, 10);

        // If there's a property name before the bracket
        if (arrayName) {
          value = value[arrayName];
          if (value === undefined || value === null) return undefined;
        }

        // Access the array element
        if (Array.isArray(value)) {
          value = value[index];
        } else {
          return undefined;
        }

        // If there's more path after the bracket (e.g., [0].pointId)
        if (rest && rest.startsWith('.')) {
          const remainingPath = rest.slice(1); // Remove leading dot
          if (remainingPath) {
            value = getValueFromPath(value, remainingPath);
          }
        }
      } else {
        value = value[part];
      }
    }

    return value;
  };

  // Resolve expression to actual value
  const resolveExpression = (expr: string): string | null => {
    if (!expr || !expr.includes('{{')) return expr || null;

    const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;

    console.log('[resolveExpression] Input expr:', expr);
    console.log('[resolveExpression] effectiveInputData:', effectiveInputData);
    console.log('[resolveExpression] nodeSources:', nodeSources);

    let resolved = expr;

    // Replace {{ $json.path }} patterns
    resolved = resolved.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match, path) => {
      if (!data) return match;
      const value = getValueFromPath(data, path.trim());
      console.log('[resolveExpression] $json pattern - path:', path, 'value:', value);
      return value !== undefined ? String(value) : match;
    });

    // Replace {{ $('nodeName').item.json['path'] }} patterns (bracket notation)
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\['([^']+)'\]\s*\}\}/g, (match, nodeName, path) => {
      console.log('[resolveExpression] $() bracket pattern - nodeName:', nodeName, 'path:', path);

      // First try nodeSources
      const nodeSource = nodeSources?.find(n => n.nodeName === nodeName);
      if (nodeSource) {
        const nodeData = Array.isArray(nodeSource.data) ? nodeSource.data[0] : nodeSource.data;
        const value = getValueFromPath(nodeData, path);
        console.log('[resolveExpression] Found in nodeSources:', value);
        return value !== undefined ? String(value) : match;
      }

      // Fallback to inputData (if it's from the referenced node)
      if (data) {
        const value = getValueFromPath(data, path);
        console.log('[resolveExpression] Fallback to inputData:', value);
        return value !== undefined ? String(value) : match;
      }

      return match;
    });

    // Replace {{ $('nodeName').item.json.path }} patterns (dot notation)
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\.([^}\s]+)\s*\}\}/g, (match, nodeName, path) => {
      console.log('[resolveExpression] $() dot pattern - nodeName:', nodeName, 'path:', path);

      const nodeSource = nodeSources?.find(n => n.nodeName === nodeName);
      if (nodeSource) {
        const nodeData = Array.isArray(nodeSource.data) ? nodeSource.data[0] : nodeSource.data;
        const value = getValueFromPath(nodeData, path.trim());
        console.log('[resolveExpression] Found in nodeSources:', value);
        return value !== undefined ? String(value) : match;
      }

      // Fallback to inputData
      if (data) {
        const value = getValueFromPath(data, path.trim());
        console.log('[resolveExpression] Fallback to inputData:', value);
        return value !== undefined ? String(value) : match;
      }

      return match;
    });

    console.log('[resolveExpression] Final resolved:', resolved);

    // Return resolved even if it still has {{ - better to show partial than nothing
    return resolved;
  };

  const resolvedUserPrompt = resolveExpression(userPrompt);

  // Handle drop on prompt field
  const handlePromptDrop = (e: React.DragEvent) => {
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const field = JSON.parse(jsonData);
        setUserPrompt(field.expression || `{{ $json.${field.path} }}`);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Handle drop on message field
  const handleMessageDrop = (messageId: string) => (e: React.DragEvent) => {
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const field = JSON.parse(jsonData);
        setChatMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, message: msg.message + (field.expression || `{{ $json.${field.path} }}`) }
            : msg
        ));
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Add new chat message
  const addChatMessage = () => {
    const newId = Date.now().toString();
    setChatMessages(prev => [...prev, { id: newId, type: 'user', message: '' }]);
    setExpandedMessages(prev => new Set([...prev, newId]));
  };

  // Delete chat message
  const deleteChatMessage = (id: string) => {
    setChatMessages(prev => prev.filter(msg => msg.id !== id));
    setExpandedMessages(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Toggle message expand
  const toggleMessageExpand = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Execute test
  const handleExecuteStep = async () => {
    if (!effectiveInputData) {
      toast.error('No input data. Execute previous nodes first or pin test data.');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      console.log('[Basic LLM Chain] Starting execution...');
      console.log('[Basic LLM Chain] chatMessages:', chatMessages);
      console.log('[Basic LLM Chain] userPrompt:', userPrompt);
      console.log('[Basic LLM Chain] resolvedUserPrompt:', resolvedUserPrompt);
      console.log('[Basic LLM Chain] effectiveInputData:', effectiveInputData);
      console.log('[Basic LLM Chain] nodeSources:', nodeSources);
      console.log('[Basic LLM Chain] using pinned data:', !inputData && !!pinnedData);

      // Build prompt from system messages and user prompt
      let systemPromptText = '';
      const systemMessages = chatMessages.filter(m => m.type === 'system' && m.message.trim());
      console.log('[Basic LLM Chain] systemMessages:', systemMessages);

      for (const msg of systemMessages) {
        const resolved = resolveExpression(msg.message) || msg.message;
        console.log('[Basic LLM Chain] System message resolved:', msg.message, '->', resolved);
        systemPromptText += resolved + '\n';
      }

      // Get user prompt content (resolved)
      const userContent = resolvedUserPrompt || userPrompt;
      console.log('[Basic LLM Chain] userContent:', userContent);

      // Build final prompt combining system + user
      const finalPrompt = systemPromptText
        ? `${systemPromptText.trim()}\n\nUser: ${userContent}`
        : userContent;

      console.log('[Basic LLM Chain] finalPrompt:', finalPrompt);

      // Get transcript/input data as string - include ALL available data
      // This ensures Groq has access to all data from connected nodes
      let allInputData: Record<string, any> = {};

      // Add effectiveInputData
      if (effectiveInputData) {
        if (typeof effectiveInputData === 'object') {
          allInputData = { ...effectiveInputData };
        } else {
          allInputData['_input'] = effectiveInputData;
        }
      }

      // Add data from all nodeSources (data from connected upstream nodes)
      if (nodeSources && nodeSources.length > 0) {
        for (const source of nodeSources) {
          if (source.data) {
            // Use node name as key for clarity
            const key = source.nodeName.replace(/\s+/g, '_');
            allInputData[key] = source.data;

            // Also merge top-level fields for easier access
            if (typeof source.data === 'object' && !Array.isArray(source.data)) {
              Object.assign(allInputData, source.data);
            }
          }
        }
      }

      const transcriptData = JSON.stringify(allInputData, null, 2);

      console.log('[Basic LLM Chain] Executing with:', {
        prompt: finalPrompt.substring(0, 200) + '...',
        transcript: transcriptData.substring(0, 200) + '...',
        model: selectedModel,
        temperature,
      });

      // Try workflow-groq-analysis first, fallback to chat-widget-groq if JWT error
      let result: any;
      let error: any;

      // First attempt: workflow-groq-analysis
      const response1 = await supabase.functions.invoke('workflow-groq-analysis', {
        body: {
          transcript: transcriptData,
          prompt: finalPrompt,
          temperature: temperature,
          model: selectedModel,
        },
      });

      result = response1.data;
      error = response1.error;

      console.log('[Basic LLM Chain] Primary response:', result, 'Error:', error);

      // If JWT error, try fallback to chat-widget-groq
      if (error?.message?.includes('JWT') || error?.message?.includes('401') ||
          result?.error?.includes('JWT') || result?.error?.includes('Invalid')) {
        console.log('[Basic LLM Chain] JWT error detected, trying chat-widget-groq fallback...');

        const response2 = await supabase.functions.invoke('chat-widget-groq', {
          body: {
            messages: [
              { role: 'user', content: finalPrompt }
            ],
            systemPrompt: 'You are a helpful AI assistant. When asked to return JSON, respond with valid JSON only, without additional text.',
          },
        });

        console.log('[Basic LLM Chain] Fallback response:', response2.data);

        if (response2.data?.success && response2.data?.message) {
          // Parse the message as JSON if possible
          let analysisResult: any = response2.data.message;
          try {
            let content = response2.data.message;
            content = content.replace(/^```json\s*/i, '');
            content = content.replace(/^```\s*/i, '');
            content = content.replace(/\s*```$/i, '');
            content = content.trim();

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysisResult = JSON.parse(jsonMatch[0]);
            }
          } catch {
            // Keep as string
          }

          setExecutionResult({
            response: {
              text: analysisResult,
            },
            generationInfo: {
              finish_reason: 'stop',
            },
            tokenUsage: {
              completionTokens: 0,
              promptTokens: 0,
              totalTokens: 0,
            },
          });
          toast.success('Execution complete!');
          return;
        }

        // If fallback also failed, throw original error
        throw new Error(error?.message || result?.error || 'Groq API error - edge function may need redeployment');
      }

      if (error) {
        throw new Error(error.message || 'Error calling Groq API');
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Unknown error from Groq');
      }

      // Use the analysis result
      const analysisResult = result.analysis;

      setExecutionResult({
        response: {
          text: analysisResult,
        },
        generationInfo: {
          finish_reason: 'stop',
        },
        tokenUsage: result.tokenUsage || {
          completionTokens: 0,
          promptTokens: 0,
          totalTokens: 0,
        },
      });

      toast.success('Execution complete!');
    } catch (error: any) {
      console.error('[Basic LLM Chain] Error:', error);
      setExecutionError(error.message);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle pin data
  const handlePinData = (data: any) => {
    setPinnedData(data);
    toast.success('Data pinned! You can now test without re-running previous nodes.');
  };

  // Save config
  const handleSave = () => {
    onSave({
      promptSource,
      userPrompt,
      requireOutputFormat,
      enableFallback,
      chatMessages,
      model: selectedModel,
      temperature,
      systemPrompt: chatMessages.find(m => m.type === 'system')?.message || '',
      pinnedData, // Save pinned data with the node config
    });
    onClose();
  };

  // Get output data for display
  const displayOutputData = executionResult || outputData;

  // ============================================
  // RENDER
  // ============================================

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: '#131419',
        backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSave();
      }}
    >
      {/* Back to canvas button */}
      <button
        onClick={handleSave}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      {/* 3-panel layout */}
      <div
        className="flex items-stretch"
        style={{
          height: '85vh',
          maxWidth: '98vw',
          width: '95%',
        }}
      >
        {/* INPUT Panel - Left */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '350px',
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
            backgroundColor: '#262626',
            boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px #404040',
            borderRadius: '8px',
            zIndex: 5,
          }}
        >
          {/* Header - n8n style with link icon */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#404040', borderRadius: '8px 8px 0 0' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded"
                style={{ width: '32px', height: '32px', backgroundColor: '#525252' }}
              >
                {/* Link chain icon like n8n */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div>
                <span className="text-white text-sm font-medium">Basic LLM Chain</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Pinned data indicator */}
              {pinnedData && !inputData && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}
                >
                  <Pin className="w-3 h-3" style={{ transform: 'rotate(45deg)' }} />
                  Using pinned data
                </div>
              )}
              <button
                onClick={handleExecuteStep}
                disabled={!effectiveInputData || isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  opacity: !effectiveInputData || isExecuting ? 0.5 : 1,
                  cursor: !effectiveInputData || isExecuting ? 'not-allowed' : 'pointer',
                }}
              >
                {isExecuting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                Execute step
              </button>
              <button onClick={handleSave} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: '#3f3f46', backgroundColor: '#1f1f1f' }}>
            {(['parameters', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-6 py-2.5 text-xs font-medium transition-colors capitalize"
                style={{
                  color: activeTab === tab ? '#fff' : '#71717a',
                  borderBottom: activeTab === tab ? '2px solid #ff6d5a' : '2px solid transparent',
                }}
              >
                {tab}
              </button>
            ))}
            <div className="flex-1" />
            <a
              href="https://docs.n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-4 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Docs
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#1a1a1a' }}>
            {/* Blue info banner */}
            <div
              className="mx-4 mt-4 p-3 rounded-md flex items-center gap-2 text-xs"
              style={{ backgroundColor: '#1e3a5f', border: '1px solid #2563eb' }}
            >
              <span className="text-blue-300">
                Save time with an <a href="#" className="underline hover:text-blue-200">example</a> of how this node works
              </span>
            </div>

            {activeTab === 'parameters' && (
              <div className="p-4 space-y-5">
                {/* Source for Prompt */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Source for Prompt (User Message)</label>
                  <select
                    value={promptSource}
                    onChange={(e) => setPromptSource(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-md"
                    style={{ backgroundColor: '#262626', border: '1px solid #3f3f46', color: '#fff' }}
                  >
                    {PROMPT_SOURCES.map(source => (
                      <option key={source.id} value={source.id}>{source.name}</option>
                    ))}
                  </select>
                </div>

                {/* Prompt (User Message) */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Prompt (User Message)</label>
                  <ExpressionInput
                    value={userPrompt}
                    onChange={setUserPrompt}
                    placeholder="Enter prompt or expression..."
                    resolvedValue={resolvedUserPrompt || undefined}
                    onDrop={handlePromptDrop}
                  />
                  {resolvedUserPrompt && (
                    <div className="mt-2 text-xs text-gray-400 truncate">
                      {resolvedUserPrompt}
                    </div>
                  )}
                </div>

                {/* Require Specific Output Format */}
                <div className="flex items-center justify-between py-2">
                  <label className="text-xs text-gray-400">Require Specific Output Format</label>
                  <Toggle
                    enabled={requireOutputFormat}
                    onChange={setRequireOutputFormat}
                  />
                </div>

                {/* Enable Fallback Model */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Enable Fallback Model</label>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#3f3f46', color: '#a1a1aa' }}>
                      ⋮
                    </span>
                  </div>
                  <Toggle
                    enabled={enableFallback}
                    onChange={setEnableFallback}
                  />
                </div>

                {/* Chat Messages section */}
                <div className="pt-2">
                  <label className="text-xs text-gray-400 mb-3 block">Chat Messages (if Using a Chat Model)</label>
                  <div className="space-y-2">
                    {chatMessages.map((message) => (
                      <ChatMessageItem
                        key={message.id}
                        message={message}
                        onChange={(updated) => setChatMessages(prev =>
                          prev.map(m => m.id === updated.id ? updated : m)
                        )}
                        onDelete={() => deleteChatMessage(message.id)}
                        onDrop={handleMessageDrop(message.id)}
                        isExpanded={expandedMessages.has(message.id)}
                        onToggleExpand={() => toggleMessageExpand(message.id)}
                      />
                    ))}
                  </div>

                  {/* Add prompt button */}
                  <button
                    onClick={addChatMessage}
                    className="w-full mt-3 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-md border border-dashed transition-colors"
                    style={{ borderColor: '#3f3f46' }}
                  >
                    Add prompt
                  </button>
                </div>

                {/* Batch Processing section */}
                <div className="pt-4 border-t" style={{ borderColor: '#2a2a2a' }}>
                  <label className="text-xs text-gray-400 mb-2 block">Batch Processing</label>
                  <div className="text-xs text-gray-500 mb-2">No properties</div>
                  <button
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Batch Processing Option
                  </button>
                </div>

                {/* Model connection indicator */}
                <div className="pt-4 border-t" style={{ borderColor: '#2a2a2a' }}>
                  <label className="text-xs text-gray-400 mb-2 block">Model *</label>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: '#1f1f1f', border: '1px solid #3f3f46' }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{ width: '32px', height: '32px', backgroundColor: '#1a1a1a', border: '2px solid #10b981' }}
                    >
                      <GroqIcon size={18} />
                    </div>
                    <span className="text-sm text-white">Groq Chat Model</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-4 space-y-5">
                {/* Model selector */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-md"
                    style={{ backgroundColor: '#262626', border: '1px solid #3f3f46', color: '#fff' }}
                  >
                    {GROQ_MODELS.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-green-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>Precise (0)</span>
                    <span>Creative (1)</span>
                  </div>
                </div>

                {/* Options section */}
                <div className="pt-4">
                  <label className="text-xs text-gray-400 mb-2 block">Options</label>
                  <div className="text-xs text-gray-500 mb-2">No properties</div>
                  <button
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Option
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OUTPUT Panel - Right */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '350px',
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
              data={displayOutputData}
              isLoading={isExecuting}
              error={executionError}
            />
          </div>
        </div>
      </div>

      {/* Groq Chat Model floating indicator at bottom */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-lg"
        style={{ backgroundColor: '#1f1f1f', border: '1px solid #3f3f46' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: '28px', height: '28px', backgroundColor: '#1a3d2a', border: '2px solid #10b981' }}
        >
          <GroqIcon size={16} />
        </div>
        <span className="text-xs text-white">Groq Chat Model</span>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default N8NBasicLLMChainConfig;
