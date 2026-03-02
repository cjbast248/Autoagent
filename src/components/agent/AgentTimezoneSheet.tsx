import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Search, Clock, Check, Zap, Globe, X } from 'lucide-react';

interface AgentTimezoneSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTimezone: string;
  onSelect: (timezone: string) => void;
}

const TIMEZONES = [
  { id: 'UTC', label: 'UTC', meta: 'Universal Time Coordinated', offset: '+00:00' },
  { id: 'America/New_York', label: 'Eastern Time (US)', meta: 'New_York • UTC-05:00', offset: '-05:00' },
  { id: 'America/Chicago', label: 'Central Time (US)', meta: 'Chicago • UTC-06:00', offset: '-06:00' },
  { id: 'America/Denver', label: 'Mountain Time (US)', meta: 'Denver • UTC-07:00', offset: '-07:00' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (US)', meta: 'Los_Angeles • UTC-08:00', offset: '-08:00' },
  { id: 'Europe/London', label: 'London', meta: 'Europe/London • UTC+00:00', offset: '+00:00' },
  { id: 'Europe/Paris', label: 'Paris / Berlin', meta: 'CET • UTC+01:00', offset: '+01:00' },
  { id: 'Europe/Amsterdam', label: 'Amsterdam', meta: 'Europe/Amsterdam • UTC+01:00', offset: '+01:00' },
  { id: 'Europe/Bucharest', label: 'Bucharest', meta: 'EET • UTC+02:00', offset: '+02:00' },
  { id: 'Europe/Chisinau', label: 'Chisinau', meta: 'Europe/Chisinau • UTC+02:00', offset: '+02:00' },
  { id: 'Asia/Tokyo', label: 'Tokyo', meta: 'JST • UTC+09:00', offset: '+09:00' },
  { id: 'Asia/Shanghai', label: 'Shanghai', meta: 'CST • UTC+08:00', offset: '+08:00' },
  { id: 'Asia/Kolkata', label: 'India', meta: 'IST • UTC+05:30', offset: '+05:30' },
  { id: 'Asia/Dubai', label: 'Dubai', meta: 'GST • UTC+04:00', offset: '+04:00' },
  { id: 'Australia/Sydney', label: 'Sydney', meta: 'AEDT • UTC+11:00', offset: '+11:00' },
  { id: 'Pacific/Auckland', label: 'Auckland', meta: 'NZDT • UTC+13:00', offset: '+13:00' },
  { id: 'America/Sao_Paulo', label: 'São Paulo', meta: 'BRT • UTC-03:00', offset: '-03:00' },
  { id: 'Africa/Cairo', label: 'Cairo', meta: 'EET • UTC+02:00', offset: '+02:00' },
];

export const AgentTimezoneSheet: React.FC<AgentTimezoneSheetProps> = ({
  open,
  onOpenChange,
  selectedTimezone,
  onSelect,
}) => {
  const [search, setSearch] = useState('');

  const filteredTimezones = TIMEZONES.filter(
    (tz) =>
      tz.label.toLowerCase().includes(search.toLowerCase()) ||
      tz.id.toLowerCase().includes(search.toLowerCase()) ||
      tz.meta.toLowerCase().includes(search.toLowerCase())
  );

  const isAutoDetect = !selectedTimezone;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[400px] p-0 bg-white border-l border-zinc-100 flex flex-col [&>button]:hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-black">Set Timezone</h2>
              <p className="text-xs text-zinc-500 mt-1">Configure time-sensitive agent responses.</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-black transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search cities (e.g. Bucharest)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2.5 pl-9 pr-3 bg-zinc-100 border border-transparent rounded-xl text-[13px] text-zinc-900 placeholder:text-zinc-400 transition-all focus:bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        {/* List - flex-1 to fill remaining space */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

          {/* Auto-detect option */}
          <button
            onClick={() => {
              onSelect('');
              onOpenChange(false);
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all mb-6 border ${
              isAutoDetect
                ? 'bg-zinc-900 border-zinc-900'
                : 'bg-zinc-50 border-dashed border-zinc-300 hover:border-zinc-400 hover:bg-white'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                isAutoDetect ? 'text-white' : 'text-zinc-500'
              }`}>
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className={`text-[13px] font-medium block ${isAutoDetect ? 'text-white' : 'text-zinc-900'}`}>
                  Auto-detect
                </span>
                <span className={`text-[11px] font-mono ${isAutoDetect ? 'text-zinc-300' : 'text-zinc-400'}`}>
                  Use system timezone
                </span>
              </div>
            </div>
            <Check className={`w-4 h-4 transition-all ${
              isAutoDetect ? 'opacity-100 text-white' : 'opacity-0'
            }`} />
          </button>

          {/* Section Label */}
          <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider mb-2 ml-2">
            Common Timezones
          </div>

          {/* Timezone List */}
          {filteredTimezones.map((tz) => {
            const isActive = selectedTimezone === tz.id;
            const isUTC = tz.id === 'UTC';

            return (
              <button
                key={tz.id}
                onClick={() => {
                  onSelect(tz.id);
                  onOpenChange(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all mb-1 border ${
                  isActive
                    ? 'bg-zinc-100 border-zinc-200'
                    : 'border-transparent hover:bg-zinc-50 hover:border-zinc-100'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center mr-3 transition-colors ${
                    isActive
                      ? 'bg-white border-zinc-300 text-black'
                      : 'bg-white border-zinc-200 text-zinc-500 group-hover:border-zinc-300 group-hover:text-black'
                  }`}>
                    {isUTC ? <Globe className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <span className={`text-[13px] block mb-0.5 ${
                      isActive ? 'text-black font-semibold' : 'text-zinc-900 font-medium'
                    }`}>
                      {tz.label}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {tz.meta}
                    </span>
                  </div>
                </div>
                <Check className={`w-4 h-4 text-black transition-all ${
                  isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                }`} />
              </button>
            );
          })}

          {filteredTimezones.length === 0 && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              No timezones found matching "{search}"
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
