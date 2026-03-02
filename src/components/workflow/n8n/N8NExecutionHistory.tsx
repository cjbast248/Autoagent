import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2, ChevronRight, ChevronDown, Clock, CheckCircle2, XCircle, PlayCircle, Zap, Settings, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/utils/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ExecutionRecord {
  id: string;
  workflow_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'success' | 'error';
  source: 'manual' | 'webhook' | 'scheduler';
  duration_ms?: number;
  nodes_executed: Array<{
    // Worker uses camelCase
    nodeId?: string;
    nodeLabel?: string;
    durationMs?: number;
    result?: any;
    error?: string;
    // UI expects snake_case (legacy)
    node_id?: string;
    node_label?: string;
    status: 'success' | 'error' | 'skipped';
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
    input_data?: any;
    output_data?: any;
    error_message?: string;
    // Split execution fields
    splitExecution?: boolean;
    itemsProcessed?: number;
    successCount?: number;
    errorCount?: number;
  }>;
  trigger_data?: any;
  error_message?: string;
}

interface N8NExecutionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string | null;
  nodes?: Array<{ id: string; label: string }>;
  onLoadTestData?: (executionData: Record<string, { input?: any; output?: any }>) => void;
  currentExecution?: {
    logs: Array<{
      id: string;
      timestamp: string;
      status: 'success' | 'error' | 'running';
      nodeName: string;
      message?: string;
      outputData?: any;
      executionTime?: number;
      itemCount?: number;
    }>;
    isRunning: boolean;
    source: 'manual' | 'webhook' | 'scheduler';
  };
}

const RETENTION_OPTIONS = [
  { value: '1', label: '1 zi' },
  { value: '3', label: '3 zile' },
  { value: '7', label: '7 zile' },
  { value: '14', label: '14 zile' },
  { value: '30', label: '30 zile' },
];

export const N8NExecutionHistory: React.FC<N8NExecutionHistoryProps> = ({
  isOpen,
  onClose,
  workflowId,
  nodes = [],
  onLoadTestData,
  currentExecution,
}) => {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState('7');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedExecutions, setSelectedExecutions] = useState<Set<string>>(new Set());

  // Load executions from database
  const loadExecutions = useCallback(async () => {
    if (!workflowId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setExecutions((data || []).map(item => ({
        ...item,
        status: item.status as 'running' | 'success' | 'error',
        source: item.source as 'manual' | 'webhook' | 'scheduler',
        nodes_executed: (Array.isArray(item.nodes_executed) ? item.nodes_executed : []) as ExecutionRecord['nodes_executed']
      })));
    } catch (err) {
      console.error('Failed to load executions:', err);
      // If table doesn't exist yet, just show empty
      setExecutions([]);
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  // Load on open
  useEffect(() => {
    if (isOpen && workflowId) {
      loadExecutions();
    }
  }, [isOpen, workflowId, loadExecutions]);

  // Load retention setting from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`execution_retention_${workflowId}`);
    if (saved) setRetentionDays(saved);
  }, [workflowId]);

  // Save retention setting
  const handleRetentionChange = (value: string) => {
    setRetentionDays(value);
    localStorage.setItem(`execution_retention_${workflowId}`, value);
    toast.success(`Retenție setată la ${value} zile`);
  };

  // Delete selected executions
  const handleDeleteSelected = async () => {
    if (selectedExecutions.size === 0) return;

    try {
      const { error } = await supabase
        .from('workflow_executions')
        .delete()
        .in('id', Array.from(selectedExecutions));

      if (error) throw error;

      setExecutions(prev => prev.filter(e => !selectedExecutions.has(e.id)));
      setSelectedExecutions(new Set());
      toast.success(`${selectedExecutions.size} execuții șterse`);
    } catch (err) {
      console.error('Failed to delete executions:', err);
      toast.error('Eroare la ștergerea execuțiilor');
    }
  };

  // Delete old executions based on retention
  const handleCleanup = async () => {
    if (!workflowId) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(retentionDays));

    try {
      const { error, count } = await supabase
        .from('workflow_executions')
        .delete()
        .eq('workflow_id', workflowId)
        .lt('started_at', cutoffDate.toISOString());

      if (error) throw error;

      toast.success(`${count || 0} execuții vechi șterse`);
      loadExecutions();
    } catch (err) {
      console.error('Failed to cleanup executions:', err);
      toast.error('Eroare la curățare');
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedExecutions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Load execution data as test data for the editor
  const handleLoadTestData = (exec: ExecutionRecord) => {
    if (!onLoadTestData) return;

    const executionData: Record<string, { input?: any; output?: any }> = {};

    // First, load trigger_data for trigger nodes (Webhook Trigger, etc.)
    // This contains the data received by the webhook
    if (exec.trigger_data) {
      // Find trigger nodes in the workflow
      const triggerNode = nodes.find(n =>
        n.label.toLowerCase().includes('trigger') ||
        n.label.toLowerCase().includes('webhook')
      );

      if (triggerNode) {
        executionData[triggerNode.id] = {
          output: exec.trigger_data,
        };
        console.log('[ExecutionHistory] Loaded trigger_data for node:', triggerNode.label);
      }
    }

    // Map node labels from execution to node IDs in the workflow
    exec.nodes_executed?.forEach((nodeExec) => {
      const nodeLabel = nodeExec.nodeLabel || nodeExec.node_label;
      const outputData = nodeExec.result || nodeExec.output_data;

      // Find the node by label
      const matchingNode = nodes.find(n => n.label === nodeLabel);

      if (matchingNode && outputData) {
        executionData[matchingNode.id] = {
          output: outputData,
        };
      }
    });

    console.log('[ExecutionHistory] Loading test data:', executionData);
    console.log('[ExecutionHistory] Nodes with data:', Object.keys(executionData).length);
    onLoadTestData(executionData);
    toast.success(`Date de test încărcate! (${Object.keys(executionData).length} noduri)`);
    onClose();
  };

  // Get source icon and label
  const getSourceInfo = (source: string) => {
    switch (source) {
      case 'webhook':
        return { icon: Zap, label: 'Webhook', color: 'text-purple-400' };
      case 'scheduler':
        return { icon: Calendar, label: 'Programat', color: 'text-blue-400' };
      default:
        return { icon: PlayCircle, label: 'Test Manual', color: 'text-slate-400' };
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'success':
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'error':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' };
      default:
        return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    }
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg w-[800px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-white">Istoric Execuții</h2>
            <span className="text-xs text-slate-500 bg-[#2a2a2a] px-2 py-0.5 rounded">
              {executions.length} execuții
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-slate-400 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 py-3 border-b border-[#333] bg-[#222] flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Păstrează execuțiile:</span>
              <Select value={retentionDays} onValueChange={handleRetentionChange}>
                <SelectTrigger className="w-[100px] h-7 text-xs bg-[#1a1a1a] border-[#444]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanup}
              className="text-xs h-7 border-[#444] hover:bg-[#333]"
            >
              Curăță acum
            </Button>
            {selectedExecutions.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                className="text-xs h-7 ml-auto"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Șterge {selectedExecutions.size} selectate
              </Button>
            )}
          </div>
        )}

        {/* Executions List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Clock className="h-5 w-5 animate-spin mr-2" />
              Se încarcă...
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Clock className="h-8 w-8 mb-2 opacity-50" />
              <p>Nu există execuții înregistrate</p>
              <p className="text-xs mt-1">Execuțiile vor apărea aici după ce rulezi workflow-ul</p>
            </div>
          ) : (
            <div className="divide-y divide-[#333]">
              {executions.map((exec) => {
                const sourceInfo = getSourceInfo(exec.source);
                const statusInfo = getStatusInfo(exec.status);
                const isExpanded = expandedId === exec.id;
                const SourceIcon = sourceInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={exec.id} className="hover:bg-[#222] transition-colors">
                    {/* Execution Row */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : exec.id)}
                    >
                      {/* Checkbox for selection */}
                      <input
                        type="checkbox"
                        checked={selectedExecutions.has(exec.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelection(exec.id);
                        }}
                        className="w-4 h-4 rounded border-[#444] bg-[#2a2a2a] text-emerald-500 focus:ring-emerald-500/50"
                      />

                      {/* Expand Arrow */}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}

                      {/* Status Icon */}
                      <div className={cn("p-1.5 rounded", statusInfo.bg)}>
                        <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                      </div>

                      {/* Timestamp */}
                      <div className="flex flex-col min-w-[140px]">
                        <span className="text-sm text-white">
                          {new Date(exec.started_at).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDuration(exec.duration_ms)}
                        </span>
                      </div>

                      {/* Source Badge */}
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                        "bg-[#2a2a2a]",
                        sourceInfo.color
                      )}>
                        <SourceIcon className="h-3 w-3" />
                        {sourceInfo.label}
                      </div>

                      {/* Nodes count */}
                      <span className="text-xs text-slate-500 ml-auto">
                        {exec.nodes_executed?.length || 0} noduri
                      </span>

                      {/* Error message preview */}
                      {exec.error_message && (
                        <span className="text-xs text-red-400 truncate max-w-[200px]">
                          {exec.error_message}
                        </span>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-[#1a1a1a]">
                        <div className="ml-10 border-l-2 border-[#333] pl-4 space-y-2">
                          {exec.nodes_executed?.map((node, idx) => {
                            const nodeStatus = getStatusInfo(node.status);
                            const NodeStatusIcon = nodeStatus.icon;
                            // Handle both camelCase (worker) and snake_case (legacy) field names
                            const nodeLabel = node.nodeLabel || node.node_label || 'Unknown Node';
                            const durationMs = node.durationMs ?? node.duration_ms;
                            const errorMsg = node.error || node.error_message;
                            const outputData = node.result || node.output_data;

                            // Debug: log node data structure
                            if (idx === 0) {
                              console.log('[ExecutionHistory] Node data sample:', JSON.stringify(node, null, 2));
                            }

                            return (
                              <div
                                key={idx}
                                className="flex items-start gap-3 py-2 border-b border-[#2a2a2a] last:border-0"
                              >
                                <NodeStatusIcon className={cn("h-4 w-4 mt-0.5", nodeStatus.color)} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-white font-medium">
                                      {nodeLabel}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {formatDuration(durationMs)}
                                    </span>
                                    {node.splitExecution && (
                                      <span className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                        Split: {node.successCount || 0}✓ {node.errorCount || 0}✗ / {node.itemsProcessed || 0}
                                      </span>
                                    )}
                                  </div>

                                  {errorMsg && (
                                    <p className="text-xs text-red-400 mt-1">
                                      {errorMsg}
                                    </p>
                                  )}

                                  {outputData !== undefined && outputData !== null && (
                                    <details className="mt-2" open>
                                      <summary className="text-xs text-emerald-400 cursor-pointer hover:text-emerald-300 font-medium">
                                        📤 Output
                                      </summary>
                                      <pre className="mt-1 p-2 bg-[#0a0a0a] rounded text-xs text-slate-300 overflow-x-auto max-h-[200px] border border-[#333]">
                                        {JSON.stringify(outputData, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {(!exec.nodes_executed || exec.nodes_executed.length === 0) && (
                            <p className="text-xs text-slate-500 py-2">
                              Nu există detalii pentru noduri
                            </p>
                          )}

                          {/* Load as Test Data button */}
                          {onLoadTestData && exec.nodes_executed && exec.nodes_executed.length > 0 && (
                            <div className="pt-3 mt-2 border-t border-[#333]">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadTestData(exec);
                                }}
                                className="w-full text-xs h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                              >
                                <PlayCircle className="h-3 w-3 mr-2" />
                                Încarcă ca Date de Test
                              </Button>
                              <p className="text-xs text-slate-500 mt-1.5 text-center">
                                Încarcă output-ul acestei execuții în editor pentru a configura variabilele
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#333] flex items-center justify-between bg-[#1a1a1a]">
          <span className="text-xs text-slate-500">
            Retenție: {retentionDays} zile
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadExecutions}
            className="text-xs text-slate-400 hover:text-white"
          >
            <Clock className="h-3 w-3 mr-1" />
            Reîmprospătează
          </Button>
        </div>
      </div>
    </div>
  );
};
