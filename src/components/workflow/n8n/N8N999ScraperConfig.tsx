import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Play, ExternalLink, Loader2, CheckCircle2, AlertCircle, Home, Zap, Clock, ChevronRight, ChevronDown, ArrowLeft, HelpCircle } from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { Scraper999Icon } from './BrandIcons';

// 999.md Scraper Configuration Interface
interface ScraperFilter {
  id: string;
  type: 'price_min' | 'price_max' | 'rooms' | 'area_min' | 'area_max' | 'district' | 'property_type';
  value: string;
}

interface Scraper999Config {
  // Base URL with filters already applied from 999.md
  targetUrl: string;
  // Maximum number of listings to scrape
  maxListings: number;
  // Whether to extract phone numbers (requires clicking)
  extractPhones: boolean;
  // Whether to extract ALL details from each listing page
  extractAllDetails: boolean;
  // Delay between requests (ms)
  requestDelay: number;
  // Additional filters (optional, for display purposes)
  filters: ScraperFilter[];
  // API endpoint URL (pentru microservice)
  apiEndpoint: string;
  // Number of parallel browsers
  parallelBrowsers: number;
}

// Fixed API endpoint - always use production
const SCRAPER_API_ENDPOINT = 'https://app.agentauto.app/scraper';

interface ScrapedListing {
  title: string;
  price: string;
  phone: string;
  description: string;
  region: string;
  link: string;
}

interface JobProgress {
  job_id: string;
  status: string;
  progress: number;
  total: number;
  phase: string;
  current_item?: string;
  estimated_remaining?: string;
  result?: {
    success: boolean;
    data?: ScrapedListing[];
    error?: string;
    count: number;
    duration_seconds?: number;
  };
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8N999ScraperConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: Scraper999Config;
  };
  onClose: () => void;
  onSave: (config: Scraper999Config) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
  nodeSources?: NodeData[];
}

// No default URL - user must provide their own filtered URL

export const N8N999ScraperConfig: React.FC<N8N999ScraperConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  nodeSources,
}) => {
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ScrapedListing[] | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);

  // Progress tracking
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const [config, setConfig] = useState<Scraper999Config>({
    targetUrl: node.config?.targetUrl || '',
    maxListings: node.config?.maxListings || 20,
    extractPhones: node.config?.extractPhones !== false,
    extractAllDetails: node.config?.extractAllDetails || false,
    requestDelay: node.config?.requestDelay || 2500,
    filters: node.config?.filters || [],
    apiEndpoint: SCRAPER_API_ENDPOINT, // Always use fixed endpoint
    parallelBrowsers: node.config?.parallelBrowsers || 5,
  });

  // State for help tooltip
  const [showUrlHelp, setShowUrlHelp] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const connectWebSocket = (jobId: string) => {
    // Construiește WebSocket URL bazat pe endpoint
    let wsUrl: string;
    if (config.apiEndpoint.includes('/scraper')) {
      // Folosim proxy-ul nginx de pe server - WebSocket merge prin același /scraper/ws/
      const origin = window.location.origin.replace('http://', 'ws://').replace('https://', 'wss://');
      wsUrl = `${origin}/scraper/ws/${jobId}`;
    } else {
      // Conexiune directă la microservice (localhost)
      wsUrl = config.apiEndpoint.replace('http://', 'ws://').replace('https://', 'wss://');
      wsUrl = `${wsUrl}/ws/${jobId}`;
    }
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.heartbeat) return;

        setJobProgress(data);

        if (data.status === 'completed' && data.result?.data) {
          setExecutionResult(data.result.data);
          setIsExecuting(false);
          ws.close();
        } else if (data.status === 'failed') {
          setExecutionError(data.result?.error || 'Job failed');
          setIsExecuting(false);
          ws.close();
        }
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };

    ws.onerror = () => {
      // Fallback to polling if WebSocket fails
      startPolling(jobId);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    wsRef.current = ws;
  };

  const startPolling = (jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const response = await fetch(`${config.apiEndpoint}/scrape/status/${jobId}`);
        const data = await response.json();

        setJobProgress(data);

        if (data.status === 'completed' && data.result?.data) {
          setExecutionResult(data.result.data);
          setIsExecuting(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        } else if (data.status === 'failed') {
          setExecutionError(data.result?.error || 'Job failed');
          setIsExecuting(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000);
  };

  const executeStep = async () => {
    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);
    setJobProgress(null);

    try {
      // Pentru liste mari (>50), folosește async cu progress
      const useAsync = config.maxListings > 50;
      const apiUrl = `${config.apiEndpoint}/scrape${useAsync ? '/async' : ''}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl: config.targetUrl,
          maxListings: config.maxListings,
          extractPhones: config.extractPhones,
          extractAllDetails: config.extractAllDetails,
          requestDelay: config.requestDelay,
          parallelBrowsers: config.parallelBrowsers,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (useAsync && result.job_id) {
        // Conectează la WebSocket pentru progress
        setJobProgress({
          job_id: result.job_id,
          status: 'pending',
          progress: 0,
          total: config.maxListings,
          phase: 'starting',
        });
        connectWebSocket(result.job_id);
      } else {
        // Sync response
        if (!result.success) {
          setExecutionError(result.error || 'Eroare necunoscută');
        } else if (result.data && result.data.length > 0) {
          setExecutionResult(result.data);
        } else {
          setExecutionError('Nu s-au găsit anunțuri');
        }
        setIsExecuting(false);
      }
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setExecutionError(`Nu se poate conecta la scraper. Asigură-te că microservice-ul rulează pe ${config.apiEndpoint}`);
      } else {
        setExecutionError(err.message || 'Eroare la execuție');
      }
      setIsExecuting(false);
    }
  };

  // Prepare output data
  // Prioritize loaded data from execution history over local execution result
  const currentOutputData = outputData || executionResult || null;

  // Calculate progress percentage
  const progressPercent = jobProgress
    ? Math.round((jobProgress.progress / Math.max(jobProgress.total, 1)) * 100)
    : 0;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: '#131419',
        backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSave(config);
          onClose();
        }
      }}
    >
      {/* Back to canvas button - absolute positioned */}
      <button
        onClick={() => {
          onSave(config);
          onClose();
        }}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      <div className="flex items-stretch" style={{ height: '85vh', maxWidth: '98vw', width: '95%' }}>
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
              data={inputData}
              enableDrag={true}
              nodeSources={nodeSources}
            />
          </div>
        </div>

        {/* Main Config Panel - Center */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            width: '700px',
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            zIndex: 5,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333' }}
          >
            <div className="flex items-center gap-3">
              <Scraper999Icon size={28} />
              <span style={{ color: '#d0d0d0', fontSize: '14px', fontWeight: 600 }}>
                999.md Scraper
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={executeStep}
                disabled={isExecuting || !config.targetUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: config.targetUrl ? '#3b82f6' : '#333',
                  color: config.targetUrl ? '#fff' : '#666',
                  cursor: config.targetUrl ? 'pointer' : 'not-allowed',
                }}
              >
                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Test Scraper
              </button>
              <button
                onClick={() => {
                  onSave(config);
                  onClose();
                }}
                className="p-1 hover:bg-[#333] rounded transition-colors"
              >
                <X className="w-4 h-4" style={{ color: '#888' }} />
              </button>
            </div>
          </div>

          {/* Progress Bar (when executing) */}
          {isExecuting && jobProgress && (
            <div className="px-4 py-3" style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #333' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#60a5fa' }} />
                  <span className="text-xs font-medium" style={{ color: '#cbd5e1' }}>
                    {jobProgress.phase === 'collecting_links' ? 'Colectare linkuri...' :
                     jobProgress.phase === 'extracting_details' ? 'Extragere detalii...' :
                     jobProgress.phase === 'queued' ? 'În așteptare...' :
                     'Procesare...'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    {jobProgress.progress} / {jobProgress.total}
                  </span>
                  {jobProgress.estimated_remaining && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
                      <Clock className="w-3 h-3" />
                      ~{jobProgress.estimated_remaining}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#334155' }}>
                <div
                  className="h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: '#60a5fa',
                  }}
                />
              </div>

              {/* Current item */}
              {jobProgress.current_item && (
                <p className="text-xs mt-2 truncate" style={{ color: '#64748b' }}>
                  {jobProgress.current_item}
                </p>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: '#333', backgroundColor: '#222' }}>
            {['parameters', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className="flex-1 px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  color: activeTab === tab ? '#fff' : '#888',
                  borderBottom: activeTab === tab ? '2px solid #60a5fa' : '2px solid transparent',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            <a
              href="https://999.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-4 py-2 text-xs font-medium transition-colors hover:text-white"
              style={{ color: '#888' }}
            >
              999.md <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#1a1a1a' }}>
            {activeTab === 'parameters' && (
              <div className="p-4 space-y-4">
                {/* Info Banner - Collapsible */}
                <div className="rounded-lg" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                  <button
                    onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)}
                    className="w-full p-3 flex items-center justify-between hover:bg-[#334155] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" style={{ color: '#94a3b8' }} />
                      <p className="text-xs font-medium" style={{ color: '#cbd5e1' }}>
                        Cum funcționează?
                      </p>
                    </div>
                    {isHowItWorksExpanded ? (
                      <ChevronDown className="w-4 h-4" style={{ color: '#94a3b8' }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: '#94a3b8' }} />
                    )}
                  </button>
                  {isHowItWorksExpanded && (
                    <div className="px-3 pb-3 pt-0">
                      <p className="text-xs" style={{ color: '#94a3b8' }}>
                        1. Mergi pe 999.md și aplică filtrele dorite<br/>
                        2. Copiază URL-ul din browser<br/>
                        3. Lipește URL-ul aici și rulează scraperul
                      </p>
                    </div>
                  )}
                </div>

                {/* Target URL - With Help and Validation */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium" style={{ color: '#fff' }}>
                      999.md URL
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowUrlHelp(!showUrlHelp)}
                        className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
                        title="Cum obțin URL-ul?"
                      >
                        <HelpCircle className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />
                      </button>

                      {/* Help Tooltip */}
                      {showUrlHelp && (
                        <div
                          className="absolute left-0 top-6 z-50 w-72 p-3 rounded-lg shadow-xl"
                          style={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6' }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-xs font-medium" style={{ color: '#60a5fa' }}>
                              Cum obții URL-ul corect?
                            </p>
                            <button
                              onClick={() => setShowUrlHelp(false)}
                              className="p-0.5 hover:bg-white/10 rounded"
                            >
                              <X className="w-3 h-3" style={{ color: '#94a3b8' }} />
                            </button>
                          </div>
                          <ol className="text-xs space-y-1.5" style={{ color: '#cbd5e1' }}>
                            <li>1. Deschide <a href="https://999.md" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">999.md</a> în browser</li>
                            <li>2. Alege categoria dorită (ex: Imobiliare)</li>
                            <li>3. Aplică filtrele dorite (preț, regiune, camere etc.)</li>
                            <li>4. <strong>Copiază URL-ul din bara de adrese</strong></li>
                            <li>5. Lipește-l aici</li>
                          </ol>
                          <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#0f172a' }}>
                            <p className="text-[10px] font-mono break-all" style={{ color: '#64748b' }}>
                              Exemplu: https://999.md/ro/list/real-estate/apartments-and-rooms?applied=1&o_30_1=776...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-red-400 text-xs">*</span>
                  </div>

                  <input
                    type="text"
                    value={config.targetUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, targetUrl: e.target.value }))}
                    placeholder="Lipește URL-ul de pe 999.md aici..."
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono"
                    style={{
                      backgroundColor: '#252525',
                      border: `1px solid ${!config.targetUrl ? '#ef4444' : '#333'}`,
                      color: '#fff',
                    }}
                  />

                  {/* Validation Error */}
                  {!config.targetUrl && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#ef4444' }}>
                      <AlertCircle className="w-3 h-3" />
                      <span>URL-ul este obligatoriu. Copiază-l din 999.md după ce aplici filtrele.</span>
                    </div>
                  )}

                  {/* URL format validation */}
                  {config.targetUrl && !config.targetUrl.includes('999.md') && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#fbbf24' }}>
                      <AlertCircle className="w-3 h-3" />
                      <span>URL-ul trebuie să fie de pe 999.md</span>
                    </div>
                  )}
                </div>

                {/* Max Listings & Parallel Workers - Combined Row */}
                <div className="flex items-start gap-4">
                  {/* Max Listings */}
                  <div className="flex-1">
                    <label className="text-xs font-medium mb-2 block" style={{ color: '#fff' }}>
                      Maximum Listings
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, maxListings: Math.max(1, prev.maxListings - 10) }))}
                        className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-colors hover:bg-opacity-80"
                        style={{ backgroundColor: '#333', color: '#fff' }}
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={config.maxListings}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          const num = parseInt(val) || 0;
                          setConfig(prev => ({ ...prev, maxListings: Math.min(10000, Math.max(0, num)) }));
                        }}
                        onBlur={() => {
                          if (config.maxListings < 1) {
                            setConfig(prev => ({ ...prev, maxListings: 1 }));
                          }
                        }}
                        className="flex-1 px-2 py-1.5 rounded text-xs text-center font-medium"
                        style={{
                          backgroundColor: '#252525',
                          border: '1px solid #333',
                          color: '#60a5fa',
                        }}
                      />
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, maxListings: Math.min(10000, prev.maxListings + 10) }))}
                        className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-colors hover:bg-opacity-80"
                        style={{ backgroundColor: '#333', color: '#fff' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Parallel Workers */}
                  <div className="flex-1">
                    <label className="text-xs font-medium mb-2 block" style={{ color: '#fff' }}>
                      Parallel Workers
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, parallelBrowsers: Math.max(1, prev.parallelBrowsers - 1) }))}
                        className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-colors hover:bg-opacity-80"
                        style={{ backgroundColor: '#333', color: '#fff' }}
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={config.parallelBrowsers}
                        readOnly
                        className="flex-1 px-2 py-1.5 rounded text-xs text-center font-medium"
                        style={{
                          backgroundColor: '#252525',
                          border: '1px solid #333',
                          color: '#60a5fa',
                        }}
                      />
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, parallelBrowsers: Math.min(10, prev.parallelBrowsers + 1) }))}
                        className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-colors hover:bg-opacity-80"
                        style={{ backgroundColor: '#333', color: '#fff' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warnings - Only show when needed */}
                {config.maxListings >= 500 && (
                  <div
                    className="p-2.5 rounded-lg"
                    style={{
                      backgroundColor: config.maxListings >= 5000 ? '#3d1a1a' : '#3d2d1a',
                      border: `1px solid ${config.maxListings >= 5000 ? '#ef4444' : '#a16207'}`
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: config.maxListings >= 5000 ? '#ef4444' : '#fbbf24' }} />
                      <div>
                        <p className="text-xs font-medium" style={{ color: config.maxListings >= 5000 ? '#ef4444' : '#fbbf24' }}>
                          {config.maxListings >= 5000 ? 'Atenție! Volum foarte mare' : 'Volum mare de date'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#888' }}>
                          {(() => {
                            const workers = config.parallelBrowsers;
                            const timePerItem = config.extractPhones ? 4 : 0.5;
                            const totalSeconds = (config.maxListings / workers) * timePerItem;
                            const hours = Math.floor(totalSeconds / 3600);
                            const minutes = Math.floor((totalSeconds % 3600) / 60);

                            if (hours > 0) {
                              return `Estimare: ~${hours}h ${minutes}min cu ${workers} workers`;
                            }
                            return `Estimare: ~${minutes} minute cu ${workers} workers`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extract Phones Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: '#fff' }}>
                      Extract Phone Numbers
                    </label>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, extractPhones: !prev.extractPhones }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.extractPhones ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.extractPhones ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {config.extractPhones && (
                    <div className="space-y-2 p-3 rounded" style={{ backgroundColor: '#1f1f1f', border: '1px solid #333' }}>
                      <p className="text-xs" style={{ color: '#888' }}>
                        Clicking to reveal phone numbers will slow down scraping significantly. Use only when necessary.
                      </p>
                    </div>
                  )}
                </div>

                {/* Extract All Details Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" style={{ color: '#fff' }}>
                      Extract All Details
                    </label>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, extractAllDetails: !prev.extractAllDetails }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.extractAllDetails ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.extractAllDetails ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {config.extractAllDetails && (
                    <div className="space-y-2 p-3 rounded" style={{ backgroundColor: '#1f1f1f', border: '1px solid #333' }}>
                      <p className="text-xs" style={{ color: '#888' }}>
                        Extracts detailed information from each listing page. This will increase scraping time.
                      </p>
                    </div>
                  )}
                </div>

                {/* Execution Status */}
                {executionError && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#3d1a1a', border: '1px solid #5a2d2d' }}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                      <span className="text-xs" style={{ color: '#ef4444' }}>{executionError}</span>
                    </div>
                  </div>
                )}

                {executionResult && executionResult.length > 0 && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#1e3a28', border: '1px solid #2d5a3d' }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" style={{ color: '#4ade80' }} />
                      <span className="text-xs font-medium" style={{ color: '#86efac' }}>
                        {executionResult.length} anunțuri extrase cu succes
                        {jobProgress?.result?.duration_seconds && ` în ${jobProgress.result.duration_seconds}s`}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                      Vezi rezultatele în panoul OUTPUT →
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-4 space-y-4">
                {/* Request Delay */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: '#fff' }}>
                    Request Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={config.requestDelay}
                    onChange={(e) => setConfig(prev => ({ ...prev, requestDelay: parseInt(e.target.value) || 2500 }))}
                    min={1000}
                    max={10000}
                    step={500}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      color: '#fff',
                    }}
                  />
                  <p className="text-xs" style={{ color: '#888' }}>
                    Delay between requests to avoid rate limiting
                  </p>
                </div>

                {/* Performance Tips */}
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#1a2433', border: '1px solid #3b82f6' }}>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5" style={{ color: '#3b82f6' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#3b82f6' }}>
                        Tips pentru volume mari
                      </p>
                      <div className="text-xs mt-2 space-y-1" style={{ color: '#888' }}>
                        <p>• <strong>5-10 workers</strong> = procesare paralelă optimă</p>
                        <p>• <strong>1000+ anunțuri</strong> = procesare automată în background</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-4 py-3 border-t"
            style={{ borderColor: '#333', backgroundColor: '#222' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#333', color: '#fff' }}
            >
              Close
            </button>
            <button
              onClick={() => onSave(config)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#10B981', color: '#fff' }}
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
              enableDrag={false}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};
