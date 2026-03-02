import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Play, Loader2, Plus, Trash2, ExternalLink, Copy, ChevronDown } from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { toast } from 'sonner';

interface HeaderParam {
  id: string;
  name: string;
  value: string;
}

interface QueryParam {
  id: string;
  name: string;
  value: string;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NHttpRequestConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: any;
  };
  onClose: () => void;
  onSave: (config: any) => void;
  onExecutionUpdate?: (nodeId: string, data: { input?: any; output?: any }) => void;
  inputData?: any;
  outputData?: any;
  nodeSources?: NodeData[];
}

// HTTP Request Icon
const HttpRequestIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div
    className="flex items-center justify-center rounded"
    style={{
      width: size,
      height: size,
      backgroundColor: '#2ecc71',
    }}
  >
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  </div>
);

// Toggle Switch Component
const Toggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      enabled ? 'bg-green-500' : 'bg-gray-600'
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-1'
      }`}
    />
  </button>
);

// Select Dropdown Component
const Select: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}> = ({ value, onChange, options, className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:border-[#555] focus:border-[#ff6d5a] focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

export const N8NHttpRequestConfig: React.FC<N8NHttpRequestConfigProps> = ({
  node,
  onClose,
  onSave,
  onExecutionUpdate,
  inputData,
  outputData,
  nodeSources,
}) => {
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');

  // Form state
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [authentication, setAuthentication] = useState('none');

  // Headers
  const [sendHeaders, setSendHeaders] = useState(false);
  const [specifyHeaders, setSpecifyHeaders] = useState('fields');
  const [headerParams, setHeaderParams] = useState<HeaderParam[]>([
    { id: '1', name: 'Content-Type', value: 'application/json' }
  ]);

  // Query Parameters
  const [sendQueryParams, setSendQueryParams] = useState(false);
  const [queryParams, setQueryParams] = useState<QueryParam[]>([
    { id: '1', name: '', value: '' }
  ]);

  // Body
  const [sendBody, setSendBody] = useState(false);
  const [bodyContentType, setBodyContentType] = useState('json');
  const [specifyBody, setSpecifyBody] = useState('json');
  const [jsonBody, setJsonBody] = useState('{\n  \n}');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Load config on mount
  useEffect(() => {
    if (node.config) {
      setMethod(node.config.method || 'GET');
      setUrl(node.config.url || '');
      setAuthentication(node.config.authentication || 'none');
      setSendHeaders(node.config.sendHeaders || false);
      setSpecifyHeaders(node.config.specifyHeaders || 'fields');
      setHeaderParams(node.config.headerParams || [{ id: '1', name: 'Content-Type', value: 'application/json' }]);
      setSendQueryParams(node.config.sendQueryParams || false);
      setQueryParams(node.config.queryParams || [{ id: '1', name: '', value: '' }]);
      setSendBody(node.config.sendBody || false);
      setBodyContentType(node.config.bodyContentType || 'json');
      setSpecifyBody(node.config.specifyBody || 'json');
      setJsonBody(node.config.jsonBody || '{\n  \n}');
    }
  }, [node.config]);

  // Add header parameter
  const addHeaderParam = () => {
    setHeaderParams([...headerParams, { id: Date.now().toString(), name: '', value: '' }]);
  };

  // Remove header parameter
  const removeHeaderParam = (id: string) => {
    setHeaderParams(headerParams.filter(p => p.id !== id));
  };

  // Update header parameter
  const updateHeaderParam = (id: string, field: 'name' | 'value', value: string) => {
    setHeaderParams(headerParams.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Add query parameter
  const addQueryParam = () => {
    setQueryParams([...queryParams, { id: Date.now().toString(), name: '', value: '' }]);
  };

  // Remove query parameter
  const removeQueryParam = (id: string) => {
    setQueryParams(queryParams.filter(p => p.id !== id));
  };

  // Update query parameter
  const updateQueryParam = (id: string, field: 'name' | 'value', value: string) => {
    setQueryParams(queryParams.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Save configuration
  const handleSave = () => {
    onSave({
      method,
      url,
      authentication,
      sendHeaders,
      specifyHeaders,
      headerParams,
      sendQueryParams,
      queryParams,
      sendBody,
      bodyContentType,
      specifyBody,
      jsonBody,
    });
    toast.success('Configurație salvată!');
  };

  // Test request
  const handleTestRequest = async () => {
    if (!url) {
      toast.error('Introduceți un URL');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      // Build headers
      const headers: Record<string, string> = {};
      if (sendHeaders) {
        headerParams.forEach(p => {
          if (p.name && p.value) {
            headers[p.name] = p.value;
          }
        });
      }

      // Build query string
      let finalUrl = url;
      if (sendQueryParams) {
        const params = new URLSearchParams();
        queryParams.forEach(p => {
          if (p.name && p.value) {
            params.append(p.name, p.value);
          }
        });
        const queryString = params.toString();
        if (queryString) {
          finalUrl += (url.includes('?') ? '&' : '?') + queryString;
        }
      }

      // Build body
      let body: string | undefined;
      if (sendBody && method !== 'GET') {
        if (bodyContentType === 'json') {
          body = jsonBody;
        }
      }

      // Make request via edge function or directly
      const response = await fetch(finalUrl, {
        method,
        headers,
        body,
      });

      const data = await response.json().catch(() => response.text());

      const result = {
        statusCode: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        _executedAt: new Date().toISOString(),
      };

      setExecutionResult(result);

      if (onExecutionUpdate) {
        onExecutionUpdate(node.id, { output: result });
      }

      toast.success(`Request completat: ${response.status}`);
    } catch (error: any) {
      const errorResult = {
        error: true,
        message: error.message,
        _executedAt: new Date().toISOString(),
      };
      setExecutionResult(errorResult);
      toast.error(`Eroare: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Format output for display
  const displayOutput = executionResult || outputData;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-stretch" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      {/* INPUT Panel */}
      <div className="w-[320px] bg-[#1a1a1a] border-r border-[#333] flex flex-col">
        <N8NNodeIOPanel
          title="INPUT"
          data={inputData}
          nodeSources={nodeSources}
          enableDrag={true}
          onFieldDragStart={(field) => {
            console.log('Drag started:', field.path, field.value);
          }}
        />
      </div>

      {/* CENTER Panel - Parameters */}
      <div className="flex-1 bg-[#2b2b2b] flex flex-col min-w-[500px] max-w-[600px]">
        {/* Header */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-[#333] bg-[#2b2b2b]">
          <div className="flex items-center gap-3">
            <HttpRequestIcon size={28} />
            <span className="text-white font-medium">{node.label || 'HTTP Request'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestRequest}
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#ff6d5a] hover:bg-[#ff8a7a] text-white rounded-full text-sm font-medium disabled:opacity-50"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Test Request
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-[#444] rounded">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#333] px-6">
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-0 py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'parameters'
                ? 'text-[#ff6d5a] border-[#ff6d5a]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Parameters
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-0 py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'text-[#ff6d5a] border-[#ff6d5a]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Settings
          </button>
          <a
            href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 py-3"
          >
            Docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'parameters' && (
            <div className="space-y-5">
              {/* Method + URL Row */}
              <div className="flex gap-3">
                <div className="w-28">
                  <Select
                    value={method}
                    onChange={setMethod}
                    options={[
                      { value: 'GET', label: 'GET' },
                      { value: 'POST', label: 'POST' },
                      { value: 'PUT', label: 'PUT' },
                      { value: 'PATCH', label: 'PATCH' },
                      { value: 'DELETE', label: 'DELETE' },
                      { value: 'HEAD', label: 'HEAD' },
                      { value: 'OPTIONS', label: 'OPTIONS' },
                    ]}
                  />
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/api"
                    className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#ff6d5a] focus:outline-none"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#444] rounded">
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Authentication */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Authentication</label>
                <Select
                  value={authentication}
                  onChange={setAuthentication}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'predefined', label: 'Predefined Credential Type' },
                    { value: 'generic', label: 'Generic Credential Type' },
                  ]}
                />
              </div>

              {/* Send Headers */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Send Headers</span>
                <Toggle enabled={sendHeaders} onChange={setSendHeaders} />
              </div>

              {sendHeaders && (
                <div className="pl-4 border-l-2 border-[#444] space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Specify Headers</label>
                    <Select
                      value={specifyHeaders}
                      onChange={setSpecifyHeaders}
                      options={[
                        { value: 'fields', label: 'Using Fields Below' },
                        { value: 'json', label: 'Using JSON' },
                      ]}
                    />
                  </div>

                  <div className="text-xs text-gray-500 mb-2">Header Parameters</div>

                  {headerParams.map((param, index) => (
                    <div key={param.id} className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name</label>
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) => updateHeaderParam(param.id, 'name', e.target.value)}
                          placeholder="Header name"
                          className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#ff6d5a] focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Value</label>
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => updateHeaderParam(param.id, 'value', e.target.value)}
                            placeholder="Header value"
                            className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#ff6d5a] focus:outline-none"
                          />
                        </div>
                        {headerParams.length > 1 && (
                          <button
                            onClick={() => removeHeaderParam(param.id)}
                            className="self-end p-2 hover:bg-[#444] rounded text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addHeaderParam}
                    className="w-full py-2 border border-[#444] rounded text-sm text-gray-400 hover:bg-[#333] hover:text-white flex items-center justify-center gap-2"
                  >
                    Add Parameter
                  </button>
                </div>
              )}

              {/* Send Query Parameters */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Send Query Parameters</span>
                <Toggle enabled={sendQueryParams} onChange={setSendQueryParams} />
              </div>

              {sendQueryParams && (
                <div className="pl-4 border-l-2 border-[#444] space-y-4">
                  <div className="text-xs text-gray-500 mb-2">Query Parameters</div>

                  {queryParams.map((param) => (
                    <div key={param.id} className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name</label>
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) => updateQueryParam(param.id, 'name', e.target.value)}
                          placeholder="Parameter name"
                          className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#ff6d5a] focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Value</label>
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) => updateQueryParam(param.id, 'value', e.target.value)}
                            placeholder="Parameter value"
                            className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#ff6d5a] focus:outline-none"
                          />
                        </div>
                        {queryParams.length > 1 && (
                          <button
                            onClick={() => removeQueryParam(param.id)}
                            className="self-end p-2 hover:bg-[#444] rounded text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addQueryParam}
                    className="w-full py-2 border border-[#444] rounded text-sm text-gray-400 hover:bg-[#333] hover:text-white flex items-center justify-center gap-2"
                  >
                    Add Parameter
                  </button>
                </div>
              )}

              {/* Send Body (only for non-GET methods) */}
              {method !== 'GET' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Send Body</span>
                    <Toggle enabled={sendBody} onChange={setSendBody} />
                  </div>

                  {sendBody && (
                    <div className="pl-4 border-l-2 border-[#444] space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Body Content Type</label>
                        <Select
                          value={bodyContentType}
                          onChange={setBodyContentType}
                          options={[
                            { value: 'json', label: 'JSON' },
                            { value: 'form-urlencoded', label: 'Form Urlencoded' },
                            { value: 'form-data', label: 'Multipart Form-Data' },
                            { value: 'raw', label: 'Raw' },
                          ]}
                        />
                      </div>

                      {bodyContentType === 'json' && (
                        <>
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Specify Body</label>
                            <Select
                              value={specifyBody}
                              onChange={setSpecifyBody}
                              options={[
                                { value: 'json', label: 'Using JSON' },
                                { value: 'fields', label: 'Using Fields Below' },
                              ]}
                            />
                          </div>

                          {specifyBody === 'json' && (
                            <div>
                              <label className="block text-sm text-gray-400 mb-2">JSON</label>
                              <textarea
                                value={jsonBody}
                                onChange={(e) => setJsonBody(e.target.value)}
                                rows={8}
                                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-[#d4d4d4] font-mono focus:border-[#ff6d5a] focus:outline-none resize-none"
                                placeholder='{"key": "value"}'
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-400">
                Additional settings for the HTTP Request node.
              </div>
              {/* Add more settings as needed */}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-6 flex items-center justify-end gap-3 border-t border-[#333] bg-[#2b2b2b]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#ff6d5a] hover:bg-[#ff8a7a] text-white rounded text-sm font-medium"
          >
            Save
          </button>
        </div>
      </div>

      {/* OUTPUT Panel */}
      <div className="w-[320px] bg-[#1a1a1a] border-l border-[#333] flex flex-col">
        <N8NNodeIOPanel
          title="OUTPUT"
          data={displayOutput}
        />
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default N8NHttpRequestConfig;
