import React from 'react';
import { cn } from '@/utils/utils';

interface MessageFormatterProps {
  text: string;
  onSuggestionClick?: (suggestion: string) => void;
}

// Check if line is a table row (has multiple | and reasonable cell count)
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed.split('|').filter(c => c.trim());
  return cells.length >= 3 && cells.length <= 10;
}

// Check if line is a separator (---|---|---)
function isSeparatorRow(line: string): boolean {
  return /^[\s|:-]+$/.test(line) && line.includes('-');
}

// Parse markdown table from lines
function parseTable(lines: string[]): { headers: string[], rows: string[][] } | null {
  // Filter to only actual table rows
  const dataRows = lines.filter(line => isTableRow(line) && !isSeparatorRow(line));
  
  if (dataRows.length < 2) return null;
  
  const headers = dataRows[0].split('|').map(c => c.trim()).filter(Boolean);
  const rows = dataRows.slice(1).map(line => 
    line.split('|').map(c => c.trim()).filter(Boolean)
  );
  
  return { headers, rows };
}

// Simple and clean message formatter
export const MessageFormatter: React.FC<MessageFormatterProps> = ({ text, onSuggestionClick }) => {
  if (!text) return null;

  const lines = text.split('\n');
  
  // Find table boundaries more accurately
  const tableRowIndices: number[] = [];
  lines.forEach((line, i) => {
    if (isTableRow(line) || isSeparatorRow(line)) {
      tableRowIndices.push(i);
    }
  });

  // Check if we have a valid table (at least header + 1 data row)
  const hasValidTable = tableRowIndices.length >= 3;

  if (hasValidTable) {
    const tableStart = tableRowIndices[0];
    const tableEnd = tableRowIndices[tableRowIndices.length - 1] + 1;
    
    const beforeTable = lines.slice(0, tableStart).join('\n').trim();
    const tableLines = lines.slice(tableStart, tableEnd);
    const afterTable = lines.slice(tableEnd).join('\n').trim();
    
    const table = parseTable(tableLines);
    
    return (
      <div className="space-y-3">
        {beforeTable && <TextContent text={beforeTable} onSuggestionClick={onSuggestionClick} />}
        
        {table && (
          <div className="overflow-x-auto my-3 rounded-lg border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  {table.headers.map((header, i) => (
                    <th 
                      key={i} 
                      className="px-3 py-2.5 text-left font-medium text-foreground border-b border-border/50 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={cn(
                      "border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors",
                      rowIndex % 2 === 1 && "bg-muted/10"
                    )}
                  >
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 whitespace-nowrap">
                        {formatStatusCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {afterTable && <TextContent text={afterTable} onSuggestionClick={onSuggestionClick} />}
      </div>
    );
  }

  return <TextContent text={text} onSuggestionClick={onSuggestionClick} />;
};

// Format status cells with colors
function formatStatusCell(cell: string): React.ReactNode {
  const lowerCell = cell.toLowerCase().trim();
  
  if (lowerCell === 'finalizat' || lowerCell === 'succes' || lowerCell === 'activ' || lowerCell === 'success') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{cell}</span>;
  }
  if (lowerCell === 'eșuat' || lowerCell === 'eroare' || lowerCell === 'failed' || lowerCell === 'error') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{cell}</span>;
  }
  if (lowerCell === 'în curs' || lowerCell === 'pending' || lowerCell === 'processing') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{cell}</span>;
  }
  
  return <span className="text-foreground">{cell}</span>;
}

// Text content component
const TextContent: React.FC<{ text: string; onSuggestionClick?: (s: string) => void }> = ({ text, onSuggestionClick }) => {
  const lines = text.split('\n');
  
  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          return <div key={index} className="h-1" />;
        }

        // Numbered list
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          return (
            <div key={index} className="flex gap-2">
              <span className="text-muted-foreground font-medium min-w-[20px]">{numberedMatch[1]}.</span>
              <span className="flex-1">{formatInline(numberedMatch[2])}</span>
            </div>
          );
        }

        // Suggestion buttons
        const bulletQuoteMatch = trimmedLine.match(/^[-•→]\s*"([^"]+)"$/);
        if (bulletQuoteMatch && onSuggestionClick) {
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSuggestionClick(bulletQuoteMatch[1])}
              className="flex items-center gap-2 w-full text-left py-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <span className="text-muted-foreground/60 group-hover:text-primary transition-colors">→</span>
              <span className="group-hover:underline">"{bulletQuoteMatch[1]}"</span>
            </button>
          );
        }

        // Bullet points
        const bulletMatch = trimmedLine.match(/^[-•]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={index} className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span className="flex-1">{formatInline(bulletMatch[1])}</span>
            </div>
          );
        }

        // Regular text
        return (
          <p key={index} className="leading-relaxed">
            {formatInline(trimmedLine)}
          </p>
        );
      })}
    </div>
  );
};

// Format inline markdown
function formatInline(text: string): React.ReactNode {
  if (!text) return null;
  
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1 py-0.5 bg-muted rounded text-sm font-mono">{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default MessageFormatter;
