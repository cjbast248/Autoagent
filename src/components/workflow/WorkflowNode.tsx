import React from 'react';
import { Phone, Mail, Database, Clock, MessageSquare, FileText, CheckCircle, Zap, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, any> = {
  Play: Zap,
  Phone,
  Mail,
  Database,
  Clock,
  MessageSquare,
  FileText,
  CheckCircle,
  Zap,
};

const typeGradients: Record<string, string> = {
  trigger: 'from-emerald-400 to-emerald-500',
  call: 'from-purple-400 to-purple-500',
  destination: 'from-blue-400 to-blue-500',
  end: 'from-rose-400 to-rose-500',
};

const typeColors: Record<string, string> = {
  trigger: 'text-emerald-600',
  call: 'text-purple-600',
  destination: 'text-blue-600',
  end: 'text-rose-600',
};

interface WorkflowNodeProps {
  data: any;
  selected: boolean;
  onDelete: () => void;
  onStartConnection: () => void;
  onEndConnection: () => void;
  stepNumber?: number;
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({ 
  data, 
  selected,
  onDelete,
  onStartConnection,
  onEndConnection,
  stepNumber,
}) => {
  const Icon = iconMap[data.icon as string] || Zap;
  const isConfigured = data.config && Object.keys(data.config).length > 0;

  return (
    <div className="relative flex flex-col items-center animate-fade-in">
      {/* Input Port */}
      {data.type !== 'trigger' && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-6 h-6 rounded-full bg-white border-2 border-gray-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10 shadow-sm"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => {
            e.stopPropagation();
            onEndConnection();
          }}
        />
      )}

      {/* Output Port */}
      {data.type !== 'end' && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-6 h-6 rounded-full bg-white border-2 border-gray-300 cursor-crosshair hover:border-blue-400 hover:scale-125 transition-all z-10 shadow-sm"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartConnection();
          }}
        />
      )}

      {/* Main Circular Node */}
      <div className="relative">
        {/* Delete Button */}
        {selected && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-lg z-20"
            onClick={onDelete}
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Badge Indicators */}
        {data.config?.triggerType === 'scheduled' && (
          <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white border-2 border-orange-400 flex items-center justify-center shadow-sm z-10">
            <Clock className="w-3 h-3 text-orange-500" />
          </div>
        )}

        {isConfigured && (
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-green-400 flex items-center justify-center shadow-sm z-10">
            <CheckCircle className="w-3 h-3 text-green-500" />
          </div>
        )}

        {selected && (
          <div className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center shadow-sm z-10">
            <Settings className="w-3 h-3 text-blue-500" />
          </div>
        )}

        {/* Circular Node with Gradient */}
        <div
          className={`w-24 h-24 rounded-full bg-gradient-to-br ${typeGradients[data.type] || 'from-gray-400 to-gray-500'} shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
            selected ? 'ring-4 ring-blue-400 ring-offset-2' : ''
          }`}
        >
          <Icon className="w-10 h-10 text-white drop-shadow-sm" />
        </div>
      </div>

      {/* Label Below Node */}
      <div className="mt-3 flex flex-col items-center space-y-1 max-w-[140px]">
        <div className={`text-sm font-semibold ${typeColors[data.type]} text-center`}>
          {data.label}
        </div>
        {stepNumber && (
          <div className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded">
            {stepNumber}
          </div>
        )}
        {data.description && (
          <div className="text-xs text-gray-500 text-center">
            {data.description}
          </div>
        )}
      </div>
    </div>
  );
};
