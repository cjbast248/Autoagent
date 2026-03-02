import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { InfobipSMSIcon } from './BrandIcons';

interface InfobipSMSConfig {
  apiKey: string;
  baseUrl: string;
  from: string;
  toNumber: string;
  toNumberSource: 'fixed' | 'workflow';
  toNumberWorkflowField: string;
  message: string;
  messageSource: 'fixed' | 'workflow';
  messageWorkflowField: string;
  // For custom account connection
  useCustomAccount: boolean;
}

interface N8NInfobipSMSConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: InfobipSMSConfig;
  } | null;
  onClose: () => void;
  onSave: (config: InfobipSMSConfig) => void;
  previousNode?: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: any;
  } | null;
}

const INFOBIP_CREDENTIALS_KEY = 'kalina-infobip-credentials';

// Load saved credentials from localStorage
const loadSavedCredentials = (): { apiKey: string; baseUrl: string } => {
  try {
    const saved = localStorage.getItem(INFOBIP_CREDENTIALS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || 'https://api.infobip.com',
      };
    }
  } catch (e) {
    console.error('Failed to load Infobip credentials:', e);
  }
  return { apiKey: '', baseUrl: 'https://api.infobip.com' };
};

// Save credentials to localStorage
const saveCredentials = (apiKey: string, baseUrl: string) => {
  try {
    localStorage.setItem(INFOBIP_CREDENTIALS_KEY, JSON.stringify({ apiKey, baseUrl }));
  } catch (e) {
    console.error('Failed to save Infobip credentials:', e);
  }
};

const getDefaultConfig = (): InfobipSMSConfig => {
  const savedCreds = loadSavedCredentials();
  return {
    apiKey: savedCreds.apiKey,
    baseUrl: savedCreds.baseUrl,
    from: 'Agentauto',
    toNumber: '',
    toNumberSource: 'workflow',
    toNumberWorkflowField: 'Phone',
    message: '',
    messageSource: 'fixed',
    messageWorkflowField: '',
    useCustomAccount: false,
  };
};

// Common workflow fields that might contain phone numbers
const phoneWorkflowFields = [
  { value: 'Phone', label: '📱 Phone' },
  { value: 'phone', label: '📱 phone' },
  { value: 'Mobile', label: '📲 Mobile' },
  { value: 'mobile', label: '📲 mobile' },
  { value: 'phoneNumber', label: '📞 phoneNumber' },
  { value: 'callerNumber', label: '📞 callerNumber' },
  { value: 'contact_phone', label: '📱 contact_phone' },
];

// Common workflow fields for message content
const messageWorkflowFields = [
  { value: 'summary', label: '📋 summary' },
  { value: 'transcription', label: '📝 transcription' },
  { value: 'conclusion', label: '📌 conclusion' },
  { value: 'analysis', label: '🤖 analysis' },
  { value: 'message', label: '💬 message' },
  { value: 'body', label: '📦 body' },
];

export const N8NInfobipSMSConfig: React.FC<N8NInfobipSMSConfigProps> = ({
  node,
  onClose,
  onSave,
  previousNode,
}) => {
  const [config, setConfig] = useState<InfobipSMSConfig>(getDefaultConfig);
  const [position, setPosition] = useState({ x: Math.max(20, window.innerWidth - 480), y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showApiKey, setShowApiKey] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const defaultConfig = getDefaultConfig();
    if (node?.config) {
      setConfig({ ...defaultConfig, ...node.config });
    } else {
      setConfig(defaultConfig);
    }
  }, [node]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 460);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 550);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const handleDragStart = (e: React.MouseEvent) => {
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    setIsDragging(true);
  };

  const updateConfig = (updates: Partial<InfobipSMSConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // Save credentials to localStorage when they change
    if (updates.apiKey !== undefined || updates.baseUrl !== undefined) {
      saveCredentials(
        updates.apiKey !== undefined ? updates.apiKey : config.apiKey,
        updates.baseUrl !== undefined ? updates.baseUrl : config.baseUrl
      );
    }
  };

  // Calculate remaining characters (SMS max is 160 for single, 153 per part for multipart)
  const messageLength = config.message.length;
  const smsCount = messageLength <= 160 ? 1 : Math.ceil(messageLength / 153);
  const remainingChars = smsCount === 1 ? 160 - messageLength : (smsCount * 153) - messageLength;

  if (!node) return null;

  return (
    <div 
      ref={panelRef}
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: '460px',
        backgroundColor: '#1e1e1e',
        border: '1px solid #444',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Drag Handle */}
      <div 
        className="flex justify-center py-1.5 cursor-move"
        style={{ backgroundColor: '#252525' }}
        onMouseDown={handleDragStart}
      >
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-[#555]" />
          ))}
        </div>
      </div>

      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ 
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #333',
        }}
      >
        <div className="flex items-center gap-3">
          <InfobipSMSIcon size={32} />
          <div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
              Infobip SMS
            </div>
            <div style={{ color: '#888', fontSize: '11px' }}>
              Trimite SMS prin Infobip API
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#333] transition-colors"
        >
          <X style={{ width: '18px', height: '18px', color: '#888' }} />
        </button>
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-5"
        style={{ maxHeight: '70vh' }}
      >
        {/* Custom Account Toggle */}
        <div 
          className="p-3 rounded-lg"
          style={{ backgroundColor: '#2a3a2a', border: '1px solid #3a5a3a' }}
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.useCustomAccount}
              onChange={(e) => updateConfig({ useCustomAccount: e.target.checked })}
              className="w-4 h-4 rounded border-2 border-[#555] bg-transparent"
              style={{ accentColor: '#FF6B00' }}
            />
            <div>
              <span style={{ color: '#fff', fontSize: '13px' }}>
                Folosește cont Infobip propriu
              </span>
              <p style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                Bifează pentru a conecta propriul cont Infobip
              </p>
            </div>
          </label>
        </div>

        {/* API Credentials - shown when useCustomAccount is true */}
        {config.useCustomAccount && (
          <>
            {/* API Key */}
            <div>
              <label className="block mb-2" style={{ color: '#aaa', fontSize: '13px' }}>
                API Key *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => updateConfig({ apiKey: e.target.value })}
                  placeholder="Infobip API Key"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg outline-none transition-colors"
                  style={{
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #444',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-[#444] transition-colors"
                >
                  {showApiKey ? (
                    <EyeOff style={{ width: '16px', height: '16px', color: '#888' }} />
                  ) : (
                    <Eye style={{ width: '16px', height: '16px', color: '#888' }} />
                  )}
                </button>
              </div>
              <a 
                href="https://portal.infobip.com/settings/accounts/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-1.5 text-xs hover:underline"
                style={{ color: '#FF6B00' }}
              >
                Obține API Key din Infobip Portal
                <ExternalLink style={{ width: '12px', height: '12px' }} />
              </a>
            </div>

            {/* Base URL */}
            <div>
              <label className="block mb-2" style={{ color: '#aaa', fontSize: '13px' }}>
                Base URL
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                placeholder="https://xxxxx.api.infobip.com"
                className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
                style={{
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #444',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>
          </>
        )}

        {/* Info when using Agentauto's account */}
        {!config.useCustomAccount && (
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: '#2a3441', border: '1px solid #3a4a5a' }}
          >
            <p style={{ color: '#8ab4f8', fontSize: '12px' }}>
              📱 Se va folosi contul Infobip Agentauto. SMS-urile vor fi trimise de pe numerele configurate în platformă.
            </p>
          </div>
        )}

        {/* From (Sender ID) */}
        <div>
          <label className="block mb-2" style={{ color: '#aaa', fontSize: '13px' }}>
            De la (Sender ID)
          </label>
          <input
            type="text"
            value={config.from}
            onChange={(e) => updateConfig({ from: e.target.value })}
            placeholder="Agentauto"
            className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
            style={{
              backgroundColor: '#2d2d2d',
              border: '1px solid #444',
              color: '#fff',
              fontSize: '13px',
            }}
          />
          <p style={{ color: '#666', fontSize: '11px', marginTop: '6px' }}>
            Numele sau numărul care va apărea ca expeditor
          </p>
        </div>

        {/* To Number */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={{ color: '#aaa', fontSize: '13px' }}>
              Către (Număr telefon) *
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateConfig({ toNumberSource: 'fixed' })}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: config.toNumberSource === 'fixed' ? '#FF6B0033' : '#333',
                  color: config.toNumberSource === 'fixed' ? '#FF6B00' : '#888',
                  border: '1px solid ' + (config.toNumberSource === 'fixed' ? '#FF6B00' : '#444'),
                }}
              >
                Fix
              </button>
              <button
                onClick={() => updateConfig({ toNumberSource: 'workflow' })}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: config.toNumberSource === 'workflow' ? '#FF6B0033' : '#333',
                  color: config.toNumberSource === 'workflow' ? '#FF6B00' : '#888',
                  border: '1px solid ' + (config.toNumberSource === 'workflow' ? '#FF6B00' : '#444'),
                }}
              >
                Din Workflow
              </button>
            </div>
          </div>
          
          {config.toNumberSource === 'fixed' ? (
            <input
              type="tel"
              value={config.toNumber}
              onChange={(e) => updateConfig({ toNumber: e.target.value })}
              placeholder="+40712345678"
              className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
              style={{
                backgroundColor: '#2d2d2d',
                border: '1px solid #444',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === 'toNumber' ? null : 'toNumber');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #444',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <span className="flex items-center gap-2">
                  <span 
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ backgroundColor: '#FF6B0033', color: '#FF6B00' }}
                  >
                    fx
                  </span>
                  {config.toNumberWorkflowField || 'Selectează câmp'}
                </span>
                <ChevronDown style={{ width: '16px', height: '16px', color: '#888' }} />
              </button>
              
              {openDropdown === 'toNumber' && (
                <div 
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10"
                  style={{
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #444',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {phoneWorkflowFields.map((field) => (
                    <button
                      key={field.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConfig({ toNumberWorkflowField: field.value });
                        setOpenDropdown(null);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#383838] transition-colors"
                      style={{
                        color: config.toNumberWorkflowField === field.value ? '#FF6B00' : '#fff',
                        fontSize: '13px',
                      }}
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={{ color: '#aaa', fontSize: '13px' }}>
              Mesaj *
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateConfig({ messageSource: 'fixed' })}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: config.messageSource === 'fixed' ? '#FF6B0033' : '#333',
                  color: config.messageSource === 'fixed' ? '#FF6B00' : '#888',
                  border: '1px solid ' + (config.messageSource === 'fixed' ? '#FF6B00' : '#444'),
                }}
              >
                Fix
              </button>
              <button
                onClick={() => updateConfig({ messageSource: 'workflow' })}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: config.messageSource === 'workflow' ? '#FF6B0033' : '#333',
                  color: config.messageSource === 'workflow' ? '#FF6B00' : '#888',
                  border: '1px solid ' + (config.messageSource === 'workflow' ? '#FF6B00' : '#444'),
                }}
              >
                Din Workflow
              </button>
            </div>
          </div>
          
          {config.messageSource === 'fixed' ? (
            <>
              <textarea
                value={config.message}
                onChange={(e) => updateConfig({ message: e.target.value })}
                placeholder="Textul SMS-ului..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg outline-none resize-none transition-colors"
                style={{
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #444',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
              <div className="flex items-center justify-between mt-1.5">
                <span style={{ color: '#666', fontSize: '11px' }}>
                  {messageLength} caractere • {smsCount} SMS{smsCount > 1 ? '-uri' : ''}
                </span>
                <span style={{ color: remainingChars < 20 ? '#f87171' : '#666', fontSize: '11px' }}>
                  {remainingChars} caractere rămase
                </span>
              </div>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === 'message' ? null : 'message');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #444',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <span className="flex items-center gap-2">
                  <span 
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ backgroundColor: '#FF6B0033', color: '#FF6B00' }}
                  >
                    fx
                  </span>
                  {config.messageWorkflowField || 'Selectează câmp'}
                </span>
                <ChevronDown style={{ width: '16px', height: '16px', color: '#888' }} />
              </button>
              
              {openDropdown === 'message' && (
                <div 
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10"
                  style={{
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #444',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {messageWorkflowFields.map((field) => (
                    <button
                      key={field.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConfig({ messageWorkflowField: field.value });
                        setOpenDropdown(null);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#383838] transition-colors"
                      style={{
                        color: config.messageWorkflowField === field.value ? '#FF6B00' : '#fff',
                        fontSize: '13px',
                      }}
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div 
          className="rounded-lg p-3"
          style={{
            backgroundColor: '#2a3441',
            border: '1px solid #3a4a5a',
          }}
        >
          <p style={{ color: '#8ab4f8', fontSize: '12px', lineHeight: 1.6 }}>
            <strong>Cum funcționează:</strong><br />
            1. Setează numărul destinatar - fix sau din datele workflow-ului (ex: Phone din Zoho CRM)<br />
            2. Scrie mesajul sau selectează un câmp din workflow<br />
            3. SMS-ul va fi trimis când nodul este executat<br />
            <br />
            <strong>Notă:</strong> Numerele trebuie să fie în format internațional (+40...)
          </p>
        </div>
      </div>

      {/* Footer */}
      <div 
        className="flex items-center justify-end gap-2 px-4 py-3"
        style={{ 
          borderTop: '1px solid #333',
          backgroundColor: '#252525',
        }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: '#333',
            color: '#fff',
            fontSize: '13px',
          }}
        >
          Anulează
        </button>
        <button
          onClick={() => onSave(config)}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: '#FF6B00',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Salvează
        </button>
      </div>
    </div>
  );
};

