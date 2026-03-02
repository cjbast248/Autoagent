import React, { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface AltegioConfig {
  partnerId: string;
  partnerToken: string;
  userToken: string;
  appId: string;
  baseUrl?: string;
  connectUrl?: string;
  redirectUrl?: string;
  state?: string;
  action?: string;
  params?: Record<string, any>;
  payload?: Record<string, any>;
  companyId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  node: {
    id: string;
    label: string;
    icon: string;
    config?: AltegioConfig;
  } | null;
  onUpdateConfig?: (nodeId: string, config: AltegioConfig) => void;
  presetAction?: string;
}

const STORAGE_KEY = 'kalina-altegio-credentials';

const loadSavedCreds = (): Partial<AltegioConfig> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Cannot read Altegio creds from storage', e);
  }
  return {};
};

const saveCreds = (cfg: Partial<AltegioConfig>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('Cannot save Altegio creds to storage', e);
  }
};

export const N8NAltegioConfig: React.FC<Props> = ({
  isOpen,
  onClose,
  node,
  onUpdateConfig,
  presetAction,
}) => {
  const [config, setConfig] = useState<AltegioConfig>({
    partnerId: '',
    partnerToken: '',
    userToken: '',
    appId: '',
    baseUrl: 'https://api.alteg.io/api/v1',
    connectUrl: 'https://app.alteg.io/e/mp_1253_aichat/',
    redirectUrl: 'https://app.agentauto.app/account/workflow?altegio=connected',
    state: '',
    companyId: '',
    action: presetAction,
    params: {},
    payload: {},
    ...loadSavedCreds(),
    ...(node?.config || {}),
  });
  const [position, setPosition] = useState({ x: Math.max(20, window.innerWidth - 480), y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 460);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 520);
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };
    const handleUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    if (node?.config) {
      setConfig(prev => ({ ...prev, ...node.config }));
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const updateConfig = (partial: Partial<AltegioConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    // Persist creds (without params/payload/action to avoid noise)
    saveCreds({
      partnerId: next.partnerId,
      partnerToken: next.partnerToken,
      userToken: next.userToken,
      appId: next.appId,
      baseUrl: next.baseUrl,
      connectUrl: next.connectUrl,
      redirectUrl: next.redirectUrl,
      state: next.state,
      companyId: next.companyId,
    });
    onUpdateConfig?.(node.id, next);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    setIsDragging(true);
  };

  const actionLabel = presetAction
    ? presetAction.replace(/-/g, ' ')
    : (config.action || '').replace(/-/g, ' ');

  const getEffectiveState = () => config.state?.trim() || `k-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
  const getEffectiveRedirect = () => config.redirectUrl?.trim() || 'https://app.agentauto.app/account/workflow?altegio=connected';
  const buildConnectUrl = (stateValue: string) => {
    const base = config.connectUrl?.trim() || 'https://app.alteg.io/e/mp_1253_aichat/';
    try {
      const url = new URL(base);
      if (stateValue) url.searchParams.set('state', stateValue);
      const redirect = getEffectiveRedirect();
      if (redirect) url.searchParams.set('redirect', redirect);
      return url.toString();
    } catch {
      // fallback: if URL is invalid, return as-is
      return base;
    }
  };

  const handleOpenConnect = () => {
    const stateValue = getEffectiveState();
    if (!config.state) {
      updateConfig({ state: stateValue });
    }
    const href = buildConnectUrl(stateValue);
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: 460,
        backgroundColor: '#1e1e1e',
        border: '1px solid #444',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Drag handle */}
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
        style={{ backgroundColor: '#1e1e1e', borderBottom: '1px solid #333' }}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-400" size={18} />
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
              Altegio {actionLabel ? `– ${actionLabel}` : ''}
            </div>
            <div style={{ color: '#888', fontSize: 11 }}>
              Setează credențialele Altegio pentru nod
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#333] transition-colors"
        >
          <X size={16} className="text-[#888]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '70vh' }}>
        <div className="p-3 rounded-lg border border-[#2f3b4f] bg-[#243043] text-xs text-blue-100">
          Pentru utilizatori: nu introduceți token-uri. Lăsați câmpurile goale și puneți doar ID-ul salonului/companiei în nodul Altegio (numărul din link-ul app.alteg.io/appstore/&lt;ID&gt; sau /company/&lt;ID&gt;). Credențialele globale sunt folosite automat din aplicație.
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Company / Salon ID</label>
          <input
            value={config.companyId || ''}
            onChange={(e) => updateConfig({ companyId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#2d2d2d] border border-[#444] text-white text-sm"
            placeholder="ID din link: app.alteg.io/appstore/<ID> sau /company/<ID>"
          />
          <p className="text-xs text-slate-400 mt-1">
            După ce te abonezi la app, ia numărul din URL (segmentul numeric) și pune-l aici.
          </p>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Connect URL (Altegio app)</label>
          <div className="flex gap-2 items-center">
            <input
              value={config.connectUrl || ''}
              onChange={(e) => updateConfig({ connectUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#2d2d2d] border border-[#444] text-white text-sm"
              placeholder="https://app.alteg.io/e/mp_1253_aichat/"
            />
            <button
              type="button"
              onClick={handleOpenConnect}
              className="px-3 py-2 rounded-lg text-xs bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-colors whitespace-nowrap"
            >
              Deschide
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
        {/* Redirect/State ascunse pentru clienți (gestionăm global sau automat) */}
        </div>

        <div className="p-3 rounded-lg border border-[#334155] bg-[#1f2937] text-xs text-slate-200 space-y-1">
          <div className="font-semibold text-slate-100">Ce urmează</div>
          <ul className="list-disc pl-4 space-y-1">
            <li>Salvează credențialele (local) și închide panelul.</li>
            <li>Completează câmpurile nodului (serviciu, filială, dată, client) după ce adăugăm UI specific.</li>
            <li>Execută workflow-ul – vom trimite acțiunea spre edge function Altegio.</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-3"
        style={{ backgroundColor: '#252525', borderTop: '1px solid #333' }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#333] text-white bg-[#2d2d2d]"
        >
          Închide
        </button>
      </div>
    </div>
  );
};

