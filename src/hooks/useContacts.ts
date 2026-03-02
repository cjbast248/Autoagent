import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from 'sonner';

export interface Contact {
  id: string;
  user_id: string;
  nume: string;
  telefon: string;
  email?: string;
  tara?: string;
  locatie?: string;
  company?: string;
  info?: string;
  notes?: string;
  tags?: string[];
  status: string;
  last_contact_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactInteraction {
  id: string;
  user_id: string;
  contact_id: string;
  interaction_type: string;
  interaction_date: string;
  duration_seconds?: number;
  summary?: string;
  agent_id?: string;
  conversation_id?: string;
  call_status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchContacts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch contacts in batches to handle large datasets
      const PAGE_SIZE = 1000;
      let allContacts: Contact[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('contacts_database')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allContacts = [...allContacts, ...data];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      setContacts(allContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Eroare la încărcarea contactelor');
    } finally {
      setIsLoading(false);
    }
  };

  const createContact = async (contactData: Partial<Contact>) => {
    if (!user) return;

    if (!contactData.nume || !contactData.telefon) {
      throw new Error('Numele și telefonul sunt obligatorii');
    }

    try {
      const { data, error } = await supabase
        .from('contacts_database')
        .insert({
          ...contactData,
          user_id: user.id,
          nume: contactData.nume,
          telefon: contactData.telefon,
          status: contactData.status || 'active'
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      setContacts(prev => [data, ...prev]);
      toast.success('Contact adăugat cu succes');
      return data;
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Eroare la adăugarea contactului');
      throw error;
    }
  };

  const updateContact = async (contactData: Partial<Contact> & { id: string }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contacts_database')
        .update(contactData)
        .eq('id', contactData.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setContacts(prev => prev.map(contact => 
        contact.id === contactData.id ? data : contact
      ));
      toast.success('Contact actualizat cu succes');
      return data;
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Eroare la actualizarea contactului');
      throw error;
    }
  };

  const deleteContact = async (contactId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('contacts_database')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (error) throw error;

      setContacts(prev => prev.filter(contact => contact.id !== contactId));
      toast.success('Contact șters cu succes');
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Eroare la ștergerea contactului');
      throw error;
    }
  };

  const getContactByPhone = async (phoneNumber: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('contacts_database')
        .select('*')
        .eq('user_id', user.id)
        .eq('telefon', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching contact by phone:', error);
      return null;
    }
  };

  const addContactInteraction = async (interactionData: Partial<ContactInteraction>) => {
    if (!user) return;

    if (!interactionData.contact_id) {
      throw new Error('Contact ID este obligatoriu');
    }

    try {
      const { data, error } = await supabase
        .from('contact_interactions')
        .insert({
          ...interactionData,
          user_id: user.id,
          contact_id: interactionData.contact_id
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding contact interaction:', error);
      throw error;
    }
  };

  const getContactInteractions = async (contactId: string) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('contact_interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('contact_id', contactId)
        .order('interaction_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching contact interactions:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  return {
    contacts,
    isLoading,
    createContact,
    updateContact,
    deleteContact,
    getContactByPhone,
    addContactInteraction,
    getContactInteractions,
    refreshContacts: fetchContacts
  };
}