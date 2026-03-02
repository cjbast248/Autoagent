import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, Clock, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Execution {
  id: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  nodeName?: string;
}

interface ExecutionsPanelProps {
  executions?: Execution[];
}

export const ExecutionsPanel: React.FC<ExecutionsPanelProps> = ({
  executions = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: Execution['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: Execution['status']) => {
    switch (status) {
      case 'success':
        return '#16a34a';
      case 'error':
        return '#dc2626';
      case 'running':
        return '#3b82f6';
      case 'waiting':
        return '#eab308';
    }
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-300"
      style={{
        height: isExpanded ? '300px' : '48px',
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #2a2a2a',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-[#222]"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderBottom: isExpanded ? '1px solid #2a2a2a' : 'none' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-white font-medium text-sm">Executions</span>
          </div>
          {executions.length > 0 && (
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#2a2a2a', color: '#888' }}>
              {executions.length} {executions.length === 1 ? 'run' : 'runs'}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-transparent"
        >
          <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
        </Button>
      </div>

      {/* Executions List */}
      {isExpanded && (
        <div className="overflow-y-auto" style={{ height: 'calc(300px - 49px)' }}>
          {executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Clock className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No executions yet</p>
              <p className="text-xs mt-1">Run your workflow to see execution history</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#222] cursor-pointer transition-colors"
                  style={{ backgroundColor: '#1e1e1e', border: '1px solid #2a2a2a' }}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                      <p className="text-white text-sm font-medium">
                        {execution.status === 'success' && 'Successful execution'}
                        {execution.status === 'error' && 'Failed execution'}
                        {execution.status === 'running' && 'Running...'}
                        {execution.status === 'waiting' && 'Waiting...'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(execution.startTime, { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {execution.duration && (
                      <span className="text-xs text-gray-400">
                        {execution.duration}ms
                      </span>
                    )}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getStatusColor(execution.status) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
