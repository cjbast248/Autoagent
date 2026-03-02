import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { LANGUAGES } from '@/constants/constants';
import { Globe, X, PlusCircle } from 'lucide-react';

interface AgentLanguageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLanguage: string;
  onSelect: (language: string) => void;
}

// Flag emoji map
const FLAG_EMOJI: Record<string, string> = {
  'RO': '🇷🇴',
  'US': '🇺🇸',
  'ES': '🇪🇸',
  'FR': '🇫🇷',
  'DE': '🇩🇪',
  'IT': '🇮🇹',
  'PT': '🇵🇹',
  'RU': '🇷🇺',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'CN': '🇨🇳',
  'SA': '🇸🇦',
  'IN': '🇮🇳',
  'TH': '🇹🇭',
  'VN': '🇻🇳',
  'NL': '🇳🇱',
  'TR': '🇹🇷',
  'PL': '🇵🇱',
  'SE': '🇸🇪',
  'DK': '🇩🇰',
  'NO': '🇳🇴',
  'FI': '🇫🇮',
  'HU': '🇭🇺',
  'CZ': '🇨🇿',
  'SK': '🇸🇰',
  'BG': '🇧🇬',
  'HR': '🇭🇷',
  'SI': '🇸🇮',
  'EE': '🇪🇪',
  'LV': '🇱🇻',
  'LT': '🇱🇹',
};

// Language code map for display
const LANG_CODE: Record<string, string> = {
  'ro': 'RO-MD',
  'en': 'EN-US',
  'es': 'ES-EU',
  'fr': 'FR-FR',
  'de': 'DE-DE',
  'it': 'IT-IT',
  'pt': 'PT-PT',
  'ru': 'RU-RU',
  'ja': 'JA-JP',
  'ko': 'KO-KR',
  'zh': 'ZH-CN',
  'ar': 'AR-SA',
  'hi': 'HI-IN',
  'th': 'TH-TH',
  'vi': 'VI-VN',
  'nl': 'NL-NL',
  'tr': 'TR-TR',
  'pl': 'PL-PL',
  'sv': 'SV-SE',
  'da': 'DA-DK',
  'no': 'NO-NO',
  'fi': 'FI-FI',
  'hu': 'HU-HU',
  'cs': 'CS-CZ',
  'sk': 'SK-SK',
  'bg': 'BG-BG',
  'hr': 'HR-HR',
  'sl': 'SL-SI',
  'et': 'ET-EE',
  'lv': 'LV-LV',
  'lt': 'LT-LT',
};

export function AgentLanguageSelector({ open, onOpenChange, selectedLanguage, onSelect }: AgentLanguageSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return LANGUAGES;
    const query = searchQuery.toLowerCase();
    return LANGUAGES.filter(lang =>
      lang.label.toLowerCase().includes(query) ||
      lang.value.toLowerCase().includes(query) ||
      lang.countryCode.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[360px] sm:max-w-[360px] p-0 border-l border-zinc-100 bg-white"
      >
        <aside className="h-full flex flex-col pt-6 px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xs font-bold text-black uppercase tracking-widest">Input Language</h2>
                <span className="text-[9px] text-zinc-300 font-mono">DETECT: AUTO</span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="text-zinc-300 hover:text-black transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Globe className="w-3.5 h-3.5 text-zinc-300" />
              <input
                type="text"
                placeholder="Search region or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-zinc-600 placeholder-zinc-300 border-none bg-transparent p-0 text-[13px] focus:outline-none"
              />
            </div>
          </div>

          {/* Language List */}
          <div className="flex-1 overflow-y-auto space-y-5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {filteredLanguages.map((lang) => {
              const isSelected = selectedLanguage === lang.value;

              return (
                <div
                  key={lang.value}
                  onClick={() => {
                    onSelect(lang.value);
                    onOpenChange(false);
                  }}
                  className={`cursor-pointer group flex items-center justify-between transition-all duration-200 ${
                    isSelected ? 'opacity-100' : 'opacity-60 hover:opacity-100 hover:pl-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Dot indicator */}
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : ''}`} />

                    {/* Flag */}
                    <span className={`text-base leading-none transition-all ${
                      isSelected ? 'grayscale-0' : 'grayscale-[20%] group-hover:grayscale-0'
                    }`}>
                      {FLAG_EMOJI[lang.countryCode] || '🏳️'}
                    </span>

                    {/* Label */}
                    <span className={`text-sm transition ${
                      isSelected
                        ? 'font-bold text-black'
                        : 'font-medium text-zinc-600 group-hover:text-black'
                    }`}>
                      {lang.label}
                    </span>
                  </div>

                  {/* Language code */}
                  <span className={`text-[9px] font-mono transition ${
                    isSelected
                      ? 'text-zinc-400'
                      : 'text-zinc-300 group-hover:text-zinc-400'
                  }`}>
                    {LANG_CODE[lang.value] || lang.value.toUpperCase()}
                  </span>
                </div>
              );
            })}

            {filteredLanguages.length === 0 && (
              <div className="text-center text-zinc-300 text-sm py-8">
                No languages found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-50 pb-4">
            <button
              className="flex items-center gap-2 text-[10px] font-bold text-zinc-300 hover:text-black transition uppercase tracking-widest"
            >
              <PlusCircle className="w-3 h-3" />
              Request Dialect
            </button>
          </div>
        </aside>

        {/* CSS for scrollbar */}
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </SheetContent>
    </Sheet>
  );
}
