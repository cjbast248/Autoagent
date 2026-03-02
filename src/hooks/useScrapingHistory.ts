import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export interface ScrapingHistoryEntry {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description?: string;
  total_products: number;
  total_images: number;
  total_links: number;
  scraping_data: any;
  scraping_type: 'single' | 'full_site';
  status: 'completed' | 'error' | 'in_progress';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export const useScrapingHistory = () => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch scraping history
  const { data: scrapingHistory = [], isLoading, refetch } = useQuery({
    queryKey: ['scraping-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scraping_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching scraping history:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        url: item.url,
        title: item.url,
        description: '',
        total_products: 0,
        total_images: 0,
        total_links: 0,
        scraping_data: item.data,
        scraping_type: 'single' as const,
        status: item.status as 'completed' | 'error' | 'in_progress',
        error_message: item.error_message || undefined,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    },
  });

  // Save scraping session
  const saveScrapingSession = useMutation({
    mutationFn: async (scrapingData: {
      url: string;
      title: string;
      description?: string;
      scraping_data: any;
      scraping_type: 'single' | 'full_site';
      total_products?: number;
      total_images?: number;
      total_links?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('scraping_history')
        .insert({
          user_id: user.id,
          url: scrapingData.url,
          title: scrapingData.title,
          description: scrapingData.description,
          scraping_data: scrapingData.scraping_data,
          scraping_type: scrapingData.scraping_type,
          total_products: scrapingData.total_products || 0,
          total_images: scrapingData.total_images || 0,
          total_links: scrapingData.total_links || 0,
          status: 'completed'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-history'] });
      toast({
        title: "Salvat cu succes",
        description: "Sesiunea de scraping a fost salvată în istoric.",
      });
    },
    onError: (error) => {
      console.error('Error saving scraping session:', error);
      toast({
        title: "Eroare la salvare",
        description: "Nu s-a putut salva sesiunea de scraping.",
        variant: "destructive",
      });
    },
  });

  // Delete scraping session
  const deleteScrapingSession = useCallback(async (id: string) => {
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from('scraping_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refetch();
      toast({
        title: "Șters cu succes",
        description: "Sesiunea de scraping a fost ștearsă din istoric.",
      });
    } catch (error) {
      console.error('Error deleting scraping session:', error);
      toast({
        title: "Eroare la ștergere",
        description: "Nu s-a putut șterge sesiunea de scraping.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  }, [refetch]);

  // Export functions for different formats
  const exportToJSON = useCallback((scrapingData: any, title: string) => {
    const content = JSON.stringify(scrapingData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_scraping.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const exportToCSV = useCallback((products: any[], title: string) => {
    let content = `ID,Nume,Preț,Categorie,Brand,Disponibilitate,Descriere,URL\n`;
    content += products.map(product => 
      `"${product.id}","${product.name}","${product.price}","${product.category}","${product.brand || ''}","${product.availability}","${product.description}","${product.url}"`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_products.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Format timestamp
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return {
    scrapingHistory,
    isLoading,
    isDeleting,
    saveScrapingSession: saveScrapingSession.mutate,
    deleteScrapingSession,
    exportToJSON,
    exportToCSV,
    formatDate,
    refetch,
  };
};