import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ChevronDown,
  Play,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  X,
  ArrowLeft,
  Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';

// Exact n8n colors from HTML template
const colors = {
  bgBody: '#111111',
  bgPanel: '#232323',
  bgInput: '#1d1d1d',
  borderInput: '#383838',
  borderHover: '#555',
  textWhite: '#e8e8e8',
  textLabel: '#ccc',
  textPlaceholder: '#666',
  n8nOrange: '#ff6d5a',
  n8nGreen: '#2ecc71',
  codeKey: '#9cdcfe',
  codeStr: '#ce9178',
  codePunct: '#d4d4d4',
};

// HTTP Proxy URL
const getProxyUrl = () => {
  const isProduction = window.location.hostname !== 'localhost';
  if (isProduction) {
    return `${window.location.origin}/scraper/proxy`;
  }
  return 'http://localhost:8000/proxy';
};

const HTTP_PROXY_URL = getProxyUrl();

// HTTP Icon - Globe style
const HTTPIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div style={{ color: '#8f7ee6', fontSize: `${size}px` }}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  </div>
);

interface HeaderItem {
  name: string;
  value: string;
  nameIsExpression?: boolean;
  valueIsExpression?: boolean;
}

interface QueryParamItem {
  name: string;
  value: string;
  nameIsExpression?: boolean;
  valueIsExpression?: boolean;
}

interface HTTPRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  urlIsExpression?: boolean;
  authentication: 'none' | 'basicAuth' | 'headerAuth' | 'bearerToken';
  basicAuthUsername: string;
  basicAuthPassword: string;
  headerAuthName: string;
  headerAuthValue: string;
  bearerToken: string;
  bearerTokenIsExpression?: boolean;
  sendHeaders: boolean;
  headers: HeaderItem[];
  sendQueryParameters: boolean;
  queryParameters: QueryParamItem[];
  sendBody: boolean;
  bodyContentType: 'none' | 'json' | 'form-urlencoded' | 'form-data' | 'raw';
  bodyJson: string;
  bodyJsonIsExpression?: boolean;
  bodyRaw: string;
  timeout: number;
  followRedirects: boolean;
  ignoreSslErrors: boolean;
  responseFormat: 'autodetect' | 'json' | 'text' | 'file';
  pinnedData?: any;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NHTTPRequestConfigNewProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: HTTPRequestConfig;
  };
  onClose: () => void;
  onSave: (config: HTTPRequestConfig) => void;
  onExecutionUpdate?: (data: { input?: any; output?: any }) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
  nodeSources?: NodeData[];
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

const defaultConfig: HTTPRequestConfig = {
  method: 'GET',
  url: '',
  authentication: 'none',
  basicAuthUsername: '',
  basicAuthPassword: '',
  headerAuthName: 'X-Auth-Token',
  headerAuthValue: '',
  bearerToken: '',
  sendHeaders: false,
  headers: [],
  sendQueryParameters: false,
  queryParameters: [],
  sendBody: false,
  bodyContentType: 'json',
  bodyJson: '{\n  \n}',
  bodyRaw: '',
  timeout: 30000,
  followRedirects: true,
  ignoreSslErrors: false,
  responseFormat: 'autodetect',
};

// n8n Style Toggle Switch Component
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

// n8n Style Parameter Input with Fixed/Expression toggle buttons visible
const N8NParameterInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  isExpression?: boolean;
  onToggleExpression?: () => void;
  resolvedValue?: string;
  inputData?: any;
}> = ({ value, onChange, placeholder, type = 'text', isExpression, onToggleExpression, resolvedValue }) => {
  // Check if value contains expression syntax
  const hasExpression = value?.includes('{{') && value?.includes('}}');
  const effectiveIsExpression = isExpression !== undefined ? isExpression : hasExpression;

  return (
    <div style={{ position: 'relative' }}>
      {/* Fixed/Expression toggle buttons - always visible */}
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

      {/* Input field */}
      <div
        style={{
          width: '100%',
          backgroundColor: colors.bgInput,
          border: `1px solid ${effectiveIsExpression ? '#5c4095' : colors.borderInput}`,
          borderRadius: '4px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
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
          placeholder={placeholder}
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

// Simple input without toggle (for backwards compatibility)
const N8NInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
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

// n8n Style Dropdown Component
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

// n8n Style Expression Input Component
const ExpressionInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  resolvedValue?: string;
}> = ({ value, onChange, resolvedValue }) => (
  <div>
    <div
      style={{
        width: '100%',
        backgroundColor: colors.bgInput,
        border: '1px solid #5c4095',
        borderRadius: '4px',
        display: 'flex',
        height: '32px',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '28px',
          height: '100%',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRight: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontFamily: 'serif',
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: '13px',
          userSelect: 'none',
        }}
      >
        fx
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          padding: '0 10px',
          fontFamily: "'Roboto Mono', monospace",
          fontSize: '12px',
          color: colors.n8nGreen,
          fontWeight: 500,
          background: 'transparent',
          border: 'none',
          outline: 'none',
        }}
      />
      <div style={{ paddingRight: '8px' }}>
        <Maximize2 size={10} style={{ color: '#666', cursor: 'pointer', transform: 'rotate(45deg)' }} />
      </div>
    </div>

    {resolvedValue && (
      <>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '5px',
            fontSize: '11px',
            padding: '0 2px',
          }}
        >
          <div>
            <span style={{ color: '#ccc', fontWeight: 600, marginRight: '6px' }}>Result</span>
            <span style={{ color: colors.n8nGreen, fontWeight: 600, fontFamily: "'Roboto Mono', monospace" }}>
              {resolvedValue}
            </span>
          </div>
          <div
            style={{
              color: '#666',
              background: '#222',
              padding: '2px 6px',
              borderRadius: '3px',
              border: '1px solid #333',
            }}
          >
            Item <span style={{ fontWeight: 700 }}>C</span> ‹ ›
          </div>
        </div>
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#999' }}>
          Tip: Anything inside <span style={{ background: '#333', padding: '1px 4px', borderRadius: '3px', fontFamily: "'Roboto Mono', monospace", color: '#ccc' }}>{'{{ }}'}</span> is JavaScript.{' '}
          <span style={{ color: colors.n8nOrange, cursor: 'pointer' }}>Learn more</span>
        </div>
      </>
    )}
  </div>
);

// JSON Editor Component - exact n8n style with Fixed/Expression toggle
const JSONEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  isExpression?: boolean;
  onToggleExpression?: () => void;
  resolvedValue?: string;
}> = ({ value, onChange, isExpression, onToggleExpression, resolvedValue }) => {
  const lines = value.split('\n');
  const hasExpression = value?.includes('{{') && value?.includes('}}');
  const effectiveIsExpression = isExpression !== undefined ? isExpression : hasExpression;

  return (
    <div>
      {/* Fixed/Expression toggle and label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <span style={{ color: '#999', fontSize: '12px', fontWeight: 500 }}>JSON</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
      </div>

      {/* Editor */}
      <div
        style={{
          backgroundColor: '#111',
          border: `1px solid ${effectiveIsExpression ? '#5c4095' : '#333'}`,
          borderRadius: '4px',
          fontFamily: "'Roboto Mono', monospace",
          fontSize: '12px',
          lineHeight: '18px',
          display: 'flex',
          height: '160px',
        }}
      >
        <div
          style={{
            width: '34px',
            backgroundColor: '#1e1e1e',
            borderRight: '1px solid #333',
            color: '#555',
            textAlign: 'right',
            paddingRight: '8px',
            paddingTop: '10px',
            userSelect: 'none',
          }}
        >
          {lines.map((_, idx) => (
            <div key={idx} style={{ color: lines[idx]?.includes('{{') ? '#a78bfa' : '#555' }}>
              {lines[idx]?.includes('{{') ? 'fx' : idx + 1}
            </div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '10px',
            color: effectiveIsExpression ? colors.n8nGreen : '#d4d4d4',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
          }}
          spellCheck={false}
        />
      </div>

      {/* Resolved value preview for expressions */}
      {effectiveIsExpression && resolvedValue && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          <div style={{ color: '#999', marginBottom: '4px' }}>Result:</div>
          <div
            style={{
              color: colors.n8nGreen,
              fontFamily: "'Roboto Mono', monospace",
              fontSize: '11px',
              maxHeight: '60px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {resolvedValue}
          </div>
        </div>
      )}
    </div>
  );
};

export const N8NHTTPRequestConfigNew: React.FC<N8NHTTPRequestConfigNewProps> = ({
  node,
  onClose,
  onSave,
  onExecutionUpdate,
  inputData,
  outputData,
  previousNodeLabel,
  nodeSources,
}) => {
  const [config, setConfig] = useState<HTTPRequestConfig>(() => ({
    ...defaultConfig,
    ...node.config,
  }));

  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);

  // Use pinned data as fallback when no live input data
  const effectiveInputData = inputData || pinnedData;

  // Handler for pinning data
  const handlePinData = (data: any) => {
    setPinnedData(data);
    toast.success('Data pinned! You can now test without re-running previous nodes.');
  };

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

  // Resolve n8n expressions - supports $json.path and $('NodeName').item.json.path
  const resolveExpression = (text: string, data: any): string => {
    if (!text) return text;

    const nodeContext = buildNodeContext();
    console.log('[Expression Debug] Node context keys:', Object.keys(nodeContext));
    console.log('[Expression Debug] Text to resolve:', text);
    let resolved = text;

    // 1a. Handle {{ $('NodeName').item.json['path'] }} - bracket notation
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\['([^']+)'\]\s*\}\}/g,
      (match, nodeName, bracketPath) => {
        console.log(`[Expression Debug] Matched bracket notation: nodeName="${nodeName}", path="${bracketPath}"`);
        const nodeData = nodeContext[nodeName];
        if (!nodeData) {
          console.log(`[Expression] Node "${nodeName}" not found. Available: ${Object.keys(nodeContext).join(', ')}`);
          return match;
        }
        console.log('[Expression Debug] Node data:', nodeData);
        const value = bracketPath ? getValueFromPath(nodeData, bracketPath.trim()) : nodeData;
        console.log('[Expression Debug] Resolved value:', value);
        if (value !== undefined) {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return match;
      });

    // 1b. Handle {{ $('NodeName').item.json.path }} - dot notation
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\.([^}\s]+)\s*\}\}/g,
      (match, nodeName, dotPath) => {
        console.log(`[Expression Debug] Matched dot notation: nodeName="${nodeName}", path="${dotPath}"`);
        const nodeData = nodeContext[nodeName];
        if (!nodeData) {
          console.log(`[Expression] Node "${nodeName}" not found. Available: ${Object.keys(nodeContext).join(', ')}`);
          return match;
        }
        const value = dotPath ? getValueFromPath(nodeData, dotPath.trim()) : nodeData;
        if (value !== undefined) {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return match;
      });

    // 1c. Handle {{ $('NodeName').item.json }} - no path, just the whole json
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\s*\}\}/g,
      (match, nodeName) => {
        console.log(`[Expression Debug] Matched whole json: nodeName="${nodeName}"`);
        const nodeData = nodeContext[nodeName];
        if (!nodeData) {
          console.log(`[Expression] Node "${nodeName}" not found. Available: ${Object.keys(nodeContext).join(', ')}`);
          return match;
        }
        return typeof nodeData === 'object' ? JSON.stringify(nodeData) : String(nodeData);
      });

    // 2. Handle {{ $('NodeName').first().json.path }}
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.first\(\)\.json\.([^}]+)\s*\}\}/g,
      (match, nodeName, path) => {
        const nodeData = nodeContext[nodeName];
        if (!nodeData) return match;
        const firstItem = Array.isArray(nodeData) ? nodeData[0] : nodeData;
        const value = getValueFromPath(firstItem, path.trim());
        if (value !== undefined) {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return match;
      });

    // 3. Handle {{ JSON.stringify($json.path) }}
    resolved = resolved.replace(/\{\{\s*JSON\.stringify\(\$json\.([^)]+)\)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        return JSON.stringify(value, null, 2);
      }
      return match;
    });

    // 4. Handle {{ $json.path }}
    resolved = resolved.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      return match;
    });

    // 5. Handle {{ $input.item.json.path }}
    resolved = resolved.replace(/\{\{\s*\$input\.item\.json\.([^}]+)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      return match;
    });

    return resolved;
  };

  // Process body with expressions - same logic as resolveExpression
  const processBody = (body: string, data: any): string => {
    if (!body) return body;
    return resolveExpression(body, data);
  };

  // Execute HTTP request
  const executeRequest = async () => {
    if (!config.url) {
      setExecutionError('URL is required');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
      let processedUrl = resolveExpression(config.url, data);

      // Add query parameters
      if (config.sendQueryParameters && config.queryParameters.length > 0) {
        const url = new URL(processedUrl);
        config.queryParameters.forEach(param => {
          if (param.name && param.value) {
            url.searchParams.append(param.name, resolveExpression(param.value, data));
          }
        });
        processedUrl = url.toString();
      }

      // Build headers
      const headers: Record<string, string> = {};

      if (config.authentication === 'basicAuth') {
        const credentials = btoa(`${config.basicAuthUsername}:${config.basicAuthPassword}`);
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (config.authentication === 'bearerToken') {
        headers['Authorization'] = `Bearer ${config.bearerToken}`;
      } else if (config.authentication === 'headerAuth') {
        headers[config.headerAuthName] = config.headerAuthValue;
      }

      if (config.sendHeaders) {
        config.headers.forEach(header => {
          if (header.name && header.value) {
            headers[header.name] = resolveExpression(header.value, data);
          }
        });
      }

      // Build body
      let body: string | undefined;
      if (config.method !== 'GET' && config.method !== 'HEAD' && config.sendBody) {
        if (config.bodyContentType === 'json') {
          headers['Content-Type'] = 'application/json';
          body = processBody(config.bodyJson, data);
        } else if (config.bodyContentType === 'raw') {
          body = config.bodyRaw;
        }
      }

      const proxyResponse = await fetch(HTTP_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-http-url': processedUrl,
          'x-http-method': config.method,
          'x-http-headers': JSON.stringify(headers),
        },
        body: body || undefined,
      });

      const proxyResult = await proxyResponse.json();

      if (proxyResult.error) {
        throw new Error(proxyResult.message || 'Request failed');
      }

      setExecutionResult({
        status: proxyResult.status,
        statusText: proxyResult.statusText,
        headers: proxyResult.headers || {},
        data: proxyResult.data,
        url: processedUrl,
      });

      if (onExecutionUpdate) {
        onExecutionUpdate({
          input: effectiveInputData,
          output: {
            httpResponse: proxyResult.data,
            httpStatus: proxyResult.status,
            ...effectiveInputData,
          },
        });
      }
    } catch (error: any) {
      setExecutionError(error.message || 'Request failed');
    } finally {
      setIsExecuting(false);
    }
  };

  // Header management
  const addHeader = () => {
    setConfig(prev => ({
      ...prev,
      headers: [...prev.headers, { name: '', value: '' }],
    }));
  };

  const updateHeader = (index: number, field: 'name' | 'value', value: string) => {
    setConfig(prev => ({
      ...prev,
      headers: prev.headers.map((h, i) => i === index ? { ...h, [field]: value } : h),
    }));
  };

  // Query param management
  const addQueryParam = () => {
    setConfig(prev => ({
      ...prev,
      queryParameters: [...prev.queryParameters, { name: '', value: '' }],
    }));
  };

  const updateQueryParam = (index: number, field: 'name' | 'value', value: string) => {
    setConfig(prev => ({
      ...prev,
      queryParameters: prev.queryParameters.map((p, i) => i === index ? { ...p, [field]: value } : p),
    }));
  };

  const removeQueryParam = (index: number) => {
    setConfig(prev => ({
      ...prev,
      queryParameters: prev.queryParameters.filter((_, i) => i !== index),
    }));
  };

  const removeHeader = (index: number) => {
    setConfig(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    onSave({ ...config, pinnedData });
    onClose();
  };

  useEffect(() => {
    onSave({ ...config, pinnedData });
  }, [config, pinnedData]);

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

        {/* Main Config Panel - exact n8n style */}
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
          {/* Header - exact n8n style */}
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
              <HTTPIcon size={16} />
              <div style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.3px', color: colors.textWhite }}>
                HTTP Request
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <a
                href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/"
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
                onClick={executeRequest}
                disabled={!config.url || isExecuting}
                style={{
                  backgroundColor: colors.n8nOrange,
                  color: 'white',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: '100px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: config.url ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 5px rgba(255, 109, 90, 0.2)',
                  opacity: config.url ? 1 : 0.6,
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
              position: 'relative',
            }}
          >
            {/* Import cURL link */}
            <div
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                fontSize: '12px',
                color: '#ccc',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Import cURL
            </div>

            {activeTab === 'parameters' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Method */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Method
                  </label>
                  <N8NDropdown
                    value={config.method}
                    onChange={(v) => setConfig(prev => ({ ...prev, method: v as any }))}
                    options={HTTP_METHODS.map(m => ({ value: m, label: m }))}
                  />
                </div>

                {/* URL */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    URL
                  </label>
                  <N8NParameterInput
                    value={config.url}
                    onChange={(v) => setConfig(prev => ({ ...prev, url: v }))}
                    placeholder="https://api.example.com/endpoint"
                    isExpression={config.urlIsExpression}
                    onToggleExpression={() => setConfig(prev => ({ ...prev, urlIsExpression: !prev.urlIsExpression }))}
                    resolvedValue={config.urlIsExpression && effectiveInputData ? resolveExpression(config.url, effectiveInputData) : undefined}
                    inputData={effectiveInputData}
                  />
                </div>

                {/* Authentication */}
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Authentication
                  </label>
                  <N8NDropdown
                    value={config.authentication}
                    onChange={(v) => setConfig(prev => ({ ...prev, authentication: v as any }))}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'basicAuth', label: 'Basic Auth' },
                      { value: 'headerAuth', label: 'Header Auth' },
                      { value: 'bearerToken', label: 'Bearer Token' },
                    ]}
                  />
                </div>

                {/* Send Query Parameters toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '24px' }}>
                  <span style={{ fontSize: '12px', color: colors.textWhite, fontWeight: 500 }}>Send Query Parameters</span>
                  <ToggleSwitch
                    active={config.sendQueryParameters}
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        sendQueryParameters: !prev.sendQueryParameters,
                        queryParameters: !prev.sendQueryParameters && prev.queryParameters.length === 0
                          ? [{ name: '', value: '' }]
                          : prev.queryParameters,
                      }));
                    }}
                  />
                </div>

                {/* Query Parameters */}
                {config.sendQueryParameters && (
                  <div>
                    <label style={{ display: 'block', color: '#999', marginBottom: '8px', fontSize: '11px' }}>
                      Query Parameters
                    </label>
                    {config.queryParameters.map((param, idx) => (
                      <div
                        key={idx}
                        style={{
                          marginBottom: '16px',
                          padding: '12px',
                          backgroundColor: '#1a1a1a',
                          borderRadius: '4px',
                          border: '1px solid #333',
                          position: 'relative',
                        }}
                      >
                        {/* Delete button */}
                        <button
                          onClick={() => removeQueryParam(idx)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Remove parameter"
                        >
                          <X size={14} />
                        </button>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', color: '#999', marginBottom: '4px', fontSize: '11px' }}>Name</label>
                          <N8NParameterInput
                            value={param.name}
                            onChange={(v) => updateQueryParam(idx, 'name', v)}
                            placeholder="Parameter name"
                            isExpression={param.nameIsExpression}
                            onToggleExpression={() => {
                              setConfig(prev => ({
                                ...prev,
                                queryParameters: prev.queryParameters.map((p, i) =>
                                  i === idx ? { ...p, nameIsExpression: !p.nameIsExpression } : p
                                ),
                              }));
                            }}
                            resolvedValue={param.nameIsExpression && effectiveInputData ? resolveExpression(param.name, effectiveInputData) : undefined}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#999', marginBottom: '4px', fontSize: '11px' }}>Value</label>
                          <N8NParameterInput
                            value={param.value}
                            onChange={(v) => updateQueryParam(idx, 'value', v)}
                            placeholder="Value"
                            isExpression={param.valueIsExpression}
                            onToggleExpression={() => {
                              setConfig(prev => ({
                                ...prev,
                                queryParameters: prev.queryParameters.map((p, i) =>
                                  i === idx ? { ...p, valueIsExpression: !p.valueIsExpression } : p
                                ),
                              }));
                            }}
                            resolvedValue={param.valueIsExpression && effectiveInputData ? resolveExpression(param.value, effectiveInputData) : undefined}
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addQueryParam}
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
                      }}
                    >
                      Add Parameter
                    </button>
                  </div>
                )}

                {/* Send Headers toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '24px' }}>
                  <span style={{ fontSize: '12px', color: colors.textWhite, fontWeight: 500 }}>Send Headers</span>
                  <ToggleSwitch
                    active={config.sendHeaders}
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        sendHeaders: !prev.sendHeaders,
                        headers: !prev.sendHeaders && prev.headers.length === 0
                          ? [{ name: '', value: '' }]
                          : prev.headers,
                      }));
                    }}
                  />
                </div>

                {/* Headers Section */}
                {config.sendHeaders && (
                  <>
                    <div style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                        Specify Headers
                      </label>
                      <div style={{ borderRadius: '4px 4px 0 0' }}>
                        <N8NDropdown
                          value="fields"
                          onChange={() => {}}
                          options={[
                            { value: 'fields', label: 'Using Fields Below' },
                            { value: 'json', label: 'Using JSON' },
                          ]}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        border: '1px solid #333',
                        borderTop: 'none',
                        padding: '16px',
                        marginTop: '-10px',
                        borderRadius: '0 0 4px 4px',
                      }}
                    >
                      <div style={{ color: colors.textLabel, marginBottom: '12px', fontSize: '12px', fontWeight: 600 }}>
                        Header Parameters
                      </div>

                      {config.headers.map((header, idx) => (
                        <div
                          key={idx}
                          style={{
                            marginBottom: '16px',
                            padding: '12px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '4px',
                            border: '1px solid #2a2a2a',
                            position: 'relative',
                          }}
                        >
                          {/* Delete button */}
                          <button
                            onClick={() => removeHeader(idx)}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'transparent',
                              border: 'none',
                              color: '#666',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Remove header"
                          >
                            <X size={14} />
                          </button>

                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', color: '#999', marginBottom: '4px', fontSize: '11px' }}>Name</label>
                            <N8NParameterInput
                              value={header.name}
                              onChange={(v) => updateHeader(idx, 'name', v)}
                              placeholder="e.g., Content-Type"
                              isExpression={header.nameIsExpression}
                              onToggleExpression={() => {
                                setConfig(prev => ({
                                  ...prev,
                                  headers: prev.headers.map((h, i) =>
                                    i === idx ? { ...h, nameIsExpression: !h.nameIsExpression } : h
                                  ),
                                }));
                              }}
                              resolvedValue={header.nameIsExpression && effectiveInputData ? resolveExpression(header.name, effectiveInputData) : undefined}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', color: '#999', marginBottom: '4px', fontSize: '11px' }}>Value</label>
                            <N8NParameterInput
                              value={header.value}
                              onChange={(v) => updateHeader(idx, 'value', v)}
                              placeholder="e.g., application/json"
                              isExpression={header.valueIsExpression}
                              onToggleExpression={() => {
                                setConfig(prev => ({
                                  ...prev,
                                  headers: prev.headers.map((h, i) =>
                                    i === idx ? { ...h, valueIsExpression: !h.valueIsExpression } : h
                                  ),
                                }));
                              }}
                              resolvedValue={header.valueIsExpression && effectiveInputData ? resolveExpression(header.value, effectiveInputData) : undefined}
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addHeader}
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
                        }}
                      >
                        Add Parameter
                      </button>
                    </div>
                  </>
                )}

                {/* Send Body toggle */}
                {config.method !== 'GET' && config.method !== 'HEAD' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '24px' }}>
                      <span style={{ fontSize: '12px', color: colors.textWhite, fontWeight: 500 }}>Send Body</span>
                      <ToggleSwitch
                        active={config.sendBody}
                        onClick={() => setConfig(prev => ({ ...prev, sendBody: !prev.sendBody }))}
                      />
                    </div>

                    {config.sendBody && (
                      <>
                        <div>
                          <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                            Body Content Type
                          </label>
                          <N8NDropdown
                            value={config.bodyContentType}
                            onChange={(v) => setConfig(prev => ({ ...prev, bodyContentType: v as any }))}
                            options={[
                              { value: 'json', label: 'JSON' },
                              { value: 'form-urlencoded', label: 'Form URL Encoded' },
                              { value: 'form-data', label: 'Multipart Form Data' },
                              { value: 'raw', label: 'Raw' },
                            ]}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                            Specify Body
                          </label>
                          <N8NDropdown
                            value="json"
                            onChange={() => {}}
                            options={[
                              { value: 'json', label: 'Using JSON' },
                              { value: 'fields', label: 'Using Fields Below' },
                            ]}
                          />
                        </div>

                        <div>
                          <JSONEditor
                            value={config.bodyJson}
                            onChange={(v) => setConfig(prev => ({ ...prev, bodyJson: v }))}
                            isExpression={config.bodyJsonIsExpression}
                            onToggleExpression={() => setConfig(prev => ({ ...prev, bodyJsonIsExpression: !prev.bodyJsonIsExpression }))}
                            resolvedValue={config.bodyJsonIsExpression && effectiveInputData ? processBody(config.bodyJson, effectiveInputData) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

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
                    Add option <ChevronDown size={10} />
                  </button>
                </div>

                {/* Footer Notice */}
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
                  You can view the raw requests this node makes in your browser's developer console
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Response Format
                  </label>
                  <N8NDropdown
                    value={config.responseFormat}
                    onChange={(v) => setConfig(prev => ({ ...prev, responseFormat: v as any }))}
                    options={[
                      { value: 'autodetect', label: 'Autodetect' },
                      { value: 'json', label: 'JSON' },
                      { value: 'text', label: 'Text' },
                      { value: 'file', label: 'File' },
                    ]}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: colors.textLabel, marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    Timeout (ms)
                  </label>
                  <N8NInput
                    value={String(config.timeout)}
                    onChange={(v) => setConfig(prev => ({ ...prev, timeout: parseInt(v) || 30000 }))}
                  />
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
              Close
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#3B82F6',
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
            data={outputData || executionResult}
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

export default N8NHTTPRequestConfigNew;
