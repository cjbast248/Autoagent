import React, { useState } from 'react';
import { Search, ChevronRight, ChevronDown, X, Copy, Check, Box, Check as CheckIcon, Pin } from 'lucide-react';
import {
  TelegramIcon,
  HTTPIcon,
  WebhookIcon,
  ZohoCRMIcon,
  GoogleSheetsIcon,
  GroqIcon,
  RAGIcon,
  InfobipIcon,
  InfobipEmailIcon,
  KalinaIcon,
  WaitIcon,
  ManualTriggerIcon,
  ChatTriggerIcon,
  LoopIcon,
  CodeIcon,
  EditFieldsIcon,
  IfIcon,
  SplitOutIcon,
  NoOpIcon
} from './BrandIcons';

// CSS Variables matching exact n8n colors
const colors = {
  bgBody: '#141414',
  bgPanel: '#181818',
  bgHeader: '#181818',
  bgHover: '#222222',
  bgToggle: '#262626',
  bgToggleActive: '#3e3e3e',
  borderColor: '#2b2b2b',
  dividerColor: '#2b2b2b',
  textPrimary: '#e6e6e6',
  textSecondary: '#999999',
  textValue: '#cccccc',
  n8nGreen: '#2ecc71',
  n8nOrange: '#ff6d5a',
  n8nBlue: '#5c81f0',
  n8nPurple: '#c586c0',
  typeIconBg: '#2d2d2d',
  typeIconText: '#a6a6a6',
};

// Import node icons - returns actual React components
const getNodeIconComponent = (icon?: string, nodeName?: string): React.ReactNode => {
  const iconName = icon?.toLowerCase() || '';
  const name = nodeName?.toLowerCase() || '';
  const iconSize = 14;

  if (iconName.includes('http') || name.includes('http request'))
    return <HTTPIcon size={iconSize} />;
  if (iconName.includes('webhook') || name.includes('webhook'))
    return <WebhookIcon size={iconSize} />;
  if (iconName.includes('telegram') || name.includes('telegram'))
    return <TelegramIcon size={iconSize} />;
  if (iconName.includes('zoho') || name.includes('zoho'))
    return <ZohoCRMIcon size={iconSize} />;
  if (iconName.includes('google') || name.includes('sheets'))
    return <GoogleSheetsIcon size={iconSize} />;
  if (iconName.includes('groq') || name.includes('analysis'))
    return <GroqIcon size={iconSize} />;
  if (iconName.includes('rag') || name.includes('rag'))
    return <RAGIcon size={iconSize} />;
  if (iconName.includes('kalina') || name.includes('call'))
    return <KalinaIcon size={iconSize} />;
  if (iconName.includes('wait') || name.includes('wait'))
    return <WaitIcon size={iconSize} />;
  if (iconName.includes('infobip') && (name.includes('email') || iconName.includes('email')))
    return <InfobipEmailIcon size={iconSize} />;
  if (iconName.includes('infobip') || name.includes('sms'))
    return <InfobipIcon size={iconSize} />;
  if (iconName.includes('manual') || name.includes('trigger') || name.includes('execute workflow') || name.includes('clicking'))
    return <ManualTriggerIcon size={iconSize} />;
  if (iconName.includes('chat') || name.includes('chat'))
    return <ChatTriggerIcon size={iconSize} />;
  if (iconName.includes('loop') || name.includes('loop'))
    return <LoopIcon size={iconSize} />;
  if (iconName.includes('code') || name.includes('code'))
    return <span style={{ color: colors.n8nOrange, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }}>{'{ }'}</span>;
  if (iconName.includes('edit') || name.includes('edit fields'))
    return <EditFieldsIcon size={iconSize} />;
  if (iconName.includes('if') || name === 'if')
    return <IfIcon size={iconSize} />;
  if (iconName.includes('split') || name.includes('split'))
    return <SplitOutIcon size={iconSize} />;
  if (iconName.includes('noop') || name.includes('no operation') || name.includes('do nothing'))
    return <span style={{ color: '#666' }}>→</span>;
  if (name.includes('done'))
    return <EditFieldsIcon size={iconSize} />;
  if (name.includes('failed'))
    return <span style={{ color: colors.n8nGreen }}>↵</span>;
  if (name.includes('update row'))
    return <GoogleSheetsIcon size={iconSize} />;
  if (name.includes('city') || name.includes('lookup'))
    return <span style={{ color: colors.n8nGreen }}>📍</span>;

  return <span style={{ fontSize: '10px' }}>📦</span>;
};

// Full value modal component
const FullValueModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  name: string;
  value: any;
}> = ({ isOpen, onClose, name, value }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const displayValue = typeof value === 'object'
    ? JSON.stringify(value, null, 2)
    : String(value);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg overflow-hidden max-w-3xl max-h-[80vh] w-full mx-4 flex flex-col"
        style={{ backgroundColor: colors.bgPanel, border: `1px solid ${colors.borderColor}` }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: '#232323', borderBottom: `1px solid ${colors.borderColor}` }}
        >
          <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>{name}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded transition-colors"
              style={{ color: '#888' }}
              title="Copy value"
            >
              {copied ? <Check className="w-4 h-4" style={{ color: colors.n8nGreen }} /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded transition-colors" style={{ color: '#888' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre
            className="text-xs font-mono whitespace-pre-wrap break-all"
            style={{ backgroundColor: '#111', padding: '12px', borderRadius: '6px', color: colors.n8nGreen }}
          >
            {displayValue}
          </pre>
        </div>
      </div>
    </div>
  );
};

interface IOData {
  [key: string]: any;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: IOData | IOData[];
  itemCount?: number;
}

interface N8NNodeIOPanelProps {
  title: 'INPUT' | 'OUTPUT';
  data: IOData | IOData[] | null;
  itemCount?: number;
  isLoading?: boolean;
  error?: string | null;
  enableDrag?: boolean;
  onFieldDragStart?: (field: { key: string; path: string; value: any }) => void;
  nodeSources?: NodeData[];
  embedded?: boolean;
  // Pin data functionality
  onPinData?: (data: any) => void;
  isPinned?: boolean;
}

type ViewMode = 'Schema' | 'Table' | 'JSON';

// Get type of value
const getValueType = (value: any): string => {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

// Type Badge Component - exact n8n style
const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const baseStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    backgroundColor: colors.typeIconBg,
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '8px',
    color: colors.typeIconText,
    fontWeight: 700,
    fontSize: '10px',
    flexShrink: 0,
  };

  switch (type) {
    case 'string':
      return <div style={{ ...baseStyle, fontFamily: 'serif', fontWeight: 600, fontSize: '11px' }}>T</div>;
    case 'number':
      return <div style={baseStyle}>#</div>;
    case 'boolean':
      return (
        <div style={baseStyle}>
          <CheckIcon size={9} />
        </div>
      );
    case 'array':
    case 'object':
      return (
        <div style={baseStyle}>
          <Box size={9} />
        </div>
      );
    default:
      return <div style={baseStyle}>○</div>;
  }
};

// Indent Guide Component
const IndentGuide: React.FC<{ width?: number; showLine?: boolean }> = ({ width = 22, showLine = false }) => (
  <div
    style={{
      width: `${width}px`,
      height: '100%',
      position: 'relative',
      flexShrink: 0,
    }}
  >
    {showLine && (
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '11px',
          borderLeft: `1px solid ${colors.dividerColor}`,
        }}
      />
    )}
  </div>
);

// Tree Item Component - exact n8n style with drag support
const TreeItem: React.FC<{
  name: string;
  value: any;
  depth?: number;
  path?: string;
  enableDrag?: boolean;
  onDragStart?: (field: any) => void;
  sourceNode?: string;
  parentExpanded?: boolean[];
}> = ({ name, value, depth = 0, path = '', enableDrag = false, onDragStart, sourceNode, parentExpanded = [] }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [showFullValue, setShowFullValue] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Build path correctly - don't add dot before array index brackets
  const currentPath = path
    ? (name.startsWith('[') ? `${path}${name}` : `${path}.${name}`)
    : name;
  const valueType = getValueType(value);
  const isExpandable = valueType === 'object' || valueType === 'array';

  // Get display value
  const getDisplayValue = () => {
    if (value === null || value === undefined) return 'null';
    if (valueType === 'string') {
      return value.length > 50 ? `${value.substring(0, 50)}...` : value;
    }
    if (valueType === 'boolean') return value.toString();
    if (valueType === 'number') return value.toString();
    return '';
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!enableDrag) return;
    e.stopPropagation();
    setIsDragging(true);

    let expressionValue: string;
    if (sourceNode) {
      expressionValue = isExpandable
        ? `{{ JSON.stringify($('${sourceNode}').item.json['${currentPath}']) }}`
        : `{{ $('${sourceNode}').item.json['${currentPath}'] }}`;
    } else {
      expressionValue = isExpandable
        ? `{{ JSON.stringify($json.${currentPath}) }}`
        : `{{ $json.${currentPath} }}`;
    }

    const dragData = {
      key: name,
      path: currentPath,
      value: value,
      expression: expressionValue,
      isObject: isExpandable,
      sourceNode: sourceNode,
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', expressionValue);
    e.dataTransfer.effectAllowed = 'copy';

    // Custom drag image
    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      background: ${colors.n8nGreen};
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      font-family: monospace;
      position: absolute;
      top: -1000px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    dragImage.textContent = `{{ ${name} }}`;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);

    if (onDragStart) onDragStart(dragData);
  };

  const handleDragEnd = () => setIsDragging(false);

  // Build indent guides
  const renderIndentGuides = () => {
    const guides: React.ReactNode[] = [];

    // First base indent
    if (depth > 0) {
      guides.push(<IndentGuide key="base" width={14} />);
    }

    // Add line guides for each parent level
    for (let i = 0; i < depth - 1; i++) {
      guides.push(
        <IndentGuide
          key={`guide-${i}`}
          width={22}
          showLine={parentExpanded[i] !== false}
        />
      );
    }

    return guides;
  };

  return (
    <>
      <div
        className="tree-item"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '26px',
          paddingRight: '16px',
          cursor: enableDrag ? 'grab' : 'pointer',
          fontFamily: "'Menlo', 'Monaco', 'Consolas', monospace",
          fontSize: '12px',
          backgroundColor: isDragging ? colors.bgHover : 'transparent',
          opacity: isDragging ? 0.5 : 1,
          transition: 'background-color 0.1s',
        }}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgHover)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isDragging ? colors.bgHover : 'transparent')}
        draggable={enableDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Indent guides */}
        {depth === 0 && <IndentGuide width={32} />}
        {depth > 0 && renderIndentGuides()}

        {/* Chevron for expandable items */}
        {isExpandable ? (
          <div
            style={{
              color: '#666',
              fontSize: '10px',
              width: '14px',
              textAlign: 'center',
              marginRight: '6px',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <ChevronRight size={10} />
          </div>
        ) : (
          <div style={{ width: '20px' }} />
        )}

        {/* Type badge */}
        <TypeBadge type={valueType} />

        {/* Key name */}
        <span style={{ color: colors.textPrimary, marginRight: '8px' }}>{name}</span>

        {/* Value */}
        {!isExpandable && (
          <span
            style={{
              color: valueType === 'boolean' ? '#fff' : colors.textValue,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: valueType === 'string' && value && value.length > 50 ? 'pointer' : 'inherit',
            }}
            onClick={(e) => {
              if (valueType === 'string' && value && value.length > 50) {
                e.stopPropagation();
                setShowFullValue(true);
              }
            }}
          >
            {getDisplayValue()}
          </span>
        )}
      </div>

      {/* Expanded children */}
      {isExpandable && isExpanded && (
        <>
          {valueType === 'array' ? (
            value.map((item: any, index: number) => (
              <TreeItem
                key={index}
                name={`[${index}]`}
                value={item}
                depth={depth + 1}
                path={currentPath}
                enableDrag={enableDrag}
                onDragStart={onDragStart}
                sourceNode={sourceNode}
                parentExpanded={[...parentExpanded, true]}
              />
            ))
          ) : (
            Object.entries(value || {}).map(([key, val], idx, arr) => (
              <TreeItem
                key={key}
                name={key}
                value={val}
                depth={depth + 1}
                path={currentPath}
                enableDrag={enableDrag}
                onDragStart={onDragStart}
                sourceNode={sourceNode}
                parentExpanded={[...parentExpanded, idx < arr.length - 1]}
              />
            ))
          )}
        </>
      )}

      <FullValueModal
        isOpen={showFullValue}
        onClose={() => setShowFullValue(false)}
        name={name}
        value={value}
      />
    </>
  );
};

// Node Header Row Component
const NodeHeaderRow: React.FC<{
  nodeName: string;
  nodeIcon?: string;
  itemCount?: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ nodeName, nodeIcon, itemCount, isExpanded, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgHover)}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
  >
    <div
      style={{
        color: '#666',
        fontSize: '10px',
        width: '14px',
        textAlign: 'center',
        marginRight: '6px',
        transition: 'transform 0.2s',
        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
      }}
    >
      <ChevronRight size={10} />
    </div>
    <div style={{ color: colors.n8nGreen, fontSize: '14px', marginRight: '8px' }}>
      {getNodeIconComponent(nodeIcon, nodeName)}
    </div>
    <div style={{ fontSize: '13px', color: '#eee', marginRight: 'auto' }}>{nodeName}</div>
    {itemCount !== undefined && (
      <div style={{ fontSize: '11px', color: '#777' }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</div>
    )}
  </div>
);

// Node List Item Component (bottom section)
const NodeListItem: React.FC<{
  nodeName: string;
  nodeIcon?: string;
  itemCount?: number;
  onClick?: () => void;
}> = ({ nodeName, nodeIcon, itemCount, onClick }) => {
  const getIconColor = () => {
    const name = nodeName.toLowerCase();
    if (name.includes('code')) return colors.n8nOrange;
    if (name.includes('edit') || name.includes('done')) return colors.n8nBlue;
    if (name.includes('sheet') || name.includes('if') || name.includes('failed')) return colors.n8nGreen;
    if (name.includes('no operation')) return '#666';
    return colors.n8nGreen;
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '7px 20px',
        cursor: 'pointer',
        color: '#ccc',
        borderLeft: '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.bgHover;
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#ccc';
      }}
    >
      <div style={{ color: '#666', fontSize: '10px', width: '14px', textAlign: 'center', marginRight: '6px' }}>
        <ChevronRight size={10} />
      </div>
      <div
        style={{
          width: '20px',
          display: 'flex',
          justifyContent: 'center',
          marginRight: '8px',
          fontSize: '12px',
          color: getIconColor(),
        }}
      >
        {getNodeIconComponent(nodeIcon, nodeName)}
      </div>
      <div style={{ flex: 1, fontSize: '13px' }}>{nodeName}</div>
      {itemCount !== undefined && itemCount > 0 && (
        <div style={{ fontSize: '11px', color: '#666' }}>{itemCount} items</div>
      )}
    </div>
  );
};

// Table View Component
const TableView: React.FC<{ data: IOData | IOData[] }> = ({ data }) => {
  // Auto-detect and extract array from wrapper objects (e.g., Zoho CRM, Bitrix24)
  // Pattern: { data: [...], module: "...", count: ... } -> extract the 'data' array
  let items: IOData[];

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object') {
    // Check if this is a wrapper object with a 'data' property containing an array
    if ('data' in data && Array.isArray(data.data)) {
      items = data.data as IOData[];
    }
    // Check for other common array properties
    else if ('items' in data && Array.isArray(data.items)) {
      items = data.items as IOData[];
    }
    // Check for split items (workflow split mode)
    else if ('_splitItems' in data && Array.isArray(data._splitItems)) {
      items = data._splitItems as IOData[];
    }
    // Fallback: treat as single item
    else {
      items = [data];
    }
  } else {
    items = [];
  }

  if (items.length === 0) {
    return <div style={{ textAlign: 'center', color: '#666', fontSize: '12px', padding: '16px' }}>No data</div>;
  }

  // Priority fields that should always appear first if present (case-insensitive)
  // Includes both amoCRM (lowercase) and Bitrix24 (uppercase) field names
  const priorityFields = [
    // Common identifiers
    'id', 'ID',
    // Names/titles
    'name', 'NAME', 'title', 'TITLE',
    // Status/Stage (important for CRM)
    'status_id', 'STATUS_ID', 'stage_id', 'STAGE_ID',
    // Type
    'type_id', 'TYPE_ID',
    // Amount/Price
    'price', 'opportunity', 'OPPORTUNITY',
    // Currency
    'currency_id', 'CURRENCY_ID',
    // Pipeline/Category
    'pipeline_id', 'category_id', 'CATEGORY_ID',
    // Assignment
    'assigned_by_id', 'ASSIGNED_BY_ID', 'responsible_user_id',
    // Contact info
    'contact_phone', 'PHONE', 'contact_email', 'EMAIL',
    'contact_name', 'CONTACT_ID', 'COMPANY_ID',
    // Dates
    'created_at', 'DATE_CREATE', 'updated_at', 'DATE_MODIFY',
  ];

  // Get all keys from data
  const rawKeys = [...new Set(items.flatMap(item => Object.keys(item || {})))];

  // Filter out internal/complex fields that clutter the table
  const excludeFields = [
    '_links', '_embedded', 'custom_fields_values', 'contacts',
    // Bitrix24 less important fields
    'UTM_SOURCE', 'UTM_MEDIUM', 'UTM_CAMPAIGN', 'UTM_CONTENT', 'UTM_TERM',
    'ORIGINATOR_ID', 'ORIGIN_ID', 'SOURCE_DESCRIPTION', 'ADDITIONAL_INFO',
    'IS_MANUAL_OPPORTUNITY', 'TAX_VALUE', 'STAGE_SEMANTIC_ID',
    'IS_RECURRING', 'IS_RETURN_CUSTOMER', 'IS_REPEATED_APPROACH',
    'LAST_COMMUNICATION_TIME', 'MOVED_TIME', 'MOVED_BY_ID',
  ];
  const filteredKeys = rawKeys.filter(key => !excludeFields.includes(key));

  // Sort keys: priority fields first (in order), then others alphabetically
  const sortedKeys = filteredKeys.sort((a, b) => {
    const aIndex = priorityFields.indexOf(a);
    const bIndex = priorityFields.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  // Take first 12 columns for better visibility
  const allKeys = sortedKeys.slice(0, 12);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#ccc' }}>
        <thead>
          <tr>
            {allKeys.map(key => (
              <th
                key={key}
                style={{
                  textAlign: 'left',
                  backgroundColor: '#232323',
                  padding: '8px 12px',
                  color: '#e0e0e0',
                  fontWeight: 600,
                  borderBottom: `1px solid ${colors.borderColor}`,
                  borderRight: `1px solid ${colors.borderColor}`,
                }}
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 10).map((item, idx) => (
            <tr key={idx}>
              {allKeys.map(key => (
                <td
                  key={key}
                  style={{
                    padding: '8px 12px',
                    borderBottom: `1px solid ${colors.borderColor}`,
                    borderRight: `1px solid ${colors.borderColor}`,
                    verticalAlign: 'top',
                    color: typeof item?.[key] === 'boolean' ? '#569cd6' : '#ccc',
                  }}
                >
                  {typeof item?.[key] === 'object' ? (
                    <div style={{ fontFamily: 'monospace', lineHeight: 1.5, color: '#999' }}>
                      {JSON.stringify(item[key], null, 2).substring(0, 100)}...
                    </div>
                  ) : (
                    String(item?.[key] ?? '-')
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 10 && (
        <div style={{ textAlign: 'center', color: '#666', fontSize: '11px', padding: '12px', backgroundColor: '#1a1a1a' }}>
          +{items.length - 10} more items
        </div>
      )}
    </div>
  );
};

// JSON View Component with syntax highlighting
const JSONView: React.FC<{ data: IOData | IOData[] }> = ({ data }) => {
  const renderJSON = (obj: any, indent: number = 0): React.ReactNode[] => {
    const spaces = '  '.repeat(indent);
    const nodes: React.ReactNode[] = [];

    if (Array.isArray(obj)) {
      nodes.push(<span key="open" style={{ color: '#d4d4d4' }}>[</span>);
      nodes.push(<br key="br-open" />);
      obj.forEach((item, idx) => {
        nodes.push(<span key={`space-${idx}`}>{spaces}  </span>);
        nodes.push(...renderJSON(item, indent + 1));
        if (idx < obj.length - 1) nodes.push(<span key={`comma-${idx}`} style={{ color: '#d4d4d4' }}>,</span>);
        nodes.push(<br key={`br-${idx}`} />);
      });
      nodes.push(<span key="close-space">{spaces}</span>);
      nodes.push(<span key="close" style={{ color: '#d4d4d4' }}>]</span>);
    } else if (typeof obj === 'object' && obj !== null) {
      nodes.push(<span key="open" style={{ color: '#d4d4d4' }}>{'{'}</span>);
      nodes.push(<br key="br-open" />);
      const entries = Object.entries(obj);
      entries.forEach(([key, value], idx) => {
        nodes.push(<span key={`space-${key}`}>{spaces}  </span>);
        nodes.push(<span key={`key-${key}`} style={{ color: '#fff' }}>"{key}"</span>);
        nodes.push(<span key={`colon-${key}`} style={{ color: '#d4d4d4' }}>: </span>);
        nodes.push(...renderJSON(value, indent + 1));
        if (idx < entries.length - 1) nodes.push(<span key={`comma-${key}`} style={{ color: '#d4d4d4' }}>,</span>);
        nodes.push(<br key={`br-${key}`} />);
      });
      nodes.push(<span key="close-space">{spaces}</span>);
      nodes.push(<span key="close" style={{ color: '#d4d4d4' }}>{'}'}</span>);
    } else if (typeof obj === 'string') {
      nodes.push(<span key="str" style={{ color: colors.n8nPurple }}>"{obj}"</span>);
    } else if (typeof obj === 'boolean') {
      nodes.push(<span key="bool" style={{ color: colors.n8nGreen }}>{String(obj)}</span>);
    } else if (typeof obj === 'number') {
      nodes.push(<span key="num" style={{ color: colors.n8nGreen }}>{obj}</span>);
    } else {
      nodes.push(<span key="null" style={{ color: '#666' }}>null</span>);
    }

    return nodes;
  };

  return (
    <div
      style={{
        padding: '16px 20px',
        fontFamily: "'Menlo', 'Monaco', 'Consolas', monospace",
        fontSize: '12px',
        lineHeight: 1.5,
      }}
    >
      {renderJSON(data)}
    </div>
  );
};

export const N8NNodeIOPanel: React.FC<N8NNodeIOPanelProps> = ({
  title,
  data,
  itemCount,
  isLoading = false,
  error = null,
  enableDrag = false,
  onFieldDragStart,
  nodeSources,
  onPinData,
  isPinned = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('Schema');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({ 0: true });

  const items = Array.isArray(data) ? data : data ? [data] : [];

  // Get first node source for main display
  const firstSource = nodeSources && nodeSources.length > 0 ? nodeSources[0] : null;
  const displayData = firstSource?.data || data;
  const displayItems = Array.isArray(displayData) ? displayData : displayData ? [displayData] : [];

  const toggleNode = (index: number) => {
    setExpandedNodes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.bgPanel,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '48px',
          minHeight: '48px',
          padding: '0 16px 0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid transparent',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1.2px',
            color: '#ccc',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Pin Data Button - only show for INPUT when there's data and onPinData callback */}
          {title === 'INPUT' && onPinData && (data || (nodeSources && nodeSources.length > 0)) && (
            <button
              onClick={() => {
                const dataToPin = nodeSources?.[0]?.data || data;
                if (dataToPin) {
                  onPinData(dataToPin);
                }
              }}
              title={isPinned ? "Data is pinned - click to update" : "Pin this data for testing"}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 500,
                color: isPinned ? '#10b981' : '#888',
                backgroundColor: isPinned ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                border: `1px solid ${isPinned ? '#10b981' : '#444'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isPinned) {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.color = '#10b981';
                }
              }}
              onMouseLeave={(e) => {
                if (!isPinned) {
                  e.currentTarget.style.borderColor = '#444';
                  e.currentTarget.style.color = '#888';
                }
              }}
            >
              <Pin size={11} style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
              {isPinned ? 'Pinned' : 'Pin'}
            </button>
          )}
          <Search
            size={13}
            style={{ color: '#888', cursor: 'pointer' }}
            onClick={() => setShowSearch(!showSearch)}
          />
          {/* Toggle Group */}
          <div
            style={{
              display: 'flex',
              backgroundColor: colors.bgToggle,
              borderRadius: '4px',
              padding: '3px',
              height: '28px',
            }}
          >
            {(['Schema', 'Table', 'JSON'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? colors.bgToggleActive : 'transparent',
                  border: 'none',
                  color: viewMode === mode ? '#fff' : '#aaa',
                  padding: '0 12px',
                  fontSize: '11px',
                  fontWeight: viewMode === mode ? 600 : 500,
                  cursor: 'pointer',
                  borderRadius: '3px',
                  transition: 'all 0.1s ease',
                  height: '100%',
                  lineHeight: '22px',
                  boxShadow: viewMode === mode ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${colors.borderColor}` }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: colors.bgToggle,
              border: `1px solid ${colors.borderColor}`,
              borderRadius: '4px',
              color: colors.textPrimary,
              outline: 'none',
            }}
            autoFocus
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
        }}
        className="n8n-io-content"
      >
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                border: '2px solid #333',
                borderTopColor: '#888',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span style={{ fontSize: '12px', color: '#666' }}>Executing...</span>
          </div>
        ) : error ? (
          <div
            style={{
              padding: '12px',
              margin: '12px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 100, 100, 0.1)',
              border: '1px solid rgba(255, 100, 100, 0.3)',
            }}
          >
            <span style={{ fontSize: '12px', color: '#ff6b6b' }}>{error}</span>
          </div>
        ) : (
          <>
            {/* Schema View */}
            {viewMode === 'Schema' && (
              <div>
                {/* Main node with data */}
                {firstSource && (
                  <>
                    <NodeHeaderRow
                      nodeName={firstSource.nodeName}
                      nodeIcon={firstSource.nodeIcon}
                      itemCount={firstSource.itemCount || displayItems.length}
                      isExpanded={expandedNodes[0] !== false}
                      onToggle={() => toggleNode(0)}
                    />

                    {expandedNodes[0] !== false && displayItems.length > 0 && (
                      <div>
                        {displayItems.slice(0, 1).map((item, idx) => (
                          <div key={idx}>
                            {item && Object.entries(item).map(([key, value]) => (
                              <TreeItem
                                key={key}
                                name={key}
                                value={value}
                                enableDrag={enableDrag}
                                onDragStart={onFieldDragStart}
                                sourceNode={firstSource.nodeName}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Show data directly if no nodeSources */}
                {!firstSource && displayItems.length > 0 && (
                  <div style={{ paddingTop: '10px' }}>
                    {displayItems.map((item, idx) => (
                      <div key={idx}>
                        {item && Object.entries(item).map(([key, value]) => (
                          <TreeItem
                            key={key}
                            name={key}
                            value={value}
                            enableDrag={enableDrag}
                            onDragStart={onFieldDragStart}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* No data message */}
                {(!displayItems || displayItems.length === 0) && !firstSource && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
                    <div style={{ width: '48px', height: '48px', marginBottom: '12px', opacity: 0.4, color: '#666' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 9h6M9 13h6M9 17h4" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#666' }}>No data available</span>
                    <span style={{ fontSize: '10px', marginTop: '4px', textAlign: 'center', color: '#555' }}>
                      {title === 'OUTPUT' ? 'Run this node to see output data' : 'Previous nodes need to be executed first'}
                    </span>
                  </div>
                )}

                {/* Node list at bottom */}
                {nodeSources && nodeSources.length > 1 && (
                  <div style={{ marginTop: '4px' }}>
                    {nodeSources.slice(1).map((nodeSource, index) => (
                      <NodeListItem
                        key={nodeSource.nodeName}
                        nodeName={nodeSource.nodeName}
                        nodeIcon={nodeSource.nodeIcon}
                        itemCount={nodeSource.itemCount}
                        onClick={() => {
                          // Could implement switching to different node's data
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'Table' && displayData && <TableView data={displayData} />}

            {/* JSON View */}
            {viewMode === 'JSON' && displayData && <JSONView data={displayData} />}
          </>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .n8n-io-content::-webkit-scrollbar { width: 10px; }
        .n8n-io-content::-webkit-scrollbar-track { background: ${colors.bgPanel}; }
        .n8n-io-content::-webkit-scrollbar-thumb {
          background: #333;
          border: 3px solid ${colors.bgPanel};
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
};

export default N8NNodeIOPanel;
