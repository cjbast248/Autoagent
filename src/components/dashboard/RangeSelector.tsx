import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Range = '24h' | '7d' | '14d' | '30d';

export interface RangeSelectorProps {
  value: Range;
  onChange: (value: Range) => void;
  className?: string;
}

export default function RangeSelector({ value, onChange, className }: RangeSelectorProps) {
  const { t } = useLanguage();
  
  const ranges: { value: Range; label: string }[] = [
    { value: '24h', label: t('dashboard.hours24') || '24h' },
    { value: '7d', label: t('dashboard.days7') || '7 days' },
    { value: '14d', label: t('dashboard.days14') || '14 days' },
    { value: '30d', label: t('dashboard.days30') || '30 days' },
  ];

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100 ${className ?? ''}`}>
      {ranges.map(r => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === r.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
