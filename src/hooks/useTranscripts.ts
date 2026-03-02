
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
  startTime: number;
  endTime: number;
}

interface SavedTranscript {
  id: string;
  title: string;
  original_filename: string | null;
  transcript_entries: TranscriptEntry[];
  raw_text: string | null;
  duration_seconds: number;
  file_size_mb: number | null;
  created_at: string;
  updated_at: string;
}

export const useTranscripts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's transcripts - optimized with caching
  const {
    data: savedTranscripts = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['user-transcripts', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_transcripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        ...item,
        transcript_entries: Array.isArray(item.transcript_entries) 
          ? item.transcript_entries 
          : []
      })) as SavedTranscript[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - transcripts rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Save transcript mutation
  const saveTranscriptMutation = useMutation({
    mutationFn: async ({
      title,
      transcriptEntries,
      originalFilename,
      rawText,
      durationSeconds,
      fileSizeMb
    }: {
      title: string;
      transcriptEntries: TranscriptEntry[];
      originalFilename?: string;
      rawText?: string;
      durationSeconds?: number;
      fileSizeMb?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_transcripts')
        .insert({
          user_id: user.id,
          title,
          original_filename: originalFilename || null,
          transcript_entries: transcriptEntries as any,
          raw_text: rawText || null,
          duration_seconds: durationSeconds || 0,
          file_size_mb: fileSizeMb || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-transcripts', user?.id] });
      toast({
        title: "Transcript salvat!",
        description: "Transcriptul a fost salvat cu succes în contul tău.",
      });
    },
    onError: (error) => {
      console.error('Error saving transcript:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut salva transcriptul. Încearcă din nou.",
        variant: "destructive",
      });
    },
  });

  // Delete transcript mutation
  const deleteTranscriptMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_transcripts')
        .delete()
        .eq('id', transcriptId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-transcripts', user?.id] });
      toast({
        title: "Transcript șters!",
        description: "Transcriptul a fost șters cu succes.",
      });
    },
    onError: (error) => {
      console.error('Error deleting transcript:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge transcriptul. Încearcă din nou.",
        variant: "destructive",
      });
    },
  });

  // Export functions
  const exportToSRT = useCallback((transcriptEntries: TranscriptEntry[], title: string) => {
    let srtContent = '';
    transcriptEntries.forEach((entry, index) => {
      const formatSRTTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
      };

      const speakerId = entry.speaker.toLowerCase().includes('agent') ? 'Agent AI' : 'User';
      srtContent += `${index + 1}\n${formatSRTTime(entry.startTime)} --> ${formatSRTTime(entry.endTime)}\n[${speakerId}] ${entry.text}\n\n`;
    });
    
    downloadFile(srtContent, `${title}_transcript.srt`, 'text/plain;charset=utf-8');
  }, []);

  const exportToTXT = useCallback((transcriptEntries: TranscriptEntry[], title: string) => {
    let txtContent = `Transcript: ${title}\n`;
    txtContent += `Data: ${new Date().toLocaleDateString('ro-RO')}\n\n`;
    
    transcriptEntries.forEach((entry) => {
      txtContent += `[${entry.timestamp}] ${entry.speaker}: ${entry.text}\n`;
    });
    
    downloadFile(txtContent, `${title}_transcript.txt`, 'text/plain;charset=utf-8');
  }, []);

  const exportToJSON = useCallback((transcriptEntries: TranscriptEntry[], title: string) => {
    const jsonData = {
      title,
      exportDate: new Date().toISOString(),
      entries: transcriptEntries
    };
    
    const jsonContent = JSON.stringify(jsonData, null, 2);
    downloadFile(jsonContent, `${title}_transcript.json`, 'application/json;charset=utf-8');
  }, []);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    savedTranscripts,
    isLoading,
    saveTranscript: saveTranscriptMutation.mutate,
    isSaving: saveTranscriptMutation.isPending,
    deleteTranscript: deleteTranscriptMutation.mutate,
    isDeleting: deleteTranscriptMutation.isPending,
    refetch,
    exportToSRT,
    exportToTXT,
    exportToJSON,
  };
};
