import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useLeadExtraction } from '@/hooks/useLeadExtraction';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LeadExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  onSuccess: () => void;
}

const PREDEFINED_PROMPTS = [
  {
    value: 'interested',
    label: 'Persoane interesate',
    prompt: 'Identifică persoanele care au arătat interes pentru produsul/serviciul oferit, au pus întrebări relevante sau au solicitat mai multe informații.'
  },
  {
    value: 'callback',
    label: 'Au solicitat callback',
    prompt: 'Identifică persoanele care au solicitat explicit să fie sunat înapoi sau au menționat că vor să discute mai târziu.'
  },
  {
    value: 'info_request',
    label: 'Au cerut informații',
    prompt: 'Identifică persoanele care au cerut informații detaliate despre prețuri, caracteristici sau condiții.'
  },
  {
    value: 'high_intent',
    label: 'Intenție mare de cumpărare',
    prompt: 'Identifică persoanele care au arătat o intenție clară de cumpărare, au discutat despre buget sau termeni de plată.'
  },
  {
    value: 'custom',
    label: 'Prompt personalizat',
    prompt: ''
  }
];

export const LeadExtractionModal = ({ 
  isOpen, 
  onClose, 
  agentId, 
  agentName,
  onSuccess 
}: LeadExtractionModalProps) => {
  const [selectedPromptType, setSelectedPromptType] = useState('interested');
  const [customPrompt, setCustomPrompt] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [loadingConversations, setLoadingConversations] = useState(false);
  const { progress, isExtracting, result, startExtraction, reset } = useLeadExtraction();

  const currentPrompt = selectedPromptType === 'custom' 
    ? customPrompt 
    : PREDEFINED_PROMPTS.find(p => p.value === selectedPromptType)?.prompt || '';

  useEffect(() => {
    if (isOpen && agentId) {
      loadConversations();
    }
  }, [isOpen, agentId]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      console.log('🔄 Loading ALL conversations for agent:', agentId);
      
      // Încarcă TOATE conversațiile folosind paginare
      let allConversations: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        console.log(`📥 Fetching batch from ${from} to ${from + batchSize - 1}`);
        
        const { data, error } = await supabase
          .from('conversation_analytics_cache')
          .select('*')
          .eq('agent_id', agentId)
          .order('call_date', { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allConversations = [...allConversations, ...data];
          console.log(`✅ Loaded ${data.length} conversations (total: ${allConversations.length})`);
          
          // Dacă am primit mai puțin de batchSize, înseamnă că am terminat
          if (data.length < batchSize) {
            hasMore = false;
          } else {
            from += batchSize;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`🎉 Total conversations loaded: ${allConversations.length}`);
      setConversations(allConversations);
      
      // Selectează automat toate conversațiile
      const allIds = new Set(allConversations.map(c => c.conversation_id));
      setSelectedConversations(allIds);
      
      toast.success(`${allConversations.length} conversații încărcate`);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Eroare la încărcarea conversațiilor');
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleStart = async () => {
    if (!currentPrompt.trim()) {
      return;
    }

    if (selectedConversations.size === 0) {
      toast.error('Selectează cel puțin o conversație');
      return;
    }

    await startExtraction(agentId, currentPrompt, Array.from(selectedConversations));
    onSuccess();
  };

  const toggleConversation = (conversationId: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(conversations.map(c => c.conversation_id));
    setSelectedConversations(allIds);
  };

  const deselectAll = () => {
    setSelectedConversations(new Set());
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.processed / progress.total) * 100) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Extrage Lead-uri din Conversații
          </DialogTitle>
          <DialogDescription>
            Agent: <span className="font-semibold">{agentName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {!isExtracting && progress.status !== 'completed' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="prompt-type">Criterii de extragere</Label>
                <Select value={selectedPromptType} onValueChange={setSelectedPromptType}>
                  <SelectTrigger id="prompt-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_PROMPTS.map((prompt) => (
                      <SelectItem key={prompt.value} value={prompt.value}>
                        {prompt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPromptType === 'custom' ? (
                <div className="space-y-2">
                  <Label htmlFor="custom-prompt">Prompt personalizat</Label>
                  <Textarea
                    id="custom-prompt"
                    placeholder="Descrie ce tip de lead-uri vrei să identifici..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Preview prompt</Label>
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    {currentPrompt}
                  </div>
                </div>
              )}

              {/* Conversații disponibile */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Conversații disponibile ({conversations.length})</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAll}
                      disabled={loadingConversations}
                    >
                      Selectează toate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={deselectAll}
                      disabled={loadingConversations}
                    >
                      Deselectează toate
                    </Button>
                  </div>
                </div>

                {loadingConversations ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    Nu sunt conversații disponibile pentru acest agent
                  </div>
                ) : (
                  <ScrollArea className="h-64 border rounded-lg">
                    <div className="p-3 space-y-2">
                      {conversations.map((conv) => (
                        <div
                          key={conv.conversation_id}
                          className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg border cursor-pointer transition-colors"
                          onClick={() => toggleConversation(conv.conversation_id)}
                        >
                          <Checkbox
                            checked={selectedConversations.has(conv.conversation_id)}
                            onCheckedChange={() => toggleConversation(conv.conversation_id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">
                                {conv.contact_name || conv.phone_number || 'Necunoscut'}
                              </span>
                              {conv.call_status && (
                                <Badge variant={
                                  conv.call_status === 'completed' ? 'default' :
                                  conv.call_status === 'failed' ? 'destructive' : 'secondary'
                                }>
                                  {conv.call_status}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              {conv.phone_number && (
                                <span>{conv.phone_number}</span>
                              )}
                              {conv.call_date && (
                                <>
                                  <span>•</span>
                                  <span>{format(new Date(conv.call_date), 'dd.MM.yyyy HH:mm')}</span>
                                </>
                              )}
                              {conv.duration_seconds > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{Math.floor(conv.duration_seconds / 60)}m {conv.duration_seconds % 60}s</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <div className="text-sm text-muted-foreground">
                  <strong>{selectedConversations.size}</strong> conversații selectate
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  Informații importante
                </div>
                <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
                  <li>Procesarea poate dura câteva minute</li>
                  <li>Se vor analiza doar conversațiile selectate</li>
                  <li>Lead-urile duplicate nu vor fi adăugate din nou</li>
                  <li>Costul estimat: ~$0.01 per conversație</li>
                </ul>
              </div>
            </>
          )}

          {isExtracting && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Procesare în curs...</span>
                  <span className="font-medium">
                    {progress.total > 0 ? (
                      <>{progress.processed}/{progress.total} ({progressPercentage}%)</>
                    ) : (
                      <>…</>
                    )}
                  </span>
                </div>
                {progress.total > 0 ? (
                  <Progress value={progressPercentage} className="h-2" />
                ) : (
                  <div className="h-2 w-full rounded bg-muted overflow-hidden">
                    <div className="h-full w-1/3 bg-primary/60 animate-pulse rounded" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm font-medium">Se procesează conversațiile...</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{progress.leadsFound}</div>
                    <div className="text-xs text-green-600">Lead-uri găsite</div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{progress.processed}</div>
                    <div className="text-xs text-blue-600">Conversații procesate</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {progress.status === 'completed' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Extracție completă!</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.total}</div>
                  <div className="text-xs text-blue-600">Total conversații</div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{result.leadsFound}</div>
                  <div className="text-xs text-green-600">Lead-uri noi</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-700">
                    {result.total > 0 ? Math.round((result.leadsFound / result.total) * 100) : 0}%
                  </div>
                  <div className="text-xs text-purple-600">Rată conversie</div>
                </div>
              </div>

              {result.leads && result.leads.length > 0 && (
                <div className="space-y-2">
                  <Label>Lead-uri extrase</Label>
                  <ScrollArea className="h-48 border rounded-lg">
                    <div className="p-3 space-y-2">
                      {result.leads.map((lead, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex-1">
                            <div className="font-medium">{lead.name || 'Nume nedeterminat'}</div>
                            <div className="text-sm text-muted-foreground">{lead.phone}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              lead.interestLevel === 'high' ? 'default' :
                              lead.interestLevel === 'medium' ? 'secondary' : 'outline'
                            }>
                              {lead.interestLevel}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{lead.confidence}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{result.errors.length} erori</span>
                  </div>
                  <ScrollArea className="h-32 border rounded-lg">
                    <div className="p-3 space-y-1">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          {error.conversationId}: {error.error}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {progress.status === 'error' && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">A apărut o eroare în timpul procesării</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {!isExtracting && progress.status !== 'completed' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Anulează
              </Button>
              <Button 
                onClick={handleStart}
                disabled={!currentPrompt.trim() || selectedConversations.size === 0 || loadingConversations}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Extrage din {selectedConversations.size} conversații
              </Button>
            </>
          )}

          {isExtracting && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Procesare...
            </Button>
          )}

          {progress.status === 'completed' && (
            <Button onClick={handleClose}>
              Închide
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};