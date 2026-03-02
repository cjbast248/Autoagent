import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ConversationMeta {
  contactName?: string;
  callDate?: string;
  duration?: number;
  phoneNumber?: string;
}

interface GlobalAudioPlayerState {
  isVisible: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string | null;
  showUnavailableNotification: boolean;
  currentConversation: {
    id: string;
    audioUrl: string;
    meta: ConversationMeta;
  } | null;
}

interface GlobalAudioPlayerContextValue extends GlobalAudioPlayerState {
  playFromConversation: (conversationId: string, meta?: ConversationMeta) => Promise<void>;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  hide: () => void;
  downloadCurrent: () => void;
  hideUnavailableNotification: () => void;
}

const GlobalAudioPlayerContext = createContext<GlobalAudioPlayerContextValue | null>(null);

// Cache pentru audio URLs
const audioCache = new Map<string, string>();

export const GlobalAudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GlobalAudioPlayerState>({
    isVisible: false,
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    error: null,
    showUnavailableNotification: false,
    currentConversation: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unavailableTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup audio element and its event listeners
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load(); // Force release of audio resources
      audioRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (unavailableTimeoutRef.current) {
        clearTimeout(unavailableTimeoutRef.current);
      }
    };
  }, [cleanupAudio]);

  const playFromConversation = useCallback(async (conversationId: string, meta: ConversationMeta = {}) => {
    if (!conversationId) {
      toast({
        title: "Eroare",
        description: "ID conversație invalid",
        variant: "destructive"
      });
      return;
    }

    // Show player immediately with loading state
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      isVisible: true,
      currentConversation: { 
        id: conversationId, 
        audioUrl: '', 
        meta 
      }
    }));

    try {
      let audioUrl = audioCache.get(conversationId);
      
      if (!audioUrl) {
        console.log('🎵 Fetching audio URL for conversation:', conversationId);
        const { data, error } = await supabase.functions.invoke('get-conversation-audio', {
          body: { conversationId }
        });

        if (error) throw error;

        if (!data?.audioUrl) {
          const friendlyMessage = data?.message || (data?.error === 'missing_conversation_audio'
            ? 'Audio lipsă pentru această conversație (nu a fost generat de ElevenLabs)'
            : 'Audio indisponibil pentru această conversație');
          throw new Error(friendlyMessage);
        }

        audioUrl = data.audioUrl;
        audioCache.set(conversationId, audioUrl);
        console.log('🎵 Audio URL cached:', audioUrl);
      }

      // Stop and cleanup current audio if playing
      cleanupAudio();

      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Setup event listeners with named functions for proper cleanup
      const onLoadedMetadata = () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration,
          isLoading: false,
          isVisible: true,
          currentConversation: { id: conversationId, audioUrl, meta }
        }));
      };

      const onTimeUpdate = () => {
        setState(prev => ({ ...prev, currentTime: audio.currentTime }));
      };

      const onEnded = () => {
        setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      };

      const onError = () => {
        setState(prev => ({ ...prev, error: 'Eroare la încărcarea audio-ului', isLoading: false }));
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      audio.volume = state.volume;
      await audio.play();

      setState(prev => ({ ...prev, isPlaying: true }));

    } catch (error: any) {
      console.error('🎵 Error playing conversation audio:', error);
      // Nu afișa player-ul, afișează notificarea în centrul ecranului
      setState(prev => ({
        ...prev,
        error: error.message || 'Eroare la redarea audio-ului',
        isLoading: false,
        isVisible: false,
        showUnavailableNotification: true,
        currentConversation: null
      }));

      // Ascunde notificarea după 3 secunde (cu cleanup)
      if (unavailableTimeoutRef.current) {
        clearTimeout(unavailableTimeoutRef.current);
      }
      unavailableTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, showUnavailableNotification: false }));
        unavailableTimeoutRef.current = null;
      }, 3000);
    }
  }, [state.volume]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.isPlaying]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setState(prev => ({ ...prev, volume }));
  }, []);

  const hide = useCallback(() => {
    cleanupAudio();
    setState(prev => ({
      ...prev,
      isVisible: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      currentConversation: null
    }));
  }, [cleanupAudio]);

  const downloadCurrent = useCallback(() => {
    if (!state.currentConversation) return;

    const { audioUrl, id, meta } = state.currentConversation;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${meta.phoneNumber || 'necunoscut'}.mp3`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Audio descărcat",
      description: `Audio-ul pentru ${meta.phoneNumber || 'conversația'} a fost descărcat`
    });
  }, [state.currentConversation]);

  const hideUnavailableNotification = useCallback(() => {
    setState(prev => ({ ...prev, showUnavailableNotification: false }));
  }, []);

  return (
    <GlobalAudioPlayerContext.Provider
      value={{
        ...state,
        playFromConversation,
        togglePlayPause,
        seek,
        setVolume,
        hide,
        downloadCurrent,
        hideUnavailableNotification,
      }}
    >
      {children}
    </GlobalAudioPlayerContext.Provider>
  );
};

export const useGlobalAudioPlayer = () => {
  const context = useContext(GlobalAudioPlayerContext);
  if (!context) {
    throw new Error('useGlobalAudioPlayer must be used within GlobalAudioPlayerProvider');
  }
  return context;
};