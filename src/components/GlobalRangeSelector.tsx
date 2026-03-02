import React from 'react';

type Range = '24h' | '7d' | '14d' | '30d';

export interface GlobalRangeSelectorProps {
  value: Range;
  onChange: (value: Range) => void;
  className?: string;
}

const ranges: Range[] = ['24h', '7d', '14d', '30d'];

export default function GlobalRangeSelector({ value, onChange, className }: GlobalRangeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {ranges.map(r => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
            value === r
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
