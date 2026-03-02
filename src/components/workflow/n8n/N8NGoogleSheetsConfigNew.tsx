import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  ChevronDown,
  Play,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Settings,
  RefreshCw,
  GripVertical,
  ArrowLeft,
  Pin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthContext';

// Google Sheets Icon
const GoogleSheetsIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div 
    className="flex items-center justify-center rounded"
    style={{ 
      width: size, 
      height: size, 
      background: 'linear-gradient(135deg, #34A853 0%, #0F9D58 100%)'
    }}
  >
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="white">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
      <path d="M7 7h10v2H7zM7 11h10v2H7zM7 15h7v2H7z"/>
    </svg>
  </div>
);

interface FilterCondition {
  id: string;
  column: string;
  operator: 'equals' | 'contains' | 'not_equals' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty';
  value: string;
}

interface GoogleSheetsConfig {
  resource: 'spreadsheet' | 'sheet';
  operation: string;
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  sheetId: string;
  title: string;
  filters: FilterCondition[];
  combineFilters: 'AND' | 'OR';
  options: {
    hidden?: boolean;
    rightToLeft?: boolean;
    sheetId?: string;
    sheetIndex?: number;
    tabColor?: string;
  };
  columnMapping?: Record<string, string>;
  // Column to match on for update operations
  matchColumn?: string;
  matchValue?: string;
  // Values to update - array of column/value pairs
  valuesToUpdate?: Array<{ column: string; value: string; isExpression: boolean }>;
  pinnedData?: any;
}

interface SpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NGoogleSheetsConfigNewProps {
  node: {
    id: string;
    label: string;
    icon?: string;
    config?: Partial<GoogleSheetsConfig>;
  };
  onClose: () => void;
  onSave: (config: GoogleSheetsConfig) => void;
  inputData?: any;
  outputData?: any;
  nodeSources?: NodeData[];
}

const RESOURCE_OPTIONS = [
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'sheet', label: 'Sheet Within Document' },
];

const SPREADSHEET_OPERATIONS = [
  { value: 'create', label: 'Create', description: 'Create a new spreadsheet' },
  { value: 'delete', label: 'Delete', description: 'Delete a spreadsheet' },
];

const SHEET_OPERATIONS = [
  { value: 'append-or-update', label: 'Append or Update Row', description: 'Append a new row or update an existing one' },
  { value: 'append', label: 'Append Row', description: 'Create a new row in a sheet' },
  { value: 'clear', label: 'Clear', description: 'Delete all the contents of a sheet' },
  { value: 'create', label: 'Create', description: 'Create a new sheet' },
  { value: 'delete', label: 'Delete', description: 'Permanently delete a sheet' },
  { value: 'get-rows', label: 'Get Row(s)', description: 'Retrieve one or more rows from a sheet' },
  { value: 'update', label: 'Update Row', description: 'Update an existing row in a sheet' },
];

export const N8NGoogleSheetsConfigNew: React.FC<N8NGoogleSheetsConfigNewProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  nodeSources,
}) => {
  const { session, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  
  // Spreadsheet data
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetFile[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [sheets, setSheets] = useState<{ sheetId: string; title: string }[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Config state
  const [config, setConfig] = useState<GoogleSheetsConfig>({
    resource: node.config?.resource || 'sheet',
    operation: node.config?.operation || 'get-rows',
    spreadsheetId: node.config?.spreadsheetId || '',
    spreadsheetName: node.config?.spreadsheetName || '',
    sheetName: node.config?.sheetName || '',
    sheetId: node.config?.sheetId || '',
    title: node.config?.title || '',
    filters: node.config?.filters || [],
    combineFilters: node.config?.combineFilters || 'AND',
    options: node.config?.options || {},
    columnMapping: node.config?.columnMapping || {},
    matchColumn: node.config?.matchColumn || '',
    matchValue: node.config?.matchValue || '',
    valuesToUpdate: node.config?.valuesToUpdate || [],
  });

  // Drag over states for expression fields
  const [matchValueDragOver, setMatchValueDragOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Pin data state
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);

  // Use pinned data as fallback when no live input data
  const effectiveInputData = inputData || pinnedData;

  // Handler for pinning data
  const handlePinData = (data: any) => {
    setPinnedData(data);
    toast.success('Data pinned! You can now test without re-running previous nodes.');
  };

  // Load spreadsheets on mount
  useEffect(() => {
    if (!authLoading && session) {
      fetchSpreadsheets();
    }
  }, [authLoading, session]);

  // Load sheet structure when spreadsheetId is set (on mount or change)
  useEffect(() => {
    console.log('useEffect for spreadsheetId triggered:', config.spreadsheetId, 'authLoading:', authLoading, 'session:', !!session);
    if (config.spreadsheetId && session && !authLoading) {
      console.log('Calling fetchSheetStructure for:', config.spreadsheetId);
      fetchSheetStructure(config.spreadsheetId);
    }
  }, [config.spreadsheetId, authLoading, session]);

  const fetchSpreadsheets = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user?.id) return;
    
    setIsLoadingSheets(true);

    try {
      const { data: listData, error: fnError } = await supabase.functions.invoke(
        'list-google-sheets-oauth',
        { method: 'GET' }
      );

      if (fnError) throw fnError;
      const data = listData as any;
      
      if (data?.error) {
        if (data.code === 'NO_CONNECTION') {
          setIsConnected(false);
          return;
        }
        toast.error(`Eroare: ${data.error}`);
        return;
      }

      if (data?.files) {
        setSpreadsheets(data.files);
        setIsConnected(true);
      }
    } catch (error: any) {
      console.error('Error fetching spreadsheets:', error);
      toast.error('Eroare la încărcarea fișierelor');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGoogle = async () => {
    console.log('handleConnectGoogle called');
    setIsConnecting(true);

    try {
      // Get current session to ensure auth header is sent
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session data:', sessionData?.session ? 'exists' : 'missing');

      if (!sessionData?.session) {
        toast.error('Nu ești autentificat. Te rog să te loghezi din nou.');
        setIsConnecting(false);
        return;
      }

      console.log('Calling google-sheets-oauth-init...');

      // Call with explicit auth header
      const { data, error } = await supabase.functions.invoke('google-sheets-oauth-init', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      console.log('OAuth init response:', data, error);

      if (error) throw error;

      // Check if response contains error
      if (data?.error || data?.code === 'UNAUTHORIZED') {
        throw new Error(data?.userMessage || data?.message || 'Eroare de autentificare');
      }

      if (data?.success && data?.authUrl) {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        console.log('Opening popup with URL:', data.authUrl);

        const popup = window.open(
          data.authUrl,
          'google-auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Check if popup was blocked
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          toast.error('Popup blocat! Permite popup-urile pentru acest site sau folosește butonul din pagina principală de integrări.');
          // Fallback: redirect in same window
          const shouldRedirect = window.confirm('Popup-ul a fost blocat. Vrei să te redirecționăm către Google în această fereastră?');
          if (shouldRedirect) {
            window.location.href = data.authUrl;
          }
          setIsConnecting(false);
          return;
        }

        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setIsConnecting(false);
            setTimeout(fetchSpreadsheets, 1000);
          }
        }, 1000);
      } else {
        throw new Error('Nu s-a primit URL-ul de autorizare');
      }
    } catch (error: any) {
      console.error('Google connect error:', error);
      toast.error(error.message || 'Eroare la conectarea cu Google');
      setIsConnecting(false);
    }
  };

  const fetchSheetStructure = async (spreadsheetId: string) => {
    if (!spreadsheetId) return;
    
    console.log('fetchSheetStructure called with:', spreadsheetId);
    setIsLoadingStructure(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user?.id) {
        console.log('No session found');
        return;
      }
      
      const { data: sheetData, error: fnError } = await supabase.functions.invoke(
        `get-sheet-structure-oauth?spreadsheet_id=${encodeURIComponent(spreadsheetId)}`,
        { method: 'GET' }
      );

      if (fnError) throw fnError;

      const data = sheetData as any;
      console.log('Sheet structure response:', data);
      
      if (data?.error) {
        console.error('Error from API:', data.error);
        toast.error(data.error);
        return;
      }
      
      if (data?.sheets && data.sheets.length > 0) {
        console.log('Setting sheets:', data.sheets);
        setSheets(data.sheets);
        // Auto-select first sheet if none selected
        if (!config.sheetName) {
          updateConfig({ 
            sheetName: data.sheets[0].title,
            sheetId: data.sheets[0].sheetId 
          });
        }
      }
      if (data?.columns && data.columns.length > 0) {
        console.log('Setting columns:', data.columns);
        setColumns(data.columns);
      } else if (data?.headers && data.headers.length > 0) {
        // Fallback: use headers if columns is not present
        console.log('Setting columns from headers:', data.headers);
        setColumns(data.headers);
      }
    } catch (error: any) {
      console.error('Error fetching sheet structure:', error);
      toast.error('Eroare la încărcarea structurii');
    } finally {
      setIsLoadingStructure(false);
    }
  };

  const executeStep = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user?.id) {
        throw new Error('Nu ești autentificat');
      }
      
      const response = await fetch(
        'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/execute-google-sheets',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({
            user_id: currentSession.user.id,
            resource: config.resource,
            operation: config.operation,
            spreadsheet_id: config.spreadsheetId,
            sheet_name: config.sheetName || '',
            title: config.title,
            filters: config.filters.filter(f => f.column && f.value),
            combine_filters: config.combineFilters,
            input_data: effectiveInputData,
          }),
        }
      );
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setExecutionResult(result);
      toast.success('Execuție reușită!');
      
    } catch (error: any) {
      setExecutionError(error.message);
      toast.error(`Eroare: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const updateConfig = (updates: Partial<GoogleSheetsConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}`,
      column: columns[0] || '',
      operator: 'equals',
      value: '',
    };
    updateConfig({ filters: [...config.filters, newFilter] });
  };

  const removeFilter = (id: string) => {
    updateConfig({ filters: config.filters.filter(f => f.id !== id) });
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    updateConfig({
      filters: config.filters.map(f => f.id === id ? { ...f, ...updates } : f),
    });
  };

  // Values to Update management
  const addValueToUpdate = () => {
    const newValue = {
      column: columns[0] || '',
      value: '',
      isExpression: false,
    };
    updateConfig({ 
      valuesToUpdate: [...(config.valuesToUpdate || []), newValue] 
    });
  };

  const removeValueToUpdate = (index: number) => {
    const updated = [...(config.valuesToUpdate || [])];
    updated.splice(index, 1);
    updateConfig({ valuesToUpdate: updated });
  };

  const updateValueToUpdate = (index: number, updates: Partial<{ column: string; value: string; isExpression: boolean }>) => {
    const updated = [...(config.valuesToUpdate || [])];
    updated[index] = { ...updated[index], ...updates };
    updateConfig({ valuesToUpdate: updated });
  };

  // Handle drop on value field
  const handleValueDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const field = JSON.parse(jsonData);
        const expression = field.expression || `{{ $json.${field.path} }}`;
        updateValueToUpdate(index, { value: expression, isExpression: true });
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Handle drop on match value field
  const handleMatchValueDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMatchValueDragOver(false);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const field = JSON.parse(jsonData);
        const expression = field.expression || `{{ $json.${field.path} }}`;
        updateConfig({ matchValue: expression });
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleSave = () => {
    onSave({ ...config, pinnedData });
    onClose();
  };

  const currentOperations = config.resource === 'spreadsheet' ? SPREADSHEET_OPERATIONS : SHEET_OPERATIONS;
  const selectedOperation = currentOperations.find(op => op.value === config.operation);
  // Prioritize loaded data from execution history
  const currentOutputData = outputData || executionResult;

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
        style={{ height: '85vh', maxWidth: '98vw', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
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
            style={{ borderBottom: '1px solid #333' }}
          >
            <div className="flex items-center gap-3">
              <GoogleSheetsIcon size={32} />
              <div>
                <h3 className="text-white font-medium">Google Sheets</h3>
                <p className="text-gray-400 text-xs">Read/write spreadsheets</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={executeStep}
                disabled={isExecuting || !config.spreadsheetId}
                className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white text-xs h-8"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Execute step
                  </>
                )}
              </Button>
              
              <button
                onClick={handleSave}
                className="p-1.5 hover:bg-[#333] rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#333]">
            <button
              onClick={() => setActiveTab('parameters')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'parameters'
                  ? 'text-[#ff6b35] border-b-2 border-[#ff6b35]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Parameters
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-[#ff6b35] border-b-2 border-[#ff6b35]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Settings
            </button>
            <a
              href="https://docs.google.com/spreadsheets"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)', minHeight: '400px' }}>
            {activeTab === 'parameters' && (
              <div className="p-4 space-y-4">
                {/* Credential */}
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs font-medium">Credential to connect with</Label>
                  {isConnected ? (
                    <div className="flex items-center gap-2">
                      <Select value="connected" disabled>
                        <SelectTrigger className="bg-[#252525] border-[#333] text-white flex-1">
                          <SelectValue>
                            <span className="text-green-400">Google Account</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="connected">Google Account</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchSpreadsheets}
                        className="text-gray-400 hover:text-white"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleConnectGoogle}
                      disabled={isConnecting}
                      className="w-full bg-[#4285F4] hover:bg-[#3574e2] text-white disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Se conectează...
                        </>
                      ) : (
                        '🔗 Conectează cu Google'
                      )}
                    </Button>
                  )}
                  <p className="text-gray-500 text-xs">Google Sheets OAuth2 API</p>
                </div>

                {/* Resource */}
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs font-medium">Resource</Label>
                  <Select
                    value={config.resource}
                    onValueChange={(value: 'spreadsheet' | 'sheet') => {
                      updateConfig({ 
                        resource: value,
                        operation: value === 'spreadsheet' ? 'create' : 'get-rows'
                      });
                    }}
                  >
                    <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operation */}
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs font-medium">Operation</Label>
                  <Select
                    value={config.operation}
                    onValueChange={(value) => updateConfig({ operation: value })}
                  >
                    <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                      <SelectValue>
                        {selectedOperation && (
                          <span className="text-green-400">{selectedOperation.label}</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {currentOperations.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          <div>
                            <span className="text-green-400">{op.label}</span>
                            <p className="text-gray-500 text-xs">{op.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedOperation && (
                    <p className="text-gray-500 text-xs">{selectedOperation.description}</p>
                  )}
                </div>

                {/* Document Selection */}
                {config.resource === 'sheet' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-400 text-xs font-medium">Document</Label>
                      <div className="flex gap-2 text-xs">
                        <span className="text-gray-500">Fixed</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">Expression</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select value="list" disabled>
                        <SelectTrigger className="bg-[#252525] border-[#333] text-white w-28">
                          <SelectValue>From list</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="list">From list</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={config.spreadsheetId}
                        onValueChange={(value) => {
                          const selected = spreadsheets.find(s => s.id === value);
                          updateConfig({ 
                            spreadsheetId: value,
                            spreadsheetName: selected?.name || '',
                          });
                          fetchSheetStructure(value);
                        }}
                      >
                        <SelectTrigger className="bg-[#252525] border-[#333] text-white flex-1">
                          <SelectValue placeholder="Choose...">
                            {config.spreadsheetName || 'Choose...'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingSheets ? (
                            <div className="p-2 text-center text-gray-400">
                              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                              Loading...
                            </div>
                          ) : spreadsheets.length === 0 ? (
                            <div className="p-2 text-center text-gray-400">
                              No spreadsheets found
                            </div>
                          ) : (
                            spreadsheets.map(sheet => (
                              <SelectItem key={sheet.id} value={sheet.id}>
                                {sheet.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Sheet Selection */}
                {config.resource === 'sheet' && config.spreadsheetId && (
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-medium">Sheet</Label>
                    <Select
                      value={config.sheetName}
                      onValueChange={(value) => {
                        const selected = sheets.find(s => s.title === value);
                        updateConfig({ 
                          sheetName: value,
                          sheetId: selected?.sheetId || '',
                        });
                      }}
                    >
                      <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                        <SelectValue placeholder={isLoadingStructure ? "Loading sheets..." : "Select sheet..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingStructure ? (
                          <div className="p-2 text-center text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                            Loading...
                          </div>
                        ) : sheets.length === 0 ? (
                          <div className="p-2 text-center text-gray-400">
                            Select a document first
                          </div>
                        ) : (
                          sheets.map(sheet => (
                            <SelectItem key={sheet.sheetId} value={sheet.title}>
                              {sheet.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Filters for Get Rows */}
                {config.operation === 'get-rows' && (
                  <div className="space-y-3">
                    <Label className="text-gray-400 text-xs font-medium">Filters</Label>
                    
                    {config.filters.map((filter, index) => (
                      <div key={filter.id} className="bg-[#252525] rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">Filter {index + 1}</span>
                          <button
                            onClick={() => removeFilter(filter.id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <Select
                          value={filter.column}
                          onValueChange={(value) => updateFilter(filter.id, { column: value })}
                        >
                          <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white text-sm">
                            <SelectValue placeholder={isLoadingStructure ? "Loading columns..." : "Select column..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingStructure ? (
                              <div className="p-2 text-center text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                Loading...
                              </div>
                            ) : columns.length === 0 ? (
                              <div className="p-2 text-center text-gray-400">
                                Select a document first
                              </div>
                            ) : (
                              columns.map(col => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={filter.operator}
                          onValueChange={(value: FilterCondition['operator']) => 
                            updateFilter(filter.id, { operator: value })
                          }
                        >
                          <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Not Equals</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="starts_with">Starts With</SelectItem>
                            <SelectItem value="ends_with">Ends With</SelectItem>
                            <SelectItem value="is_empty">Is Empty</SelectItem>
                            <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                          <Input
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            placeholder="Enter value..."
                            className="bg-[#1a1a1a] border-[#333] text-white text-sm"
                          />
                        )}
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addFilter}
                      className="w-full border-dashed border-[#333] text-gray-400"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Filter
                    </Button>
                    
                    {config.filters.length > 1 && (
                      <Select
                        value={config.combineFilters}
                        onValueChange={(value: 'AND' | 'OR') => updateConfig({ combineFilters: value })}
                      >
                        <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">Match ALL filters (AND)</SelectItem>
                          <SelectItem value="OR">Match ANY filter (OR)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Values to Update - for update/append operations */}
                {['update', 'append', 'append-or-update'].includes(config.operation) && config.sheetName && (
                  <div className="space-y-3">
                    {/* Column to match on */}
                    {['update', 'append-or-update'].includes(config.operation) && (
                      <div className="space-y-2">
                        <Label className="text-gray-400 text-xs font-medium">Column to match on</Label>
                        <Select
                          value={config.matchColumn || ''}
                          onValueChange={(value) => updateConfig({ matchColumn: value })}
                        >
                          <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                            <SelectValue placeholder="Select column..." />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map(col => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-gray-500 text-[10px]">
                          The column to use when matching rows in Google Sheets to the input items of this node. Usually an ID.
                        </p>
                      </div>
                    )}

                    {/* Match value with expression support */}
                    {config.matchColumn && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-400 text-xs font-medium">
                            {config.matchColumn} (using to match)
                          </Label>
                          <span className="text-[10px] text-green-400">
                            {config.matchValue?.includes('{{') ? 'Expression' : 'Fixed'}
                          </span>
                        </div>
                        <div
                          className={`relative rounded-md transition-all ${
                            matchValueDragOver 
                              ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-[#1a1a1a]' 
                              : ''
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setMatchValueDragOver(true); }}
                          onDragLeave={(e) => { e.preventDefault(); setMatchValueDragOver(false); }}
                          onDrop={handleMatchValueDrop}
                        >
                          {config.matchValue?.includes('{{') && (
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">
                                fx
                              </span>
                            </div>
                          )}
                          <Input
                            value={config.matchValue || ''}
                            onChange={(e) => updateConfig({ matchValue: e.target.value })}
                            placeholder="Drag expression or enter value..."
                            className={`${
                              config.matchValue?.includes('{{')
                                ? 'pl-10 bg-[#1a2e1a] border-green-500/30 text-green-400 font-mono'
                                : 'bg-[#252525] border-[#333] text-white'
                            }`}
                          />
                        </div>
                        {config.matchValue?.includes('{{') && effectiveInputData && (
                          <p className="text-gray-400 text-[10px] font-mono">
                            Preview: {(() => {
                              const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
                              const match = config.matchValue?.match(/\$json\.(\w+)/);
                              if (match && data) return String(data[match[1]] ?? '');
                              return '';
                            })()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Values to Update */}
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-xs font-medium">Values to Update</Label>
                      
                      {(config.valuesToUpdate || []).map((item, index) => (
                        <div key={index} className="bg-[#252525] rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <GripVertical className="w-3 h-3" />
                              {item.column || `Column ${index + 1}`}
                            </span>
                            <button
                              onClick={() => removeValueToUpdate(index)}
                              className="text-gray-400 hover:text-red-400 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          
                          {/* Column selector */}
                          <Select
                            value={item.column}
                            onValueChange={(value) => updateValueToUpdate(index, { column: value })}
                          >
                            <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white text-sm">
                              <SelectValue placeholder="Select column..." />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map(col => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* Value with expression support */}
                          <div
                            className={`relative rounded-md transition-all ${
                              dragOverIndex === index 
                                ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-[#1a1a1a]' 
                                : ''
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                            onDragLeave={(e) => { e.preventDefault(); setDragOverIndex(null); }}
                            onDrop={(e) => handleValueDrop(index, e)}
                          >
                            {item.isExpression && (
                              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">
                                  fx
                                </span>
                              </div>
                            )}
                            <Input
                              value={item.value}
                              onChange={(e) => updateValueToUpdate(index, { 
                                value: e.target.value,
                                isExpression: e.target.value.includes('{{'),
                              })}
                              placeholder="Drag from INPUT or type value..."
                              className={`${
                                item.isExpression
                                  ? 'pl-10 bg-[#1a2e1a] border-green-500/30 text-green-400 font-mono text-sm'
                                  : 'bg-[#1a1a1a] border-[#333] text-white text-sm'
                              }`}
                            />
                            {dragOverIndex === index && (
                              <div className="absolute inset-0 bg-green-500/10 rounded-md border-2 border-dashed border-green-500 flex items-center justify-center pointer-events-none">
                                <span className="text-green-400 text-xs font-medium">Drop here</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Preview */}
                          {item.isExpression && effectiveInputData && (
                            <p className="text-gray-400 text-[10px] font-mono">
                              {(() => {
                                const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
                                const match = item.value?.match(/\$json\.(\w+)/);
                                if (match && data) return String(data[match[1]] ?? '');
                                return item.value;
                              })()}
                            </p>
                          )}
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addValueToUpdate}
                        className="w-full border-dashed border-[#333] text-gray-400"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add column to send
                      </Button>
                    </div>
                  </div>
                )}

                {/* Options */}
                <Collapsible open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs font-medium">Options</Label>
                    <p className="text-gray-500 text-xs">No properties</p>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed border-[#333] text-gray-400 justify-between"
                      >
                        Add option
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOptionsOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="mt-2 space-y-2 bg-[#252525] rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">Hidden</span>
                      <Switch 
                        checked={config.options.hidden || false}
                        onCheckedChange={(checked) => 
                          updateConfig({ options: { ...config.options, hidden: checked } })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">Right To Left</span>
                      <Switch 
                        checked={config.options.rightToLeft || false}
                        onCheckedChange={(checked) => 
                          updateConfig({ options: { ...config.options, rightToLeft: checked } })
                        }
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Execution Error */}
                {executionError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{executionError}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Continue on fail</p>
                      <p className="text-gray-500 text-xs">Continue workflow even if this node fails</p>
                    </div>
                    <Switch />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Always output data</p>
                      <p className="text-gray-500 text-xs">Output data even if empty</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-4 py-3"
            style={{ borderTop: '1px solid #333' }}
          >
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-[#333]"
            >
              Close
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#34A853] hover:bg-[#2d9248] text-white"
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
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="OUTPUT"
              data={currentOutputData}
              isLoading={isExecuting}
              error={executionError}
            />
          </div>
        </div>
      </div>
    </div>;

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default N8NGoogleSheetsConfigNew;
