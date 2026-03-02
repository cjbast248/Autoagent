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
  Bus,
  MapPin,
  Calendar,
  DollarSign,
  Upload,
  Download,
  Search,
  RefreshCw,
  Pin,
  Info,
  Check,
} from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
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

interface DatabaseEntry {
  point_id: number;
  point_latin_name: string;
  point_ru_name?: string;
  point_ua_name?: string;
  country_name?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  currency?: string;
}

interface N8NGalltransRoutesConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: {
      query?: string;
      databaseEntries?: DatabaseEntry[];
      apiUrl?: string;
      password?: string;
      login?: string;
      currency?: string;
      transport?: string;
      useGroq?: boolean;
      returnRawResponse?: boolean;
      pinnedData?: any;
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

const TRANSPORT_OPTIONS = [
  { id: 'bus', name: 'Autobus', icon: '🚌' },
  { id: 'train', name: 'Tren', icon: '🚂' },
  { id: 'minibus', name: 'Microbuz', icon: '🚐' },
  { id: 'all', name: 'Toate', icon: '🚗' },
];

const CURRENCY_OPTIONS = [
  { id: 'EUR', name: 'Euro (EUR)' },
  { id: 'MDL', name: 'Leu Moldovenesc (MDL)' },
  { id: 'RON', name: 'Leu Românesc (RON)' },
  { id: 'USD', name: 'Dolar American (USD)' },
  { id: 'UAH', name: 'Hryvnia (UAH)' },
];

// ============================================
// HELPER COMPONENTS
// ============================================

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

const ExpressionInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resolvedValue?: string;
  onDrop?: (e: React.DragEvent) => void;
}> = ({ value, onChange, placeholder, resolvedValue, onDrop }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const isExpression = value.includes('{{');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (onDrop) onDrop(e);
  };

  return (
    <div className="space-y-1">
      {isExpression && (
        <div className="flex items-center gap-1 text-[10px] text-orange-400">
          <span className="px-1.5 py-0.5 bg-orange-500/20 rounded">fx</span>
          <span>Expression</span>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`w-full px-3 py-2 text-sm rounded-md transition-all ${isDragOver ? 'ring-2 ring-green-500' : ''}`}
        style={{
          backgroundColor: isExpression ? '#1a2e1a' : '#262626',
          border: `1px solid ${isExpression ? '#2d5a2d' : '#3f3f46'}`,
          color: isExpression ? '#4ade80' : '#fff',
          fontFamily: isExpression ? 'monospace' : 'inherit',
        }}
      />
      {resolvedValue && isExpression && (
        <div className="text-xs text-gray-500 mt-1 truncate">
          = {resolvedValue}
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const N8NGalltransRoutesConfig: React.FC<N8NGalltransRoutesConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  nodeSources,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings' | 'database'>('parameters');

  // Config state
  const [query, setQuery] = useState(node.config?.query || "{{ $('Chat Trigger').item.json['message'] }}");
  const [apiUrl, setApiUrl] = useState(node.config?.apiUrl || 'https://galltrans.com/api/route_search');
  const [password, setPassword] = useState(node.config?.password || 'A12345678');
  const [login, setLogin] = useState(node.config?.login || 'Aichat');
  const [currency, setCurrency] = useState(node.config?.currency || 'EUR');
  const [transport, setTransport] = useState(node.config?.transport || 'bus');
  const [useGroq, setUseGroq] = useState(node.config?.useGroq ?? true);
  const [returnRawResponse, setReturnRawResponse] = useState(node.config?.returnRawResponse ?? false);
  const [databaseEntries, setDatabaseEntries] = useState<DatabaseEntry[]>(node.config?.databaseEntries || []);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Pinned data
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);
  const effectiveInputData = inputData || pinnedData;

  // File input ref for database import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve expression
  const resolveExpression = (expr: string): string | null => {
    if (!expr || !expr.includes('{{')) return expr || null;

    const data = Array.isArray(effectiveInputData) ? effectiveInputData[0] : effectiveInputData;
    let resolved = expr;

    // Simple $json resolution
    resolved = resolved.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match, path) => {
      if (!data) return match;
      const parts = path.trim().split('.');
      let value: any = data;
      for (const part of parts) {
        value = value?.[part];
      }
      return value !== undefined ? String(value) : match;
    });

    // Node reference resolution
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\['([^']+)'\]\s*\}\}/g, (match, nodeName, path) => {
      const nodeSource = nodeSources?.find(n => n.nodeName === nodeName);
      if (nodeSource) {
        const nodeData = Array.isArray(nodeSource.data) ? nodeSource.data[0] : nodeSource.data;
        const value = nodeData?.[path];
        return value !== undefined ? String(value) : match;
      }
      if (data) {
        const value = data?.[path];
        return value !== undefined ? String(value) : match;
      }
      return match;
    });

    return resolved;
  };

  const resolvedQuery = resolveExpression(query);

  // Load database from local config (galltrans_points table doesn't exist)
  const loadDatabaseFromSupabase = async () => {
    // The galltrans_points table doesn't exist in the database
    // This is a placeholder for when the table is created
    toast.info('Funcționalitatea de încărcare din baza de date va fi disponibilă în curând');
  };

  // Import database from JSON file
  const handleImportDatabase = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (Array.isArray(data)) {
          setDatabaseEntries(data);
          toast.success(`Importat ${data.length} locații`);
        } else {
          toast.error('Format invalid - se așteaptă un array JSON');
        }
      } catch (error) {
        toast.error('Eroare la parsarea fișierului JSON');
      }
    };
    reader.readAsText(file);
  };

  // Export database to JSON file
  const handleExportDatabase = () => {
    const blob = new Blob([JSON.stringify(databaseEntries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'galltrans_locations.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Execute test
  const handleExecuteStep = async () => {
    if (!effectiveInputData && !resolvedQuery) {
      toast.error('No input data. Execute previous nodes first or enter a query.');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);

    try {
      console.log('[Galltrans Routes] Starting test execution...');

      // Build test query
      const testQuery = resolvedQuery || 'Chisinau Bucuresti 2026-01-25';

      // Call the workflow API endpoint (or simulate locally)
      const response = await supabase.functions.invoke('workflow-execute-node', {
        body: {
          nodeType: 'galltrans-routes',
          config: {
            query: testQuery,
            databaseEntries,
            apiUrl,
            password,
            login,
            currency,
            transport,
            useGroq,
            returnRawResponse,
          },
          inputData: effectiveInputData || { message: testQuery },
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setExecutionResult(response.data);
      toast.success('Execuție completă!');
    } catch (error: any) {
      console.error('[Galltrans Routes] Error:', error);
      setExecutionError(error.message);
      toast.error(`Eroare: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle pin data
  const handlePinData = (data: any) => {
    setPinnedData(data);
    toast.success('Date fixate!');
  };

  // Save config
  const handleSave = () => {
    onSave({
      query,
      databaseEntries,
      apiUrl,
      password,
      login,
      currency,
      transport,
      useGroq,
      returnRawResponse,
      pinnedData,
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
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#404040', borderRadius: '8px 8px 0 0' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded"
                style={{ width: '32px', height: '32px', backgroundColor: '#2563eb' }}
              >
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white text-sm font-medium">Galltrans Routes</span>
                <div className="text-[10px] text-gray-400">Căutare rute de transport</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pinnedData && !inputData && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}
                >
                  <Pin className="w-3 h-3" style={{ transform: 'rotate(45deg)' }} />
                  Pinned
                </div>
              )}
              <button
                onClick={handleExecuteStep}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: '#10b981',
                  color: '#fff',
                  opacity: isExecuting ? 0.5 : 1,
                }}
              >
                {isExecuting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                Test
              </button>
              <button onClick={handleSave} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: '#3f3f46', backgroundColor: '#1f1f1f' }}>
            {(['parameters', 'settings', 'database'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-6 py-2.5 text-xs font-medium transition-colors capitalize"
                style={{
                  color: activeTab === tab ? '#fff' : '#71717a',
                  borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                }}
              >
                {tab === 'database' ? `Database (${databaseEntries.length})` : tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#1a1a1a' }}>
            {/* Info banner */}
            <div
              className="mx-4 mt-4 p-3 rounded-md flex items-start gap-2 text-xs"
              style={{ backgroundColor: '#1e3a5f', border: '1px solid #2563eb' }}
            >
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-blue-300">
                <strong>Cum funcționează:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-0.5 text-blue-200/80">
                  <li>Parsează input-ul pentru a extrage orașele și data</li>
                  <li>Caută ID-urile orașelor în baza de date</li>
                  <li>Trimite cererea la API-ul Galltrans</li>
                  <li>Returnează rutele găsite</li>
                </ol>
              </div>
            </div>

            {activeTab === 'parameters' && (
              <div className="p-4 space-y-5">
                {/* Query Input */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Query Input
                  </label>
                  <ExpressionInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Chisinau Bucuresti 2026-01-25"
                    resolvedValue={resolvedQuery || undefined}
                  />
                  <div className="text-[10px] text-gray-500 mt-1">
                    Format: "Oraș1 Oraș2 YYYY-MM-DD" sau expresie template
                  </div>
                </div>

                {/* Resolved Preview */}
                {resolvedQuery && resolvedQuery !== query && (
                  <div
                    className="p-3 rounded-md"
                    style={{ backgroundColor: '#1a2e1a', border: '1px solid #2d5a2d' }}
                  >
                    <div className="flex items-center gap-2 text-xs text-green-400 mb-1">
                      <Check className="w-3 h-3" />
                      Valoare rezolvată:
                    </div>
                    <div className="text-sm text-green-300 font-mono">
                      {resolvedQuery}
                    </div>
                  </div>
                )}

                {/* Transport Type */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    <Bus className="w-3 h-3 inline mr-1" />
                    Tip Transport
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {TRANSPORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setTransport(opt.id)}
                        className="p-2 rounded-md text-xs transition-colors"
                        style={{
                          backgroundColor: transport === opt.id ? '#2563eb' : '#262626',
                          border: `1px solid ${transport === opt.id ? '#3b82f6' : '#3f3f46'}`,
                          color: transport === opt.id ? '#fff' : '#a1a1aa',
                        }}
                      >
                        <span className="text-lg">{opt.icon}</span>
                        <div className="mt-1">{opt.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">
                    <DollarSign className="w-3 h-3 inline mr-1" />
                    Valută
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-md"
                    style={{ backgroundColor: '#262626', border: '1px solid #3f3f46', color: '#fff' }}
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                {/* Use Groq */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="text-xs text-gray-400">Folosește Groq AI</label>
                    <div className="text-[10px] text-gray-600">Pentru extragere inteligentă a parametrilor</div>
                  </div>
                  <Toggle enabled={useGroq} onChange={setUseGroq} />
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-4 space-y-5">
                {/* API URL */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">API URL</label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md"
                    style={{ backgroundColor: '#262626', border: '1px solid #3f3f46', color: '#fff' }}
                  />
                </div>

                {/* Login */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Login</label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md"
                    style={{ backgroundColor: '#262626', border: '1px solid #3f3f46', color: '#fff' }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md"
                    style={{ backgroundColor: '#262626', border: '1px solid #3f3f46', color: '#fff' }}
                  />
                </div>

                {/* Return Raw Response */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="text-xs text-gray-400">Returnează răspuns complet</label>
                    <div className="text-[10px] text-gray-600">Include răspunsul brut de la API</div>
                  </div>
                  <Toggle enabled={returnRawResponse} onChange={setReturnRawResponse} />
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="p-4 space-y-4">
                {/* Database actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadDatabaseFromSupabase}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Încarcă din Supabase
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Import JSON
                  </button>
                  <button
                    onClick={handleExportDatabase}
                    disabled={databaseEntries.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" />
                    Export JSON
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportDatabase}
                    className="hidden"
                  />
                </div>

                {/* Database stats */}
                <div
                  className="p-3 rounded-md"
                  style={{ backgroundColor: '#262626', border: '1px solid #3f3f46' }}
                >
                  <div className="text-xs text-gray-400">
                    {databaseEntries.length} locații încărcate
                  </div>
                  {databaseEntries.length > 0 && (
                    <div className="text-[10px] text-gray-600 mt-1">
                      Exemple: {databaseEntries.slice(0, 5).map(e => e.point_latin_name).join(', ')}...
                    </div>
                  )}
                </div>

                {/* Database preview */}
                {databaseEntries.length > 0 && (
                  <div className="max-h-64 overflow-y-auto rounded-md" style={{ backgroundColor: '#1f1f1f' }}>
                    <table className="w-full text-xs">
                      <thead className="sticky top-0" style={{ backgroundColor: '#262626' }}>
                        <tr>
                          <th className="px-2 py-1.5 text-left text-gray-400">ID</th>
                          <th className="px-2 py-1.5 text-left text-gray-400">Nume</th>
                          <th className="px-2 py-1.5 text-left text-gray-400">Țară</th>
                        </tr>
                      </thead>
                      <tbody>
                        {databaseEntries.slice(0, 50).map((entry, idx) => (
                          <tr key={idx} className="border-t border-gray-800">
                            <td className="px-2 py-1.5 text-gray-300">{entry.point_id}</td>
                            <td className="px-2 py-1.5 text-white">{entry.point_latin_name}</td>
                            <td className="px-2 py-1.5 text-gray-400">{entry.country_name || entry.country_code || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {databaseEntries.length > 50 && (
                      <div className="px-2 py-1.5 text-[10px] text-gray-500 text-center">
                        ... și încă {databaseEntries.length - 50} locații
                      </div>
                    )}
                  </div>
                )}
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
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default N8NGalltransRoutesConfig;
