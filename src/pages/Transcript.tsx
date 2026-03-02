import React, { useState, useRef } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Search,
  Download,
  Trash2,
  Loader2,
  MoreHorizontal,
  Mic,
  Upload,
  ArrowLeft,
  User,
  Bot,
  Copy,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranscripts } from '@/hooks/useTranscripts';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';

const Transcript = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'processed' | 'processing'>('all');

  const {
    savedTranscripts,
    isLoading,
    saveTranscript,
    deleteTranscript,
    exportToSRT,
    exportToTXT,
    exportToJSON,
  } = useTranscripts();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: t('transcripts.error'),
        description: t('transcripts.selectAudioFile'),
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    toast({
      title: t('transcripts.processing'),
      description: t('transcripts.transcribingAudio'),
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { audio: base64Audio },
      });

      if (error) {
        throw new Error(t('transcripts.transcriptionFailed') + error.message);
      }

      const transcriptText = data.text || '';

      const { data: processedData, error: processError } = await supabase.functions.invoke(
        'process-transcript',
        {
          body: { transcriptText },
        }
      );

      if (processError) {
        console.warn('Could not process transcript structure:', processError);
      }

      let transcriptEntries = [];
      if (processedData?.dialogue && Array.isArray(processedData.dialogue)) {
        transcriptEntries = processedData.dialogue.map((entry: any, index: number) => ({
          speaker: entry.speaker || `Speaker ${index + 1}`,
          text: entry.text || '',
          timestamp: `${Math.floor((index * 10) / 60)}:${((index * 10) % 60).toString().padStart(2, '0')}`,
          startTime: index * 10,
          endTime: (index + 1) * 10,
        }));
      } else {
        transcriptEntries = [
          {
            speaker: 'Speaker 1',
            text: transcriptText,
            timestamp: '0:00',
            startTime: 0,
            endTime: 60,
          },
        ];
      }

      await saveTranscript({
        title: file.name.replace(/\.[^/.]+$/, ''),
        transcriptEntries: transcriptEntries,
        durationSeconds: Math.ceil(file.size / 16000),
        fileSizeMb: file.size / (1024 * 1024),
        originalFilename: file.name,
        rawText: transcriptText,
      });

      toast({
        title: t('transcripts.success'),
        description: t('transcripts.audioTranscribedSuccess'),
      });
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: t('transcripts.error'),
        description: t('transcripts.couldNotTranscribe'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredTranscripts = savedTranscripts.filter((transcript) =>
    transcript.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewTranscript = (transcript: any) => {
    setSelectedTranscript(transcript);
  };

  const handleDeleteTranscript = async (transcriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('transcripts.confirmDelete'))) {
      await deleteTranscript(transcriptId);
    }
  };

  const handleExport = (transcript: any, format: 'srt' | 'txt' | 'json', e: React.MouseEvent) => {
    e.stopPropagation();
    switch (format) {
      case 'srt':
        exportToSRT(transcript.transcript_entries, transcript.title);
        break;
      case 'txt':
        exportToTXT(transcript.transcript_entries, transcript.title);
        break;
      case 'json':
        exportToJSON(transcript.transcript_entries, transcript.title);
        break;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (mb: number) => {
    return `${mb.toFixed(1)} MB`;
  };

  // Generate random waveform heights for visual effect
  const generateWaveformHeights = () => {
    return [3, 5, 8, 4, 6, 3, 5, 2, 4, 6, 3, 2];
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
            <p className="mt-3 text-zinc-500 text-sm">{t('transcripts.loadingTranscripts')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-64px)] bg-white pb-32">
        <div className="max-w-5xl mx-auto p-10">
          {!selectedTranscript ? (
            <>
              {/* Header */}
              <header className="flex items-end justify-between mb-10 border-b border-zinc-50 pb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-black">Transcripts</h1>
                  <p className="text-sm text-zinc-500 mt-1">
                    Manage audio files and generated texts.
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-black hover:bg-zinc-800 text-white text-xs font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-zinc-200 transition active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UploadCloud className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  {isProcessing ? 'Processing...' : 'Upload Audio'}
                </button>
              </header>

              {/* Filters & Search */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      activeFilter === 'all'
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-500 hover:text-black hover:bg-zinc-50'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveFilter('processed')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      activeFilter === 'processed'
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-500 hover:text-black hover:bg-zinc-50'
                    }`}
                  >
                    Processed
                  </button>
                  <button
                    onClick={() => setActiveFilter('processing')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                      activeFilter === 'processing'
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-500 hover:text-black hover:bg-zinc-50'
                    }`}
                  >
                    Processing
                  </button>
                </div>

                <div className="relative group">
                  <Search className="absolute left-3 top-2 w-4 h-4 text-zinc-400 group-hover:text-black transition" />
                  <input
                    type="text"
                    placeholder="Search transcripts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition w-64"
                  />
                </div>
              </div>

              {/* Transcripts List */}
              <div className="space-y-3">
                {/* Processing Item (if processing) */}
                {isProcessing && (
                  <div className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-4 flex items-center gap-5 cursor-default">
                    <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-zinc-500">Processing new file...</h3>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-200 text-zinc-600 font-bold">
                          PROCESSING
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono uppercase tracking-wide">
                        <span>Just now</span>
                      </div>
                    </div>

                    {/* Animated Waveform */}
                    <div className="hidden md:flex items-center gap-1 h-8 px-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="w-[3px] bg-black rounded-full"
                          style={{
                            animation: `wave 1s infinite ease-in-out ${i * 0.1}s`,
                            height: '8px',
                          }}
                        />
                      ))}
                    </div>

                    <div className="text-xs font-mono font-medium text-zinc-300 w-16 text-right">
                      --:--
                    </div>

                    <div className="w-24 flex justify-end">
                      <button className="p-2 text-zinc-300 cursor-not-allowed">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Transcripts */}
                {filteredTranscripts.map((transcript) => {
                  const waveHeights = generateWaveformHeights();

                  return (
                    <div
                      key={transcript.id}
                      onClick={() => handleViewTranscript(transcript)}
                      className="bg-white rounded-xl p-4 flex items-center gap-5 cursor-pointer group border border-zinc-100 hover:border-black transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:z-10"
                    >
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-zinc-900 truncate">
                            {transcript.title}
                          </h3>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono uppercase tracking-wide">
                          <span>{format(new Date(transcript.created_at), 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span>{format(new Date(transcript.created_at), 'HH:mm')}</span>
                          <span>•</span>
                          <span>{formatFileSize(transcript.file_size_mb || 0)}</span>
                        </div>
                      </div>

                      {/* Waveform */}
                      <div className="hidden md:flex items-center gap-1 h-8 opacity-50 px-4 border-l border-zinc-50">
                        {waveHeights.map((h, i) => (
                          <div
                            key={i}
                            className="w-[3px] bg-zinc-200 rounded-full group-hover:bg-zinc-600 transition-colors"
                            style={{ height: `${h * 2}px` }}
                          />
                        ))}
                      </div>

                      {/* Duration */}
                      <div className="text-xs font-mono font-medium text-zinc-500 w-16 text-right">
                        {formatDuration(transcript.duration_seconds || 0)}
                      </div>

                      {/* Actions */}
                      <div className="w-24 flex justify-end">
                        <div className="flex gap-1 opacity-0 translate-x-2.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                          <button
                            onClick={(e) => handleViewTranscript(transcript)}
                            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-black transition"
                            title="View Text"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleExport(transcript, 'txt', e)}
                            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-black transition"
                            title="Export"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTranscript(transcript.id, e)}
                            className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {filteredTranscripts.length === 0 && !isProcessing && (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-6 h-6 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-2">
                      {t('transcripts.noTranscripts')}
                    </h3>
                    <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
                      {t('transcripts.uploadFirstFile')}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white text-xs font-medium px-5 py-2.5 rounded-lg transition active:scale-95"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Upload your first audio
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Bottom Dock */}
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-zinc-200 shadow-2xl shadow-zinc-200/50 rounded-full px-4 py-2.5 hover:scale-[1.02] transition">
                  {/* Action Buttons */}
                  <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-black transition">
                    <Mic className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-black transition"
                  >
                    <Upload className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Transcript Detail View - Chat Style */
            <div className="max-w-3xl mx-auto">
              {/* Sticky Header */}
              <header className="sticky top-0 bg-white/90 backdrop-blur-xl z-20 py-6 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedTranscript(null)}
                    className="w-10 h-10 rounded-full border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 transition text-zinc-500 hover:text-black"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold text-black tracking-tight">
                      {selectedTranscript.title}
                    </h1>
                    <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                      {format(new Date(selectedTranscript.created_at), 'dd.MM.yyyy')} •{' '}
                      {format(new Date(selectedTranscript.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleExport(selectedTranscript, 'txt', e)}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-100 hover:bg-zinc-50 transition text-zinc-500"
                    title="Export"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-100 hover:bg-zinc-50 transition text-zinc-500"
                    title="More"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {/* Start of Call Indicator */}
              <div className="flex justify-center mb-8">
                <span className="text-[10px] font-medium text-zinc-300 uppercase tracking-widest bg-zinc-50 px-3 py-1 rounded-full">
                  Start of call
                </span>
              </div>

              {/* Chat Messages */}
              <div className="space-y-8 pb-20">
                {Array.isArray(selectedTranscript.transcript_entries) &&
                  selectedTranscript.transcript_entries.map((entry: any, index: number) => {
                    // Determine if this is a user message or bot/agent message
                    const isUser =
                      entry.speaker?.toLowerCase().includes('user') ||
                      entry.speaker?.toLowerCase().includes('client') ||
                      entry.speaker?.toLowerCase().includes('customer') ||
                      entry.speaker === 'Speaker 1' ||
                      (index % 2 === 0 && !entry.speaker?.toLowerCase().includes('agent') && !entry.speaker?.toLowerCase().includes('bot'));

                    return (
                      <div
                        key={index}
                        className={`group flex items-end gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-1 ${
                            isUser
                              ? 'bg-black text-white'
                              : 'bg-white border border-zinc-200 text-zinc-900'
                          }`}
                        >
                          {isUser ? (
                            <User className="w-3.5 h-3.5" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`flex flex-col max-w-[80%] ${
                            isUser ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`px-5 py-3.5 text-[14px] leading-relaxed ${
                              isUser
                                ? 'bg-black text-white rounded-2xl rounded-tr-sm shadow-md'
                                : 'bg-white border border-zinc-100 text-zinc-800 rounded-2xl rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                            }`}
                          >
                            {entry.text}
                          </div>

                          {/* Timestamp & Copy Button */}
                          <div
                            className={`flex items-center gap-2 mt-1.5 ${
                              isUser ? 'mr-1 flex-row-reverse' : 'ml-1'
                            }`}
                          >
                            <span className="text-[10px] text-zinc-400 font-medium opacity-0 group-hover:opacity-100 transition">
                              {entry.timestamp}
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(entry.text)}
                              className="text-zinc-300 hover:text-black opacity-0 group-hover:opacity-100 transition transform scale-90 group-hover:scale-100"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* End Dots */}
                <div className="flex justify-center pt-8 opacity-50">
                  <div className="w-1 h-1 bg-zinc-300 rounded-full mx-1" />
                  <div className="w-1 h-1 bg-zinc-300 rounded-full mx-1" />
                  <div className="w-1 h-1 bg-zinc-300 rounded-full mx-1" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS for wave animation */}
      <style>{`
        @keyframes wave {
          0%, 100% { height: 8px; opacity: 0.5; }
          50% { height: 16px; opacity: 1; }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Transcript;
