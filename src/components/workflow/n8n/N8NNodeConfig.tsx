import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, MessageCircle, Settings, Phone, Mail, Bot, Webhook, Database, GripHorizontal, Minimize2, Maximize2 } from 'lucide-react';
import { N8NTelegramConfig } from './N8NTelegramConfig';
import { N8NTelegramConfigNew } from './N8NTelegramConfigNew';
import { N8NCallHistoryConfig } from './N8NCallHistoryConfig';
import { N8NGoogleSheetsConfig } from './N8NGoogleSheetsConfig';
import { N8NGoogleSheetsConfigNew } from './N8NGoogleSheetsConfigNew';
import { N8NZohoCRMConfig } from './N8NZohoCRMConfig';
import { N8NAmoCRMConfig } from './N8NAmoCRMConfig';
import { N8NBitrix24Config } from './N8NBitrix24Config';
import { N8NKalinaCallConfig } from './N8NKalinaCallConfig';
import { N8NKalinaCallConfigNew } from './N8NKalinaCallConfigNew';
import { N8NWaitCallConfig } from './N8NWaitCallConfig';
import { N8NGroqAnalysisConfig } from './N8NGroqAnalysisConfig';
import { N8NGroqAnalysisConfigNew } from './N8NGroqAnalysisConfigNew';
import { N8NBasicLLMChainConfig } from './N8NBasicLLMChainConfig';
import { N8NWebhookTriggerConfig } from './N8NWebhookTriggerConfig';
import { N8NWebhookTriggerConfigNew } from './N8NWebhookTriggerConfigNew';
import { N8NInfobipEmailConfig } from './N8NInfobipEmailConfig';
import { N8NInfobipEmailConfigNew } from './N8NInfobipEmailConfigNew';
import { N8NInfobipSMSConfig } from './N8NInfobipSMSConfig';
import { N8NInfobipSMSConfigNew } from './N8NInfobipSMSConfigNew';
import { N8NManualTriggerConfig } from './N8NManualTriggerConfig';
import { N8NAltegioBookingConfig } from './N8NAltegioBookingConfig';
import { N8NHTTPRequestConfigNew } from './N8NHTTPRequestConfigNew';
import { N8NOdooConfig } from './N8NOdooConfig';
import { N8NRAGConfig } from './N8NRAGConfig';
import { N8NRespondToWebhookConfig } from './N8NRespondToWebhookConfig';
import { N8N999ScraperConfig } from './N8N999ScraperConfig';
import { N8NSplitOutConfig } from './N8NSplitOutConfig';
import { N8NCityLookupConfig } from './N8NCityLookupConfig';
import { N8NGroqChatModelConfig } from './N8NGroqChatModelConfig';
import { N8NGalltransRoutesConfig } from './N8NGalltransRoutesConfig';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'system';
}

interface N8NNodeConfigProps {
  isOpen: boolean;
  onClose: () => void;
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: any;
  } | null;
  onSendMessage?: (nodeId: string, message: string) => void;
  onUpdateConfig?: (nodeId: string, config: any) => void;
  onExecutionUpdate?: (nodeId: string, data: { input?: any; output?: any }) => void;
  connections?: Array<{ id: string; from: string; to: string }>;
  nodes?: Array<{ id: string; type: string; label: string; icon: string; config?: any }>;
  executionData?: Record<string, { input?: any; output?: any }>;
  workflowId?: string | null;
}

export const N8NNodeConfig: React.FC<N8NNodeConfigProps> = ({
  isOpen,
  onClose,
  node,
  onSendMessage,
  onUpdateConfig,
  onExecutionUpdate,
  connections = [],
  nodes = [],
  executionData = {},
  workflowId,
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nodeSnapshotRef = useRef<N8NNodeConfigProps['node']>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 380);
      const maxY = window.innerHeight - (isMinimized ? 50 : (panelRef.current?.offsetHeight || 500));
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isMinimized]);

  useEffect(() => {
    if (node) {
      nodeSnapshotRef.current = node;
    }
  }, [node]);

  useEffect(() => {
    if (!isOpen) {
      nodeSnapshotRef.current = null;
    }
  }, [isOpen]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (panelRef.current) {
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      setIsDragging(true);
    }
  };

  const activeNode = node ?? nodeSnapshotRef.current;

  const isChatTrigger = activeNode?.icon === 'chat-trigger' || activeNode?.icon === 'MessageCircle';

  useEffect(() => {
    if (!isChatTrigger) return;
    if (isOpen && inputRef.current && !isMinimized && activeNode) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, isChatTrigger, activeNode]);

  if (!isOpen || !activeNode) return null;

  // Memoize all node type checks and data computations to avoid recalculating on every render
  const nodeTypeChecks = useMemo(() => {
    const isTelegram = activeNode.icon === 'telegram' || activeNode.label.toLowerCase().includes('telegram');
    const isCallHistory = activeNode.icon === 'call-history' || activeNode.label.toLowerCase().includes('call history');
    const isGoogleSheets = activeNode.icon === 'google-sheets' || activeNode.icon === 'FileText' || activeNode.icon?.includes('gsheets') || activeNode.label.toLowerCase().includes('google sheets') || activeNode.label.toLowerCase().includes('spreadsheet');
    const isZohoCRM = activeNode.icon === 'zoho-crm' || activeNode.label.toLowerCase().includes('zoho');
    const isAmoCRM = activeNode.icon?.toLowerCase().includes('amocrm') || activeNode.label.toLowerCase().includes('amocrm');
    const isBitrix24 = activeNode.icon?.toLowerCase().includes('bitrix') || activeNode.label.toLowerCase().includes('bitrix');
    const isOdoo = activeNode.icon?.toLowerCase().includes('odoo') || activeNode.label.toLowerCase().includes('odoo');
    const isKalinaCall = activeNode.icon === 'kalina-call' || activeNode.label.toLowerCase().includes('kalina call');
    const isWaitCallCompletion = activeNode.icon === 'wait-call-completion' || activeNode.label.toLowerCase().includes('wait for call');
    const isGroqAnalysis = activeNode.icon === 'groq-analysis' || (activeNode.label.toLowerCase().includes('groq') && activeNode.label.toLowerCase().includes('analysis'));
    const isBasicLLMChain = activeNode.icon === 'basic-llm-chain' || activeNode.label.toLowerCase().includes('basic llm chain');
    const isGroqChatModel = activeNode.icon === 'groq-chat-model' || (activeNode.label.toLowerCase().includes('groq') && activeNode.label.toLowerCase().includes('chat') && activeNode.label.toLowerCase().includes('model'));
    const isWebhookTrigger = activeNode.icon === 'webhook-trigger' || activeNode.icon === 'webhook' || activeNode.label.toLowerCase().includes('webhook trigger');
    const isRespondToWebhook = activeNode.icon === 'respond-to-webhook' || activeNode.icon === 'respond_to_webhook' || activeNode.label.toLowerCase().includes('respond to webhook');
    const isInfobipEmail = activeNode.icon === 'infobip-send-email' || activeNode.icon === 'infobip-email' || (activeNode.label.toLowerCase().includes('infobip') && activeNode.label.toLowerCase().includes('email'));
    const isInfobipSMS = activeNode.icon === 'infobip-send-sms' || activeNode.icon === 'infobip-sms' || (activeNode.label.toLowerCase().includes('infobip') && activeNode.label.toLowerCase().includes('sms'));
    const isAltegio = activeNode.icon?.toLowerCase().includes('altegio') || activeNode.label.toLowerCase().includes('altegio');
    const isHTTPRequest = activeNode.icon === 'http-request' || activeNode.icon === 'http_request' || activeNode.label.toLowerCase().includes('http request');
    const isRAG = activeNode.icon === 'rag' || activeNode.icon === 'rag-search' || activeNode.label.toLowerCase().includes('rag');
    const isManualTrigger =
      !isChatTrigger &&
      !isWebhookTrigger &&
      (activeNode.icon === 'manual-trigger' ||
        activeNode.icon === 'play' ||
        activeNode.label.toLowerCase().includes('execute workflow') ||
        activeNode.label.toLowerCase().includes('manual trigger') ||
        (activeNode.type === 'trigger' &&
          !activeNode.label.toLowerCase().includes('chat') &&
          !activeNode.label.toLowerCase().includes('webhook')));

    const is999Scraper =
      activeNode.icon === '999-scraper' ||
      activeNode.icon === '999_scraper' ||
      activeNode.icon === '999md' ||
      activeNode.label.toLowerCase().includes('999') ||
      activeNode.label.toLowerCase().includes('scraper');

    const isSplitOut =
      activeNode.icon === 'split-out' ||
      activeNode.icon === 'split_out' ||
      activeNode.label.toLowerCase().includes('split out') ||
      activeNode.label.toLowerCase().includes('split-out');

    const isCityLookup =
      activeNode.icon === 'city-lookup' ||
      activeNode.icon === 'citylookup' ||
      activeNode.icon === 'location-lookup' ||
      activeNode.label.toLowerCase().includes('city lookup') ||
      activeNode.label.toLowerCase().includes('location lookup');

    const isGalltransRoutes =
      activeNode.icon === 'galltrans-routes' ||
      activeNode.icon === 'galltrans' ||
      activeNode.icon === 'route-search' ||
      activeNode.icon === 'bus' ||
      activeNode.label.toLowerCase().includes('galltrans') ||
      activeNode.label.toLowerCase().includes('routes');

    // Find the previous node (node that connects TO this node)
    const previousNodeId = connections.find(c => c.to === activeNode.id)?.from;
    const previousNode = previousNodeId ? nodes.find(n => n.id === previousNodeId) : null;

    // Get input/output data for current node
    const nodeExecutionData = executionData[activeNode.id];
    const inputData = nodeExecutionData?.input || (previousNodeId ? executionData[previousNodeId]?.output : null);
    const outputData = nodeExecutionData?.output;

    // ✅ Removed heavy console.log to reduce noise in console
    // console.log('N8NNodeConfig - node:', activeNode, ...);

    return {
      isTelegram,
      isCallHistory,
      isGoogleSheets,
      isZohoCRM,
      isAmoCRM,
      isBitrix24,
      isOdoo,
      isKalinaCall,
      isWaitCallCompletion,
      isGroqAnalysis,
      isBasicLLMChain,
      isGroqChatModel,
      isWebhookTrigger,
      isRespondToWebhook,
      isInfobipEmail,
      isInfobipSMS,
      isAltegio,
      isHTTPRequest,
      isRAG,
      isManualTrigger,
      is999Scraper,
      isSplitOut,
      isCityLookup,
      isGalltransRoutes,
      previousNode,
      inputData,
      outputData,
    };
  }, [activeNode, connections, nodes, executionData, isChatTrigger]);

  // Destructure memoized values for easier access
  const {
    isTelegram,
    isCallHistory,
    isGoogleSheets,
    isZohoCRM,
    isAmoCRM,
    isBitrix24,
    isOdoo,
    isKalinaCall,
    isWaitCallCompletion,
    isGroqAnalysis,
    isBasicLLMChain,
    isGroqChatModel,
    isWebhookTrigger,
    isRespondToWebhook,
    isInfobipEmail,
    isInfobipSMS,
    isAltegio,
    isHTTPRequest,
    isRAG,
    isManualTrigger,
    is999Scraper,
    isSplitOut,
    isCityLookup,
    isGalltransRoutes,
    previousNode,
    inputData,
    outputData,
  } = nodeTypeChecks;

  // Debug: Log node info when panel opens
  console.log('[N8NNodeConfig] activeNode:', { id: activeNode.id, icon: activeNode.icon, label: activeNode.label, isCityLookup });

  // Render 999.md Scraper Config
  if (is999Scraper) {
    console.log('Rendering 999ScraperConfig');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataFor999 = nodeData.input || previousNodeData?.output || inputData;
    const outputDataFor999 = nodeData.output || outputData;

    return (
      <N8N999ScraperConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputDataFor999}
        outputData={outputDataFor999}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render Split Out Config
  if (isSplitOut) {
    console.log('Rendering SplitOutConfig');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForSplit = nodeData.input || previousNodeData?.output || inputData;
    const outputDataForSplit = nodeData.output || outputData;

    return (
      <N8NSplitOutConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputDataForSplit}
        outputData={outputDataForSplit}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render Groq Chat Model Config
  if (isGroqChatModel) {
    console.log('Rendering GroqChatModelConfig');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForGroq = nodeData.input || previousNodeData?.output || previousNode?.config?.pinnedData || inputData;
    const outputDataForGroq = nodeData.output || outputData;

    // Build nodeSources for INPUT panel - show all connected source nodes
    const sourceNodeIds = connections.filter(c => c.to === activeNode.id).map(c => c.from);
    const nodeSourcesToShow = sourceNodeIds.map(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return null;
      const sourceData = executionData[sourceId]?.output || sourceNode.config?.pinnedData;
      return {
        nodeName: sourceNode.label,
        nodeIcon: sourceNode.icon,
        data: sourceData,
        itemCount: Array.isArray(sourceData) ? sourceData.length : sourceData ? 1 : 0,
      };
    }).filter(Boolean) as Array<{ nodeName: string; nodeIcon?: string; data: any; itemCount?: number }>;

    // Also check if this is a sub-node connected to a parent (Basic LLM Chain)
    const parentNode = nodes.find(n => n.config?.connectedModelId === activeNode.id);

    return (
      <N8NGroqChatModelConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
        }}
        onExecutionUpdate={onExecutionUpdate}
        inputData={inputDataForGroq}
        outputData={outputDataForGroq}
        parentNodeId={parentNode?.id}
        nodeSources={nodeSourcesToShow}
      />
    );
  }

  // Render Basic LLM Chain Config
  if (isBasicLLMChain) {
    console.log('Rendering BasicLLMChainConfig');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForLLM = nodeData.input || previousNodeData?.output || previousNode?.config?.pinnedData || inputData;
    const outputDataForLLM = nodeData.output || outputData;

    // Build nodeSources for INPUT panel - show all connected source nodes
    const sourceNodeIds = connections.filter(c => c.to === activeNode.id).map(c => c.from);
    const nodeSourcesToShow = sourceNodeIds.map(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return null;
      const sourceData = executionData[sourceId]?.output || sourceNode.config?.pinnedData;
      return {
        nodeName: sourceNode.label,
        nodeIcon: sourceNode.icon,
        data: sourceData,
        itemCount: Array.isArray(sourceData) ? sourceData.length : sourceData ? 1 : 0,
      };
    }).filter(Boolean) as Array<{ nodeName: string; nodeIcon?: string; data: any; itemCount?: number }>;

    return (
      <N8NBasicLLMChainConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
        }}
        inputData={inputDataForLLM}
        outputData={outputDataForLLM}
        nodeSources={nodeSourcesToShow}
      />
    );
  }

  // Render City Lookup Config
  if (isCityLookup) {
    console.log('Rendering CityLookupConfig', { icon: activeNode.icon, label: activeNode.label });
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForCity = nodeData.input || previousNodeData?.output || previousNode?.config?.pinnedData || inputData;
    const outputDataForCity = nodeData.output || outputData;

    // Build nodeSources for INPUT panel - show all connected source nodes
    const sourceNodeIds = connections.filter(c => c.to === activeNode.id).map(c => c.from);
    console.log('[CityLookup] sourceNodeIds:', sourceNodeIds);
    console.log('[CityLookup] executionData:', executionData);
    console.log('[CityLookup] nodes:', nodes.map(n => ({ id: n.id, label: n.label, hasPinnedData: !!n.config?.pinnedData })));

    const nodeSourcesToShow = sourceNodeIds.map(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return null;
      const sourceData = executionData[sourceId]?.output || sourceNode.config?.pinnedData;
      console.log(`[CityLookup] Source node "${sourceNode.label}":`, {
        executionOutput: executionData[sourceId]?.output,
        pinnedData: sourceNode.config?.pinnedData,
        finalSourceData: sourceData
      });
      return {
        nodeName: sourceNode.label,
        nodeIcon: sourceNode.icon,
        data: sourceData,
        itemCount: Array.isArray(sourceData) ? sourceData.length : sourceData ? 1 : 0,
      };
    }).filter(Boolean) as Array<{ nodeName: string; nodeIcon?: string; data: any; itemCount?: number }>;

    return (
      <N8NCityLookupConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
        }}
        onExecutionUpdate={(nodeId, data) => {
          if (onExecutionUpdate) {
            onExecutionUpdate(nodeId, data);
          }
        }}
        inputData={inputDataForCity}
        outputData={outputDataForCity}
        previousNodeLabel={previousNode?.label}
        nodeSources={nodeSourcesToShow}
      />
    );
  }

  // Render Galltrans Routes Config
  if (isGalltransRoutes) {
    console.log('Rendering GalltransRoutesConfig', { icon: activeNode.icon, label: activeNode.label });
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForRoutes = nodeData.input || previousNodeData?.output || previousNode?.config?.pinnedData || inputData;
    const outputDataForRoutes = nodeData.output || outputData;

    // Build nodeSources for INPUT panel
    const sourceNodeIds = connections.filter(c => c.to === activeNode.id).map(c => c.from);
    const nodeSourcesToShow = sourceNodeIds.map(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return null;
      const sourceData = executionData[sourceId]?.output || sourceNode.config?.pinnedData;
      return {
        nodeName: sourceNode.label,
        nodeIcon: sourceNode.icon,
        data: sourceData,
        itemCount: Array.isArray(sourceData) ? sourceData.length : sourceData ? 1 : 0,
      };
    }).filter(Boolean) as Array<{ nodeName: string; nodeIcon?: string; data: any; itemCount?: number }>;

    return (
      <N8NGalltransRoutesConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
        }}
        inputData={inputDataForRoutes}
        outputData={outputDataForRoutes}
        nodeSources={nodeSourcesToShow}
      />
    );
  }

  // Render Respond to Webhook Config
  if (isRespondToWebhook) {
    // Get execution data for this node and previous node (like HTTP Request)
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    
    // DEBUG: Log all relevant data sources
    console.log('[RespondToWebhook] Debug:', {
      activeNodeId: activeNode.id,
      previousNodeId: previousNode?.id,
      previousNodeLabel: previousNode?.label,
      nodeDataInput: nodeData.input,
      previousNodeOutput: previousNodeData?.output,
      globalInputData: inputData,
      globalOutputData: outputData,
      allExecutionData: executionData,
    });
    
    // Prefer: nodeData.input > previousNodeData.output > global inputData
    const inputDataForWebhook = nodeData.input || previousNodeData?.output || inputData || {};
    const outputDataForWebhook = nodeData.output || outputData;
    
    console.log('[RespondToWebhook] Final inputData:', inputDataForWebhook);
    return (
      <N8NRespondToWebhookConfig
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        initialConfig={activeNode.config || {}}
        inputData={inputDataForWebhook}
        outputData={outputDataForWebhook}
      />
    );
  }

  // Render RAG Config
  if (isRAG) {
    return (
      <N8NRAGConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
        }}
        inputData={inputData}
        outputData={outputData}
      />
    );
  }

  // Render HTTP Request Config
  if (isHTTPRequest) {
    console.log('Rendering HTTPRequestConfigNew with previousNode:', previousNode);

    // Get execution data for this node and previous node
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const previousNodePinnedData = previousNode?.config?.pinnedData;
    const inputDataForHTTP = nodeData.input || previousNodeData?.output || previousNodePinnedData || inputData;
    const outputDataForHTTP = nodeData.output || outputData;

    // Build nodeSources for INPUT panel - get all connected source nodes
    const sourceNodeIds = connections.filter(c => c.to === activeNode.id).map(c => c.from);
    const nodeSourcesToShow = sourceNodeIds.map(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return null;
      const sourceData = executionData[sourceId]?.output || sourceNode.config?.pinnedData;
      return {
        nodeName: sourceNode.label,
        nodeIcon: sourceNode.icon,
        data: sourceData,
        itemCount: Array.isArray(sourceData) ? sourceData.length : (sourceData ? 1 : 0)
      };
    }).filter(Boolean) as Array<{ nodeName: string; nodeIcon?: string; data: any; itemCount?: number }>;

    return (
      <N8NHTTPRequestConfigNew
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
        }}
        onExecutionUpdate={(data) => {
          if (onExecutionUpdate) {
            onExecutionUpdate(activeNode.id, data);
          }
        }}
        inputData={inputDataForHTTP}
        outputData={outputDataForHTTP}
        previousNodeLabel={previousNode?.label}
        nodeSources={nodeSourcesToShow}
      />
    );
  }

  // Render Infobip Email Config - New Version with INPUT/OUTPUT panels
  if (isInfobipEmail) {
    console.log('Rendering InfobipEmailConfigNew with previousNode:', previousNode);
    
    // Get execution data for this node and previous node
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    // Prefer node's own input data (set during execution) over previous node's output
    const inputData = nodeData.input || previousNodeData?.output;
    const outputData = nodeData.output;
    
    console.log('Email inputData calculation:', { nodeDataInput: nodeData.input, previousNodeOutput: previousNodeData?.output, finalInputData: inputData });
    
    return (
      <N8NInfobipEmailConfigNew
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputData}
        outputData={outputData}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render Infobip SMS Config - New Version with INPUT/OUTPUT panels
  if (isInfobipSMS) {
    console.log('Rendering InfobipSMSConfigNew with previousNode:', previousNode);
    
    // Get execution data for this node and previous node
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    // Prefer node's own input data (set during execution) over previous node's output
    const inputData = nodeData.input || previousNodeData?.output;
    const outputData = nodeData.output;
    
    console.log('SMS inputData calculation:', { nodeDataInput: nodeData.input, previousNodeOutput: previousNodeData?.output, finalInputData: inputData });
    
    return (
      <N8NInfobipSMSConfigNew
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputData}
        outputData={outputData}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render Altegio Config (shared panel for all Altegio actions)
  if (isAltegio) {
    // Get execution data for this node and previous node
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForAltegio = nodeData.input || previousNodeData?.output || inputData;
    const outputDataForAltegio = nodeData.output || outputData;
    
    return (
      <N8NAltegioBookingConfig
        isOpen={isOpen}
        onClose={onClose}
        node={activeNode}
        onUpdateConfig={onUpdateConfig}
        inputData={inputDataForAltegio}
        outputData={outputDataForAltegio}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render Manual Trigger Config
  if (isManualTrigger) {
    console.log('Rendering ManualTriggerConfig');
    return (
      <N8NManualTriggerConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
         }
         onClose();
       }}
      />
    );
  }

  // Render Webhook Trigger Config
  if (isWebhookTrigger) {
    // Get execution data for this node
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForWebhook = nodeData.input || previousNodeData?.output || inputData;
    
    // Use pinned data from config as output if available
    const pinnedData = activeNode.config?.pinnedData;
    const outputDataForWebhook = pinnedData || nodeData.output || outputData;
    
    return (
      <N8NWebhookTriggerConfigNew
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);

            // If pinnedData exists, also update executionData to propagate to next node
            if (config.pinnedData) {
              console.log('[Webhook] Setting output data from pinned data:', config.pinnedData);
            }
          }
        }}
        inputData={inputDataForWebhook}
        outputData={outputDataForWebhook}
        workflowId={workflowId}
      />
    );
  }

  // Render Kalina Call Config
  if (isKalinaCall) {
    
    // Get execution data for this node and previous node
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputData = previousNodeData?.output || nodeData.input;
    const outputData = nodeData.output;
    
    return (
      <N8NKalinaCallConfigNew
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputData}
        outputData={outputData}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render Wait Call Completion Config
  if (isWaitCallCompletion) {
    console.log('Rendering WaitCallConfig');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForWait = nodeData.input || previousNodeData?.output || inputData;
    const outputDataForWait = nodeData.output || outputData;

    return (
      <N8NWaitCallConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputDataForWait}
        outputData={outputDataForWait}
      />
    );
  }

  // Render Groq Analysis Config - New Version with INPUT/OUTPUT panels
  if (isGroqAnalysis) {
    console.log('Rendering GroqAnalysisConfigNew with previousNode:', previousNode);
    
    // Get execution data for this node and previous node
    const nodeData = executionData[activeNode.id] || {};

    // Build nodeSources for INPUT panel - get all connected source nodes
    const sourceNodeIds = connections.filter(c => c.to === activeNode.id).map(c => c.from);
    console.log('[GroqAnalysis] sourceNodeIds:', sourceNodeIds);
    console.log('[GroqAnalysis] executionData:', executionData);
    console.log('[GroqAnalysis] nodes with pinnedData:', nodes.filter(n => n.config?.pinnedData).map(n => n.label));

    const nodeSources = sourceNodeIds.map(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) return null;
      // Priority: execution output > pinned data
      const sourceData = executionData[sourceId]?.output || sourceNode.config?.pinnedData;
      console.log(`[GroqAnalysis] Source node "${sourceNode.label}":`, {
        executionOutput: executionData[sourceId]?.output,
        pinnedData: sourceNode.config?.pinnedData,
        finalSourceData: sourceData
      });
      return {
        nodeName: sourceNode.label,
        nodeIcon: sourceNode.icon,
        data: sourceData,
        itemCount: Array.isArray(sourceData) ? sourceData.length : (sourceData ? 1 : 0)
      };
    }).filter(Boolean) as Array<{ nodeName: string; nodeIcon?: string; data: any; itemCount?: number }>;

    // Get input data from the first source node (for backward compatibility)
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const previousNodePinnedData = previousNode?.config?.pinnedData;
    const inputData = nodeData.input || previousNodeData?.output || previousNodePinnedData;
    const outputData = nodeData.output;

    console.log('[GroqAnalysis] Final input data:', inputData);

    // Use the Groq Analysis config (n8n style)
    return (
      <N8NGroqAnalysisConfigNew
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        onExecutionUpdate={(nodeId, data) => {
          if (onExecutionUpdate) {
            onExecutionUpdate(nodeId, data);
          }
        }}
        inputData={inputData}
        outputData={outputData}
        nodeSources={nodeSources}
      />
    );
  }

  // Render Odoo Config
  if (isOdoo) {
    console.log('Rendering OdooConfig');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForOdoo = nodeData.input || previousNodeData?.output || inputData;
    const outputDataForOdoo = nodeData.output || outputData;

    return (
      <N8NOdooConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputDataForOdoo}
        outputData={outputDataForOdoo}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render amoCRM Config
  if (isAmoCRM) {
    console.log('Rendering AmoCRMConfig');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForAmo = nodeData.input || previousNodeData?.output || inputData;
    const outputDataForAmo = nodeData.output || outputData;

    return (
      <N8NAmoCRMConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputDataForAmo}
        outputData={outputDataForAmo}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render Bitrix24 Config
  if (isBitrix24) {
    console.log('Rendering Bitrix24Config');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForBitrix = nodeData.input || previousNodeData?.output || inputData;
    const outputDataForBitrix = nodeData.output || outputData;

    return (
      <N8NBitrix24Config
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputDataForBitrix}
        outputData={outputDataForBitrix}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  // Render Zoho CRM Config
  if (isZohoCRM) {
    console.log('Rendering ZohoCRMConfig');

    // Build nodeSources for Zoho like HTTP does
    const zohoNodeSources = nodes.map(n => {
      const sourceData = executionData[n.id]?.output || executionData[n.id]?.input;
      if (!sourceData) return null;
      return {
        nodeName: n.label,
        nodeIcon: n.icon,
        data: sourceData,
        itemCount: Array.isArray(sourceData) ? sourceData.length : (sourceData ? 1 : 0)
      };
    }).filter(Boolean) as Array<{ nodeName: string; nodeIcon?: string; data: any; itemCount?: number }>;

    return (
      <N8NZohoCRMConfig
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
        }}
        onExecutionUpdate={(data) => {
          if (onExecutionUpdate) {
            onExecutionUpdate(activeNode.id, data);
          }
        }}
        inputData={inputData}
        outputData={outputData}
        previousNodeLabel={previousNode?.label}
        nodeSources={zohoNodeSources}
      />
    );
  }

  // Render Call History Config
  if (isCallHistory) {
    console.log('Rendering CallHistoryConfig');
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputDataForHistory = nodeData.input || previousNodeData?.output || inputData;
    const outputDataForHistory = nodeData.output || outputData;

    return (
      <N8NCallHistoryConfig
        isOpen={isOpen}
        onClose={onClose}
        node={activeNode}
        onUpdateConfig={onUpdateConfig}
        inputData={inputDataForHistory}
        outputData={outputDataForHistory}
      />
    );
  }

  // Render Google Sheets Config - New Version with INPUT/OUTPUT panels
  if (isGoogleSheets) {
    console.log('Rendering GoogleSheetsConfigNew with previousNode:', previousNode);
    
    // Get execution data for this node and previous node
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    
    // Check for pinned data
    const previousNodePinnedData = previousNode?.config?.pinnedData;
    const inputData = nodeData.input || previousNodePinnedData || previousNodeData?.output;
    const outputData = nodeData.output;
    
    return (
      <N8NGoogleSheetsConfigNew
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          // Only save config, don't close - closing is handled by onClose
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
        }}
        inputData={inputData}
        outputData={outputData}
      />
    );
  }

  // Render Telegram Config - New Version with INPUT/OUTPUT panels
  if (isTelegram) {
    console.log('Rendering TelegramConfigNew with previousNode:', previousNode);
    
    // Get execution data for this node and previous node
    const nodeData = executionData[activeNode.id] || {};
    const previousNodeData = previousNode ? executionData[previousNode.id] : null;
    const inputData = previousNodeData?.output || nodeData.input;
    const outputData = nodeData.output;
    
    return (
      <N8NTelegramConfigNew
        node={activeNode}
        onClose={onClose}
        onSave={(config) => {
          if (onUpdateConfig) {
            onUpdateConfig(activeNode.id, config);
          }
          onClose();
        }}
        inputData={inputData}
        outputData={outputData}
        previousNodeLabel={previousNode?.label}
      />
    );
  }

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text: message,
      timestamp: new Date(),
      type: 'user',
    };

    setMessages(prev => [...prev, newMessage]);
    
    // Call the callback to send message to next node
    if (onSendMessage) {
      onSendMessage(activeNode.id, message);
    }

    // Add system response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        text: `Message sent to workflow: "${message}"`,
        timestamp: new Date(),
        type: 'system',
      }]);
    }, 500);

    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render Chat Interface for Chat Trigger - Floating & Draggable
  if (isChatTrigger) {
    return (
      <div 
        ref={panelRef}
        className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          width: '380px',
          height: isMinimized ? '50px' : '450px',
          backgroundColor: '#1e1e1e',
          border: '1px solid #444',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          transition: isDragging ? 'none' : 'height 0.2s ease',
        }}
      >
        {/* Header - Draggable */}
        <div 
          className="flex items-center justify-between px-3 py-2 cursor-move select-none"
          style={{ 
            backgroundColor: '#252525',
            borderBottom: isMinimized ? 'none' : '1px solid #333',
          }}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal style={{ width: '14px', height: '14px', color: '#555' }} />
            <div 
              className="flex items-center justify-center rounded"
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: '#2d2d2d',
              }}
            >
              <MessageCircle style={{ width: '16px', height: '16px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                {activeNode.label}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded hover:bg-[#333] transition-colors"
            >
              {isMinimized ? (
                <Maximize2 style={{ width: '14px', height: '14px', color: '#888' }} />
              ) : (
                <Minimize2 style={{ width: '14px', height: '14px', color: '#888' }} />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#333] transition-colors"
            >
              <X style={{ width: '14px', height: '14px', color: '#888' }} />
            </button>
          </div>
        </div>

        {/* Content - Hidden when minimized */}
        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div 
              className="flex-1 overflow-y-auto p-3 space-y-2"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle style={{ width: '40px', height: '40px', color: '#444', marginBottom: '12px' }} />
                  <div style={{ color: '#666', fontSize: '13px' }}>
                    Send a message to trigger your workflow
                  </div>
                </div>
              )}
              
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[80%] px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: msg.type === 'user' ? '#ff6b5a' : '#2d2d2d',
                      color: msg.type === 'user' ? '#fff' : '#aaa',
                    }}
                  >
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>{msg.text}</div>
                    <div 
                      style={{ 
                        fontSize: '10px', 
                        marginTop: '3px',
                        opacity: 0.7,
                      }}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div 
              className="flex items-center gap-2 p-2"
              style={{ 
                backgroundColor: '#252525',
                borderTop: '1px solid #333',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#1e1e1e] text-white placeholder-[#666] outline-none"
                style={{
                  fontSize: '13px',
                  border: '1px solid #333',
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="flex items-center justify-center rounded-lg transition-all"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: message.trim() ? '#ff6b5a' : '#333',
                  cursor: message.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                <Send 
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: message.trim() ? '#fff' : '#666',
                  }} 
                />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Generic Node Configuration Panel - Also Floating & Draggable
  return (
    <div 
      ref={panelRef}
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: '400px',
        maxHeight: isMinimized ? '50px' : '500px',
        backgroundColor: '#1e1e1e',
        border: '1px solid #444',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        transition: isDragging ? 'none' : 'max-height 0.2s ease',
      }}
    >
      {/* Header - Draggable */}
      <div 
        className="flex items-center justify-between px-3 py-2 cursor-move select-none"
        style={{ 
          backgroundColor: '#252525',
          borderBottom: isMinimized ? 'none' : '1px solid #333',
        }}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal style={{ width: '14px', height: '14px', color: '#555' }} />
          <div 
            className="flex items-center justify-center rounded"
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: '#2d2d2d',
            }}
          >
            <Settings style={{ width: '16px', height: '16px', color: '#fff' }} />
          </div>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
            {activeNode.label}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded hover:bg-[#333] transition-colors"
          >
            {isMinimized ? (
              <Maximize2 style={{ width: '14px', height: '14px', color: '#888' }} />
            ) : (
              <Minimize2 style={{ width: '14px', height: '14px', color: '#888' }} />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#333] transition-colors"
          >
            <X style={{ width: '14px', height: '14px', color: '#888' }} />
          </button>
        </div>
      </div>

      {/* Configuration Content - Hidden when minimized */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Node Type Info */}
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: '#252525', border: '1px solid #333' }}
              >
                <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                  Node Type
                </div>
                <div style={{ color: '#fff', fontSize: '13px' }}>
                  {activeNode.icon || activeNode.type}
                </div>
              </div>

              {/* Description */}
              {activeNode.description && (
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                >
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>
                    Description
                  </div>
                  <div style={{ color: '#fff', fontSize: '13px' }}>
                    {activeNode.description}
                  </div>
                </div>
              )}

              {/* Placeholder for future configuration options */}
              <div 
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: '#252525', border: '1px dashed #444' }}
              >
                <Settings style={{ width: '32px', height: '32px', color: '#444', margin: '0 auto 12px' }} />
                <div style={{ color: '#666', fontSize: '13px' }}>
                  Configuration options coming soon
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="flex items-center justify-end gap-2 px-4 py-3"
            style={{ 
              backgroundColor: '#252525',
              borderTop: '1px solid #333',
            }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#444]"
              style={{
                backgroundColor: '#333',
                color: '#fff',
              }}
            >
              Close
            </button>
            <button
              onClick={() => {
                // Save config
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
              style={{
                backgroundColor: '#ff6b5a',
                color: '#fff',
              }}
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  );
};