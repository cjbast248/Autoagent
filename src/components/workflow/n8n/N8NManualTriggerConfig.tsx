import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Clock, Calendar, Repeat, Zap, Info, ChevronDown, ArrowLeft } from 'lucide-react';

// Manual Trigger Icon
const ManualTriggerIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div 
    className="flex items-center justify-center rounded-lg"
    style={{ 
      width: size, 
      height: size, 
      backgroundColor: '#5865F2',
    }}
  >
    <Play className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
  </div>
);

type TriggerMode = 'manual' | 'interval' | 'daily';

interface ManualTriggerConfig {
  mode: TriggerMode;
  // Interval settings
  intervalValue: number;
  intervalUnit: 'seconds' | 'minutes' | 'hours';
  // Daily schedule settings
  dailyTime: string; // HH:MM format
  dailyDays: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  // General
  enabled: boolean;
}

interface N8NManualTriggerConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: ManualTriggerConfig;
  };
  onClose: () => void;
  onSave: (config: ManualTriggerConfig) => void;
}

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Lun', fullLabel: 'Luni' },
  { value: 'tue', label: 'Mar', fullLabel: 'Marți' },
  { value: 'wed', label: 'Mie', fullLabel: 'Miercuri' },
  { value: 'thu', label: 'Joi', fullLabel: 'Joi' },
  { value: 'fri', label: 'Vin', fullLabel: 'Vineri' },
  { value: 'sat', label: 'Sâm', fullLabel: 'Sâmbătă' },
  { value: 'sun', label: 'Dum', fullLabel: 'Duminică' },
];

const DEFAULT_CONFIG: ManualTriggerConfig = {
  mode: 'manual',
  intervalValue: 5,
  intervalUnit: 'minutes',
  dailyTime: '09:00',
  dailyDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
  enabled: true,
};

export const N8NManualTriggerConfig: React.FC<N8NManualTriggerConfigProps> = ({
  node,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<ManualTriggerConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...node.config,
  }));

  const getModeIcon = (mode: TriggerMode) => {
    switch (mode) {
      case 'manual':
        return <Play className="w-4 h-4" />;
      case 'interval':
        return <Repeat className="w-4 h-4" />;
      case 'daily':
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getModeLabel = (mode: TriggerMode) => {
    switch (mode) {
      case 'manual':
        return 'Manual';
      case 'interval':
        return 'La Interval';
      case 'daily':
        return 'Programat Zilnic';
    }
  };

  const getModeDescription = (mode: TriggerMode) => {
    switch (mode) {
      case 'manual':
        return 'Se pornește doar când apeși butonul "Execute"';
      case 'interval':
        return 'Se repetă automat la fiecare interval de timp';
      case 'daily':
        return 'Se execută o dată pe zi la ora programată';
    }
  };

  const toggleDay = (day: string) => {
    setConfig(prev => ({
      ...prev,
      dailyDays: prev.dailyDays.includes(day)
        ? prev.dailyDays.filter(d => d !== day)
        : [...prev.dailyDays, day],
    }));
  };

  const getIntervalDescription = () => {
    const { intervalValue, intervalUnit } = config;
    const unitLabels: Record<string, string> = {
      seconds: intervalValue === 1 ? 'secundă' : 'secunde',
      minutes: intervalValue === 1 ? 'minut' : 'minute',
      hours: intervalValue === 1 ? 'oră' : 'ore',
    };
    return `La fiecare ${intervalValue} ${unitLabels[intervalUnit]}`;
  };

  const getDailyDescription = () => {
    const { dailyTime, dailyDays } = config;
    if (dailyDays.length === 0) return 'Selectează cel puțin o zi';
    if (dailyDays.length === 7) return `În fiecare zi la ${dailyTime}`;
    if (dailyDays.length === 5 && !dailyDays.includes('sat') && !dailyDays.includes('sun')) {
      return `Luni - Vineri la ${dailyTime}`;
    }
    const dayLabels = dailyDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ');
    return `${dayLabels} la ${dailyTime}`;
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: '#131419', backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs text-gray-500 text-center py-8">
              No input data for trigger nodes
            </div>
          </div>
        </div>

        {/* Center Panel - Main Config */}
        <div
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
            style={{ backgroundColor: '#5865F2' }}
          >
            <div className="flex items-center gap-3">
              <ManualTriggerIcon size={28} />
              <div>
                <h3 className="text-sm font-semibold text-white">{node.label}</h3>
                <p className="text-xs text-white/70">Configurare trigger</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          
          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#888' }}>
              Mod de Pornire
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              {(['manual', 'interval', 'daily'] as TriggerMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setConfig(prev => ({ ...prev, mode }))}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    config.mode === mode
                      ? 'border-[#5865F2] bg-[#5865F2]/10'
                      : 'border-[#333] hover:border-[#444] bg-[#252525]'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    config.mode === mode ? 'bg-[#5865F2] text-white' : 'bg-[#333] text-gray-400'
                  }`}>
                    {getModeIcon(mode)}
                  </div>
                  <span className={`text-xs font-medium ${
                    config.mode === mode ? 'text-white' : 'text-gray-400'
                  }`}>
                    {getModeLabel(mode)}
                  </span>
                </button>
              ))}
            </div>

            {/* Mode Description */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#252525] border border-[#333]">
              <Info className="w-4 h-4 text-[#5865F2] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                {getModeDescription(config.mode)}
              </p>
            </div>
          </div>

          {/* Interval Settings */}
          {config.mode === 'interval' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#252525] border border-[#333]">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#5865F2]" />
                <span className="text-sm font-medium text-white">Setări Interval</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Execută la fiecare</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={config.intervalValue}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    intervalValue: Math.max(1, parseInt(e.target.value) || 1) 
                  }))}
                  className="w-20 px-3 py-2 rounded-lg text-sm text-center"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #444',
                    color: '#fff',
                  }}
                />
                <select
                  value={config.intervalUnit}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    intervalUnit: e.target.value as 'seconds' | 'minutes' | 'hours' 
                  }))}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #444',
                    color: '#fff',
                  }}
                >
                  <option value="seconds">Secunde</option>
                  <option value="minutes">Minute</option>
                  <option value="hours">Ore</option>
                </select>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1a1a1a] border border-[#5865F2]/30">
                <Clock className="w-4 h-4 text-[#5865F2]" />
                <span className="text-xs text-[#5865F2] font-medium">
                  {getIntervalDescription()}
                </span>
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 min', value: 1, unit: 'minutes' },
                  { label: '5 min', value: 5, unit: 'minutes' },
                  { label: '15 min', value: 15, unit: 'minutes' },
                  { label: '30 min', value: 30, unit: 'minutes' },
                  { label: '1 oră', value: 1, unit: 'hours' },
                  { label: '6 ore', value: 6, unit: 'hours' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setConfig(prev => ({ 
                      ...prev, 
                      intervalValue: preset.value, 
                      intervalUnit: preset.unit as 'minutes' | 'hours' 
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      config.intervalValue === preset.value && config.intervalUnit === preset.unit
                        ? 'bg-[#5865F2] text-white'
                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#444]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Daily Schedule Settings */}
          {config.mode === 'daily' && (
            <div className="space-y-4 p-4 rounded-xl bg-[#252525] border border-[#333]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#5865F2]" />
                <span className="text-sm font-medium text-white">Programare Zilnică</span>
              </div>
              
              {/* Time picker */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Ora de execuție</label>
                <input
                  type="time"
                  value={config.dailyTime}
                  onChange={(e) => setConfig(prev => ({ ...prev, dailyTime: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg text-lg font-mono"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #444',
                    color: '#fff',
                  }}
                />
              </div>

              {/* Days of week */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Zile de execuție</label>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                        config.dailyDays.includes(day.value)
                          ? 'bg-[#5865F2] text-white'
                          : 'bg-[#1a1a1a] text-gray-500 hover:text-gray-300 border border-[#444]'
                      }`}
                      title={day.fullLabel}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfig(prev => ({ 
                    ...prev, 
                    dailyDays: ['mon', 'tue', 'wed', 'thu', 'fri'] 
                  }))}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#444] transition-colors"
                >
                  Luni - Vineri
                </button>
                <button
                  onClick={() => setConfig(prev => ({ 
                    ...prev, 
                    dailyDays: ['sat', 'sun'] 
                  }))}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#444] transition-colors"
                >
                  Weekend
                </button>
                <button
                  onClick={() => setConfig(prev => ({ 
                    ...prev, 
                    dailyDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] 
                  }))}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#444] transition-colors"
                >
                  Toate zilele
                </button>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1a1a1a] border border-[#5865F2]/30">
                <Clock className="w-4 h-4 text-[#5865F2]" />
                <span className="text-xs text-[#5865F2] font-medium">
                  {getDailyDescription()}
                </span>
              </div>
            </div>
          )}

          {/* Manual Mode Info */}
          {config.mode === 'manual' && (
            <div className="space-y-3 p-4 rounded-xl bg-[#252525] border border-[#333]">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#5865F2]" />
                <span className="text-sm font-medium text-white">Mod Manual</span>
              </div>
              
              <p className="text-xs text-gray-400 leading-relaxed">
                Workflow-ul va porni doar când apeși butonul 
                <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                  <Play className="w-3 h-3" /> Execute
                </span>
                din bara de sus.
              </p>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1a1a1a] border border-[#333]">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-gray-300">
                  Poți și să activezi workflow-ul pentru a primi date de la webhook.
                </span>
              </div>
            </div>
          )}

          {/* Enable/Disable Toggle (only for scheduled modes) */}
          {config.mode !== 'manual' && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#252525] border border-[#333]">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.enabled ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                  <Zap className={`w-4 h-4 ${config.enabled ? 'text-green-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">Programare Activă</span>
                  <p className="text-xs text-gray-500">
                    {config.enabled ? 'Workflow-ul va rula automat' : 'Programarea este dezactivată'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ backgroundColor: config.enabled ? '#5865F2' : '#444' }}
              >
                <span
                  className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                  style={{ left: config.enabled ? '26px' : '4px' }}
                />
              </button>
            </div>
          )}

        </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-4 py-3"
            style={{ backgroundColor: '#222', borderTop: '1px solid #333' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#333]"
              style={{ backgroundColor: '#2a2a2a', color: '#fff' }}
            >
              Anulează
            </button>
            <button
              onClick={() => onSave(config)}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: '#5865F2', color: '#fff' }}
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
            <div className="text-xs text-gray-500 text-center py-8">
              Output will be available after execution
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default N8NManualTriggerConfig;
