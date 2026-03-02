import React, { useState, useRef, useEffect } from 'react';
import { Loader2, X, Play, Pause, RotateCcw, RotateCw, Download, LogOut, MessageSquare } from 'lucide-react';
import { useConversationById } from '@/hooks/useConversationById';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/utils/utils';

interface ConversationDetailSidebarProps {
  conversationId: string;
  onClose?: () => void;
}

export const ConversationDetailSidebar: React.FC<ConversationDetailSidebarProps> = ({
  conversationId,
  onClose
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'analytics'>('overview');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const { toast } = useToast();
  const { data: conversation, isLoading, error } = useConversationById(conversationId);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (unixSeconds: number) => {
    return new Date(unixSeconds * 1000).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get audio URL from ElevenLabs
  const getAudioUrl = async (convId: string) => {
    if (!convId) return null;

    try {
      setIsLoadingAudio(true);
      const { data, error } = await supabase.functions.invoke('get-conversation-audio', {
        body: { conversationId: convId }
      });

      if (error) {
        console.error('Error fetching audio:', error);
        return null;
      }

      if (data?.audioUrl) {
        setAudioUrl(data.audioUrl);
        return data.audioUrl;
      }
      return null;
    } catch (error) {
      console.error('Error fetching audio:', error);
      return null;
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Download audio
  const downloadAudio = async () => {
    if (!conversationId) return;
    try {
      setIsLoadingAudio(true);
      const { data, error } = await supabase.functions.invoke('get-conversation-audio', {
        body: { conversationId }
      });
      if (error) throw new Error(error.message);
      if (data?.audioData) {
        const binaryString = atob(data.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${conversationId}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: "Audio descărcat",
          description: "Fișierul audio a fost descărcat cu succes"
        });
      }
    } catch (error) {
      console.error('Error downloading audio:', error);
      toast({
        title: "Eroare la descărcare",
        description: "Nu s-a putut descărca audio-ul",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Extract conversation data
  const getConversationData = () => {
    if (!conversation) return null;

    let startTimeDisplay = 'Nu este disponibil';
    const rawStart = conversation.metadata?.start_time_unix_secs ?? conversation.metadata?.start_time;
    if (typeof rawStart === 'number') {
      startTimeDisplay = formatDate(rawStart);
    } else if (typeof rawStart === 'string' && !Number.isNaN(Date.parse(rawStart))) {
      startTimeDisplay = new Date(rawStart).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    return {
      startTime: startTimeDisplay,
      duration: conversation.metadata?.call_duration_secs ? formatDuration(conversation.metadata.call_duration_secs) : '0:00',
      durationSecs: conversation.metadata?.call_duration_secs || 0,
      cost: conversation.metadata?.cost || 0,
      status: conversation.status || 'unknown',
      phoneNumber: conversation.metadata?.phone_call?.external_number || 'Nedisponibil',
      agentNumber: conversation.metadata?.phone_call?.agent_number || 'Nedisponibil',
      terminationReason: conversation.metadata?.termination_reason || 'Nedisponibil',
      callSuccessful: conversation.analysis?.call_successful || 'unknown',
      transcript: conversation.transcript || []
    };
  };

  const conversationData = getConversationData();

  // Audio controls
  const togglePlayPause = async () => {
    // If no audio URL yet, fetch it first
    if (!audioUrl && conversationId) {
      console.log('🎵 No cached audio, fetching on play...');
      setPendingPlay(true); // Will auto-play when audio loads
      await getAudioUrl(conversationId);
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.5, 0.75];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
    if (audioRef.current) {
      audioRef.current.playbackRate = speeds[nextIndex];
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && audioRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      audioRef.current.currentTime = percentage * duration;
    }
  };

  // Auto-set audio URL only if cached (instant), otherwise wait for user to click play
  useEffect(() => {
    if (conversationId && conversation) {
      // Check if we have a cached audio URL from the server
      const cachedUrl = conversation.cached_audio_url;
      if (cachedUrl) {
        console.log('🎵 Using cached audio URL (instant):', cachedUrl);
        setAudioUrl(cachedUrl);
      }
      // If not cached, don't auto-fetch - wait for user to press play
    }
  }, [conversationId, conversation]);

  // Track if user requested play before audio was ready
  const [pendingPlay, setPendingPlay] = useState(false);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleCanPlay = () => {
      // Auto-play if user had clicked play before audio was ready
      if (pendingPlay) {
        audio.play();
        setIsPlaying(true);
        setPendingPlay(false);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, pendingPlay]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        <span className="text-lg">Se încarcă conversația...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg">Eroare la încărcarea conversației</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 text-lg">Conversația nu a fost găsită</div>
      </div>
    );
  }

  return (
    <aside className="w-full bg-white h-full flex flex-col" style={{ boxShadow: '-10px 0 30px rgba(0,0,0,0.03)' }}>
      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-center bg-white sticky top-0 z-20">
        <h1 className="text-sm font-bold text-black uppercase tracking-wide">Conversation Details</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-black transition-all"
            style={{ transform: 'scale(1)' }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e4e4e7 transparent' }}>

        {/* Audio Player */}
        <div>
          {/* Audio Track Bar */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className={`h-12 bg-zinc-50 border border-zinc-200 rounded-xl relative overflow-hidden cursor-pointer hover:border-zinc-300 transition-colors mb-3 group ${isLoadingAudio ? 'animate-pulse' : ''}`}
          >
            {/* Progress Fill with Hatch Pattern */}
            <div
              className="h-full bg-black relative"
              style={{ width: `${progressPercentage}%` }}
            >
              {/* Hatch pattern overlay */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
                  backgroundSize: '8px 8px'
                }}
              />
            </div>

            {/* Knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-sm z-10"
              style={{
                left: `${progressPercentage}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)'
              }}
            />

            {/* Waveform SVG */}
            <svg
              className="absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none opacity-50"
              style={{ mixBlendMode: 'overlay' }}
              height="24"
              preserveAspectRatio="none"
            >
              <path d="M0 12 Q 10 2, 20 12 T 40 12 T 60 12 T 80 12 T 100 12 L 480 12" stroke="#000" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Time */}
            <span className="text-[10px] font-mono font-medium text-zinc-400">
              {formatDuration(currentTime)} / {formatDuration(duration || conversationData?.durationSecs || 0)}
            </span>

            {/* Playback Controls */}
            <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-lg border border-zinc-100">
              <button
                onClick={skipBackward}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-white hover:shadow-sm hover:text-black transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePlayPause}
                disabled={isLoadingAudio}
                className={`w-7 h-7 bg-black text-white rounded-md flex items-center justify-center shadow-md hover:bg-zinc-800 transition active:scale-95 ${isLoadingAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={skipForward}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-white hover:shadow-sm hover:text-black transition-all active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed */}
            <button
              onClick={cycleSpeed}
              className="text-[10px] font-bold text-zinc-400 hover:text-black transition bg-zinc-50 px-2 py-1 rounded border border-transparent hover:border-zinc-200"
            >
              {playbackSpeed.toFixed(1)}x
            </button>
          </div>
        </div>

        {/* Stats Row: Duration / Credits / Status */}
        <div className="flex items-center justify-between py-4 border-y border-zinc-50">
          <div className="text-center px-4 border-r border-zinc-100 w-1/3">
            <div className="text-[9px] text-zinc-400 uppercase mb-1">Duration</div>
            <div className="text-lg font-bold text-black">{conversationData?.duration || '0:00'}</div>
          </div>
          <div className="text-center px-4 border-r border-zinc-100 w-1/3">
            <div className="text-[9px] text-zinc-400 uppercase mb-1">Credits</div>
            <div className="text-lg font-bold text-black">{Math.round(conversationData?.cost || 0)}</div>
          </div>
          <div className="text-center px-4 w-1/3">
            <div className="text-[9px] text-zinc-400 uppercase mb-1">Status</div>
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: '#ecfdf5',
                color: '#047857',
                border: '1px solid #d1fae5',
                letterSpacing: '0.05em'
              }}
            >
              {conversationData?.callSuccessful === 'success' ? 'SUCCESS' : conversationData?.callSuccessful?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex p-1 bg-zinc-50 rounded-xl border border-zinc-100">
          {(['overview', 'transcript', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-bold uppercase transition",
                activeTab === tab
                  ? "text-black bg-white rounded-lg shadow-sm border border-zinc-100"
                  : "text-zinc-400 hover:text-black"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Connection Data */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Connection Data</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">End Reason</span>
                  <div className="flex items-center gap-2">
                    <LogOut className="w-3 h-3 text-zinc-400" />
                    <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700">
                      {conversationData?.terminationReason || 'CODE_1005'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Date & Time</span>
                  <span className="font-mono text-xs text-black">{conversationData?.startTime}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Participants</span>
                  <span className="text-xs font-bold text-zinc-300">
                    {conversationData?.phoneNumber !== 'Nedisponibil' ? conversationData?.phoneNumber : 'UNAVAILABLE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Transcript Analysis Stats Card */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="text-[10px] font-bold text-black uppercase tracking-widest">Transcript Analysis</h3>
              </div>

              <div className="flex justify-between items-end">
                <div className="text-center">
                  <div className="text-2xl font-bold text-black leading-none mb-1">
                    {conversationData?.transcript?.length || 0}
                  </div>
                  <div className="text-[9px] text-zinc-400 uppercase">Total</div>
                </div>

                <div className="h-8 w-px bg-zinc-200" />

                <div className="text-center">
                  <div className="text-2xl font-bold text-black leading-none mb-1">
                    {conversationData?.transcript?.filter((t: any) => t.role === 'agent' || t.role === 'assistant').length || 0}
                  </div>
                  <div className="text-[9px] text-zinc-400 uppercase">Agent</div>
                </div>

                <div className="h-8 w-px bg-zinc-200" />

                <div className={cn(
                  "text-center",
                  (conversationData?.transcript?.filter((t: any) => t.role === 'user' || t.role === 'customer').length || 0) === 0 && "opacity-50"
                )}>
                  <div className={cn(
                    "text-2xl font-bold leading-none mb-1",
                    (conversationData?.transcript?.filter((t: any) => t.role === 'user' || t.role === 'customer').length || 0) === 0
                      ? "text-zinc-400"
                      : "text-black"
                  )}>
                    {conversationData?.transcript?.filter((t: any) => t.role === 'user' || t.role === 'customer').length || 0}
                  </div>
                  <div className="text-[9px] text-zinc-400 uppercase">Client</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'transcript' && (
          <div className="space-y-4">
            {conversationData?.transcript?.length > 0 ? (
              conversationData.transcript.map((turn: any, index: number) => {
                const role = turn.role || turn.speaker || 'user';
                const isAgent = role === 'agent' || role === 'assistant' || role === 'ai';
                const msg = turn.message || turn.text || turn.content || '';
                const time = turn.time_in_call_secs !== undefined ? formatDuration(turn.time_in_call_secs) : '';

                return (
                  <div key={index} className={cn("flex", isAgent ? "justify-start" : "justify-end")}>
                    <div className={cn(
                      "max-w-[80%] rounded-xl px-4 py-3",
                      isAgent ? "bg-zinc-100" : "bg-black text-white"
                    )}>
                      <p className="text-sm">{msg}</p>
                      {time && (
                        <p className={cn(
                          "text-[10px] mt-1",
                          isAgent ? "text-zinc-400" : "text-zinc-400"
                        )}>{time}</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-zinc-400">
                <p>Nu există transcript disponibil.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12 text-zinc-400">
            <p className="text-sm">Analytics coming soon.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-100 flex gap-3">
        <button
          onClick={downloadAudio}
          disabled={isLoadingAudio}
          className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:border-black hover:text-black transition"
        >
          Download Audio
        </button>
        <button
          className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition"
          style={{ boxShadow: '0 10px 15px -3px rgba(228, 228, 231, 1)' }}
        >
          View Full Logs
        </button>
      </div>
    </aside>
  );
};
