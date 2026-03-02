import { useState, useCallback, useEffect } from 'react';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'call' | 'destination' | 'end';
  label: string;
  icon: string;
  description: string;
  x: number;
  y: number;
  config?: any;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

interface WorkflowState {
  nodes: WorkflowNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  draggingNodeId: string | null;
  connectingFrom: string | null;
  zoom: number;
  pan: { x: number; y: number };
}

const STORAGE_KEY = 'kalina-workflow-state';

// Load initial state from localStorage
const loadInitialState = (): WorkflowState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        nodes: parsed.nodes || [],
        connections: parsed.connections || [],
        zoom: parsed.zoom || 1,
        pan: parsed.pan || { x: 0, y: 0 },
        // These should always start fresh
        selectedNodeId: null,
        selectedConnectionId: null,
        draggingNodeId: null,
        connectingFrom: null,
      };
    }
  } catch (e) {
    console.error('Failed to load workflow state:', e);
  }
  return {
    nodes: [],
    connections: [],
    selectedNodeId: null,
    selectedConnectionId: null,
    draggingNodeId: null,
    connectingFrom: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
  };
};

export const useWorkflowBuilder = () => {
  const [state, setState] = useState<WorkflowState>(loadInitialState);

  // Save to localStorage whenever nodes, connections, zoom, or pan change
  useEffect(() => {
    const dataToSave = {
      nodes: state.nodes,
      connections: state.connections,
      zoom: state.zoom,
      pan: state.pan,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [state.nodes, state.connections, state.zoom, state.pan]);

  const addNode = useCallback((nodeData: Omit<WorkflowNode, 'id' | 'x' | 'y'>, x: number, y: number): string => {
    const nodeId = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      ...nodeData,
      id: nodeId,
      x,
      y,
    };
    setState(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    return nodeId;
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      connections: prev.connections.filter(c => c.from !== nodeId && c.to !== nodeId),
      selectedNodeId: prev.selectedNodeId === nodeId ? null : prev.selectedNodeId,
    }));
  }, []);

  const detectCycle = useCallback((connections: Connection[], newFrom: string, newTo: string): boolean => {
    // Build adjacency list including the new connection
    const graph = new Map<string, string[]>();
    [...connections, { id: 'temp', from: newFrom, to: newTo }].forEach(conn => {
      if (!graph.has(conn.from)) graph.set(conn.from, []);
      graph.get(conn.from)!.push(conn.to);
    });

    // DFS to detect cycle
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycleDFS = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    return hasCycleDFS(newFrom);
  }, []);

  const addConnection = useCallback((from: string, to: string) => {
    setState(prev => {
      // Check if connection already exists
      const exists = prev.connections.some(c => c.from === from && c.to === to);
      if (exists) return prev;
      
      // Prevent self-connection
      if (from === to) return prev;

      // Prevent cycles
      if (detectCycle(prev.connections, from, to)) {
        console.warn('Cannot add connection: would create a cycle');
        return prev;
      }

      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        from,
        to,
      };
      return { ...prev, connections: [...prev.connections, newConnection] };
    });
  }, [detectCycle]);

  const deleteConnection = useCallback((connectionId: string) => {
    setState(prev => ({
      ...prev,
      connections: prev.connections.filter(c => c.id !== connectionId),
      selectedConnectionId: prev.selectedConnectionId === connectionId ? null : prev.selectedConnectionId,
    }));
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId, selectedConnectionId: null }));
  }, []);

  const selectConnection = useCallback((connectionId: string | null) => {
    setState(prev => ({ ...prev, selectedConnectionId: connectionId, selectedNodeId: null }));
  }, []);

  const startDragging = useCallback((nodeId: string) => {
    setState(prev => ({ ...prev, draggingNodeId: nodeId }));
  }, []);

  const stopDragging = useCallback(() => {
    setState(prev => ({ ...prev, draggingNodeId: null }));
  }, []);

  const startConnecting = useCallback((nodeId: string) => {
    setState(prev => ({ ...prev, connectingFrom: nodeId }));
  }, []);

  const stopConnecting = useCallback((toNodeId?: string) => {
    setState(prev => {
      // Dacă nu avem date valide, doar resetăm connectingFrom
      if (!prev.connectingFrom || !toNodeId || prev.connectingFrom === toNodeId) {
        return { ...prev, connectingFrom: null };
      }

      // Verificăm dacă conexiunea există deja
      const exists = prev.connections.some(
        c => c.from === prev.connectingFrom && c.to === toNodeId
      );
      if (exists) {
        return { ...prev, connectingFrom: null };
      }

      // Detectare ciclu - build graph inline
      const testConnections = [...prev.connections, { id: 'temp', from: prev.connectingFrom, to: toNodeId }];
      const graph = new Map<string, string[]>();
      testConnections.forEach(conn => {
        if (!graph.has(conn.from)) graph.set(conn.from, []);
        graph.get(conn.from)!.push(conn.to);
      });

      const visited = new Set<string>();
      const recStack = new Set<string>();
      const hasCycleDFS = (node: string): boolean => {
        visited.add(node);
        recStack.add(node);
        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (hasCycleDFS(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }
        recStack.delete(node);
        return false;
      };

      if (hasCycleDFS(prev.connectingFrom)) {
        console.warn('Cannot add connection: would create a cycle');
        return { ...prev, connectingFrom: null };
      }

      // Totul OK - adăugăm conexiunea atomic
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        from: prev.connectingFrom,
        to: toNodeId,
      };

      console.log('Connection added:', prev.connectingFrom, '->', toNodeId);
      return {
        ...prev,
        connectingFrom: null,
        connections: [...prev.connections, newConnection],
      };
    });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoom: Math.max(0.1, Math.min(3, zoom)) }));
  }, []);

  const setPan = useCallback((pan: { x: number; y: number }) => {
    setState(prev => ({ ...prev, pan }));
  }, []);

  const validateWorkflow = useCallback(() => {
    const errors: string[] = [];

    // Check for exactly one trigger
    const triggerNodes = state.nodes.filter(n => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      errors.push('Lipsește nodul Trigger (Start)');
    } else if (triggerNodes.length > 1) {
      errors.push('Există mai multe noduri Trigger (trebuie doar unul)');
    }

    // Check for at least one end node
    const endNodes = state.nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Lipsește nodul End (Sfârșit)');
    }

    // Check all nodes are connected
    const connectedNodeIds = new Set<string>();
    state.connections.forEach(c => {
      connectedNodeIds.add(c.from);
      connectedNodeIds.add(c.to);
    });

    state.nodes.forEach(node => {
      if (!connectedNodeIds.has(node.id) && state.nodes.length > 1) {
        errors.push(`Nodul "${node.label}" nu este conectat`);
      }
    });

    // Check all nodes are configured
    state.nodes.forEach(node => {
      if (!node.config || Object.keys(node.config).length === 0) {
        errors.push(`Nodul "${node.label}" nu este configurat`);
      }
    });

    return errors;
  }, [state.nodes, state.connections]);

  const clearCanvas = useCallback(() => {
    setState({
      nodes: [],
      connections: [],
      selectedNodeId: null,
      selectedConnectionId: null,
      draggingNodeId: null,
      connectingFrom: null,
      zoom: 1,
      pan: { x: 0, y: 0 },
    });
  }, []);

  // Load workflow data from external source (Supabase)
  const loadWorkflowData = useCallback((nodes: WorkflowNode[], connections: Connection[]) => {
    setState(prev => ({
      ...prev,
      nodes: nodes || [],
      connections: connections || [],
      selectedNodeId: null,
      selectedConnectionId: null,
      draggingNodeId: null,
      connectingFrom: null,
    }));
  }, []);

  // Auto layout - arrange nodes in a clean horizontal line following connections
  const autoLayoutNodes = useCallback(() => {
    setState(prev => {
      if (prev.nodes.length === 0) return prev;

      const NODE_WIDTH = 120;
      const NODE_HEIGHT = 80;
      const HORIZONTAL_GAP = 180;
      const VERTICAL_GAP = 150;
      const START_X = 300;
      const START_Y = 300;

      // Build adjacency list
      const outgoing = new Map<string, string[]>();
      const incoming = new Map<string, string[]>();

      prev.connections.forEach(conn => {
        if (!outgoing.has(conn.from)) outgoing.set(conn.from, []);
        outgoing.get(conn.from)!.push(conn.to);
        if (!incoming.has(conn.to)) incoming.set(conn.to, []);
        incoming.get(conn.to)!.push(conn.from);
      });

      // Find root nodes (nodes with no incoming connections)
      const rootNodes = prev.nodes.filter(n => !incoming.has(n.id) || incoming.get(n.id)!.length === 0);

      // If no root nodes found, use the first node
      if (rootNodes.length === 0 && prev.nodes.length > 0) {
        rootNodes.push(prev.nodes[0]);
      }

      // BFS to assign levels
      const nodeLevel = new Map<string, number>();
      const queue: { id: string; level: number }[] = [];

      rootNodes.forEach(node => {
        queue.push({ id: node.id, level: 0 });
        nodeLevel.set(node.id, 0);
      });

      while (queue.length > 0) {
        const { id, level } = queue.shift()!;
        const children = outgoing.get(id) || [];

        children.forEach(childId => {
          if (!nodeLevel.has(childId)) {
            nodeLevel.set(childId, level + 1);
            queue.push({ id: childId, level: level + 1 });
          }
        });
      }

      // Handle unconnected nodes
      prev.nodes.forEach(node => {
        if (!nodeLevel.has(node.id)) {
          nodeLevel.set(node.id, 0);
        }
      });

      // Group nodes by level
      const levels = new Map<number, string[]>();
      nodeLevel.forEach((level, nodeId) => {
        if (!levels.has(level)) levels.set(level, []);
        levels.get(level)!.push(nodeId);
      });

      // Calculate positions
      const newPositions = new Map<string, { x: number; y: number }>();

      levels.forEach((nodeIds, level) => {
        const totalHeight = nodeIds.length * NODE_HEIGHT + (nodeIds.length - 1) * VERTICAL_GAP;
        const startY = START_Y - totalHeight / 2 + NODE_HEIGHT / 2;

        nodeIds.forEach((nodeId, index) => {
          newPositions.set(nodeId, {
            x: START_X + level * HORIZONTAL_GAP,
            y: startY + index * (NODE_HEIGHT + VERTICAL_GAP),
          });
        });
      });

      // Update nodes with new positions
      const updatedNodes = prev.nodes.map(node => {
        const pos = newPositions.get(node.id);
        if (pos) {
          return { ...node, x: pos.x, y: pos.y };
        }
        return node;
      });

      return { ...prev, nodes: updatedNodes };
    });
  }, []);

  return {
    ...state,
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
  };
};
