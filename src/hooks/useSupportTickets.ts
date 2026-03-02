import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'bug' | 'feature' | 'support' | 'billing' | 'blocked_account';
  assigned_to: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useSupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data as SupportTicket[]) || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut încărca tickets.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchTickets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('support-tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          console.log('Ticket change:', payload);
          
          if (payload.eventType === 'INSERT') {
            setTickets(prev => [payload.new as SupportTicket, ...prev]);
            toast({
              title: "Ticket nou!",
              description: `Ticket nou de la ${(payload.new as SupportTicket).user_email}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev => 
              prev.map(t => t.id === payload.new.id ? payload.new as SupportTicket : t)
            );
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Status actualizat cu succes",
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut actualiza statusul",
        variant: "destructive"
      });
    }
  };

  const createTicket = async (ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert([ticket]);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Ticket creat cu succes",
      });

      return true;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut crea ticketul",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    tickets,
    loading,
    updateTicketStatus,
    createTicket,
    refetch: fetchTickets
  };
};
