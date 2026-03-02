import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Database, Search, Plus, Trash2, Save, Sparkles, Upload, FileText, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { N8NConfigLayout } from './N8NConfigLayout';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RAGIcon } from './BrandIcons';

interface N8NRAGConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    config?: Record<string, unknown>;
  };
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
  inputData?: unknown;
  outputData?: unknown;
}

interface RAGEntry {
  id: string;
  query: string;
  content: string;
  metadata?: {
    source?: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  chunksCount?: number;
  error?: string;
}

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
];

export const N8NRAGConfig: React.FC<N8NRAGConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
}) => {
  const [entries, setEntries] = useState<RAGEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('={{ $json.query }}');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [useGroq, setUseGroq] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('Tu ești un asistent care răspunde pe baza informațiilor furnizate. Dacă nu găsești informații relevante, spune-o clar.');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Function to evaluate expression like {{ $json.body.message }}
  const evaluateExpression = (expr: string) => {
    if (!expr || !inputData) return null;
    
    // Match {{ $json.path.to.value }}
    const match = expr.match(/\{\{\s*\$json\.(.*?)\s*\}\}/);
    if (!match) return null;
    
    const path = match[1]; // e.g., "body.message"
    const parts = path.split('.');
    
    let value = inputData;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return value;
  };

  useEffect(() => {
    if (node.config) {
      setEntries((node.config.entries as RAGEntry[]) || []);
      setSearchQuery((node.config.searchQuery as string) || '={{ $json.query }}');
      setModel((node.config.model as string) || 'llama-3.3-70b-versatile');
      setUseGroq(node.config.useGroq !== false);
      setSystemPrompt((node.config.systemPrompt as string) || systemPrompt);
    }
  }, [node.config]);

  const addEntry = () => {
    const newEntry: RAGEntry = {
      id: Date.now().toString(),
      query: '',
      content: '',
    };
    setEntries([...entries, newEntry]);
  };

  const updateEntry = (id: string, field: 'query' | 'content', value: string) => {
    setEntries(entries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  // Chunk text into smaller pieces
  const chunkText = (text: string, size: number): string[] => {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > size && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  };

  // Process text with Groq AI for structuring via edge function
  const processChunkWithGroq = async (chunk: string, fileName: string): Promise<{ query: string; content: string }> => {
    try {
      const prompt = `Tu ești un asistent care structurează și optimizează text pentru un sistem RAG (Retrieval-Augmented Generation).
Din textul primit, extrage:
1. O întrebare/query reprezentativ (max 100 caractere) - ce ar putea căuta cineva pentru a găsi această informație
2. Conținutul optimizat și structurat (păstrează informația importantă, elimină noise-ul)

Răspunde DOAR în format JSON:
{"query": "întrebare reprezentativă", "content": "conținut optimizat"}

Sursa: ${fileName}

Text:
${chunk}`;

      let data: any;
      let error: any;

      // First attempt: workflow-groq-analysis
      const response1 = await supabase.functions.invoke('workflow-groq-analysis', {
        body: {
          prompt,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
        },
      });

      data = response1.data;
      error = response1.error;

      // If JWT error, try fallback to chat-widget-groq
      if (error?.message?.includes('JWT') || error?.message?.includes('401') ||
          data?.error?.includes('JWT') || data?.error?.includes('Invalid')) {
        console.log('[RAG] JWT error, trying fallback...');
        const response2 = await supabase.functions.invoke('chat-widget-groq', {
          body: {
            messages: [{ role: 'user', content: prompt }],
            systemPrompt: 'Răspunde DOAR în format JSON valid. Fii concis și precis.',
          },
        });

        if (response2.data?.success && response2.data?.message) {
          let content = response2.data.message;
          content = content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            data = { success: true, analysis: JSON.parse(jsonMatch[0]) };
            error = null;
          }
        }
      }

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Groq processing failed');

      // Parse the response
      const analysis = data.analysis;
      if (typeof analysis === 'object' && analysis.query && analysis.content) {
        return analysis;
      }
      
      // Try to parse if it's a string
      if (typeof analysis === 'string') {
        const parsed = JSON.parse(analysis);
        return parsed;
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Groq processing error:', error);
      // Fallback: create basic query/content
      const words = chunk.split(' ').slice(0, 15).join(' ');
      return {
        query: words + '...',
        content: chunk,
      };
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('Fișierul este prea mare! Mărimea maximă este 100MB.');
      return;
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'application/pdf', 'text/csv', 'application/json'];
    const allowedExtensions = ['.txt', '.pdf', '.csv', '.json', '.md'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error('Tip de fișier nesuportat! Folosește: TXT, PDF, CSV, JSON, MD');
      return;
    }

    const uploadedFile: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type || fileExtension,
      status: 'uploading',
      progress: 0,
    };

    setUploadedFiles(prev => [...prev, uploadedFile]);
    setIsProcessing(true);

    try {
      // Read file content
      const text = await readFileAsText(file);
      
      // Update status to processing
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'processing', progress: 30 } : f
      ));

      // Chunk the text
      const chunks = chunkText(text, chunkSize);
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, chunksCount: chunks.length, progress: 40 } : f
      ));

      // Process each chunk with Groq AI
      const newEntries: RAGEntry[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const processedData = await processChunkWithGroq(chunks[i], file.name);
        
        newEntries.push({
          id: `${uploadedFile.id}-chunk-${i}`,
          query: processedData.query,
          content: processedData.content,
          metadata: {
            source: file.name,
            chunkIndex: i + 1,
            totalChunks: chunks.length,
          },
        });

        // Update progress
        const progress = 40 + ((i + 1) / chunks.length) * 60;
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, progress } : f
        ));
      }

      // Add entries to the list
      setEntries(prev => [...prev, ...newEntries]);

      // Mark as completed
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id ? { ...f, status: 'completed', progress: 100 } : f
      ));

      toast.success(`✅ ${chunks.length} chunk-uri procesate din ${file.name}`);
    } catch (error) {
      console.error('File processing error:', error);
      setUploadedFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, status: 'error', error: 'Eroare la procesare' } 
          : f
      ));
      toast.error('Eroare la procesarea fișierului');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Read file as text
  const readFileAsText = async (file: File): Promise<string> => {
    // Handle PDF files
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Set worker path
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
        }
        
        return fullText;
      } catch (error) {
        console.error('PDF parsing error:', error);
        throw new Error('Eroare la citirea PDF-ului');
      }
    }
    
    // Handle text files
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleTest = async () => {
    console.log('🔍 Test button clicked!');
    console.log('Entries count:', entries.length);
    console.log('First 3 entries:', entries.slice(0, 3));
    
    if (entries.length === 0) {
      console.log('❌ No entries found!');
      toast.error('Adaugă cel puțin o înregistrare RAG');
      return;
    }

    console.log('✅ Starting test...');
    setIsTesting(true);
    setTestResults(null);

    try {
      // Evaluate search query
      let query = searchQuery;
      console.log('Original query:', query);
      console.log('Input data:', inputData);
      
      if (query.includes('{{') && inputData) {
        console.log('Query contains expression, evaluating...');
        const match = query.match(/\{\{\s*\$json\.(.*?)\s*\}\}/);
        console.log('Regex match:', match);
        if (match) {
          const path = match[1];
          console.log('Extracted path:', path);
          const parts = path.split('.');
          console.log('Path parts:', parts);
          let value = inputData;
          for (const part of parts) {
            console.log(`Navigating part: ${part}, current value:`, value);
            if (value && typeof value === 'object' && part in value) {
              value = value[part];
            }
          }
          query = String(value || '');
          console.log('Evaluated query:', query);
        }
      }

      console.log('Final query to search:', query);

      if (!query || query.trim() === '') {
        console.log('❌ Query is empty!');
        toast.error('Query de căutare este gol!');
        setIsTesting(false);
        return;
      }

      // Search in knowledge base with IMPROVED ALGORITHM
      const results: Array<{ entry: any; score: number }> = [];
      const MIN_SCORE_THRESHOLD = 10; // Minimum score to be considered a match
      
      // Normalize function to remove diacritics and special chars
      const normalize = (text: string) => {
        return text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
          .replace(/[^a-z0-9\s,]/g, ' ') // Keep commas for CSV parsing
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Escape special regex characters
      const escapeRegex = (str: string) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      
      // Levenshtein distance for fuzzy matching (typos only)
      const levenshteinDistance = (str1: string, str2: string): number => {
        if (Math.abs(str1.length - str2.length) > 2) return Infinity; // Skip if length diff > 2
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
      
      const normalizedQuery = normalize(query);
      const queryWords = normalizedQuery.split(' ').filter(w => w.length >= 2);
      
      console.log('Search query:', query);
      console.log('Normalized query:', normalizedQuery);
      console.log('Query words:', queryWords);
      console.log('Total entries to search:', entries.length);

      let checkedEntries = 0;
      for (const entry of entries) {
        checkedEntries++;
        const queryText = normalize(entry.query || '');
        const contentText = normalize(entry.content || '');
        const fullText = `${queryText} ${contentText}`;
        
        // Debug first 3 entries
        if (checkedEntries <= 3) {
          console.log(`Entry ${checkedEntries}:`, {
            originalQuery: entry.query?.substring(0, 50),
            originalContent: entry.content?.substring(0, 50),
          });
        }
        
        let score = 0;
        
        // Split content into individual words/items (for CSV-like data)
        const allWords = fullText.split(/[\s,]+/).filter(w => w.length > 0);
        
        for (const searchWord of queryWords) {
          if (searchWord.length < 2) continue;
          
          // 1. EXACT WORD MATCH (highest priority) - 50 points
          // Check if search word exists as a complete word in content
          const exactWordRegex = new RegExp(`(^|[\\s,])${escapeRegex(searchWord)}([\\s,]|$)`, 'i');
          const isExactWordMatch = allWords.some(w => w === searchWord);
          
          if (isExactWordMatch) {
            score += 50;
            console.log(`✅ Exact word match: "${searchWord}" found`);
          }
          // 2. WORD BOUNDARY MATCH (word at start/end) - 20 points
          else if (exactWordRegex.test(fullText)) {
            score += 20;
            console.log(`📍 Word boundary match: "${searchWord}"`);
          }
          // 3. SUBSTRING MATCH (word is contained in another word) - 3 points MAX
          // This catches cases like "Kiev" in "Kievichi" - low score!
          else if (fullText.includes(searchWord)) {
            // Penalize: the longer the containing word, the lower the score
            const containingWord = allWords.find(w => w.includes(searchWord) && w !== searchWord);
            if (containingWord) {
              // Only 3 points for substring, not a good match
              score += 3;
              console.log(`⚠️ Substring only: "${searchWord}" found in "${containingWord}" - low score`);
            }
          }
          // 4. FUZZY MATCH (for typos, max 1-2 char difference) - 15 points
          else {
            for (const targetWord of allWords) {
              if (targetWord.length < 3) continue;
              // Only fuzzy match for similar length words (typo detection)
              if (Math.abs(searchWord.length - targetWord.length) <= 1) {
                const distance = levenshteinDistance(searchWord, targetWord);
                if (distance === 1) {
                  score += 15; // 1 char difference (typo)
                  console.log(`🔤 Typo match: "${searchWord}" ~ "${targetWord}"`);
                  break;
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

      console.log(`Checked ${checkedEntries} entries, found ${results.length} matches above threshold ${MIN_SCORE_THRESHOLD}`);
      
      results.sort((a, b) => b.score - a.score);
      
      if (results.length > 0) {
        console.log('Top 3 results:', results.slice(0, 3).map(r => ({
          score: r.score,
          query: r.entry.query?.substring(0, 50),
          content: r.entry.content?.substring(0, 50)
        })));
      }

      if (results.length === 0) {
        setTestResults({
          query,
          found: false,
          message: 'Nu am găsit rezultate pentru această căutare.',
        });
        toast.info('Nu am găsit rezultate');
        setIsTesting(false);
        return;
      }

      // Process with Groq if enabled - via edge function
      if (useGroq) {
        try {
          const context = results.slice(0, 3).map((r, i) => 
            `[${i + 1}] ${r.entry.content}`
          ).join('\n\n');

          const prompt = `${systemPrompt}

Context:

${context}

Întrebare: ${query}

Răspunde pe baza contextului.`;

          let data: any;
          let error: any;

          // First attempt: workflow-groq-analysis
          const response1 = await supabase.functions.invoke('workflow-groq-analysis', {
            body: {
              prompt,
              model: model,
              temperature: 0.3,
            },
          });

          data = response1.data;
          error = response1.error;

          // If JWT error, try fallback to chat-widget-groq
          if (error?.message?.includes('JWT') || error?.message?.includes('401') ||
              data?.error?.includes('JWT') || data?.error?.includes('Invalid')) {
            console.log('[RAG Test] JWT error, trying fallback...');
            const response2 = await supabase.functions.invoke('chat-widget-groq', {
              body: {
                messages: [{ role: 'user', content: prompt }],
                systemPrompt: 'Răspunde pe baza contextului furnizat. Fii concis și precis.',
              },
            });

            if (response2.data?.success && response2.data?.message) {
              data = { success: true, analysis: response2.data.message };
              error = null;
            }
          }

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'Groq processing failed');

          const groqResponse = typeof data.analysis === 'string' 
            ? data.analysis 
            : JSON.stringify(data.analysis);

          const resultsObject = {
            query,
            found: true,
            matchCount: results.length,
            topResults: results.slice(0, 5),
            groqResponse,
          };
          console.log('Setting test results (with Groq):', resultsObject);
          setTestResults(resultsObject);
          toast.success(`✅ Găsite ${results.length} rezultate!`);
        } catch (err: any) {
          console.error('Groq error:', err);
          const resultsObject = {
            query,
            found: true,
            matchCount: results.length,
            topResults: results.slice(0, 5),
            error: 'Groq processing failed: ' + (err.message || String(err)),
          };
          console.log('Setting test results (Groq failed):', resultsObject);
          setTestResults(resultsObject);
          toast.warning('Rezultate fără procesare Groq');
        }
      } else {
        const resultsObject = {
          query,
          found: true,
          matchCount: results.length,
          topResults: results.slice(0, 5),
        };
        console.log('Setting test results (no Groq):', resultsObject);
        setTestResults(resultsObject);
        toast.success(`✅ Găsite ${results.length} rezultate!`);
      }
    } catch (err: any) {
      console.error('Test error:', err);
      toast.error('Eroare la test: ' + err.message);
      const errorObject = { error: err.message };
      console.log('Setting error results:', errorObject);
      setTestResults(errorObject);
    } finally {
      console.log('Test finished, setting isTesting to false');
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (entries.length === 0) {
      toast.error('Adaugă cel puțin o înregistrare RAG');
      return;
    }

    const invalidEntries = entries.filter(e => !e.query.trim() || !e.content.trim());
    if (invalidEntries.length > 0) {
      toast.error('Toate înregistrările trebuie să aibă query și conținut');
      return;
    }

    onSave({
      entries,
      searchQuery,
      model,
      useGroq,
      systemPrompt,
    });
    toast.success('Configurație RAG salvată');
  };

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
      {/* Back to canvas button - absolute top left */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-[#2d2f36] border border-[#3e4149] px-3 py-1.5 rounded z-10"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to canvas
      </button>

      <div className="flex items-stretch" style={{ height: '85vh', maxWidth: '98vw', width: '95%' }}>
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
          <N8NNodeIOPanel
            title="INPUT"
            data={inputData}
            enableDrag={true}
          />
        </div>

        {/* Main Config Panel - Center (Solid & Prominent) */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            width: '650px',
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 0 1px #444',
            borderRadius: '8px',
            zIndex: 5,
            transform: 'scale(1.01)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#A855F7' }}
          >
            <div className="flex items-center gap-3">
              <RAGIcon size={24} className="text-white" />
              <div>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                  RAG Search
                </span>
                <div className="text-white/70 text-xs">Retrieval-Augmented Generation</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleTest}
                disabled={isTesting || entries.length === 0}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Test...
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3 mr-1" />
                    Test
                  </>
                )}
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                <Save className="w-3 h-3 mr-1" />
                Salvează
              </Button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#1a1a1a' }}>
            {/* Test Results Display */}
            {testResults && (
              <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-green-400 font-semibold text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Rezultate Test
                  </h3>
                  <button
                    onClick={() => setTestResults(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="bg-black/30 rounded p-2">
                    <p className="text-gray-400 text-xs">Query:</p>
                    <p className="text-white text-sm font-mono">{testResults.query}</p>
                  </div>

                  {testResults.found && (
                    <>
                      <div className="flex gap-2">
                        <div className="bg-black/30 rounded p-2 flex-1">
                          <p className="text-gray-400 text-xs">Matches</p>
                          <p className="text-green-400 text-lg font-bold">{testResults.matchCount}</p>
                        </div>
                        <div className="bg-black/30 rounded p-2 flex-1">
                          <p className="text-gray-400 text-xs">Top Score</p>
                          <p className="text-blue-400 text-lg font-bold">
                            {testResults.topResults?.[0]?.score || 0}
                          </p>
                        </div>
                      </div>

                      {testResults.groqResponse && (
                        <div className="bg-black/30 rounded p-3">
                          <p className="text-gray-400 text-xs mb-2">🤖 Groq AI Response:</p>
                          <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                            {testResults.groqResponse}
                          </p>
                        </div>
                      )}

                      {testResults.topResults && testResults.topResults.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-gray-400 text-xs">📊 Top Results:</p>
                          {testResults.topResults.slice(0, 3).map((result: any, idx: number) => (
                            <div key={idx} className="bg-black/30 rounded p-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-green-400 text-xs font-semibold">#{idx + 1}</span>
                                <span className="text-blue-400 text-xs">Score: {result.score}</span>
                              </div>
                              <p className="text-white text-xs font-medium">{result.entry.query}</p>
                              <p className="text-gray-300 text-xs line-clamp-2">{result.entry.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {!testResults.found && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-center">
                      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-red-400 text-sm">{testResults.message}</p>
                    </div>
                  )}

                  {testResults.error && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded p-2">
                      <p className="text-red-400 text-xs">❌ Error: {testResults.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search Query Input */}
            <div className="space-y-2">
              <Label className="text-white text-xs">
                <Search className="w-3 h-3 inline mr-1" />
                Query de căutare (din nodul anterior)
              </Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedText = e.dataTransfer.getData('text/plain');
                  if (draggedText) {
                    setSearchQuery(draggedText);
                    toast.success('Câmp adăugat!');
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                placeholder='={{ $json.query }}'
                className="bg-[#252525] border-[#333] text-white border-2 hover:border-purple-500/50 transition-colors"
                title="Trage un câmp din INPUT aici"
              />
              <div className="space-y-1">
                <p className="text-xs text-gray-400">
                  💡 <strong>Drag & Drop:</strong> Trage câmpuri din INPUT sau scrie manual
                </p>
                {searchQuery && inputData && (() => {
                  const result = evaluateExpression(searchQuery);
                  return result !== null && (
                    <div className="bg-[#1a1a1a] border border-purple-500/30 rounded p-2">
                      <p className="text-gray-400 text-[10px] mb-1">📊 Valoare actuală:</p>
                      <p className="text-green-400 text-xs font-mono break-all">
                        {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-3 border border-purple-500/30 rounded-lg p-4 bg-[#252525]">
              <div className="flex items-center justify-between">
                <Label className="text-white text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Încarcă Fișiere (max 100MB)
                </Label>
                <div className="flex items-center gap-2">
                  <Label className="text-gray-400 text-xs">Chunk Size:</Label>
                  <Input
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    min={500}
                    max={5000}
                    step={100}
                    className="w-24 bg-[#1a1a1a] border-[#333] text-white text-xs h-8"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".txt,.pdf,.csv,.json,.md"
                  className="hidden"
                  disabled={isProcessing}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesare...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Alege Fișier
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-400 text-center">
                  TXT, PDF, CSV, JSON, MD • Procesare automată cu AI
                </p>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  <Label className="text-white text-xs">Fișiere Procesate:</Label>
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="bg-[#1a1a1a] border border-[#333] rounded p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          <FileText className="w-4 h-4 text-purple-400 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{file.name}</p>
                            <p className="text-gray-400 text-[10px]">
                              {(file.size / 1024).toFixed(0)} KB
                              {file.chunksCount && ` • ${file.chunksCount} chunks`}
                            </p>
                          </div>
                        </div>
                        {file.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        )}
                      </div>
                      {file.status !== 'completed' && file.status !== 'error' && (
                        <div className="space-y-1">
                          <Progress value={file.progress} className="h-1" />
                          <p className="text-xs text-gray-400">
                            {file.status === 'uploading' && 'Citire fișier...'}
                            {file.status === 'processing' && 'Procesare cu AI...'}
                          </p>
                        </div>
                      )}
                      {file.status === 'error' && file.error && (
                        <p className="text-xs text-red-400">{file.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Groq Integration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white text-xs flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Procesează rezultatul cu Groq AI
                </Label>
                <input
                  type="checkbox"
                  checked={useGroq}
                  onChange={(e) => setUseGroq(e.target.checked)}
                  className="w-4 h-4"
                />
              </div>

              {useGroq && (
                <>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-[#252525] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROQ_MODELS.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="System prompt..."
                    rows={3}
                    className="bg-[#252525] border-[#333] text-white text-xs"
                  />
                </>
              )}
            </div>

            {/* RAG Entries */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-white text-xs">
                  <Database className="w-3 h-3 inline mr-1" />
                  Baza de cunoștințe RAG ({entries.length})
                </Label>
                <Button
                  onClick={addEntry}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white h-6 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Adaugă
                </Button>
              </div>

              {entries.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-600 rounded-lg">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nicio înregistrare încă</p>
                  <p className="text-xs mt-1">Adaugă date pentru RAG search</p>
                </div>
              )}

              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="border border-[#333] rounded-lg p-3 space-y-2 bg-[#252525]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Înregistrare #{index + 1}</span>
                      {entry.metadata?.source && (
                        <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                          📄 {entry.metadata.source}
                          {entry.metadata.chunkIndex && ` (${entry.metadata.chunkIndex}/${entry.metadata.totalChunks})`}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-white text-xs">Keywords / Query</Label>
                    <Input
                      value={entry.query}
                      onChange={(e) => updateEntry(entry.id, 'query', e.target.value)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedText = e.dataTransfer.getData('text/plain');
                        if (draggedText) {
                          updateEntry(entry.id, 'query', entry.query + (entry.query ? ', ' : '') + draggedText);
                          toast.success('Câmp adăugat la query!');
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      placeholder="ex: Praga, Prague, praga"
                      className="bg-[#1a1a1a] border-[#333] text-white text-xs border-2 hover:border-purple-500/50 transition-colors"
                      title="Trage câmpuri din INPUT aici"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-white text-xs">Conținut / Răspuns</Label>
                    <Textarea
                      value={entry.content}
                      onChange={(e) => updateEntry(entry.id, 'content', e.target.value)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedText = e.dataTransfer.getData('text/plain');
                        if (draggedText) {
                          updateEntry(entry.id, 'content', entry.content + (entry.content ? '\n' : '') + draggedText);
                          toast.success('Câmp adăugat la conținut!');
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      placeholder="Informații despre Praga: capitala Cehiei..."
                      rows={3}
                      className="bg-[#1a1a1a] border-[#333] text-white text-xs border-2 hover:border-purple-500/50 transition-colors"
                      title="Trage câmpuri din INPUT aici"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Example */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-xs text-blue-200">
              <p className="font-semibold mb-1">💡 Exemplu:</p>
              <p className="mb-2">Query: "Praga, Prague" → Conținut: "Praga este capitala Cehiei..."</p>
              <p>Când query-ul de căutare conține "Praga", RAG va găsi și returna conținutul.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid #333', backgroundColor: '#222' }}>
            <Button variant="outline" onClick={onClose} className="border-[#404040] text-gray-300 hover:bg-[#3d3d3d] bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#A855F7] hover:bg-[#9333EA] text-white">
              Save
            </Button>
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
              data={outputData}
              enableDrag={false}
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

export default N8NRAGConfig;
