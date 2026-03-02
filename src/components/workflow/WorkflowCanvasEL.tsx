import React, { useRef, useState, useCallback } from 'react';
import { WorkflowNodeEL } from './WorkflowNodeEL';
import { NodesSidebarEL } from './NodesSidebarEL';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { ConnectionLineEL } from './ConnectionLineEL';
import { WorkflowToolbarEL } from './WorkflowToolbarEL';
import { GlobalSettingsPanel } from './GlobalSettingsPanel';
import { useWorkflowBuilder } from '@/hooks/useWorkflowBuilder';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export const WorkflowCanvasEL = () => {
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
  } = useWorkflowBuilder();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSaved, setIsSaved] = useState(true);
  const [connectingMousePos, setConnectingMousePos] = useState({ x: 0, y: 0 });
  const [showTemplates, setShowTemplates] = useState(false);
  const [preventInfiniteLoops, setPreventInfiniteLoops] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(true);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectionId, deleteNode, deleteConnection]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (e.button === 0 && !target.closest('.workflow-node')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const nodeData = e.dataTransfer.getData('application/json');
    if (nodeData) {
      const node = JSON.parse(nodeData);
      const canvas = canvasRef.current?.getBoundingClientRect();
      if (canvas) {
        const x = (e.clientX - canvas.left - pan.x) / zoom;
        const y = (e.clientY - canvas.top - pan.y) / zoom;
        addNode(node, x, y);
        setIsSaved(false);
      }
    }
  }, [pan, zoom, addNode]);

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

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    stopDragging();
    stopConnecting();
  }, [stopDragging, stopConnecting]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    startDragging(nodeId);
    selectNode(nodeId);
  }, [startDragging, selectNode]);

  const handleSave = useCallback(() => {
    const errors = validateWorkflow();
    if (errors.length > 0) {
      toast.error('Workflow invalid', {
        description: errors.join(', '),
      });
      return;
    }

    console.log('Saving workflow:', { nodes, connections });
    setIsSaved(true);
    toast.success('Workflow salvat cu succes!');
  }, [nodes, connections, validateWorkflow]);

  const handleRun = useCallback(() => {
    const errors = validateWorkflow();
    if (errors.length > 0) {
      toast.error('Nu se poate rula workflow-ul invalid', {
        description: errors.join(', '),
      });
      return;
    }

    toast.success('Workflow pornit!');
  }, [validateWorkflow]);

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

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex h-full w-full relative bg-white">
      {/* Left Sidebar - Nodes */}
      <NodesSidebarEL onAddNode={(nodeData, x, y) => {
        addNode(nodeData as any, x, y);
        setIsSaved(false);
      }} />

      {/* Main Canvas Area */}
      <div
        ref={canvasRef}
        className="flex-1 relative bg-slate-50 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            selectNode(null);
            selectConnection(null);
          }
        }}
      >
        {/* Subtle dot pattern background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Canvas Content */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Connections */}
          <svg 
            className="absolute inset-0 pointer-events-none" 
            style={{ 
              width: '100%', 
              height: '100%',
              minWidth: '5000px',
              minHeight: '5000px',
            }}
          >
            <g className="pointer-events-auto">
              {connections.map((conn) => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                // Calculate connection points (bottom of source, top of target)
                const fromX = fromNode.x;
                const fromY = fromNode.y + 60; // Bottom of node
                const toX = toNode.x;
                const toY = toNode.y - 30; // Top of node

                return (
                  <ConnectionLineEL
                    key={conn.id}
                    fromX={fromX}
                    fromY={fromY}
                    toX={toX}
                    toY={toY}
                    isSelected={selectedConnectionId === conn.id}
                    onClick={() => selectConnection(conn.id)}
                  />
                );
              })}

              {/* Temporary connection line while connecting */}
              {connectingFrom && (
                <line
                  x1={nodes.find(n => n.id === connectingFrom)!.x}
                  y1={nodes.find(n => n.id === connectingFrom)!.y + 60}
                  x2={connectingMousePos.x}
                  y2={connectingMousePos.y}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="8,8"
                  className="pointer-events-none"
                />
              )}
            </g>
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute workflow-node group"
              style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              <WorkflowNodeEL
                data={node}
                selected={selectedNodeId === node.id}
                onDelete={() => {
                  deleteNode(node.id);
                  setIsSaved(false);
                }}
                onStartConnection={() => startConnecting(node.id)}
                onEndConnection={() => stopConnecting(node.id)}
                isConnecting={!!connectingFrom}
              />
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <WorkflowToolbarEL
          onSave={handleSave}
          onRun={handleRun}
          onZoomIn={() => setZoom(zoom + 0.1)}
          onZoomOut={() => setZoom(zoom - 0.1)}
          onFitView={handleFitView}
          onClear={clearCanvas}
          onTemplates={() => setShowTemplates(true)}
          zoom={zoom}
          isSaved={isSaved}
        />

        {/* Delete Connection Helper */}
        {selectedConnectionId && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-lg z-20">
            <span className="text-sm text-slate-500 mr-3">Conexiune selectată</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                deleteConnection(selectedConnectionId);
                setIsSaved(false);
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Șterge
            </Button>
          </div>
        )}

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-slate-400 text-lg font-medium">Trage noduri pe canvas</p>
              <p className="text-slate-400 text-sm mt-1">Începe prin a adăuga un Trigger</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Global Settings or Node Properties */}
      {selectedNode ? (
        <NodePropertiesPanel
          node={selectedNode}
          onUpdate={(newData) => {
            updateNode(selectedNode.id, newData);
            setIsSaved(false);
          }}
          onClose={() => selectNode(null)}
        />
      ) : (
        <GlobalSettingsPanel
          preventInfiniteLoops={preventInfiniteLoops}
          onPreventInfiniteLoopsChange={setPreventInfiniteLoops}
        />
      )}
    </div>
  );
};
