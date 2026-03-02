import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Plus, Trash2, Globe, Bot, Package, Copy, Check, ArrowDown, ArrowUp, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface N8NRespondToWebhookConfigProps {
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
  inputData?: any;
  outputData?: any;
}

export const N8NRespondToWebhookConfig: React.FC<N8NRespondToWebhookConfigProps> = ({
  onClose,
  onSave,
  initialConfig = {},
  inputData = {},
  outputData,
}) => {
  console.log('Rendering RespondToWebhookConfig with inputData:', inputData, 'outputData:', outputData);
  
  const [respondWith, setRespondWith] = useState<string>(
    initialConfig.respondWith || 'firstIncomingItem'
  );
  const [responseBody, setResponseBody] = useState<string>(
    initialConfig.responseBody || '{{ $json.httpResponse }}'
  );
  const [responseCode, setResponseCode] = useState<string>(
    initialConfig.responseCode || '200'
  );
  const [showOptions, setShowOptions] = useState(false);
  const [responseHeaders, setResponseHeaders] = useState<Array<{name: string; value: string}>>(
    initialConfig.responseHeaders || []
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Detect API errors in httpResponse
  const apiError = useMemo(() => {
    if (inputData.httpResponse && typeof inputData.httpResponse === 'string') {
      const errorMatch = inputData.httpResponse.match(/<error>([^<]+)<\/error>/i);
      if (errorMatch) {
        return {
          code: errorMatch[1],
          raw: inputData.httpResponse,
        };
      }
    }
    return null;
  }, [inputData.httpResponse]);

  // Detect available fields from inputData - support multiple formats
  const availableFields = useMemo(() => {
    const fields: { key: string; label: string; icon: React.ReactNode; preview: string; isXml: boolean; type: string; hasError?: boolean }[] = [];
    
    // Format 1: Direct httpResponse field
    if (inputData.httpResponse !== undefined) {
      const value = inputData.httpResponse;
      const isXml = typeof value === 'string' && value.trim().startsWith('<?xml');
      const hasError = apiError !== null;
      fields.push({
        key: 'httpResponse',
        label: 'HTTP Response',
        icon: <Globe className={`w-4 h-4 ${hasError ? 'text-red-400' : 'text-blue-400'}`} />,
        preview: typeof value === 'string' ? value.slice(0, 100) : JSON.stringify(value).slice(0, 100),
        isXml,
        type: isXml ? 'XML' : 'JSON',
        hasError,
      });
    }
    
    // Format 2: HTTP response with {status, data} structure (from test execution)
    if (inputData.data !== undefined) {
      const rawData = inputData.data?.value || inputData.data;
      const value = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
      const isXml = typeof value === 'string' && value.trim().startsWith('<?xml');
      fields.push({
        key: 'data',
        label: 'HTTP Response Data',
        icon: <Globe className={`w-4 h-4 text-blue-400`} />,
        preview: value.slice(0, 100),
        isXml,
        type: isXml ? 'XML' : (inputData.data?._type || 'JSON'),
        hasError: false,
      });
      
      // Also add status if available
      if (inputData.status !== undefined) {
        fields.push({
          key: 'status',
          label: 'HTTP Status',
          icon: <Globe className="w-4 h-4 text-yellow-400" />,
          preview: String(inputData.status),
          isXml: false,
          type: 'Number',
          hasError: false,
        });
      }
    }
    
    if (inputData.analysis !== undefined) {
      const value = inputData.analysis;
      fields.push({
        key: 'analysis',
        label: 'Groq Analysis',
        icon: <Bot className="w-4 h-4 text-green-400" />,
        preview: typeof value === 'string' ? value.slice(0, 100) : JSON.stringify(value).slice(0, 100),
        isXml: false,
        type: 'Text',
      });
    }
    
    if (inputData.body !== undefined) {
      const value = inputData.body;
      fields.push({
        key: 'body',
        label: 'Webhook Body',
        icon: <Package className="w-4 h-4 text-purple-400" />,
        preview: typeof value === 'string' ? value.slice(0, 100) : JSON.stringify(value).slice(0, 100),
        isXml: false,
        type: 'JSON',
      });
    }
    
    return fields;
  }, [inputData, apiError]);
  
  // Check if the current expression references a field that doesn't exist
  const expressionWarning = useMemo(() => {
    if (respondWith !== 'json' && respondWith !== 'text') return null;
    
    const fieldMatch = responseBody.match(/\{\{\s*\$json\.(\w+)\s*\}\}/);
    if (!fieldMatch) return null;
    
    const fieldName = fieldMatch[1];
    const availableKeys = Object.keys(inputData);
    
    if (!availableKeys.includes(fieldName)) {
      const suggestedField = availableFields.length > 0 ? availableFields[0].key : null;
      return {
        field: fieldName,
        available: availableKeys.filter(k => !['method', 'path', 'timestamp', 'headers', 'query'].includes(k)),
        suggested: suggestedField,
      };
    }
    return null;
  }, [responseBody, inputData, availableFields, respondWith]);

  // Generate response preview with better expression resolution
  const responsePreview = useMemo(() => {
    if (respondWith === 'noData') {
      return '(No response data)';
    } else if (respondWith === 'allIncomingItems') {
      return JSON.stringify([inputData], null, 2);
    } else if (respondWith === 'firstIncomingItem') {
      return JSON.stringify(inputData, null, 2);
    } else if (respondWith === 'json' || respondWith === 'text') {
      let preview = responseBody;
      
      // Resolve expressions
      const resolveExpression = (template: string): string => {
        return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
          const expr = expression.trim();
          
          // Handle $json.field paths
          let path = expr;
          if (path.startsWith('$json.')) {
            path = path.slice(6);
          } else if (path === '$json') {
            return JSON.stringify(inputData, null, 2);
          }
          
          // Special handling for common field names with format conversion
          if (path === 'httpResponse' && inputData.data !== undefined) {
            // Map httpResponse to data.value if data exists
            const value = inputData.data?.value || inputData.data;
            return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
          }
          
          // Navigate path
          const parts = path.split('.');
          let value: any = inputData;
          
          for (const part of parts) {
            if (value === null || value === undefined) break;
            value = value[part];
          }
          
          if (value === null || value === undefined) {
            return `(${path} not found)`;
          }
          
          return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        });
      };
      
      preview = resolveExpression(preview);
      return preview;
    }
    
    return JSON.stringify(inputData, null, 2);
  }, [respondWith, responseBody, inputData]);

  // Check if preview is XML
  const isPreviewXml = useMemo(() => {
    return typeof responsePreview === 'string' && responsePreview.trim().startsWith('<?xml');
  }, [responsePreview]);

  const handleAddHeader = () => {
    setResponseHeaders([...responseHeaders, { name: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setResponseHeaders(responseHeaders.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: 'name' | 'value', value: string) => {
    const newHeaders = [...responseHeaders];
    newHeaders[index][field] = value;
    setResponseHeaders(newHeaders);
  };

  const handleQuickField = (fieldKey: string) => {
    setRespondWith('json');
    setResponseBody(`{{ $json.${fieldKey} }}`);
  };

  const handleCopyExpression = (fieldKey: string) => {
    navigator.clipboard.writeText(`{{ $json.${fieldKey} }}`);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = () => {
    const config = {
      respondWith,
      responseBody: (respondWith === 'json' || respondWith === 'text') ? responseBody : undefined,
      responseCode: parseInt(responseCode) || 200,
      responseHeaders: responseHeaders.filter(h => h.name && h.value),
    };
    onSave(config);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: '#131419', backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)', backgroundSize: '20px 20px' }}
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
        style={{ height: '85vh', maxWidth: '98vw', width: '95%' }}
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
          <div className="px-4 py-3 border-b border-[#333]">
            <span className="text-sm font-medium text-gray-400">INPUT</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {availableFields.length > 0 ? (
              <div className="space-y-2">
                {availableFields.map((field) => (
                  <div
                    key={field.key}
                    className={`flex items-start gap-3 p-2 rounded-md transition-colors ${
                      field.hasError
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-[#252525] border border-[#333]'
                    }`}
                  >
                    <div className="mt-0.5">{field.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${field.hasError ? 'text-red-300' : 'text-white'}`}>{field.label}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                          field.hasError ? 'bg-red-500/20 text-red-300' :
                          field.type === 'XML' ? 'bg-blue-500/20 text-blue-300' :
                          field.type === 'Text' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>{field.hasError ? 'ERROR' : field.type}</span>
                      </div>
                      <p className={`text-xs truncate ${field.hasError ? 'text-red-400/70' : 'text-gray-500'}`}>{field.preview}...</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-8">
                No input data available
              </div>
            )}
          </div>
        </div>

        {/* Main Config Panel - Center */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: '650px',
            flexShrink: 0,
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px #444',
            borderRadius: '8px',
            zIndex: 5,
            transform: 'scale(1.01)',
          }}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333]">
          <h2 className="text-base font-semibold text-white">Respond to Webhook</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Parameters Tab (like n8n) */}
            <div className="flex gap-1 border-b border-[#333]">
              <button className="px-4 py-2 text-sm text-white border-b-2 border-blue-500 font-medium">
                Parameters
              </button>
              <button className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                Settings
              </button>
            </div>

            {/* Warning message (like n8n) */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-md p-3">
              <p className="text-xs text-orange-300">
                ⚠️ Verify that the "Webhook" node's "Respond" parameter is set to "Using Respond to Webhook Node".{' '}
                <span className="text-orange-400 underline cursor-pointer">More details</span>
              </p>
            </div>

            {/* ============================================ */}
            {/* ⚠️ API ERROR WARNING */}
            {/* ============================================ */}
            {apiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-300">API returned an error!</p>
                    <p className="text-xs text-red-300/80 mt-1">
                      Error code: <code className="bg-red-500/20 px-1 rounded">{apiError.code}</code>
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      The external API (BusSystem) returned an error response. Check your API credentials or request parameters.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* 📥 INPUT SECTION */}
            {/* ============================================ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowDown className={`w-4 h-4 ${apiError ? 'text-red-400' : 'text-green-400'}`} />
                <Label className={`text-sm font-medium ${apiError ? 'text-red-400' : 'text-green-400'}`}>INPUT</Label>
                <span className="text-xs text-gray-500">({availableFields.length} fields available)</span>
                {apiError && <span className="text-xs text-red-400">(contains error)</span>}
              </div>
              
              {availableFields.length > 0 ? (
                <div className="bg-[#1a2e1a] border border-green-500/30 rounded-md p-3 space-y-2">
                  {availableFields.map((field) => (
                    <div 
                      key={field.key}
                      className={`flex items-start gap-3 p-2 rounded-md transition-colors ${
                        field.hasError 
                          ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/15' 
                          : 'hover:bg-green-500/10'
                      }`}
                    >
                      <div className="mt-0.5">{field.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${field.hasError ? 'text-red-300' : 'text-white'}`}>{field.label}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                            field.hasError ? 'bg-red-500/20 text-red-300' :
                            field.type === 'XML' ? 'bg-blue-500/20 text-blue-300' : 
                            field.type === 'Text' ? 'bg-purple-500/20 text-purple-300' : 
                            'bg-yellow-500/20 text-yellow-300'
                          }`}>{field.hasError ? 'ERROR' : field.type}</span>
                          <code className={`text-xs font-mono ${field.hasError ? 'text-red-400/60' : 'text-green-400/60'}`}>{`{{ $json.${field.key} }}`}</code>
                        </div>
                        <p className={`text-xs truncate ${field.hasError ? 'text-red-400/70' : 'text-gray-500'}`}>{field.preview}...</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyExpression(field.key)}
                          className="h-7 px-2 text-gray-400 hover:text-white hover:bg-green-500/10"
                          title="Copy expression"
                        >
                          {copiedField === field.key ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickField(field.key)}
                          className="h-7 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Full JSON option */}
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-green-500/10 transition-colors border-t border-green-500/20 pt-3 mt-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-300">All Data (JSON)</span>
                      <code className="ml-2 text-xs text-green-400/60 font-mono">{`{{ $json }}`}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRespondWith('json');
                        setResponseBody('{{ $json }}');
                      }}
                      className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-green-500/10"
                    >
                      Use
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
                  <p className="text-xs text-yellow-300">
                    ⚠️ No input data available. Connect this node to another node to see available fields.
                  </p>
                </div>
              )}
            </div>

            {/* Expression Warning */}
            {expressionWarning && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div className="text-xs text-red-300">
                  <p className="font-medium">Field "{expressionWarning.field}" not found in input data!</p>
                  <p className="text-red-300/70 mt-1">
                    Available fields: {expressionWarning.available.length > 0 
                      ? expressionWarning.available.join(', ') 
                      : 'none'}
                  </p>
                  {expressionWarning.suggested && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickField(expressionWarning.suggested!)}
                      className="h-6 px-2 text-xs text-red-400 hover:text-white hover:bg-red-500/20 mt-2"
                    >
                      Use {`{{ $json.${expressionWarning.suggested} }}`} instead
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Respond With */}
            <div className="space-y-3">
              <Label className="text-sm text-gray-300 font-normal">Respond With</Label>
              <Select value={respondWith} onValueChange={setRespondWith}>
                <SelectTrigger className="w-full bg-[#252525] border-[#444] text-white hover:bg-[#2a2a2a] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-[#444] z-[9999999]">
                  <SelectItem value="allIncomingItems" className="text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                    All Incoming Items
                  </SelectItem>
                  <SelectItem value="firstIncomingItem" className="text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                    First Incoming Item
                  </SelectItem>
                  <SelectItem value="json" className="text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                    JSON
                  </SelectItem>
                  <SelectItem value="noData" className="text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                    No Data
                  </SelectItem>
                  <SelectItem value="text" className="text-white hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                    Text
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Response Body - Only show for JSON/Text */}
            {(respondWith === 'json' || respondWith === 'text') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300 font-normal">Response Body</Label>
                  <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 bg-blue-500/20 rounded font-mono">fx</span>
                    Expression
                  </button>
                </div>
                <Textarea
                  value={responseBody}
                  onChange={(e) => setResponseBody(e.target.value)}
                  placeholder={respondWith === 'json' ? '{{ $json.httpResponse }}' : 'Enter text response'}
                  className="bg-[#1a1a1a] border-[#444] text-green-400 font-mono text-sm min-h-[120px] focus:border-blue-500"
                />
                
                {/* ============================================ */}
                {/* 📤 OUTPUT SECTION */}
                {/* ============================================ */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-blue-400" />
                    <Label className="text-sm text-blue-400 font-medium">OUTPUT</Label>
                    <span className="text-xs text-gray-500">(What will be sent back)</span>
                  </div>
                  
                  <div className="bg-[#1a1a2e] border border-blue-500/30 rounded-md overflow-hidden">
                    {/* Output metadata */}
                    <div className="bg-[#252535] px-3 py-2 border-b border-blue-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 uppercase">Status</span>
                          <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-300 rounded font-mono">{responseCode}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 uppercase">Type</span>
                          <span className={`px-1.5 py-0.5 text-xs rounded font-mono ${
                            isPreviewXml ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'
                          }`}>{isPreviewXml ? 'application/xml' : 'application/json'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(responsePreview)}
                        className="text-xs text-gray-400 hover:text-white p-1"
                        title="Copy output"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Output body */}
                    <div className="px-3 py-2 border-b border-blue-500/20">
                      <span className="text-[10px] text-gray-500 uppercase">Response Body</span>
                    </div>
                    <pre className={`p-4 text-xs font-mono overflow-auto max-h-[250px] ${isPreviewXml ? 'text-blue-300' : 'text-gray-300'}`}>
                      {responsePreview}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Options section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-300 font-normal">Options</Label>
              </div>
              
              {!showOptions && responseHeaders.length === 0 ? (
                <div className="bg-[#252525] border border-[#333] rounded-md p-4">
                  <p className="text-xs text-gray-500 text-center">No properties</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Response Code */}
                  {showOptions && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400">Response Code</Label>
                      <Input
                        type="number"
                        value={responseCode}
                        onChange={(e) => setResponseCode(e.target.value)}
                        placeholder="200"
                        className="bg-[#1a1a1a] border-[#444] text-white h-9"
                      />
                    </div>
                  )}
                  
                  {/* Response Headers */}
                  {responseHeaders.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400">Response Headers</Label>
                      {responseHeaders.map((header, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={header.name}
                            onChange={(e) => handleHeaderChange(index, 'name', e.target.value)}
                            placeholder="Header Name"
                            className="bg-[#1a1a1a] border-[#444] text-white h-9 flex-1"
                          />
                          <Input
                            value={header.value}
                            onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                            placeholder="Value"
                            className="bg-[#1a1a1a] border-[#444] text-white h-9 flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveHeader(index)}
                            className="h-9 w-9 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Add Option Button */}
              <div className="relative">
                <button 
                  onClick={() => setShowOptions(!showOptions)}
                  className="w-full bg-[#252525] border border-dashed border-[#444] rounded-md py-2 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-between px-3"
                >
                  <span>Add option</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {/* Dropdown for options */}
                {showOptions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#252525] border border-[#444] rounded-md shadow-lg z-10">
                    <button
                      onClick={() => {
                        handleAddHeader();
                        setShowOptions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#2a2a2a] transition-colors"
                    >
                      Response Headers
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#333] bg-[#222]">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            Save
          </Button>
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
          <div className="px-4 py-3 border-b border-[#333]">
            <span className="text-sm font-medium text-gray-400">OUTPUT</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {responsePreview ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-xs rounded font-mono ${
                    isPreviewXml ? 'bg-blue-500/20 text-blue-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>{isPreviewXml ? 'XML' : 'JSON'}</span>
                  <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-300 rounded font-mono">{responseCode}</span>
                </div>
                <pre className={`p-3 rounded-lg text-xs font-mono overflow-auto max-h-[400px] bg-[#252525] border border-[#333] ${isPreviewXml ? 'text-blue-300' : 'text-gray-300'}`}>
                  {responsePreview}
                </pre>
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-8">
                Configure response to see preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
