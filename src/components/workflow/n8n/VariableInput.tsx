import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/utils';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

/**
 * Input component with syntax highlighting for variables like {{$json.field}}
 * Variables are displayed as colored chips/tags for better visual feedback
 */
export const VariableInput: React.FC<VariableInputProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  multiline = false,
  rows = 3,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Parse text and highlight variables
  const parseContent = (text: string) => {
    if (!text) return [];
    
    const parts: Array<{ type: 'text' | 'variable'; content: string }> = [];
    const regex = /(\{\{[^}]+\}\})/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before variable
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }
      
      // Add variable
      parts.push({
        type: 'variable',
        content: match[0],
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }
    
    return parts;
  };

  const parts = parseContent(value);

  // Sync scroll between highlight and input
  const handleScroll = () => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = inputRef.current.scrollTop;
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    handleScroll();
  }, [value]);

  const baseInputStyles = `
    w-full
    bg-transparent
    border
    rounded-lg
    px-3
    py-2
    font-mono
    text-sm
    text-transparent
    caret-white
    relative
    z-10
    resize-none
    outline-none
    transition-colors
  `;

  const highlightStyles = `
    absolute
    inset-0
    px-3
    py-2
    font-mono
    text-sm
    pointer-events-none
    whitespace-pre-wrap
    word-wrap-break-word
    overflow-hidden
    rounded-lg
  `;

  return (
    <div className={cn('relative', className)}>
      {/* Highlighted background */}
      <div
        ref={highlightRef}
        className={highlightStyles}
        style={{
          backgroundColor: '#1a1a1a',
          color: '#e5e7eb',
        }}
      >
        {parts.length === 0 && !value ? (
          <span style={{ color: '#6b7280' }}>{placeholder}</span>
        ) : (
          parts.map((part, index) => {
            if (part.type === 'variable') {
              return (
                <span
                  key={index}
                  className="inline-flex items-center px-1.5 py-0.5 rounded mx-0.5"
                  style={{
                    backgroundColor: '#fbbf24',
                    color: '#1a1a1a',
                    fontWeight: 600,
                  }}
                >
                  {part.content}
                </span>
              );
            }
            return <span key={index}>{part.content}</span>;
          })
        )}
      </div>

      {/* Actual input */}
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onScroll={handleScroll}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            baseInputStyles,
            isFocused ? 'border-blue-500' : 'border-[#333]'
          )}
          style={{ backgroundColor: 'transparent' }}
          spellCheck={false}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onScroll={handleScroll}
          placeholder={placeholder}
          className={cn(
            baseInputStyles,
            isFocused ? 'border-blue-500' : 'border-[#333]'
          )}
          style={{ backgroundColor: 'transparent' }}
          spellCheck={false}
        />
      )}

      {/* Helper text */}
      {isFocused && (
        <div className="mt-1 text-xs" style={{ color: '#888' }}>
          <span style={{ color: '#fbbf24' }}>💡</span> Use{' '}
          <code
            className="px-1 py-0.5 rounded mx-0.5"
            style={{ backgroundColor: '#252525', color: '#fbbf24' }}
          >
            {'{{ $json.field }}'}
          </code>{' '}
          to reference data from previous nodes
        </div>
      )}
    </div>
  );
};
