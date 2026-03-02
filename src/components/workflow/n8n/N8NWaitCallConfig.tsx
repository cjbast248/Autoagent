import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Loader2, ArrowLeft } from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';

interface N8NWaitCallConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: any;
  };
  onClose: () => void;
  onSave: (config: any) => void;
  inputData?: any;
  outputData?: any;
}

export const N8NWaitCallConfig: React.FC<N8NWaitCallConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
}) => {
  const [timeoutMinutes, setTimeoutMinutes] = useState(10);
  const [pollingInterval, setPollingInterval] = useState(5);

  useEffect(() => {
    if (node.config) {
      setTimeoutMinutes(node.config.timeoutMinutes || 10);
      setPollingInterval(node.config.pollingInterval || 5);
    }
  }, [node.config]);

  const handleSave = () => {
    onSave({
      timeoutMinutes,
      pollingInterval,
    });
    onClose();
  };

  return createPortal(
    <div
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
              enableDrag
            />
          </div>
        </div>

        {/* Main Config Panel - Center */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            width: '650px',
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            zIndex: 5,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Clock style={{ width: '18px', height: '18px', color: '#fff' }} />
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                  Wait for Call Completion
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
                  Așteaptă finalizarea apelului
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#2b2b2b' }}>
            {/* Info Box */}
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#252525', border: '1px solid #444' }}
            >
              <div className="flex items-start gap-2">
                <Loader2 style={{ width: '16px', height: '16px', color: '#8B5CF6', marginTop: '2px' }} />
                <div style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.5' }}>
                  Acest nod primește <strong style={{ color: '#fff' }}>conversation_id</strong> de la
                  nodul Kalina Call, verifică periodic statusul apelului și returnează transcrierea când
                  apelul este finalizat.
                </div>
              </div>
            </div>

            {/* Timeout Setting */}
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-2">
                Timeout maxim (minute) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={timeoutMinutes}
                onChange={(e) => setTimeoutMinutes(parseInt(e.target.value) || 10)}
                min={1}
                max={60}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[#252525] border border-[#333] text-white outline-none focus:border-[#8B5CF6]"
              />
              <div className="text-xs text-gray-500 mt-1">
                După acest timp, nodul va opri verificarea și va returna eroare.
              </div>
            </div>

            {/* Polling Interval */}
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-2">
                Interval verificare (secunde) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={pollingInterval}
                onChange={(e) => setPollingInterval(parseInt(e.target.value) || 5)}
                min={2}
                max={30}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[#252525] border border-[#333] text-white outline-none focus:border-[#8B5CF6]"
              />
              <div className="text-xs text-gray-500 mt-1">
                Cât de des să verifice dacă apelul s-a terminat (default: 5 secunde).
              </div>
            </div>

            {/* Output Info */}
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#1a3a2a', border: '1px solid #2d5a3d' }}
            >
              <div style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                Output după finalizare:
              </div>
              <div style={{ color: '#86efac', fontSize: '11px', lineHeight: '1.8' }}>
                • <code style={{ backgroundColor: '#2d5a3d', padding: '2px 4px', borderRadius: '4px' }}>transcript</code> - transcrierea completă<br />
                • <code style={{ backgroundColor: '#2d5a3d', padding: '2px 4px', borderRadius: '4px' }}>duration_seconds</code> - durata apelului<br />
                • <code style={{ backgroundColor: '#2d5a3d', padding: '2px 4px', borderRadius: '4px' }}>status</code> - completed/failed<br />
                • <code style={{ backgroundColor: '#2d5a3d', padding: '2px 4px', borderRadius: '4px' }}>summary</code> - rezumatul conversației
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-4 py-3"
            style={{ backgroundColor: '#222', borderTop: '1px solid #333' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-medium transition-colors hover:bg-[#444] bg-[#333] text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded text-xs font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: '#8B5CF6', color: '#fff' }}
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
              data={outputData}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
