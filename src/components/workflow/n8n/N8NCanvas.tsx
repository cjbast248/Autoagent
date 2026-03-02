import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { N8NNode } from './N8NNode';
import { N8NConnection, N8NTempConnection } from './N8NConnection';
import { N8NToolbar, N8NZoomControls } from './N8NToolbar';
import { N8NLogsPanel } from './N8NLogsPanel';
import { N8NNodeSearch } from './N8NNodeSearch';
import { N8NNodeConfig } from './N8NNodeConfig';
import { N8NAIAssistant } from './N8NAIAssistant';
import { N8NExecutionHistory } from './N8NExecutionHistory';
import { ExecuteButton } from './ExecuteButton';
import { N8NProjectsDrawer } from './N8NProjectsDrawer';
import { useWorkflowBuilder } from '@/hooks/useWorkflowBuilder';
import { useWorkflowProjects } from '@/hooks/useWorkflowProjects';
import { useWebhookTrigger } from '@/hooks/useWebhookTrigger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';
// Groq SDK removed - using edge function instead
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Save, RefreshCw, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface N8NCanvasProps {
  initialProjectId?: string;
}

export const N8NCanvas: React.FC<N8NCanvasProps> = ({ initialProjectId }) => {
  const { user } = useAuth();
  const {
    nodes,
    connections,
    selectedNodeId,
    selectedConnectionId,
    draggingNodeId,
    connectingFrom,
    zoom,
    pan,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    deleteConnection,
    selectNode,
    selectConnection,
    startDragging,
    stopDragging,
    startConnecting,
    stopConnecting,
    setZoom,
    setPan,
    validateWorkflow,
    clearCanvas,
    loadWorkflowData,
    autoLayoutNodes,
  } = useWorkflowBuilder();

  const {
    projects,
    currentProjectId,
    currentProjectName,
    isLoading: projectsLoading,
    isWorkflowActive,
    saveProject,
    loadProject,
    loadProjectById,
    deleteProject,
    duplicateProject,
    renameProject,
    createNewProject,
    updateLastRun,
    setCurrentProjectName,
    setCurrentProjectId,
    activateWorkflow,
    deactivateWorkflow,
    setIsWorkflowActive,
  } = useWorkflowProjects();

  const { syncWebhookWithWorkflow, getWebhookUrls } = useWebhookTrigger();

  const canvasRef = useRef<HTMLDivElement>(null);
  const stopRequestedRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSaved, setIsSaved] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runningTime, setRunningTime] = useState(0);
  const runningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const executionStartTimeRef = useRef<number>(0);
  
  // Track execution status for each node
  const [nodeExecutionStatus, setNodeExecutionStatus] = useState<Record<string, 'idle' | 'running' | 'success' | 'error'>>({});
  
  // Track item count output by each node
  const [nodeItemCount, setNodeItemCount] = useState<Record<string, number>>({});
  
  // Track input/output data for each node (for IO panels)
  const [nodeExecutionData, setNodeExecutionData] = useState<Record<string, { input?: any; output?: any }>>({});
  
  const [executionLogs, setExecutionLogs] = useState<Array<{
    id: string;
    timestamp: string;
    status: 'success' | 'error' | 'running';
    nodeName: string;
    message?: string;
    outputData?: any;
    executionTime?: number;
    itemCount?: number;
  }>>([]);
  const [connectingMousePos, setConnectingMousePos] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [showNodeSearch, setShowNodeSearch] = useState(false);
  const [addNodeFromId, setAddNodeFromId] = useState<string | null>(null);
  const [addNodePosition, setAddNodePosition] = useState<{ x: number; y: number } | null>(null);
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);

  // Emit event when config panel opens/closes to hide sidebar
  React.useEffect(() => {
    const root = document.documentElement;
    if (configNodeId) {
      root.classList.add('workflow-config-open');
    } else {
      root.classList.remove('workflow-config-open');
    }
    return () => root.classList.remove('workflow-config-open');
  }, [configNodeId]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveProjectName, setSaveProjectName] = useState('');
  const [activeWebhookUrl, setActiveWebhookUrl] = useState<string | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const shouldFitViewRef = useRef(false);

  // Loop Mode state
  const [continuousMode, setContinuousMode] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const zohoDataFoundRef = useRef(false);
  
  // AI Assistant state
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Execution History state
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const currentExecutionIdRef = useRef<string | null>(null);
  const executedNodesRef = useRef<Array<{
    node_id: string;
    node_label: string;
    status: 'success' | 'error' | 'skipped';
    started_at: string;
    completed_at?: string;
    duration_ms?: number;
    output_data?: any;
    error_message?: string;
  }>>([]);

  // Scheduled Trigger state
  const [schedulerActive, setSchedulerActive] = useState(false);
  const [schedulerInterval, setSchedulerInterval] = useState<number | null>(null);
  const [schedulerCycles, setSchedulerCycles] = useState(0);
  const [nextRunTime, setNextRunTime] = useState<Date | null>(null);
  const schedulerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const handleExecuteRef = useRef<((source?: 'manual' | 'webhook' | 'scheduler') => Promise<any>) | null>(null);

  // Helper to update node execution status
  const updateNodeStatus = useCallback((nodeLabel: string, status: 'idle' | 'running' | 'success' | 'error') => {
    // Find the node by label
    const node = nodes.find(n => n.label === nodeLabel);
    if (node) {
      setNodeExecutionStatus(prev => ({ ...prev, [node.id]: status }));
    }
  }, [nodes]);

  // Reset all node statuses
  const resetNodeStatuses = useCallback(() => {
    setNodeExecutionStatus({});
    setNodeItemCount({});
    // Don't reset nodeExecutionData to keep showing last execution data
  }, []);

  // Initialize nodeExecutionData with pinnedData from nodes
  // This ensures that when opening a node config, it can see pinned data from previous nodes
  React.useEffect(() => {
    const pinnedDataUpdates: Record<string, { output: any }> = {};

    for (const node of nodes) {
      if (node.config?.pinnedData) {
        // Only update if we don't already have execution output for this node
        pinnedDataUpdates[node.id] = {
          output: node.config.pinnedData,
        };
      }
    }

    if (Object.keys(pinnedDataUpdates).length > 0) {
      setNodeExecutionData(prev => {
        const updated = { ...prev };
        for (const [nodeId, data] of Object.entries(pinnedDataUpdates)) {
          // Only set if not already set (preserve execution data over pinned data)
          if (!updated[nodeId]?.output) {
            updated[nodeId] = { ...updated[nodeId], ...data };
          }
        }
        return updated;
      });
    }
  }, [nodes]);

  // Webhook Auto-Execute State
  // webhookAutoExecuteEnabled removed - now tied to isWorkflowActive
  const lastProcessedWebhookIdRef = useRef<string | null>(null);
  const webhookSubscriptionRef = useRef<any>(null);
  const nodesRef = useRef(nodes); // ✅ Ref для nodes чтобы избежать infinite loop
  
  // Keep nodesRef in sync with nodes
  React.useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  // Current webhook request that triggered the workflow (to send response back)
  const currentWebhookRequestRef = useRef<{
    triggerId: string;
    webhookPath: string;
    logId: string;
  } | null>(null);

  // Webhook response configuration (from "Respond to Webhook" node)
  const webhookResponseRef = useRef<{
    body: any;
    statusCode: number;
    headers: Record<string, string>;
    responseType: 'json' | 'xml' | 'text';
    nodeLabel: string;
  } | null>(null);

  // Track the last executed node's output for "When Last Node Finishes" mode
  const lastExecutedNodeOutputRef = useRef<{
    nodeLabel: string;
    data: any;
  } | null>(null);

  // Webhook Activity Indicator State
  const [webhookActivity, setWebhookActivity] = useState<{
    count: number;
    lastReceived: string | null;
    isPulsing: boolean;
  }>({ count: 0, lastReceived: null, isPulsing: false });
  const webhookPulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live Webhook Panel State - shows real-time webhook data
  const [liveWebhookData, setLiveWebhookData] = useState<{
    show: boolean;
    data: any;
    timestamp: string | null;
    status: 'received' | 'executing' | 'success' | 'error';
    executionId?: string;
  }>({ show: false, data: null, timestamp: null, status: 'received' });
  const urlSyncedRef = useRef(false);

  // ============================================
  // URL-based workflow persistence
  // ============================================
  // Store the workflow ID from URL or prop at mount time
  const initialUrlWorkflowIdRef = useRef<string | null>(null);
  const urlLoadedRef = useRef(false);

  // Capture URL workflow ID or prop on first render only
  useEffect(() => {
    if (!urlLoadedRef.current) {
      // Priority: prop > URL query param
      if (initialProjectId) {
        initialUrlWorkflowIdRef.current = initialProjectId;
        console.log('[URL Sync] Initial workflow ID from prop:', initialProjectId);
      } else {
        const url = new URL(window.location.href);
        initialUrlWorkflowIdRef.current = url.searchParams.get('workflow');
        console.log('[URL Sync] Initial workflow ID from URL:', initialUrlWorkflowIdRef.current);
      }
    }
  }, [initialProjectId]);

  // Load workflow from URL/prop on initial mount (runs once)
  useEffect(() => {
    if (urlLoadedRef.current) return;

    const loadFromUrl = async () => {
      const workflowIdFromUrl = initialUrlWorkflowIdRef.current;

      if (workflowIdFromUrl) {
        console.log('[URL Sync] Loading workflow from URL:', workflowIdFromUrl);
        const workflowData = await loadProjectById(workflowIdFromUrl);
        if (workflowData) {
          loadWorkflowData(workflowData.nodes, workflowData.connections);
          shouldFitViewRef.current = true; // Trigger fit view after load
          console.log('[URL Sync] Workflow loaded successfully');
        } else {
          // Invalid workflow ID in URL, remove it
          const url = new URL(window.location.href);
          url.searchParams.delete('workflow');
          window.history.replaceState({}, '', url.toString());
          console.log('[URL Sync] Invalid workflow ID, removed from URL');
        }
      }
      urlLoadedRef.current = true;
      urlSyncedRef.current = true;
    };

    loadFromUrl();
  }, [loadProjectById, loadWorkflowData]);

  // Update URL when project changes (only after initial load)
  useEffect(() => {
    if (!urlSyncedRef.current) return;

    const url = new URL(window.location.href);
    if (currentProjectId) {
      // Only update URL if it's different from what we loaded
      if (url.searchParams.get('workflow') !== currentProjectId) {
        console.log('[URL Sync] Updating URL with new project:', currentProjectId);
        url.searchParams.set('workflow', currentProjectId);
        window.history.replaceState({}, '', url.toString());
      }
    } else {
      // Clear URL if no project
      if (url.searchParams.has('workflow')) {
        url.searchParams.delete('workflow');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [currentProjectId]);

  // Listen for realtime webhook events and auto-execute workflow
  React.useEffect(() => {
    // Only listen when workflow is active and has a webhook trigger
    if (!isWorkflowActive || !currentProjectId) return;

    // Find webhook node in workflow - using nodesRef to avoid dependency
    const webhookNode = nodesRef.current.find(n =>
      n.icon === 'webhook' ||
      n.icon === 'webhook-trigger' ||
      n.label?.toLowerCase().includes('webhook')
    );

    if (!webhookNode) return;

    const webhookPath = webhookNode.config?.webhookPath || webhookNode.config?.path;
    const webhookTriggerIdFromConfig = webhookNode.config?.webhookTriggerId as string | undefined;

    // Setup subscription with async lookup if needed
    let subscriptionChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      let webhookTriggerId = webhookTriggerIdFromConfig;

      // If no webhookTriggerId in node config, try to find it from DB by workflow_id
      if (!webhookTriggerId && currentProjectId) {
        console.log('[Webhook Auto-Execute] No webhookTriggerId in node config, looking up from DB for workflow:', currentProjectId);
        try {
          const { data: triggers } = await supabase
            .from('workflow_webhook_triggers')
            .select('id, webhook_path')
            .eq('workflow_id', currentProjectId)
            .eq('is_active', true)
            .limit(1);

          if (triggers && triggers.length > 0) {
            webhookTriggerId = triggers[0].id;
            console.log('[Webhook Auto-Execute] Found webhook trigger from DB:', webhookTriggerId);
          }
        } catch (err) {
          console.error('[Webhook Auto-Execute] Error looking up webhook trigger:', err);
        }
      }

      if (!webhookPath && !webhookTriggerId) {
        console.log('[Webhook Auto-Execute] No webhookPath or webhookTriggerId found');
        return;
      }

      console.log('[Webhook Auto-Execute] Starting listener for:', {
        webhookPath,
        webhookTriggerId,
        workflowId: currentProjectId,
        nodeId: webhookNode.id,
      });

      // Use workflow_id filter for more reliable matching
      // This ensures we catch events even if the node config is out of sync
      const filterValue = `workflow_id=eq.${currentProjectId}`;

      console.log('[Webhook Auto-Execute] Using Realtime filter:', filterValue);

      // Subscribe to realtime changes on workflow_trigger_logs table
      subscriptionChannel = supabase
        .channel(`webhook-logs-${currentProjectId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'workflow_trigger_logs',
            filter: filterValue,
          },
          async (payload) => {
            console.log('[Webhook Auto-Execute] New webhook event received:', payload);

            const newLog = payload.new as any;
            const webhookPayload = newLog.request_body || newLog.request_query || {};

            // Update webhook activity indicator - always show when data is received
            setWebhookActivity(prev => ({
              count: prev.count + 1,
              lastReceived: new Date().toISOString(),
              isPulsing: true
            }));

            // Show live webhook panel with received data
            setLiveWebhookData({
              show: true,
              data: {
                body: newLog.request_body,
                headers: newLog.request_headers,
                query: newLog.request_query,
                method: newLog.request_method,
              },
              timestamp: new Date().toISOString(),
              status: 'received',
            });

            // Clear pulsing animation after 2 seconds
            if (webhookPulseTimeoutRef.current) {
              clearTimeout(webhookPulseTimeoutRef.current);
            }
            webhookPulseTimeoutRef.current = setTimeout(() => {
              setWebhookActivity(prev => ({ ...prev, isPulsing: false }));
            }, 2000);

            // Skip if already processed
            if (lastProcessedWebhookIdRef.current === newLog.id) {
              console.log('[Webhook Auto-Execute] Already processed, skipping');
              return;
            }

            // Mark as processed to avoid duplicates
            lastProcessedWebhookIdRef.current = newLog.id;

            // Skip test events - only auto-execute for production events
            if (newLog.is_test) {
              console.log('[Webhook Auto-Execute] Test event, skipping auto-execute');
              // Still show the data but mark it as test
              setLiveWebhookData(prev => ({ ...prev, status: 'success' }));
              return;
            }

            // Auto-execute is tied to workflow active state (no separate toggle needed)
            // When workflow is active, webhooks will auto-execute

            // Store webhook request context for "Respond to Webhook" node
            currentWebhookRequestRef.current = {
              triggerId: webhookTriggerId || '',
              webhookPath: webhookPath || '',
              logId: newLog.id,
            };

            console.log('[Webhook Auto-Execute] Executing workflow automatically...');
            toast.info('🔔 Webhook primit! Se execută workflow automat...', {
              duration: 3000,
            });

            // Update status to executing
            setLiveWebhookData(prev => ({ ...prev, status: 'executing' }));

            // Execute workflow with webhook data - pass 'webhook' as source!
            if (handleExecuteRef.current) {
              try {
                await handleExecuteRef.current('webhook');
                console.log('[Webhook Auto-Execute] Workflow executed successfully');
                setLiveWebhookData(prev => ({ ...prev, status: 'success' }));
                toast.success('✅ Workflow executat cu succes!', { duration: 3000 });
              } catch (error) {
                console.error('[Webhook Auto-Execute] Workflow execution failed:', error);
                setLiveWebhookData(prev => ({ ...prev, status: 'error' }));
                toast.error('❌ Eroare la execuția workflow-ului');
              }
            } else {
              console.error('[Webhook Auto-Execute] handleExecuteRef is null!');
              setLiveWebhookData(prev => ({ ...prev, status: 'error' }));
            }
          }
        )
        .subscribe((status) => {
          console.log('[Webhook Auto-Execute] Subscription status:', status);
        });

      webhookSubscriptionRef.current = subscriptionChannel;
    };

    // Start the async setup
    setupSubscription();

    // Cleanup on unmount or when workflow changes
    return () => {
      console.log('[Webhook Auto-Execute] Cleaning up subscription');
      if (webhookSubscriptionRef.current) {
        supabase.removeChannel(webhookSubscriptionRef.current);
        webhookSubscriptionRef.current = null;
      }
      if (subscriptionChannel) {
        supabase.removeChannel(subscriptionChannel);
      }
      if (webhookPulseTimeoutRef.current) {
        clearTimeout(webhookPulseTimeoutRef.current);
        webhookPulseTimeoutRef.current = null;
      }
    };
  }, [isWorkflowActive, currentProjectId]); // Using nodesRef instead of nodes to avoid infinite loop

  // Reset webhook activity when project changes
  React.useEffect(() => {
    setWebhookActivity({ count: 0, lastReceived: null, isPulsing: false });
  }, [currentProjectId]);

  // Sync activeWebhookUrl when webhook node config changes (removed activeWebhookUrl from deps to prevent loop)
  const webhookUrlSyncedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const webhookNode = nodes.find(n => 
      n.icon === 'webhook' || 
      n.icon === 'webhook-trigger' || 
      n.label?.toLowerCase().includes('webhook trigger')
    );
    
    if (webhookNode?.config?.webhookPath && isWorkflowActive) {
      const urls = getWebhookUrls(webhookNode.config.webhookPath as string);
      // Only update if URL has actually changed
      if (webhookUrlSyncedRef.current !== urls.productionUrl) {
        webhookUrlSyncedRef.current = urls.productionUrl;
        setActiveWebhookUrl(urls.productionUrl);
        console.log('[N8NCanvas] Synced webhook URL:', urls.productionUrl);
      }
    }
  }, [nodes, isWorkflowActive, getWebhookUrls]);

  // Auto-load the most recent project on mount (only if no URL workflow specified)
  React.useEffect(() => {
    const autoLoadProject = async () => {
      // Skip if already loaded, still loading, or no projects
      if (hasAutoLoaded || projectsLoading || projects.length === 0) return;

      // IMPORTANT: Skip auto-load if there's a workflow ID in URL
      // The URL-based loader will handle it
      if (initialUrlWorkflowIdRef.current) {
        console.log('[Auto-load] Skipping - URL has workflow ID:', initialUrlWorkflowIdRef.current);
        setHasAutoLoaded(true);
        return;
      }

      // Find the most recent active project, or just the most recent
      const activeProject = projects.find(p => p.isActive) || projects[0];

      if (activeProject) {
        console.log('[Auto-load] Loading project:', activeProject.name, 'isActive:', activeProject.isActive);

        // Load the project nodes and connections
        const data = loadProject(activeProject);
        loadWorkflowData(data.nodes, data.connections);
        setIsSaved(true);
        shouldFitViewRef.current = true; // Trigger fit view after load

        // If project is active, restore the webhook URL
        if (activeProject.isActive) {
          // Find webhook path from nodes
          const webhookNode = activeProject.nodes.find((n: any) => {
            const icon = (n.icon || '').toLowerCase();
            const label = (n.label || '').toLowerCase();
            return icon === 'webhook' || icon === 'webhook-trigger' || label.includes('webhook');
          });
          const webhookPath = webhookNode?.config?.webhookPath || webhookNode?.config?.webhook_path;

          if (webhookPath) {
            const urls = getWebhookUrls(webhookPath);
            setActiveWebhookUrl(urls.productionUrl);
          } else {
            // Try to get webhook from database by workflow_id
            try {
              const { data: webhookTrigger } = await supabase
                .from('workflow_webhook_triggers')
                .select('webhook_path')
                .eq('workflow_id', activeProject.id)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();

              if (webhookTrigger?.webhook_path) {
                const urls = getWebhookUrls(webhookTrigger.webhook_path);
                setActiveWebhookUrl(urls.productionUrl);
              }
            } catch (err) {
              console.log('No active webhook found for workflow');
            }
          }
        }

        setHasAutoLoaded(true);
      }
    };

    autoLoadProject();
  }, [projects, projectsLoading, hasAutoLoaded, loadProject, loadWorkflowData, getWebhookUrls]);

  // Keyboard shortcuts - Space for opening config, Delete for deleting
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTypingTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      // When a node config panel is open, ignore global shortcuts except Escape
      if (configNodeId && e.key !== 'Escape') {
        return;
      }

      if (e.code === 'Space') {
        if (isTypingTarget) {
          return;
        }
        e.preventDefault();
        
        // If a node is selected, open its configuration
        if (selectedNodeId) {
          setConfigNodeId(selectedNodeId);
        } else {
          // Otherwise, enable panning mode
          setIsSpacePressed(true);
        }
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isTypingTarget) {
          return;
        }

        if (selectedNodeId) {
          deleteNode(selectedNodeId);
          setIsSaved(false);
        } else if (selectedConnectionId) {
          deleteConnection(selectedConnectionId);
          setIsSaved(false);
        }
      }
      
      // Escape to close config panel
      if (e.key === 'Escape') {
        if (configNodeId) {
          setConfigNodeId(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeId, selectedConnectionId, deleteNode, deleteConnection, configNodeId]);

  // Auto-pan canvas when config panel opens to keep node visible
  // Note: Disabled auto-pan to prevent unwanted canvas shifting
  // The user can manually pan if needed
  // React.useEffect(() => {
  //   if (configNodeId && canvasRef.current) {
  //     // Auto-pan logic removed - was causing canvas to shift left unexpectedly
  //   }
  // }, [configNodeId]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (e.button === 0 && !target.closest('.workflow-node')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const { createWebhookTrigger } = useWebhookTrigger();
  
  const handleCanvasDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const nodeData = e.dataTransfer.getData('application/json');
    if (nodeData) {
      const node = JSON.parse(nodeData);
      const canvas = canvasRef.current?.getBoundingClientRect();
      if (canvas) {
        const x = (e.clientX - canvas.left - pan.x) / zoom;
        const y = (e.clientY - canvas.top - pan.y) / zoom;

        // Check if this is a trigger node
        const isTriggerNode =
          node.icon === 'webhook' ||
          node.icon === 'webhook-trigger' ||
          node.icon === 'manual-trigger' ||
          node.icon === 'chat-trigger' ||
          node.icon === 'schedule-trigger' ||
          node.type === 'trigger' ||
          node.label?.toLowerCase().includes('trigger');

        // Only allow ONE trigger node per workflow
        if (isTriggerNode) {
          const existingTrigger = nodes.find(n =>
            n.icon === 'webhook' ||
            n.icon === 'webhook-trigger' ||
            n.icon === 'manual-trigger' ||
            n.icon === 'chat-trigger' ||
            n.icon === 'schedule-trigger' ||
            n.type === 'trigger' ||
            n.label?.toLowerCase().includes('trigger')
          );

          if (existingTrigger) {
            toast.error('Un workflow poate avea doar un singur trigger! Șterge trigger-ul existent pentru a adăuga altul.');
            return;
          }
        }

        const newNodeId = addNode(node, x, y);
        setIsSaved(false);

        // Auto-create webhook when adding webhook-trigger node
        const isWebhookNode =
          node.icon === 'webhook' ||
          node.icon === 'webhook-trigger' ||
          node.label?.toLowerCase().includes('webhook trigger');

        if (isWebhookNode && newNodeId) {
          console.log('[N8NCanvas] Auto-creating webhook for new node:', newNodeId);
          const trigger = await createWebhookTrigger(currentProjectId, {
            http_method: 'POST',
            auth_type: 'none',
            respond_mode: 'immediately',
          });
          
          if (trigger) {
            updateNode(newNodeId, {
              config: {
                webhookTriggerId: trigger.id,
                webhookPath: trigger.webhook_path,
                httpMethod: 'POST',
                authType: 'none',
                respondMode: 'immediately',
              }
            });
            toast.success('Webhook creat automat!');
          }
        }
      }
    }
  }, [pan, zoom, addNode, createWebhookTrigger, currentProjectId, updateNode]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    if (draggingNodeId) {
      const canvas = canvasRef.current?.getBoundingClientRect();
      if (canvas) {
        const x = (e.clientX - canvas.left - pan.x) / zoom;
        const y = (e.clientY - canvas.top - pan.y) / zoom;
        updateNode(draggingNodeId, { x, y });
        setIsSaved(false);
      }
    }

    if (connectingFrom) {
      const canvas = canvasRef.current?.getBoundingClientRect();
      if (canvas) {
        setConnectingMousePos({
          x: (e.clientX - canvas.left - pan.x) / zoom,
          y: (e.clientY - canvas.top - pan.y) / zoom,
        });
      }
    }
  }, [isPanning, panStart, draggingNodeId, connectingFrom, pan, zoom, updateNode]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    // If we were connecting and released on empty canvas (not on a node), show node search
    if (connectingFrom) {
      const target = e.target as HTMLElement;
      const isOnNode = target.closest('.workflow-node');
      
      if (!isOnNode) {
        // Released on empty canvas - show node search
        const canvas = canvasRef.current?.getBoundingClientRect();
        if (canvas) {
          const dropX = (e.clientX - canvas.left - pan.x) / zoom;
          const dropY = (e.clientY - canvas.top - pan.y) / zoom;
          
          // Open node search at drop position
          setAddNodeFromId(connectingFrom);
          setAddNodePosition({ x: dropX, y: dropY });
          setShowNodeSearch(true);
        }
        // Only stop connecting if released on empty canvas
        stopConnecting();
      }
      // If released on a node, the node's onMouseUp already handled the connection
    }
    
    setIsPanning(false);
    stopDragging();
  }, [stopDragging, stopConnecting, connectingFrom, pan, zoom]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    startDragging(nodeId);
    selectNode(nodeId);
  }, [startDragging, selectNode]);

  const handleSave = useCallback(() => {
    if (!currentProjectId) {
      // New project - show save dialog
      setSaveProjectName(currentProjectName || 'Proiect Nou');
      setShowSaveDialog(true);
    } else {
      // Existing project - save directly
      saveProject(currentProjectName, nodes, connections).then(() => {
        setIsSaved(true);
      });
    }
  }, [nodes, connections, currentProjectId, currentProjectName, saveProject]);

  const handleSaveConfirm = useCallback(async () => {
    if (!saveProjectName.trim()) {
      toast.error('Introdu un nume pentru proiect');
      return;
    }
    await saveProject(saveProjectName.trim(), nodes, connections);
    setShowSaveDialog(false);
    setIsSaved(true);
  }, [saveProjectName, nodes, connections, saveProject]);

  const handleLoadProject = useCallback(async (project: any) => {
    const data = loadProject(project);
    loadWorkflowData(data.nodes, data.connections);
    setIsSaved(true);
    shouldFitViewRef.current = true; // Trigger fit view after load
    
    // Restore webhook URL if project is active
    if (project.isActive || project.status === 'active') {
      // Find webhook path from nodes
      const webhookNode = project.nodes?.find((n: any) => {
        const icon = (n.icon || '').toLowerCase();
        const label = (n.label || '').toLowerCase();
        return icon === 'webhook' || icon === 'webhook-trigger' || label.includes('webhook');
      });
      const webhookPath = webhookNode?.config?.webhookPath || webhookNode?.config?.webhook_path;
      
      if (webhookPath) {
        const urls = getWebhookUrls(webhookPath);
        setActiveWebhookUrl(urls.productionUrl);
      } else {
        // Try to get webhook from database by workflow_id
        try {
          const { data: webhookTrigger } = await supabase
            .from('workflow_webhook_triggers')
            .select('webhook_path')
            .eq('workflow_id', project.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          
          if (webhookTrigger?.webhook_path) {
            const urls = getWebhookUrls(webhookTrigger.webhook_path);
            setActiveWebhookUrl(urls.productionUrl);
          }
        } catch (err) {
          console.log('No webhook found for project');
        }
      }
    } else {
      setActiveWebhookUrl(null);
    }
  }, [loadProject, loadWorkflowData, getWebhookUrls]);

  const handleNewProject = useCallback(() => {
    const data = createNewProject();
    loadWorkflowData(data.nodes, data.connections);
    clearCanvas();
    setIsSaved(true);
    setActiveWebhookUrl(null);
  }, [createNewProject, loadWorkflowData, clearCanvas]);

  // Handle importing a workflow from JSON
  const handleImportProject = useCallback(async (projectData: { name: string; nodes: any[]; connections: any[] }) => {
    // Load the imported workflow data
    loadWorkflowData(projectData.nodes, projectData.connections);
    shouldFitViewRef.current = true; // Trigger fit view after import
    
    // Save the project
    await saveProject(projectData.name, projectData.nodes, projectData.connections);
    
    setIsSaved(true);
    setActiveWebhookUrl(null);
    toast.success(`Proiectul "${projectData.name}" a fost importat și salvat!`);
  }, [loadWorkflowData, saveProject]);

  const handleStop = useCallback(() => {
    stopRequestedRef.current = true;
    setContinuousMode(false);
    toast.warning('Stopping workflow...');
  }, []);

  // NOTE: Webhook responses are handled by the Edge Function, not the frontend!
  // The Edge Function executes the workflow synchronously and returns the response immediately.
  // The frontend only needs to display the logs and update the UI.

  const handleExecute = useCallback(async (source: 'manual' | 'webhook' | 'scheduler' = 'manual'): Promise<{ hasData: boolean; recordCount: number }> => {
    // Clear visual indicator - log execution source
    const sourceLabels = {
      manual: '🖱️ MANUAL TEST',
      webhook: '🔔 WEBHOOK AUTO-EXECUTE',
      scheduler: '⏰ SCHEDULER'
    };
    const sourceLabel = sourceLabels[source];

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log(`║  ${sourceLabel.padEnd(56)} ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Workflow: ${(currentProjectName || 'Untitled').slice(0, 45).padEnd(47)} ║`);
    console.log(`║  Time: ${new Date().toLocaleString().padEnd(51)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    stopRequestedRef.current = false; // Reset stop flag
    zohoDataFoundRef.current = false; // Reset Zoho data flag for loop mode
    setIsRunning(true);
    setLogsOpen(true);
    setExecutionLogs([]); // Clear previous logs
    resetNodeStatuses(); // Reset all node statuses
    setRunningTime(0);
    executionStartTimeRef.current = Date.now();

    // Reset execution tracking
    executedNodesRef.current = [];
    currentExecutionIdRef.current = null;

    // Create execution record in database
    if (currentProjectId && user) {
      try {
        const { data: execRecord, error } = await supabase
          .from('workflow_executions')
          .insert({
            workflow_id: currentProjectId,
            user_id: user.id,
            status: 'running',
            source: source,
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (!error && execRecord) {
          currentExecutionIdRef.current = execRecord.id;
          console.log('[Execution History] Created execution record:', execRecord.id);
        }
      } catch (err) {
        console.error('[Execution History] Failed to create execution record:', err);
      }
    }

    // Start running timer
    if (runningTimerRef.current) clearInterval(runningTimerRef.current);
    runningTimerRef.current = setInterval(() => {
      setRunningTime(Math.floor((Date.now() - executionStartTimeRef.current) / 1000));
    }, 1000);

    let logCounter = 0;
    const nodeStartTimes = new Map<string, number>();

    const addLog = (
      message: string,
      nodeName: string = 'System',
      status: 'success' | 'error' | 'running' = 'running',
      outputData?: any,
      errorMessage?: string
    ) => {
      // Track node start time
      if (status === 'running' && !nodeStartTimes.has(nodeName)) {
        nodeStartTimes.set(nodeName, Date.now());
      }

      // Update node execution status and item count
      if (nodeName !== 'System') {
        const node = nodes.find(n => n.label === nodeName);
        if (node) {
          setNodeExecutionStatus(prev => ({
            ...prev,
            [node.id]: status === 'running' ? 'running' : status === 'success' ? 'success' : status === 'error' ? 'error' : 'idle'
          }));

          // Update item count when node succeeds with output data
          if (status === 'success' && outputData) {
            const count = Array.isArray(outputData) ? outputData.length : 1;
            setNodeItemCount(prev => ({ ...prev, [node.id]: count }));

            // Store output data for IO panels
            setNodeExecutionData(prev => ({
              ...prev,
              [node.id]: {
                ...prev[node.id],
                output: outputData,
              }
            }));
          }

          // Track node execution for history (on completion)
          if (status === 'success' || status === 'error') {
            const startTime = nodeStartTimes.get(nodeName);
            const durationMs = startTime ? Date.now() - startTime : undefined;

            // Check if node already tracked, if so update it
            const existingIdx = executedNodesRef.current.findIndex(n => n.node_id === node.id);
            const nodeRecord = {
              node_id: node.id,
              node_label: nodeName,
              status: status as 'success' | 'error',
              started_at: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
              completed_at: new Date().toISOString(),
              duration_ms: durationMs,
              output_data: outputData ? (Array.isArray(outputData) ? outputData.slice(0, 5) : outputData) : undefined, // Limit stored data
              error_message: errorMessage,
            };

            if (existingIdx >= 0) {
              executedNodesRef.current[existingIdx] = nodeRecord;
            } else {
              executedNodesRef.current.push(nodeRecord);
            }
          }
        }
      }

      const executionTime = nodeStartTimes.has(nodeName)
        ? Date.now() - nodeStartTimes.get(nodeName)!
        : undefined;

      const itemCount = outputData
        ? (Array.isArray(outputData) ? outputData.length : 1)
        : undefined;

      const logEntry = {
        id: `log-${Date.now()}-${logCounter++}`,
        timestamp: new Date().toLocaleTimeString(),
        status,
        nodeName,
        message,
        outputData,
        executionTime,
        itemCount,
      };
      setExecutionLogs(prev => [...prev, logEntry]);
      console.log(`[${nodeName}] ${message}`);
    };

    addLog(`🚀 Workflow starting... [${sourceLabel}]`, 'System', 'running');
    toast.info(`Workflow starting... (${source === 'webhook' ? 'Webhook trigger' : source === 'scheduler' ? 'Scheduled' : 'Manual'})`);
    
    try {
      // Find trigger node - check type 'trigger' OR webhook-related icons/labels OR Call History in trigger mode
      const triggerNode = nodes.find(n => {
        if (n.type === 'trigger') return true;
        const icon = n.icon?.toLowerCase() || '';
        const label = n.label?.toLowerCase() || '';
        // Also recognize webhook nodes as triggers
        if (icon === 'webhook' || icon === 'webhook-trigger' || 
            label.includes('webhook') || label.includes('receive http')) {
          return true;
        }
        // Recognize Call History in trigger mode
        if ((icon === 'callhistory' || icon === 'call-history' || 
             label.includes('call history') || label.includes('istoric apeluri')) &&
            n.config?.mode === 'trigger') {
          return true;
        }
        return false;
      });
      
      if (!triggerNode) {
        addLog('❌ No trigger node found!', 'System', 'error');
        toast.error('No trigger node found!');
        // Cleanup timer before returning
        if (runningTimerRef.current) {
          clearInterval(runningTimerRef.current);
          runningTimerRef.current = null;
        }
        setIsRunning(false);
        return { hasData: false, recordCount: 0 };
      }

      addLog(`✓ Found trigger: ${triggerNode.label}`, triggerNode.label, 'success');

      // If trigger is a webhook, get the latest webhook data
      let initialData: any = {};
      const triggerIcon = triggerNode.icon?.toLowerCase() || '';
      const triggerLabel = triggerNode.label?.toLowerCase() || '';
      
      if (triggerIcon === 'webhook' || triggerIcon === 'webhook-trigger' || 
          triggerLabel.includes('webhook')) {
        
        // First check if there's pinned data - use that instead of fetching
        if (triggerNode.config?.pinnedData) {
          initialData = triggerNode.config.pinnedData;
          addLog(`📌 Using pinned webhook data`, triggerNode.label, 'success');
          console.log('Using pinned data:', initialData);
          
          // Store pinned data in nodeExecutionData so next nodes can access it
          setNodeExecutionData(prev => ({
            ...prev,
            [triggerNode.id]: {
              ...prev[triggerNode.id],
              output: initialData,
            }
          }));
        } else {
          addLog(`🔌 Fetching latest webhook data...`, triggerNode.label, 'running');
          
          // Get webhook trigger ID or path from node config
          const webhookTriggerId = triggerNode.config?.webhookTriggerId;
          const webhookPath = triggerNode.config?.webhookPath || triggerNode.config?.path;
          
          if (webhookTriggerId || webhookPath) {
            try {
              // Build query to get latest webhook event (test OR real)
              let query = supabase
                .from('workflow_trigger_logs')
                .select('*')
                .order('triggered_at', { ascending: false })
                .limit(1);
              
              // Filter by webhook_trigger_id if available
              if (webhookTriggerId) {
                query = query.eq('webhook_trigger_id', webhookTriggerId);
              }
              
              // Also filter by user_id if available
              if (user?.id) {
                query = query.eq('user_id', user.id);
              }
              
              const { data: logs, error } = await query;
              
              if (!error && logs && logs.length > 0) {
                const latestLog = logs[0];
                initialData = {
                  body: latestLog.request_body || {},
                  headers: latestLog.request_headers || {},
                  query: latestLog.request_query || {},
                  method: latestLog.request_method || 'POST',
                  timestamp: latestLog.triggered_at,
                };
                addLog(`✓ Got webhook data: ${Object.keys(initialData.body).length} fields in body`, triggerNode.label, 'success');
                console.log('Webhook initial data:', initialData);
                
                // Store webhook data in nodeExecutionData so next nodes can access it
                setNodeExecutionData(prev => ({
                  ...prev,
                  [triggerNode.id]: {
                    ...prev[triggerNode.id],
                    output: initialData,
                  }
                }));
              } else {
                addLog(`⚠️ No webhook data found yet. Send a test request first.`, triggerNode.label, 'running');
                toast.info('Trimite mai întâi un request test la webhook');
              }
            } catch (err) {
              addLog(`⚠️ Could not fetch webhook data: ${err}`, triggerNode.label, 'error');
            }
          } else {
            addLog(`⚠️ No webhook configured. Click on node to set up webhook.`, triggerNode.label, 'running');
            toast.warning('Configurează webhook-ul mai întâi');
          }
        }
      }

      // Handle Call History Trigger Mode
      if ((triggerIcon === 'callhistory' || triggerIcon === 'call-history' || 
           triggerLabel.includes('call history') || triggerLabel.includes('istoric apeluri')) &&
          triggerNode.config?.mode === 'trigger') {
        
        addLog(`📞 Call History Trigger mode - workflow se activează automat la conversații noi`, triggerNode.label, 'running');
        
        // Fetch latest call for testing
        if (user?.id) {
          try {
            const { data: recentCalls, error } = await supabase
              .from('call_history')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (!error && recentCalls && recentCalls.length > 0) {
              const call = recentCalls[0];
              
              // Extract score, tags, conclusion from analysis_conclusion
              let score = 0;
              let tags: string[] = [];
              let conclusion = '';
              
              if (call.analysis_conclusion) {
                const scoreMatch = call.analysis_conclusion.match(/Scor:\s*(\d+)/i);
                if (scoreMatch) score = parseInt(scoreMatch[1], 10);
                
                const tagsMatch = call.analysis_conclusion.match(/Tag-uri:\s*(.+?)(?:\n|$)/i);
                if (tagsMatch) tags = tagsMatch[1].split(',').map((t: string) => t.trim());
                
                const conclusionMatch = call.analysis_conclusion.match(/Concluzie:\s*(.+?)(?:\n|$)/i);
                if (conclusionMatch) conclusion = conclusionMatch[1].trim();
              }
              
              // Format duration
              const durationSeconds = call.duration_seconds || 0;
              const minutes = Math.floor(durationSeconds / 60);
              const seconds = durationSeconds % 60;
              const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              
              // Parse dialog_json for transcription
              let transcription = '';
              if (call.dialog_json) {
                try {
                  const dialog = typeof call.dialog_json === 'string' ? JSON.parse(call.dialog_json) : call.dialog_json;
                  if (Array.isArray(dialog)) {
                    transcription = dialog.map((d: any) => `${d.role || 'Unknown'}: ${d.content || d.message || ''}`).join('\n');
                  }
                } catch {
                  transcription = typeof call.dialog_json === 'string' ? call.dialog_json : '';
                }
              }
              
              // Process call data with proper field names for Telegram node
              initialData = {
                callId: call.id,
                conversationId: call.conversation_id,
                callerNumber: call.caller_number || call.phone_number,
                phoneNumber: call.phone_number,
                contactName: call.contact_name,
                duration: durationSeconds,
                durationFormatted,
                score,
                tags,
                conclusion,
                status: call.call_status,
                timestamp: call.call_date,
                transcription,
                summary: call.summary || conclusion,
                agentId: call.agent_id,
                language: call.language,
                costUsd: call.cost_usd,
                analysisConclusion: call.analysis_conclusion,
                agentEvaluation: call.analysis_agent_evaluation
              };
              
              addLog(`✓ Test cu ultimul apel: ${initialData.contactName || initialData.phoneNumber || 'Unknown'} | Scor: ${score}`, triggerNode.label, 'success');
            } else {
              addLog(`⚠️ Nu există apeluri în istoric pentru test`, triggerNode.label, 'running');
              toast.info('Faceți un apel pentru a testa workflow-ul');
            }
          } catch (err) {
            addLog(`⚠️ Nu am putut prelua datele: ${err}`, triggerNode.label, 'error');
          }
        }
      }

      // Execute workflow by traversing nodes in order
      const executeNode = async (nodeId: string, inputData: any): Promise<any> => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return inputData;

        addLog(`⚡ Executing node...`, node.label, 'running');

        let outputData = inputData;

        // Handle different node types
        const icon = node.icon?.toLowerCase() || '';
        const label = node.label?.toLowerCase() || '';

        // Call History Node - fetch REAL data from Supabase
        if (icon === 'call-history' || label.includes('call history')) {
          addLog(`📞 Fetching calls from database...`, node.label, 'running');
          const config = node.config || {};
          
          if (!user) {
            addLog('❌ User not authenticated!', node.label, 'error');
            toast.error('You need to be logged in to fetch call history.');
            return outputData;
          }

          try {
            // Build the Supabase query based on filters
            let query = supabase
              .from('call_history')
              .select('*')
              .eq('user_id', user.id)
              .order('call_date', { ascending: false });

            const conditions = config.conditions || {};

            // Apply duration filter from CallHistoryConfig
            if (conditions.durationEnabled) {
              const durationSeconds = conditions.durationValue || 0;
              const op = conditions.durationOperator || 'greater';
              
              if (op === 'greater') {
                query = query.gte('duration_seconds', durationSeconds);
              } else if (op === 'less') {
                query = query.lte('duration_seconds', durationSeconds);
              } else if (op === 'equal') {
                query = query.eq('duration_seconds', durationSeconds);
              } else if (op === 'between' && conditions.durationValueMax) {
                query = query.gte('duration_seconds', durationSeconds).lte('duration_seconds', conditions.durationValueMax);
              }
              addLog(`🔍 Filtering by duration ${op} ${durationSeconds}s...`, node.label, 'running');
            }

            // Apply status filter from CallHistoryConfig
            if (conditions.statusFilter && conditions.statusFilter !== 'any') {
              // Map config status to database status
              const statusMap: { [key: string]: string } = {
                'success': 'done',
                'failed': 'failed',
                'test': 'test',
                'test_failed': 'test_failed'
              };
              const dbStatus = statusMap[conditions.statusFilter] || conditions.statusFilter;
              query = query.eq('call_status', dbStatus);
              addLog(`🔍 Filtering by status = ${conditions.statusFilter}...`, node.label, 'running');
            }

            // Apply agent filter
            if (conditions.agentFilter) {
              query = query.eq('agent_id', conditions.agentFilter);
              addLog(`🔍 Filtering by agent = ${conditions.agentFilter}...`, node.label, 'running');
            }

            // Limit results
            const limit = config.limit || 10;
            query = query.limit(limit);

            const { data: calls, error } = await query;

            if (error) {
              addLog(`❌ Database error: ${error.message}`, node.label, 'error');
              toast.error(`Failed to fetch calls: ${error.message}`);
              return outputData;
            }

            if (!calls || calls.length === 0) {
              addLog(`📭 No calls found in database`, node.label, 'error');
              toast.info('No calls found in database.');
              return outputData;
            }

            addLog(`📊 Found ${calls.length} calls in database, processing...`, node.label, 'running');

            // Process calls and extract score from analysis_conclusion
            const processedCalls = calls.map((call: any) => {
              // Extract score from analysis_conclusion (format: "Concluzie: ...\nTag-uri: ...\nScor: XX")
              let score = 0;
              let tags: string[] = [];
              let conclusion = '';
              
              if (call.analysis_conclusion) {
                const scoreMatch = call.analysis_conclusion.match(/Scor:\s*(\d+)/i);
                if (scoreMatch) score = parseInt(scoreMatch[1], 10);
                
                const tagsMatch = call.analysis_conclusion.match(/Tag-uri:\s*(.+?)(?:\n|$)/i);
                if (tagsMatch) tags = tagsMatch[1].split(',').map((t: string) => t.trim());
                
                const conclusionMatch = call.analysis_conclusion.match(/Concluzie:\s*(.+?)(?:\n|$)/i);
                if (conclusionMatch) conclusion = conclusionMatch[1].trim();
              }

              // Format duration
              const durationSeconds = call.duration_seconds || 0;
              const minutes = Math.floor(durationSeconds / 60);
              const seconds = durationSeconds % 60;
              const durationFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

              // Parse dialog_json for transcription
              let transcription = '';
              if (call.dialog_json) {
                try {
                  const dialog = typeof call.dialog_json === 'string' ? JSON.parse(call.dialog_json) : call.dialog_json;
                  if (Array.isArray(dialog)) {
                    transcription = dialog.map((d: any) => `${d.role || 'Unknown'}: ${d.content || d.message || ''}`).join('\n');
                  }
                } catch {
                  transcription = call.dialog_json;
                }
              }

              return {
                callId: call.id,
                conversationId: call.conversation_id,
                callerNumber: call.caller_number || call.phone_number,
                phoneNumber: call.phone_number,
                contactName: call.contact_name,
                duration: durationSeconds,
                durationFormatted,
                score,
                tags,
                conclusion,
                status: call.call_status,
                timestamp: call.call_date,
                transcription,
                summary: call.summary || conclusion,
                agentId: call.agent_id,
                language: call.language,
                costUsd: call.cost_usd,
                analysisConclusion: call.analysis_conclusion,
                agentEvaluation: call.analysis_agent_evaluation
              };
            });

            // Apply score filter manually (since it's stored in text field)
            let filteredCalls = processedCalls;
            
            // Debug: log the config to see what's happening
            console.log('Call History config:', config);
            console.log('Conditions:', conditions);
            console.log('scoreEnabled:', conditions.scoreEnabled, 'repliesEnabled:', conditions.repliesEnabled);
            
            if (conditions.scoreEnabled === true) {
              const scoreValue = conditions.scoreValue || 0;
              const op = conditions.scoreOperator || 'greater';
              const scoreMax = conditions.scoreValueMax || 100;
              
              addLog(`🔍 Filtering by score ${op} ${scoreValue}...`, node.label, 'running');
              
              filteredCalls = processedCalls.filter((call: any) => {
                if (op === 'greater') return call.score >= scoreValue;
                if (op === 'less') return call.score <= scoreValue;
                if (op === 'equal') return call.score === scoreValue;
                if (op === 'between') return call.score >= scoreValue && call.score <= scoreMax;
                return true;
              });
            }

            // Apply replies filter (count dialog entries)
            if (conditions.repliesEnabled === true) {
              const repliesValue = conditions.repliesValue || 0;
              const op = conditions.repliesOperator || 'greater';
              
              filteredCalls = filteredCalls.filter((call: any) => {
                // Count lines in transcription as proxy for replies
                const replyCount = call.transcription ? call.transcription.split('\n').filter((l: string) => l.trim()).length : 0;
                if (op === 'greater') return replyCount >= repliesValue;
                if (op === 'less') return replyCount <= repliesValue;
                if (op === 'equal') return replyCount === repliesValue;
                return true;
              });
              addLog(`🔍 Filtering by replies ${op} ${repliesValue}...`, node.label, 'running');
            }

            if (filteredCalls.length === 0) {
              addLog(`📭 No calls found after filtering`, node.label, 'error');
              return outputData;
            }

            // Use the first call or all calls based on config
            const outputCalls = config.returnAll ? filteredCalls : filteredCalls[0];
            outputData = outputCalls;

            addLog(`✅ Found ${Array.isArray(outputCalls) ? outputCalls.length : 1} matching call(s)`, node.label, 'success', outputCalls);
            
            // Log details of first call
            const firstCall = Array.isArray(outputCalls) ? outputCalls[0] : outputCalls;
            if (firstCall) {
              addLog(`📱 ${firstCall.callerNumber || firstCall.phoneNumber} | ⭐ ${firstCall.score}/100 | ⏱️ ${firstCall.durationFormatted}`, node.label, 'success');
            }

          } catch (err: any) {
            addLog(`❌ Error: ${err.message}`, node.label, 'error');
            console.error('Call History fetch error:', err);
            return outputData;
          }
        }

        // Odoo Nodes
        if (icon.includes('odoo') || label.toLowerCase().includes('odoo')) {
          addLog('🟣 Processing Odoo node...', node.label, 'running');
          const config = node.config || {};

          if (!user) {
            addLog('❌ User not authenticated!', node.label, 'error');
            return outputData;
          }

          try {
            let operation: string = config.operation || 'search_read';
            let model: string = config.model || 'crm.lead';

            if (icon.includes('search-read')) operation = 'search_read';
            else if (icon.includes('get-record')) operation = 'read';
            else if (icon.includes('create-record')) operation = 'create';
            else if (icon.includes('update-record')) operation = 'update';
            else if (icon.includes('delete-record')) operation = 'delete';
            else if (icon.includes('get-fields')) operation = 'fields_get';
            else if (icon.includes('execute-method')) operation = 'execute_kw';

            addLog(`📊 Operation: ${operation} | Model: ${model}`, node.label, 'running');

            const endpointMap: Record<string, string> = {
              'search_read': 'odoo-search-read',
              'read': 'odoo-get',
              'create': 'odoo-create',
              'update': 'odoo-update',
              'delete': 'odoo-delete',
              'fields_get': 'odoo-fields-get',
              'execute_kw': 'odoo-execute-kw',
            };

            const endpoint = endpointMap[operation] || 'odoo-search-read';
            const requestBody: any = {
              user_id: user.id,
              model,
              base_url: config.baseUrl,
              db: config.db,
              username: config.username,
              api_key: config.apiKey,
            };

            // Helper: parse filter value
            const parseFilterValue = (val: string, op: string) => {
              if (['in', 'not in'].includes(op) && val.includes(',')) {
                return val.split(',').map(v => v.trim());
              }
              if (val === 'true' || val === 'false') return val === 'true';
              const num = Number(val);
              if (!Number.isNaN(num) && val.trim() !== '') return num;
              return val;
            };

            // Build domain filters
            if (operation === 'search_read' && config.filters) {
              const domainParts = (config.filters || [])
                .filter((f: any) => f.field && f.operator)
                .map((f: any) => [f.field, f.operator || '=', parseFilterValue(f.value, f.operator || '=')]);

              let domain: any[] = [];
              if ((config.combineFilters || 'AND') === 'OR' && domainParts.length > 1) {
                // OR in Odoo domain is represented with '|' placed before operands
                domain = domainParts.reduce((acc: any[], part, idx) => {
                  if (idx > 0) acc.push('|');
                  acc.push(part);
                  return acc;
                }, []);
              } else {
                domain = domainParts;
              }

              requestBody.domain = domain;
              requestBody.limit = config.returnAll ? undefined : (config.limit || 50);
              requestBody.offset = config.offset || 0;
              requestBody.return_all = config.returnAll;
              addLog(`🔍 Domain: ${JSON.stringify(domain)}`, node.label, 'running');
            }

            // Record ID handling
            if (['read', 'update', 'delete'].includes(operation)) {
              let recordId: any = config.recordId;
              if (config.recordIdSource === 'workflow' && inputData) {
                const workflowField = config.recordIdWorkflowField || 'id';
                const sourceData = Array.isArray(inputData) ? inputData[0] : inputData;
                recordId = sourceData?.[workflowField]
                  || sourceData?.contact?.[workflowField]
                  || sourceData?.results?.[0]?.[workflowField];
                if (!recordId && workflowField.includes('.')) {
                  const parts = workflowField.split('.');
                  let value: any = sourceData;
                  for (const part of parts) value = value?.[part];
                  recordId = value;
                }
              }
              if (!recordId) {
                addLog('❌ Record ID lipseste', node.label, 'error');
                return outputData;
              }
              requestBody.record_id = recordId;
              addLog(`🔗 Record ID: ${recordId}`, node.label, 'running');
            }

            // Payload for create/update
            if (['create', 'update', 'execute_kw'].includes(operation)) {
              const payload: Record<string, any> = {};
              const sourceData = Array.isArray(inputData) ? inputData[0] : inputData;

              (config.fields || []).forEach((f: any) => {
                if (!f.field) return;
                if (f.source === 'workflow' && f.workflowField) {
                  let value: any = sourceData?.[f.workflowField];
                  if (f.workflowField.includes('.')) {
                    const parts = f.workflowField.split('.');
                    value = parts.reduce((acc: any, key: string) => acc?.[key], sourceData);
                  }
                  if (value === undefined) value = sourceData?.contact?.[f.workflowField];
                  if (Array.isArray(value)) value = value.join(', ');
                  if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
                  payload[f.field] = value;
                  addLog(`📝 ${f.field} <= workflow (${f.workflowField})`, node.label, 'running');
                } else {
                  payload[f.field] = f.value;
                }
              });

              if (Object.keys(payload).length > 0) {
                requestBody.data = payload;
                addLog(`📋 Payload cu ${Object.keys(payload).length} camp(uri)`, node.label, 'running');
              }

              if (operation === 'execute_kw') {
                requestBody.method_name = config.methodName;
                try {
                  requestBody.method_args = config.methodArgs ? JSON.parse(config.methodArgs) : [];
                } catch {
                  requestBody.method_args = [];
                }
                try {
                  requestBody.method_kwargs = config.methodKwargs ? JSON.parse(config.methodKwargs) : {};
                } catch {
                  requestBody.method_kwargs = {};
                }
              }
            }

            const response = await fetch(
              `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/${endpoint}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify(requestBody),
              }
            );

            const result = await response.json();
            if (!response.ok) {
              addLog(`❌ Odoo API error: ${result.error || 'Unknown error'}`, node.label, 'error');
              toast.error(`Odoo: ${result.error || 'Request failed'}`);
              return outputData;
            }

            const records = result.data ?? result.records ?? result.result ?? result;
            outputData = Array.isArray(records) ? records : [records];
            const count = Array.isArray(outputData) ? outputData.length : 1;
            addLog(`✅ Odoo raspuns: ${count} item(e)`, node.label, 'success', outputData);

            // quick details from first record
            const first = Array.isArray(outputData) ? outputData[0] : outputData;
            if (first) {
              const name = first.name || first.display_name || first.id;
              addLog(`📋 Primul: ${name}`, node.label, 'success');
            }
          } catch (err: any) {
            addLog(`❌ Odoo error: ${err.message}`, node.label, 'error');
            console.error('Odoo node error:', err);
            return outputData;
          }
        }

        // Zoho CRM Nodes
        if (icon.startsWith('zoho-') || label.includes('zoho')) {
          addLog(`🔷 Processing Zoho CRM node...`, node.label, 'running');
          const config = node.config || {};
          
          if (!user) {
            addLog('❌ User not authenticated!', node.label, 'error');
            return outputData;
          }

          try {
            // Determine operation and module from icon (format: zoho-{operation}-{module})
            const iconParts = icon.split('-');
            let operation = '';
            let module = config.resource || 'Leads';
            
            // Parse icon to determine operation
            if (icon.includes('get-many')) operation = 'get_many';
            else if (icon.includes('get-') && !icon.includes('fields')) operation = 'get';
            else if (icon.includes('create-') && !icon.includes('upsert')) operation = 'create';
            else if (icon.includes('update-')) operation = 'update';
            else if (icon.includes('delete-')) operation = 'delete';
            else if (icon.includes('upsert-')) operation = 'upsert';
            
            // Use config values if available
            operation = config.operation || operation || 'get_many';
            module = config.resource || module;
            
            addLog(`📊 Operation: ${operation}, Module: ${module}`, node.label, 'running');

            // Map operation to edge function
            const endpointMap: { [key: string]: string } = {
              'get': 'zoho-crm-get',
              'get_many': 'zoho-crm-get-many',
              'create': 'zoho-crm-create',
              'update': 'zoho-crm-update',
              'delete': 'zoho-crm-delete',
              'upsert': 'zoho-crm-upsert',
              'create_or_update': 'zoho-crm-upsert',
            };
            
            const endpoint = endpointMap[operation] || 'zoho-crm-get-many';
            addLog(`📡 Calling ${endpoint}...`, node.label, 'running');

            // Build request body based on operation
            const requestBody: any = {
              user_id: user.id,
              module: module,
            };

            // Add filters for get_many
            if (operation === 'get_many' && config.filters) {
              requestBody.filters = config.filters;
              requestBody.limit = config.limit || 50;
            }

            // Add record_id for get, update, delete
            if (['get', 'update', 'delete'].includes(operation)) {
              // Check if recordId is an expression like {{ $json.id }}
              const recordIdIsExpression = config.recordId && (config.recordId.includes('$json') || config.recordId.includes('{{'));
              
              if ((config.recordIdSource === 'workflow' || recordIdIsExpression) && inputData) {
                // Handle array input (take first item)
                const dataToSearch = Array.isArray(inputData) ? inputData[0] : inputData;
                let recordId = null;
                
                // Parse expression like {{ $json.id }} or {{ $json.zoho_id }}
                let workflowField = config.recordIdWorkflowField || 'id';
                if (config.recordId && config.recordId.includes('$json')) {
                  const match = config.recordId.match(/\$json\.([a-zA-Z0-9_.]+)/);
                  if (match) {
                    workflowField = match[1];
                  }
                }
                
                // Support nested paths
                const pathParts = workflowField.split('.');
                let value: any = dataToSearch;
                
                for (const part of pathParts) {
                  if (value && typeof value === 'object') {
                    value = value[part];
                  } else {
                    value = undefined;
                    break;
                  }
                }
                recordId = value;
                
                // Try common nested paths if not found
                if (!recordId) recordId = dataToSearch?.contact?.[pathParts[pathParts.length - 1]];
                if (!recordId) recordId = dataToSearch?.results?.[0]?.[pathParts[pathParts.length - 1]];
                if (!recordId) recordId = dataToSearch?.results?.[0]?.contact?.[pathParts[pathParts.length - 1]];
                
                // For Groq analysis, the ID should come from rawData
                if (!recordId && dataToSearch?.rawData) {
                  value = dataToSearch.rawData;
                  for (const part of pathParts) {
                    if (value && typeof value === 'object') {
                      value = value[part];
                    } else {
                      value = undefined;
                      break;
                    }
                  }
                  recordId = value;
                }
                
                if (recordId) {
                  requestBody.record_id = recordId;
                  addLog(`🔗 Record ID from workflow (${workflowField}): ${recordId}`, node.label, 'running');
                } else {
                  addLog(`⚠️ Could not find ${workflowField} in workflow data`, node.label, 'error');
                  console.log('Available inputData keys:', Object.keys(dataToSearch || {}));
                }
              } else if (config.recordId && !recordIdIsExpression) {
                requestBody.record_id = config.recordId;
              }
            }

            // Add data for create, update, upsert - with workflow field support
            if (['create', 'update', 'upsert', 'create_or_update'].includes(operation)) {
              const fieldData: Record<string, any> = {};
              
              // Handle array input (take first item for field values)
              const sourceData = Array.isArray(inputData) ? inputData[0] : inputData;
              
              console.log('[Zoho Update] sourceData available:', Object.keys(sourceData || {}));
              console.log('[Zoho Update] config.fields:', JSON.stringify(config.fields, null, 2));
              
              if (config.fields && config.fields.length > 0) {
                for (const field of config.fields) {
                  if (!field.field) {
                    console.log('[Zoho Update] Skipping field with no Zoho field name');
                    continue;
                  }
                  
                  console.log(`[Zoho Update] Processing field: ${field.field}, value: ${field.value}, valueSource: ${field.valueSource}`);
                  
                  // Check if value is an expression like {{ $json.analysis.Lead_Status }}
                  const isExpression = field.value && (field.value.includes('$json') || field.value.includes('{{'));
                  
                  if ((field.valueSource === 'workflow' || isExpression) && sourceData) {
                    // Get the path from expression or workflowField
                    let workflowPath = field.workflowField || '';
                    
                    // Parse expression like {{ $json.analysis.Lead_Status }} or {{ $json.rawData.analysis.transcript_summary }}
                    if (field.value && field.value.includes('$json')) {
                      const match = field.value.match(/\$json\.([a-zA-Z0-9_.]+)/);
                      if (match) {
                        workflowPath = match[1];
                      }
                    }
                    
                    if (!workflowPath) {
                      addLog(`⚠️ No path found for field ${field.field}`, node.label, 'error');
                      continue;
                    }
                    
                    // Get value from workflow data using path
                    let value: any = undefined;
                    
                    // Support nested paths like "analysis.Description" or "rawData.analysis.transcript_summary"
                    const pathParts = workflowPath.split('.');
                    value = sourceData;
                    
                    for (const part of pathParts) {
                      if (value && typeof value === 'object') {
                        value = value[part];
                      } else {
                        value = undefined;
                        break;
                      }
                    }
                    
                    addLog(`🔍 Path: ${workflowPath} => ${value !== undefined ? 'found' : 'not found'}`, node.label, 'running');
                    
                    // Try nested paths if not found
                    if (value === undefined) {
                      value = sourceData?.contact?.[pathParts[pathParts.length - 1]];
                    }
                    if (value === undefined) {
                      value = sourceData?.results?.[0]?.[pathParts[pathParts.length - 1]];
                    }
                    
                    if (value !== undefined) {
                      // Handle arrays - join them
                      if (Array.isArray(value)) {
                        value = value.join(', ');
                      }
                      // Handle objects - stringify them for text fields
                      else if (typeof value === 'object' && value !== null) {
                        value = JSON.stringify(value);
                      }
                      fieldData[field.field] = value;
                      addLog(`📝 ${field.field} = ${String(value).substring(0, 80)}${String(value).length > 80 ? '...' : ''}`, node.label, 'running');
                    } else {
                      addLog(`⚠️ Workflow field "${workflowPath}" not found in input data`, node.label, 'error');
                      console.log('Available sourceData:', JSON.stringify(sourceData, null, 2).substring(0, 500));
                    }
                  } else if (field.value && !isExpression) {
                    // Use static value
                    fieldData[field.field] = field.value;
                    addLog(`📝 ${field.field} = ${field.value} (static)`, node.label, 'running');
                  }
                }
              } else if (config.fieldValues) {
                // Legacy support for old config format
                Object.assign(fieldData, config.fieldValues);
              }
              
              if (Object.keys(fieldData).length > 0) {
                requestBody.data = fieldData;
                addLog(`📋 Updating ${Object.keys(fieldData).length} field(s): ${Object.keys(fieldData).join(', ')}`, node.label, 'running');
                console.log('[Zoho Update] Sending ONLY these fields:', fieldData);
              } else {
                addLog(`⚠️ No fields to update! Check field configuration.`, node.label, 'error');
                console.log('[Zoho Update] config.fields:', config.fields);
              }
            }

            console.log('[Zoho Update] Full requestBody:', JSON.stringify(requestBody, null, 2));
            
            const response = await fetch(
              `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/${endpoint}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify(requestBody),
              }
            );

            const result = await response.json();
            
            if (!response.ok) {
              addLog(`❌ Zoho API Error: ${result.error || 'Unknown error'}`, node.label, 'error');
              toast.error(`Zoho CRM: ${result.error || 'Failed to fetch data'}`);
              return outputData;
            }

            // Extract data from response
            const records = result.data || result.record || result;
            outputData = Array.isArray(records) ? records : [records];
            
            const count = Array.isArray(outputData) ? outputData.length : 1;
            
            // Track if Zoho returned data for Loop Mode
            if (count > 0 && outputData[0]) {
              zohoDataFoundRef.current = true;
            }
            
            addLog(`✅ Found ${count} record(s) from Zoho ${module}`, node.label, 'success', outputData);
            
            // Log first record details
            if (outputData[0]) {
              const first = outputData[0];
              const name = first.Full_Name || first.First_Name || first.Account_Name || first.Deal_Name || 'N/A';
              addLog(`📋 First: ${name} | ${first.Email || first.Phone || ''}`, node.label, 'success');
            }

          } catch (err: any) {
            addLog(`❌ Error: ${err.message}`, node.label, 'error');
            console.error('Zoho CRM fetch error:', err);
            return outputData;
          }
        }

        // RAG Search Node
        if (icon === 'rag' || label.includes('rag')) {
          const config = node.config;
          
          addLog(`🔍 RAG Search started...`, node.label, 'running');
          console.log('RAG Config:', config);
          console.log('RAG Input Data:', inputData);
          
          if (!config?.entries || config.entries.length === 0) {
            addLog('❌ Knowledge base is empty!', node.label, 'error');
            toast.error('RAG: Baza de cunoștințe este goală!');
            return outputData;
          }

          addLog(`📚 Knowledge base has ${config.entries.length} entries`, node.label, 'running');

          try {
            // Get search query from config
            let searchQuery = config.searchQuery || '';
            
            addLog(`📝 Query template: ${searchQuery}`, node.label, 'running');
            
            // Evaluate expression if it contains {{ $json.* }}
            if (searchQuery.includes('{{') && inputData) {
              const match = searchQuery.match(/\{\{\s*\$json\.(.*?)\s*\}\}/);
              console.log('Query match:', match);
              if (match) {
                const path = match[1];
                const parts = path.split('.');
                let value = inputData;
                for (const part of parts) {
                  if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                  }
                }
                searchQuery = String(value || '');
                console.log('Evaluated query:', searchQuery);
              }
            }

            if (!searchQuery || searchQuery.trim() === '') {
              addLog('❌ Search query is empty!', node.label, 'error');
              toast.error('RAG: Query de căutare este gol!');
              return outputData;
            }

            addLog(`🔍 Searching for: "${searchQuery}"`, node.label, 'running');
            console.log('Final search query:', searchQuery);

            // IMPROVED RAG Search Algorithm - prioritizes exact word matches
            const results: Array<{ entry: any; score: number }> = [];
            const MIN_SCORE_THRESHOLD = 10;
            
            // Normalize function
            const normalize = (text: string) => {
              return text
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s,]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            };

            // Escape special regex characters
            const escapeRegex = (str: string) => {
              return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            };
            
            // Levenshtein distance for typo detection only
            const levenshteinDistance = (str1: string, str2: string): number => {
              if (Math.abs(str1.length - str2.length) > 2) return Infinity;
              const matrix: number[][] = [];
              for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
              for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
              
              for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                  if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                  } else {
                    matrix[i][j] = Math.min(
                      matrix[i - 1][j - 1] + 1,
                      matrix[i][j - 1] + 1,
                      matrix[i - 1][j] + 1
                    );
                  }
                }
              }
              return matrix[str2.length][str1.length];
            };
            
            const normalizedQuery = normalize(searchQuery);
            const queryWords = normalizedQuery.split(' ').filter(w => w.length >= 2);

            console.log('RAG Search - Query:', searchQuery, 'Normalized:', normalizedQuery);

            for (const entry of config.entries) {
              const queryText = normalize(entry.query || '');
              const contentText = normalize(entry.content || '');
              const fullText = `${queryText} ${contentText}`;
              
              // Split content into individual words (for CSV-like data)
              const allWords = fullText.split(/[\s,]+/).filter(w => w.length > 0);
              
              let score = 0;
              
              for (const searchWord of queryWords) {
                if (searchWord.length < 2) continue;
                
                // 1. EXACT WORD MATCH (highest priority) - 50 points
                const isExactWordMatch = allWords.some(w => w === searchWord);
                
                if (isExactWordMatch) {
                  score += 50;
                }
                // 2. WORD BOUNDARY MATCH - 20 points
                else {
                  const exactWordRegex = new RegExp(`(^|[\\s,])${escapeRegex(searchWord)}([\\s,]|$)`, 'i');
                  if (exactWordRegex.test(fullText)) {
                    score += 20;
                  }
                  // 3. SUBSTRING MATCH (low priority) - 3 points
                  else if (fullText.includes(searchWord)) {
                    score += 3;
                  }
                  // 4. FUZZY MATCH (typos only) - 15 points
                  else {
                    for (const targetWord of allWords) {
                      if (targetWord.length < 3) continue;
                      if (Math.abs(searchWord.length - targetWord.length) <= 1) {
                        const distance = levenshteinDistance(searchWord, targetWord);
                        if (distance === 1) {
                          score += 15;
                          break;
                        }
                      }
                    }
                  }
                }
              }
              
              // Only include results above minimum threshold
              if (score >= MIN_SCORE_THRESHOLD) {
                results.push({ entry, score });
              }
            }

            // Sort by score descending
            results.sort((a, b) => b.score - a.score);

            if (results.length === 0) {
              addLog(`📭 No matches found for "${searchQuery}"`, node.label, 'error');
              outputData = {
                query: searchQuery,
                found: false,
                results: [],
                message: 'Nu am găsit informații relevante pentru această căutare.'
              };
              return outputData;
            }

            addLog(`✅ Found ${results.length} matching entries`, node.label, 'success');

            // Process with Groq AI if enabled - via edge function
            if (config.useGroq && results.length > 0) {
              addLog(`🤖 Processing with Groq AI via edge function...`, node.label, 'running');
              
              try {
                // Build context from top results
                const context = results.slice(0, 3).map((r, i) => 
                  `[${i + 1}] ${r.entry.content}`
                ).join('\n\n');

                const systemPrompt = config.systemPrompt || 'Tu ești un asistent care răspunde pe baza informațiilor furnizate. Dacă nu găsești informații relevante, spune-o clar.';

                const prompt = `${systemPrompt}

Context din baza de cunoștințe:

${context}

Întrebare: ${searchQuery}

Răspunde pe baza contextului de mai sus.`;

                addLog(`📝 Sending request to edge function with model: ${config.model || 'llama-3.3-70b-versatile'}`, node.label, 'running');

                const { data, error } = await supabase.functions.invoke('workflow-groq-analysis', {
                  body: {
                    prompt,
                    model: config.model || 'llama-3.3-70b-versatile',
                    temperature: 0.3,
                  },
                });

                if (error) throw error;
                if (!data?.success) throw new Error(data?.error || 'Groq processing failed');

                const groqResponse = typeof data.analysis === 'string' 
                  ? data.analysis 
                  : JSON.stringify(data.analysis);
                
                addLog(`✅ Groq AI response generated (${groqResponse.length} chars)`, node.label, 'success');

                outputData = {
                  query: searchQuery,
                  found: true,
                  matchCount: results.length,
                  topResults: results.slice(0, 3).map(r => ({
                    query: r.entry.query,
                    content: r.entry.content,
                    score: r.score,
                    metadata: r.entry.metadata
                  })),
                  groqResponse,
                  rawResults: results.map(r => r.entry)
                };

              } catch (err: any) {
                const errorMsg = err.message || String(err);
                addLog(`❌ Groq error: ${errorMsg}`, node.label, 'error');
                console.error('Groq error details:', err);
                toast.error(`Groq AI failed: ${errorMsg}`);
                
                // Fallback: return results without Groq processing
                outputData = {
                  query: searchQuery,
                  found: true,
                  matchCount: results.length,
                  topResults: results.slice(0, 5).map(r => ({
                    query: r.entry.query,
                    content: r.entry.content,
                    score: r.score,
                    metadata: r.entry.metadata
                  })),
                  rawResults: results.map(r => r.entry)
                };
              }
            } else {
              // Without Groq: just return the results
              outputData = {
                query: searchQuery,
                found: true,
                matchCount: results.length,
                topResults: results.slice(0, 5).map(r => ({
                  query: r.entry.query,
                  content: r.entry.content,
                  score: r.score,
                  metadata: r.entry.metadata
                })),
                rawResults: results.map(r => r.entry)
              };
              
              addLog(`✅ Returned top ${Math.min(5, results.length)} results`, node.label, 'success');
            }

            console.log('RAG Output Data:', outputData);
            addLog(`✅ RAG Search completed!`, node.label, 'success', outputData);

          } catch (err: any) {
            addLog(`❌ Error: ${err.message}`, node.label, 'error');
            console.error('RAG Search error:', err);
            return outputData;
          }
        }

        // Telegram Node
        if (icon === 'telegram' || label.includes('telegram')) {
          const config = node.config;
          
          addLog(`📨 Preparing message...`, node.label, 'running');
          
          if (!config?.botToken) {
            addLog('❌ Bot Token missing!', node.label, 'error');
            toast.error('Telegram: Bot Token is missing!');
            return outputData;
          }
          
          if (!config?.chatId) {
            addLog('❌ Chat ID missing!', node.label, 'error');
            toast.error('Telegram: Chat ID is missing!');
            return outputData;
          }

          // Determine what text to send based on config
          let textToSend = config.text || '';
          
          // NEW: Check for droppedFields first (from drag & drop)
          if (config.droppedFields && config.droppedFields.length > 0 && inputData) {
            const dataToProcess = Array.isArray(inputData) ? inputData[0] : inputData;
            const lines: string[] = [];
            
            addLog(`📝 Using ${config.droppedFields.length} dropped fields`, node.label, 'running');
            
            // Helper to clean markdown artifacts
            const cleanArtifacts = (text: string): string => {
              if (!text || typeof text !== 'string') return text;
              let cleaned = text;
              cleaned = cleaned.replace(/^rawAnalysis:\s*/i, '');
              cleaned = cleaned.replace(/^analysis:\s*/i, '');
              cleaned = cleaned.replace(/^```json\s*/i, '');
              cleaned = cleaned.replace(/^```\s*/i, '');
              cleaned = cleaned.replace(/\s*```$/i, '');
              return cleaned.trim();
            };

            for (const field of config.droppedFields) {
              // Navigate through nested path (e.g., "Owner.name")
              const parts = field.path.split('.');
              let value: any = dataToProcess;
              for (const part of parts) {
                value = value?.[part];
              }
              
              if (value !== undefined && value !== null) {
                // Handle arrays and objects
                if (Array.isArray(value)) {
                  value = value.join(', ');
                } else if (typeof value === 'object') {
                  value = JSON.stringify(value);
                }
                // Push ONLY value, no labels like "rawAnalysis:"
                const cleanedValue = cleanArtifacts(String(value));
                if (cleanedValue) {
                  lines.push(cleanedValue);
                }
              }
            }
            
            textToSend = lines.length > 0 ? lines.join('\n\n') : '[Nu există date pentru câmpurile selectate]';
          }
          // Check for multiField selection (multiple fields)
          else if (textToSend.includes('multiField:')) {
            const match = textToSend.match(/multiField:\s*\[(.*?)\]/);
            if (match && match[1] && inputData) {
              const fields = match[1].split(',').map(f => f.trim().replace(/"/g, ''));
              addLog(`📝 Using ${fields.length} fields: ${fields.join(', ')}`, node.label, 'running');
              
              // Handle both single object and array of objects
              const dataToProcess = Array.isArray(inputData) ? inputData[0] : inputData;
              
              if (!dataToProcess) {
                textToSend = '[Nu există date din nodul anterior]';
              } else {
                // Build formatted message with all selected fields
                const lines: string[] = [];
                const fieldLabels: { [key: string]: string } = {
                  // Webhook fields
                  body: '📦 Body complet',
                  headers: '📋 Headers',
                  query: '🔍 Query params',
                  method: '📡 HTTP Method',
                  // Call History fields
                  callerNumber: '📱 Număr apelant',
                  phoneNumber: '📞 Număr telefon',
                  contactName: '👤 Nume contact',
                  score: '⭐ Scor',
                  duration: '⏱️ Durată (sec)',
                  durationFormatted: '🕐 Durată',
                  status: '📊 Status',
                  transcription: '📝 Transcripție',
                  summary: '📋 Rezumat',
                  conclusion: '📌 Concluzie AI',
                  tags: '🏷️ Tag-uri',
                  agentEvaluation: '🤖 Evaluare agent',
                  timestamp: '📅 Data/Ora',
                  conversationId: '🆔 ID Conversație',
                  language: '🌍 Limba',
                  costUsd: '💵 Cost (USD)',
                  analysisConclusion: '📊 Analiză completă',
                  // Groq Analysis fields
                  analysis: '🤖 Analiză Groq',
                  rawAnalysis: '📄 Răspuns brut Groq',
                  transcript: '📝 Transcripție',
                  // Zoho CRM fields
                  Full_Name: '👤 Nume complet',
                  First_Name: '👤 Prenume',
                  Last_Name: '👤 Nume familie',
                  Email: '📧 Email',
                  Phone: '📱 Telefon',
                  Mobile: '📲 Mobil',
                  Company: '🏢 Companie',
                  Lead_Status: '📊 Status Lead',
                  Lead_Source: '📍 Sursă Lead',
                  Rating: '⭐ Rating',
                  Industry: '🏭 Industrie',
                  City: '🌆 Oraș',
                  Country: '🌍 Țară',
                  Description: '📝 Descriere',
                  Account_Name: '🏢 Nume Cont',
                  Deal_Name: '💼 Nume Deal',
                };
                
                // Debug log the data
                console.log('Processing data for Telegram:', dataToProcess);
                console.log('Selected fields:', fields);
                
                // Helper function to clean markdown artifacts
                const cleanMarkdownArtifactsLocal = (text: string): string => {
                  if (!text || typeof text !== 'string') return text;
                  let cleaned = text;
                  cleaned = cleaned.replace(/^rawAnalysis:\s*/i, '');
                  cleaned = cleaned.replace(/^analysis:\s*/i, '');
                  cleaned = cleaned.replace(/^result:\s*/i, '');
                  cleaned = cleaned.replace(/^output:\s*/i, '');
                  cleaned = cleaned.replace(/^```json\s*/i, '');
                  cleaned = cleaned.replace(/^```\s*/i, '');
                  cleaned = cleaned.replace(/\s*```$/i, '');
                  return cleaned.trim();
                };

                // Special handling for "all" field - stringify entire data
                if (fields.includes('all') || fields.length === 1 && fields[0] === 'all') {
                  textToSend = JSON.stringify(dataToProcess, null, 2);
                  addLog(`📦 Sending all data as JSON`, node.label, 'running');
                } else {
                  for (const field of fields) {
                    let value = dataToProcess[field];
                    console.log(`Field "${field}" value:`, value);
                    if (value !== undefined && value !== null && value !== '') {
                      // Handle arrays (like tags)
                      if (Array.isArray(value)) {
                        value = value.join(', ');
                      }
                      // Handle objects - stringify them
                      if (typeof value === 'object') {
                        value = JSON.stringify(value, null, 2);
                      }
                      // Clean markdown artifacts and push VALUE ONLY (no labels)
                      const cleanedValue = cleanMarkdownArtifactsLocal(String(value));
                      if (cleanedValue) {
                        lines.push(cleanedValue);
                      }
                    }
                  }
                  
                  textToSend = lines.length > 0 ? lines.join('\n\n') : '[Nu există date pentru câmpurile selectate]';
                }
              }
            }
          } else if (textToSend.includes('$json.')) {
            // Parse expression and get value from inputData
            const match = textToSend.match(/\$json\.(\w+)/);
            if (match && match[1] && inputData) {
              const field = match[1];
              textToSend = inputData[field] || `[No ${field} data]`;
              addLog(`📝 Using field "${field}" from previous node`, node.label, 'running');
            }
          } else if (textToSend.includes('JSON.stringify')) {
            textToSend = JSON.stringify(inputData, null, 2);
          } else if (!textToSend || textToSend.includes('{{')) {
            // Default to summary or all data
            textToSend = inputData?.callSummary || inputData?.summary || JSON.stringify(inputData, null, 2);
          }

          addLog(`📨 Sending to Telegram...`, node.label, 'running');
          
          try {
            const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: config.chatId,
                text: textToSend,
                parse_mode: config.parseMode !== 'none' ? config.parseMode : undefined,
              }),
            });

            const result = await response.json();
            
            if (result.ok) {
              // Set complete output data with all details
              outputData = {
                success: true,
                messageId: result.result?.message_id,
                chatId: result.result?.chat?.id,
                chatType: result.result?.chat?.type,
                chatTitle: result.result?.chat?.title || result.result?.chat?.first_name,
                date: result.result?.date,
                textSent: textToSend,
                textLength: textToSend.length,
                parseMode: config.parseMode || 'none',
                from: {
                  botId: result.result?.from?.id,
                  botName: result.result?.from?.first_name,
                  botUsername: result.result?.from?.username,
                },
                rawResponse: result.result,
              };
              addLog(`✅ Message sent successfully!`, node.label, 'success', outputData);
              toast.success('Telegram: Message sent!');
            } else {
              outputData = {
                success: false,
                error: result.description,
                errorCode: result.error_code,
              };
              addLog(`❌ Error: ${result.description}`, node.label, 'error');
              toast.error(`Telegram Error: ${result.description}`);
            }
          } catch (error) {
            outputData = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              networkError: true,
            };
            addLog(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown'}`, node.label, 'error');
            toast.error('Telegram: Network error');
          }
        }

        // Respond to Webhook Node
        if (icon === 'respond-to-webhook' || icon === 'respond_to_webhook' ||
            label.includes('respond to webhook') || label.includes('respond-to-webhook')) {
          addLog(`📤 Configuring webhook response...`, node.label, 'running');
          console.log('[Respond to Webhook] inputData received:', JSON.stringify(inputData).substring(0, 500));
          addLog(`📥 Input data: ${Array.isArray(inputData) ? `Array[${inputData.length}]` : typeof inputData}`, node.label, 'running');
          const config = node.config || {};
          
          // Determine response body
          let responseBody: any = null;
          const responseBodyOption = config.responseBody || 'firstEntryJson';
          
          if (responseBodyOption === 'customExpression' && config.customExpression) {
            // Resolve expression like {{$json.field}} or {{JSON.stringify($json)}}
            let expression = config.customExpression;
            
            // Handle JSON.stringify($json) or JSON.stringify($json.field)
            const stringifyMatch = expression.match(/\{\{\s*JSON\.stringify\(([^)]+)\)\s*\}\}/);
            if (stringifyMatch) {
              const innerExpr = stringifyMatch[1].trim();
              if (innerExpr === '$json') {
                responseBody = JSON.stringify(inputData);
              } else if (innerExpr.startsWith('$json.')) {
                const field = innerExpr.slice(6);
                const value = inputData?.[field];
                responseBody = value !== undefined ? JSON.stringify(value) : '';
              }
              addLog(`🔧 Custom expression: ${expression} → ${typeof responseBody}`, node.label, 'running');
            } else {
              // Simple field access like {{$json.analysis}}
              const fieldMatch = expression.match(/\{\{\s*\$json\.([^}]+)\s*\}\}/);
              if (fieldMatch) {
                const field = fieldMatch[1].trim();
                responseBody = inputData?.[field];
                addLog(`🔧 Field access: {{$json.${field}}}`, node.label, 'running');
              } else {
                // Use raw expression
                responseBody = expression;
              }
            }
          } else if (responseBodyOption === 'noData') {
            responseBody = null;
            addLog(`📭 No response body`, node.label, 'running');
          } else {
            // Default: firstEntryJson - return input data as-is
            responseBody = inputData;
            addLog(`📄 Using input data as response`, node.label, 'running');
          }
          
          // Get status code
          const statusCode = config.statusCode || 200;
          
          // Get custom headers
          const customHeaders: Record<string, string> = {};
          if (config.headers && Array.isArray(config.headers)) {
            for (const header of config.headers) {
              if (header.name && header.value) {
                customHeaders[header.name] = header.value;
              }
            }
          }
          
          // Determine response type
          const responseType = config.responseType || 'json';
          
          // Store webhook response configuration
          webhookResponseRef.current = {
            body: responseBody,
            statusCode,
            headers: customHeaders,
            responseType,
            nodeLabel: node.label,
          };
          
          addLog(`✅ Webhook response configured: HTTP ${statusCode} (${responseType})`, node.label, 'success');
          addLog(`📦 Response preview: ${JSON.stringify(responseBody).substring(0, 100)}...`, node.label, 'success');
          
          // Don't pass data to next nodes - this is terminal
          outputData = {
            ...inputData,
            webhookResponseConfigured: true,
            statusCode,
            responsePreview: typeof responseBody === 'string' 
              ? responseBody.substring(0, 200) 
              : JSON.stringify(responseBody).substring(0, 200),
          };
        }

        // Infobip Email Node
        if (icon === 'infobip-send-email' || icon === 'infobip-email' || (label.includes('infobip') && label.includes('email'))) {
          addLog(`📧 Processing Infobip Email...`, node.label, 'running');
          const config = node.config || {};
          
          if (!config.fromEmail) {
            addLog('❌ From Email is missing!', node.label, 'error');
            toast.error('Infobip Email: Adresa expeditorului lipsește!');
            return outputData;
          }

          // Get recipient email - either fixed or from workflow
          let toEmail = '';
          if (config.toEmailSource === 'workflow' && config.toEmailWorkflowField && inputData) {
            const dataToCheck = Array.isArray(inputData) ? inputData[0] : inputData;
            toEmail = dataToCheck?.[config.toEmailWorkflowField] || '';
            addLog(`📧 Email destinatar din workflow: ${toEmail}`, node.label, 'running');
          } else {
            toEmail = config.toEmail || '';
          }

          if (!toEmail) {
            addLog('❌ Recipient email is missing!', node.label, 'error');
            toast.error('Infobip Email: Adresa destinatarului lipsește!');
            return outputData;
          }

          if (!config.subject) {
            addLog('❌ Subject is missing!', node.label, 'error');
            toast.error('Infobip Email: Subiectul lipsește!');
            return outputData;
          }

          // Get body - either fixed or from workflow
          let body = '';
          if (config.bodySource === 'workflow' && config.bodyWorkflowField && inputData) {
            const dataToCheck = Array.isArray(inputData) ? inputData[0] : inputData;
            body = dataToCheck?.[config.bodyWorkflowField] || '';
            // If it's an object, stringify it
            if (typeof body === 'object') {
              body = JSON.stringify(body, null, 2);
            }
            addLog(`📝 Conținut email din workflow (${config.bodyWorkflowField})`, node.label, 'running');
          } else {
            body = config.body || '';
          }

          if (!body) {
            addLog('⚠️ Email body is empty', node.label, 'running');
          }

          addLog(`📨 Trimit email către ${toEmail}...`, node.label, 'running');

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            const response = await fetch(
              'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/infobip-send-email',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session?.access_token}`,
                },
                body: JSON.stringify({
                  fromEmail: config.fromEmail,
                  fromName: config.fromName || 'Agentauto',
                  toEmail,
                  subject: config.subject,
                  body,
                  bodyType: config.bodyType || 'text',
                  // Include custom credentials if provided
                  useCustomAccount: config.useCustomAccount,
                  apiKey: config.useCustomAccount ? config.apiKey : undefined,
                  baseUrl: config.useCustomAccount ? config.baseUrl : undefined,
                }),
              }
            );

            const result = await response.json();

            if (response.ok && result.success) {
              addLog(`✅ Email trimis cu succes!`, node.label, 'success', { messageId: result.messageId });
              toast.success('Infobip: Email trimis!');
              outputData = { ...outputData, emailSent: true, messageId: result.messageId };
            } else {
              addLog(`❌ Eroare: ${result.error || 'Eroare necunoscută'}`, node.label, 'error');
              toast.error(`Infobip Email Error: ${result.error}`);
            }
          } catch (error) {
            addLog(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown'}`, node.label, 'error');
            toast.error('Infobip Email: Network error');
          }
        }

        // Infobip SMS Node
        if (icon === 'infobip-send-sms' || icon === 'infobip-sms' || (label.includes('infobip') && label.includes('sms'))) {
          addLog(`📱 Processing Infobip SMS...`, node.label, 'running');
          const config = node.config || {};

          // Get recipient phone - either fixed or from workflow
          let toNumber = '';
          if (config.toNumberSource === 'workflow' && config.toNumberWorkflowField && inputData) {
            const dataToCheck = Array.isArray(inputData) ? inputData[0] : inputData;
            toNumber = dataToCheck?.[config.toNumberWorkflowField] || '';
            addLog(`📱 Număr telefon din workflow: ${toNumber}`, node.label, 'running');
          } else {
            toNumber = config.toNumber || '';
          }

          if (!toNumber) {
            addLog('❌ Recipient phone number is missing!', node.label, 'error');
            toast.error('Infobip SMS: Numărul destinatarului lipsește!');
            return outputData;
          }

          // Get message - either fixed or from workflow
          let message = '';
          if (config.messageSource === 'workflow' && config.messageWorkflowField && inputData) {
            const dataToCheck = Array.isArray(inputData) ? inputData[0] : inputData;
            message = dataToCheck?.[config.messageWorkflowField] || '';
            // If it's an object, stringify it
            if (typeof message === 'object') {
              message = JSON.stringify(message);
            }
            // Truncate if too long for SMS
            if (message.length > 1600) {
              message = message.substring(0, 1597) + '...';
            }
            addLog(`📝 Mesaj SMS din workflow (${config.messageWorkflowField})`, node.label, 'running');
          } else {
            message = config.message || '';
          }

          if (!message) {
            addLog('❌ Message is missing!', node.label, 'error');
            toast.error('Infobip SMS: Mesajul lipsește!');
            return outputData;
          }

          addLog(`📨 Trimit SMS către ${toNumber}...`, node.label, 'running');

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            const response = await fetch(
              'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/infobip-send-sms',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session?.access_token}`,
                },
                body: JSON.stringify({
                  from: config.from || 'Agentauto',
                  to: toNumber,
                  text: message,
                  // Include custom credentials if provided
                  useCustomAccount: config.useCustomAccount,
                  apiKey: config.useCustomAccount ? config.apiKey : undefined,
                  baseUrl: config.useCustomAccount ? config.baseUrl : undefined,
                }),
              }
            );

            const result = await response.json();

            if (response.ok && result.success) {
              addLog(`✅ SMS trimis cu succes!`, node.label, 'success', { messageId: result.messageId });
              toast.success('Infobip: SMS trimis!');
              outputData = { ...outputData, smsSent: true, messageId: result.messageId };
            } else {
              addLog(`❌ Eroare: ${result.error || 'Eroare necunoscută'}`, node.label, 'error');
              toast.error(`Infobip SMS Error: ${result.error}`);
            }
          } catch (error) {
            addLog(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown'}`, node.label, 'error');
            toast.error('Infobip SMS: Network error');
          }
        }

        // Altegio Nodes (Bookings / Meta / Webhook)
        if (icon?.includes('altegio') || label.includes('altegio')) {
          const config = node.config || {};
          const rawExpressionSource = Array.isArray(inputData)
            ? ((inputData as any)?.[0] ?? {})
            : inputData ?? {};
          const expressionContext =
            typeof rawExpressionSource === 'object' && rawExpressionSource !== null ? rawExpressionSource : {};
          
          // Determine action from config or label
          let action = config.action;
          if (!action) {
            const labelLower = label.toLowerCase();
            if (labelLower.includes('create')) action = 'create';
            else if (labelLower.includes('update')) action = 'update';
            else if (labelLower.includes('cancel')) action = 'cancel';
            else if (labelLower.includes('list services')) action = 'list_services';
            else if (labelLower.includes('list branches')) action = 'list_branches';
            else if (labelLower.includes('list staff')) action = 'list_staff';
            else if (labelLower.includes('get')) action = 'get';
            else if (labelLower.includes('webhook')) action = 'webhook';
            else action = 'list';
          }

          addLog(`🔵 Altegio: ${action}`, node.label, 'running');

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            // Resolve companyId/salonId from config or inputData
            const companyId =
              config.companyId || config.salonId || (expressionContext as any)?.company_id || (expressionContext as any)?.salon_id;
            
            // Evaluate expressions for dynamic values
            const evaluateExpression = (value: string, data: any): string => {
              if (!value || typeof value !== 'string' || !value.includes('{{')) return value;
              try {
                // Simple expression evaluation - extract field path
                const match = value.match(/\{\{\s*\$json\.([^}]+)\s*\}\}/);
                if (match) {
                  const path = match[1].split('.');
                  let result: any = data;
                  for (const key of path) {
                    result = result?.[key];
                  }
                  return result !== undefined ? String(result) : value;
                }
              } catch {
                // If evaluation fails, return original value
              }
              return value;
            };
            
            // Build config with resolved values
            const resolvedConfig: any = {
              ...config,
              salonId: companyId,
              companyId: companyId,
            };
            
            // Resolve expression fields if in expression mode
            if (config.modeCompanyId === 'expression' && config.companyId) {
              resolvedConfig.companyId = evaluateExpression(config.companyId, expressionContext);
              resolvedConfig.salonId = resolvedConfig.companyId;
            }
            if (config.modeBookingId === 'expression' && config.bookingId) {
              resolvedConfig.bookingId = evaluateExpression(config.bookingId, expressionContext);
            }
            if (config.modeCustomerName === 'expression' && config.customerName) {
              resolvedConfig.customerName = evaluateExpression(config.customerName, expressionContext);
            }
            if (config.modeCustomerPhone === 'expression' && config.customerPhone) {
              resolvedConfig.customerPhone = evaluateExpression(config.customerPhone, expressionContext);
            }
            if (config.modeCustomerEmail === 'expression' && config.customerEmail) {
              resolvedConfig.customerEmail = evaluateExpression(config.customerEmail, expressionContext);
            }
            if (config.modeServiceId === 'expression' && config.serviceId) {
              resolvedConfig.serviceId = evaluateExpression(config.serviceId, expressionContext);
            }
            if (config.modeStaffId === 'expression' && config.staffId) {
              resolvedConfig.staffId = evaluateExpression(config.staffId, expressionContext);
            }
            if (config.modeBranchId === 'expression' && config.branchId) {
              resolvedConfig.branchId = evaluateExpression(config.branchId, expressionContext);
            }
            if (config.modeStartAt === 'expression' && config.startAt) {
              resolvedConfig.startAt = evaluateExpression(config.startAt, expressionContext);
            }
            if (config.modeStatus === 'expression' && config.status) {
              resolvedConfig.status = evaluateExpression(config.status, expressionContext);
            }
            if (config.modeComment === 'expression' && config.comment) {
              resolvedConfig.comment = evaluateExpression(config.comment, expressionContext);
            }
            if (config.modeFromDate === 'expression' && config.fromDate) {
              resolvedConfig.fromDate = evaluateExpression(config.fromDate, expressionContext);
            }
            if (config.modeToDate === 'expression' && config.toDate) {
              resolvedConfig.toDate = evaluateExpression(config.toDate, expressionContext);
            }
            if (config.modeLimit === 'expression' && config.limit !== undefined && config.limit !== null) {
              resolvedConfig.limit = evaluateExpression(String(config.limit), expressionContext);
            }
            if (config.modePage === 'expression' && config.page !== undefined && config.page !== null) {
              resolvedConfig.page = evaluateExpression(String(config.page), expressionContext);
            }
            if (config.modeFilterStatus === 'expression' && config.filterStatus) {
              resolvedConfig.filterStatus = evaluateExpression(config.filterStatus, expressionContext);
            }
            if (config.modeFilterServiceId === 'expression' && config.filterServiceId) {
              resolvedConfig.filterServiceId = evaluateExpression(String(config.filterServiceId), expressionContext);
            }
            if (config.modeFilterStaffId === 'expression' && config.filterStaffId) {
              resolvedConfig.filterStaffId = evaluateExpression(String(config.filterStaffId), expressionContext);
            }
            if (config.modeFilterBranchId === 'expression' && config.filterBranchId) {
              resolvedConfig.filterBranchId = evaluateExpression(String(config.filterBranchId), expressionContext);
            }
            if (config.modeFilterClientPhone === 'expression' && config.filterClientPhone) {
              resolvedConfig.filterClientPhone = evaluateExpression(config.filterClientPhone, expressionContext);
            }
            if (config.modeFilterClientEmail === 'expression' && config.filterClientEmail) {
              resolvedConfig.filterClientEmail = evaluateExpression(config.filterClientEmail, expressionContext);
            }
            
            const body = {
              action,
              config: resolvedConfig,
              // Pass inputData for dynamic field resolution
              inputData,
            };

            const response = await fetch(
              'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/altegio-api',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session?.access_token}`,
                },
                body: JSON.stringify(body),
              }
            );

            const result = await response.json();

            if (response.ok && result.success) {
              // Format Altegio response to extract actual data
              let formattedData = result.data || result;
              
              // If data is nested, extract it
              if (formattedData && typeof formattedData === 'object' && 'data' in formattedData) {
                const nestedData = (formattedData as Record<string, unknown>).data;
                // Check if nested data is HTML (error response)
                if (typeof nestedData === 'string' && (nestedData.includes('<!DOCTYPE') || nestedData.includes('<html'))) {
                  throw new Error('Altegio API returned HTML instead of JSON. Check your credentials and API endpoint.');
                }
                formattedData = nestedData;
              }
              
              // Check if data itself is HTML
              if (typeof formattedData === 'string' && (formattedData.includes('<!DOCTYPE') || formattedData.includes('<html'))) {
                throw new Error('Altegio API returned HTML instead of JSON. Check your credentials and API endpoint.');
              }
              
              addLog(`✅ Altegio ${action} success`, node.label, 'success', formattedData);
              outputData = formattedData;
            } else {
              addLog(`❌ Altegio error: ${result.error || 'Eroare necunoscută'}`, node.label, 'error');
              toast.error(`Altegio: ${result.error || 'Eroare'}`);
            }
          } catch (error) {
            addLog(`❌ Altegio network error: ${error instanceof Error ? error.message : 'Unknown'}`, node.label, 'error');
            toast.error('Altegio: Network error');
          }
        }

        // Kalina Call Node - Initiate outbound calls
        if (icon === 'kalina-call' || label.includes('kalina call')) {
          addLog(`📞 Processing Kalina Call node...`, node.label, 'running');
          const config = node.config || {};
          
          // Helper function to get value from object using dot notation path
          // Supports numeric indices for array access (e.g., "0.contact_phone")
          const getValueByPath = (obj: any, path: string, rootData?: any): any => {
            if (!path) return undefined;

            const parts = path.split('.');

            // If path starts with a number, use rootData (the full inputData)
            const firstPart = parts[0];
            const startsWithIndex = !isNaN(parseInt(firstPart, 10));

            let value = startsWithIndex && rootData ? rootData : obj;
            if (!value) return undefined;

            for (const part of parts) {
              if (value === undefined || value === null) return undefined;

              // Check if this part is a numeric index
              const numIndex = parseInt(part, 10);
              if (!isNaN(numIndex) && Array.isArray(value)) {
                value = value[numIndex];
              } else {
                value = value[part];
              }
            }

            // If value not found and path has numeric index, try without the index
            // e.g., "0.contact_phone" -> try just "contact_phone" on the object
            if (value === undefined && startsWithIndex && obj) {
              const pathWithoutIndex = parts.slice(1).join('.');
              if (pathWithoutIndex) {
                value = getValueByPath(obj, pathWithoutIndex);
              }
            }

            return value;
          };

          // Deep search for a field in nested objects
          const findFieldDeep = (obj: any, fieldName: string, maxDepth: number = 5): any => {
            if (!obj || maxDepth <= 0) return undefined;

            // Direct property
            if (obj[fieldName] !== undefined) return obj[fieldName];

            // Search in nested objects
            for (const key of Object.keys(obj)) {
              if (typeof obj[key] === 'object' && obj[key] !== null) {
                const found = findFieldDeep(obj[key], fieldName, maxDepth - 1);
                if (found !== undefined) return found;
              }
            }

            return undefined;
          };
          
          if (!user) {
            addLog('❌ User not authenticated!', node.label, 'error');
            toast.error('You need to be logged in to initiate calls.');
            return outputData;
          }

          if (!config.agentId) {
            addLog('❌ No agent selected!', node.label, 'error');
            toast.error('Kalina Call: Please select an agent in node configuration.');
            return outputData;
          }

          if (!config.phoneNumberId) {
            addLog('❌ No phone number selected!', node.label, 'error');
            toast.error('Kalina Call: Please select a phone number in node configuration.');
            return outputData;
          }

          // Get contacts from input data
          console.log('📞 Kalina Call - RAW inputData:', inputData);
          const contacts = Array.isArray(inputData) ? inputData : [inputData];
          console.log('📞 Kalina Call - contacts array:', contacts);
          const phoneFieldConfig = config.phoneField || '';
          const phoneFieldSource = config.phoneFieldSource || 'manual';
          const nameFieldConfig = config.nameField || '';
          const nameFieldSource = config.nameFieldSource || 'manual';
          const infoFields = config.infoFields || [];
          const droppedFields = config.droppedFields || [];
          const callInterval = (config.callInterval || 30) * 1000; // Convert to ms

          // Helper to check if value is an n8n expression
          const isExpression = (value: string) => {
            if (!value) return false;
            // Check for n8n expression patterns: ={{ ... }} or {{ ... }}
            const result = value.startsWith('={{') || value.includes('{{') && value.includes('}}');
            console.log('📞 isExpression check:', value, '→', result);
            return result;
          };

          // Helper to extract field path from expression like ={{ $json.Phone }} or {{ $json.contact.phone }}
          const extractExpressionPath = (expr: string) => {
            const match = expr.match(/\{\{\s*\$json\.([^\s}]+)\s*\}\}/);
            return match ? match[1] : null;
          };

          // Helper to check if value looks like a phone number (starts with + or digits)
          const isPhoneNumber = (value: string) => /^[\+\d][\d\s\-\(\)]+$/.test(value);

          addLog(`📋 Found ${contacts.length} contact(s) to call`, node.label, 'running');
          addLog(`🔧 Phone: ${phoneFieldConfig} (${phoneFieldSource}), Name: ${nameFieldConfig} (${nameFieldSource})`, node.label, 'running');

          if (droppedFields.length > 0) {
            addLog(`📋 Info fields for agent: ${droppedFields.map((f: any) => f.key).join(', ')}`, node.label, 'running');
          }

          const callResults: any[] = [];
          let successCount = 0;
          let failCount = 0;

          for (let i = 0; i < contacts.length; i++) {
            // Check if stop was requested
            if (stopRequestedRef.current) {
              addLog(`⛔ Workflow stopped by user`, node.label, 'error');
              break;
            }

            const contact = contacts[i];

            // Debug: Log the contact structure and field paths
            console.log('📞 Kalina Call - Contact:', contact);
            console.log('📞 Kalina Call - phoneFieldConfig:', phoneFieldConfig, 'source:', phoneFieldSource);
            console.log('📞 Kalina Call - nameFieldConfig:', nameFieldConfig, 'source:', nameFieldSource);

            // Determine phone number based on source
            let extractedPhone: any;
            if (phoneFieldSource === 'manual') {
              // Fixed value - use directly
              extractedPhone = phoneFieldConfig;
              console.log('📞 Kalina Call - Phone is manual/fixed:', extractedPhone);
            } else if (isExpression(phoneFieldConfig)) {
              // It's an n8n expression like {{ $json.Phone }} or {{ $json.0.contact_phone }}
              const fieldPath = extractExpressionPath(phoneFieldConfig);
              extractedPhone = fieldPath ? getValueByPath(contact, fieldPath, inputData) : undefined;
              console.log('📞 Kalina Call - Phone is expression, path:', fieldPath, 'value:', extractedPhone);
            } else if (isPhoneNumber(phoneFieldConfig)) {
              // Fallback: direct phone number value
              extractedPhone = phoneFieldConfig;
              console.log('📞 Kalina Call - Phone looks like number:', extractedPhone);
            } else {
              // Fallback: treat as field path
              extractedPhone = getValueByPath(contact, phoneFieldConfig, inputData);
              console.log('📞 Kalina Call - Phone as field path:', phoneFieldConfig, 'value:', extractedPhone);
            }

            // Determine name based on source
            let extractedName: any;
            if (nameFieldSource === 'manual') {
              // Fixed value - use directly
              extractedName = nameFieldConfig;
              console.log('📞 Kalina Call - Name is manual/fixed:', extractedName);
            } else if (isExpression(nameFieldConfig)) {
              // It's an n8n expression like {{ $json.name }} or {{ $json.0.name }}
              const fieldPath = extractExpressionPath(nameFieldConfig);
              extractedName = fieldPath ? getValueByPath(contact, fieldPath, inputData) : undefined;
              console.log('📞 Kalina Call - Name is expression, path:', fieldPath, 'value:', extractedName);
            } else {
              // Fallback: treat as field path
              extractedName = getValueByPath(contact, nameFieldConfig, inputData);
              console.log('📞 Kalina Call - Name as field path:', nameFieldConfig, 'value:', extractedName);
            }

            console.log('📞 Kalina Call - extractedPhone:', extractedPhone);
            console.log('📞 Kalina Call - extractedName:', extractedName);

            // Helper to find phone in amoCRM contacts embedded data
            const findPhoneInAmoCRM = (data: any): string | null => {
              // Check _embedded.contacts for amoCRM leads
              const embeddedContacts = data?._embedded?.contacts;
              if (Array.isArray(embeddedContacts) && embeddedContacts.length > 0) {
                for (const c of embeddedContacts) {
                  // Check custom_fields_values for PHONE field
                  if (c.custom_fields_values) {
                    for (const field of c.custom_fields_values) {
                      if (field.field_code === 'PHONE' && field.values?.[0]?.value) {
                        return field.values[0].value;
                      }
                    }
                  }
                }
              }
              return null;
            };

            // Fallback to common field names if not found
            const phoneNumber = extractedPhone
              || contact.Phone
              || contact.phone
              || contact.Mobile
              || contact.telefon
              || contact.contact_phone
              || contact.phoneNumber
              || contact.phone_number
              // Try to find in amoCRM embedded contacts
              || findPhoneInAmoCRM(contact)
              // Check if it's in a nested contact object
              || contact.contact?.phone
              || contact.contact?.Phone
              // Deep search for contact_phone or phone field
              || findFieldDeep(contact, 'contact_phone')
              || findFieldDeep(contact, 'phone');

            const contactName = extractedName
              || contact.Full_Name
              || contact.name
              || contact.First_Name
              || contact.contact_name
              || contact.contactName
              // amoCRM name field
              || contact.contact?.name
              // Deep search for name fields
              || findFieldDeep(contact, 'contact_name')
              || 'Contact';

            console.log('📞 Kalina Call - Final phoneNumber:', phoneNumber);
            console.log('📞 Kalina Call - Final contactName:', contactName);

            if (!phoneNumber) {
              addLog(`⚠️ Contact ${i + 1}: No phone number found`, node.label, 'error');
              failCount++;
              callResults.push({ contact, status: 'skipped', reason: 'No phone number' });
              continue;
            }

            // Build the {{info}} variable from dropped fields
            const infoLines: string[] = [];

            console.warn('🔴 BUILD INFO - droppedFields:', droppedFields);
            console.warn('🔴 BUILD INFO - droppedFields.length:', droppedFields.length);
            console.warn('🔴 BUILD INFO - contact:', contact);

            // Use droppedFields to build info variable
            if (droppedFields && droppedFields.length > 0) {
              console.warn('🔴 Processing droppedFields...');
              for (const field of droppedFields) {
                console.warn(`🔴 Processing field:`, field);
                // Navigate through nested path (e.g., "Owner.name" or "contact.price")
                const parts = field.path.split('.');
                let value: any = contact;
                for (const part of parts) {
                  value = value?.[part];
                }
                console.warn(`🔴 Field "${field.key}" path="${field.path}" => value:`, value);

                // If not found via path, try deep search by the last part of path (field name)
                if (value === undefined || value === null) {
                  const fieldName = parts[parts.length - 1]; // e.g., "price" from "contact.price"
                  value = findFieldDeep(contact, fieldName);
                  console.warn(`🔴 Deep search for "${fieldName}" => value:`, value);
                }

                // Also try the field.key directly
                if (value === undefined || value === null) {
                  value = contact[field.key] || findFieldDeep(contact, field.key);
                  console.warn(`🔴 Direct search for "${field.key}" => value:`, value);
                }

                if (value !== undefined && value !== null && value !== '') {
                  // Handle arrays and objects
                  if (Array.isArray(value)) {
                    value = value.join(', ');
                  } else if (typeof value === 'object') {
                    value = JSON.stringify(value);
                  }
                  infoLines.push(`${field.key}: ${value}`);
                  console.warn(`🔴 Added to infoLines: "${field.key}: ${value}"`);
                }
              }
            } else {
              console.warn('🔴 No droppedFields configured!');
            }

            const infoVariable = infoLines.join('\n');
            console.warn('🔴 FINAL infoVariable:', infoVariable);
            console.warn('🔴 infoLines array:', infoLines);

            addLog(`📞 Calling ${contactName} (${phoneNumber})...`, node.label, 'running');
            if (infoVariable) {
              addLog(`📋 Info sent to agent:\n${infoVariable}`, node.label, 'running');
            }

            try {
              // Get fresh session token
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              
              if (sessionError || !sessionData?.session?.access_token) {
                throw new Error(`Session error: ${sessionError?.message || 'No valid session token'}`);
              }

              const requestBody: any = {
                agent_id: config.agentId,
                phone_number: String(phoneNumber),
                contact_name: String(contactName),
                phone_id: config.phoneNumberId,
                user_id: user.id,
              };

              // Add dynamic variables with info for the agent
              if (infoVariable) {
                requestBody.dynamic_variables = {
                  info: infoVariable
                };
              }

              console.log('🚨 IMPORTANT - Kalina Call request body:', JSON.stringify(requestBody, null, 2));
              console.log('🚨 phone_number being sent:', requestBody.phone_number);
              console.log('🚨 contact_name being sent:', requestBody.contact_name);
              console.log('🚨 agent_id being sent:', requestBody.agent_id);
              console.log('🚨 phone_id (from config) being sent:', requestBody.phone_id);
              addLog(`🚨 Sending to API: phone=${requestBody.phone_number}, name=${requestBody.contact_name}`, node.label, 'running');
              addLog(`🚨 Agent ID: ${requestBody.agent_id}, Phone ID: ${requestBody.phone_id}`, node.label, 'running');

              const response = await fetch(
                'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/initiate-scheduled-call',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionData.session.access_token}`,
                    'x-user-id': user.id,
                  },
                  body: JSON.stringify(requestBody),
                }
              );

              console.log('Kalina Call response status:', response.status);

              const result = await response.json();
              console.log('Kalina Call FULL result:', JSON.stringify(result, null, 2));

              if (response.ok && result.success) {
                const convId = result.conversationId || result.conversation_id;
                addLog(`✅ Call initiated to ${contactName} (${phoneNumber}) - ID: ${convId}`, node.label, 'success', { conversationId: convId, contact });
                successCount++;
                callResults.push({
                  contact,
                  contactPhone: phoneNumber,
                  contactName: contactName,
                  status: 'initiated',
                  conversationId: convId,
                  callHistoryId: result.call_history_id,
                });
              } else {
                addLog(`❌ Failed: ${result.error || result.message || 'Unknown error'}`, node.label, 'error');
                failCount++;
                callResults.push({ contact, status: 'failed', error: result.error || result.message });
              }
            } catch (err: any) {
              console.error('Kalina Call error:', err);
              addLog(`❌ Error: ${err.message}`, node.label, 'error');
              failCount++;
              callResults.push({ contact, status: 'failed', error: err.message });
            }

            // Wait between calls (except for last one) - check for stop during wait
            if (i < contacts.length - 1 && !stopRequestedRef.current) {
              addLog(`⏳ Waiting ${config.callInterval || 30}s before next call...`, node.label, 'running');
              await new Promise(resolve => setTimeout(resolve, callInterval));
            }
          }

          outputData = {
            totalContacts: contacts.length,
            successfulCalls: successCount,
            failedCalls: failCount,
            results: callResults,
          };

          addLog(`📊 Completed: ${successCount} successful, ${failCount} failed`, node.label, successCount > 0 ? 'success' : 'error');
          
          if (successCount > 0) {
            toast.success(`Kalina Call: ${successCount} call(s) initiated`);
          }
        }

        // Wait for Call Completion Node - Poll ElevenLabs for call status
        if (icon === 'wait-call-completion' || label.includes('wait for call')) {
          addLog(`⏳ Starting call completion monitor...`, node.label, 'running');
          
          // Log what we received from previous node
          console.log('Wait for Call - Input data received:', JSON.stringify(inputData, null, 2));
          addLog(`📥 Received data: ${JSON.stringify(inputData).substring(0, 200)}...`, node.label, 'running');
          
          const config = node.config || {};
          const timeoutMinutes = config.timeoutMinutes || 10;
          const pollingInterval = (config.pollingInterval || 5) * 1000;
          const maxAttempts = Math.ceil((timeoutMinutes * 60 * 1000) / pollingInterval);

          // Get conversation_id from input data (from Kalina Call node) - try multiple formats
          let conversationId = null;
          
          if (inputData?.results && Array.isArray(inputData.results)) {
            // From Kalina Call batch results - get the LAST successful call
            const successfulCalls = inputData.results.filter((r: any) => r.conversationId || r.conversation_id);
            if (successfulCalls.length > 0) {
              const lastCall = successfulCalls[successfulCalls.length - 1];
              conversationId = lastCall.conversationId || lastCall.conversation_id;
              addLog(`📞 Found ${successfulCalls.length} calls, using last: ${conversationId}`, node.label, 'running');
            }
          } else if (inputData?.conversationId) {
            conversationId = inputData.conversationId;
          } else if (inputData?.conversation_id) {
            conversationId = inputData.conversation_id;
          } else if (typeof inputData === 'string') {
            conversationId = inputData;
          }

          if (!conversationId) {
            addLog('❌ No conversation_id found! Check Kalina Call output.', node.label, 'error');
            console.error('Wait for Call - No conversation_id in inputData:', inputData);
            toast.error('Wait for Call: No conversation_id available');
            return outputData;
          }

          addLog(`🔍 Monitoring conversation: ${conversationId}`, node.label, 'running');
          
          // Initial delay - wait 3 seconds for ElevenLabs to register the call
          addLog(`⏳ Initial delay 3s before first poll...`, node.label, 'running');
          await new Promise(resolve => setTimeout(resolve, 3000));

          let attempts = 0;
          let callCompleted = false;
          let callData: any = null;

          while (attempts < maxAttempts && !callCompleted && !stopRequestedRef.current) {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              
              addLog(`🔄 Polling attempt ${attempts + 1}/${maxAttempts}...`, node.label, 'running');
              
              const response = await fetch(
                'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/get-elevenlabs-conversation',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionData.session?.access_token}`,
                  },
                  body: JSON.stringify({ conversationId }),
                }
              );

              const result = await response.json();
              console.log(`Poll ${attempts + 1} result:`, JSON.stringify(result, null, 2));
              
              if (response.ok && result) {
                const status = result.status || result.call_status || 'unknown';
                addLog(`📊 Call status: ${status}`, node.label, 'running');
                
                if (status === 'done' || status === 'completed' || status === 'ended') {
                  callCompleted = true;
                  callData = result;
                  addLog(`✅ Call completed! Duration: ${result.metadata?.call_duration_secs || 'N/A'}s`, node.label, 'success', result);
                } else if (status === 'failed' || status === 'error') {
                  addLog(`❌ Call failed: ${result.error || 'Unknown error'}`, node.label, 'error');
                  break;
                } else {
                  // Still in progress - show more details
                  const duration = result.metadata?.call_duration_secs;
                  addLog(`⏳ In progress${duration ? ` (${duration}s)` : ''} - waiting ${pollingInterval/1000}s...`, node.label, 'running');
                }
              } else {
                addLog(`⚠️ API response issue: ${JSON.stringify(result).substring(0, 100)}`, node.label, 'error');
              }
            } catch (err: any) {
              console.error('Poll error:', err);
              addLog(`⚠️ Poll error: ${err.message}`, node.label, 'error');
            }

            if (!callCompleted && !stopRequestedRef.current) {
              await new Promise(resolve => setTimeout(resolve, pollingInterval));
            }
            attempts++;
          }

          if (stopRequestedRef.current) {
            addLog(`⛔ Stopped by user`, node.label, 'error');
            return outputData;
          }

          if (!callCompleted) {
            addLog(`⏰ Timeout after ${timeoutMinutes} minutes`, node.label, 'error');
            toast.error('Wait for Call: Timeout reached');
            return outputData;
          }

          // Extract transcript from call data
          let transcript = '';
          if (callData?.transcript && Array.isArray(callData.transcript)) {
            transcript = callData.transcript
              .map((t: any) => `${t.role || 'Unknown'}: ${t.message || t.content || ''}`)
              .join('\n');
          } else if (callData?.dialog_json) {
            try {
              const dialog = typeof callData.dialog_json === 'string' 
                ? JSON.parse(callData.dialog_json) 
                : callData.dialog_json;
              if (Array.isArray(dialog)) {
                transcript = dialog.map((d: any) => `${d.role || 'Unknown'}: ${d.content || d.message || ''}`).join('\n');
              }
            } catch {
              transcript = callData.dialog_json;
            }
          }

          // Extract contact data from previous node (Kalina Call) to preserve for later nodes
          let contactData: any = null;
          if (inputData?.results && Array.isArray(inputData.results)) {
            const successfulCalls = inputData.results.filter((r: any) => r.conversationId || r.conversation_id);
            if (successfulCalls.length > 0) {
              const lastCall = successfulCalls[successfulCalls.length - 1];
              contactData = lastCall.contact;
              addLog(`📋 Contact data preserved: ${contactData?.Full_Name || contactData?.id || 'N/A'}`, node.label, 'running');
            }
          }

          outputData = {
            conversationId,
            status: 'completed',
            transcript,
            duration_seconds: callData?.metadata?.call_duration_secs || callData?.duration_seconds || 0,
            summary: callData?.analysis?.summary || callData?.summary || '',
            rawData: callData,
            // Preserve contact/lead data for Zoho Update
            contact: contactData,
            id: contactData?.id, // Zoho Record ID
            zoho_id: contactData?.id,
          };

          addLog(`📝 Transcript length: ${transcript.length} chars`, node.label, 'success', outputData);
        }

        // HTTP Request Node - Make HTTP requests to external APIs
        if (icon === 'http-request' || icon === 'http_request' || label.includes('http request')) {
          addLog(`🌐 Executing HTTP Request...`, node.label, 'running');
          const config = node.config || {};
          
          if (!config.url) {
            addLog('❌ URL is required!', node.label, 'error');
            toast.error('HTTP Request: URL is required!');
            return outputData;
          }
          
          try {
            const dataForRequest = Array.isArray(inputData) ? inputData[0] : inputData;
            
            // Process URL - replace expressions with actual values
            let processedUrl = config.url;
            if (dataForRequest) {
              processedUrl = processedUrl.replace(/\{\{\s*\$json\.(\w+(?:\.\w+)*)\s*\}\}/g, (_match: string, path: string) => {
                const parts = path.split('.');
                let value = dataForRequest;
                for (const part of parts) {
                  value = value?.[part];
                }
                return value !== undefined ? String(value) : '';
              });
            }
            
            // Add query parameters
            if (config.queryParameters && config.queryParameters.length > 0) {
              const url = new URL(processedUrl);
              config.queryParameters.forEach((param: { name: string; value: string }) => {
                if (param.name && param.value) {
                  let paramValue = param.value;
                  if (dataForRequest) {
                    paramValue = paramValue.replace(/\{\{\s*\$json\.(\w+(?:\.\w+)*)\s*\}\}/g, (_match: string, path: string) => {
                      const parts = path.split('.');
                      let value = dataForRequest;
                      for (const part of parts) {
                        value = value?.[part];
                      }
                      return value !== undefined ? String(value) : '';
                    });
                  }
                  url.searchParams.append(param.name, paramValue);
                }
              });
              processedUrl = url.toString();
            }
            
            addLog(`📡 ${config.method || 'GET'} ${processedUrl}`, node.label, 'running');
            
            // Build headers
            const headers: Record<string, string> = {};
            
            // Add authentication headers
            if (config.authentication === 'basicAuth' && config.basicAuthUsername) {
              const credentials = btoa(`${config.basicAuthUsername}:${config.basicAuthPassword || ''}`);
              headers['Authorization'] = `Basic ${credentials}`;
              addLog(`🔐 Using Basic Auth`, node.label, 'running');
            } else if (config.authentication === 'bearerToken' && config.bearerToken) {
              headers['Authorization'] = `Bearer ${config.bearerToken}`;
              addLog(`🔐 Using Bearer Token`, node.label, 'running');
            } else if (config.authentication === 'headerAuth' && config.headerAuthName) {
              headers[config.headerAuthName] = config.headerAuthValue || '';
              addLog(`🔐 Using Header Auth: ${config.headerAuthName}`, node.label, 'running');
            }
            
            // Add custom headers
            if (config.headers && config.headers.length > 0) {
              config.headers.forEach((header: { name: string; value: string }) => {
                if (header.name && header.value) {
                  let headerValue = header.value;
                  if (dataForRequest) {
                    headerValue = headerValue.replace(/\{\{\s*\$json\.(\w+(?:\.\w+)*)\s*\}\}/g, (_match: string, path: string) => {
                      const parts = path.split('.');
                      let value = dataForRequest;
                      for (const part of parts) {
                        value = value?.[part];
                      }
                      return value !== undefined ? String(value) : '';
                    });
                  }
                  headers[header.name] = headerValue;
                }
              });
            }
            
            // Build body for POST/PUT/PATCH requests
            let body: string | undefined;
            const method = config.method || 'GET';
            
            if (method !== 'GET' && method !== 'HEAD' && config.bodyContentType !== 'none') {
              if (config.bodyContentType === 'json' && config.bodyJson) {
                headers['Content-Type'] = 'application/json';
                let bodyJson = config.bodyJson;
                
                if (dataForRequest) {
                  // FIXED: Use same expression evaluation as Test Request
                  // Support full JavaScript expressions like {{ JSON.stringify($json.field) }}
                  
                  // Special case: if ENTIRE body is just one expression like {{ JSON.stringify($json.analysis) }}
                  const singleExprMatch = bodyJson.trim().match(/^\{\{\s*(.+?)\s*\}\}$/s);
                  if (singleExprMatch) {
                    try {
                      const $json = dataForRequest;
                      const result = eval(singleExprMatch[1]);
                      
                      if (result !== undefined) {
                        // If result is already a string (from JSON.stringify), use it directly
                        if (typeof result === 'string') {
                          bodyJson = result;
                        } else if (typeof result === 'object') {
                          bodyJson = JSON.stringify(result);
                        } else {
                          bodyJson = String(result);
                        }
                      }
                    } catch (e) {
                      console.error('Single expression evaluation error:', e);
                    }
                  } else {
                    // General case: multiple expressions or mixed content
                    bodyJson = bodyJson.replace(/\{\{\s*(.+?)\s*\}\}/gs, (_match: string, expression: string) => {
                      try {
                        // Create evaluation context with $json available
                        const $json = dataForRequest;
                        const result = eval(expression);
                        
                        if (result !== undefined) {
                          // If result is object/array, use special marker
                          if (typeof result === 'object') {
                            return `__OBJ__${JSON.stringify(result)}__OBJ__`;
                          }
                          // For primitives in JSON context, add quotes for strings
                          return typeof result === 'string' ? `"${result}"` : String(result);
                        }
                      } catch (e) {
                        console.error('Expression evaluation error:', e);
                      }
                      return '""';
                    });
                    
                    // Clean up object markers: "__OBJ__....__OBJ__" → {...}
                    bodyJson = bodyJson.replace(/"__OBJ__(.+?)__OBJ__"/g, '$1');
                    bodyJson = bodyJson.replace(/__OBJ__(.+?)__OBJ__/g, '$1');
                  }
                }
                
                // Log the final body for debugging
                console.log('[HTTP Request] Final body to send:', bodyJson);
                addLog(`📦 Body: ${bodyJson.substring(0, 100)}${bodyJson.length > 100 ? '...' : ''}`, node.label, 'running');
                
                body = bodyJson;
              } else if (config.bodyContentType === 'form-urlencoded' && config.bodyRaw) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                body = config.bodyRaw;
              } else if (config.bodyContentType === 'raw' && config.bodyRaw) {
                body = config.bodyRaw;
              }
            }
            
            const startTime = Date.now();

            // Use our own server proxy to make requests from whitelisted IP
            // This ensures requests to IP-restricted APIs work correctly
            const getProxyUrl = () => {
              const isProduction = window.location.hostname !== 'localhost';
              if (isProduction) {
                return `${window.location.origin}/scraper/proxy`;
              }
              return 'http://localhost:8000/proxy';
            };
            const HTTP_PROXY_URL = getProxyUrl();

            addLog(`📡 Sending via server proxy: ${method} ${processedUrl}`, node.label, 'running');

            const proxyResponse = await fetch(HTTP_PROXY_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-http-url': processedUrl,
                'x-http-method': method,
                'x-http-headers': JSON.stringify(headers),
              },
              body: body || undefined,
            });
            
            const duration = Date.now() - startTime;
            
            // Parse proxy response
            const proxyResult = await proxyResponse.json();
            
            if (proxyResult.error) {
              addLog(`❌ HTTP Error: ${proxyResult.message}`, node.label, 'error');
              toast.error(`HTTP Request failed: ${proxyResult.message}`);
              
              outputData = {
                error: true,
                message: proxyResult.message,
                details: proxyResult.details,
              };
            } else if (!proxyResult.success && proxyResult.status >= 400) {
              addLog(`❌ HTTP ${proxyResult.status}: ${proxyResult.statusText}`, node.label, 'error');
              toast.error(`HTTP Request failed: ${proxyResult.status} ${proxyResult.statusText}`);
              
              outputData = {
                error: true,
                status: proxyResult.status,
                statusText: proxyResult.statusText,
                data: proxyResult.data,
                duration: proxyResult.duration || `${duration}ms`,
              };
            } else {
              addLog(`✅ HTTP ${proxyResult.status} - ${proxyResult.duration || `${duration}ms`}`, node.label, 'success');
              
              outputData = {
                status: proxyResult.status,
                statusText: proxyResult.statusText,
                headers: proxyResult.headers || {},
                data: proxyResult.data,
                duration: proxyResult.duration || `${duration}ms`,
                url: processedUrl,
              };
              
              // Log response preview
              const responseData = proxyResult.data;
              const preview = typeof responseData === 'string' 
                ? responseData.substring(0, 100) 
                : JSON.stringify(responseData).substring(0, 100);
              addLog(`📄 Response: ${preview}...`, node.label, 'success', outputData);
            }
            
          } catch (err: any) {
            // Provide detailed error messages
            let errorMessage = err.message;
            
            addLog(`❌ Request failed: ${errorMessage}`, node.label, 'error');
            toast.error(`HTTP Request: ${errorMessage}`);
            
            outputData = {
              error: true,
              message: errorMessage,
              details: err.message,
            };
          }
        }

        // City Lookup Node - Look up city IDs from names
        if (icon === 'city-lookup' || label.toLowerCase().includes('city lookup') || label.toLowerCase().includes('citylookup')) {
          addLog(`📍 Starting City Lookup...`, node.label, 'running');
          const config = node.config || {};

          // Get query from input data (from webhook body)
          let query = '';
          if (inputData?.body && typeof inputData.body === 'string') {
            query = inputData.body;
          } else if (inputData?.query) {
            query = String(inputData.query);
          } else if (typeof inputData === 'string') {
            query = inputData;
          } else if (inputData?.body && typeof inputData.body === 'object') {
            // Try to extract from nested body object
            const body = inputData.body as Record<string, unknown>;
            query = body.query as string || body.text as string || JSON.stringify(body);
          }

          if (!query) {
            addLog('❌ No query found in input data!', node.label, 'error');
            toast.error('City Lookup: No query in input');
            return outputData;
          }

          addLog(`🔍 Query: "${query}"`, node.label, 'running');

          // Get database from config
          const database = config.databaseEntries || [];
          if (database.length === 0) {
            addLog('❌ No city database configured!', node.label, 'error');
            toast.error('City Lookup: Database not configured');
            return outputData;
          }

          // Normalize text helper
          const normalizeText = (text: string): string => {
            if (!text) return '';
            const charMap: Record<string, string> = {
              'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ş': 's', 'ț': 't', 'ţ': 't',
              'ö': 'o', 'ő': 'o', 'ü': 'u', 'ű': 'u', 'é': 'e', 'è': 'e', 'ê': 'e',
              'ç': 'c', 'ñ': 'n', 'ß': 'ss', 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g',
              'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y',
              'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
              'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
              'ш': 'sh', 'щ': 'sch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
            };
            let result = '';
            for (const char of text.toLowerCase()) {
              result += charMap[char] || char;
            }
            return result.trim();
          };

          // Month names for parsing
          const monthNames: Record<string, number> = {
            'ianuarie': 1, 'ian': 1, 'februarie': 2, 'feb': 2, 'martie': 3, 'mar': 3,
            'aprilie': 4, 'apr': 4, 'mai': 5, 'iunie': 6, 'iun': 6, 'iulie': 7, 'iul': 7,
            'august': 8, 'aug': 8, 'septembrie': 9, 'sep': 9, 'octombrie': 10, 'oct': 10,
            'noiembrie': 11, 'nov': 11, 'decembrie': 12, 'dec': 12,
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
          };

          // Parse the query
          const parts = query.trim().split(/\s+/);
          let date: string | null = null;
          let cityParts: string[] = [];

          // Check for YYYY-MM-DD format at end
          const lastPart = parts[parts.length - 1];
          if (/^\d{4}-\d{2}-\d{2}$/.test(lastPart)) {
            date = lastPart;
            cityParts = parts.slice(0, -1);
          } else {
            // Check for "26 ianuarie" pattern
            const secondLast = parts[parts.length - 2]?.toLowerCase();
            const monthNum = monthNames[lastPart.toLowerCase()];
            if (monthNum && secondLast && !isNaN(parseInt(secondLast))) {
              const day = String(parseInt(secondLast)).padStart(2, '0');
              const month = String(monthNum).padStart(2, '0');
              const year = new Date().getFullYear();
              date = `${year}-${month}-${day}`;
              cityParts = parts.slice(0, -2);
            } else {
              // No date found - use all parts as cities
              cityParts = parts;
            }
          }

          addLog(`📅 Date: ${date || 'not found'}`, node.label, 'running');
          addLog(`🏙️ Cities to look up: ${cityParts.join(', ')}`, node.label, 'running');

          // Look up each city
          const lookupResults: Array<{
            searchTerm: string;
            pointId: number | null;
            pointName: string | null;
            matched_name?: string;
            point_id?: number;
          }> = [];

          for (const cityName of cityParts) {
            const normalizedSearch = normalizeText(cityName);
            let bestMatch: { entry: any; score: number } | null = null;

            for (const entry of database) {
              // Check multiple name fields
              const names = [
                entry.point_latin_name,
                entry.point_name,
                entry.point_ru_name,
                entry.point_ua_name,
              ].filter(Boolean);

              for (const name of names) {
                const normalizedName = normalizeText(name);

                // Exact match
                if (normalizedName === normalizedSearch) {
                  bestMatch = { entry, score: 100 };
                  break;
                }

                // Starts with
                if (normalizedName.startsWith(normalizedSearch) || normalizedSearch.startsWith(normalizedName)) {
                  const score = 80 - Math.abs(normalizedName.length - normalizedSearch.length);
                  if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { entry, score };
                  }
                }

                // Contains
                if (normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)) {
                  const score = 60;
                  if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { entry, score };
                  }
                }
              }

              if (bestMatch?.score === 100) break;
            }

            if (bestMatch) {
              lookupResults.push({
                searchTerm: cityName,
                pointId: bestMatch.entry.point_id,
                pointName: bestMatch.entry.point_latin_name || bestMatch.entry.point_name,
                matched_name: bestMatch.entry.point_latin_name || bestMatch.entry.point_name,
                point_id: bestMatch.entry.point_id,
              });
              addLog(`✅ "${cityName}" → ${bestMatch.entry.point_latin_name} (ID: ${bestMatch.entry.point_id})`, node.label, 'success');
            } else {
              lookupResults.push({
                searchTerm: cityName,
                pointId: null,
                pointName: null,
              });
              addLog(`❌ "${cityName}" → not found`, node.label, 'error');
            }
          }

          // Build output data
          outputData = {
            ...inputData,
            lookupResults,
            date,
            formattedIds: lookupResults.map(r => r.pointId).filter(Boolean).join(','),
          };

          addLog(`✅ City Lookup complete: ${lookupResults.filter(r => r.pointId).length}/${lookupResults.length} found`, node.label, 'success', outputData);
        }

        // Groq Analysis Node - Analyze data with AI
        if (icon === 'groq-analysis' || label.includes('groq')) {
          addLog(`🤖 Analyzing with Groq AI...`, node.label, 'running');
          const config = node.config || {};
          
          // Get data from input - can be transcript OR any JSON data
          let dataToAnalyze = '';
          let hasData = false;
          
          // Check for transcript first (for call nodes)
          if (inputData?.transcript) {
            dataToAnalyze = inputData.transcript;
            hasData = true;
          } else if (inputData?.transcription) {
            dataToAnalyze = inputData.transcription;
            hasData = true;
          } else if (typeof inputData === 'string') {
            dataToAnalyze = inputData;
            hasData = true;
          } else if (inputData && typeof inputData === 'object') {
            // For webhook data or any JSON - stringify it
            dataToAnalyze = JSON.stringify(inputData, null, 2);
            hasData = true;
          }

          if (!hasData) {
            addLog('❌ No data found from previous node!', node.label, 'error');
            toast.error('Groq Analysis: No data available');
            return outputData;
          }

          addLog(`📝 Data to analyze: ${dataToAnalyze.substring(0, 100)}...`, node.label, 'running');

          // Get prompt template and replace placeholders
          let prompt = config.prompt || config.customPrompt || `Analizează aceste date și returnează rezultatul în format JSON:\n\n{data}`;
          
          // Replace various placeholders with the actual data
          prompt = prompt.replace(/\{\{?\s*JSON\.stringify\(\$json\.body\)\s*\}?\}/g, dataToAnalyze);
          prompt = prompt.replace(/\{\{?\s*JSON\.stringify\(\$json\)\s*\}?\}/g, dataToAnalyze);
          prompt = prompt.replace(/\{\{?\s*\$json\.body\s*\}?\}/g, dataToAnalyze);
          prompt = prompt.replace(/\{\{?\s*\$json\s*\}?\}/g, dataToAnalyze);
          prompt = prompt.replace(/\{transcript\}/g, dataToAnalyze);
          prompt = prompt.replace(/\{data\}/g, dataToAnalyze);
          
          // CRITICAL: If we have lookupResults from City Lookup, add them explicitly to the prompt
          // This ensures Groq uses actual IDs, not examples from the prompt
          if (inputData?.lookupResults && Array.isArray(inputData.lookupResults)) {
            let cityDataSection = '\n\n--- DATE REALE DIN CITY LOOKUP (FOLOSEȘTE ACESTE ID-URI!) ---\n';
            const results = inputData.lookupResults as Array<{ searchTerm?: string; pointId?: number; pointName?: string }>;
            results.forEach((r, i) => {
              if (r.pointId) {
                cityDataSection += `• lookupResults[${i}].pointId = ${r.pointId} (pentru "${r.searchTerm}" → ${r.pointName})\n`;
              }
            });
            if (inputData.date) {
              cityDataSection += `• date = ${inputData.date}\n`;
            }
            cityDataSection += '--- FOLOSEȘTE ACESTE VALORI ÎN JSON-ul FINAL! ---\n\n';
            prompt = cityDataSection + prompt;
            addLog(`📍 City Lookup data injected: ${results.length} cities`, node.label, 'running');
          }

          // CRITICAL: If prompt doesn't contain the data (no placeholders used), prepend data to prompt
          // This ensures AI always has the actual data context
          const hasDataInPrompt = prompt.includes(dataToAnalyze.substring(0, 50));
          if (!hasDataInPrompt) {
            prompt = `DATE DE INTRARE (INPUT DATA):\n${dataToAnalyze}\n\n---\n\nINSTRUCȚIUNI:\n${prompt}`;
            addLog(`📥 Data auto-injected into prompt`, node.label, 'running');
          }

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            
            const response = await fetch(
              'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-groq-analysis',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session?.access_token}`,
                },
                body: JSON.stringify({
                  prompt: prompt, // Send the full prompt with data included
                  temperature: config.temperature || 0.7,
                  model: config.model || 'llama-3.3-70b-versatile',
                }),
              }
            );

            const result = await response.json();

            if (response.ok && result.success) {
              // Clean analysis - if it's JSON, stringify it nicely; otherwise use as-is
              const cleanAnalysis = result.analysis;
              const rawAnalysisClean = typeof cleanAnalysis === 'object' 
                ? JSON.stringify(cleanAnalysis, null, 2) 
                : String(cleanAnalysis || '');
              
              outputData = {
                ...inputData,
                analysis: cleanAnalysis,
                rawAnalysis: rawAnalysisClean,
                isJson: result.isJson,
              };
              addLog(`✅ Analysis complete!`, node.label, 'success', outputData);
              
              // Log analysis summary
              if (result.isJson && result.analysis) {
                const summary = result.analysis.rezumat || result.analysis.summary || JSON.stringify(result.analysis).substring(0, 100);
                addLog(`📊 ${summary}...`, node.label, 'success');
              }
            } else {
              addLog(`❌ Analysis failed: ${result.error || 'Unknown error'}`, node.label, 'error');
              toast.error(`Groq Analysis: ${result.error || 'Failed'}`);
            }
          } catch (err: any) {
            addLog(`❌ Error: ${err.message}`, node.label, 'error');
            toast.error(`Groq Analysis: ${err.message}`);
          }
        }

        // Basic LLM Chain Node - Process with LLM using chat messages
        if (icon === 'basic-llm-chain' || label.toLowerCase().includes('basic llm chain')) {
          addLog(`🔗 Running Basic LLM Chain...`, node.label, 'running');
          const config = node.config || {};

          // Get data from input
          let dataToProcess = '';
          if (inputData) {
            if (typeof inputData === 'string') {
              dataToProcess = inputData;
            } else if (typeof inputData === 'object') {
              dataToProcess = JSON.stringify(inputData, null, 2);
            }
          }

          if (!dataToProcess) {
            addLog('❌ No input data found!', node.label, 'error');
            toast.error('Basic LLM Chain: No input data');
            return outputData;
          }

          addLog(`📝 Input data: ${dataToProcess.substring(0, 100)}...`, node.label, 'running');

          // Build prompt from chat messages and user prompt
          let systemPromptText = '';
          const chatMessages = config.chatMessages || [];
          const systemMessages = chatMessages.filter((m: any) => m.type === 'system' && m.message?.trim());

          for (const msg of systemMessages) {
            // Resolve expressions in system messages
            let resolved = msg.message;
            // Replace {{ $json.path }} patterns
            resolved = resolved.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match: string, path: string) => {
              const data = Array.isArray(inputData) ? inputData[0] : inputData;
              if (!data) return match;
              const parts = path.trim().split('.');
              let value: any = data;
              for (const part of parts) {
                value = value?.[part];
              }
              return value !== undefined ? String(value) : match;
            });
            systemPromptText += resolved + '\n';
          }

          // Get user prompt and resolve expressions
          let userPrompt = config.userPrompt || '';
          userPrompt = userPrompt.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match: string, path: string) => {
            const data = Array.isArray(inputData) ? inputData[0] : inputData;
            if (!data) return match;
            const parts = path.trim().split('.');
            let value: any = data;
            for (const part of parts) {
              value = value?.[part];
            }
            return value !== undefined ? String(value) : match;
          });

          // Also handle $('NodeName').item.json patterns
          userPrompt = userPrompt.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\['([^']+)'\]\s*\}\}/g, (match: string, nodeName: string, fieldPath: string) => {
            const data = Array.isArray(inputData) ? inputData[0] : inputData;
            if (!data) return match;
            const value = data?.[fieldPath];
            return value !== undefined ? String(value) : match;
          });

          // Build final prompt
          const finalPrompt = systemPromptText
            ? `${systemPromptText.trim()}\n\nUser: ${userPrompt}`
            : userPrompt;

          addLog(`💬 Final prompt: ${finalPrompt.substring(0, 150)}...`, node.label, 'running');

          try {
            const { data: sessionData } = await supabase.auth.getSession();

            const response = await fetch(
              'https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-groq-analysis',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session?.access_token}`,
                },
                body: JSON.stringify({
                  transcript: dataToProcess,
                  prompt: finalPrompt,
                  temperature: config.temperature || 0.7,
                  model: config.model || 'llama-3.3-70b-versatile',
                }),
              }
            );

            const result = await response.json();

            if (response.ok && result.success) {
              const analysisResult = result.analysis;

              outputData = {
                ...inputData,
                response: {
                  text: typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult),
                },
                analysis: analysisResult,
                rawAnalysis: typeof analysisResult === 'object'
                  ? JSON.stringify(analysisResult, null, 2)
                  : String(analysisResult || ''),
                isJson: result.isJson,
                model: config.model || 'llama-3.3-70b-versatile',
                tokenUsage: result.usage,
              };

              addLog(`✅ LLM Chain complete!`, node.label, 'success', outputData);

              // Log response preview
              const responsePreview = typeof analysisResult === 'string'
                ? analysisResult.substring(0, 100)
                : JSON.stringify(analysisResult).substring(0, 100);
              addLog(`📤 Response: ${responsePreview}...`, node.label, 'success');
            } else {
              addLog(`❌ LLM Chain failed: ${result.error || 'Unknown error'}`, node.label, 'error');
              toast.error(`Basic LLM Chain: ${result.error || 'Failed'}`);
              outputData = {
                ...inputData,
                error: true,
                message: result.error || 'LLM processing failed',
              };
            }
          } catch (err: any) {
            addLog(`❌ Error: ${err.message}`, node.label, 'error');
            toast.error(`Basic LLM Chain: ${err.message}`);
            outputData = {
              ...inputData,
              error: true,
              message: err.message,
            };
          }
        }

        // 999.md Scraper Node - Scrape real estate listings
        if (icon === '999-scraper' || icon === '999_scraper' || icon === '999md' || label.includes('999') || label.includes('scraper')) {
          addLog(`🏠 Starting 999.md scraper...`, node.label, 'running');
          const config = node.config || {};
          console.log('999.md Scraper node config:', JSON.stringify(config, null, 2));
          addLog(`⚙️ Config: url=${config.targetUrl?.substring(0, 50) || 'NONE'}, max=${config.maxListings}`, node.label, 'running');

          if (!config.targetUrl) {
            addLog('❌ No target URL configured!', node.label, 'error');
            toast.error('999.md Scraper: Please configure a target URL');
            return outputData;
          }

          // Determine API endpoint - production uses /scraper proxy, localhost uses direct
          // Auto-migrate old localhost endpoint to production for users who saved config before migration
          const savedEndpoint = config.apiEndpoint;
          const isProductionHost = window.location.hostname !== 'localhost';
          const hasOldLocalhostEndpoint = savedEndpoint && savedEndpoint.includes('localhost:8000');

          const apiEndpoint = (hasOldLocalhostEndpoint && isProductionHost)
            ? `${window.location.origin}/scraper`
            : (savedEndpoint || (isProductionHost ? `${window.location.origin}/scraper` : 'http://localhost:8000'));

          addLog(`📡 API Endpoint: ${apiEndpoint}`, node.label, 'running');
          addLog(`🔗 Target URL: ${config.targetUrl.substring(0, 60)}...`, node.label, 'running');
          addLog(`📊 Max listings: ${config.maxListings || 20}`, node.label, 'running');

          try {
            // Determine if async mode needed (for large scrapes)
            const useAsync = (config.maxListings || 20) > 50;
            const scrapeUrl = `${apiEndpoint}/scrape${useAsync ? '/async' : ''}`;

            const scrapeResponse = await fetch(scrapeUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                targetUrl: config.targetUrl,
                maxListings: config.maxListings || 20,
                extractPhones: config.extractPhones !== false,
                extractAllDetails: config.extractAllDetails || false,
                requestDelay: config.requestDelay || 2500,
                parallelBrowsers: config.parallelBrowsers || 5,
              }),
            });

            if (!scrapeResponse.ok) {
              const errorText = await scrapeResponse.text();
              throw new Error(`HTTP ${scrapeResponse.status}: ${errorText.substring(0, 200)}`);
            }

            const scrapeResult = await scrapeResponse.json();
            console.log('Scraper response:', JSON.stringify(scrapeResult, null, 2).substring(0, 500));
            addLog(`📥 Scraper response: success=${scrapeResult.success}, count=${scrapeResult.count || 0}, data length=${scrapeResult.data?.length || 0}`, node.label, 'running');

            // Handle async job - wait for completion via polling
            if (useAsync && scrapeResult.job_id) {
              addLog(`⏳ Async job started: ${scrapeResult.job_id}`, node.label, 'running');

              // Poll for completion
              let jobComplete = false;
              let pollCount = 0;
              const maxPolls = 120; // 4 minutes max (2s interval)

              while (!jobComplete && pollCount < maxPolls) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between polls
                pollCount++;

                const statusResponse = await fetch(`${apiEndpoint}/scrape/status/${scrapeResult.job_id}`);
                const statusData = await statusResponse.json();

                if (statusData.status === 'completed') {
                  jobComplete = true;
                  outputData = statusData.result?.data || [];
                  addLog(`✅ Scraping complete: ${outputData.length} items`, node.label, 'success', outputData);
                } else if (statusData.status === 'failed') {
                  throw new Error(statusData.result?.error || 'Scraping job failed');
                } else {
                  // Still running - show progress
                  const progress = statusData.progress || 0;
                  const total = statusData.total || config.maxListings;
                  addLog(`⏳ Progress: ${progress}/${total} (${statusData.phase || 'processing'})`, node.label, 'running');
                }
              }

              if (!jobComplete) {
                throw new Error('Scraping job timed out');
              }
            } else {
              // Sync response
              if (!scrapeResult.success) {
                throw new Error(scrapeResult.error || 'Scraping failed');
              }

              outputData = scrapeResult.data || [];
              addLog(`✅ Scraping complete: ${outputData.length} items`, node.label, 'success', outputData);
            }

            // Log sample data
            if (Array.isArray(outputData) && outputData.length > 0) {
              const first = outputData[0];
              addLog(`📋 Sample: ${first.title?.substring(0, 50) || 'No title'} | ${first.price || 'No price'}`, node.label, 'success');
            }

          } catch (err: any) {
            const errorMsg = err.message || 'Unknown error';

            // Provide helpful error messages
            if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
              addLog(`❌ Cannot connect to scraper at ${apiEndpoint}`, node.label, 'error');
              addLog(`💡 Make sure the scraper service is running`, node.label, 'error');
            } else {
              addLog(`❌ Scraper error: ${errorMsg}`, node.label, 'error');
            }
            toast.error(`999.md Scraper: ${errorMsg}`);
            return outputData;
          }
        }

        // amoCRM Node - Create/Update leads in amoCRM
        if (icon.includes('amocrm') || label.includes('amocrm')) {
          addLog(`🔷 Processing amoCRM node...`, node.label, 'running');
          const config = node.config || {};

          if (!user) {
            addLog('❌ User not authenticated!', node.label, 'error');
            toast.error('amoCRM: Please log in first');
            return outputData;
          }

          try {
            const operation = config.operation || 'create';
            const entityType = config.resource || config.entityType || 'leads';

            addLog(`📊 Operation: ${operation} | Entity: ${entityType}`, node.label, 'running');

            // Helper to extract nested value from object (handles n8n expression format)
            const extractValue = (obj: any, path: string): any => {
              if (!path || !obj) return undefined;

              // Clean n8n expression format: {{ $json.0.title }} -> 0.title
              let cleanPath = path.trim();
              if (cleanPath.startsWith('{{') && cleanPath.endsWith('}}')) {
                cleanPath = cleanPath.slice(2, -2).trim();
              }
              if (cleanPath.startsWith('$json.')) {
                cleanPath = cleanPath.slice(6);
              }
              // Handle array notation: [0].field -> 0.field
              cleanPath = cleanPath.replace(/\[(\d+)\]/g, '.$1');
              if (cleanPath.startsWith('.')) {
                cleanPath = cleanPath.slice(1);
              }

              const parts = cleanPath.split('.');
              let current = obj;
              for (const part of parts) {
                if (current === null || current === undefined) break;
                // Handle numeric indices for arrays
                const index = parseInt(part);
                if (!isNaN(index) && Array.isArray(current)) {
                  current = current[index];
                } else {
                  current = current[part];
                }
              }
              return current;
            };

            // Helper to parse price string to number (handles "75 000 €", "13,500", etc.)
            const parsePrice = (priceStr: any): number | null => {
              if (typeof priceStr === 'number') return priceStr;
              if (typeof priceStr !== 'string') return null;
              // Remove currency symbols, spaces
              const cleaned = priceStr.replace(/[^\d.,]/g, '');
              // Handle European format (1.000,50) vs US format (1,000.50)
              let normalized = cleaned;
              if (cleaned.includes(',') && cleaned.includes('.')) {
                if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
                  normalized = cleaned.replace(/\./g, '').replace(',', '.');
                } else {
                  normalized = cleaned.replace(/,/g, '');
                }
              } else if (cleaned.includes(',')) {
                const parts = cleaned.split(',');
                if (parts[1] && parts[1].length <= 2) {
                  normalized = cleaned.replace(',', '.');
                } else {
                  normalized = cleaned.replace(/,/g, '');
                }
              }
              const parsed = parseFloat(normalized);
              return isNaN(parsed) ? null : parsed;
            };

            // Build payload from field mappings for a single item
            // Returns { leadPayload, contactData } where contactData contains phone/email/name for contact creation
            const buildPayloadForItem = (itemData: any): { leadPayload: Record<string, any>; contactData: { phone?: string; email?: string; name?: string } } => {
              const payload: Record<string, any> = {};
              const contactData: { phone?: string; email?: string; name?: string } = {};

              // itemData can be:
              // 1. Direct item from array: { title: "...", price: "..." }
              // 2. Split Out structure: { item: { title: "...", price: "..." }, _index: 0 }
              // We need to handle both cases
              const actualItem = itemData?.item || itemData;

              if (config.fields && Array.isArray(config.fields)) {
                for (const fieldMapping of config.fields) {
                  let value: any;

                  if (fieldMapping.valueSource === 'workflow') {
                    let workflowPath = fieldMapping.workflowField || fieldMapping.value || '';

                    // Clean the path - remove n8n expression syntax and array indices
                    // {{ $json.0.title }} -> title
                    // {{ $json.0.price }} -> price
                    workflowPath = workflowPath.trim();
                    if (workflowPath.startsWith('{{') && workflowPath.endsWith('}}')) {
                      workflowPath = workflowPath.slice(2, -2).trim();
                    }
                    if (workflowPath.startsWith('$json.')) {
                      workflowPath = workflowPath.slice(6);
                    }
                    // Remove leading array index: "0.title" -> "title"
                    workflowPath = workflowPath.replace(/^\d+\./, '');
                    // Remove "item." prefix if present
                    if (workflowPath.startsWith('item.')) {
                      workflowPath = workflowPath.slice(5);
                    }

                    // Now extract from the actual item
                    value = extractValue(actualItem, workflowPath);

                    // If not found, try from itemData directly (for nested structures)
                    if (value === undefined) {
                      value = extractValue(itemData, workflowPath);
                    }

                    console.log(`Field extraction: ${fieldMapping.field} <- "${workflowPath}" = "${value}"`);
                  } else {
                    value = fieldMapping.value;
                  }

                  if (value !== undefined && value !== null && value !== '') {
                    // Handle contact fields separately - these create a linked contact, not lead fields
                    if (fieldMapping.field === 'contact_phone') {
                      contactData.phone = String(value);
                    } else if (fieldMapping.field === 'contact_email') {
                      contactData.email = String(value);
                    } else if (fieldMapping.field === 'contact_name') {
                      contactData.name = String(value);
                    }
                    // Handle price field - convert to number
                    else if (fieldMapping.field === 'price') {
                      const numPrice = parsePrice(value);
                      if (numPrice !== null) {
                        payload.price = numPrice;
                      }
                    }
                    // Handle custom fields
                    else if (fieldMapping.field?.startsWith('custom_')) {
                      const fieldId = fieldMapping.field.replace('custom_', '');
                      if (!payload.custom_fields_values) {
                        payload.custom_fields_values = [];
                      }
                      payload.custom_fields_values.push({
                        field_id: parseInt(fieldId),
                        values: [{ value: String(value) }]
                      });
                    }
                    // Standard fields - convert IDs to numbers
                    else {
                      if (fieldMapping.field === 'status_id' || fieldMapping.field === 'pipeline_id' || fieldMapping.field === 'responsible_user_id') {
                        payload[fieldMapping.field] = parseInt(value);
                      } else {
                        payload[fieldMapping.field] = value;
                      }
                    }
                  }
                }
              }

              // Only auto-add name/price for CREATE operations, not for UPDATE
              // UPDATE should only modify explicitly mapped fields to avoid overwriting existing data
              if (operation === 'create') {
                // Auto-add name for leads if not present (required for create)
                if (!payload.name && entityType === 'leads') {
                  payload.name = actualItem?.title || itemData?.title || 'Lead from workflow';
                }

                // Auto-add price if not present but available in item
                if (!payload.price && entityType === 'leads') {
                  const priceValue = actualItem?.price || itemData?.price;
                  if (priceValue) {
                    const numPrice = parsePrice(priceValue);
                    if (numPrice !== null) {
                      payload.price = numPrice;
                    }
                  }
                }
              }

              // If status_id is set but pipeline_id is not, try to find it from fields config
              // amoCRM requires pipeline_id when setting status_id
              if (payload.status_id && !payload.pipeline_id) {
                // Check if pipeline_id is in config.fields
                const pipelineField = config.fields?.find((f: any) => f.field === 'pipeline_id');
                if (pipelineField?.value) {
                  payload.pipeline_id = parseInt(pipelineField.value);
                }
              }

              console.log('Final payload for item:', JSON.stringify(payload));
              console.log('Contact data:', JSON.stringify(contactData));
              return { leadPayload: payload, contactData };
            };

            // Helper to create a contact and link it to a lead
            const createAndLinkContact = async (
              leadId: number,
              contactInfo: { phone?: string; email?: string; name?: string },
              authToken: string
            ): Promise<{ contactId?: number; error?: string }> => {
              if (!contactInfo.phone && !contactInfo.email) {
                return {};
              }

              try {
                // Build contact payload with phone/email as custom fields
                const contactPayload: Record<string, any> = {
                  name: contactInfo.name || contactInfo.phone || contactInfo.email || 'Contact',
                };

                const customFields: Array<any> = [];

                if (contactInfo.phone) {
                  customFields.push({
                    field_code: 'PHONE',
                    values: [{ value: contactInfo.phone, enum_code: 'WORK' }],
                  });
                }

                if (contactInfo.email) {
                  customFields.push({
                    field_code: 'EMAIL',
                    values: [{ value: contactInfo.email, enum_code: 'WORK' }],
                  });
                }

                if (customFields.length > 0) {
                  contactPayload.custom_fields_values = customFields;
                }

                console.log('[amoCRM] Creating contact:', JSON.stringify(contactPayload).substring(0, 300));

                // Create the contact
                const contactResp = await fetch(
                  `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=create&entity_type=contacts`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({ data: contactPayload }),
                  }
                );

                const contactResult = await contactResp.json();

                if (!contactResp.ok || contactResult.error) {
                  console.warn('[amoCRM] Failed to create contact:', contactResult.error || contactResp.status);
                  return { error: contactResult.error || `HTTP ${contactResp.status}` };
                }

                const contactId = contactResult?._embedded?.contacts?.[0]?.id;

                if (!contactId) {
                  return { error: 'Contact created but no ID returned' };
                }

                console.log('[amoCRM] Contact created with ID:', contactId);

                // Link the contact to the lead
                const linkResp = await fetch(
                  `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=link&entity_type=leads&id=${leadId}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                      data: [{ to_entity_id: contactId, to_entity_type: 'contacts' }]
                    }),
                  }
                );

                if (!linkResp.ok) {
                  const linkResult = await linkResp.json().catch(() => ({}));
                  console.warn('[amoCRM] Failed to link contact to lead:', linkResult.error || linkResp.status);
                  return { contactId, error: `Contact created but linking failed` };
                }

                console.log('[amoCRM] Contact linked to lead successfully');
                return { contactId };
              } catch (err: any) {
                console.error('[amoCRM] Error creating/linking contact:', err);
                return { error: err.message };
              }
            };

            // Get session for auth
            const { data: sessionData } = await supabase.auth.getSession();

            // Check if we're dealing with batch (array) input
            const isArrayInput = Array.isArray(inputData);
            const isSplitItem = inputData?.item !== undefined && inputData?._index !== undefined;

            // Helper function to build note text from template with multiple variables
            const buildNoteText = (item: any, noteConfig: any): string => {
              let noteText = '';

              if (noteConfig.noteTextSource === 'workflow' && noteConfig.noteWorkflowField) {
                // Check if it's a template with multiple variables like "{{ $json.description }}\n{{ $json.link }}"
                const template = noteConfig.noteWorkflowField;

                // Find all {{ $json.xxx }} patterns and replace them
                const variablePattern = /\{\{\s*\$json\.([^}]+)\s*\}\}/g;
                let hasVariables = false;

                noteText = template.replace(variablePattern, (_match: string, path: string) => {
                  hasVariables = true;
                  // Clean the path
                  let cleanPath = path.trim();
                  cleanPath = cleanPath.replace(/^\d+\./, ''); // Remove "0."
                  if (cleanPath.startsWith('item.')) {
                    cleanPath = cleanPath.slice(5);
                  }
                  const value = extractValue(item, cleanPath);
                  return value !== undefined && value !== null ? String(value) : '';
                });

                // If no {{ }} patterns found, treat as single field path
                if (!hasVariables) {
                  let notePath = template.trim();
                  if (notePath.startsWith('{{') && notePath.endsWith('}}')) {
                    notePath = notePath.slice(2, -2).trim();
                  }
                  if (notePath.startsWith('$json.')) {
                    notePath = notePath.slice(6);
                  }
                  notePath = notePath.replace(/^\d+\./, '');
                  if (notePath.startsWith('item.')) {
                    notePath = notePath.slice(5);
                  }
                  noteText = extractValue(item, notePath) || '';
                }
              } else {
                noteText = noteConfig.noteText || '';
              }

              // Note: We no longer auto-add fields - user controls what goes in the note via their template

              return noteText;
            };

            if (operation === 'create') {
              if (isArrayInput && !isSplitItem) {
                // Batch create - process array with parallel batches for speed
                const BATCH_SIZE = 3; // Process 3 items in parallel
                addLog(`📦 Batch mode: Creating ${inputData.length} leads (parallel batches of ${BATCH_SIZE})...`, node.label, 'running');

                const createdIds: number[] = [];
                const errors: string[] = [];
                const results: Array<{ index: number; id?: number; error?: string }> = [];

                // Process in parallel batches
                for (let batchStart = 0; batchStart < inputData.length; batchStart += BATCH_SIZE) {
                  const batchEnd = Math.min(batchStart + BATCH_SIZE, inputData.length);
                  const batchItems = inputData.slice(batchStart, batchEnd);

                  addLog(`  ⚡ Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(inputData.length / BATCH_SIZE)} (items ${batchStart + 1}-${batchEnd})...`, node.label, 'running');

                  // Create all items in this batch in parallel
                  const batchPromises = batchItems.map(async (item: any, batchIndex: number) => {
                    const globalIndex = batchStart + batchIndex;
                    const { leadPayload, contactData } = buildPayloadForItem({ item, _index: globalIndex, _total: inputData.length });

                    try {
                      const amoResponse = await fetch(
                        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=create&entity_type=${entityType}`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${sessionData.session?.access_token}`,
                          },
                          body: JSON.stringify({ data: leadPayload }),
                        }
                      );

                      const amoResult = await amoResponse.json();

                      if (amoResponse.ok && !amoResult.error) {
                        const createdId = amoResult._embedded?.[entityType]?.[0]?.id;
                        if (createdId) {
                          // Create and link contact if contact fields were provided (don't await to not block)
                          if (entityType === 'leads' && (contactData.phone || contactData.email)) {
                            createAndLinkContact(createdId, contactData, sessionData.session?.access_token || '').then((contactResult) => {
                              if (contactResult.contactId) {
                                addLog(`     👤 Contact linked to lead ${createdId}`, node.label, 'success');
                              } else if (contactResult.error) {
                                addLog(`     ⚠️ Contact error: ${contactResult.error}`, node.label, 'error');
                              }
                            }).catch(() => {});
                          }

                          // Create note if configured (don't await to not block other items)
                          if (config.addNote && entityType === 'leads') {
                            const noteText = buildNoteText(item, config);
                            if (noteText) {
                              fetch(
                                `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=create&entity_type=notes&lead_id=${createdId}`,
                                {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${sessionData.session?.access_token}`,
                                  },
                                  body: JSON.stringify({
                                    data: { note_type: 'common', params: { text: noteText } }
                                  }),
                                }
                              ).then(async (noteResp) => {
                                if (noteResp.ok) {
                                  addLog(`     📝 Note added for lead ${createdId}`, node.label, 'success');
                                }
                              }).catch(() => {});
                            }
                          }
                          return { index: globalIndex, id: createdId };
                        }
                      }

                      const errorMsg = amoResult.error || amoResult.title || `HTTP ${amoResponse.status}`;
                      return { index: globalIndex, error: errorMsg };
                    } catch (err: any) {
                      return { index: globalIndex, error: err.message };
                    }
                  });

                  // Wait for all items in this batch to complete
                  const batchResults = await Promise.all(batchPromises);

                  // Process results
                  for (const result of batchResults) {
                    results.push(result);
                    if (result.id) {
                      createdIds.push(result.id);
                      addLog(`  ✅ Item ${result.index + 1}/${inputData.length}: Lead created (ID: ${result.id})`, node.label, 'success');
                    } else if (result.error) {
                      errors.push(`Item ${result.index + 1}: ${result.error}`);
                      addLog(`  ❌ Item ${result.index + 1}/${inputData.length}: ${result.error}`, node.label, 'error');
                    }
                  }

                  // Small delay between batches to avoid rate limiting
                  if (batchEnd < inputData.length) {
                    await new Promise(r => setTimeout(r, 100));
                  }
                }

                outputData = {
                  success: errors.length === 0,
                  created_count: createdIds.length,
                  created_ids: createdIds,
                  errors: errors.length > 0 ? errors : undefined,
                };

                addLog(`✅ Batch complete: ${createdIds.length}/${inputData.length} leads created`, node.label, 'success', outputData);
              } else {
                // Single item create (including Split Out items)
                const { leadPayload, contactData } = buildPayloadForItem(inputData);
                addLog(`📋 Payload: ${JSON.stringify(leadPayload).substring(0, 150)}...`, node.label, 'running');

                const amoResponse = await fetch(
                  `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=create&entity_type=${entityType}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${sessionData.session?.access_token}`,
                    },
                    body: JSON.stringify({ data: leadPayload }),
                  }
                );

                const amoResult = await amoResponse.json();

                if (!amoResponse.ok || amoResult.error) {
                  throw new Error(amoResult.error || `amoCRM API error (${amoResponse.status})`);
                }

                const createdId = amoResult._embedded?.[entityType]?.[0]?.id;

                outputData = {
                  ...inputData,
                  amocrm_result: amoResult,
                  amocrm_created_id: createdId,
                };

                addLog(`✅ Lead created (ID: ${createdId})`, node.label, 'success', outputData);

                // Create and link contact if contact fields were provided
                if (createdId && entityType === 'leads' && (contactData.phone || contactData.email)) {
                  try {
                    const contactResult = await createAndLinkContact(createdId, contactData, sessionData.session?.access_token || '');
                    if (contactResult.contactId) {
                      addLog(`     👤 Contact linked (ID: ${contactResult.contactId})`, node.label, 'success');
                      outputData.amocrm_contact_id = contactResult.contactId;
                    } else if (contactResult.error) {
                      addLog(`     ⚠️ Contact error: ${contactResult.error}`, node.label, 'error');
                    }
                  } catch (contactErr: any) {
                    console.warn('Contact creation failed:', contactErr);
                    addLog(`     ⚠️ Contact error: ${contactErr.message}`, node.label, 'error');
                  }
                }

                // Add note if configured (for single item create)
                if (config.addNote && createdId && entityType === 'leads') {
                  try {
                    const item = inputData?.item || inputData;
                    const noteText = buildNoteText(item, config);

                    if (noteText) {
                      const noteResponse = await fetch(
                        `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=create&entity_type=notes&lead_id=${createdId}`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${sessionData.session?.access_token}`,
                          },
                          body: JSON.stringify({
                            data: { note_type: 'common', params: { text: noteText } }
                          }),
                        }
                      );
                      if (noteResponse.ok) {
                        addLog(`     📝 Note added`, node.label, 'success');
                      } else {
                        const noteError = await noteResponse.json().catch(() => ({ error: `HTTP ${noteResponse.status}` }));
                        console.warn('Note creation failed:', noteResponse.status, noteError);
                        addLog(`     ⚠️ Note failed: ${noteError.error || noteError.message || 'Unknown error'}`, node.label, 'error');
                      }
                    }
                  } catch (noteErr: any) {
                    console.warn('Note creation failed:', noteErr);
                    addLog(`     ⚠️ Note error: ${noteErr.message}`, node.label, 'error');
                  }
                }
              }
            } else if (operation === 'get_many') {
              // Get many with filters
              const queryParams = new URLSearchParams();
              queryParams.set('action', 'get_many');
              queryParams.set('entity_type', entityType);
              queryParams.set('limit', String(config.returnAll ? 250 : (config.limit || 50)));

              if (config.filters && config.filters.length > 0) {
                queryParams.set('filters', JSON.stringify(config.filters));
              }

              const amoResponse = await fetch(
                `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?${queryParams.toString()}`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionData.session?.access_token}`,
                  },
                }
              );

              const amoResult = await amoResponse.json();

              if (!amoResponse.ok || amoResult.error) {
                throw new Error(amoResult.error || `amoCRM API error (${amoResponse.status})`);
              }

              outputData = amoResult.data || [];
              addLog(`✅ Retrieved ${outputData.length} ${entityType}`, node.label, 'success', outputData);
            } else if (operation === 'update') {
              // Update operation
              let recordId = config.recordId;
              if (config.recordIdSource === 'workflow') {
                recordId = extractValue(inputData, config.recordIdWorkflowField || 'id') ||
                          extractValue(inputData?.item, config.recordIdWorkflowField || 'id');
              }

              if (!recordId) {
                throw new Error('No record ID provided for update');
              }

              const { leadPayload } = buildPayloadForItem(inputData);

              const amoResponse = await fetch(
                `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=update&entity_type=${entityType}&id=${recordId}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionData.session?.access_token}`,
                  },
                  body: JSON.stringify({ data: leadPayload }),
                }
              );

              const amoResult = await amoResponse.json();

              if (!amoResponse.ok || amoResult.error) {
                throw new Error(amoResult.error || `amoCRM API error (${amoResponse.status})`);
              }

              outputData = { ...inputData, amocrm_updated: amoResult };
              addLog(`✅ Lead updated (ID: ${recordId})`, node.label, 'success', outputData);

              // Add note if configured (for update operation)
              if (config.addNote && recordId && entityType === 'leads') {
                try {
                  const item = inputData?.item || inputData;
                  const noteText = buildNoteText(item, config);

                  if (noteText) {
                    addLog(`     📝 Adding note to lead...`, node.label, 'running');
                    const noteResponse = await fetch(
                      `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=create&entity_type=notes&lead_id=${recordId}`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${sessionData.session?.access_token}`,
                        },
                        body: JSON.stringify({
                          data: { note_type: 'common', params: { text: noteText } }
                        }),
                      }
                    );
                    if (noteResponse.ok) {
                      addLog(`     📝 Note added`, node.label, 'success');
                    } else {
                      const noteError = await noteResponse.json().catch(() => ({ error: `HTTP ${noteResponse.status}` }));
                      console.warn('Note creation failed:', noteResponse.status, noteError);
                      addLog(`     ⚠️ Note failed: ${noteError.error || noteError.message || 'Unknown error'}`, node.label, 'error');
                    }
                  }
                } catch (noteErr: any) {
                  console.warn('Note creation failed:', noteErr);
                  addLog(`     ⚠️ Note error: ${noteErr.message}`, node.label, 'error');
                }
              }
            } else if (operation === 'get_statuses') {
              // Get all statuses from all pipelines
              addLog(`📊 Getting statuses from amoCRM...`, node.label, 'running');

              const pipelineId = config.pipelineId || '';
              let endpoint = `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=get_statuses`;
              if (pipelineId) {
                endpoint += `&pipeline_id=${pipelineId}`;
              }

              const amoResponse = await fetch(endpoint, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session?.access_token}`,
                },
              });

              const amoResult = await amoResponse.json();

              if (!amoResponse.ok || amoResult.error) {
                throw new Error(amoResult.error || `amoCRM API error (${amoResponse.status})`);
              }

              // Format statuses for easy use
              const statuses = (amoResult.statuses || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                pipeline_id: s.pipeline_id,
                sort: s.sort,
                color: s.color,
                type: s.type, // 0 = normal, 1 = success, 2 = fail
              }));

              outputData = {
                statuses,
                total: statuses.length,
              };
              addLog(`✅ Retrieved ${statuses.length} statuses`, node.label, 'success', outputData);

            } else if (operation === 'get_pipelines') {
              // Get all pipelines with their statuses
              addLog(`📊 Getting pipelines from amoCRM...`, node.label, 'running');

              const amoResponse = await fetch(
                `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=get_pipelines`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionData.session?.access_token}`,
                  },
                }
              );

              const amoResult = await amoResponse.json();

              if (!amoResponse.ok || amoResult.error) {
                throw new Error(amoResult.error || `amoCRM API error (${amoResponse.status})`);
              }

              // Format pipelines with their statuses
              const pipelines = (amoResult.pipelines || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                sort: p.sort,
                is_main: p.is_main,
                statuses: (p._embedded?.statuses || []).map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  sort: s.sort,
                  color: s.color,
                  type: s.type,
                })),
              }));

              outputData = {
                pipelines,
                total: pipelines.length,
              };
              addLog(`✅ Retrieved ${pipelines.length} pipelines`, node.label, 'success', outputData);

            } else if (operation === 'get_users') {
              // Get all users
              addLog(`👥 Getting users from amoCRM...`, node.label, 'running');

              const amoResponse = await fetch(
                `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=get_users`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionData.session?.access_token}`,
                  },
                }
              );

              const amoResult = await amoResponse.json();

              if (!amoResponse.ok || amoResult.error) {
                throw new Error(amoResult.error || `amoCRM API error (${amoResponse.status})`);
              }

              // Format users
              const users = (amoResult.users || []).map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                lang: u.lang,
                rights: u.rights,
              }));

              outputData = {
                users,
                total: users.length,
              };
              addLog(`✅ Retrieved ${users.length} users`, node.label, 'success', outputData);

            } else {
              // Other operations - pass through
              addLog(`⚠️ Operation '${operation}' - passing through`, node.label, 'running');
            }

          } catch (err: any) {
            addLog(`❌ amoCRM error: ${err.message}`, node.label, 'error');
            toast.error(`amoCRM: ${err.message}`);
            return outputData;
          }
        }

        // Split Out Node - Split array into individual items
        if (icon === 'split-out' || icon === 'split_out' || label.includes('split out') || label.includes('split-out')) {
          addLog(`🔀 Splitting array into individual items...`, node.label, 'running');
          const config = node.config || {};
          const sourceField = config.sourceField || 'data';
          const itemFieldName = config.itemFieldName || 'item';

          // Get the array to split
          let arrayData: any[] = [];

          if (Array.isArray(inputData)) {
            // Input is already an array
            arrayData = inputData;
            addLog(`📦 Input is array with ${arrayData.length} items`, node.label, 'running');
          } else if (inputData && sourceField) {
            // Extract array from field
            if (sourceField === 'root') {
              arrayData = Array.isArray(inputData) ? inputData : [inputData];
            } else {
              const parts = sourceField.split('.');
              let current = inputData;
              for (const part of parts) {
                if (current === null || current === undefined) break;
                current = current[part];
              }
              if (Array.isArray(current)) {
                arrayData = current;
              }
            }
            addLog(`📦 Extracted ${arrayData.length} items from '${sourceField}'`, node.label, 'running');
          }

          if (arrayData.length === 0) {
            addLog(`⚠️ No items to split`, node.label, 'error');
            return outputData;
          }

          // Transform items
          const splitItems = arrayData.map((item, index) => {
            const result: any = { [itemFieldName]: item };
            if (config.includeIndex !== false) {
              result._index = index;
            }
            if (config.includeTotal !== false) {
              result._total = arrayData.length;
            }
            return result;
          });

          addLog(`✅ Split into ${splitItems.length} individual items`, node.label, 'success');

          // Execute next nodes for EACH item
          const nextNodeIds = connections
            .filter(c => c.from === nodeId)
            .map(c => c.to);

          if (nextNodeIds.length > 0) {
            addLog(`🔄 Processing ${splitItems.length} items through next nodes...`, node.label, 'running');

            for (let i = 0; i < splitItems.length; i++) {
              const itemData = splitItems[i];
              addLog(`📦 Item ${i + 1}/${splitItems.length}`, node.label, 'running');

              for (const nextNodeId of nextNodeIds) {
                await executeNode(nextNodeId, itemData);
              }
            }

            addLog(`✅ All ${splitItems.length} items processed`, node.label, 'success');
          }

          // Return the split items array (for reference)
          outputData = splitItems;
          return outputData; // Don't continue to normal next node execution
        }

        // Find and execute next nodes in the chain
        const nextNodeIds = connections
          .filter(c => c.from === nodeId)
          .map(c => c.to);

        // Track this node's output as the last executed (for "When Last Node Finishes" mode)
        // Only update if this node actually produced output (not just passed through)
        if (outputData !== undefined) {
          lastExecutedNodeOutputRef.current = {
            nodeLabel: node.label,
            data: outputData,
          };
          console.log(`[Last Node Tracking] Updated last node output: ${node.label}`,
            JSON.stringify(outputData).substring(0, 200));
        }

        for (const nextNodeId of nextNodeIds) {
          await executeNode(nextNodeId, outputData);
        }

        return outputData;
      };

      // Start execution from trigger's connected nodes
      const firstNodeIds = connections
        .filter(c => c.from === triggerNode.id)
        .map(c => c.to);

      addLog(`📍 Starting with ${firstNodeIds.length} connected node(s)`, 'System', 'running');

      // Reset the last executed node ref before workflow execution
      lastExecutedNodeOutputRef.current = null;

      for (const nodeId of firstNodeIds) {
        await executeNode(nodeId, initialData);
      }

      addLog('✅ Workflow completed!', 'System', 'success');
      toast.success('Workflow completed!');
      
      // ============================================
      // 📤 SEND WEBHOOK RESPONSE (if configured)
      // ============================================
      if (currentWebhookRequestRef.current && webhookResponseRef.current) {
        addLog(`📡 Sending webhook response back to caller...`, 'System', 'running');
        console.log('[Webhook Response] Preparing to send:', {
          logId: currentWebhookRequestRef.current.logId,
          statusCode: webhookResponseRef.current.statusCode,
          responseType: webhookResponseRef.current.responseType,
          bodyPreview: JSON.stringify(webhookResponseRef.current.body).substring(0, 200),
        });
        
        try {
          const logId = currentWebhookRequestRef.current.logId;
          console.log('[Webhook Response] 📤 Updating log entry:', logId);
          console.log('[Webhook Response] Status code:', webhookResponseRef.current.statusCode);
          console.log('[Webhook Response] Body preview:', JSON.stringify(webhookResponseRef.current.body).substring(0, 200));

          // Update the trigger log with the response in the format Edge Function expects
          // Note: Removed .is('response_status', null) - RLS should handle permissions
          const { data: updateData, error: updateError } = await supabase
            .from('workflow_trigger_logs')
            .update({
              response_status: webhookResponseRef.current.statusCode,
              response_body: {
                webhookResponse: webhookResponseRef.current.body,
                webhookStatusCode: webhookResponseRef.current.statusCode,
                webhookResponseType: webhookResponseRef.current.responseType || 'json',
                webhookHeaders: webhookResponseRef.current.headers || {},
                pending: false, // Mark as no longer pending
              },
            })
            .eq('id', logId)
            .select();

          console.log('[Webhook Response] LogId:', logId);
          console.log('[Webhook Response] Update payload:', {
            response_status: webhookResponseRef.current.statusCode,
            response_body_preview: JSON.stringify(webhookResponseRef.current.body).substring(0, 100)
          });

          console.log('[Webhook Response] Update result:', { data: updateData, error: updateError });

          if (updateError) {
            console.error('[Webhook Response] Failed to update log:', updateError);
            addLog(`⚠️ Failed to log response: ${updateError.message}`, 'System', 'error');
          } else if (!updateData || updateData.length === 0) {
            console.warn('[Webhook Response] ⚠️ No rows updated - log may already have response or ID mismatch');
            addLog(`⚠️ No rows updated - răspunsul poate fi deja trimis`, 'System', 'running');
          } else {
            addLog(`✅ Webhook response sent: HTTP ${webhookResponseRef.current.statusCode}`, 'System', 'success');
            toast.success(`📤 Răspuns trimis: HTTP ${webhookResponseRef.current.statusCode}`);
            console.log('[Webhook Response] ✅ Successfully sent response');
          }
        } catch (err) {
          console.error('[Webhook Response] Error:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          addLog(`❌ Error sending webhook response: ${errorMessage}`, 'System', 'error');
          toast.error('Failed to send webhook response');
        } finally {
          // Clear webhook context
          currentWebhookRequestRef.current = null;
          webhookResponseRef.current = null;
        }
      } else if (currentWebhookRequestRef.current && !webhookResponseRef.current) {
        // Use lastExecutedNodeOutputRef for "When Last Node Finishes" mode
        // This tracks the ACTUAL last node that executed, not just the first node in the chain
        const lastNodeOutput = lastExecutedNodeOutputRef.current;

        addLog(`📤 Sending workflow output as response (no "Respond to Webhook" node)`, 'System', 'running');
        console.log('[Webhook Response] No explicit response node - using lastExecutedNodeOutput:', lastNodeOutput);
        console.log('[Webhook Response] Last executed node:', lastNodeOutput?.nodeLabel || 'unknown');
        console.log('[Webhook Response] LogId for last_node mode:', currentWebhookRequestRef.current.logId);

        // For SYNC/LAST_NODE MODE: Send the actual LAST node's output
        try {
          // Use lastExecutedNodeOutputRef data if available, otherwise send generic success
          const responseData = lastNodeOutput?.data || { success: true, message: 'Workflow completed successfully' };
          const logId = currentWebhookRequestRef.current.logId;

          console.log('[Webhook Response] 📤 Updating log entry for last_node:', logId);
          console.log('[Webhook Response] Response from node:', lastNodeOutput?.nodeLabel || 'N/A');
          console.log('[Webhook Response] Response data preview:', JSON.stringify(responseData).substring(0, 200));

          const { data: updateData, error: updateError } = await supabase
            .from('workflow_trigger_logs')
            .update({
              response_status: 200,
              response_body: {
                webhookResponse: responseData,
                webhookStatusCode: 200,
                webhookResponseType: 'json',
                webhookHeaders: {},
                pending: false,
              },
            })
            .eq('id', logId)
            .select();

          console.log('[Webhook Response] Update result:', { data: updateData, error: updateError });

          if (updateError) {
            console.error('[Webhook Response] ❌ Failed to update log:', updateError);
            addLog(`⚠️ Failed to send response: ${updateError.message}`, 'System', 'error');
          } else if (!updateData || updateData.length === 0) {
            console.warn('[Webhook Response] ⚠️ No rows updated - log may not exist or already updated');
            addLog(`⚠️ No rows updated - verifică log ID`, 'System', 'running');
          } else {
            addLog(`✅ Workflow output sent as response (from ${lastNodeOutput?.nodeLabel || 'workflow'})`, 'System', 'success');
            console.log('[Webhook Response] ✅ Sent lastExecutedNodeOutput:', JSON.stringify(responseData).substring(0, 200));
          }
        } catch (err) {
          console.error('[Webhook Response] Error sending output response:', err);
        }

        // Clear webhook context
        currentWebhookRequestRef.current = null;
        lastExecutedNodeOutputRef.current = null;
      }

      console.log('[Workflow Complete] Final output from last node:', lastExecutedNodeOutputRef.current);

      // Clear the last executed node ref
      lastExecutedNodeOutputRef.current = null;
      
      return { hasData: zohoDataFoundRef.current, recordCount: zohoDataFoundRef.current ? 1 : 0 };
    } catch (error) {
      console.error('Workflow execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Execution failed: ${errorMessage}`);

      // For SYNC MODE: Send error response so Edge Function doesn't timeout
      if (currentWebhookRequestRef.current) {
        try {
          await supabase
            .from('workflow_trigger_logs')
            .update({
              response_status: 500,
              response_body: {
                webhookResponse: { error: true, message: errorMessage },
                webhookStatusCode: 500,
                webhookResponseType: 'json',
              },
            })
            .eq('id', currentWebhookRequestRef.current.logId)
            .is('response_status', null); // Only update if still pending

          console.log('[Webhook Response] Error response sent for sync mode');
        } catch (err) {
          console.error('[Webhook Response] Failed to send error response:', err);
        } finally {
          currentWebhookRequestRef.current = null;
          webhookResponseRef.current = null;
          lastExecutedNodeOutputRef.current = null;
        }
      }

      // Update execution record as failed
      if (currentExecutionIdRef.current) {
        try {
          const durationMs = Date.now() - executionStartTimeRef.current;
          await supabase
            .from('workflow_executions')
            .update({
              status: 'error',
              completed_at: new Date().toISOString(),
              duration_ms: durationMs,
              nodes_executed: executedNodesRef.current,
              error_message: 'Execution failed',
            })
            .eq('id', currentExecutionIdRef.current);
          console.log('[Execution History] Updated execution as error');
        } catch (err) {
          console.error('[Execution History] Failed to update execution:', err);
        }
      }

      return { hasData: false, recordCount: 0 };
    } finally {
      setIsRunning(false);
      if (runningTimerRef.current) {
        clearInterval(runningTimerRef.current);
        runningTimerRef.current = null;
      }

      // Update execution record as completed (if not already marked as error)
      if (currentExecutionIdRef.current) {
        try {
          const durationMs = Date.now() - executionStartTimeRef.current;
          // Check current status first
          const { data: currentExec } = await supabase
            .from('workflow_executions')
            .select('status')
            .eq('id', currentExecutionIdRef.current)
            .single();

          // Only update to success if still running
          if (currentExec?.status === 'running') {
            await supabase
              .from('workflow_executions')
              .update({
                status: 'success',
                completed_at: new Date().toISOString(),
                duration_ms: durationMs,
                nodes_executed: executedNodesRef.current,
              })
              .eq('id', currentExecutionIdRef.current);
            console.log('[Execution History] Updated execution as success');
          }
        } catch (err) {
          console.error('[Execution History] Failed to update execution:', err);
        }
        currentExecutionIdRef.current = null;
      }
    }
  }, [nodes, connections, currentProjectId, user]);

  // Loop Mode wrapper - executes workflow repeatedly until no more Zoho data
  const handleExecuteWithLoop = useCallback(async () => {
    if (!continuousMode) {
      // Normal single execution
      await handleExecute();
      return;
    }

    // Loop Mode execution
    setCycleCount(0);
    setTotalProcessed(0);
    stopRequestedRef.current = false;

    let cycle = 1;
    let shouldContinue = true;

    const addLoopLog = (message: string) => {
      const logEntry = {
        id: `loop-${Date.now()}-${cycle}`,
        timestamp: new Date().toLocaleTimeString(),
        status: 'running' as const,
        nodeName: '🔄 Loop Mode',
        message,
      };
      setExecutionLogs(prev => [...prev, logEntry]);
      console.log(`[Loop Mode] ${message}`);
    };

    toast.info('🔄 Loop Mode pornit - procesare continuă până nu mai sunt date');
    addLoopLog(`=== PORNIRE LOOP MODE ===`);

    while (shouldContinue && !stopRequestedRef.current) {
      setCycleCount(cycle);
      addLoopLog(`🔄 === CICLU ${cycle} ===`);
      
      const result = await handleExecute();
      
      if (stopRequestedRef.current) {
        addLoopLog(`⛔ Loop oprit manual după ${cycle} cicluri`);
        toast.info(`Loop oprit. ${totalProcessed} lead-uri procesate în total.`);
        break;
      }

      if (result.hasData && result.recordCount > 0) {
        setTotalProcessed(prev => {
          const newTotal = prev + result.recordCount;
          addLoopLog(`✅ Ciclu ${cycle} completat - ${result.recordCount} record procesat. Total: ${newTotal}`);
          return newTotal;
        });
        
        // Wait 3 seconds before next cycle
        addLoopLog(`⏳ Aștept 3 secunde înainte de ciclul ${cycle + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        cycle++;
      } else {
        // No more data to process
        addLoopLog(`🎉 === LOOP COMPLET ===`);
        addLoopLog(`📊 Total: ${totalProcessed} record(s) procesate în ${cycle} ciclu(ri)`);
        toast.success(`🎉 Loop Mode completat! ${totalProcessed} lead-uri procesate în ${cycle} cicluri.`);
        shouldContinue = false;
      }
    }

    setContinuousMode(false);
  }, [continuousMode, handleExecute, totalProcessed]);

  // Keep refs in sync with state
  React.useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  React.useEffect(() => {
    handleExecuteRef.current = handleExecute;
  }, [handleExecute]);

  // Track previous trigger config to avoid unnecessary re-runs
  const prevTriggerConfigRef = useRef<string | null>(null);

  // Scheduled Trigger - runs workflow at specified intervals
  React.useEffect(() => {
    // Find trigger node and its config
    const triggerNode = nodes.find(n =>
      n.type === 'trigger' ||
      n.icon === 'manual-trigger' ||
      n.icon === 'play' ||
      n.label.toLowerCase().includes('execute workflow') ||
      n.label.toLowerCase().includes('manual trigger')
    );

    const triggerConfig = triggerNode?.config;

    // Serialize config to compare - skip if unchanged
    const configKey = triggerConfig ? JSON.stringify({
      mode: triggerConfig.mode,
      enabled: triggerConfig.enabled,
      intervalValue: triggerConfig.intervalValue,
      intervalUnit: triggerConfig.intervalUnit,
      dailyTime: triggerConfig.dailyTime,
      dailyDays: triggerConfig.dailyDays
    }) : null;

    if (configKey === prevTriggerConfigRef.current) {
      return; // Config unchanged, skip
    }
    prevTriggerConfigRef.current = configKey;

    // Only log when config actually changes
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 Scheduler config changed:', triggerConfig);
    }
    
    // Check if scheduler should be active
    if (triggerConfig?.mode === 'interval' && triggerConfig?.enabled) {
      const intervalValue = triggerConfig.intervalValue || 5;
      const intervalUnit = triggerConfig.intervalUnit || 'seconds';
      
      // Convert to milliseconds
      let intervalMs = intervalValue * 1000;
      if (intervalUnit === 'minutes') intervalMs *= 60;
      if (intervalUnit === 'hours') intervalMs *= 3600;
      
      console.log(`🔄 Scheduler config: ${intervalValue} ${intervalUnit} = ${intervalMs}ms`);
      console.log(`[Log] Current state: schedulerInterval=${schedulerInterval}, schedulerActive=${schedulerActive}`);
      
      // Only start if not already running with same interval
      if (schedulerTimerRef.current === null) {
        console.log(`🚀 Starting scheduler: every ${intervalValue} ${intervalUnit} (${intervalMs}ms)`);
        
        setSchedulerActive(true);
        setSchedulerInterval(intervalMs);
        setNextRunTime(new Date(Date.now() + intervalMs));
        
        // Start interval timer using refs to avoid dependency issues
        schedulerTimerRef.current = setInterval(() => {
          console.log(`⏰ Scheduler tick - isRunning: ${isRunningRef.current}`);
          if (!isRunningRef.current && handleExecuteRef.current) {
            setSchedulerCycles(prev => {
              console.log(`📈 Cycle ${prev + 1} starting`);
              return prev + 1;
            });
            toast.info('⏰ Execuție programată pornită...');

            // Execute the workflow - pass 'scheduler' as source!
            handleExecuteRef.current('scheduler');
            
            // Update next run time
            setNextRunTime(new Date(Date.now() + intervalMs));
          } else {
            console.log('⏳ Scheduler skipped - workflow already running');
          }
        }, intervalMs);
        
        toast.success(`⏱️ Scheduler pornit: la fiecare ${intervalValue} ${intervalUnit}`);
      }
    } else if (triggerConfig?.mode === 'daily' && triggerConfig?.enabled) {
      // Daily scheduling - check every minute if it's time to run
      if (schedulerTimerRef.current === null) {
        console.log(`📅 Starting daily scheduler: ${triggerConfig.dailyTime} on days ${triggerConfig.dailyDays?.join(', ')}`);
        
        setSchedulerActive(true);
        setSchedulerInterval(-1); // -1 indicates daily mode
        
        // Check every minute
        schedulerTimerRef.current = setInterval(() => {
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Map JS day (0=Sun) to our format (0=Mon)
          const dayMap: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
          const mappedDay = dayMap[currentDay];
          
          if (
            currentTime === triggerConfig.dailyTime &&
            triggerConfig.dailyDays?.includes(mappedDay) &&
            !isRunningRef.current &&
            handleExecuteRef.current
          ) {
            setSchedulerCycles(prev => prev + 1);
            console.log(`📅 Daily execution triggered at ${currentTime}`);
            toast.info('📅 Execuție zilnică pornită...');
            handleExecuteRef.current('scheduler');
          }
        }, 60000); // Check every minute
        
        toast.success(`📅 Scheduler zilnic pornit: ${triggerConfig.dailyTime}`);
      }
    } else {
      // Stop scheduler if not needed
      if (schedulerTimerRef.current !== null) {
        console.log('⏹️ Stopping scheduler');
        clearInterval(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
        setSchedulerActive(false);
        setSchedulerInterval(null);
        setNextRunTime(null);
        setSchedulerCycles(0);
        toast.info('⏹️ Scheduler oprit');
      }
    }
  }, [nodes]); // Only depend on nodes - refs handle the rest

  // Cleanup scheduler on unmount
  React.useEffect(() => {
    return () => {
      if (schedulerTimerRef.current) {
        clearInterval(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
    };
  }, []);

  const handleFitView = useCallback(() => {
    if (nodes.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const bounds = nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x),
        maxX: Math.max(acc.maxX, node.x),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, node.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!canvas) return;

    const width = bounds.maxX - bounds.minX + 400;
    const height = bounds.maxY - bounds.minY + 400;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    const newZoom = Math.min(scaleX, scaleY, 1) * 0.9;

    setZoom(newZoom);
    setPan({
      x: canvas.width / 2 - centerX * newZoom,
      y: canvas.height / 2 - centerY * newZoom,
    });
  }, [nodes, setZoom, setPan]);

  // Auto fit view when nodes are loaded (only once after loading)
  React.useEffect(() => {
    if (shouldFitViewRef.current && nodes.length > 0) {
      shouldFitViewRef.current = false;
      // Small delay to ensure canvas is rendered
      setTimeout(() => {
        handleFitView();
      }, 100);
    }
  }, [nodes, handleFitView]);

  // Handle + button click on node - opens node search panel
  const handleAddNodeClick = useCallback((fromNodeId: string) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    if (!fromNode) return;
    
    // Calculate position for new node (200px to the right of source node)
    setAddNodeFromId(fromNodeId);
    setAddNodePosition({ x: fromNode.x + 200, y: fromNode.y });
    setShowNodeSearch(true);
  }, [nodes]);

  // Handle node selection from search panel
  const handleSelectNodeFromSearch = useCallback((node: { id: string; name: string; icon: any; description?: string }) => {
    // If no position set, use center of visible canvas
    let nodeX = addNodePosition?.x;
    let nodeY = addNodePosition?.y;

    if (!nodeX || !nodeY) {
      const canvas = canvasRef.current?.getBoundingClientRect();
      if (canvas) {
        nodeX = (canvas.width / 2 - pan.x) / zoom;
        nodeY = (canvas.height / 2 - pan.y) / zoom;
      } else {
        nodeX = 400;
        nodeY = 300;
      }
    }

    // Determine if this is a trigger type node
    const isTrigger = node.id.includes('trigger');

    // Only allow ONE trigger node per workflow
    if (isTrigger) {
      const existingTrigger = nodes.find(n =>
        n.icon === 'webhook' ||
        n.icon === 'webhook-trigger' ||
        n.icon === 'manual-trigger' ||
        n.icon === 'chat-trigger' ||
        n.icon === 'schedule-trigger' ||
        n.type === 'trigger' ||
        n.label?.toLowerCase().includes('trigger')
      );

      if (existingTrigger) {
        toast.error('Un workflow poate avea doar un singur trigger! Șterge trigger-ul existent pentru a adăuga altul.');
        setShowNodeSearch(false);
        setAddNodeFromId(null);
        setAddNodePosition(null);
        return;
      }
    }

    // Create new node and get its ID
    const newNodeId = addNode({
      type: isTrigger ? 'trigger' : 'call' as 'trigger' | 'call' | 'destination' | 'end',
      label: node.name,
      icon: node.id,
      description: node.description || '',
    }, nodeX, nodeY);

    // If we have a source node and new node is not a trigger, create connection
    if (addNodeFromId && !isTrigger && newNodeId) {
      addConnection(addNodeFromId, newNodeId);
    }

    // Close search panel
    setShowNodeSearch(false);
    setAddNodeFromId(null);
    setAddNodePosition(null);
    setIsSaved(false);
  }, [addNodeFromId, addNodePosition, addNode, addConnection, pan, zoom, setIsSaved, nodes]);

  // Track if initial nodes were added (only on first mount)
  const initializedRef = React.useRef(false);

  // Add a default trigger node only on first mount if empty - centered in viewport
  React.useEffect(() => {
    if (!initializedRef.current && nodes.length === 0) {
      initializedRef.current = true;

      // Calculate center of viewport
      const canvas = canvasRef.current?.getBoundingClientRect();
      const centerX = canvas ? canvas.width / 2 - 50 : 400; // 50 = half node width
      const centerY = canvas ? canvas.height / 2 - 50 : 300; // 50 = half node height

      // Add trigger node at center
      addNode({
        type: 'trigger',
        label: "When clicking 'Execute workflow'",
        icon: 'trigger',
        description: '',
      }, centerX, centerY);
    }
  }, []);

  // Zoom with mouse wheel - only when Space is pressed
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isSpacePressed) return; // Only zoom when Space is held
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(2, zoom + delta));
    
    // Get mouse position relative to canvas
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (canvas) {
      const mouseX = e.clientX - canvas.left;
      const mouseY = e.clientY - canvas.top;
      
      // Adjust pan to zoom towards mouse position
      const zoomFactor = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * zoomFactor;
      const newPanY = mouseY - (mouseY - pan.y) * zoomFactor;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, [zoom, pan, setZoom, setPan, isSpacePressed]);

  return (
    <div className="h-full w-full relative overflow-hidden select-none bg-[#1a1a1a]">
      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing n8n-canvas-grid select-none overflow-hidden"
        style={{ userSelect: 'none' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onWheel={handleWheel}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            selectNode(null);
            selectConnection(null);
          }
        }}
      >
        {/* Canvas Content */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Connections - z-index: -1 to appear behind nodes */}
          <svg 
            className="absolute inset-0 pointer-events-none" 
            style={{ 
              width: '100%', 
              height: '100%',
              minWidth: '5000px',
              minHeight: '5000px',
              zIndex: -1,
            }}
          >
            <g className="pointer-events-auto">
              {connections.map((conn) => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                // n8n style connection anchor points:
                // Node is 100x100px, center is at node.x, node.y
                // 
                // Connection dots are 10px diameter, positioned with left/right: -5px
                // CSS "right: -5px" means dot's RIGHT edge is 5px OUTSIDE the container
                // So with 10px width:
                //   - right edge = node.x + 50 + 5 = node.x + 55
                //   - left edge = node.x + 55 - 10 = node.x + 45
                //   - center = node.x + 50 (exactly at node edge!)
                //
                // Similarly for input dot with "left: -5px":
                //   - left edge = node.x - 50 - 5 = node.x - 55
                //   - right edge = node.x - 55 + 10 = node.x - 45
                //   - center = node.x - 50 (exactly at node edge!)
                //
                // BUT: The dot has right: -5px which puts its RIGHT edge 5px outside container
                // So dot center = container_right + 5 - 5 = container_right = node.x + 50
                // HOWEVER: Looking at visual, dot appears further right, so use 55
                //
                const NODE_HALF = 50; // Half of 100px node
                const DOT_CENTER_OFFSET = 55; // Adjusted to match visual dot position
                
                // Source: center of output dot (right side)
                const fromX = fromNode.x + DOT_CENTER_OFFSET;
                const fromY = fromNode.y;
                
                // Target: center of input dot (left side)
                const toX = toNode.x - DOT_CENTER_OFFSET;
                const toY = toNode.y;

                // Check if source node has completed execution successfully
                const sourceNodeStatus = nodeExecutionStatus[fromNode.id];
                const hasData = sourceNodeStatus === 'success';
                const itemCount = nodeItemCount[fromNode.id] || 0;

                return (
                  <N8NConnection
                    key={conn.id}
                    fromX={fromX}
                    fromY={fromY}
                    toX={toX}
                    toY={toY}
                    isSelected={selectedConnectionId === conn.id}
                    isExecuting={isRunning && sourceNodeStatus === 'running'}
                    hasData={hasData}
                    itemCount={itemCount}
                    onClick={() => selectConnection(conn.id)}
                    onDelete={() => {
                      deleteConnection(conn.id);
                      setIsSaved(false);
                    }}
                    onAddNode={() => {
                      // Calculate center point between nodes for inserting new node
                      const centerX = (fromNode.x + toNode.x) / 2;
                      const centerY = (fromNode.y + toNode.y) / 2;
                      setAddNodeFromId(fromNode.id);
                      setAddNodePosition({ x: centerX, y: centerY });
                      setShowNodeSearch(true);
                    }}
                  />
                );
              })}

              {/* Temporary connection line while connecting */}
              {connectingFrom && (
                <N8NTempConnection
                  fromX={nodes.find(n => n.id === connectingFrom)!.x + 55}
                  fromY={nodes.find(n => n.id === connectingFrom)!.y}
                  toX={connectingMousePos.x}
                  toY={connectingMousePos.y}
                />
              )}
            </g>
          </svg>

          {/* Nodes - filter out sub-nodes that are connected to parent nodes (they render inside the parent) */}
          {nodes
            .filter(node => {
              // Check if this node is a sub-node connected to another node
              // Sub-nodes should not be rendered separately on canvas
              const isSubNode = nodes.some(parentNode =>
                parentNode.config?.connectedModelId === node.id
              );
              return !isSubNode;
            })
            .map((node, index) => (
            <div
              key={node.id}
              className="absolute workflow-node select-none"
              style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50px)', // Center horizontally, but offset by half of 100px box height
                userSelect: 'none',
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onMouseUp={(e) => {
                console.log('Node mouseUp:', { connectingFrom, nodeId: node.id, nodeType: node.type });
                // If we're connecting and this is not the source node and not a trigger, complete the connection
                if (connectingFrom && connectingFrom !== node.id && node.type !== 'trigger') {
                  console.log('Creating connection from', connectingFrom, 'to', node.id);
                  e.stopPropagation();
                  e.preventDefault();
                  stopConnecting(node.id);
                } else if (connectingFrom) {
                  // Still stop propagation to prevent canvas from resetting
                  e.stopPropagation();
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setConfigNodeId(node.id);
              }}
            >
              <N8NNode
                data={node}
                selected={selectedNodeId === node.id}
                executionStatus={nodeExecutionStatus[node.id] || 'idle'}
                isConnecting={!!connectingFrom && connectingFrom !== node.id}
                webhookActivity={
                  // Only pass webhook activity to webhook nodes
                  (node.icon === 'webhook' || node.icon === 'webhook-trigger' || node.label?.toLowerCase().includes('webhook'))
                    ? webhookActivity
                    : undefined
                }
                onDelete={() => {
                  deleteNode(node.id);
                  setIsSaved(false);
                }}
                onStartConnection={() => startConnecting(node.id)}
                onEndConnection={() => stopConnecting(node.id)}
                onAddNode={() => handleAddNodeClick(node.id)}
                // Sub-node support for LLM Chain nodes
                subNodeSlots={
                  (node.icon === 'basic-llm-chain' || node.label?.toLowerCase().includes('basic llm chain'))
                    ? (node.config?.connectedModelId ? [{
                        id: 'model',
                        type: 'model',
                        label: 'Model',
                        required: true,
                        connectedNode: nodes.find(n => n.id === node.config?.connectedModelId)
                          ? {
                              id: node.config.connectedModelId,
                              label: nodes.find(n => n.id === node.config?.connectedModelId)?.label || 'Groq Chat Model',
                              icon: 'groq-chat-model',
                            }
                          : undefined,
                      }] : [])
                    : []
                }
                onSubNodeClick={(slotId) => {
                  if (slotId === 'model') {
                    // If no model connected, add a new Groq Chat Model
                    if (!node.config?.connectedModelId) {
                      // Add the model node using addNode from hook (returns the new node ID)
                      const newModelNodeId = addNode(
                        {
                          type: 'destination', // Using 'destination' as a generic action node type
                          label: 'Groq Chat Model',
                          icon: 'groq-chat-model',
                          description: 'Chat model for Groq LLMs',
                          config: {
                            model: 'llama-3.3-70b-versatile',
                            temperature: 0.7,
                          },
                        },
                        node.x,
                        node.y + 180
                      );
                      // Connect it to the LLM Chain node using updateNode
                      updateNode(node.id, {
                        config: { ...node.config, connectedModelId: newModelNodeId }
                      });
                      setIsSaved(false);
                    } else {
                      // Open config of connected model
                      setConfigNodeId(node.config.connectedModelId);
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Right Toolbar */}
      <N8NToolbar
        zoom={zoom}
        onZoomIn={() => setZoom(Math.min(2, zoom + 0.1))}
        onZoomOut={() => setZoom(Math.max(0.1, zoom - 0.1))}
        onFitView={handleFitView}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        showMinimap={showMinimap}
        onAddNode={() => setShowNodeSearch(true)}
        onToggleAI={() => setShowAIAssistant(!showAIAssistant)}
        showAI={showAIAssistant}
        onAutoLayout={autoLayoutNodes}
      />

      {/* AI Assistant */}
      <N8NAIAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        nodes={nodes}
        connections={connections}
        addNode={addNode}
        addConnection={addConnection}
        updateNode={updateNode}
        clearCanvas={clearCanvas}
      />

      {/* Top Right - Projects, Active Toggle & Save */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 flex-wrap max-w-[calc(100vw-240px)] justify-end">
        <N8NProjectsDrawer
          projects={projects}
          currentProjectId={currentProjectId}
          isLoading={projectsLoading}
          onLoadProject={handleLoadProject}
          onDeleteProject={deleteProject}
          onDuplicateProject={duplicateProject}
          onRenameProject={renameProject}
          onNewProject={handleNewProject}
          onImportProject={handleImportProject}
        />
        
        {/* Active/Inactive Toggle */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] rounded-md border border-[#3a3a3a] hover:bg-[#2a2a2a] transition-colors h-7">
          <span className={`text-[10px] font-medium ${isWorkflowActive ? 'text-emerald-400' : 'text-slate-400'}`}>
            {isWorkflowActive ? 'Activ' : 'Inactiv'}
          </span>
          <Switch
            checked={isWorkflowActive}
            disabled={isTogglingActive}
            className="data-[state=unchecked]:bg-[#3a3a3a] data-[state=checked]:bg-emerald-500 scale-75"
            onCheckedChange={async (checked) => {
              setIsTogglingActive(true);
              try {
                // Validate workflow before activation
                if (checked) {
                  const validationErrors = validateWorkflow();
                  if (validationErrors.length > 0) {
                    // Show first 3 errors to avoid overwhelming the user
                    const displayErrors = validationErrors.slice(0, 3);
                    const remaining = validationErrors.length - displayErrors.length;
                    let errorMsg = displayErrors.join('\n');
                    if (remaining > 0) {
                      errorMsg += `\n...și încă ${remaining} erori`;
                    }
                    toast.error('Workflow-ul nu poate fi activat:\n' + errorMsg, { duration: 6000 });
                    return;
                  }
                }

                let projectId = currentProjectId;

                // Auto-save if not saved yet
                if (!projectId) {
                  const projectName = currentProjectName || 'Proiect Nou';
                  projectId = await saveProject(projectName, nodes, connections);
                  if (!projectId) {
                    toast.error('Nu am putut salva proiectul');
                    return;
                  }
                  setIsSaved(true);
                }
                
                // Find webhook path from Webhook Trigger node (if exists)
                const webhookNode = nodes.find(n => {
                  const icon = (n.icon || '').toLowerCase();
                  const label = (n.label || '').toLowerCase();
                  return icon === 'webhook' || icon === 'webhook-trigger' || label.includes('webhook');
                });
                const existingWebhookPath = webhookNode?.config?.webhookPath || webhookNode?.config?.webhook_path;
                
                // Find Call History Trigger node (if exists)
                const callHistoryTriggerNode = nodes.find(n => 
                  (n.icon === 'CallHistory' || n.label?.toLowerCase().includes('call history')) &&
                  n.config?.mode === 'trigger'
                );
                
                if (checked) {
                  // Activate workflow
                  const success = await activateWorkflow(projectId, nodes, connections);
                  if (success) {
                    // Sync webhook trigger - pass existing path to link it
                    if (webhookNode) {
                      const webhookPath = await syncWebhookWithWorkflow(projectId, true, existingWebhookPath);
                      if (webhookPath) {
                        const urls = getWebhookUrls(webhookPath);
                        setActiveWebhookUrl(urls.productionUrl);
                      }
                    }
                    
                    // Sync Call History Trigger
                    if (callHistoryTriggerNode && user) {
                      const triggerConfig = callHistoryTriggerNode.config || {};
                      await supabase.from('call_history_triggers').upsert({
                        user_id: user.id,
                        workflow_id: projectId,
                        name: callHistoryTriggerNode.label || 'Call History Trigger',
                        is_active: true,
                        filter_config: triggerConfig.conditions || {},
                        output_config: triggerConfig.outputData || {},
                      }, {
                        onConflict: 'workflow_id'
                      });
                      console.log('✅ Call History Trigger activated');
                    }
                    
                    toast.success('Workflow activat!');
                  }
                } else {
                  // Deactivate workflow
                  const success = await deactivateWorkflow(projectId);
                  if (success) {
                    await syncWebhookWithWorkflow(projectId, false, existingWebhookPath);
                    setActiveWebhookUrl(null);
                    
                    // Deactivate Call History Trigger
                    if (callHistoryTriggerNode) {
                      await supabase
                        .from('call_history_triggers')
                        .update({ is_active: false })
                        .eq('workflow_id', projectId);
                      console.log('✅ Call History Trigger deactivated');
                    }
                    
                    toast.info('Workflow dezactivat');
                  }
                }
              } finally {
                setIsTogglingActive(false);
              }
            }}
          />
          {isWorkflowActive && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>

        {/* Loop Mode Toggle */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] rounded-md border border-[#3a3a3a] hover:bg-[#2a2a2a] transition-colors h-7">
          <RefreshCw className={`h-3 w-3 ${continuousMode ? 'text-blue-400 animate-spin' : 'text-slate-400'}`} />
          <span className={`text-[10px] font-medium ${continuousMode ? 'text-blue-400' : 'text-slate-400'}`}>
            Loop
          </span>
          <Switch
            checked={continuousMode}
            onCheckedChange={setContinuousMode}
            disabled={isRunning}
            className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-[#3a3a3a] scale-75"
          />
          {continuousMode && cycleCount > 0 && (
            <span className="text-[10px] text-blue-400 font-mono animate-pulse">
              #{cycleCount} | {totalProcessed}
            </span>
          )}
        </div>


        {/* Executions History Button */}
        <button
          onClick={() => setShowExecutionHistory(true)}
          className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] rounded-md border border-[#3a3a3a] transition-colors h-7 text-slate-300 hover:bg-[#2a2a2a] hover:text-white"
        >
          <History className="h-3 w-3" />
          <span className="text-[10px] font-medium hidden sm:inline">Execuții</span>
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] rounded-md border border-[#3a3a3a] transition-colors h-7 ${
            !isSaved
              ? 'text-emerald-400 hover:bg-emerald-500/10'
              : 'text-slate-300 hover:bg-[#2a2a2a] hover:text-white'
          }`}
        >
          <Save className="h-3 w-3" />
          <span className="text-[10px] font-medium hidden sm:inline">{isSaved ? 'Salvat' : 'Salvează'}</span>
        </button>

        {/* Project Name Display */}
        {currentProjectName && currentProjectName !== 'Proiect Nou' && (
          <div className="px-2 py-1 bg-[#1e1e1e] rounded-md border border-[#3a3a3a] hidden lg:flex items-center h-7">
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{currentProjectName}</span>
          </div>
        )}
      </div>

      {/* Bottom Left Controls - Zoom, etc */}
      <N8NZoomControls
        zoom={zoom}
        onZoomIn={() => setZoom(Math.min(2, zoom + 0.1))}
        onZoomOut={() => setZoom(Math.max(0.1, zoom - 0.1))}
        onFitView={handleFitView}
      />

      {/* Execute Button - Top Left Corner */}
      <div className="absolute left-3 top-3 z-20 flex flex-col items-start gap-2">
        {/* Scheduler Status Indicator */}
        {schedulerActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/50 rounded-full text-emerald-400 text-xs animate-pulse">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span>
              {schedulerInterval === -1 
                ? '📅 Programat zilnic' 
                : `⏱️ Rulează la fiecare ${
                    schedulerInterval && schedulerInterval >= 3600000 
                      ? `${schedulerInterval / 3600000} ore` 
                      : schedulerInterval && schedulerInterval >= 60000 
                        ? `${schedulerInterval / 60000} min` 
                        : `${schedulerInterval ? schedulerInterval / 1000 : 0} sec`
                  }`
              }
            </span>
            {schedulerCycles > 0 && <span className="text-emerald-300">({schedulerCycles} execuții)</span>}
          </div>
        )}
        
        {/* Webhook Activity Indicator (only shows when workflow is active and has webhook) */}
        {isWorkflowActive && nodes.some(n => n.icon === 'webhook' || n.icon === 'webhook-trigger') && webhookActivity.count > 0 && (
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px]",
            webhookActivity.isPulsing
              ? "bg-green-500/20 text-green-400 border border-green-500/50"
              : "bg-[#2a2a2a] text-slate-400 border border-[#3a3a3a]"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              webhookActivity.isPulsing ? "bg-green-400 animate-pulse" : "bg-green-500"
            )} />
            <span>{webhookActivity.count} webhook{webhookActivity.count > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Live Webhook Data Panel */}
        {liveWebhookData.show && (
          <div className={cn(
            "max-w-sm rounded-lg border shadow-lg overflow-hidden transition-all",
            liveWebhookData.status === 'received' && "bg-blue-500/10 border-blue-500/50",
            liveWebhookData.status === 'executing' && "bg-yellow-500/10 border-yellow-500/50",
            liveWebhookData.status === 'success' && "bg-green-500/10 border-green-500/50",
            liveWebhookData.status === 'error' && "bg-red-500/10 border-red-500/50"
          )}>
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-3 py-2",
              liveWebhookData.status === 'received' && "bg-blue-500/20",
              liveWebhookData.status === 'executing' && "bg-yellow-500/20",
              liveWebhookData.status === 'success' && "bg-green-500/20",
              liveWebhookData.status === 'error' && "bg-red-500/20"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  liveWebhookData.status === 'received' && "bg-blue-400",
                  liveWebhookData.status === 'executing' && "bg-yellow-400 animate-pulse",
                  liveWebhookData.status === 'success' && "bg-green-400",
                  liveWebhookData.status === 'error' && "bg-red-400"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  liveWebhookData.status === 'received' && "text-blue-400",
                  liveWebhookData.status === 'executing' && "text-yellow-400",
                  liveWebhookData.status === 'success' && "text-green-400",
                  liveWebhookData.status === 'error' && "text-red-400"
                )}>
                  {liveWebhookData.status === 'received' && '📥 Webhook Primit'}
                  {liveWebhookData.status === 'executing' && '⚡ Se execută...'}
                  {liveWebhookData.status === 'success' && '✅ Executat cu succes'}
                  {liveWebhookData.status === 'error' && '❌ Eroare execuție'}
                </span>
              </div>
              <button
                onClick={() => setLiveWebhookData(prev => ({ ...prev, show: false }))}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="px-3 py-2 max-h-48 overflow-auto">
              {liveWebhookData.timestamp && (
                <div className="text-[10px] text-slate-500 mb-2">
                  {new Date(liveWebhookData.timestamp).toLocaleTimeString('ro-RO')}
                </div>
              )}
              {liveWebhookData.data && (
                <div className="text-xs">
                  {liveWebhookData.data.method && (
                    <div className="mb-1">
                      <span className="text-slate-500">Method: </span>
                      <span className="text-slate-300 font-mono">{liveWebhookData.data.method}</span>
                    </div>
                  )}
                  {liveWebhookData.data.body && Object.keys(liveWebhookData.data.body).length > 0 && (
                    <div>
                      <span className="text-slate-500">Body:</span>
                      <pre className="mt-1 p-2 bg-black/30 rounded text-[10px] text-slate-300 font-mono overflow-auto max-h-24">
                        {JSON.stringify(liveWebhookData.data.body, null, 2)}
                      </pre>
                    </div>
                  )}
                  {liveWebhookData.data.query && Object.keys(liveWebhookData.data.query).length > 0 && (
                    <div className="mt-2">
                      <span className="text-slate-500">Query:</span>
                      <pre className="mt-1 p-2 bg-black/30 rounded text-[10px] text-slate-300 font-mono overflow-auto max-h-16">
                        {JSON.stringify(liveWebhookData.data.query, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        <ExecuteButton onClick={handleExecuteWithLoop} onStop={handleStop} isRunning={isRunning} />
      </div>

      {/* Logs Panel */}
      <N8NLogsPanel
        isOpen={logsOpen}
        onToggle={() => setLogsOpen(!logsOpen)}
        logs={executionLogs}
        isRunning={isRunning}
        onClearLogs={() => {
          setExecutionLogs([]);
          setRunningTime(0);
        }}
        runningTime={runningTime}
      />

      {/* Node Search Panel */}
      {showNodeSearch && (
        <N8NNodeSearch
          isOpen={showNodeSearch}
          onClose={() => {
            setShowNodeSearch(false);
            setAddNodeFromId(null);
            setAddNodePosition(null);
          }}
          onSelectNode={handleSelectNodeFromSearch}
        />
      )}

      {/* Node Configuration Panel */}
      {(() => {
        const selectedNode = configNodeId ? nodes.find(n => n.id === configNodeId) || null : null;
        if (!configNodeId || !selectedNode) return null;
        return (
        <N8NNodeConfig
          isOpen
          onClose={() => setConfigNodeId(null)}
          node={selectedNode}
          key={selectedNode.id}
          connections={connections}
          nodes={nodes}
          executionData={nodeExecutionData}
          workflowId={currentProjectId}
          onSendMessage={async (nodeId, message) => {
          // Find connected nodes (Telegram, etc.)
          const connectedNodeIds = connections
            .filter(c => c.from === nodeId)
            .map(c => c.to);
          
          console.log('Chat Trigger sent message:', message);
          console.log('Connected node IDs:', connectedNodeIds);
          
          setIsRunning(true);
          
          // Store chat message as trigger output
          const chatTriggerOutput = {
            message: message,
            timestamp: new Date().toISOString(),
            source: 'chat-trigger',
          };
          
          // Update execution data for Chat Trigger
          setNodeExecutionData(prev => ({
            ...prev,
            [nodeId]: {
              output: chatTriggerOutput,
              status: 'success',
            },
          }));
          
          // Execute each connected node with the message
          for (const connectedNodeId of connectedNodeIds) {
            const connectedNode = nodes.find(n => n.id === connectedNodeId);
            if (!connectedNode) continue;
            
            console.log('Processing connected node:', connectedNode);
            
            // Check if it's a Telegram node
            if (connectedNode.icon === 'telegram' || connectedNode.label.toLowerCase().includes('telegram')) {
              const config = connectedNode.config;
              
              console.log('Telegram node config:', config);
              console.log('Chat trigger output for Telegram:', chatTriggerOutput);
              
              if (!config?.botToken) {
                toast.error('Telegram: Bot Token nu este configurat! Dă dublu-click pe nodul Telegram pentru a-l configura.');
                continue;
              }
              
              if (!config?.chatId) {
                toast.error('Telegram: Chat ID nu este configurat! Dă dublu-click pe nodul Telegram pentru a-l configura.');
                continue;
              }
              
              // Helper function to get value from path
              const getValueFromPathTelegram = (data: any, path: string): any => {
                if (!path || !data) return null;
                const parts = path.split('.');
                let value = data;
                for (const part of parts) {
                  value = value?.[part];
                }
                return value;
              };
              
              // Build text to send - evaluate from chatTriggerOutput if droppedFields exist
              let textToSend = '';
              
              // Helper function to clean markdown artifacts from AI responses
              const cleanMarkdownArtifacts = (text: string): string => {
                if (!text || typeof text !== 'string') return text;
                let cleaned = text;
                // Remove rawAnalysis: prefix
                cleaned = cleaned.replace(/^rawAnalysis:\s*/i, '');
                // Remove ```json and ``` wrappers
                cleaned = cleaned.replace(/^```json\s*/i, '');
                cleaned = cleaned.replace(/^```\s*/i, '');
                cleaned = cleaned.replace(/\s*```$/i, '');
                // Remove multiple newlines at start/end
                cleaned = cleaned.trim();
                return cleaned;
              };
              
              if (config?.droppedFields && config.droppedFields.length > 0) {
                // Mode: Expression - build message from dropped fields
                const messageLines: string[] = [];
                for (const field of config.droppedFields) {
                  const extractedValue = getValueFromPathTelegram(chatTriggerOutput, field.path);
                  let displayValue = extractedValue !== undefined && extractedValue !== null ? String(extractedValue) : '';
                  // Clean markdown artifacts from the value
                  displayValue = cleanMarkdownArtifacts(displayValue);
                  // Only add non-empty values without field labels
                  if (displayValue) {
                    messageLines.push(displayValue);
                  }
                }
                textToSend = messageLines.join('\n\n');
                console.log('Built Telegram message from droppedFields:', textToSend);
              } else if (config?.fixedMessage) {
                // Mode: Fixed - use fixed message
                textToSend = cleanMarkdownArtifacts(config.fixedMessage);
              } else {
                // Default: use the chat message directly
                textToSend = cleanMarkdownArtifacts(message);
              }

              // Final cleanup of the entire message (covers multi-line cases too)
              textToSend = cleanMarkdownArtifacts(textToSend);
              
              toast.info(`Trimit mesaj pe Telegram: "${textToSend.substring(0, 50)}..."`);
              
              try {
                const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    chat_id: config.chatId,
                    text: textToSend,
                    parse_mode: config.parseMode !== 'none' ? config.parseMode : undefined,
                  }),
                });

                const result = await response.json();
                console.log('Telegram API response:', result);

                if (result.ok) {
                  toast.success(`Telegram: Mesaj trimis cu succes!`);
                  // Update execution data
                  setNodeExecutionData(prev => ({
                    ...prev,
                    [connectedNodeId]: {
                      input: chatTriggerOutput,
                      output: result,
                      status: 'success',
                    },
                  }));
                } else {
                  toast.error(`Telegram Error: ${result.description || 'Eroare necunoscută'}`);
                  setNodeExecutionData(prev => ({
                    ...prev,
                    [connectedNodeId]: {
                      input: chatTriggerOutput,
                      output: result,
                      status: 'error',
                    },
                  }));
                }
              } catch (error) {
                console.error('Telegram send error:', error);
                toast.error(`Telegram Error: ${error instanceof Error ? error.message : 'Network error'}`);
              }
            }
            
            // Check if it's an Infobip Email node
            if (connectedNode.icon === 'infobip-send-email' || connectedNode.icon === 'infobip-email' || 
                (connectedNode.label.toLowerCase().includes('infobip') && connectedNode.label.toLowerCase().includes('email'))) {
              const config = connectedNode.config;
              
              console.log('Infobip Email node config:', config);
              console.log('Chat trigger output for email:', chatTriggerOutput);
              
              if (!config?.fromEmail) {
                toast.error('Infobip Email: Adresa expeditor nu este configurată!');
                continue;
              }
              
              // Helper function to get value from path
              const getValueFromPath = (data: any, path: string): any => {
                if (!path || !data) return null;
                const parts = path.split('.');
                let value = data;
                for (const part of parts) {
                  value = value?.[part];
                }
                return value;
              };
              
              // Build email content - evaluate from chatTriggerOutput
              let toEmail = config.toEmail || '';
              let subject = config.subject || '';
              let body = config.body || '';
              
              // If using workflow fields, extract actual values from chatTriggerOutput
              if (config.toEmailField && config.toEmailField.path) {
                const extractedValue = getValueFromPath(chatTriggerOutput, config.toEmailField.path);
                if (extractedValue) toEmail = String(extractedValue);
                console.log('Extracted toEmail:', toEmail, 'from path:', config.toEmailField.path);
              }
              
              if (config.subjectField && config.subjectField.path) {
                const extractedValue = getValueFromPath(chatTriggerOutput, config.subjectField.path);
                if (extractedValue) subject = String(extractedValue);
                console.log('Extracted subject:', subject, 'from path:', config.subjectField.path);
              }
              
              // Build body from bodyFields or use fixed body
              if (config.bodyFields && config.bodyFields.length > 0) {
                const bodyLines: string[] = [];
                for (const field of config.bodyFields) {
                  const extractedValue = getValueFromPath(chatTriggerOutput, field.path);
                  const displayValue = extractedValue !== undefined ? String(extractedValue) : 'N/A';
                  bodyLines.push(`${field.key}: ${displayValue}`);
                }
                body = bodyLines.join('\n');
                console.log('Built body from fields:', body);
              } else if (!body) {
                // Default to message if no body configured
                body = message;
              }
              
              if (!toEmail) {
                toast.error('Infobip Email: Adresa destinatar nu este configurată!');
                continue;
              }
              
              toast.info(`Trimit email către: ${toEmail}`);
              
              try {
                // Call Supabase function to send email via Infobip
                const { supabase } = await import('@/integrations/supabase/client');
                const { data, error } = await supabase.functions.invoke('infobip-send-email', {
                  body: {
                    toEmail: toEmail,
                    fromEmail: config.fromEmail,
                    fromName: config.fromName || 'Agentauto',
                    subject: subject || `Message from Chat: ${message.substring(0, 50)}`,
                    body: body,
                    bodyType: config.bodyType || 'text',
                    useCustomAccount: config.useCustomAccount || false,
                  },
                });
                
                if (error) {
                  console.error('Infobip Email error:', error);
                  toast.error(`Email Error: ${error.message}`);
                  setNodeExecutionData(prev => ({
                    ...prev,
                    [connectedNodeId]: {
                      input: chatTriggerOutput,
                      output: { error: error.message },
                      status: 'error',
                    },
                  }));
                } else {
                  console.log('Infobip Email response:', data);
                  toast.success('Email trimis cu succes!');
                  setNodeExecutionData(prev => ({
                    ...prev,
                    [connectedNodeId]: {
                      input: chatTriggerOutput,
                      output: data,
                      status: 'success',
                    },
                  }));
                }
              } catch (error) {
                console.error('Infobip Email send error:', error);
                toast.error(`Email Error: ${error instanceof Error ? error.message : 'Network error'}`);
              }
            }
            
            // Check if it's an Infobip SMS node
            if (connectedNode.icon === 'infobip-send-sms' || connectedNode.icon === 'infobip-sms' || 
                (connectedNode.label.toLowerCase().includes('infobip') && connectedNode.label.toLowerCase().includes('sms'))) {
              const config = connectedNode.config;
              
              console.log('Infobip SMS node config:', config);
              console.log('Chat trigger output for SMS:', chatTriggerOutput);
              
              // Helper function to get value from path
              const getValueFromPathSMS = (data: any, path: string): any => {
                if (!path || !data) return null;
                const parts = path.split('.');
                let value = data;
                for (const part of parts) {
                  value = value?.[part];
                }
                return value;
              };
              
              // Build SMS content - evaluate from chatTriggerOutput
              let toNumber = config?.toNumber || '';
              let smsMessage = config?.message || '';
              
              // If using workflow fields, extract actual values
              if (config?.toNumberField && config.toNumberField.path) {
                const extractedValue = getValueFromPathSMS(chatTriggerOutput, config.toNumberField.path);
                if (extractedValue) toNumber = String(extractedValue);
                console.log('Extracted toNumber:', toNumber, 'from path:', config.toNumberField.path);
              }
              
              // Build message from messageFields or use fixed message
              if (config?.messageFields && config.messageFields.length > 0) {
                const messageLines: string[] = [];
                for (const field of config.messageFields) {
                  const extractedValue = getValueFromPathSMS(chatTriggerOutput, field.path);
                  const displayValue = extractedValue !== undefined ? String(extractedValue) : 'N/A';
                  messageLines.push(`${field.key}: ${displayValue}`);
                }
                smsMessage = messageLines.join('\n');
                console.log('Built SMS message from fields:', smsMessage);
              } else if (!smsMessage) {
                // Default to chat message if no message configured
                smsMessage = message;
              }
              
              if (!toNumber) {
                toast.error('Infobip SMS: Numărul destinatar nu este configurat!');
                continue;
              }
              
              toast.info(`Trimit SMS către: ${toNumber}`);
              
              try {
                // Call Supabase function to send SMS via Infobip
                const { supabase } = await import('@/integrations/supabase/client');
                const { data, error } = await supabase.functions.invoke('infobip-send-sms', {
                  body: {
                    to: toNumber,
                    from: config?.from || 'Agentauto',
                    text: smsMessage,
                    useCustomAccount: config?.useCustomAccount || false,
                  },
                });
                
                if (error) {
                  console.error('Infobip SMS error:', error);
                  toast.error(`SMS Error: ${error.message}`);
                  setNodeExecutionData(prev => ({
                    ...prev,
                    [connectedNodeId]: {
                      input: chatTriggerOutput,
                      output: { error: error.message },
                      status: 'error',
                    },
                  }));
                } else {
                  console.log('Infobip SMS response:', data);
                  toast.success('SMS trimis cu succes!');
                  setNodeExecutionData(prev => ({
                    ...prev,
                    [connectedNodeId]: {
                      input: chatTriggerOutput,
                      output: data,
                      status: 'success',
                    },
                  }));
                }
              } catch (error) {
                console.error('Infobip SMS send error:', error);
                toast.error(`SMS Error: ${error instanceof Error ? error.message : 'Network error'}`);
              }
            }

            // Check if it's an amoCRM node
            if (connectedNode.icon === 'amocrm' || connectedNode.label.toLowerCase().includes('amocrm')) {
              console.log('AmoCRM node detected, executing with chatTriggerOutput:', chatTriggerOutput);
              const amoConfig = connectedNode.config || {};
              const operation = amoConfig.operation || 'create';
              const entityType = amoConfig.resource || amoConfig.entityType || 'leads';

              console.log('AmoCRM config:', { operation, entityType, fields: amoConfig.fields });

              // Helper to extract value from chatTriggerOutput
              const extractValueFromChat = (obj: any, path: string): any => {
                if (!path || !obj) return undefined;
                // Clean n8n expression format: {{ $json.message }} -> message
                let cleanPath = path.trim();
                if (cleanPath.startsWith('{{') && cleanPath.endsWith('}}')) {
                  cleanPath = cleanPath.slice(2, -2).trim();
                }
                if (cleanPath.startsWith('$json.')) {
                  cleanPath = cleanPath.slice(6);
                }
                // Remove leading array index: "0.message" -> "message"
                cleanPath = cleanPath.replace(/^\d+\./, '');
                if (cleanPath.startsWith('item.')) {
                  cleanPath = cleanPath.slice(5);
                }

                const parts = cleanPath.split('.');
                let current = obj;
                for (const part of parts) {
                  if (current === null || current === undefined) break;
                  current = current[part];
                }
                return current;
              };

              try {
                if (operation === 'update') {
                  // Get record ID from config
                  let recordId = amoConfig.recordId;
                  if (amoConfig.recordIdSource === 'workflow') {
                    recordId = extractValueFromChat(chatTriggerOutput, amoConfig.recordIdWorkflowField || 'id');
                  }

                  if (!recordId) {
                    throw new Error('No record ID provided for update');
                  }

                  // Build payload from field mappings
                  const payload: Record<string, any> = {};

                  if (amoConfig.fields && Array.isArray(amoConfig.fields)) {
                    for (const fieldMapping of amoConfig.fields) {
                      let value: any;

                      if (fieldMapping.valueSource === 'workflow') {
                        const workflowPath = fieldMapping.workflowField || fieldMapping.value || '';
                        value = extractValueFromChat(chatTriggerOutput, workflowPath);
                        console.log(`Chat->AmoCRM Field extraction: ${fieldMapping.field} <- "${workflowPath}" = "${value}"`);
                      } else {
                        value = fieldMapping.value;
                      }

                      if (value !== undefined && value !== null && value !== '') {
                        if (fieldMapping.field === 'status_id' || fieldMapping.field === 'pipeline_id' || fieldMapping.field === 'responsible_user_id') {
                          payload[fieldMapping.field] = parseInt(value);
                        } else {
                          payload[fieldMapping.field] = value;
                        }
                      }
                    }
                  }

                  console.log('Chat->AmoCRM Final payload:', payload);

                  if (Object.keys(payload).length === 0) {
                    throw new Error('No fields to update. Check field mappings.');
                  }

                  // Get session for auth token
                  const { supabase } = await import('@/integrations/supabase/client');
                  const { data: sessionData } = await supabase.auth.getSession();

                  if (!sessionData.session?.access_token) {
                    throw new Error('Not authenticated');
                  }

                  const amoResponse = await fetch(
                    `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/amocrm-api?action=update&entity_type=${entityType}&id=${recordId}`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionData.session.access_token}`,
                      },
                      body: JSON.stringify({ data: payload }),
                    }
                  );

                  const amoResult = await amoResponse.json();
                  console.log('AmoCRM update result:', amoResult);

                  if (!amoResponse.ok || amoResult.error) {
                    throw new Error(amoResult.error || `amoCRM API error (${amoResponse.status})`);
                  }

                  toast.success(`AmoCRM: Lead ${recordId} updated!`);

                  // Update execution data
                  setNodeExecutionData(prev => ({
                    ...prev,
                    [connectedNodeId]: {
                      input: chatTriggerOutput,
                      output: { ...chatTriggerOutput, amocrm_updated: amoResult },
                      status: 'success',
                    },
                  }));
                } else {
                  // For other operations (create, get_many, etc.), show a message
                  toast.info(`AmoCRM: Operation "${operation}" from Chat Trigger not yet supported. Use manual run.`);
                }
              } catch (error) {
                console.error('AmoCRM execution error:', error);
                toast.error(`AmoCRM Error: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
                setNodeExecutionData(prev => ({
                  ...prev,
                  [connectedNodeId]: {
                    input: chatTriggerOutput,
                    output: { error: error instanceof Error ? error.message : 'Unknown error' },
                    status: 'error',
                  },
                }));
              }
            }
          }

          // Cleanup timer
          if (runningTimerRef.current) {
            clearInterval(runningTimerRef.current);
            runningTimerRef.current = null;
          }
          setIsRunning(false);
          updateLastRun();
          toast.success('Workflow completed!');
        }}
          onUpdateConfig={(nodeId, config) => {
            updateNode(nodeId, { config });
            setIsSaved(false);
            
            // If webhook has pinnedData, also update executionData so next nodes can access it
            if (config.pinnedData) {
              console.log('[Canvas] Webhook pinnedData detected, updating executionData:', config.pinnedData);
              setNodeExecutionData(prev => ({
                ...prev,
                [nodeId]: {
                  ...prev[nodeId],
                  output: config.pinnedData,
                  status: 'success',
                },
              }));
            }
          }}
          onExecutionUpdate={(nodeId, data) => {
            console.log('[Canvas] Execution update from node config:', nodeId, data);
            setNodeExecutionData(prev => ({
              ...prev,
              [nodeId]: {
                ...prev[nodeId],
                ...data,
              },
            }));
          }}
        />
        );
      })()}

      {/* Save Project Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Salvează Proiectul</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nume proiect"
              value={saveProjectName}
              onChange={(e) => setSaveProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveConfirm();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Anulează
            </Button>
            <Button onClick={handleSaveConfirm}>
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution History Panel */}
      <N8NExecutionHistory
        isOpen={showExecutionHistory}
        onClose={() => setShowExecutionHistory(false)}
        workflowId={currentProjectId}
        nodes={nodes.map(n => ({ id: n.id, label: n.label }))}
        onLoadTestData={(executionData) => {
          console.log('[Canvas] Loading test data from execution history:', executionData);
          setNodeExecutionData(executionData);
          toast.success('Date de test încărcate! Deschide configurarea unui node pentru a vedea datele.');
        }}
      />
    </div>
  );
};