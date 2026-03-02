
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { History, Download, Trash2, Eye, FileText, FileJson, Calendar, Clock, MoreVertical } from 'lucide-react';
import { useTranscripts } from '@/hooks/useTranscripts';
import { useLanguage } from '@/contexts/LanguageContext';

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
  startTime: number;
  endTime: number;
}

interface TranscriptHistoryProps {
  onLoadTranscript: (entries: TranscriptEntry[]) => void;
}

const TranscriptHistory: React.FC<TranscriptHistoryProps> = ({ onLoadTranscript }) => {
  const { t } = useLanguage();
  const { 
    savedTranscripts, 
    isLoading, 
    deleteTranscript, 
    isDeleting,
    exportToSRT,
    exportToTXT,
    exportToJSON
  } = useTranscripts();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-gray-900">
            <History className="w-6 h-6 text-[#0A5B4C]" />
            {t('transcripts.historyTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A5B4C]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-gray-900">
          <History className="w-6 h-6 text-[#0A5B4C]" />
          {t('transcripts.historyTitle')} ({savedTranscripts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {savedTranscripts.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">{t('transcripts.noSavedTranscripts')}</p>
            <p className="text-sm text-gray-400">{t('transcripts.transcribeToStart')}</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {savedTranscripts.map((transcript) => (
                <div key={transcript.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#0A5B4C]/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={transcript.title}>
                        {transcript.title}
                      </h3>
                      {transcript.original_filename && (
                        <p className="text-sm text-gray-500 truncate" title={transcript.original_filename}>
                          📁 {transcript.original_filename}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onLoadTranscript(transcript.transcript_entries)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t('transcripts.view')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportToSRT(transcript.transcript_entries, transcript.title)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {t('transcripts.exportSRT')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportToTXT(transcript.transcript_entries, transcript.title)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          {t('transcripts.exportTXT')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportToJSON(transcript.transcript_entries, transcript.title)}
                        >
                          <FileJson className="w-4 h-4 mr-2" />
                          {t('transcripts.exportJSON')}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t('transcripts.delete')}
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('transcripts.confirmDeleteTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('transcripts.confirmDeleteMessage')} "{transcript.title}"? 
                                {t('transcripts.cannotUndo')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('transcripts.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTranscript(transcript.id)}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {t('transcripts.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(transcript.created_at)}
                    </div>
                    {transcript.duration_seconds > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(transcript.duration_seconds)}
                      </div>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {transcript.transcript_entries.length} {t('transcripts.replies')}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLoadTranscript(transcript.transcript_entries)}
                      className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t('transcripts.view')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-white text-gray-900 border-gray-300 hover:bg-gray-50">
                          <Download className="w-4 h-4 mr-2" />
                          {t('transcripts.export')}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => exportToSRT(transcript.transcript_entries, transcript.title)}
                        >
                          {t('transcripts.formatSRT')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportToTXT(transcript.transcript_entries, transcript.title)}
                        >
                          {t('transcripts.formatTXT')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportToJSON(transcript.transcript_entries, transcript.title)}
                        >
                          {t('transcripts.formatJSON')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default TranscriptHistory;
