import React, { useState } from 'react';
import { 
  Zap,
  Database,
  MessageSquare,
  FileText,
  Webhook,
  Mail,
  Phone,
  Calendar,
  Users,
  Settings,
  AlertTriangle,
  Plus,
  MousePointer2,
  Code,
  MessageCircle,
  Bot,
  Sparkles,
  GitBranch,
  Globe,
  X,
  Trash2,
  Check
} from 'lucide-react';
import { cn } from '@/utils/utils';
import {
  TelegramIcon,
  ZohoCRMIcon,
  GoogleSheetsIcon,
  GroqIcon,
  RAGIcon,
  KalinaIcon,
  HTTPIcon,
  WebhookIcon,
  CodeIcon,
  ManualTriggerIcon,
  ScheduleIcon,
  WaitIcon,
  CallHistoryIcon,
  PhoneIcon,
  ChatTriggerIcon,
  getBrandIcon,
  BasicLLMChainIcon,
  GroqChatModelIcon,
} from './BrandIcons';
import { nodeOptions } from './N8NNodeSearch';

// Helper to get current node name from definition (overrides saved label)
const getNodeDisplayName = (icon: string | undefined, savedLabel: string): string => {
  if (!icon) return savedLabel;
  const nodeDef = nodeOptions.find(n => n.id === icon);
  return nodeDef?.name || savedLabel;
};

const iconMap: Record<string, any> = {
  trigger: ManualTriggerIcon,
  'chat-trigger': ChatTriggerIcon,
  'webhook-trigger': WebhookIcon,
  'schedule-trigger': ScheduleIcon,
  'rag': RAGIcon,
  'rag-search': RAGIcon,
  Zap,
  Database,
  MessageSquare,
  MessageCircle,
  FileText,
  Webhook,
  Mail,
  Phone,
  Calendar,
  Users,
  Settings,
  Code,
  Bot,
  Sparkles,
  GitBranch,
  Globe,
};

// Sub-node slot definition
interface SubNodeSlot {
  id: string;
  type: string; // 'model', 'memory', 'tool', etc.
  label: string;
  required?: boolean;
  connectedNode?: {
    id: string;
    label: string;
    icon: string;
  };
}

interface N8NNodeProps {
  data: any;
  selected: boolean;
  onDelete: () => void;
  onStartConnection: () => void;
  onEndConnection: () => void;
  onAddNode?: () => void;
  hasError?: boolean;
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
  isConnecting?: boolean; // true when dragging a connection line
  webhookActivity?: {
    count: number;
    lastReceived: string | null;
    isPulsing: boolean;
  };
  // Sub-node support
  subNodeSlots?: SubNodeSlot[];
  onSubNodeClick?: (slotId: string) => void;
  onStartSubConnection?: (slotId: string) => void;
  onEndSubConnection?: (slotId: string) => void;
  isSubConnecting?: boolean;
}

export const N8NNode: React.FC<N8NNodeProps> = ({
  data,
  selected,
  onDelete,
  onStartConnection,
  onEndConnection,
  onAddNode,
  hasError,
  executionStatus = 'idle',
  isConnecting = false,
  webhookActivity,
  subNodeSlots = [],
  onSubNodeClick,
  onStartSubConnection,
  onEndSubConnection,
  isSubConnecting = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isTrigger = data.type === 'trigger';
  const isSuccess = executionStatus === 'success';
  const isRunning = executionStatus === 'running';
  const isError = executionStatus === 'error' || hasError;

  // Check if this node has sub-node slots (like Basic LLM Chain)
  const hasSubSlots = subNodeSlots && subNodeSlots.length > 0;
  const isLLMChainNode = data.icon === 'basic-llm-chain' || data.label?.toLowerCase().includes('basic llm chain');

  // Try to get branded icon first - check label, type, and id
  const BrandIcon = getBrandIcon(data.label || '') || getBrandIcon(data.type || '') || getBrandIcon(data.id || '');
  const FallbackIcon = iconMap[data.icon as string] || iconMap[data.type] || Zap;

  // Determine border color based on state
  const getBorderStyle = () => {
    if (selected) return { border: '2px solid #ff6b5a', boxShadow: '0 0 0 4px rgba(255, 107, 90, 0.15)' };
    if (isError) return { border: '2px solid #ef4444', boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.15)' };
    if (isSuccess) return { border: '2px solid #10b981', boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.15)' };
    if (isRunning) return { border: '2px solid #3b82f6', boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.15)' };
    if (isHovered) return { border: '1.5px solid #555555', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' };
    return { border: '1.5px solid #404040', boxShadow: 'none' };
  };

  // Dot color based on execution state
  const getDotColor = () => {
    if (isSuccess) return '#10b981';
    if (isError) return '#ef4444';
    if (isRunning) return '#3b82f6';
    return '#6b6b6b';
  };

  const dotColor = getDotColor();
  const borderStyle = getBorderStyle();

  return (
    <div 
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        animation: 'nodeAppear 0.3s ease-out',
      }}
    >
      {/* Delete Button - top-right, appears on hover or selected */}
      {(isHovered || selected) && (
        <div
          className="absolute z-30 flex items-center justify-center cursor-pointer transition-all duration-150"
          style={{
            right: '-8px',
            top: '-8px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: '#ff4757',
            border: '2px solid #1e1e1e',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#ff6b7a';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#ff4757';
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          }}
        >
          <X style={{ width: '12px', height: '12px', color: '#ffffff' }} strokeWidth={2.5} />
        </div>
      )}

      {/* Trigger Badge - Lightning icon, top-left outside the box */}
      {isTrigger && (
        <div 
          className="absolute z-20 flex items-center justify-center"
          style={{ 
            left: '-14px',
            top: '-6px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: 'rgba(58, 42, 42, 0.95)',
          }}
        >
          <Zap 
            className="fill-[#ff4757] text-[#ff4757]" 
            style={{ width: '12px', height: '12px' }}
          />
        </div>
      )}

      {/* Webhook Activity Badge - shows when webhook receives data */}
      {webhookActivity && webhookActivity.count > 0 && (
        <div 
          className={cn(
            "absolute z-20 flex items-center justify-center",
            webhookActivity.isPulsing && "animate-pulse"
          )}
          style={{ 
            right: '-10px',
            top: '-10px',
            minWidth: '24px',
            height: '24px',
            padding: '0 6px',
            borderRadius: '12px',
            backgroundColor: '#10b981',
            border: '2px solid #1a1a1a',
            boxShadow: webhookActivity.isPulsing ? '0 0 12px rgba(16, 185, 129, 0.6)' : 'none',
          }}
          title={webhookActivity.lastReceived ? `Ultima recepție: ${new Date(webhookActivity.lastReceived).toLocaleTimeString()}` : 'Date primite'}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'white' }}>
            {webhookActivity.count > 99 ? '99+' : webhookActivity.count}
          </span>
        </div>
      )}

      {/* Main Node Container - 100x100px, border-radius 16px (not more!) */}
      {/* Dots are positioned INSIDE this container to be centered correctly */}
      {/* onMouseUp on the whole container accepts connection drops (for non-trigger nodes) */}
      <div
        className={cn(
          "relative flex items-center justify-center transition-all duration-200",
          isRunning && "animate-pulse",
          isConnecting && !isTrigger && "ring-2 ring-emerald-500/50" // Highlight when can accept connection
        )}
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '16px',
          backgroundColor: isHovered && !selected ? '#323232' : '#2d2d2d',
          ...borderStyle,
          transform: isHovered && !selected ? 'translateY(-2px)' : 'none',
          pointerEvents: 'auto', // Ensure mouse events work
        }}
        onMouseUp={(e) => {
          // Only accept connection drop if we're currently connecting AND this is not a trigger
          if (isConnecting && !isTrigger) {
            e.stopPropagation();
            onEndConnection();
          }
        }}
      >
        {/* INPUT Connection Dot (LEFT) - drop zone for connections */}
        {!isTrigger && (
          <div
            className={cn(
              "absolute z-20 cursor-pointer transition-all duration-200",
              isConnecting && "scale-125" // Bigger target when connecting
            )}
            style={{
              left: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              backgroundColor: isConnecting ? '#10b981' : dotColor,
              borderRadius: '50%',
              border: '3px solid #1a1a1a',
              boxShadow: isConnecting ? '0 0 12px rgba(16, 185, 129, 0.7)' : 'none',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => {
              if (isConnecting) {
                e.stopPropagation();
                onEndConnection();
              }
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#10b981';
              (e.target as HTMLElement).style.transform = 'translateY(-50%) scale(1.3)';
              (e.target as HTMLElement).style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.7)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = isConnecting ? '#10b981' : dotColor;
              (e.target as HTMLElement).style.transform = isConnecting ? 'translateY(-50%) scale(1.25)' : 'translateY(-50%)';
              (e.target as HTMLElement).style.boxShadow = isConnecting ? '0 0 12px rgba(16, 185, 129, 0.7)' : 'none';
            }}
          />
        )}

        {/* OUTPUT Connection Dot (RIGHT) - drag to start connection */}
        <div
          className="absolute z-20 cursor-pointer transition-all duration-200"
          style={{
            right: '-8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            backgroundColor: dotColor,
            borderRadius: '50%',
            border: '3px solid #1a1a1a',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#10b981';
            (e.target as HTMLElement).style.transform = 'translateY(-50%) scale(1.2)';
            (e.target as HTMLElement).style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.6)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = dotColor;
            (e.target as HTMLElement).style.transform = 'translateY(-50%)';
            (e.target as HTMLElement).style.boxShadow = 'none';
          }}
        />

        {/* Icon - full size for brand icons with images, centered */}
        {data.iconUrl ? (
          <img 
            src={data.iconUrl} 
            alt={data.label} 
            draggable={false}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: '14px',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        ) : BrandIcon ? (
          <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <BrandIcon size={100} />
          </div>
        ) : (
          <FallbackIcon 
            style={{ width: '40px', height: '40px', color: '#e0e0e0', pointerEvents: 'none' }}
            strokeWidth={1.2} 
          />
        )}

        {/* Success Badge - Check mark */}
        {isSuccess && !isError && (
          <div 
            className="absolute flex items-center justify-center"
            style={{
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '2px solid #1a1a1a',
            }}
          >
            <Check style={{ width: '12px', height: '12px', color: 'white' }} strokeWidth={3} />
          </div>
        )}

        {/* Error Badge */}
        {isError && (
          <div 
            className="absolute flex items-center justify-center"
            style={{
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              border: '2px solid #1a1a1a',
            }}
          >
            <AlertTriangle style={{ width: '11px', height: '11px', color: 'white' }} />
          </div>
        )}
      </div>

      {/* Labels below node */}
      <div
        className="text-center"
        style={{
          marginTop: '10px',
          maxWidth: '140px',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#ffffff',
            lineHeight: 1.3,
            fontFamily: '-apple-system, system-ui, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={getNodeDisplayName(data.icon, data.label)}
        >
          {getNodeDisplayName(data.icon, data.label)}
        </div>
        {/* Subtitle (if exists) */}
        {data.description && (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 400,
              color: '#888888',
              marginTop: '3px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: '-apple-system, system-ui, sans-serif',
            }}
          >
            {data.description}
          </div>
        )}
      </div>

      {/* Sub-node Slots - like n8n's Model connection for LLM Chain nodes */}
      {(hasSubSlots || isLLMChainNode) && (
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Model Slot Label with dashed line */}
          {subNodeSlots.map((slot) => (
            <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Dashed connecting line */}
              <div
                style={{
                  width: '2px',
                  height: '20px',
                  backgroundImage: 'linear-gradient(to bottom, #666 50%, transparent 50%)',
                  backgroundSize: '2px 6px',
                }}
              />
              {/* Slot label */}
              <div
                style={{
                  fontSize: '11px',
                  color: slot.required ? '#ff6b5a' : '#888',
                  marginBottom: '6px',
                }}
              >
                {slot.label}{slot.required && '*'}
              </div>
              {/* Connected sub-node or empty slot */}
              {slot.connectedNode ? (
                <div
                  onClick={() => onSubNodeClick?.(slot.id)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }}
                >
                  <GroqChatModelIcon size={50} />
                </div>
              ) : (
                <div
                  onClick={() => onSubNodeClick?.(slot.id)}
                  onMouseUp={() => {
                    if (isSubConnecting) {
                      onEndSubConnection?.(slot.id);
                    }
                  }}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    backgroundColor: '#1a1a1a',
                    border: `2px dashed ${isSubConnecting ? '#10b981' : '#555'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#10b981';
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = isSubConnecting ? '#10b981' : '#555';
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }}
                >
                  <Plus style={{ width: '20px', height: '20px', color: '#666' }} />
                </div>
              )}
              {/* Sub-node label */}
              {slot.connectedNode && (
                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#fff',
                    textAlign: 'center',
                  }}
                >
                  {slot.connectedNode.label}
                </div>
              )}
            </div>
          ))}

          {/* Default Model slot for LLM Chain nodes without explicit slots */}
          {isLLMChainNode && subNodeSlots.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Dashed connecting line */}
              <div
                style={{
                  width: '2px',
                  height: '20px',
                  backgroundImage: 'linear-gradient(to bottom, #666 50%, transparent 50%)',
                  backgroundSize: '2px 6px',
                }}
              />
              {/* Slot label */}
              <div
                style={{
                  fontSize: '11px',
                  color: '#ff6b5a',
                  marginBottom: '6px',
                }}
              >
                Model*
              </div>
              {/* Empty slot - click to add model */}
              <div
                onClick={() => onSubNodeClick?.('model')}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: '#1a1a1a',
                  border: '2px dashed #555',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#10b981';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#555';
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                }}
              >
                <Plus style={{ width: '20px', height: '20px', color: '#666' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
