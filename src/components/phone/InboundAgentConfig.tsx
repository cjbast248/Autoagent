import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PhoneIncoming, Bot, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  elevenlabs_agent_id: string | null;
}

interface InboundAgentConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneId: string;
  phoneNumber: string;
  phoneLabel: string;
  currentAgentId: string | null;
  onSuccess: () => void;
}

export const InboundAgentConfig: React.FC<InboundAgentConfigProps> = ({
  open,
  onOpenChange,
  phoneId,
  phoneNumber,
  phoneLabel,
  currentAgentId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgentId || 'none');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadAgents();
      setSelectedAgentId(currentAgentId || 'none');
    }
  }, [open, currentAgentId]);

  const loadAgents = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kalina_agents')
        .select('id, name, elevenlabs_agent_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const actualAgentId = selectedAgentId === 'none' ? null : selectedAgentId;

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('associate-phone-with-agent', {
        body: {
          phone_id: phoneId,
          agent_id: actualAgentId,
          user_id: user.id,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Nu s-a putut configura agentul inbound');
      }

      toast({
        title: 'Succes',
        description: actualAgentId
          ? `Apelurile primite pe ${phoneLabel || phoneNumber} vor fi preluate de ${data.agent_name}`
          : `Agentul inbound a fost dezactivat pentru ${phoneLabel || phoneNumber}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error configuring inbound agent:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut configura agentul inbound',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneIncoming className="h-5 w-5 text-primary" />
            Configurare Apeluri Primite
          </DialogTitle>
          <DialogDescription>
            Selectează un agent AI care să răspundă la apelurile primite pe {phoneNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Phone Info */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Număr de telefon</div>
            <div className="font-medium">{phoneLabel || phoneNumber}</div>
            <div className="text-sm text-muted-foreground">{phoneNumber}</div>
          </div>

          {/* Agent Selection */}
          <div className="space-y-2">
            <Label htmlFor="agent-select">Agent Inbound</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger id="agent-select">
                <SelectValue placeholder="Selectează un agent pentru apeluri primite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Fără agent (dezactivează inbound)</span>
                </SelectItem>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                    Se încarcă...
                  </SelectItem>
                ) : (
                  agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        {agent.name}
                        {!agent.elevenlabs_agent_id && (
                          <Badge variant="outline" className="text-xs">Nesincronizat</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {agents.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">
                Nu ai agenți. Creează un agent mai întâi pentru a activa apelurile primite.
              </p>
            )}
          </div>

          {/* Current Status */}
          {selectedAgent && (
            <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 text-primary">
                <Bot className="h-4 w-4" />
                <span className="font-medium">{selectedAgent.name}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Acest agent va răspunde la toate apelurile primite pe acest număr.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {actualAgentId ? 'Activează Inbound' : 'Dezactivează Inbound'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
