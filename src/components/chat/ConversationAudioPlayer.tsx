import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, RotateCw, MoreHorizontal, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ConversationAudioPlayerProps {
  conversation_id: string;
  audio_url: string;
  contact_name?: string;
  call_date?: string;
  duration_seconds?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const ConversationAudioPlayer: React.FC<ConversationAudioPlayerProps> = ({
  conversation_id,
  audio_url,
  contact_name,
  call_date,
  duration_seconds,
  onTimeUpdate,
  onPlayStateChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate consistent waveform data based on conversation_id
  const waveformData = useMemo(() => {
    const bars: number[] = [];
    let seed = conversation_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    for (let i = 0; i < 150; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const random = seed / 233280;
      const baseHeight = 20 + random * 60;
      bars.push(baseHeight);
    }
    return bars;
  }, [conversation_id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => setIsLoading(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audio_url, onTimeUpdate, onPlayStateChange]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        onPlayStateChange?.(false);
      } else {
        await audio.play();
        onPlayStateChange?.(true);
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    }
  };

  const handleDownloadAudio = async () => {
    if (!audio_url) {
      toast.error('URL audio nu este disponibil');
      return;
    }

    try {
      toast.info('Se descarcă audio-ul...');
      
      const response = await fetch(audio_url);
      if (!response.ok) {
        throw new Error('Nu s-a putut descărca audio-ul');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio_${contact_name || 'conversatie'}_${conversation_id?.slice(0, 8)}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Audio descărcat cu succes!');
    } catch (error) {
      console.error('Error downloading audio:', error);
      toast.error('Nu s-a putut descărca audio-ul');
    }
  };

  if (!audio_url) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 border">
        <p className="text-muted-foreground">Audio nu este disponibil pentru această conversație</p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white py-4">
      <audio ref={audioRef} src={audio_url} preload="metadata" className="hidden" />

      {/* Waveform - ElevenLabs style */}
      <div 
        className="relative h-12 mb-6 cursor-pointer mx-4"
        onClick={handleWaveformClick}
      >
        <div className="absolute inset-0 flex items-center gap-[2px]">
          {waveformData.map((height, i) => {
            const barProgress = (i / waveformData.length) * 100;
            const isPlayed = barProgress < progress;
            
            return (
              <div
                key={i}
                className="flex-1 flex items-center justify-center"
                style={{ height: '100%' }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${height}%`,
                    backgroundColor: isPlayed ? '#000000' : '#D1D5DB',
                    borderRadius: '1px',
                    transition: 'background-color 0.1s'
                  }}
                />
              </div>
            );
          })}
        </div>
        
        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-gray-500"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Controls row - ElevenLabs layout */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>

          <span className="text-sm text-gray-600 font-medium">1.0x</span>

          <button 
            onClick={() => skip(-5)}
            className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          
          <button 
            onClick={() => skip(5)}
            className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadAudio}>
                <Download className="h-4 w-4 mr-2" />
                Descarcă Audio (.mp3)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default ConversationAudioPlayer;
