import React from 'react';
import { 
  Flag, 
  Phone, 
  Database, 
  Clock, 
  MessageSquare, 
  FileText, 
  Wrench,
  Sparkles,
  ArrowRight,
  XCircle,
  Webhook,
  X,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';

const iconMap: Record<string, any> = {
  Flag,
  Play: Flag,
  Start: Flag,
  Phone,
  Mail: MessageSquare,
  Database,
  Clock,
  MessageSquare,
  FileText,
  Wrench,
  Sparkles,
  Webhook,
  Success: Sparkles,
  Failure: XCircle,
  End: X,
};

const typeStyles: Record<string, { bg: string; iconBg: string; border: string }> = {
  trigger: {
    bg: 'bg-white',
    iconBg: 'bg-slate-100',
    border: 'border-slate-200',
  },
  start: {
    bg: 'bg-white',
    iconBg: 'bg-slate-100',
    border: 'border-slate-200',
  },
  prompt: {
    bg: 'bg-white',
    iconBg: 'bg-blue-50',
    border: 'border-slate-200',
  },
  tool: {
    bg: 'bg-white',
    iconBg: 'bg-amber-50',
    border: 'border-slate-200',
  },
  call: {
    bg: 'bg-white',
    iconBg: 'bg-purple-50',
    border: 'border-slate-200',
  },
  destination: {
    bg: 'bg-white',
    iconBg: 'bg-blue-50',
    border: 'border-slate-200',
  },
  success: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    border: 'border-emerald-200',
  },
  failure: {
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    border: 'border-rose-200',
  },
  condition: {
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    border: 'border-violet-200',
  },
  end: {
    bg: 'bg-slate-50',
    iconBg: 'bg-slate-200',
    border: 'border-slate-300',
  },
};

const iconColors: Record<string, string> = {
  trigger: 'text-slate-600',
  start: 'text-slate-600',
  prompt: 'text-blue-600',
  tool: 'text-amber-600',
  call: 'text-purple-600',
  destination: 'text-blue-600',
  success: 'text-emerald-600',
  failure: 'text-rose-600',
  condition: 'text-violet-600',
  end: 'text-slate-600',
};

interface WorkflowNodeELProps {
  data: any;
  selected: boolean;
  onDelete: () => void;
  onStartConnection: (portId?: string) => void;
  onEndConnection: () => void;
  isConnecting?: boolean;
}

export const WorkflowNodeEL: React.FC<WorkflowNodeELProps> = ({ 
  data, 
  selected,
  onDelete,
  onStartConnection,
  onEndConnection,
  isConnecting,
}) => {
  const Icon = iconMap[data.icon as string] || Flag;
  const styles = typeStyles[data.type] || typeStyles.trigger;
  const iconColor = iconColors[data.type] || 'text-slate-600';
  
  // Check if this is a branching node (dispatch tool)
  const isBranchNode = data.type === 'tool' || data.hasBranches;
  
  // Check if this is a success/failure branch indicator
  const isSuccessBranch = data.type === 'success';
  const isFailureBranch = data.type === 'failure';
  
  // Check if this is an end condition
  const isEndCondition = data.type === 'condition';
  const isEndNode = data.type === 'end';

  // Small branch indicator style (Success/Failure pills)
  if (isSuccessBranch || isFailureBranch) {
    return (
      <div className="relative flex flex-col items-center">
        {/* Input Port */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection();
          }}
        />
        
        <div className={cn(
          "px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium shadow-sm",
          isSuccessBranch ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-rose-100 text-rose-700 border border-rose-200"
        )}>
          {isSuccessBranch ? (
            <>
              <Sparkles className="w-3 h-3" />
              Success
            </>
          ) : (
            <>
              <ArrowRight className="w-3 h-3 rotate-180" />
              Failure
            </>
          )}
        </div>
        
        {/* Output Port */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
        />
      </div>
    );
  }

  // End call condition style
  if (isEndCondition) {
    return (
      <div className="relative flex flex-col items-center">
        {/* Input Port */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection();
          }}
        />
        
        <div className="px-3 py-1.5 rounded-md bg-violet-50 border border-violet-200 flex items-center gap-1.5 text-xs font-medium text-violet-700 shadow-sm">
          <Sparkles className="w-3 h-3" />
          End call condition
        </div>
        
        {/* Output Port */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
        />
      </div>
    );
  }

  // End node style
  if (isEndNode) {
    return (
      <div className="relative flex flex-col items-center">
        {/* Input Port */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection();
          }}
        />
        
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 shadow-sm">
          <X className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">End</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Input Port (top) */}
      {data.type !== 'trigger' && data.type !== 'start' && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection();
          }}
        />
      )}

      {/* Main Node Card */}
      <div
        className={cn(
          "relative min-w-[200px] max-w-[280px] rounded-xl border-2 shadow-sm transition-all",
          styles.bg,
          styles.border,
          selected && "ring-2 ring-blue-400 ring-offset-2 border-blue-400",
          "hover:shadow-md"
        )}
      >
        {/* Delete Button */}
        {selected && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-white hover:bg-slate-900 shadow-lg z-20"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              styles.iconBg
            )}>
              <Icon className={cn("w-5 h-5", iconColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {data.label}
              </h4>
              {data.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {data.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Output Port (bottom) - for regular nodes */}
      {!isBranchNode && data.type !== 'end' && (
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
        />
      )}

      {/* Branch Output Ports (for dispatch tool nodes) */}
      {isBranchNode && (
        <div className="absolute -bottom-3 left-0 right-0 flex justify-center gap-16">
          <div
            className="w-3 h-3 rounded-full bg-emerald-100 border-2 border-emerald-300 cursor-crosshair hover:border-emerald-500 hover:scale-125 transition-all z-10"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartConnection('success');
            }}
          />
          <div
            className="w-3 h-3 rounded-full bg-rose-100 border-2 border-rose-300 cursor-crosshair hover:border-rose-500 hover:scale-125 transition-all z-10"
            onMouseDown={(e) => {
              e.stopPropagation();
              onStartConnection('failure');
            }}
          />
        </div>
      )}
    </div>
  );
};
