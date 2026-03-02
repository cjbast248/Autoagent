import React, { useRef, useState, useCallback } from 'react';
import { WorkflowNode } from './WorkflowNode';
import { NodesSidebar } from './NodesSidebar';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { ConnectionLine } from './ConnectionLine';
import { WorkflowToolbar } from './WorkflowToolbar';
import { ZoomControls } from './ZoomControls';
import { ExecutionsPanel } from './ExecutionsPanel';
import { MiniMap } from './MiniMap';
import { useWorkflowBuilder } from '@/hooks/useWorkflowBuilder';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export const WorkflowCanvas = () => {
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

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Ignore if user is typing in an input or textarea
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

    // TODO: Save to Supabase
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
    // TODO: Execute workflow
  }, [validateWorkflow]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex h-full w-full relative">
      <NodesSidebar onAddNode={(nodeData, x, y) => {
        addNode(nodeData as any, x, y);
        setIsSaved(false);
      }} />

      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: '#1e1e1e',
          backgroundImage: `
            radial-gradient(circle, #2a2a2a 1px, transparent 1px),
            radial-gradient(circle, #2a2a2a 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
        }}
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
        {/* n8n style dotted grid background */}

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

                return (
                  <ConnectionLine
                    key={conn.id}
                    fromX={fromNode.x + 48}
                    fromY={fromNode.y}
                    toX={toNode.x - 48}
                    toY={toNode.y}
                    isSelected={selectedConnectionId === conn.id}
                    onClick={() => selectConnection(conn.id)}
                  />
                );
              })}

              {/* Temporary connection line while connecting */}
              {connectingFrom && (
                <line
                  x1={nodes.find(n => n.id === connectingFrom)!.x + 48}
                  y1={nodes.find(n => n.id === connectingFrom)!.y}
                  x2={connectingMousePos.x}
                  y2={connectingMousePos.y}
                  stroke="#60A5FA"
                  strokeWidth="3"
                  strokeDasharray="8,8"
                  className="pointer-events-none"
                />
              )}
            </g>
          </svg>

          {/* Nodes */}
          {nodes.map((node, index) => (
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
              <WorkflowNode
                data={node}
                selected={selectedNodeId === node.id}
                stepNumber={index + 1}
                onDelete={() => {
                  deleteNode(node.id);
                  setIsSaved(false);
                }}
                onStartConnection={() => startConnecting(node.id)}
                onEndConnection={() => stopConnecting(node.id)}
              />
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <WorkflowToolbar
          onSave={handleSave}
          onRun={handleRun}
          onZoomIn={() => setZoom(zoom + 0.1)}
          onZoomOut={() => setZoom(zoom - 0.1)}
          onFitView={() => {
            if (nodes.length === 0) {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              return;
            }

            // Calculate bounding box of all nodes
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
          }}
          onClear={clearCanvas}
          zoom={zoom}
          isSaved={isSaved}
        />

        {/* MiniMap */}
        <MiniMap
          nodes={nodes}
          viewportBounds={{ x: -pan.x / zoom, y: -pan.y / zoom, width: 800, height: 600 }}
          onNavigate={(x, y) => {
            setPan({ x: -x * zoom, y: -y * zoom });
          }}
        />

        {/* Zoom Controls - n8n style */}
        <ZoomControls
          zoom={zoom}
          onZoomIn={() => setZoom(Math.min(zoom + 0.1, 2))}
          onZoomOut={() => setZoom(Math.max(zoom - 0.1, 0.1))}
          onFitView={() => {
            if (nodes.length === 0) {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              return;
            }

            const canvas = canvasRef.current?.getBoundingClientRect();
            if (!canvas) return;

            const bounds = nodes.reduce(
              (acc, node) => ({
                minX: Math.min(acc.minX, node.x),
                maxX: Math.max(acc.maxX, node.x),
                minY: Math.min(acc.minY, node.y),
                maxY: Math.max(acc.maxY, node.y),
              }),
              { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
            );

            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;
            const width = bounds.maxX - bounds.minX + 200;
            const height = bounds.maxY - bounds.minY + 200;

            const scaleX = canvas.width / width;
            const scaleY = canvas.height / height;
            const newZoom = Math.min(scaleX, scaleY, 1) * 0.9;

            setZoom(newZoom);
            setPan({
              x: canvas.width / 2 - centerX * newZoom,
              y: canvas.height / 2 - centerY * newZoom,
            });
          }}
        />

        {/* Delete Connection Helper */}
        {selectedConnectionId && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-card border rounded-lg px-4 py-2 shadow-lg">
            <span className="text-sm text-muted-foreground mr-3">Conexiune selectată</span>
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
      </div>

      {selectedNode && (
        <NodePropertiesPanel
          node={selectedNode}
          onUpdate={(newData) => {
            updateNode(selectedNode.id, newData);
            setIsSaved(false);
          }}
          onClose={() => selectNode(null)}
        />
      )}

      {/* Executions Panel - n8n style */}
      <ExecutionsPanel
        executions={[
          // Example executions - replace with real data
          {
            id: '1',
            status: 'success',
            startTime: new Date(Date.now() - 1000 * 60 * 5),
            duration: 1234,
          },
        ]}
      />
    </div>
  );
};
