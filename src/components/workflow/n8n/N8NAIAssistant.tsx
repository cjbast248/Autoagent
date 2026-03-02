import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Bot, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/utils/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolResults?: ToolResult[];
}

interface ToolResult {
  name: string;
  success: boolean;
  message: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  config?: any;
}

interface ToolCall {
  name: string;
  args: any;
}

interface N8NAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  nodes?: WorkflowNode[];
  connections?: any[];
  addNode?: (nodeData: any, x: number, y: number) => string;
  addConnection?: (fromId: string, toId: string) => void;
  updateNode?: (nodeId: string, updates: any) => void;
  clearCanvas?: () => void;
}

const WELCOME_MESSAGE = `👋 **Salut! Sunt Expertul KALINA pentru workflow-uri.**

Pot construi **orice workflow automat** pe canvas! Spune-mi ce vrei să automatizezi:

**🎯 Exemple populare:**
• "Creează un workflow care să sune lead-urile din Zoho și să trimită rezultatul pe Telegram"
• "Vreau să import contacte din Google Sheets și să le sun automat"
• "Workflow care actualizează Zoho CRM după fiecare apel"
• "Notificare simplă pe Telegram când primesc un webhook"

**📦 Noduri disponibile:**
🔗 Webhook Trigger • 📊 Zoho CRM • 📗 Google Sheets
📞 Kalina Call • ⏳ Wait for Call • 🧠 Groq Analysis
📱 Telegram • 🔚 End

**💡 Tip:** Poți să mă întrebi și despre cum funcționează nodurile sau ce configurații au nevoie!

Cu ce workflow te pot ajuta? 🚀`;

export const N8NAIAssistant: React.FC<N8NAIAssistantProps> = ({
  isOpen,
  onClose,
  nodes = [],
  connections = [],
  addNode,
  addConnection,
  updateNode,
  clearCanvas,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME_MESSAGE }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingTools, setIsExecutingTools] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const addedNodesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, executionProgress]);

  const executeToolCalls = async (toolCalls: ToolCall[]): Promise<ToolResult[]> => {
    const results: ToolResult[] = [];
    setExecutionProgress([]);
    
    const shouldClearMap = toolCalls.some(tc => tc.name === 'clear_canvas');
    if (shouldClearMap) {
      addedNodesRef.current.clear();
    }

    for (let i = 0; i < toolCalls.length; i++) {
      const tool = toolCalls[i];
      const progressMsg = `${i + 1}/${toolCalls.length}: ${tool.name}`;
      setExecutionProgress(prev => [...prev, progressMsg]);
      
      console.log('Executing tool:', tool.name, tool.args);

      try {
        switch (tool.name) {
          case 'add_workflow_node': {
            if (!addNode) {
              results.push({ name: tool.name, success: false, message: 'Funcția addNode nu este disponibilă' });
              break;
            }
            
            const { nodeType, label, icon, x, y, config } = tool.args;
            
            const nodeData = {
              type: nodeType,
              label: label,
              icon: icon,
              config: config || {},
            };

            const nodeId = addNode(nodeData, x, y);
            if (nodeId) {
              addedNodesRef.current.set(label, nodeId);
              results.push({ 
                name: tool.name, 
                success: true, 
                message: `✅ Nod "${label}" creat la (${x}, ${y})` 
              });
            } else {
              results.push({ 
                name: tool.name, 
                success: false, 
                message: `❌ Nu am putut crea nodul "${label}"` 
              });
            }
            
            await new Promise(resolve => setTimeout(resolve, 80));
            break;
          }

          case 'connect_nodes': {
            if (!addConnection) {
              results.push({ name: tool.name, success: false, message: 'Funcția addConnection nu este disponibilă' });
              break;
            }

            const { fromLabel, toLabel } = tool.args;
            
            let fromId = addedNodesRef.current.get(fromLabel);
            let toId = addedNodesRef.current.get(toLabel);

            if (!fromId) {
              const existingFrom = nodes.find(n => n.label === fromLabel);
              fromId = existingFrom?.id;
            }
            if (!toId) {
              const existingTo = nodes.find(n => n.label === toLabel);
              toId = existingTo?.id;
            }

            if (fromId && toId) {
              addConnection(fromId, toId);
              results.push({ 
                name: tool.name, 
                success: true, 
                message: `🔗 Conectat: ${fromLabel} → ${toLabel}` 
              });
            } else {
              results.push({ 
                name: tool.name, 
                success: false, 
                message: `⚠️ Nu am găsit: ${!fromId ? fromLabel : ''} ${!toId ? toLabel : ''}` 
              });
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
            break;
          }

          case 'configure_node': {
            if (!updateNode) {
              results.push({ name: tool.name, success: false, message: 'Funcția updateNode nu este disponibilă' });
              break;
            }

            const { nodeLabel, config } = tool.args;
            
            let nodeId = addedNodesRef.current.get(nodeLabel);
            if (!nodeId) {
              const existingNode = nodes.find(n => n.label === nodeLabel);
              nodeId = existingNode?.id;
            }

            if (nodeId) {
              updateNode(nodeId, { config });
              results.push({ 
                name: tool.name, 
                success: true, 
                message: `⚙️ Configurat: ${nodeLabel}` 
              });
            } else {
              results.push({ 
                name: tool.name, 
                success: false, 
                message: `⚠️ Nu am găsit nodul: ${nodeLabel}` 
              });
            }
            break;
          }

          case 'clear_canvas': {
            if (!clearCanvas) {
              results.push({ name: tool.name, success: false, message: 'Funcția clearCanvas nu este disponibilă' });
              break;
            }
            clearCanvas();
            addedNodesRef.current.clear();
            results.push({ 
              name: tool.name, 
              success: true, 
              message: '🗑️ Canvas șters complet' 
            });
            
            await new Promise(resolve => setTimeout(resolve, 150));
            break;
          }

          default:
            results.push({ 
              name: tool.name, 
              success: false, 
              message: `Tool necunoscut: ${tool.name}` 
            });
        }
      } catch (error) {
        console.error('Tool execution error:', error);
        results.push({ 
          name: tool.name, 
          success: false, 
          message: `❌ Eroare: ${error instanceof Error ? error.message : 'Unknown'}` 
        });
      }
    }

    setExecutionProgress([]);
    return results;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const workflowContext = nodes.length > 0 
        ? `Workflow-ul curent are ${nodes.length} noduri: ${nodes.map(n => `${n.label} (${n.icon})`).join(', ')}.`
        : 'Canvas-ul este gol.';

      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const currentNodesData = nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        icon: n.icon,
        x: n.x,
        y: n.y,
        position: { x: n.x, y: n.y }
      }));

      console.log('Sending to AI with', currentNodesData.length, 'nodes');

      const { data, error } = await supabase.functions.invoke('workflow-ai-assistant', {
        body: {
          message: userMessage,
          workflowContext,
          history,
          currentNodes: currentNodesData,
        },
      });

      if (error) {
        console.error('AI error:', error);
        throw error;
      }

      if (data.toolCalls && data.toolCalls.length > 0) {
        setIsExecutingTools(true);
        
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '🔨 **Construiesc workflow-ul...**' },
        ]);

        const toolResults = await executeToolCalls(data.toolCalls);
        
        const successes = toolResults.filter(r => r.success).length;
        const failures = toolResults.filter(r => !r.success).length;
        
        const toolResultsText = toolResults.map(r => r.message).join('\n');
        
        let finalResponse = '';
        if (data.response) {
          finalResponse = `${toolResultsText}\n\n${data.response}`;
        } else {
          finalResponse = `${toolResultsText}\n\n🎉 **Workflow-ul este gata!**\n\n**Următorii pași:**\n1. Verifică nodurile pe canvas\n2. Click pe fiecare nod pentru configurare\n3. Activează workflow-ul când ești gata`;
        }

        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: finalResponse,
            toolResults
          };
          return newMessages;
        });

        if (failures > 0) {
          toast.warning(`${successes} acțiuni reușite, ${failures} eșuate`);
        } else {
          toast.success(`Workflow construit: ${successes} acțiuni executate!`);
        }
        
        setIsExecutingTools(false);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response || 'Nu am putut genera un răspuns.' },
        ]);
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ **Eroare de comunicare**\n\nTe rog să încerci din nou. Dacă problema persistă, verifică conexiunea la internet.',
        },
      ]);
      toast.error('Eroare la comunicarea cu AI');
    } finally {
      setIsLoading(false);
      setIsExecutingTools(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-16 top-4 w-[420px] h-[580px] bg-background border border-border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-violet-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Expert Workflow AI</span>
            <p className="text-xs text-muted-foreground">Construiește orice workflow</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                msg.role === 'user' 
                  ? 'bg-primary' 
                  : 'bg-gradient-to-br from-violet-500 to-orange-500'
              )}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={cn('flex-1', msg.role === 'user' ? 'text-right' : '')}>
                <div
                  className={cn(
                    'inline-block max-w-[320px] rounded-xl px-4 py-3 text-sm text-left',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-2' : ''}>
                      {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j}>{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      })}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && !isExecutingTools && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analizez și planific...</span>
                </div>
              </div>
            </div>
          )}

          {/* Tool execution progress */}
          {isExecutingTools && executionProgress.length > 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    <span>Construiesc workflow-ul...</span>
                  </div>
                  {executionProgress.map((progress, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span>{progress}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descrie workflow-ul dorit..."
            className="min-h-[44px] max-h-[100px] resize-none text-sm"
            rows={1}
            disabled={isLoading || isExecutingTools}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isExecutingTools}
            size="icon"
            className="h-[44px] w-[44px] bg-gradient-to-r from-violet-500 to-orange-500 hover:from-violet-600 hover:to-orange-600 shrink-0"
          >
            {isLoading || isExecutingTools ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Shift+Enter pentru linie nouă • Enter pentru a trimite
        </p>
      </div>
    </div>
  );
};

export default N8NAIAssistant;
