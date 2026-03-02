import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronDown,
  Eye,
  EyeOff,
  Mail,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { InfobipEmailIcon } from './BrandIcons';

interface InfobipEmailConfig {
  apiKey: string;
  baseUrl: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toEmailSource: 'fixed' | 'workflow';
  toEmailWorkflowField: string;
  subject: string;
  subjectSource: 'fixed' | 'workflow';
  subjectWorkflowField: string;
  bodyType: 'text' | 'html';
  body: string;
  bodySource: 'fixed' | 'workflow';
  bodyWorkflowField: string;
  // For custom account connection
  useCustomAccount: boolean;
}

interface N8NInfobipEmailConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: InfobipEmailConfig;
  } | null;
  onClose: () => void;
  onSave: (config: InfobipEmailConfig) => void;
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

const getDefaultConfig = (): InfobipEmailConfig => {
  const savedCreds = loadSavedCredentials();
  return {
    apiKey: savedCreds.apiKey,
    baseUrl: savedCreds.baseUrl,
    fromEmail: '',
    fromName: 'Agentauto',
    toEmail: '',
    toEmailSource: 'fixed',
    toEmailWorkflowField: 'Email',
    subject: '',
    subjectSource: 'fixed',
    subjectWorkflowField: '',
    bodyType: 'text',
    body: '',
    bodySource: 'fixed',
    bodyWorkflowField: '',
    useCustomAccount: false,
  };
};

// Common workflow fields that might contain email
const emailWorkflowFields = [
  { value: 'Email', label: '📧 Email' },
  { value: 'email', label: '📧 email' },
  { value: 'to', label: '📬 to' },
  { value: 'recipient', label: '👤 recipient' },
  { value: 'contact_email', label: '📧 contact_email' },
];

export const N8NInfobipEmailConfig: React.FC<N8NInfobipEmailConfigProps> = ({
  node,
  onClose,
  onSave,
  previousNode,
}) => {
  const [config, setConfig] = useState<InfobipEmailConfig>(getDefaultConfig);
  const [position, setPosition] = useState({ x: Math.max(20, window.innerWidth - 500), y: 50 });
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
      
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 480);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 600);
      
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

  const updateConfig = (updates: Partial<InfobipEmailConfig>) => {
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

  if (!node) return null;

  return (
    <div 
      ref={panelRef}
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: '480px',
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
          <InfobipEmailIcon size={32} />
          <div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
              Infobip Email
            </div>
            <div style={{ color: '#888', fontSize: '11px' }}>
              Trimite email prin Infobip API
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
              <p style={{ color: '#666', fontSize: '11px', marginTop: '6px' }}>
                URL-ul specific contului tău din Infobip Portal
              </p>
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
              📧 Se va folosi contul Infobip Agentauto. Emailurile vor fi trimise de pe domeniile configurate în platforma Agentauto.
            </p>
          </div>
        )}

        {/* From Email */}
        <div>
          <label className="block mb-2" style={{ color: '#aaa', fontSize: '13px' }}>
            De la (From Email) *
          </label>
          <input
            type="email"
            value={config.fromEmail}
            onChange={(e) => updateConfig({ fromEmail: e.target.value })}
            placeholder="noreply@domain.com"
            className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
            style={{
              backgroundColor: '#2d2d2d',
              border: '1px solid #444',
              color: '#fff',
              fontSize: '13px',
            }}
          />
        </div>

        {/* From Name */}
        <div>
          <label className="block mb-2" style={{ color: '#aaa', fontSize: '13px' }}>
            Nume expeditor
          </label>
          <input
            type="text"
            value={config.fromName}
            onChange={(e) => updateConfig({ fromName: e.target.value })}
            placeholder="Agentauto"
            className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
            style={{
              backgroundColor: '#2d2d2d',
              border: '1px solid #444',
              color: '#fff',
              fontSize: '13px',
            }}
          />
        </div>

        {/* To Email */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={{ color: '#aaa', fontSize: '13px' }}>
              Către (To Email) *
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateConfig({ toEmailSource: 'fixed' })}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: config.toEmailSource === 'fixed' ? '#FF6B0033' : '#333',
                  color: config.toEmailSource === 'fixed' ? '#FF6B00' : '#888',
                  border: '1px solid ' + (config.toEmailSource === 'fixed' ? '#FF6B00' : '#444'),
                }}
              >
                Fix
              </button>
              <button
                onClick={() => updateConfig({ toEmailSource: 'workflow' })}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: config.toEmailSource === 'workflow' ? '#FF6B0033' : '#333',
                  color: config.toEmailSource === 'workflow' ? '#FF6B00' : '#888',
                  border: '1px solid ' + (config.toEmailSource === 'workflow' ? '#FF6B00' : '#444'),
                }}
              >
                Din Workflow
              </button>
            </div>
          </div>
          
          {config.toEmailSource === 'fixed' ? (
            <input
              type="email"
              value={config.toEmail}
              onChange={(e) => updateConfig({ toEmail: e.target.value })}
              placeholder="recipient@example.com"
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
                  setOpenDropdown(openDropdown === 'toEmail' ? null : 'toEmail');
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
                  {config.toEmailWorkflowField || 'Selectează câmp'}
                </span>
                <ChevronDown style={{ width: '16px', height: '16px', color: '#888' }} />
              </button>
              
              {openDropdown === 'toEmail' && (
                <div 
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10"
                  style={{
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #444',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  {emailWorkflowFields.map((field) => (
                    <button
                      key={field.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateConfig({ toEmailWorkflowField: field.value });
                        setOpenDropdown(null);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#383838] transition-colors"
                      style={{
                        color: config.toEmailWorkflowField === field.value ? '#FF6B00' : '#fff',
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

        {/* Subject */}
        <div>
          <label className="block mb-2" style={{ color: '#aaa', fontSize: '13px' }}>
            Subiect *
          </label>
          <input
            type="text"
            value={config.subject}
            onChange={(e) => updateConfig({ subject: e.target.value })}
            placeholder="Subiectul emailului..."
            className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
            style={{
              backgroundColor: '#2d2d2d',
              border: '1px solid #444',
              color: '#fff',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Body Type */}
        <div>
          <label className="block mb-2" style={{ color: '#aaa', fontSize: '13px' }}>
            Tip conținut
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => updateConfig({ bodyType: 'text' })}
              className="flex-1 px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: config.bodyType === 'text' ? '#FF6B0033' : '#2d2d2d',
                border: '1px solid ' + (config.bodyType === 'text' ? '#FF6B00' : '#444'),
                color: config.bodyType === 'text' ? '#FF6B00' : '#fff',
                fontSize: '13px',
              }}
            >
              Text simplu
            </button>
            <button
              onClick={() => updateConfig({ bodyType: 'html' })}
              className="flex-1 px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: config.bodyType === 'html' ? '#FF6B0033' : '#2d2d2d',
                border: '1px solid ' + (config.bodyType === 'html' ? '#FF6B00' : '#444'),
                color: config.bodyType === 'html' ? '#FF6B00' : '#fff',
                fontSize: '13px',
              }}
            >
              HTML
            </button>
          </div>
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={{ color: '#aaa', fontSize: '13px' }}>
              Conținut email *
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateConfig({ bodySource: 'fixed' })}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: config.bodySource === 'fixed' ? '#FF6B0033' : '#333',
                  color: config.bodySource === 'fixed' ? '#FF6B00' : '#888',
                  border: '1px solid ' + (config.bodySource === 'fixed' ? '#FF6B00' : '#444'),
                }}
              >
                Fix
              </button>
              <button
                onClick={() => updateConfig({ bodySource: 'workflow' })}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: config.bodySource === 'workflow' ? '#FF6B0033' : '#333',
                  color: config.bodySource === 'workflow' ? '#FF6B00' : '#888',
                  border: '1px solid ' + (config.bodySource === 'workflow' ? '#FF6B00' : '#444'),
                }}
              >
                Din Workflow
              </button>
            </div>
          </div>
          
          {config.bodySource === 'fixed' ? (
            <textarea
              value={config.body}
              onChange={(e) => updateConfig({ body: e.target.value })}
              placeholder={config.bodyType === 'html' ? '<html><body>...</body></html>' : 'Conținutul emailului...'}
              rows={5}
              className="w-full px-3 py-2.5 rounded-lg outline-none resize-none transition-colors"
              style={{
                backgroundColor: '#2d2d2d',
                border: '1px solid #444',
                color: '#fff',
                fontSize: '13px',
                fontFamily: config.bodyType === 'html' ? 'monospace' : 'inherit',
              }}
            />
          ) : (
            <input
              type="text"
              value={config.bodyWorkflowField}
              onChange={(e) => updateConfig({ bodyWorkflowField: e.target.value })}
              placeholder="Ex: summary, transcription, analysis..."
              className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
              style={{
                backgroundColor: '#2d2d2d',
                border: '1px solid #444',
                color: '#fff',
                fontSize: '13px',
              }}
            />
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
            1. Configurează adresa expeditorului (trebuie să fie verificată în Infobip)<br />
            2. Setează destinatarul - fix sau din datele workflow-ului<br />
            3. Scrie subiectul și conținutul emailului<br />
            4. Emailul va fi trimis când nodul este executat în workflow
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

