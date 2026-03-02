import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Bot, Sparkles, Play, Loader2, ArrowLeft, Pin } from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}


interface N8NGroqAnalysisConfigNewProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: any;
  };
  onClose: () => void;
  onSave: (config: any) => void;
  onExecutionUpdate?: (nodeId: string, data: { input?: any; output?: any }) => void;
  inputData?: any;
  outputData?: any;
  nodeSources?: NodeData[];
}

const PROMPT_TEMPLATES = [
  {
    id: 'zoho-ready',
    name: '🔗 Pregătire pentru Zoho CRM',
    prompt: `Analizează transcrierea conversației și returnează un JSON cu câmpuri compatibile Zoho CRM:

- Description: rezumat detaliat al conversației în 2-3 paragrafe (ce s-a discutat, ce a cerut clientul, ce s-a oferit)
- Lead_Status: EXACT una din valorile: "Attempted to Contact" / "Contact in Future" / "Contacted" / "Junk Lead" / "Lost Lead" / "Not Contacted" / "Pre-Qualified" / "Not Qualified"
- Rating: un număr întreg de la 1 la 5 bazat pe interesul clientului (1=dezinteresat, 5=foarte interesat)

Reguli:
- Lead_Status trebuie să fie EXACT una din valorile de mai sus, nu traduceri
- Rating trebuie să fie doar un număr (1, 2, 3, 4 sau 5)
- Description trebuie să fie text detaliat, nu JSON

Returnează DOAR JSON valid, fără text adițional.

Conversație:
{transcript}`,
  },
  {
    id: 'extract-data',
    name: '📋 Extrage date de contact',
    prompt: `Analizează transcrierea conversației de mai jos și extrage următoarele informații în format JSON:
- nume: numele clientului (dacă a fost menționat)
- email: adresa de email (dacă a fost menționată)
- telefon: număr de telefon alternativ (dacă a fost menționat)
- interesat: true/false - dacă clientul pare interesat de produs/serviciu
- motiv: motivul principal al apelului

Returnează DOAR JSON valid, fără text adițional.

Conversație:
{transcript}`,
  },
  {
    id: 'sentiment',
    name: '😊 Analiză sentiment',
    prompt: `Analizează sentimentul conversației de mai jos și returnează în format JSON:
- sentiment: "pozitiv" / "neutru" / "negativ"
- scor: număr de la 1 la 10 (1=foarte negativ, 10=foarte pozitiv)
- motiv: explicație scurtă de max 2 propoziții

Returnează DOAR JSON valid, fără text adițional.

Conversație:
{transcript}`,
  },
  {
    id: 'summary',
    name: '📝 Rezumat conversație',
    prompt: `Fă un rezumat concis al conversației de mai jos în format JSON:
- rezumat: rezumat în maximum 3 propoziții
- puncte_cheie: array cu cele mai importante 3-5 puncte discutate
- actiuni_urmatoare: ce ar trebui să facă agentul/compania în continuare
- concluzie: "vanzare" / "interesat" / "neinteresat" / "reapelare" / "altele"

Returnează DOAR JSON valid, fără text adițional.

Conversație:
{transcript}`,
  },
  {
    id: 'custom',
    name: '✏️ Prompt personalizat',
    prompt: '',
  },
];

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
];

export const N8NGroqAnalysisConfigNew: React.FC<N8NGroqAnalysisConfigNewProps> = ({
  node,
  onClose,
  onSave,
  onExecutionUpdate,
  inputData,
  outputData,
  nodeSources,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('extract-data');
  const [customPrompt, setCustomPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Input expression state (local, saved only on Save button)
  const [inputExpression, setInputExpression] = useState(node.config?.inputExpression || '{{ $json.body.text }}');

  // Pinned data state
  const [pinnedData, setPinnedData] = useState<any>(node.config?.pinnedData || null);

  // Effective input data: prefer live inputData, fallback to pinnedData
  const effectiveInputData = inputData || pinnedData;

  // Handle pin data
  const handlePinData = (data: any) => {
    setPinnedData(data);
    toast.success('Data pinned!');
  };

  // Helper to get nested value from path like "body.phone" or "lookupResults[0].pointId"
  const getValueFromPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;

    // Normalize path: remove dots before brackets (e.g., "lookupResults.[0]" -> "lookupResults[0]")
    const normalizedPath = path.replace(/\.\[/g, '[');

    // Handle array access like lookupResults[0].pointId
    const parts = normalizedPath.split(/\.(?![^\[]*\])/); // Split by dots not inside brackets
    let value = obj;

    for (let part of parts) {
      if (value === undefined || value === null) return undefined;

      // Skip empty parts
      if (!part) continue;

      // Check for array access like "lookupResults[0]" or just "[0]"
      const arrayMatch = part.match(/^([^\[]*)\[(\d+)\](.*)$/);
      if (arrayMatch) {
        const [, arrayName, indexStr, rest] = arrayMatch;
        const index = parseInt(indexStr, 10);

        // If there's an array name, access it first
        if (arrayName) {
          value = value[arrayName];
        }

        if (Array.isArray(value)) {
          value = value[index];
        } else {
          return undefined;
        }

        // If there's more path after the array access (e.g., [0].pointId)
        if (rest && rest.startsWith('.')) {
          const restPath = rest.substring(1);
          value = getValueFromPath(value, restPath);
        }
      } else {
        value = value[part];
      }
    }
    return value;
  };

  // Build node data context for expressions - combines data from all source nodes
  const buildNodeContext = (): Record<string, any> => {
    const context: Record<string, any> = {};

    // Add data from nodeSources (previous nodes)
    if (nodeSources) {
      for (const source of nodeSources) {
        if (source.data) {
          context[source.nodeName] = source.data;
        }
      }
    }

    // Add inputData as $json (direct previous node)
    if (effectiveInputData) {
      context['$json'] = effectiveInputData;
      context['$input'] = effectiveInputData;
    }

    return context;
  };

  // Function to resolve n8n-style expressions
  // Supports:
  // - {{ $json.field }} - access previous node's data
  // - {{ $json.lookupResults[0].pointId }} - array access
  // - {{ $('NodeName').item.json.field }} - access specific node's data
  // - {{ JSON.stringify($json.field) }} - stringify objects
  const resolveExpression = (text: string, data: any): string => {
    if (!text || !data) return text;

    const nodeContext = buildNodeContext();
    let resolved = text;

    // 1. Handle {{ $('NodeName').item.json.path }} or {{ $('NodeName').item.json['path'] }}
    // Also handles complex paths like lookupResults.[0].pointId or lookupResults[0].pointId
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json(?:\.([^}]+?)|\['([^']+)'\])\s*\}\}/g,
      (match, nodeName, dotPath, bracketPath) => {
        const path = dotPath || bracketPath;
        // For Groq node, if nodeName matches, use effectiveInputData directly
        // This is because the input comes from the previous node
        const nodeData = nodeContext[nodeName] || data;
        if (!nodeData) {
          console.log(`[Expression] Node "${nodeName}" not found in context. Available: ${Object.keys(nodeContext).join(', ')}`);
          return match;
        }
        const value = path ? getValueFromPath(nodeData, path.trim()) : nodeData;
        console.log(`[Expression] Resolved $('${nodeName}').item.json['${path}'] = ${value}`);
        if (value !== undefined) {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return match;
      });

    // 2. Handle {{ $('NodeName').first().json.path }}
    resolved = resolved.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.first\(\)\.json\.([^}]+)\s*\}\}/g,
      (match, nodeName, path) => {
        const nodeData = nodeContext[nodeName];
        if (!nodeData) return match;
        // If it's an array, get first item
        const firstItem = Array.isArray(nodeData) ? nodeData[0] : nodeData;
        const value = getValueFromPath(firstItem, path.trim());
        if (value !== undefined) {
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return match;
      });

    // 3. Handle {{ JSON.stringify($json.path) }}
    resolved = resolved.replace(/\{\{\s*JSON\.stringify\(\$json\.([^)]+)\)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        return JSON.stringify(value, null, 2);
      }
      return match;
    });

    // 4. Handle {{ $json }} (entire object) or {{ $json.path }} or {{ $json.array[0].field }}
    // First handle {{ $json }} without a path - returns entire data
    resolved = resolved.replace(/\{\{\s*\$json\s*\}\}/g, () => {
      return JSON.stringify(data, null, 2);
    });

    // Then handle {{ $json.path }}
    resolved = resolved.replace(/\{\{\s*\$json\.([^}]+)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      }
      return match;
    });

    // 5. Handle {{ $input.item.json.path }}
    resolved = resolved.replace(/\{\{\s*\$input\.item\.json\.([^}]+)\s*\}\}/g, (match, path) => {
      const value = getValueFromPath(data, path.trim());
      if (value !== undefined) {
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
      return match;
    });

    // 6. Replace {transcript} placeholder with actual data (legacy support)
    if (resolved.includes('{transcript}')) {
      const transcript = data.body || data.transcript || data.message || JSON.stringify(data, null, 2);
      resolved = resolved.replace('{transcript}', typeof transcript === 'string' ? transcript : JSON.stringify(transcript, null, 2));
    }

    return resolved;
  };

  // Get the prompt with resolved values for preview
  const getResolvedPrompt = (): string => {
    const basePrompt = selectedTemplate === 'custom' ? customPrompt : currentTemplate?.prompt || '';
    return resolveExpression(basePrompt, effectiveInputData);
  };

  useEffect(() => {
    if (node.config) {
      setSelectedTemplate(node.config.templateId || 'extract-data');
      setCustomPrompt(node.config.customPrompt || '');
      setTemperature(node.config.temperature || 0.7);
      setSelectedModel(node.config.model || 'llama-3.3-70b-versatile');
      setInputExpression(node.config.inputExpression || '{{ $json.body.text }}');
    }
  }, [node.config]);

  const handleSave = () => {
    const template = PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate);
    const finalPrompt = selectedTemplate === 'custom' ? customPrompt : template?.prompt || '';

    onSave({
      templateId: selectedTemplate,
      customPrompt: selectedTemplate === 'custom' ? customPrompt : '',
      prompt: finalPrompt,
      temperature,
      model: selectedModel,
      pinnedData, // Save pinned data with config
      inputExpression, // Use local state
    });
  };

  // Build the complete prompt with data included
  const buildCompletePrompt = (): string => {
    const basePrompt = selectedTemplate === 'custom' ? customPrompt : currentTemplate?.prompt || '';
    
    // If prompt contains expressions like {{ $json.body }}, resolve them
    let resolvedPrompt = resolveExpression(basePrompt, effectiveInputData);
    
    // If the prompt still has {transcript} placeholder, replace it with data
    if (resolvedPrompt.includes('{transcript}')) {
      const dataStr = effectiveInputData?.body
        ? JSON.stringify(effectiveInputData.body, null, 2)
        : JSON.stringify(effectiveInputData, null, 2);
      resolvedPrompt = resolvedPrompt.replace('{transcript}', dataStr);
    }
    
    // If prompt doesn't seem to include the actual data, prepend it
    const hasDataReference = resolvedPrompt.includes('"v"') || 
                            resolvedPrompt.includes('"phone"') || 
                            resolvedPrompt.includes('"date"') ||
                            basePrompt.includes('$json') ||
                            basePrompt.includes('{transcript}');
    
    if (!hasDataReference && effectiveInputData) {
      const dataStr = effectiveInputData?.body
        ? JSON.stringify(effectiveInputData.body, null, 2)
        : JSON.stringify(effectiveInputData, null, 2);
      resolvedPrompt = `DATELE DE INTRARE (JSON):\n\`\`\`json\n${dataStr}\n\`\`\`\n\nINSTRUCȚIUNI:\n${resolvedPrompt}`;
    }
    
    return resolvedPrompt;
  };

  const handleTestExecution = async () => {
    if (!effectiveInputData) {
      toast.error('Nu există date de intrare. Fixează date în webhook-ul anterior sau pinează date de test.');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      // Get the base prompt (with expressions)
      const basePrompt = selectedTemplate === 'custom' ? customPrompt : currentTemplate?.prompt || '';

      // Get transcript data from inputExpression state (local) or fallback to body
      const currentInputExpression = inputExpression || '{{ $json.body.text }}';
      let transcriptData = '';

      // Resolve the input expression to get the actual data
      const resolvedInput = resolveExpression(currentInputExpression, effectiveInputData);

      // If the expression resolved to something useful, use it
      if (resolvedInput && resolvedInput !== currentInputExpression) {
        transcriptData = resolvedInput;
      } else if (effectiveInputData?.body && typeof effectiveInputData.body === 'object') {
        // Fallback to body
        transcriptData = JSON.stringify(effectiveInputData.body, null, 2);
      } else if (typeof effectiveInputData === 'object') {
        transcriptData = JSON.stringify(effectiveInputData, null, 2);
      } else {
        transcriptData = String(effectiveInputData);
      }

      // If prompt has {{ expressions }}, resolve them and use as final prompt
      let finalPrompt = basePrompt;
      if (basePrompt.includes('$json') || basePrompt.includes('JSON.stringify')) {
        finalPrompt = resolveExpression(basePrompt, effectiveInputData);
      }

      // Replace {transcript} in prompt with actual data (replace ALL occurrences)
      finalPrompt = finalPrompt.split('{transcript}').join(transcriptData);

      console.log('[Groq Test Step] Sending to API:');
      console.log('- Base prompt:', basePrompt.substring(0, 100) + '...');
      console.log('- Transcript data (what replaces {transcript}):', transcriptData);
      console.log('- Final prompt (first 500 chars):', finalPrompt.substring(0, 500));
      console.log('- Temperature:', temperature);
      console.log('- Model:', selectedModel);
      console.log('- Has {transcript} after replace?:', finalPrompt.includes('{transcript}'));
      
      // Try workflow-groq-analysis first, fallback to chat-widget-groq if JWT error
      let result: any;
      let error: any;

      // First attempt: workflow-groq-analysis
      const response1 = await supabase.functions.invoke('workflow-groq-analysis', {
        body: {
          transcript: transcriptData,
          prompt: finalPrompt,
          temperature: temperature,
          model: selectedModel,
        },
      });

      result = response1.data;
      error = response1.error;

      console.log('[Groq Test Step] Primary response:', result, 'Error:', error);

      // If JWT error, try fallback to chat-widget-groq which uses different API structure
      if (error?.message?.includes('JWT') || error?.message?.includes('401') ||
          result?.error?.includes('JWT') || result?.error?.includes('Invalid')) {
        console.log('[Groq Test Step] JWT error detected, trying chat-widget-groq fallback...');

        const response2 = await supabase.functions.invoke('chat-widget-groq', {
          body: {
            messages: [
              { role: 'user', content: finalPrompt }
            ],
            systemPrompt: 'Ești un asistent AI expert. Când ți se cere să returnezi JSON, răspunzi DOAR cu JSON valid, fără text adițional. Fii concis și precis.',
          },
        });

        console.log('[Groq Test Step] Fallback response:', response2.data);

        if (response2.data?.success && response2.data?.message) {
          // Parse the message as JSON if possible
          let analysisResult: any = response2.data.message;
          try {
            // Clean markdown
            let content = response2.data.message;
            content = content.replace(/^```json\s*/i, '');
            content = content.replace(/^```\s*/i, '');
            content = content.replace(/\s*```$/i, '');
            content = content.trim();

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysisResult = JSON.parse(jsonMatch[0]);
            }
          } catch {
            // Keep as string
          }

          setExecutionResult(analysisResult);
          toast.success('Analiză completă!');

          if (onExecutionUpdate) {
            onExecutionUpdate(node.id, { output: { analysis: analysisResult, rawAnalysis: response2.data.message } });
          }
          return;
        }

        // If fallback also failed, throw original error
        throw new Error(error?.message || result?.error || 'Groq API error - edge function may need redeployment');
      }

      if (error) {
        console.error('[Groq Test Step] Error:', error);
        throw new Error(error.message || 'Groq API error');
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Unknown error from Groq');
      }

      // Use the parsed analysis directly (edge function now returns clean JSON)
      const analysisResult = result.analysis;

      setExecutionResult(analysisResult);
      toast.success('Analiză completă!');

      // Update execution data so next nodes can access this output
      if (onExecutionUpdate) {
        onExecutionUpdate(node.id, { output: { analysis: analysisResult, rawAnalysis: result.rawAnalysis || analysisResult } });
      }
      
    } catch (error: any) {
      console.error('[Groq Test Step] Error:', error);
      toast.error(`Eroare: ${error.message}`);
      setExecutionResult({ error: error.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const currentTemplate = PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate);
  
  // Format output data for display - show ONLY the Groq analysis result, not all propagated data
  // If we have executionResult, show only the analysis part
  // If outputData exists and has analysis, show only analysis
  const getAnalysisOnlyOutput = () => {
    if (executionResult) {
      // If it's an error, show the error
      if (executionResult.error) {
        return executionResult;
      }
      // Return only the analysis result
      return executionResult;
    }
    
    // If outputData exists, try to extract only the analysis
    if (outputData) {
      // If outputData has analysis field, show only that
      if (outputData.analysis) {
        return {
          analysis: outputData.analysis,
          rawAnalysis: outputData.rawAnalysis,
          isJson: outputData.isJson,
        };
      }
      // If outputData itself is the analysis (has fields like Lead_Status, motiv, etc.)
      if (outputData.Lead_Status || outputData.motiv || outputData.interesat !== undefined) {
        return outputData;
      }
    }
    
    return null;
  };
  
  const displayOutputData = getAnalysisOnlyOutput();

  const modalContent = <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: '#131419',
        backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Back to canvas button - absolute positioned */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      <div
        className="flex items-stretch"
        style={{
          height: '85vh',
          maxWidth: '98vw',
          width: '95%',
        }}
      >
        {/* INPUT Panel - Left (Ghost Style) */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '400px',
            
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="INPUT"
              data={effectiveInputData || null}
              onPinData={handlePinData}
              isPinned={!!pinnedData}
              enableDrag={true}
              nodeSources={nodeSources}
            />
          </div>
        </div>

        {/* Main Config Panel - Center (Solid & Prominent) */}
        <div
          className="flex flex-col"
          style={{
            width: '650px',
            flexShrink: 0,
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px #4a4a4a',
            borderRadius: '8px',
            zIndex: 5,
            transform: 'scale(1.01)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#F97316' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: '32px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                  Groq Analysis
                </span>
                <div className="text-white/70 text-xs">Analizează conversația cu AI</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestExecution}
                disabled={!effectiveInputData || isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor: isExecuting ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  cursor: effectiveInputData ? 'pointer' : 'not-allowed',
                }}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Test Step
                  </>
                )}
              </button>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(80vh - 130px)' }}>
            <Tabs defaultValue="parameters" className="w-full">
              <TabsList className="w-full bg-[#252525]">
                <TabsTrigger value="parameters" className="flex-1">Parameters</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="parameters" className="space-y-4 mt-4">
                {/* INPUT DATA - What data to send to Groq */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-400 text-xs font-medium flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">1</span>
                      Date de intrare
                    </label>
                    <span className="text-[10px] text-gray-500">Trage câmpuri din INPUT</span>
                  </div>
                  <textarea
                    value={inputExpression}
                    onChange={(e) => setInputExpression(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg outline-none resize-none text-xs font-mono"
                    style={{
                      backgroundColor: '#1e3a5f',
                      border: '1px solid #3b82f6',
                      color: '#93c5fd',
                      lineHeight: '1.5',
                    }}
                    placeholder="Ex: {{ $json.body.text }} sau {{ $json.message }}"
                    onDrop={(e) => {
                      e.preventDefault();
                      const text = e.dataTransfer.getData('text/plain');
                      if (text) {
                        const textarea = e.target as HTMLTextAreaElement;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newValue = inputExpression.substring(0, start) + text + inputExpression.substring(end);
                        setInputExpression(newValue);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  />
                  <div className="text-blue-400/60 text-[10px] mt-1">
                    Specifică ce date să trimită la Groq. Trage câmpuri din panoul INPUT din stânga.
                  </div>

                  {/* Preview of resolved values */}
                  {effectiveInputData && inputExpression && (
                    <div className="mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-green-400 font-medium">📋 Valori rezolvate:</span>
                      </div>
                      <pre className="text-[10px] text-green-300 font-mono whitespace-pre-wrap max-h-24 overflow-auto">
                        {(() => {
                          const resolved = resolveExpression(inputExpression, effectiveInputData);
                          // Truncate if too long
                          if (resolved.length > 500) {
                            return resolved.substring(0, 500) + '...';
                          }
                          return resolved;
                        })()}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                  <span className="text-gray-500 text-[10px]">↓ trimite la AI ↓</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                </div>

                {/* PROMPT - Instructions for Groq */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-400 text-xs font-medium flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold">2</span>
                      Prompt (instrucțiuni)
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="text-[10px] px-2 py-1 rounded outline-none"
                      style={{
                        backgroundColor: '#333',
                        border: '1px solid #444',
                        color: '#fff',
                      }}
                    >
                      {PROMPT_TEMPLATES.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={selectedTemplate === 'custom' ? customPrompt : currentTemplate?.prompt || ''}
                    onChange={(e) => {
                      if (selectedTemplate === 'custom') {
                        setCustomPrompt(e.target.value);
                      } else {
                        // Auto-switch to custom when user types
                        setSelectedTemplate('custom');
                        setCustomPrompt(e.target.value);
                      }
                    }}
                    rows={10}
                    className="w-full px-3 py-2 rounded-lg outline-none resize-none text-xs font-mono"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #444',
                      color: '#fff',
                      lineHeight: '1.5',
                    }}
                    placeholder="Scrie instrucțiunile pentru AI. Folosește {transcript} pentru datele de intrare."
                  />
                  <div className="text-gray-500 text-[10px] mt-1">
                    Folosește <code className="px-1 py-0.5 rounded bg-green-500/20 text-green-400">{'{transcript}'}</code> pentru a include datele de sus în prompt.
                  </div>
                </div>

                {/* Temperature Slider */}
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-2">
                    Creativitate (temperature): {temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-gray-600 text-[10px] mt-1">
                    <span>Precis (0)</span>
                    <span>Creativ (1)</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                {/* Model Selector */}
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-2">
                    Model AI
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg outline-none text-sm"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #444',
                      color: '#fff',
                    }}
                  >
                    {GROQ_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info Box */}
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: '#3a2d1a', border: '1px solid #5a4d3d' }}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="text-amber-400 text-xs leading-relaxed">
                      <strong>Model:</strong> {GROQ_MODELS.find(m => m.id === selectedModel)?.name}<br />
                      <strong>Input:</strong> Transcrierea de la nodul anterior<br />
                      <strong>Output:</strong> JSON cu analiza structurată
                    </div>
                  </div>
                </div>

                {/* Variable Info */}
                <div className="p-3 rounded-lg bg-[#252525] border border-[#333]">
                  <div className="text-gray-400 text-xs font-medium mb-2">Variabile disponibile:</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <code className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-mono">{'{transcript}'}</code>
                      <span className="text-gray-500">- Transcrierea conversației</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <code className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">{'{phone}'}</code>
                      <span className="text-gray-500">- Numărul de telefon</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <code className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">{'{duration}'}</code>
                      <span className="text-gray-500">- Durata conversației</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-2 px-4 py-3"
            style={{ backgroundColor: '#252525', borderTop: '1px solid #333' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg transition-colors text-sm"
              style={{ backgroundColor: '#333', color: '#fff' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              style={{ backgroundColor: '#F97316', color: '#fff' }}
            >
              Save
            </button>
          </div>
        </div>

        {/* OUTPUT Panel - Right (Ghost Style) */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '400px',
            
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="OUTPUT"
              data={displayOutputData}
              isLoading={isExecuting}
            />
          </div>
        </div>
      </div>
    </div>;

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default N8NGroqAnalysisConfigNew;
