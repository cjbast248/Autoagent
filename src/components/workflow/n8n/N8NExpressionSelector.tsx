import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Zap } from 'lucide-react';

interface N8NExpressionSelectorProps {
  inputData: any;
  onSelect: (expression: string, displayValue: string) => void;
  onClose: () => void;
  currentValue?: string;
}

// Recursively get all paths from an object
const getFieldPaths = (obj: any, prefix: string = ''): Array<{ path: string; value: any; type: string }> => {
  const paths: Array<{ path: string; value: any; type: string }> = [];
  
  if (obj === null || obj === undefined) return paths;
  
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const valueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      
      paths.push({ path: currentPath, value, type: valueType });
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        paths.push(...getFieldPaths(value, currentPath));
      }
    });
  }
  
  return paths;
};

// Generate n8n-style expression from path
const pathToExpression = (path: string): string => {
  return `{{ $json.${path} }}`;
};

// Type icons
const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'string':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">T</span>;
    case 'number':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">123</span>;
    case 'boolean':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">⊤⊥</span>;
    case 'object':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono">{ }</span>;
    case 'array':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">#</span>;
    case 'null':
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 font-mono">∅</span>;
    default:
      return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 font-mono">?</span>;
  }
};

// Field item component
const FieldItem: React.FC<{
  name: string;
  path: string;
  value: any;
  depth: number;
  onSelect: (expression: string, displayValue: string) => void;
}> = ({ name, path, value, depth, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;
  const valueType = value === null ? 'null' : isArray ? 'array' : typeof value;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpandable) {
      const expression = pathToExpression(path);
      const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
      onSelect(expression, displayValue);
    }
  };
  
  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  const getDisplayValue = () => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      return value.length > 40 ? `"${value.substring(0, 40)}..."` : `"${value}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return null;
  };

  return (
    <div>
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors group ${
          isExpandable ? 'hover:bg-white/5' : 'hover:bg-green-500/20 hover:border-green-500/50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={isExpandable ? handleExpand : handleClick}
      >
        {isExpandable ? (
          <span className="text-gray-500 w-4 flex-shrink-0" onClick={handleExpand}>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        
        <TypeIcon type={valueType} />
        
        <span className="text-gray-200 font-medium text-xs">{name}</span>
        
        {!isExpandable && (
          <>
            <span className="text-gray-400 text-xs truncate flex-1">
              {getDisplayValue()}
            </span>
            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-green-400 font-medium px-1.5 py-0.5 bg-green-500/20 rounded transition-opacity">
              Click to use
            </span>
          </>
        )}
        
        {isExpandable && !isExpanded && (
          <span className="text-gray-500 text-[10px]">
            {isArray ? `[${value.length}]` : `{${Object.keys(value).length}}`}
          </span>
        )}
      </div>
      
      {isExpandable && isExpanded && (
        <div>
          {isArray ? (
            value.slice(0, 5).map((item: any, index: number) => (
              <FieldItem 
                key={index}
                name={`[${index}]`}
                path={`${path}[${index}]`}
                value={item}
                depth={depth + 1}
                onSelect={onSelect}
              />
            ))
          ) : (
            Object.entries(value).map(([key, val]) => (
              <FieldItem 
                key={key}
                name={key}
                path={`${path}.${key}`}
                value={val}
                depth={depth + 1}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const N8NExpressionSelector: React.FC<N8NExpressionSelectorProps> = ({
  inputData,
  onSelect,
  onClose,
  currentValue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle the input data structure
  const dataToShow = inputData?.json || inputData || {};
  
  // Filter fields based on search
  const allPaths = getFieldPaths(dataToShow);
  const filteredPaths = searchQuery 
    ? allPaths.filter(p => p.path.toLowerCase().includes(searchQuery.toLowerCase()))
    : allPaths;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a1a] rounded-xl border border-[#333] shadow-2xl overflow-hidden"
        style={{ width: '500px', maxHeight: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#252525] border-b border-[#333]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-white">Select Field from Input</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#333] rounded transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-3 border-b border-[#333]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fields..."
            className="w-full px-3 py-2 text-sm rounded-lg bg-[#2a2a2a] border border-[#444] text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            autoFocus
          />
        </div>
        
        {/* Current Expression Preview */}
        {currentValue && (
          <div className="px-4 py-2 bg-[#0d0d0d] border-b border-[#333]">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Current Value</div>
            <code className="text-xs text-green-400 font-mono">{currentValue}</code>
          </div>
        )}
        
        {/* Field List */}
        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
          {Object.keys(dataToShow).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">No input data available</p>
              <p className="text-xs mt-1">Execute the workflow to see available fields</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(dataToShow).map(([key, value]) => (
                <FieldItem
                  key={key}
                  name={key}
                  path={key}
                  value={value}
                  depth={0}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer Tip */}
        <div className="px-4 py-2 bg-[#0d0d0d] border-t border-[#333]">
          <p className="text-[10px] text-gray-500">
            💡 <span className="text-green-400">Tip:</span> Click on any field to insert it as an expression. 
            Expressions like <code className="text-green-400">{'{{ $json.fieldName }}'}</code> will be replaced with actual values at runtime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default N8NExpressionSelector;
