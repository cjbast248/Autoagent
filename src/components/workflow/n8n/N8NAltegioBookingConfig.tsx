import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Play, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';

type AltegioAction =
  | 'list'
  | 'create'
  | 'update'
  | 'cancel'
  | 'get'
  | 'list_services'
  | 'list_branches'
  | 'list_staff';

export interface AltegioConfig {
  baseUrl?: string;
  partnerId?: string;
  partnerToken?: string;
  userToken?: string;
  appId?: string;
  useCustomCreds?: boolean;
  action?: AltegioAction;
  salonId?: string;
  bookingId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceId?: string;
  staffId?: string;
  branchId?: string;
  startAt?: string;
  status?: string;
  comment?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number | string;
  page?: number | string;
  // Advanced filters for list bookings
  filterStatus?: string;
  filterStaffId?: string | number;
  filterServiceId?: string | number;
  filterBranchId?: string | number;
  filterClientId?: string | number;
  filterClientPhone?: string;
  filterClientEmail?: string;
  offset?: number | string;
  // UI control
  companyId?: string;
  modeCompanyId?: 'fixed' | 'expression';
  modeBookingId?: 'fixed' | 'expression';
  modeCustomerName?: 'fixed' | 'expression';
  modeCustomerPhone?: 'fixed' | 'expression';
  modeCustomerEmail?: 'fixed' | 'expression';
  modeServiceId?: 'fixed' | 'expression';
  modeStaffId?: 'fixed' | 'expression';
  modeBranchId?: 'fixed' | 'expression';
  modeStartAt?: 'fixed' | 'expression';
  modeStatus?: 'fixed' | 'expression';
  modeComment?: 'fixed' | 'expression';
  modeFromDate?: 'fixed' | 'expression';
  modeToDate?: 'fixed' | 'expression';
  modeLimit?: 'fixed' | 'expression';
  modePage?: 'fixed' | 'expression';
  modeFilterStatus?: 'fixed' | 'expression';
  modeFilterServiceId?: 'fixed' | 'expression';
  modeFilterStaffId?: 'fixed' | 'expression';
  modeFilterBranchId?: 'fixed' | 'expression';
  modeFilterClientPhone?: 'fixed' | 'expression';
  modeFilterClientEmail?: 'fixed' | 'expression';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: AltegioConfig;
    inputData?: unknown;
    outputData?: unknown;
  } | null;
  onUpdateConfig?: (nodeId: string, config: AltegioConfig) => void;
  inputData?: unknown;
  outputData?: unknown;
  previousNodeLabel?: string;
}

const defaultConfig: AltegioConfig = {
  useCustomCreds: false,
  action: 'list',
  limit: 50,
};

const COMPANY_STORAGE_KEY = 'kalina-altegio-company-id';

const loadCompanyId = (): string | undefined => {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
    return raw || undefined;
  } catch {
    return undefined;
  }
};

const saveCompanyId = (companyId?: string) => {
  try {
    if (companyId) localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
  } catch {
    /* ignore */
  }
};

// Small helper to render Fixed/Expression selector
const ModeSwitch: React.FC<{
  mode: 'fixed' | 'expression';
  onModeChange: (mode: 'fixed' | 'expression') => void;
}> = ({ mode, onModeChange }) => (
  <div className="flex items-center gap-2 text-xs text-slate-400">
    <div className="flex rounded-full border border-[#333] overflow-hidden">
      <button
        type="button"
        className={`px-2 py-1 text-[11px] font-medium transition-colors ${
          mode === 'fixed' ? 'bg-[#00B5AD] text-white' : 'text-slate-300'
        }`}
        onClick={() => onModeChange('fixed')}
      >
        Fix
      </button>
      <button
        type="button"
        className={`px-2 py-1 text-[11px] font-medium transition-colors ${
          mode === 'expression' ? 'bg-[#00B5AD] text-white' : 'text-slate-300'
        }`}
        onClick={() => onModeChange('expression')}
      >
        Din workflow
      </button>
    </div>
  </div>
);

const actionOptions: { value: AltegioAction; label: string }[] = [
  { value: 'list', label: 'List Bookings' },
  { value: 'create', label: 'Create Booking' },
  { value: 'update', label: 'Update Booking' },
  { value: 'cancel', label: 'Cancel Booking' },
  { value: 'get', label: 'Get Booking by ID' },
  { value: 'list_services', label: 'List Services' },
  { value: 'list_branches', label: 'List Branches' },
  { value: 'list_staff', label: 'List Staff' },
];

// Booking status options (common Altegio statuses)
const bookingStatusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

// Debounced input component to prevent re-renders on every keystroke
const DebouncedInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  min?: string;
  max?: string;
}> = ({ value, onChange, placeholder, className, type = 'text', min, max }) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  
  // Sync with external value only when not focused
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);
  
  return (
    <input
      ref={inputRef}
      type={type}
      value={localValue}
      onChange={(e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
      }}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        // Sync value on blur if different
        if (localValue !== value) {
          onChange(localValue);
        }
      }}
      placeholder={placeholder}
      className={className}
      min={min}
      max={max}
    />
  );
};

DebouncedInput.displayName = 'DebouncedInput';

// Debounced textarea component to prevent re-renders on every keystroke
const DebouncedTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}> = ({ value, onChange, placeholder, className, rows = 3 }) => {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFocusedRef = useRef(false);
  
  // Sync with external value only when not focused
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);
  
  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onChange={(e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
      }}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        // Sync value on blur if different
        if (localValue !== value) {
          onChange(localValue);
        }
      }}
      placeholder={placeholder}
      className={className}
      rows={rows}
    />
  );
};

DebouncedTextarea.displayName = 'DebouncedTextarea';

export const N8NAltegioBookingConfig: React.FC<Props> = ({
  isOpen,
  onClose,
  node,
  onUpdateConfig,
  inputData: propInputData,
  outputData: propOutputData,
  previousNodeLabel,
}) => {
  // Get input/output data from props or node
  const inputData = propInputData || (node as { inputData?: unknown })?.inputData;
  const outputData = propOutputData || (node as { outputData?: unknown })?.outputData;
  const [config, setConfig] = useState<AltegioConfig>(() => {
    const savedCompany = loadCompanyId();
    return { ...defaultConfig, companyId: savedCompany, salonId: savedCompany };
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastNodeIdRef = useRef<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<unknown>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState<'serviceId' | 'branchId' | 'staffId' | null>(null);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const installLink = 'https://app.alteg.io/e/mp_1253_aichat/';
  const [showCustomCreds, setShowCustomCreds] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [activeDropField, setActiveDropField] = useState<keyof AltegioConfig | null>(null);
  const modeFieldMap: Partial<Record<keyof AltegioConfig, keyof AltegioConfig>> = {
    companyId: 'modeCompanyId',
    salonId: 'modeCompanyId',
    bookingId: 'modeBookingId',
    customerName: 'modeCustomerName',
    customerPhone: 'modeCustomerPhone',
    customerEmail: 'modeCustomerEmail',
    serviceId: 'modeServiceId',
    staffId: 'modeStaffId',
    branchId: 'modeBranchId',
    startAt: 'modeStartAt',
    status: 'modeStatus',
    comment: 'modeComment',
    fromDate: 'modeFromDate',
    toDate: 'modeToDate',
    limit: 'modeLimit',
    page: 'modePage',
    filterStatus: 'modeFilterStatus',
    filterServiceId: 'modeFilterServiceId',
    filterStaffId: 'modeFilterStaffId',
    filterBranchId: 'modeFilterBranchId',
    filterClientPhone: 'modeFilterClientPhone',
    filterClientEmail: 'modeFilterClientEmail',
  };
  
  // Real-time fetched options for dropdowns
  const [servicesOptions, setServicesOptions] = useState<Array<{ id: number | string; name: string }>>([]);
  const [branchesOptions, setBranchesOptions] = useState<Array<{ id: number | string; name: string }>>([]);
  const [staffOptions, setStaffOptions] = useState<Array<{ id: number | string; name: string }>>([]);
  const getOptionsState = (type: 'serviceId' | 'branchId' | 'staffId') => {
    if (type === 'serviceId') return { dataset: servicesOptions, loaded: servicesLoaded };
    if (type === 'branchId') return { dataset: branchesOptions, loaded: branchesLoaded };
    return { dataset: staffOptions, loaded: staffLoaded };
  };

  useEffect(() => {
    if (!node) return;
    if (lastNodeIdRef.current === node.id) return;
    lastNodeIdRef.current = node.id;

    const deduceAction = () => {
      const label = node?.label?.toLowerCase() || '';
      if (label.includes('create')) return 'create';
      if (label.includes('update')) return 'update';
      if (label.includes('cancel')) return 'cancel';
      if (label.includes('list branches')) return 'list_branches';
      if (label.includes('list services')) return 'list_services';
      if (label.includes('list')) return 'list';
      if (label.includes('get')) return 'get';
      return (node.config as AltegioConfig | undefined)?.action || defaultConfig.action;
    };

    setConfig(prev => ({
      ...defaultConfig,
      ...prev,
      ...(node.config || {}),
      action: node.config?.action || deduceAction(),
    }));
  }, [node?.id]);

  useEffect(() => {
    if (config.useCustomCreds) {
      setShowCustomCreds(true);
    }
  }, [config.useCustomCreds]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFiltersLoaded(false);
    }
  }, [isOpen]);

  const lastCompanyRef = useRef<string | undefined>(config.companyId || config.salonId);
  useEffect(() => {
    const current = config.companyId || config.salonId;
    if (current !== lastCompanyRef.current) {
      lastCompanyRef.current = current;
      setServicesOptions([]);
      setBranchesOptions([]);
      setStaffOptions([]);
      setFiltersLoaded(false);
      setServicesLoaded(false);
      setBranchesLoaded(false);
      setStaffLoaded(false);
    }
  }, [config.companyId, config.salonId]);

  // Auto-fetch staff when company/branch/action relevant changes (only after user loaded filters)
  useEffect(() => {
    if (!isOpen || !node) return;
    if (!filtersLoaded) return;
    if (!config.companyId && !config.salonId) return;
    const shouldLoadStaff = (config.action === 'create' || config.action === 'update' || config.action === 'list');
    if (shouldLoadStaff) {
      fetchOptions('staffId', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersLoaded, config.branchId, config.filterBranchId, config.companyId, config.salonId, config.action, isOpen, node?.id]);

  if (!isOpen || !node) return null;

  const handleCompanyInputChange = useCallback((value: string) => {
    setConfig(prev => {
      const mode = prev.modeCompanyId || 'fixed';
      if (mode === 'expression') {
        return { ...prev, companyId: value };
      } else {
        const newConfig = { ...prev, companyId: value, salonId: value };
        if (value && !value.includes('{{')) {
          saveCompanyId(value);
        }
        return newConfig;
      }
    });
  }, []);

  const updateConfig = useCallback((updates: Partial<AltegioConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      const nextModeCompany = (updates.modeCompanyId ?? newConfig.modeCompanyId ?? 'fixed') as
        | 'fixed'
        | 'expression';
      if (newConfig.companyId && nextModeCompany !== 'expression' && !newConfig.companyId.includes('{{')) {
        saveCompanyId(newConfig.companyId);
      }
      return newConfig;
    });
    // keep config local, persist only on Save/Execute
  }, []);

  const persistConfig = () => {
    setConfig(currentConfig => {
      if (onUpdateConfig && node) {
        onUpdateConfig(node.id, currentConfig);
      }
      return currentConfig;
    });
  };

  const setExpressionValue = useCallback((target: keyof AltegioConfig, expression: string) => {
    const updates: Partial<AltegioConfig> = { [target]: expression };
    const modeKey = modeFieldMap[target];
    if (modeKey) {
      (updates as Record<string, unknown>)[modeKey] = 'expression';
    }
    updateConfig(updates);
  }, [updateConfig]);

  const handleDragOverField = (e: React.DragEvent, target: keyof AltegioConfig) => {
    e.preventDefault();
    setActiveDropField(target);
  };

  const handleDragLeaveField = (target: keyof AltegioConfig) => {
    setActiveDropField(prev => (prev === target ? null : prev));
  };

  const handleDropField = (e: React.DragEvent, target: keyof AltegioConfig) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    try {
      const parsed = data ? JSON.parse(data) : null;
      const expression =
        parsed?.expression ||
        (parsed?.path ? `={{ $json.${parsed.path} }}` : e.dataTransfer.getData('text/plain'));
      if (expression) {
        setExpressionValue(target, expression);
      }
    } catch {
      const fallback = e.dataTransfer.getData('text/plain');
      if (fallback) setExpressionValue(target, fallback);
    }
    setActiveDropField(null);
  };

const ExpressionDropWrapper: React.FC<{
  field: keyof AltegioConfig;
  className?: string;
  children: React.ReactNode;
}> = ({ field, className, children }) => (
  <div
    onDragOver={(e) => handleDragOverField(e, field)}
    onDragLeave={() => handleDragLeaveField(field)}
    onDrop={(e) => handleDropField(e, field)}
    className={`${className || ''} ${activeDropField === field ? 'ring-2 ring-yellow-500 rounded-lg' : ''}`}
  >
    {children}
  </div>
);

  const supabaseUrl =
    (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_SUPABASE_URL ||
    'https://pwfczzxwjfxomqzhhwvj.supabase.co';
  const supabaseAnonKey =
    (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_SUPABASE_ANON_KEY ||
    undefined;

  const callAltegioApi = async (payload: unknown): Promise<unknown> => {
    const url = `${supabaseUrl}/functions/v1/altegio-api`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (supabaseAnonKey) headers['apikey'] = supabaseAnonKey;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    if (!res.ok) {
      const parsed = json as Record<string, unknown>;
      const message =
        typeof parsed?.error === 'string'
          ? parsed.error
          : res.statusText;
      throw new Error(message);
    }
    return json as unknown;
  };

  // Helper to check if a string is HTML
  const isHTML = (str: unknown): boolean => {
    if (typeof str !== 'string') return false;
    return /^\s*<[^>]+>/.test(str) || str.includes('<!DOCTYPE') || str.includes('<html');
  };

  // Helper to extract and format Altegio API response
  const formatAltegioResponse = (response: unknown): unknown => {
    if (!response || typeof response !== 'object') return response;
    
    const resp = response as Record<string, unknown>;
    
    // If response has 'data' field, extract it
    if ('data' in resp) {
      const data = resp.data;
      
      // Check if data is HTML (error response from Altegio)
      if (typeof data === 'string' && isHTML(data)) {
        throw new Error('Altegio API returned HTML instead of JSON. Check your credentials and API endpoint.');
      }
      
      // If data is an object with nested 'data', extract it
      if (data && typeof data === 'object' && 'data' in data) {
        return (data as Record<string, unknown>).data;
      }
      
      // If data is an array or object, return it directly
      if (Array.isArray(data) || (data && typeof data === 'object')) {
        return data;
      }
      
      return data;
    }
    
    // If response has 'success' and 'data', return the data
    if ('success' in resp && resp.success && 'data' in resp) {
      return formatAltegioResponse({ data: resp.data });
    }
    
    return response;
  };

  // Execute Altegio call for test/run
  const executeTest = async () => {
    // Use functional state update to get latest config
    let currentConfig: AltegioConfig | null = null;
    setConfig(cfg => {
      currentConfig = cfg;
      return cfg;
    });

    if (!currentConfig) return;

    // Persist current config
    if (onUpdateConfig && node) {
      onUpdateConfig(node.id, currentConfig);
    }

    if (!currentConfig.companyId && !currentConfig.salonId) {
      setExecutionError('Setează Company / Salon ID înainte de Run.');
      return;
    }

    if (!currentConfig.action) {
      setExecutionError('Selectează o acțiune (Action) înainte de Run.');
      return;
    }
    
    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionError(null);
    try {
      const payload = {
        action: currentConfig.action,
        config: {
          ...currentConfig,
          salonId: currentConfig.companyId || currentConfig.salonId,
        },
        inputData: (node as unknown as { inputData?: unknown })?.inputData ?? null,
      };
      const json = await callAltegioApi(payload);
      
      // Format the response to extract actual data
      const formattedData = formatAltegioResponse(json);
      setExecutionResult(formattedData);
    } catch (err: unknown) {
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Provide more helpful error messages
        if (errorMessage.includes('HTML instead of JSON')) {
          errorMessage += '\n\nSoluții posibile:\n' +
            '1. Verifică dacă Company / Salon ID este corect\n' +
            '2. Verifică credențialele în Supabase secrets (ALTEGIO_PARTNER_TOKEN, ALTEGIO_SYSTEM_USER_TOKEN)\n' +
            '3. Dacă folosești credențiale personalizate, verifică că sunt corecte\n' +
            '4. Verifică că baseUrl este corect (default: https://api.alteg.io/api/v1)';
        } else if (errorMessage.includes('Missing Altegio tokens')) {
          errorMessage += '\n\nSoluții:\n' +
            '1. Setează credențialele în Supabase secrets sau\n' +
            '2. Activează "Folosește credențiale personalizate Altegio" și completează manual';
        } else if (errorMessage.includes('Missing salon_id')) {
          errorMessage += '\n\nSoluție: Setează Company / Salon ID în câmpul de mai sus';
        }
      }
      setExecutionError(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  };

  // Fetch options for dropdowns (services, branches, staff) in real-time
  const fetchOptions = async (type: 'serviceId' | 'branchId' | 'staffId', autoSelect = false) => {
    // Get current config
    let currentConfig: AltegioConfig | null = null;
    setConfig(cfg => {
      currentConfig = cfg;
      return cfg;
    });

    if (!currentConfig || (!currentConfig.companyId && !currentConfig.salonId)) return;

    setOptionsLoading(type);
    setExecutionError(null);
    try {
      const actionMap: Record<string, AltegioAction> = {
        serviceId: 'list_services',
        branchId: 'list_branches',
        staffId: 'list_staff',
      };
      const action = actionMap[type];
      if (!action) return;

      const payload = {
        action,
        config: {
          ...currentConfig,
          salonId: currentConfig.companyId || currentConfig.salonId,
          // For staff, include branchId if available
          branchId: type === 'staffId' ? (currentConfig.branchId || currentConfig.filterBranchId) : undefined,
        },
      };
      const json = await callAltegioApi(payload);
      
      // Format the response to extract actual data
      const formattedData = formatAltegioResponse(json);
      
      // Extract items from formatted data
      let items: unknown[] = [];
      if (Array.isArray(formattedData)) {
        items = formattedData;
      } else if (formattedData && typeof formattedData === 'object' && Array.isArray((formattedData as Record<string, unknown>).data)) {
        items = (formattedData as Record<string, unknown>).data as unknown[];
      } else if (formattedData && typeof formattedData === 'object' && 'items' in formattedData && Array.isArray((formattedData as Record<string, unknown>).items)) {
        items = (formattedData as Record<string, unknown>).items as unknown[];
      }
      
      // Map items to options format with proper typing
      const options: Array<{ id: string | number; name: string }> = items
        .map((item: unknown) => {
          const it = item as Record<string, unknown>;
          const id = it?.id || it?.service_id || it?.branch_id || it?.staff_id;
          const name = it?.name || it?.title || it?.fullname || it?.service_name || it?.branch_name || it?.staff_name || it?.id || '';
          
          if (id === undefined || id === null || id === '') return null;
          
          return {
            id: typeof id === 'number' ? id : typeof id === 'string' ? id : String(id),
            name: String(name),
          };
        })
        .filter((opt): opt is { id: string | number; name: string } => opt !== null);
      
      // Update state for dropdowns
      if (type === 'serviceId') {
        setServicesOptions(options);
        setServicesLoaded(true);
        if (autoSelect && options.length > 0 && !currentConfig.serviceId) {
          updateConfig({ serviceId: String(options[0].id) });
        }
      } else if (type === 'branchId') {
        setBranchesOptions(options);
        setBranchesLoaded(true);
        if (autoSelect && options.length > 0 && !currentConfig.branchId) {
          updateConfig({ branchId: String(options[0].id) });
        }
      } else if (type === 'staffId') {
        setStaffOptions(options);
        setStaffLoaded(true);
        if (autoSelect && options.length > 0 && !currentConfig.staffId) {
          updateConfig({ staffId: String(options[0].id) });
        }
      }
      
    } catch (err: unknown) {
      setExecutionError(
        err instanceof Error ? err.message : 'Nu am putut încărca lista.'
      );
    } finally {
      setOptionsLoading(null);
    }
  };

  const ensureOptionsLoaded = (type: 'serviceId' | 'branchId' | 'staffId') => {
    // Check if config has company ID using functional state update
    let hasCompanyId = false;
    setConfig(cfg => {
      hasCompanyId = !!(cfg.companyId || cfg.salonId);
      return cfg;
    });

    if (!hasCompanyId) return;
    if (!filtersLoaded) setFiltersLoaded(true);
    if (type === 'serviceId' && servicesOptions.length === 0) {
      fetchOptions('serviceId', false);
    } else if (type === 'branchId' && branchesOptions.length === 0) {
      fetchOptions('branchId', false);
    } else if (type === 'staffId' && staffOptions.length === 0) {
      fetchOptions('staffId', false);
    }
  };

  const renderDynamicOptions = (
    type: 'serviceId' | 'branchId' | 'staffId',
    emptyLabel: string,
  ): React.ReactNode => {
    const { dataset, loaded } = getOptionsState(type);
    if (optionsLoading === type) {
      return (
        <option key="loading" value="" disabled>
          Se încarcă...
        </option>
      );
    }
    if (loaded && dataset.length === 0) {
      return (
        <option key="empty" value="">
          {emptyLabel}
        </option>
      );
    }
    return dataset.map((opt) => (
      <option key={opt.id} value={String(opt.id)}>
        {opt.name}
      </option>
    ));
  };
  const renderActionFields = () => {
    const a = config.action;
    const isBookingWrite = a === 'create' || a === 'update';
    const isCancel = a === 'cancel';
    const isGet = a === 'get';

    return (
      <div className="flex flex-col gap-4">
        {(a === 'update' || isCancel || isGet) && (
          <div>
            <label className="block mb-1 text-sm text-slate-200">Booking ID</label>
            <ExpressionDropWrapper field="bookingId">
              <DebouncedInput
                value={config.bookingId || ''}
                onChange={(value) => updateConfig({ bookingId: value })}
                placeholder="Booking ID"
                className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
              />
            </ExpressionDropWrapper>
            <div className="flex items-center justify-end mt-1">
              <ModeSwitch
                mode={config.modeBookingId || 'fixed'}
                onModeChange={(mode) => updateConfig({ modeBookingId: mode })}
              />
            </div>
          </div>
        )}

        {a === 'list' && (
          <>
            {/* Date Range & Pagination */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block mb-1 text-sm text-slate-200">From date</label>
                <ExpressionDropWrapper field="fromDate">
                  {config.modeFromDate === 'expression' ? (
                    <DebouncedInput
                      value={config.fromDate || ''}
                      onChange={(value) => updateConfig({ fromDate: value })}
                      placeholder="={{ $json.start_date }}"
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  ) : (
                    <input
                      type="date"
                      value={config.fromDate || ''}
                      onChange={(e) => updateConfig({ fromDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  )}
                </ExpressionDropWrapper>
                <div className="flex items-center justify-end mt-1">
                  <ModeSwitch
                    mode={config.modeFromDate || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modeFromDate: mode })}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-200">To date</label>
                <ExpressionDropWrapper field="toDate">
                  {config.modeToDate === 'expression' ? (
                    <DebouncedInput
                      value={config.toDate || ''}
                      onChange={(value) => updateConfig({ toDate: value })}
                      placeholder="={{ $json.end_date }}"
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  ) : (
                    <input
                      type="date"
                      value={config.toDate || ''}
                      onChange={(e) => updateConfig({ toDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  )}
                </ExpressionDropWrapper>
                <div className="flex items-center justify-end mt-1">
                  <ModeSwitch
                    mode={config.modeToDate || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modeToDate: mode })}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-200">Limit</label>
                <ExpressionDropWrapper field="limit">
                  {config.modeLimit === 'expression' ? (
                    <DebouncedInput
                      value={String(config.limit ?? '')}
                      onChange={(value) => updateConfig({ limit: value })}
                      placeholder="={{ $json.limit }}"
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={Number(config.limit) || 50}
                      onChange={(e) => updateConfig({ limit: Math.min(200, Math.max(1, Number(e.target.value) || 50)) })}
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  )}
                </ExpressionDropWrapper>
                <div className="flex items-center justify-end mt-1">
                  <ModeSwitch
                    mode={config.modeLimit || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modeLimit: mode })}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-200">Page</label>
                <ExpressionDropWrapper field="page">
                  {config.modePage === 'expression' ? (
                    <DebouncedInput
                      value={String(config.page ?? '')}
                      onChange={(value) => updateConfig({ page: value })}
                      placeholder="={{ $json.page }}"
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={Number(config.page) || 1}
                      onChange={(e) => updateConfig({ page: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  )}
                </ExpressionDropWrapper>
                <div className="flex items-center justify-end mt-1">
                  <ModeSwitch
                    mode={config.modePage || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modePage: mode })}
                  />
                </div>
              </div>
            </div>
            
            {/* Advanced Filters */}
            <div className="rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] p-3">
              <div className="text-xs text-slate-400 mb-3 font-semibold">Filtre avansate</div>
            <div className="flex flex-col gap-3">
                <div>
                  <label className="block mb-1 text-sm text-slate-200">Status</label>
                  {config.modeFilterStatus === 'expression' ? (
                    <ExpressionDropWrapper field="filterStatus">
                      <DebouncedInput
                        value={config.filterStatus || ''}
                        onChange={(value) => updateConfig({ filterStatus: value })}
                        placeholder="={{ $json.status }}"
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                      />
                    </ExpressionDropWrapper>
                  ) : (
                    <select
                      value={config.filterStatus || ''}
                      onChange={(e) => updateConfig({ filterStatus: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    >
                      {bookingStatusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center justify-end mt-1">
                    <ModeSwitch
                      mode={config.modeFilterStatus || 'fixed'}
                      onModeChange={(mode) => updateConfig({ modeFilterStatus: mode })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-200">Service</label>
                  <ExpressionDropWrapper field="filterServiceId">
                    {config.modeFilterServiceId === 'expression' ? (
                      <DebouncedInput
                        value={config.filterServiceId ? String(config.filterServiceId) : ''}
                        onChange={(value) => updateConfig({ filterServiceId: value })}
                        placeholder="={{ $json.service_id }}"
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                      />
                    ) : (
                      <div className="relative">
                        <select
                          onFocus={() => ensureOptionsLoaded('serviceId')}
                          value={config.filterServiceId ? String(config.filterServiceId) : ''}
                          onChange={(e) => updateConfig({ filterServiceId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white appearance-none"
                          disabled={optionsLoading === 'serviceId'}
                        >
                          <option value="">Toate serviciile</option>
                          {renderDynamicOptions('serviceId', 'Nu există servicii')}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </ExpressionDropWrapper>
                  <div className="flex items-center justify-end mt-1">
                    <ModeSwitch
                      mode={config.modeFilterServiceId || 'fixed'}
                      onModeChange={(mode) => updateConfig({ modeFilterServiceId: mode })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-200">Staff</label>
                  <ExpressionDropWrapper field="filterStaffId">
                    {config.modeFilterStaffId === 'expression' ? (
                      <DebouncedInput
                        value={config.filterStaffId ? String(config.filterStaffId) : ''}
                        onChange={(value) => updateConfig({ filterStaffId: value })}
                        placeholder="={{ $json.staff_id }}"
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                      />
                    ) : (
                      <div className="relative">
                        <select
                          onFocus={() => ensureOptionsLoaded('staffId')}
                          value={config.filterStaffId ? String(config.filterStaffId) : ''}
                          onChange={(e) => updateConfig({ filterStaffId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white appearance-none"
                          disabled={optionsLoading === 'staffId'}
                        >
                          <option value="">Toți specialiștii</option>
                          {renderDynamicOptions('staffId', 'Nu există specialiști')}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </ExpressionDropWrapper>
                  <div className="flex items-center justify-end mt-1">
                    <ModeSwitch
                      mode={config.modeFilterStaffId || 'fixed'}
                      onModeChange={(mode) => updateConfig({ modeFilterStaffId: mode })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-200">Branch</label>
                  <ExpressionDropWrapper field="filterBranchId">
                    {config.modeFilterBranchId === 'expression' ? (
                      <DebouncedInput
                        value={config.filterBranchId ? String(config.filterBranchId) : ''}
                        onChange={(value) => updateConfig({ filterBranchId: value })}
                        placeholder="={{ $json.branch_id }}"
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                      />
                    ) : (
                      <div className="relative">
                        <select
                          onFocus={() => ensureOptionsLoaded('branchId')}
                          value={config.filterBranchId ? String(config.filterBranchId) : ''}
                          onChange={(e) => updateConfig({ filterBranchId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white appearance-none"
                          disabled={optionsLoading === 'branchId'}
                        >
                          <option value="">Toate filialele</option>
                          {renderDynamicOptions('branchId', 'Nu există filiale')}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </ExpressionDropWrapper>
                  <div className="flex items-center justify-end mt-1">
                    <ModeSwitch
                      mode={config.modeFilterBranchId || 'fixed'}
                      onModeChange={(mode) => updateConfig({ modeFilterBranchId: mode })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-200">Client Phone</label>
                  <ExpressionDropWrapper field="filterClientPhone">
                    <DebouncedInput
                      value={config.filterClientPhone || ''}
                      onChange={(value) => updateConfig({ filterClientPhone: value })}
                      placeholder="Filter by client phone"
                      className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                    />
                  </ExpressionDropWrapper>
                  <div className="flex items-center justify-end mt-1">
                    <ModeSwitch
                      mode={config.modeFilterClientPhone || 'fixed'}
                      onModeChange={(mode) => updateConfig({ modeFilterClientPhone: mode })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-sm text-slate-200">Client Email</label>
                  <ExpressionDropWrapper field="filterClientEmail">
                      <DebouncedInput
                        type="email"
                        value={config.filterClientEmail || ''}
                        onChange={(value) => updateConfig({ filterClientEmail: value })}
                        placeholder="Filter by client email"
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                      />
                  </ExpressionDropWrapper>
                  <div className="flex items-center justify-end mt-1">
                    <ModeSwitch
                      mode={config.modeFilterClientEmail || 'fixed'}
                      onModeChange={(mode) => updateConfig({ modeFilterClientEmail: mode })}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs bg-[#F5A623] text-white rounded disabled:opacity-50"
                  onClick={() => {
                    setFiltersLoaded(true);
                    fetchOptions('serviceId', false);
                    fetchOptions('branchId', false);
                    fetchOptions('staffId', false);
                  }}
                  disabled={!config.companyId || optionsLoading !== null}
                >
                  {optionsLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    filtersLoaded ? 'Refresh filters' : 'Load filters'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
        
        {a === 'get' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block mb-1 text-sm text-slate-200">From date</label>
              <input
                type="date"
                value={config.fromDate || ''}
                onChange={(e) => updateConfig({ fromDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm text-slate-200">To date</label>
              <input
                type="date"
                value={config.toDate || ''}
                onChange={(e) => updateConfig({ toDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
              />
            </div>
          </div>
        )}

        {(a === 'create' || a === 'update') && (
          <>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block mb-1 text-sm text-slate-200">Customer name</label>
                <ExpressionDropWrapper field="customerName">
                  <DebouncedInput
                    value={config.customerName || ''}
                    onChange={(value) => updateConfig({ customerName: value })}
                    placeholder="Client name"
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  />
                </ExpressionDropWrapper>
                <div className="flex items-center justify-end mt-1">
                  <ModeSwitch
                    mode={config.modeCustomerName || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modeCustomerName: mode })}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-200">Customer phone</label>
                <ExpressionDropWrapper field="customerPhone">
                  <DebouncedInput
                    value={config.customerPhone || ''}
                    onChange={(value) => updateConfig({ customerPhone: value })}
                    placeholder="+373..."
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  />
                </ExpressionDropWrapper>
                <div className="flex items-center justify-end mt-1">
                  <ModeSwitch
                    mode={config.modeCustomerPhone || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modeCustomerPhone: mode })}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm text-slate-200">Customer email</label>
              <ExpressionDropWrapper field="customerEmail">
                <DebouncedInput
                  type="email"
                  value={config.customerEmail || ''}
                  onChange={(value) => updateConfig({ customerEmail: value })}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                />
              </ExpressionDropWrapper>
              <div className="flex items-center justify-end mt-1">
                <ModeSwitch
                  mode={config.modeCustomerEmail || 'fixed'}
                  onModeChange={(mode) => updateConfig({ modeCustomerEmail: mode })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block mb-1 text-sm text-slate-200">Service</label>
                <div className="relative">
                  {config.modeServiceId === 'expression' ? (
                <ExpressionDropWrapper field="serviceId">
                  <DebouncedInput
                    value={config.serviceId || ''}
                    onChange={(value) => updateConfig({ serviceId: value })}
                        placeholder="Expression: {{ $json.service_id }}"
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  />
                </ExpressionDropWrapper>
                  ) : (
                    <div className="relative">
                      <select
                        onFocus={() => ensureOptionsLoaded('serviceId')}
                        value={config.serviceId || ''}
                        onChange={(e) => updateConfig({ serviceId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white appearance-none"
                        disabled={optionsLoading === 'serviceId'}
                      >
                        <option value="">Selectează serviciul…</option>
                        {renderDynamicOptions('serviceId', 'Nu există servicii')}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <ModeSwitch
                    mode={config.modeServiceId || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modeServiceId: mode })}
                  />
                  <button
                    type="button"
                    className="px-2 py-1 text-xs bg-[#F5A623] text-white rounded disabled:opacity-50"
                    onClick={() => {
                      ensureOptionsLoaded('serviceId');
                      fetchOptions('serviceId');
                    }}
                    disabled={optionsLoading === 'serviceId' || !config.companyId}
                  >
                    {optionsLoading === 'serviceId' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </button>
                  
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-200">Staff</label>
                <div className="relative">
                  {config.modeStaffId === 'expression' ? (
                    <ExpressionDropWrapper field="staffId">
                      <DebouncedInput
                        value={config.staffId || ''}
                        onChange={(value) => updateConfig({ staffId: value })}
                        placeholder="Expression: {{ $json.staff_id }}"
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                      />
                    </ExpressionDropWrapper>
                  ) : (
                    <div className="relative">
                      <select
                        onFocus={() => ensureOptionsLoaded('staffId')}
                        value={config.staffId || ''}
                        onChange={(e) => updateConfig({ staffId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white appearance-none"
                        disabled={optionsLoading === 'staffId'}
                      >
                        <option value="">Selectează specialistul…</option>
                        {renderDynamicOptions('staffId', 'Nu există specialiști')}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <ModeSwitch
                    mode={config.modeStaffId || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modeStaffId: mode })}
                  />
                  <button
                    type="button"
                    className="px-2 py-1 text-xs bg-[#F5A623] text-white rounded disabled:opacity-50"
                    onClick={() => {
                      ensureOptionsLoaded('staffId');
                      fetchOptions('staffId');
                    }}
                    disabled={optionsLoading === 'staffId' || !config.companyId}
                  >
                    {optionsLoading === 'staffId' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </button>
                  
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm text-slate-200">Branch</label>
                <div className="relative">
                  {config.modeBranchId === 'expression' ? (
                    <ExpressionDropWrapper field="branchId">
                      <DebouncedInput
                        value={config.branchId || ''}
                        onChange={(value) => updateConfig({ branchId: value })}
                        placeholder="Expression: {{ $json.branch_id }}"
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                      />
                    </ExpressionDropWrapper>
                  ) : (
                    <div className="relative">
                      <select
                        onFocus={() => ensureOptionsLoaded('branchId')}
                        value={config.branchId || ''}
                        onChange={(e) => updateConfig({ branchId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white appearance-none"
                        disabled={optionsLoading === 'branchId'}
                      >
                        <option value="">Selectează filiala…</option>
                        {renderDynamicOptions('branchId', 'Nu există filiale')}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <ModeSwitch
                    mode={config.modeBranchId || 'fixed'}
                    onModeChange={(mode) => updateConfig({ modeBranchId: mode })}
                  />
                  <button
                    type="button"
                    className="px-2 py-1 text-xs bg-[#F5A623] text-white rounded disabled:opacity-50"
                    onClick={() => {
                      ensureOptionsLoaded('branchId');
                      fetchOptions('branchId');
                    }}
                    disabled={optionsLoading === 'branchId' || !config.companyId}
                  >
                    {optionsLoading === 'branchId' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </button>
                  
                </div>
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm text-slate-200">Start time</label>
              <ExpressionDropWrapper field="startAt">
                {config.modeStartAt === 'expression' ? (
                  <DebouncedInput
                    value={config.startAt || ''}
                    onChange={(value) => updateConfig({ startAt: value })}
                    placeholder="={{ $json.start_at }}"
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  />
                ) : (
                  <input
                    type="datetime-local"
                    value={config.startAt || ''}
                    onChange={(e) => updateConfig({ startAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  />
                )}
              </ExpressionDropWrapper>
              <div className="flex items-center justify-end mt-1">
                <ModeSwitch
                  mode={config.modeStartAt || 'fixed'}
                  onModeChange={(mode) => updateConfig({ modeStartAt: mode })}
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm text-slate-200">Status</label>
              <ExpressionDropWrapper field="status">
                {config.modeStatus === 'expression' ? (
                  <DebouncedInput
                    value={config.status || ''}
                    onChange={(value) => updateConfig({ status: value })}
                    placeholder="={{ $json.status }}"
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  />
                ) : (
                  <select
                    value={config.status || ''}
                    onChange={(e) => updateConfig({ status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  >
                    <option value="">Select status</option>
                    {bookingStatusOptions
                      .filter((opt) => opt.value)
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                )}
              </ExpressionDropWrapper>
              <div className="flex items-center justify-end mt-1">
                <ModeSwitch
                  mode={config.modeStatus || 'fixed'}
                  onModeChange={(mode) => updateConfig({ modeStatus: mode })}
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm text-slate-200">Comment</label>
              <ExpressionDropWrapper field="comment">
                <DebouncedTextarea
                  value={config.comment || ''}
                  onChange={(value) => updateConfig({ comment: value })}
                  placeholder={config.modeComment === 'expression' ? '={{ $json.comment }}' : 'Notes / comment'}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white resize-none"
                />
              </ExpressionDropWrapper>
              <div className="flex items-center justify-end mt-1">
                <ModeSwitch
                  mode={config.modeComment || 'fixed'}
                  onModeChange={(mode) => updateConfig({ modeComment: mode })}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Prepare output data - prioritize loaded data from execution history
  const currentOutputData = outputData || executionResult || null;

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    persistConfig();
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: '#131419', backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="flex items-stretch"
        style={{ height: '85vh', maxWidth: '1600px', width: '95%' }}
      >
        {/* INPUT Panel - Left (ghost style) */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: '#1a1a1a',
            borderTopLeftRadius: '12px',
            borderBottomLeftRadius: '12px',
            minWidth: '320px',
            width: '320px',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
            <span className="text-sm font-medium text-gray-400">INPUT</span>
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <N8NNodeIOPanel title="INPUT" data={inputData} enableDrag embedded />
          </div>
        </div>

        {/* Main Config Panel - Center */}
        <div
          ref={panelRef}
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: '#2b2b2b',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            width: '650px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#F5A623' }}
          >
            <div className="flex items-center gap-3">
              <img 
                src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/unnamed.png" 
                alt="Altegio" 
                className="w-6 h-6 rounded"
              />
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                Altegio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={executeTest}
                disabled={isExecuting || !config.companyId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: config.companyId ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: config.companyId ? 'pointer' : 'not-allowed',
                }}
              >
                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Execute step
              </button>
              <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
      </div>

      {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(80vh - 120px)' }}>
            {/* Install Helper */}
            <div className="rounded-lg border border-[#2d2d2d] bg-[#141414] p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white font-medium">Nu ai ID-ul încă?</p>
                <p className="text-xs text-slate-400">
                  Deschide aplicația Agentauto în Altegio, acceptă instalarea, apoi copiază numărul din URL (…/appstore/<span className="font-semibold text-white">ID</span>).
                </p>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 text-xs bg-[#F5A623] text-white rounded hover:bg-[#D4920E]"
                onClick={() => window.open(installLink, '_blank', 'noopener,noreferrer')}
              >
                Deschide Altegio
              </button>
            </div>

            {/* Company / Salon ID */}
            <div>
              <label className="block mb-1 text-sm text-slate-200">Company / Salon ID</label>
              <ExpressionDropWrapper field="companyId">
                {config.modeCompanyId === 'expression' ? (
                  <input
                    value={config.companyId || ''}
                    onChange={(e) => handleCompanyInputChange(e.target.value)}
                    placeholder="={{ $json.company_id }}"
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  />
                ) : (
                  <input
                    value={config.companyId || config.salonId || ''}
                    onChange={(e) => handleCompanyInputChange(e.target.value)}
                    placeholder="ID din link: app.alteg.io/appstore/<ID> sau /company/<ID>"
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                  />
                )}
              </ExpressionDropWrapper>
              <p className="text-xs text-slate-400 mt-1">
                ID-ul se salvează local (browser) și se reia automat când redeschizi panelul.
              </p>
              <div className="flex items-center justify-end gap-2 mt-2">
                <ModeSwitch
                  mode={config.modeCompanyId || 'fixed'}
                  onModeChange={(mode) => {
                    if (mode === 'expression') {
                      updateConfig({ modeCompanyId: mode });
                    } else {
                      const saved = loadCompanyId();
                      const numericValue =
                        config.companyId && !config.companyId.includes('{{')
                          ? config.companyId
                          : saved || '';
                      updateConfig({
                        modeCompanyId: mode,
                        companyId: numericValue,
                        salonId: numericValue,
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Action */}
            <div>
              <label className="block mb-1 text-sm text-slate-200">Acțiune</label>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === 'action' ? null : 'action');
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white flex items-center justify-between"
                >
                  <span>{actionOptions.find((o) => o.value === config.action)?.label || 'Selectează acțiunea'}</span>
                  <ChevronDown size={16} />
                </button>
                {openDropdown === 'action' && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-[#333] bg-[#1a1a1a] shadow-lg overflow-hidden z-10">
                    {actionOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateConfig({ action: opt.value });
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#222] text-sm text-white"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action-specific fields */}
            {renderActionFields()}

            {/* Custom credentials (Advanced) */}
            <div className="border border-[#2d2d2d] rounded-lg p-3 bg-[#131313]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">Setări avansate</p>
                  <p className="text-xs text-slate-400">Folosește doar dacă ai contract direct cu Altegio și dorești token-urile tale.</p>
                </div>
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded bg-[#2d2d2d] text-white"
                  onClick={() => setShowCustomCreds((prev) => !prev)}
                >
                  {showCustomCreds ? 'Ascunde' : 'Arată'}
                </button>
              </div>
              {showCustomCreds && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!config.useCustomCreds}
                      onChange={(e) => updateConfig({ useCustomCreds: e.target.checked })}
                      className="w-4 h-4 rounded border-2 border-[#555] bg-transparent"
                      style={{ accentColor: '#2F80ED' }}
                    />
                    <span className="text-sm text-white">Folosește credențiale personalizate Altegio</span>
                  </div>
                  {config.useCustomCreds && (
                    <>
                      <div>
                        <label className="block mb-1 text-sm text-slate-200">Base URL</label>
                        <input
                          value={config.baseUrl || ''}
                          onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                          placeholder="https://api.alteg.io"
                          className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block mb-1 text-sm text-slate-200">Partner ID</label>
                          <input
                            value={config.partnerId || ''}
                            onChange={(e) => updateConfig({ partnerId: e.target.value })}
                            placeholder="ex: 1449"
                            className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-sm text-slate-200">App ID</label>
                          <input
                            value={config.appId || ''}
                            onChange={(e) => updateConfig({ appId: e.target.value })}
                            placeholder="ex: 1253"
                            className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block mb-1 text-sm text-slate-200">Partner Token</label>
                          <input
                            value={config.partnerToken || ''}
                            onChange={(e) => updateConfig({ partnerToken: e.target.value })}
                            placeholder="partner_token"
                            className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-sm text-slate-200">User Token</label>
                          <input
                            value={config.userToken || ''}
                            onChange={(e) => updateConfig({ userToken: e.target.value })}
                            placeholder="user_token"
                            className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#333] text-sm text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Execution result/error */}
            {executionError && (
              <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                Eroare: {executionError}
              </div>
            )}
            {executionResult && !executionError && (
              <div className="p-3 rounded-lg bg-green-500/20 text-green-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                Execuție reușită!
          </div>
            )}
      </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#2d2d2d] bg-[#222]">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-[#2d2d2d] text-white text-sm hover:bg-[#3a3a3a]"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#2F80ED] text-white text-sm hover:bg-[#3f8ef5]"
            >
              Salvează
            </button>
          </div>
        </div>

        {/* OUTPUT Panel - Right (ghost style) */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: '#1a1a1a',
            borderTopRightRadius: '12px',
            borderBottomRightRadius: '12px',
            minWidth: '320px',
            width: '320px',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
            <span className="text-sm font-medium text-gray-400">OUTPUT</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <N8NNodeIOPanel
              title="OUTPUT"
              data={currentOutputData}
              isLoading={isExecuting}
              error={executionError}
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
