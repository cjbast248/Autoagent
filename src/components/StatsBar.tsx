import React from 'react';
import { Clock, Bot, Phone } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  hint?: string;
}

export interface StatsBarProps {
  items: StatItem[];
  className?: string;
}

export default function StatsBar({ items, className }: StatsBarProps) {
  return (
    <div className={`w-full rounded-2xl border border-gray-200 bg-white ${className ?? ''}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {item.icon && <div className="text-gray-900">{item.icon}</div>}
            <div className="text-xs text-gray-700">{item.label}</div>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-black text-white">{item.value}</span>
            {item.hint && <div className="text-xs text-gray-500">{item.hint}</div>}
            {idx < items.length - 1 && (
              <div className="mx-3 h-4 w-px bg-gray-200" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
