import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Minimize2, Maximize2, FileSpreadsheet, Plus, Settings, ChevronDown, Trash2, ExternalLink, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/AuthContext';

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
}

interface SpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface N8NGoogleSheetsConfigProps {
  node: {
    id: string;
    label: string;
    icon?: string;
    config?: Partial<GoogleSheetsConfig>;
  };
  onClose: () => void;
  onSave: (config: GoogleSheetsConfig) => void;
}

const CREDENTIALS_KEY = 'kalina-google-sheets-credentials';

const resourceOptions = [
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'sheet', label: 'Sheet Within Document' },
];

const spreadsheetOperations = [
  { value: 'create', label: 'Create', description: 'Create a new spreadsheet' },
  { value: 'delete', label: 'Delete', description: 'Delete a spreadsheet' },
];

const sheetOperations = [
  { value: 'append-or-update', label: 'Append or Update Row', description: 'Append a new row or update an existing one (upsert)' },
  { value: 'append', label: 'Append Row', description: 'Create a new row in a sheet' },
  { value: 'clear', label: 'Clear', description: 'Delete all the contents or a part of a sheet' },
  { value: 'create', label: 'Create', description: 'Create a new sheet' },
  { value: 'delete', label: 'Delete', description: 'Permanently delete a sheet' },
  { value: 'delete-rows-columns', label: 'Delete Rows or Columns', description: 'Delete columns or rows from a sheet' },
  { value: 'get-rows', label: 'Get Row(s)', description: 'Retrieve one or more rows from a sheet' },
  { value: 'update', label: 'Update Row', description: 'Update an existing row in a sheet' },
];

export const N8NGoogleSheetsConfig: React.FC<N8NGoogleSheetsConfigProps> = ({
  node,
  onClose,
  onSave
}) => {
  const { session, loading: authLoading } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  
  // Spreadsheet list
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetFile[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sheet list and columns
  const [sheets, setSheets] = useState<{ sheetId: string; title: string }[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);
  
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
  });

  // Load spreadsheets on mount - wait for auth to be ready
  useEffect(() => {
    if (!authLoading && session) {
      fetchSpreadsheets();
    }
  }, [authLoading, session]);

  const fetchSpreadsheets = async () => {
    // Verify session is valid before making the request
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user?.id) {
      console.log('No active session, skipping fetchSpreadsheets');
      return;
    }
    
    setIsLoadingSheets(true);
    const userId = currentSession.user.id;
    console.log('Fetching spreadsheets with user_id:', userId);
    try {
      // Use URL query parameter - 100% reliable
      const response = await fetch(
        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/list-google-sheets-oauth?user_id=${userId}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      const error = !response.ok ? { message: data.error || 'Request failed' } : null;

      console.log('list-google-sheets-oauth response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Handle specific error codes from the edge function
      if (data?.error) {
        console.log('API returned error:', data.error, 'Code:', data.code);
        
        if (data.code === 'NO_CONNECTION') {
          toast.info('Conectează-te cu Google pentru a accesa fișierele');
          return;
        } else if (data.code === 'OAUTH_TOKEN_EXPIRED') {
          toast.error('Sesiunea Google a expirat. Te rugăm să te reconectezi.');
          return;
        } else if (data.code === 'OAUTH_ACCESS_DENIED') {
          toast.error('Acces refuzat. Reconectează-te și acordă permisiunile necesare.');
          return;
        } else if (data.code === 'REQUEST_FAILED' && data.details?.includes('403')) {
          toast.error('Google Drive API nu este activat. Activează-l în Google Cloud Console.');
          return;
        } else {
          toast.error(`Eroare: ${data.error}`);
          return;
        }
      }

      if (data?.files) {
        console.log('Files loaded successfully:', data.files.length);
        setSpreadsheets(data.files);
      }
    } catch (error: any) {
      console.error('Error fetching spreadsheets:', error);
      toast.error('Eroare la încărcarea fișierelor Google Sheets');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      // Get current session to ensure auth header is sent
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast.error('Nu ești autentificat. Te rog să te loghezi din nou.');
        return;
      }

      // Call with explicit auth header
      const { data, error } = await supabase.functions.invoke('google-sheets-oauth-init', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;

      // Check if response contains error
      if (data?.error || data?.code === 'UNAUTHORIZED') {
        throw new Error(data?.userMessage || data?.message || 'Eroare de autentificare');
      }

      if (data?.success && data?.authUrl) {
        // Open in a popup window
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.authUrl,
          'google-sheets-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Listen for the popup to close and refresh spreadsheets
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            // Add delay to allow session to sync after OAuth
            setTimeout(() => {
              fetchSpreadsheets();
            }, 1500);
          }
        }, 500);
      } else {
        throw new Error(data?.error || 'Failed to initialize OAuth');
      }
    } catch (error: any) {
      toast.error('Eroare la conectarea cu Google');
      console.error(error);
    }
  };

  // Fetch sheet structure (sheets and columns) when a spreadsheet is selected
  const fetchSheetStructure = async (spreadsheetId: string) => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user?.id || !spreadsheetId) return;
    
    setIsLoadingStructure(true);
    try {
      const response = await fetch(
        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/get-sheet-structure-oauth?user_id=${currentSession.user.id}&spreadsheet_id=${spreadsheetId}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (data?.sheets) {
        setSheets(data.sheets);
        // Auto-select first sheet if none selected
        if (data.sheets.length > 0 && !config.sheetName) {
          updateConfig({ 
            sheetName: data.sheets[0].title,
            sheetId: data.sheets[0].sheetId
          });
        }
      }
      
      if (data?.columns) {
        setColumns(data.columns);
      }
    } catch (error) {
      console.error('Error fetching sheet structure:', error);
    } finally {
      setIsLoadingStructure(false);
    }
  };

  // Fetch columns when sheet changes
  const fetchColumnsForSheet = async (sheetName: string) => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user?.id || !config.spreadsheetId || !sheetName) return;
    
    setIsLoadingStructure(true);
    try {
      const response = await fetch(
        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/get-sheet-structure-oauth?user_id=${currentSession.user.id}&spreadsheet_id=${config.spreadsheetId}&sheet_name=${encodeURIComponent(sheetName)}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      if (data?.columns) {
        setColumns(data.columns);
      }
    } catch (error) {
      console.error('Error fetching columns:', error);
    } finally {
      setIsLoadingStructure(false);
    }
  };

  // Filter helpers
  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}`,
      column: '',
      operator: 'equals',
      value: ''
    };
    updateConfig({ filters: [...config.filters, newFilter] });
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    updateConfig({
      filters: config.filters.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeFilter = (id: string) => {
    updateConfig({ filters: config.filters.filter(f => f.id !== id) });
  };

  const updateConfig = (updates: Partial<GoogleSheetsConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    onSave(config);
    toast.success('Configurație salvată');
  };

  const operations = config.resource === 'spreadsheet' ? spreadsheetOperations : sheetOperations;
  
  const filteredSpreadsheets = spreadsheets.filter(sheet => 
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
        onClick={() => setIsMinimized(false)}
      >
        <FileSpreadsheet className="w-4 h-4" style={{ color: '#34A853' }} />
        <span className="text-white text-sm">Google Sheets</span>
        <Maximize2 className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 overflow-hidden"
      style={{
        width: '420px',
        maxHeight: '600px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #333',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        right: '80px',
        top: '50%',
        transform: 'translateY(-50%)'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #333' }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center justify-center rounded-lg"
            style={{ 
              width: '32px', 
              height: '32px',
              backgroundColor: '#34A853'
            }}
          >
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>
            Google Sheets
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#FF6D5A] hover:bg-[#FF5A45] text-white text-xs"
          >
            Execute step
          </Button>
          <button 
            onClick={() => setIsMinimized(true)}
            className="hover:bg-[#333] rounded p-1 transition-colors"
          >
            <Minimize2 style={{ width: '16px', height: '16px', color: '#888' }} />
          </button>
          <button 
            onClick={onClose}
            className="hover:bg-[#333] rounded p-1 transition-colors"
          >
            <X style={{ width: '16px', height: '16px', color: '#888' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#333]">
        <button
          onClick={() => setActiveTab('parameters')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'parameters' 
              ? 'text-[#FF6D5A] border-b-2 border-[#FF6D5A]' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Parameters
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings' 
              ? 'text-[#FF6D5A] border-b-2 border-[#FF6D5A]' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Settings
        </button>
        <a 
          href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Docs ↗
        </a>
      </div>

      {/* Content */}
      <ScrollArea className="h-[450px]">
        {activeTab === 'parameters' && (
          <div className="p-4 space-y-4">
            {/* Credential */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs">Credential to connect with</Label>
              <div className="flex items-center gap-2">
                <Select value="google-account">
                  <SelectTrigger className="flex-1 bg-[#2a2a2a] border-[#444] text-white">
                    <SelectValue placeholder="Select credential" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-[#444]">
                    <SelectItem value="google-account" className="text-white hover:bg-[#333]">
                      <div className="flex flex-col items-start">
                        <span className="text-[#34A853]">Google Account</span>
                        <span className="text-xs text-gray-400">Google Sheets OAuth2 API</span>
                      </div>
                    </SelectItem>
                    <div 
                      className="px-2 py-2 text-sm text-white hover:bg-[#333] cursor-pointer flex items-center gap-2"
                      onClick={handleConnectGoogle}
                    >
                      <Plus className="w-4 h-4" />
                      Create new credential
                    </div>
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-[#333]"
                  onClick={handleConnectGoogle}
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            </div>

            {/* Resource */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs">Resource</Label>
              <Select 
                value={config.resource} 
                onValueChange={(value: 'spreadsheet' | 'sheet') => updateConfig({ resource: value, operation: value === 'spreadsheet' ? 'create' : 'append' })}
              >
                <SelectTrigger className="bg-[#2a2a2a] border-[#444] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#444]">
                  {resourceOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#333]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operation */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs">Operation</Label>
              <Select 
                value={config.operation} 
                onValueChange={(value) => updateConfig({ operation: value })}
              >
                <SelectTrigger className="bg-[#2a2a2a] border-[#444] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-[#444]">
                  {operations.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#333]">
                      <div className="flex flex-col items-start">
                        <span className={opt.value === config.operation ? 'text-[#34A853]' : ''}>{opt.label}</span>
                        <span className="text-xs text-gray-400">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document selection (for sheet operations) */}
            {config.resource === 'sheet' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300 text-xs">Document</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <button className="text-gray-400 hover:text-white">Fixed</button>
                    <span className="text-gray-600">|</span>
                    <button className="text-gray-400 hover:text-white">Expression</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value="from-list">
                    <SelectTrigger className="w-24 bg-[#2a2a2a] border-[#444] text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#444]">
                      <SelectItem value="from-list" className="text-white">From list</SelectItem>
                      <SelectItem value="by-url" className="text-white">By URL</SelectItem>
                      <SelectItem value="by-id" className="text-white">By ID</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={config.spreadsheetId} 
                    onValueChange={(value) => {
                      const sheet = spreadsheets.find(s => s.id === value);
                      updateConfig({ 
                        spreadsheetId: value,
                        spreadsheetName: sheet?.name || '',
                        sheetName: '',
                        sheetId: ''
                      });
                      // Fetch sheet structure
                      fetchSheetStructure(value);
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-[#2a2a2a] border-[#444] text-white">
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#444] max-h-[300px]">
                      <div className="p-2 sticky top-0 bg-[#2a2a2a]">
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-[#1a1a1a] border-[#444] text-white text-sm"
                        />
                      </div>
                      {isLoadingSheets ? (
                        <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
                      ) : filteredSpreadsheets.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                          {spreadsheets.length === 0 ? 'No spreadsheets found. Connect Google account.' : 'No results'}
                        </div>
                      ) : (
                        filteredSpreadsheets.map(sheet => (
                          <SelectItem 
                            key={sheet.id} 
                            value={sheet.id} 
                            className="text-white hover:bg-[#333]"
                          >
                            {sheet.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {config.spreadsheetId && (
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-[#333] rounded"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Sheet selection */}
            {config.resource === 'sheet' && config.spreadsheetId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300 text-xs">Sheet</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <button className="text-gray-400 hover:text-white">Fixed</button>
                    <span className="text-gray-600">|</span>
                    <button className="text-gray-400 hover:text-white">Expression</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value="from-list">
                    <SelectTrigger className="w-24 bg-[#2a2a2a] border-[#444] text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#444]">
                      <SelectItem value="from-list" className="text-white">From list</SelectItem>
                      <SelectItem value="by-name" className="text-white">By Name</SelectItem>
                      <SelectItem value="by-id" className="text-white">By ID</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={config.sheetName} 
                    onValueChange={(value) => {
                      const selectedSheet = sheets.find(s => s.title === value);
                      updateConfig({ 
                        sheetName: value,
                        sheetId: selectedSheet?.sheetId || ''
                      });
                      fetchColumnsForSheet(value);
                    }}
                  >
                    <SelectTrigger className="flex-1 bg-[#2a2a2a] border-[#444] text-white">
                      <SelectValue placeholder="Choose sheet..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#444]">
                      {isLoadingStructure ? (
                        <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
                      ) : sheets.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">No sheets found</div>
                      ) : (
                        sheets.map(sheet => (
                          <SelectItem 
                            key={sheet.sheetId} 
                            value={sheet.title} 
                            className="text-white hover:bg-[#333]"
                          >
                            {sheet.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {config.sheetName && (
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit#gid=${config.sheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-[#333] rounded"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Filters section (for get-rows operation) */}
            {config.resource === 'sheet' && config.operation === 'get-rows' && config.sheetName && (
              <div className="space-y-3">
                <Label className="text-gray-300 text-xs">Filters</Label>
                
                {config.filters.map((filter, index) => (
                  <div key={filter.id} className="space-y-2 p-3 bg-[#252525] rounded-lg border border-[#444]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-gray-400 text-xs">Column</Label>
                        <HelpCircle className="w-3 h-3 text-gray-500" />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button className="text-[#FF6D5A] hover:text-white">Fixed</button>
                        <span className="text-gray-600">|</span>
                        <button className="text-gray-400 hover:text-white">Expression</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => removeFilter(filter.id)}
                        className="p-1 hover:bg-[#333] rounded text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Select 
                        value={filter.column} 
                        onValueChange={(value) => updateFilter(filter.id, { column: value })}
                      >
                        <SelectTrigger className="flex-1 bg-[#2a2a2a] border-[#444] text-white">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a2a] border-[#444]">
                          {columns.length === 0 ? (
                            <div className="p-2 text-gray-400 text-sm">No columns found</div>
                          ) : (
                            columns.map(col => (
                              <SelectItem key={col} value={col} className="text-white hover:bg-[#333]">
                                {col}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {filter.column && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-gray-400 text-xs">Operator</Label>
                          <Select 
                            value={filter.operator} 
                            onValueChange={(value: FilterCondition['operator']) => updateFilter(filter.id, { operator: value })}
                          >
                            <SelectTrigger className="bg-[#2a2a2a] border-[#444] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2a2a2a] border-[#444]">
                              <SelectItem value="equals" className="text-white">Equals</SelectItem>
                              <SelectItem value="not_equals" className="text-white">Not Equals</SelectItem>
                              <SelectItem value="contains" className="text-white">Contains</SelectItem>
                              <SelectItem value="starts_with" className="text-white">Starts With</SelectItem>
                              <SelectItem value="ends_with" className="text-white">Ends With</SelectItem>
                              <SelectItem value="is_empty" className="text-white">Is Empty</SelectItem>
                              <SelectItem value="is_not_empty" className="text-white">Is Not Empty</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                          <div className="space-y-1">
                            <Label className="text-gray-400 text-xs">Value</Label>
                            <Input
                              value={filter.value}
                              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                              placeholder="Enter value..."
                              className="bg-[#2a2a2a] border-[#444] text-white"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full bg-[#2a2a2a] border-[#444] text-white hover:bg-[#333]"
                  onClick={addFilter}
                >
                  Add Filter
                </Button>
                
                {config.filters.length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-xs">Combine Filters</Label>
                    <Select 
                      value={config.combineFilters} 
                      onValueChange={(value: 'AND' | 'OR') => updateConfig({ combineFilters: value })}
                    >
                      <SelectTrigger className="bg-[#2a2a2a] border-[#444] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-[#444]">
                        <SelectItem value="AND" className="text-white">AND</SelectItem>
                        <SelectItem value="OR" className="text-white">OR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Title (for create operations) */}
            {(config.operation === 'create') && (
              <div className="space-y-2">
                <Label className="text-gray-300 text-xs">Title</Label>
                <Input
                  value={config.title}
                  onChange={(e) => updateConfig({ title: e.target.value })}
                  placeholder="Enter title..."
                  className="bg-[#2a2a2a] border-[#444] text-white"
                />
              </div>
            )}

            {/* Options */}
            <Collapsible open={isOptionsOpen} onOpenChange={setIsOptionsOpen}>
              <div className="space-y-2">
                <Label className="text-gray-300 text-xs">Options</Label>
                <p className="text-gray-500 text-xs">No properties</p>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full bg-[#2a2a2a] border-[#444] text-white hover:bg-[#333] justify-between"
                  >
                    Add option
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOptionsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-2 space-y-2">
                <div className="bg-[#2a2a2a] rounded-lg border border-[#444] divide-y divide-[#444]">
                  <div 
                    className="px-3 py-2 hover:bg-[#333] cursor-pointer text-white text-sm"
                    onClick={() => updateConfig({ options: { ...config.options, hidden: !config.options.hidden } })}
                  >
                    <div className="flex items-center justify-between">
                      <span>Hidden</span>
                      <Switch checked={config.options.hidden || false} />
                    </div>
                  </div>
                  <div 
                    className="px-3 py-2 hover:bg-[#333] cursor-pointer text-white text-sm"
                    onClick={() => updateConfig({ options: { ...config.options, rightToLeft: !config.options.rightToLeft } })}
                  >
                    <div className="flex items-center justify-between">
                      <span>Right To Left</span>
                      <Switch checked={config.options.rightToLeft || false} />
                    </div>
                  </div>
                  <div className="px-3 py-2 text-white text-sm">
                    <Label className="text-gray-400 text-xs">Sheet ID</Label>
                    <Input
                      value={config.options.sheetId || ''}
                      onChange={(e) => updateConfig({ options: { ...config.options, sheetId: e.target.value } })}
                      placeholder="Optional"
                      className="mt-1 bg-[#1a1a1a] border-[#444] text-white text-sm"
                    />
                  </div>
                  <div className="px-3 py-2 text-white text-sm">
                    <Label className="text-gray-400 text-xs">Sheet Index</Label>
                    <Input
                      type="number"
                      value={config.options.sheetIndex || ''}
                      onChange={(e) => updateConfig({ options: { ...config.options, sheetIndex: parseInt(e.target.value) || undefined } })}
                      placeholder="Optional"
                      className="mt-1 bg-[#1a1a1a] border-[#444] text-white text-sm"
                    />
                  </div>
                  <div className="px-3 py-2 text-white text-sm">
                    <Label className="text-gray-400 text-xs">Tab Color</Label>
                    <Input
                      value={config.options.tabColor || ''}
                      onChange={(e) => updateConfig({ options: { ...config.options, tabColor: e.target.value } })}
                      placeholder="#34A853"
                      className="mt-1 bg-[#1a1a1a] border-[#444] text-white text-sm"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300 text-xs">Node Settings</Label>
              <p className="text-gray-500 text-sm">
                Configure advanced settings for this node.
              </p>
            </div>
            
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
  );
};
