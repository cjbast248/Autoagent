import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SheetTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  column_mapping: any;
  is_default: boolean;
  created_at: string;
}

export const useGoogleSheetsTemplates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SheetTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Default templates
  const defaultTemplates = [
    {
      name: 'Standard (Nume + Telefon)',
      description: 'Configurare minimă cu doar nume și telefon',
      column_mapping: {
        name_column: 'A',
        phone_column: 'B',
      },
    },
    {
      name: 'Complet (cu rezultate apeluri)',
      description: 'Include toate coloanele: date intrare + rezultate apeluri',
      column_mapping: {
        name_column: 'A',
        phone_column: 'B',
        email_column: 'C',
        location_column: 'D',
        status_column: 'E',
        duration_column: 'F',
        cost_column: 'G',
        summary_column: 'H',
        audio_column: 'I',
      },
    },
    {
      name: 'CRM Export',
      description: 'Format tipic pentru export din CRM',
      column_mapping: {
        name_column: 'A',
        phone_column: 'C',
        email_column: 'B',
        location_column: 'D',
        status_column: 'F',
      },
    },
  ];

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('google_sheets_templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (
    name: string,
    columnMapping: any,
    description?: string,
    isDefault: boolean = false
  ) => {
    try {
      const { data, error } = await supabase
        .from('google_sheets_templates')
        .insert({
          user_id: user?.id,
          name,
          description,
          column_mapping: columnMapping,
          is_default: isDefault,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Template salvat',
        description: `Template-ul "${name}" a fost salvat cu succes.`,
      });

      await fetchTemplates();
      return data;
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut salva template-ul.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('google_sheets_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Template șters',
        description: 'Template-ul a fost șters cu succes.',
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut șterge template-ul.',
        variant: 'destructive',
      });
    }
  };

  const setDefaultTemplate = async (templateId: string) => {
    try {
      // Reset all templates to non-default
      await supabase
        .from('google_sheets_templates')
        .update({ is_default: false })
        .eq('user_id', user?.id);

      // Set selected as default
      const { error } = await supabase
        .from('google_sheets_templates')
        .update({ is_default: true })
        .eq('id', templateId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Template implicit setat',
        description: 'Acest template va fi folosit automat pentru integrări noi.',
      });

      await fetchTemplates();
    } catch (error: any) {
      console.error('Error setting default template:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut seta template-ul implicit.',
        variant: 'destructive',
      });
    }
  };

  return {
    templates,
    defaultTemplates,
    loading,
    saveTemplate,
    deleteTemplate,
    setDefaultTemplate,
    refetch: fetchTemplates,
  };
};
