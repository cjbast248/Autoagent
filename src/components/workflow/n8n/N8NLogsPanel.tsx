import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Trash2, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/utils';

export interface LogEntry {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'running';
  nodeName: string;
  message?: string;
  outputData?: any;
  executionTime?: number;
  itemCount?: number;
}

interface N8NLogsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  logs: LogEntry[];
  isRunning?: boolean;
  onClearLogs?: () => void;
  runningTime?: number;
}

// JSON Tree View Component
const JsonTreeView: React.FC<{ data: any; level?: number; initialExpanded?: boolean }> = ({ 
  data, 
  level = 0,
  initialExpanded = true 
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isExpanded = (key: string) => {
    if (expanded[key] !== undefined) return expanded[key];
    return level < 2; // Auto-expand first 2 levels
  };

  if (data === null) return <span className="text-orange-400">null</span>;
  if (data === undefined) return <span className="text-slate-500">undefined</span>;
  if (typeof data === 'string') return <span className="text-green-400">"{data}"</span>;
  if (typeof data === 'number') return <span className="text-blue-400">{data}</span>;
  if (typeof data === 'boolean') return <span className="text-purple-400">{data.toString()}</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-500">[]</span>;
    
    return (
      <div className="pl-3">
        {data.map((item, index) => {
          const key = `${level}-${index}`;
          const isObj = typeof item === 'object' && item !== null;
          const expanded = isExpanded(key);
          
          return (
            <div key={key} className="my-0.5">
              <div 
                className={cn(
                  "flex items-start gap-1 cursor-pointer hover:bg-white/5 rounded px-1 -ml-1",
                  isObj && "cursor-pointer"
                )}
                onClick={() => isObj && toggleExpand(key)}
              >
                {isObj ? (
                  expanded ? (
                    <ChevronDown className="w-3 h-3 mt-1 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mt-1 text-slate-400 flex-shrink-0" />
                  )
                ) : (
                  <span className="w-3" />
                )}
                <span className="text-slate-300">[{index}]</span>
                {!isObj && (
                  <>
                    <span className="text-slate-500 mx-1">:</span>
                    <JsonTreeView data={item} level={level + 1} />
                  </>
                )}
                {isObj && !expanded && (
                  <span className="text-slate-400 text-xs ml-2">
                    {Array.isArray(item) ? `[${item.length}]` : `{${Object.keys(item).length}}`}
                  </span>
                )}
              </div>
              {isObj && expanded && (
                <div className="ml-3 border-l-2 border-slate-600/80 pl-2">
                  <JsonTreeView data={item} level={level + 1} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-slate-500">{'{}'}</span>;

    return (
      <div className="pl-3">
        {entries.map(([key, value]) => {
          const nodeKey = `${level}-${key}`;
          const isObj = typeof value === 'object' && value !== null;
          const expanded = isExpanded(nodeKey);

          return (
            <div key={nodeKey} className="my-0.5">
              <div 
                className={cn(
                  "flex items-start gap-1 hover:bg-white/5 rounded px-1 -ml-1",
                  isObj && "cursor-pointer"
                )}
                onClick={() => isObj && toggleExpand(nodeKey)}
              >
                {isObj ? (
                  expanded ? (
                    <ChevronDown className="w-3 h-3 mt-1 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mt-1 text-slate-400 flex-shrink-0" />
                  )
                ) : (
                  <span className="w-3" />
                )}
                <span className="text-cyan-300 font-medium">{key}</span>
                <span className="text-slate-500 mx-1">:</span>
                {!isObj && <JsonTreeView data={value} level={level + 1} />}
                {isObj && !expanded && (
                  <span className="text-slate-400 text-xs">
                    {Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`}
                  </span>
                )}
              </div>
              {isObj && expanded && (
                <div className="ml-3 border-l-2 border-slate-600/80 pl-2">
                  <JsonTreeView data={value} level={level + 1} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <span className="text-slate-400">{String(data)}</span>;
};

// Get unique nodes from logs (latest status for each)
const getUniqueNodes = (logs: LogEntry[]) => {
  const nodeMap = new Map<string, LogEntry>();
  
  logs.forEach(log => {
    const existing = nodeMap.get(log.nodeName);
    // Always keep the latest log for each node
    if (!existing || log.status !== 'running' || existing.status === 'running') {
      nodeMap.set(log.nodeName, log);
    }
  });
  
  // Return in order of first appearance
  const orderedNodes: LogEntry[] = [];
  const seen = new Set<string>();
  
  logs.forEach(log => {
    if (!seen.has(log.nodeName)) {
      seen.add(log.nodeName);
      orderedNodes.push(nodeMap.get(log.nodeName)!);
    }
  });
  
  return orderedNodes;
};

// Get all logs for a specific node
const getNodeLogs = (logs: LogEntry[], nodeName: string) => {
  return logs.filter(log => log.nodeName === nodeName);
};

// Status icon component
const StatusIcon: React.FC<{ status: 'success' | 'error' | 'running' }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
  }
};

export const N8NLogsPanel: React.FC<N8NLogsPanelProps> = ({
  isOpen,
  onToggle,
  logs,
  isRunning,
  onClearLogs,
  runningTime = 0,
}) => {
  const [height, setHeight] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const uniqueNodes = getUniqueNodes(logs);
  const selectedNodeLogs = selectedNode ? getNodeLogs(logs, selectedNode) : [];
  const selectedNodeLatest = uniqueNodes.find(n => n.nodeName === selectedNode);

  // Auto-select first node when logs appear
  useEffect(() => {
    if (uniqueNodes.length > 0 && !selectedNode) {
      setSelectedNode(uniqueNodes[0].nodeName);
    }
  }, [uniqueNodes, selectedNode]);

  // Auto-select latest running/new node and auto-scroll
  useEffect(() => {
    if (logs.length > 0) {
      const latestLog = logs[logs.length - 1];
      if (latestLog.status === 'running' || latestLog.status === 'success') {
        setSelectedNode(latestLog.nodeName);
      }

      // Auto-scroll to bottom when new logs are added
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [logs]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY;
      setHeight(Math.max(150, Math.min(newHeight, windowHeight * 0.7)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div 
      ref={panelRef}
      className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] transition-all duration-150"
      style={{ height: isOpen ? `${height}px` : '40px' }}
    >
      {/* Resize Handle */}
      {isOpen && (
        <div 
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-[#333] group z-10"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        >
          <div className="w-10 h-1 rounded-full bg-[#444] group-hover:bg-[#666] transition-colors" />
        </div>
      )}

      {/* Header */}
      <div 
        className="h-10 px-4 flex items-center justify-between border-b border-[#2a2a2a] cursor-pointer hover:bg-[#222]"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-300">Logs</span>
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-[#333] text-slate-400">
              {uniqueNodes.length} nodes
            </span>
          )}
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-500">
              <Clock className="w-3 h-3" />
              Running for {formatTime(runningTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && onClearLogs && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClearLogs();
                setSelectedNode(null);
              }}
              className="p-1 hover:bg-[#2a2a2a] rounded text-slate-400 hover:text-red-400 transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Content - Structured Node List */}
      {isOpen && (
        <div ref={scrollContainerRef} className="h-[calc(100%-40px)] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Execute the workflow to see logs
            </div>
          ) : (
            <div className="py-2">
              {uniqueNodes.map((node) => {
                const nodeLogs = getNodeLogs(logs, node.nodeName);
                const isExpanded = selectedNode === node.nodeName;
                
                return (
                  <div key={node.nodeName} className="border-b border-[#2a2a2a] last:border-b-0">
                    {/* Node Header - Clickable */}
                    <div
                      onClick={() => setSelectedNode(isExpanded ? null : node.nodeName)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                        isExpanded ? "bg-[#252525]" : "hover:bg-[#222]"
                      )}
                    >
                      {/* Expand Arrow */}
                      <ChevronRight 
                        className={cn(
                          "w-4 h-4 text-slate-500 transition-transform flex-shrink-0",
                          isExpanded && "rotate-90"
                        )} 
                      />
                      
                      {/* Status Icon */}
                      <StatusIcon status={node.status} />
                      
                      {/* Node Name */}
                      <span className="text-sm font-medium text-slate-200 flex-1">
                        {node.nodeName}
                      </span>
                      
                      {/* Item Count Badge */}
                      {node.itemCount !== undefined && node.itemCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#333] text-slate-400">
                          {node.itemCount} item{node.itemCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      
                      {/* Execution Time */}
                      {node.executionTime && (
                        <span className="text-xs text-slate-500">
                          {(node.executionTime / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="bg-[#1a1a1a] border-t border-[#333]">
                        {/* Output Data */}
                        {node.outputData ? (
                          <div className="p-4">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-semibold">
                              Output Data
                            </div>
                            <div className="bg-[#0d0d0d] rounded-lg p-3 border border-[#333] font-mono text-xs max-h-[300px] overflow-auto">
                              <JsonTreeView data={node.outputData} />
                            </div>
                          </div>
                        ) : null}
                        
                        {/* Log Messages */}
                        {nodeLogs.length > 0 && (
                          <div className="px-4 pb-4">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-semibold">
                              Messages
                            </div>
                            <div className="space-y-1 font-mono text-xs">
                              {nodeLogs.map((log) => (
                                <div 
                                  key={log.id}
                                  className={cn(
                                    "flex items-start gap-3 py-1.5 px-2 rounded",
                                    log.status === 'error' && "bg-red-500/10",
                                    log.status === 'success' && "bg-green-500/10"
                                  )}
                                >
                                  <span className="text-slate-600 text-[10px] flex-shrink-0 font-normal">
                                    {log.timestamp}
                                  </span>
                                  <StatusIcon status={log.status} />
                                  <span className={cn(
                                    "flex-1",
                                    log.status === 'error' && "text-red-400",
                                    log.status === 'success' && "text-green-400",
                                    log.status === 'running' && "text-slate-300"
                                  )}>
                                    {log.message}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* No data message */}
                        {!node.outputData && nodeLogs.length === 0 && (
                          <div className="p-4 text-center text-slate-500 text-sm">
                            No data available
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
