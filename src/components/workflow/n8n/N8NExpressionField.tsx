import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, GripVertical } from 'lucide-react';

interface N8NExpressionFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  helperText?: string;
  type?: 'text' | 'number' | 'url';
  showPreview?: boolean;
  previewValue?: string;
  onRemove?: () => void;
  className?: string;
}

export const N8NExpressionField: React.FC<N8NExpressionFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Enter value or drag expression...',
  icon,
  helperText,
  type = 'text',
  showPreview = true,
  previewValue,
  onRemove,
  className = '',
}) => {
  const [isExpression, setIsExpression] = useState(() => {
    return value?.includes('{{') && value?.includes('}}');
  });
  const [isFocused, setIsFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if value is expression when it changes
  useEffect(() => {
    const hasExpression = value?.includes('{{') && value?.includes('}}');
    if (hasExpression && !isExpression) {
      setIsExpression(true);
    }
  }, [value]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const field = JSON.parse(jsonData);
        // Use the expression format
        const expression = field.expression || `{{ $json.${field.path} }}`;
        onChange(expression);
        setIsExpression(true);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const toggleMode = () => {
    if (isExpression) {
      // Switching to Fixed - clear expression
      onChange('');
      setIsExpression(false);
    } else {
      // Switching to Expression
      setIsExpression(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const clearValue = () => {
    onChange('');
    setIsExpression(false);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label Row */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
          {icon}
          {label}
        </label>
        
        {/* Fixed / Expression Toggle */}
        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => { setIsExpression(false); onChange(''); }}
            className={`px-2 py-0.5 rounded transition-colors ${
              !isExpression 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Fixed
          </button>
          <button
            onClick={() => setIsExpression(true)}
            className={`px-2 py-0.5 rounded transition-colors ${
              isExpression 
                ? 'bg-green-600 text-white' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Expression
          </button>
        </div>
      </div>

      {/* Input Field */}
      <div
        className={`relative rounded-md transition-all ${
          isDragOver 
            ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-[#1a1a1a]' 
            : isFocused 
              ? 'ring-1 ring-gray-500' 
              : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Expression indicator */}
        {isExpression && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">
              fx
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isExpression ? '{{ $json.fieldName }}' : placeholder}
          className={`w-full px-3 py-2.5 rounded-md text-sm transition-colors ${
            isExpression 
              ? 'pl-10 bg-[#1a2e1a] border border-green-500/30 text-green-400 font-mono' 
              : 'bg-[#252525] border border-[#333] text-white'
          } focus:outline-none`}
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={clearValue}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Drag indicator */}
        {isDragOver && (
          <div className="absolute inset-0 bg-green-500/10 rounded-md border-2 border-dashed border-green-500 flex items-center justify-center pointer-events-none">
            <span className="text-green-400 text-xs font-medium">Drop here</span>
          </div>
        )}
      </div>

      {/* Preview Value */}
      {showPreview && value && previewValue !== undefined && (
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-[#1a1a1a] border border-[#333]">
          <span className="text-[10px] text-gray-500">Preview:</span>
          <span className="text-[11px] text-gray-300 font-mono truncate">
            {previewValue}
          </span>
        </div>
      )}

      {/* Helper Text */}
      {helperText && (
        <p className="text-[10px] text-gray-500">{helperText}</p>
      )}

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  );
};

// Draggable field item for INPUT panel
interface DraggableFieldProps {
  name: string;
  value: any;
  path: string;
  sourceNode?: string;
  depth?: number;
}

export const DraggableField: React.FC<DraggableFieldProps> = ({
  name,
  value,
  path,
  sourceNode,
  depth = 0,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  const getTypeColor = () => {
    if (isArray) return 'text-purple-400 bg-purple-500/20';
    if (isObject) return 'text-orange-400 bg-orange-500/20';
    if (typeof value === 'string') return 'text-green-400 bg-green-500/20';
    if (typeof value === 'number') return 'text-blue-400 bg-blue-500/20';
    if (typeof value === 'boolean') return 'text-purple-400 bg-purple-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  const getTypeLabel = () => {
    if (isArray) return '#';
    if (isObject) return '{ }';
    if (typeof value === 'string') return 'T';
    if (typeof value === 'number') return '123';
    if (typeof value === 'boolean') return '⊤⊥';
    return '?';
  };

  const getExpression = () => {
    if (sourceNode) {
      return `{{ $('${sourceNode}').item.json['${path}'] }}`;
    }
    return `{{ $json.${path} }}`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(true);

    const dragData = {
      key: name,
      path: path,
      value: value,
      expression: getExpression(),
      sourceNode: sourceNode,
      isObject: isExpandable,
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', getExpression());
    e.dataTransfer.effectAllowed = 'copy';

    // Custom drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg';
    dragImage.textContent = getExpression();
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const renderValue = () => {
    if (value === null) return <span className="text-gray-500 italic">null</span>;
    if (value === undefined) return <span className="text-gray-500 italic">undefined</span>;
    if (typeof value === 'boolean') return <span className="text-purple-400">{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-blue-400">{value}</span>;
    if (typeof value === 'string') {
      const display = value.length > 40 ? value.substring(0, 40) + '...' : value;
      return <span className="text-green-400">"{display}"</span>;
    }
    if (isArray) return <span className="text-gray-500">[{value.length}]</span>;
    if (isObject) return <span className="text-gray-500">{'{...}'}</span>;
    return null;
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-grab active:cursor-grabbing transition-all ${
          isDragging ? 'opacity-50 scale-95' : ''
        } hover:bg-green-500/10 border border-transparent hover:border-green-500/30`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          if (isExpandable) {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Drag handle */}
        <GripVertical className="w-3 h-3 text-gray-600 flex-shrink-0" />

        {/* Expand arrow for objects */}
        {isExpandable && (
          <span className="text-gray-500 w-3 flex-shrink-0 text-[10px]">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}

        {/* Type indicator */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getTypeColor()}`}>
          {getTypeLabel()}
        </span>

        {/* Field name */}
        <span className="text-green-400 font-medium text-xs">{name}</span>

        {/* Value preview */}
        {!isExpandable && (
          <span className="text-xs truncate flex-1 text-right">
            {renderValue()}
          </span>
        )}
      </div>

      {/* Children for objects/arrays */}
      {isExpandable && isExpanded && (
        <div>
          {isArray ? (
            value.slice(0, 5).map((item: any, index: number) => (
              <DraggableField
                key={index}
                name={`[${index}]`}
                value={item}
                path={`${path}[${index}]`}
                sourceNode={sourceNode}
                depth={depth + 1}
              />
            ))
          ) : (
            Object.entries(value).map(([key, val]) => (
              <DraggableField
                key={key}
                name={key}
                value={val}
                path={path ? `${path}.${key}` : key}
                sourceNode={sourceNode}
                depth={depth + 1}
              />
            ))
          )}
          {isArray && value.length > 5 && (
            <div 
              className="text-[10px] text-gray-500 py-1"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              +{value.length - 5} more items...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Node source section in INPUT panel
interface NodeSourceProps {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const NodeSource: React.FC<NodeSourceProps> = ({
  nodeName,
  nodeIcon,
  data,
  itemCount,
  isExpanded = true,
  onToggle,
}) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const items = Array.isArray(data) ? data : data ? [data] : [];
  const count = itemCount ?? items.length;

  const getIconEmoji = () => {
    if (nodeIcon?.includes('http')) return '🌐';
    if (nodeIcon?.includes('zoho')) return '📊';
    if (nodeIcon?.includes('google')) return '📑';
    if (nodeIcon?.includes('sheets')) return '📑';
    if (nodeIcon?.includes('telegram')) return '✈️';
    if (nodeIcon?.includes('webhook')) return '🔗';
    if (nodeIcon?.includes('code')) return '{ }';
    if (nodeIcon?.includes('loop')) return '🔄';
    if (nodeIcon?.includes('if')) return '⚡';
    return '📦';
  };

  return (
    <div className="border-b border-[#333] last:border-b-0">
      {/* Node Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px]">{expanded ? '▼' : '▶'}</span>
          <span className="text-base">{getIconEmoji()}</span>
          <span className="text-sm font-medium text-gray-200">{nodeName}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
          {count} item{count !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Node Fields */}
      {expanded && items.length > 0 && (
        <div className="pb-2">
          {items.slice(0, 1).map((item, idx) => (
            <div key={idx}>
              {Object.entries(item).map(([key, value]) => (
                <DraggableField
                  key={key}
                  name={key}
                  value={value}
                  path={key}
                  sourceNode={nodeName}
                  depth={1}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default N8NExpressionField;
