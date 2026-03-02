import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronDown,
  Send,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { N8NExpressionSelector } from './N8NExpressionSelector';

interface TelegramConfig {
  botToken: string;
  chatId: string;
  text: string;
  parseMode: 'none' | 'Markdown' | 'HTML' | 'MarkdownV2';
}

interface N8NTelegramConfigProps {
  isOpen: boolean;
  onClose: () => void;
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: TelegramConfig;
  } | null;
  onUpdateConfig?: (nodeId: string, config: TelegramConfig) => void;
  previousNode?: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: any;
  } | null;
  inputData?: any;
}

const TELEGRAM_CREDENTIALS_KEY = 'kalina-telegram-credentials';

// Load saved credentials from localStorage
const loadSavedCredentials = (): { botToken: string; chatId: string } => {
  try {
    const saved = localStorage.getItem(TELEGRAM_CREDENTIALS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        botToken: parsed.botToken || '',
        chatId: parsed.chatId || '',
      };
    }
  } catch (e) {
    console.error('Failed to load Telegram credentials:', e);
  }
  return { botToken: '', chatId: '' };
};

// Save credentials to localStorage
const saveCredentials = (botToken: string, chatId: string) => {
  try {
    localStorage.setItem(TELEGRAM_CREDENTIALS_KEY, JSON.stringify({ botToken, chatId }));
  } catch (e) {
    console.error('Failed to save Telegram credentials:', e);
  }
};

const getDefaultConfig = (): TelegramConfig => {
  const savedCreds = loadSavedCredentials();
  return {
    botToken: savedCreds.botToken,
    chatId: savedCreds.chatId,
    text: '={{ $json.chatInput }}',
    parseMode: 'none',
  };
};

const parseModeOptions = [
  { value: 'none', label: 'None' },
  { value: 'Markdown', label: 'Markdown' },
  { value: 'HTML', label: 'HTML' },
  { value: 'MarkdownV2', label: 'MarkdownV2' },
];

export const N8NTelegramConfig: React.FC<N8NTelegramConfigProps> = ({
  isOpen,
  onClose,
  node,
  onUpdateConfig,
  previousNode,
  inputData,
}) => {
  console.log('N8NTelegramConfig rendered - isOpen:', isOpen, 'node:', node, 'previousNode:', previousNode);
  
  const [config, setConfig] = useState<TelegramConfig>(getDefaultConfig);
  const [position, setPosition] = useState({ 
    x: Math.max(20, (window.innerWidth - 440) / 2), 
    y: Math.max(20, (window.innerHeight - 600) / 2) 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showToken, setShowToken] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [textMode, setTextMode] = useState<'fixed' | 'expression'>('expression');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Expression selector state
  const [showExpressionSelector, setShowExpressionSelector] = useState(false);
  const [activeFieldTarget, setActiveFieldTarget] = useState<'text' | 'chatId' | null>(null);

  // Generate text options based on previous node type
  const getTextOptionsForPreviousNode = () => {
    if (!previousNode) {
      return {
        nodeType: 'none',
        nodeName: 'Fără nod conectat',
        options: [
          { value: 'custom', label: 'Text personalizat', expression: '', field: '' }
        ],
        description: 'Conectează un nod pentru a primi date automat'
      };
    }

    const icon = previousNode.icon?.toLowerCase() || '';
    const label = previousNode.label?.toLowerCase() || '';

    // Webhook Trigger Node
    if (icon === 'webhook' || icon === 'webhook-trigger' || label.includes('webhook')) {
      return {
        nodeType: 'webhook',
        nodeName: 'Webhook',
        options: [
          { value: 'body', label: '📦 Body complet', expression: '={{ $json.body }}', field: 'body' },
          { value: 'headers', label: '📋 Headers', expression: '={{ $json.headers }}', field: 'headers' },
          { value: 'query', label: '🔍 Query params', expression: '={{ $json.query }}', field: 'query' },
          { value: 'method', label: '📡 HTTP Method', expression: '={{ $json.method }}', field: 'method' },
          { value: 'timestamp', label: '📅 Timestamp', expression: '={{ $json.timestamp }}', field: 'timestamp' },
          { value: 'all', label: '📦 Toate datele (JSON)', expression: '={{ JSON.stringify($json) }}', field: 'all' },
        ],
        description: 'Primește datele de la webhook HTTP request'
      };
    }

    // Chat Trigger Node
    if (icon === 'chat-trigger' || icon === 'messagecircle' || label.includes('chat')) {
      return {
        nodeType: 'chat-trigger',
        nodeName: 'Chat Trigger',
        options: [
          { value: 'chatInput', label: '💬 Mesajul utilizatorului', expression: '={{ $json.chatInput }}', field: 'chatInput' },
        ],
        description: 'Primește mesajul trimis de utilizator în chat'
      };
    }


    // Call History Node - with ALL real database fields
    if (icon === 'call-history' || label.includes('call history')) {
      return {
        nodeType: 'call-history',
        nodeName: 'Call History',
        options: [
          { value: 'callerNumber', label: '📱 Număr apelant', expression: '={{ $json.callerNumber }}', field: 'callerNumber' },
          { value: 'phoneNumber', label: '📞 Număr telefon', expression: '={{ $json.phoneNumber }}', field: 'phoneNumber' },
          { value: 'contactName', label: '👤 Nume contact', expression: '={{ $json.contactName }}', field: 'contactName' },
          { value: 'score', label: '⭐ Scor conversație', expression: '={{ $json.score }}', field: 'score' },
          { value: 'duration', label: '⏱️ Durată (secunde)', expression: '={{ $json.duration }}', field: 'duration' },
          { value: 'durationFormatted', label: '🕐 Durată (mm:ss)', expression: '={{ $json.durationFormatted }}', field: 'durationFormatted' },
          { value: 'status', label: '📊 Status apel', expression: '={{ $json.status }}', field: 'status' },
          { value: 'transcription', label: '📝 Transcripție completă', expression: '={{ $json.transcription }}', field: 'transcription' },
          { value: 'summary', label: '📋 Rezumat', expression: '={{ $json.summary }}', field: 'summary' },
          { value: 'conclusion', label: '📌 Concluzie AI', expression: '={{ $json.conclusion }}', field: 'conclusion' },
          { value: 'tags', label: '🏷️ Tag-uri AI', expression: '={{ Array.isArray($json.tags) ? $json.tags.join(", ") : $json.tags }}', field: 'tags' },
          { value: 'agentEvaluation', label: '🤖 Evaluare agent', expression: '={{ $json.agentEvaluation }}', field: 'agentEvaluation' },
          { value: 'timestamp', label: '📅 Data/Ora apel', expression: '={{ $json.timestamp }}', field: 'timestamp' },
          { value: 'conversationId', label: '🆔 ID Conversație', expression: '={{ $json.conversationId }}', field: 'conversationId' },
          { value: 'language', label: '🌍 Limba', expression: '={{ $json.language }}', field: 'language' },
          { value: 'costUsd', label: '💵 Cost (USD)', expression: '={{ $json.costUsd }}', field: 'costUsd' },
          { value: 'analysisConclusion', label: '📊 Analiză completă', expression: '={{ $json.analysisConclusion }}', field: 'analysisConclusion' },
        ],
        description: 'Selectează ce date să trimiți din istoricul apelurilor REALE'
      };
    }
    // Get Transcription Node
    if (icon === 'get-transcription' || label.includes('transcription')) {
      return {
        nodeType: 'get-transcription',
        nodeName: 'Get Transcription',
        options: [
          { value: 'transcription', label: '📝 Transcripție completă', expression: '={{ $json.transcription }}', field: 'transcription' },
        ],
        description: 'Primește transcripția conversației'
      };
    }

    // Get Audio Node
    if (icon === 'get-audio' || label.includes('audio')) {
      return {
        nodeType: 'get-audio',
        nodeName: 'Get Audio',
        options: [
          { value: 'audioUrl', label: '🔊 Link audio', expression: '={{ $json.audioUrl }}', field: 'audioUrl' },
        ],
        description: 'Primește link-ul către fișierul audio'
      };
    }

    // Webhook Node
    if (icon === 'webhook' || label.includes('webhook')) {
      return {
        nodeType: 'webhook',
        nodeName: 'Webhook',
        options: [
          { value: 'body', label: '📦 Body complet', expression: '={{ JSON.stringify($json.body) }}', field: 'body' },
        ],
        description: 'Primește datele de la webhook'
      };
    }

    // RAG Search Node
    if (icon === 'rag' || label.includes('rag')) {
      return {
        nodeType: 'rag',
        nodeName: 'RAG Search',
        options: [
          { value: 'groqResponse', label: '🤖 Răspuns Groq AI', expression: '={{ $json.groqResponse }}', field: 'groqResponse' },
          { value: 'topResults', label: '📊 Top rezultate', expression: '={{ JSON.stringify($json.topResults) }}', field: 'topResults' },
          { value: 'query', label: '🔍 Query căutare', expression: '={{ $json.query }}', field: 'query' },
          { value: 'matchCount', label: '📈 Număr matches', expression: '={{ $json.matchCount }}', field: 'matchCount' },
        ],
        description: 'Rezultate din RAG knowledge base'
      };
    }

    // Groq Analysis Node
    if (icon === 'groq-analysis' || label.toLowerCase().includes('groq')) {
      return {
        nodeType: 'groq-analysis',
        nodeName: 'Groq Analysis',
        options: [
          { value: 'analysis', label: '🤖 Analiză completă', expression: '={{ $json.analysis }}', field: 'analysis' },
          { value: 'rawAnalysis', label: '📄 Răspuns text brut', expression: '={{ $json.rawAnalysis }}', field: 'rawAnalysis' },
          { value: 'transcript', label: '📝 Transcripție originală', expression: '={{ $json.transcript }}', field: 'transcript' },
          { value: 'summary', label: '📋 Rezumat conversație', expression: '={{ $json.summary }}', field: 'summary' },
          { value: 'conversationId', label: '🆔 ID Conversație', expression: '={{ $json.conversationId }}', field: 'conversationId' },
          { value: 'all', label: '📦 Toate datele (JSON)', expression: '={{ JSON.stringify($json) }}', field: 'all' },
        ],
        description: 'Selectează ce date să trimiți din analiza Groq AI'
      };
    }

    // Zoho CRM Nodes
    if (icon.startsWith('zoho-') || label.toLowerCase().includes('zoho')) {
      return {
        nodeType: 'zoho-crm',
        nodeName: previousNode.label || 'Zoho CRM',
        options: [
          { value: 'Full_Name', label: '👤 Nume complet', expression: '={{ $json.Full_Name }}', field: 'Full_Name' },
          { value: 'First_Name', label: '👤 Prenume', expression: '={{ $json.First_Name }}', field: 'First_Name' },
          { value: 'Last_Name', label: '👤 Nume familie', expression: '={{ $json.Last_Name }}', field: 'Last_Name' },
          { value: 'Email', label: '📧 Email', expression: '={{ $json.Email }}', field: 'Email' },
          { value: 'Phone', label: '📱 Telefon', expression: '={{ $json.Phone }}', field: 'Phone' },
          { value: 'Mobile', label: '📲 Mobil', expression: '={{ $json.Mobile }}', field: 'Mobile' },
          { value: 'Company', label: '🏢 Companie', expression: '={{ $json.Company }}', field: 'Company' },
          { value: 'Lead_Status', label: '📊 Status Lead', expression: '={{ $json.Lead_Status }}', field: 'Lead_Status' },
          { value: 'Lead_Source', label: '📍 Sursă Lead', expression: '={{ $json.Lead_Source }}', field: 'Lead_Source' },
          { value: 'Rating', label: '⭐ Rating', expression: '={{ $json.Rating }}', field: 'Rating' },
          { value: 'Industry', label: '🏭 Industrie', expression: '={{ $json.Industry }}', field: 'Industry' },
          { value: 'City', label: '🌆 Oraș', expression: '={{ $json.City }}', field: 'City' },
          { value: 'Country', label: '🌍 Țară', expression: '={{ $json.Country }}', field: 'Country' },
          { value: 'Description', label: '📝 Descriere', expression: '={{ $json.Description }}', field: 'Description' },
          { value: 'all', label: '📦 Toate datele (JSON)', expression: '={{ JSON.stringify($json) }}', field: 'all' },
        ],
        description: 'Selectează ce date să trimiți din Zoho CRM'
      };
    }

    // HTTP Request Node
    if (icon === 'http-request' || icon === 'http_request' || label.toLowerCase().includes('http request')) {
      return {
        nodeType: 'http-request',
        nodeName: previousNode.label || 'HTTP Request',
        options: [
          { value: 'data', label: '📦 Response Data', expression: '={{ $json.data }}', field: 'data' },
          { value: 'status', label: '📊 Status Code', expression: '={{ $json.status }}', field: 'status' },
          { value: 'statusText', label: '📝 Status Text', expression: '={{ $json.statusText }}', field: 'statusText' },
          { value: 'headers', label: '📋 Response Headers', expression: '={{ $json.headers }}', field: 'headers' },
          { value: 'duration', label: '⏱️ Duration', expression: '={{ $json.duration }}', field: 'duration' },
          { value: 'url', label: '🔗 Request URL', expression: '={{ $json.url }}', field: 'url' },
          { value: 'all', label: '📦 Toate datele (JSON)', expression: '={{ JSON.stringify($json) }}', field: 'all' },
        ],
        description: 'Selectează ce date să trimiți din răspunsul HTTP'
      };
    }

    // Default for unknown nodes
    return {
      nodeType: 'unknown',
      nodeName: previousNode.label || 'Nod necunoscut',
      options: [
        { value: 'all', label: '📦 Toate datele (JSON)', expression: '={{ JSON.stringify($json) }}', field: 'all' },
      ],
      description: `Primește date de la ${previousNode.label}`
    };
  };

  const textOptions = getTextOptionsForPreviousNode();

  // Generate combined expression from selected fields
  const generateCombinedExpression = (fields: string[]) => {
    if (fields.length === 0) return '';
    if (fields.length === 1) return `={{ $json.${fields[0]} }}`;
    return `={{ [${fields.map(f => `"${f}"`).join(', ')}].map(f => $json[f]).join('\\n') }}`;
  };

  // Toggle field selection
  const toggleField = (field: string) => {
    const newFields = selectedFields.includes(field)
      ? selectedFields.filter(f => f !== field)
      : [...selectedFields, field];
    
    setSelectedFields(newFields);
    
    // Update config with combined expression
    if (newFields.length > 0) {
      // Create a readable format for multiple fields
      const expression = `={{ multiField: [${newFields.map(f => `"${f}"`).join(', ')}] }}`;
      updateConfig({ text: expression });
    } else {
      updateConfig({ text: '' });
    }
  };

  // Select all fields
  const selectAllFields = () => {
    const allFields = textOptions.options.map(o => o.field).filter(f => f);
    setSelectedFields(allFields);
    const expression = `={{ multiField: [${allFields.map(f => `"${f}"`).join(', ')}] }}`;
    updateConfig({ text: expression });
  };

  // Clear all selections
  const clearAllFields = () => {
    setSelectedFields([]);
    updateConfig({ text: '' });
  };

  useEffect(() => {
    const defaultConfig = getDefaultConfig();
    if (node?.config) {
      // Merge saved credentials with node config (node config takes priority if exists)
      const mergedConfig = { 
        ...defaultConfig, 
        ...node.config,
        // Use saved credentials if node doesn't have them
        botToken: node.config.botToken || defaultConfig.botToken,
        chatId: node.config.chatId || defaultConfig.chatId,
      };
      setConfig(mergedConfig);
      
      // Restore selectedFields from saved text expression
      const savedText = node.config.text || '';
      if (savedText.includes('multiField:')) {
        const match = savedText.match(/multiField:\s*\[(.*?)\]/);
        if (match && match[1]) {
          const fields = match[1].split(',').map(f => f.trim().replace(/"/g, ''));
          setSelectedFields(fields);
        }
      }
    } else {
      setConfig(defaultConfig);
      setSelectedFields([]);
    }
  }, [node]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 440);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 500);
      
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
  }, [isDragging, dragOffset]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const handleDragStart = (e: React.MouseEvent) => {
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    setIsDragging(true);
  };

  const updateConfig = (updates: Partial<TelegramConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // Save credentials to localStorage when they change
    if (updates.botToken !== undefined || updates.chatId !== undefined) {
      saveCredentials(
        updates.botToken !== undefined ? updates.botToken : config.botToken,
        updates.chatId !== undefined ? updates.chatId : config.chatId
      );
    }
    
    if (onUpdateConfig && node) {
      onUpdateConfig(node.id, newConfig);
    }
  };

  if (!isOpen || !node) return null;

  return (
    <>
    <div 
      ref={panelRef}
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: '440px',
        backgroundColor: '#1e1e1e',
        border: '1px solid #444',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Drag Handle */}
      <div 
        className="flex justify-center py-1.5 cursor-move"
        style={{ backgroundColor: '#252525' }}
        onMouseDown={handleDragStart}
      >
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-[#555]" />
          ))}
        </div>
      </div>

      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ 
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #333',
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center justify-center rounded-lg"
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #2AABEE, #229ED9)',
            }}
          >
            <Send style={{ width: '18px', height: '18px', color: '#fff' }} />
          </div>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
            Telegram
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#333] transition-colors"
        >
          <X style={{ width: '18px', height: '18px', color: '#888' }} />
        </button>
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-5"
        style={{ maxHeight: '70vh' }}
      >
        {/* Bot API Token */}
        <div>
          <label 
            className="block mb-2"
            style={{ color: '#aaa', fontSize: '13px' }}
          >
            Bot API Token
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={config.botToken}
              onChange={(e) => updateConfig({ botToken: e.target.value })}
              placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
              className="w-full px-3 py-2.5 pr-10 rounded-lg outline-none transition-colors"
              style={{
                backgroundColor: '#2d2d2d',
                border: '1px solid #444',
                color: '#fff',
                fontSize: '13px',
              }}
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-[#444] transition-colors"
            >
              {showToken ? (
                <EyeOff style={{ width: '16px', height: '16px', color: '#888' }} />
              ) : (
                <Eye style={{ width: '16px', height: '16px', color: '#888' }} />
              )}
            </button>
          </div>
          <p style={{ color: '#666', fontSize: '11px', marginTop: '6px' }}>
            Get your token from @BotFather on Telegram
          </p>
        </div>

        {/* Chat ID */}
        <div>
          <label 
            className="block mb-2"
            style={{ color: '#aaa', fontSize: '13px' }}
          >
            Chat ID
          </label>
          <input
            type="text"
            value={config.chatId}
            onChange={(e) => updateConfig({ chatId: e.target.value })}
            placeholder="Enter chat ID..."
            className="w-full px-3 py-2.5 rounded-lg outline-none transition-colors"
            style={{
              backgroundColor: '#2d2d2d',
              border: '1px solid #444',
              color: '#fff',
              fontSize: '13px',
            }}
          />
          <p style={{ color: '#666', fontSize: '11px', marginTop: '6px' }}>
            User ID, Group ID, or Channel username (@channel)
          </p>
        </div>

        {/* Text - Adaptive based on previous node */}
        <div>
          {/* Previous Node Indicator */}
          <div 
            className="flex items-center gap-2 mb-3 p-2 rounded-lg"
            style={{
              backgroundColor: previousNode ? '#2a3a2a' : '#3a2a2a',
              border: `1px solid ${previousNode ? '#3a5a3a' : '#5a3a3a'}`,
            }}
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: previousNode ? '#4ade80' : '#f87171' }}
            />
            <span style={{ color: previousNode ? '#4ade80' : '#f87171', fontSize: '12px' }}>
              {previousNode ? `Conectat la: ${textOptions.nodeName}` : 'Niciun nod conectat'}
            </span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <label style={{ color: '#aaa', fontSize: '13px' }}>
              Ce să trimită în Telegram
            </label>
            <div className="flex items-center gap-2">
              <span style={{ color: '#666', fontSize: '11px' }}>Fixed</span>
              <button
                onClick={() => setTextMode(textMode === 'fixed' ? 'expression' : 'fixed')}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  backgroundColor: textMode === 'expression' ? '#ff6b5a33' : '#333',
                  color: textMode === 'expression' ? '#ff6b5a' : '#888',
                  border: '1px solid ' + (textMode === 'expression' ? '#ff6b5a' : '#444'),
                }}
              >
                Expression
              </button>
            </div>
          </div>
          
          {textMode === 'expression' ? (
            <div className="space-y-3">
              {/* Multi-select checkboxes for fields */}
              <div 
                className="rounded-lg overflow-hidden"
                style={{
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #444',
                }}
              >
                {/* Header with Select All / Clear */}
                <div 
                  className="flex items-center justify-between px-3 py-2"
                  style={{ borderBottom: '1px solid #444', backgroundColor: '#363636' }}
                >
                  <span style={{ color: '#aaa', fontSize: '12px' }}>
                    Selectează câmpurile ({selectedFields.length} selectate)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllFields}
                      className="px-2 py-1 text-xs rounded hover:bg-[#444] transition-colors"
                      style={{ color: '#4ade80' }}
                    >
                      Toate
                    </button>
                    <button
                      onClick={clearAllFields}
                      className="px-2 py-1 text-xs rounded hover:bg-[#444] transition-colors"
                      style={{ color: '#f87171' }}
                    >
                      Niciunul
                    </button>
                  </div>
                </div>

                {/* Checkbox list */}
                <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
                  {textOptions.options.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 px-2 py-2 rounded cursor-pointer hover:bg-[#383838] transition-colors"
                      style={{
                        backgroundColor: selectedFields.includes(option.field) ? '#ff6b5a15' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(option.field)}
                        onChange={() => toggleField(option.field)}
                        className="w-4 h-4 rounded border-2 border-[#555] bg-transparent checked:bg-[#ff6b5a] checked:border-[#ff6b5a] cursor-pointer"
                        style={{
                          accentColor: '#ff6b5a',
                        }}
                      />
                      <span 
                        style={{ 
                          color: selectedFields.includes(option.field) ? '#ff6b5a' : '#fff',
                          fontSize: '13px',
                        }}
                      >
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview of selected fields */}
              {selectedFields.length > 0 && (
                <div 
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: '#2a3a2a',
                    border: '1px solid #3a5a3a',
                  }}
                >
                  <div className="px-3 py-2" style={{ borderBottom: '1px solid #3a5a3a' }}>
                    <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 500 }}>
                      📤 Se va trimite:
                    </span>
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    {selectedFields.map(field => {
                      const option = textOptions.options.find(o => o.field === field);
                      return (
                        <div key={field} className="flex items-center gap-2">
                          <span style={{ color: '#4ade80', fontSize: '12px' }}>•</span>
                          <span style={{ color: '#aaa', fontSize: '12px' }}>{option?.label || field}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom expression input */}
              <div 
                className="relative rounded-lg overflow-hidden"
                style={{
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #444',
                }}
              >
                <div 
                  className="flex items-center gap-2 px-3 py-2.5"
                  style={{ backgroundColor: '#363636' }}
                >
                  <span 
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ backgroundColor: '#ff6b5a33', color: '#ff6b5a' }}
                  >
                    fx
                  </span>
                  <input
                    type="text"
                    value={config.text}
                    onChange={(e) => {
                      updateConfig({ text: e.target.value });
                      setSelectedFields([]);
                    }}
                    placeholder="Sau scrie expresie personalizată..."
                    className="flex-1 bg-transparent outline-none"
                    style={{
                      color: '#fff',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div 
                  className="px-3 py-2 text-xs"
                  style={{ color: '#888', borderTop: '1px solid #444' }}
                >
                  <span style={{ color: '#ff6b5a' }}>{textOptions.description}</span>
                </div>
              </div>
            </div>
          ) : (
            <textarea
              value={config.text}
              onChange={(e) => updateConfig({ text: e.target.value })}
              placeholder="Enter message text..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg outline-none resize-none transition-colors"
              style={{
                backgroundColor: '#2d2d2d',
                border: '1px solid #444',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          )}
        </div>

        {/* Parse Mode */}
        <div>
          <label 
            className="block mb-2"
            style={{ color: '#aaa', fontSize: '13px' }}
          >
            Parse Mode
          </label>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(openDropdown === 'parseMode' ? null : 'parseMode');
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: '#2d2d2d',
                border: '1px solid #444',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              <span>
                {parseModeOptions.find(o => o.value === config.parseMode)?.label || 'None'}
              </span>
              <ChevronDown 
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  color: '#888',
                  transform: openDropdown === 'parseMode' ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }} 
              />
            </button>
            
            {openDropdown === 'parseMode' && (
              <div 
                className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10"
                style={{
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #444',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                {parseModeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateConfig({ parseMode: option.value as TelegramConfig['parseMode'] });
                      setOpenDropdown(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#383838] transition-colors"
                    style={{
                      color: config.parseMode === option.value ? '#ff6b5a' : '#fff',
                      fontSize: '13px',
                      backgroundColor: config.parseMode === option.value ? '#ff6b5a15' : 'transparent',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Box - Adaptive */}
        <div 
          className="rounded-lg p-3"
          style={{
            backgroundColor: '#2a3441',
            border: '1px solid #3a4a5a',
          }}
        >
          <p style={{ color: '#8ab4f8', fontSize: '12px', lineHeight: 1.6 }}>
            <strong>Cum funcționează:</strong><br />
            1. Obține Bot Token de la @BotFather<br />
            2. Pune Chat ID-ul destinatarului<br />
            {previousNode ? (
              <>
                3. Selectează ce date să trimită din <span style={{ color: '#4ade80' }}>{textOptions.nodeName}</span><br />
                4. Rulează workflow-ul pentru a trimite mesaje
              </>
            ) : (
              <>
                3. <span style={{ color: '#f87171' }}>Conectează un nod</span> pentru a primi date automat<br />
                4. Sau scrie text fix manual
              </>
            )}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div 
        className="flex items-center justify-end gap-2 px-4 py-3"
        style={{ 
          borderTop: '1px solid #333',
          backgroundColor: '#252525',
        }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: '#333',
            color: '#fff',
            fontSize: '13px',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (onUpdateConfig && node) {
              onUpdateConfig(node.id, config);
            }
            onClose();
          }}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: '#ff6b5a',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Save
        </button>
      </div>
    </div>

    {/* Expression Selector Modal */}
    {showExpressionSelector && (
      <N8NExpressionSelector
        inputData={inputData}
        currentValue={activeFieldTarget === 'text' ? config.text : activeFieldTarget === 'chatId' ? config.chatId : undefined}
        onClose={() => {
          setShowExpressionSelector(false);
          setActiveFieldTarget(null);
        }}
        onSelect={(expression, displayValue) => {
          if (activeFieldTarget === 'text') {
            setConfig(prev => ({ ...prev, text: expression }));
          } else if (activeFieldTarget === 'chatId') {
            setConfig(prev => ({ ...prev, chatId: expression }));
          }
          setShowExpressionSelector(false);
          setActiveFieldTarget(null);
        }}
      />
    )}
  </>
  );
};
