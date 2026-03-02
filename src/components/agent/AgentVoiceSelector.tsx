import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { VOICES } from '@/constants/constants';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

interface ClonedVoice {
  id: string;
  voice_id: string;
  voice_name: string;
  description: string | null;
}

interface TTSSettings {
  model_id?: string;
  stability?: number;
  speed?: number;
  similarity_boost?: number;
}

interface AgentVoiceSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
  ttsSettings?: TTSSettings;
  onTTSSettingsChange?: (settings: TTSSettings) => void;
}

// Voice metadata
const VOICE_META: Record<string, { gender: string; style: string }> = {
  '21m00Tcm4TlvDq8ikWAM': { gender: 'FEMALE', style: 'BALANCED' },  // Rachel
  'EXAVITQu4vr4xnSDxMaL': { gender: 'FEMALE', style: 'BRIGHT' },    // Bella
  'ErXwobaYiN019PkySvjV': { gender: 'MALE', style: 'BALANCED' },    // Antoni
  'MF3mGyEYCl7XYWbV9V6O': { gender: 'FEMALE', style: 'DEEP' },      // Elli
  'TxGEqnHWrfWFTfGW9XjX': { gender: 'MALE', style: 'DEEP' },        // Josh
  'VR6AewLTigWG4xSOukaG': { gender: 'MALE', style: 'DEEP' },        // Arnold
  'pNInz6obpgDQGcFmaJgB': { gender: 'MALE', style: 'DEEP' },        // Adam
  'yoZ06aMxZJJ28mfd3POQ': { gender: 'MALE', style: 'BALANCED' },    // Sam
  'ZQe5CZNOzWyzPSCn5a3c': { gender: 'MALE', style: 'BALANCED' },    // James
};

// TTS Model options
const TTS_MODELS = [
  { id: 'eleven_flash_v2', label: 'Eleven Flash', badge: 'Fastest' },
  { id: 'eleven_turbo_v2', label: 'Eleven Turbo', badge: 'Fast' },
  { id: 'eleven_flash_v2_5', label: 'Eleven Flash v2.5', badge: 'Multilingual' },
  { id: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5', badge: 'Quality' },
  { id: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2', badge: 'Best' },
];

export function AgentVoiceSelector({
  open,
  onOpenChange,
  selectedVoiceId,
  onSelect,
  ttsSettings,
  onTTSSettingsChange
}: AgentVoiceSelectorProps) {
  const { user } = useAuth();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  // Local TTS settings state
  const stability = ttsSettings?.stability ?? 0.5;
  const speed = ttsSettings?.speed ?? 1;
  const similarity = ttsSettings?.similarity_boost ?? 0.75;
  const modelId = ttsSettings?.model_id ?? 'eleven_flash_v2';

  const selectedModel = TTS_MODELS.find(m => m.id === modelId) || TTS_MODELS[0];

  // Fetch cloned voices
  useEffect(() => {
    const fetchClonedVoices = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_voices')
          .select('*')
          .eq('user_id', user.id);

        if (!error && data) {
          setClonedVoices(data);
        }
      } catch (error) {
        console.error('Error fetching cloned voices:', error);
      }
    };

    if (open) {
      fetchClonedVoices();
    }
  }, [user, open]);

  // Combine all voices - cloned first, then static
  const allVoices = useMemo(() => {
    const cloned = clonedVoices.map(cv => ({
      id: cv.voice_id,
      name: cv.voice_name,
      isCloned: true,
      meta: { gender: 'CUSTOM', style: 'CLONED' }
    }));
    const staticVoices = VOICES.map(v => ({
      id: v.id,
      name: v.name,
      isCloned: false,
      meta: VOICE_METADATA[v.id] || { gender: 'MALE', style: 'STANDARD' }
    }));
    return [...cloned, ...staticVoices];
  }, [clonedVoices]);

  const filteredVoices = useMemo(() => {
    if (!searchQuery.trim()) return allVoices;
    return allVoices.filter(voice =>
      voice.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allVoices]);

  // Get selected voice name
  const selectedVoiceName = useMemo(() => {
    const voice = allVoices.find(v => v.id === selectedVoiceId);
    return voice?.name || 'Select voice';
  }, [selectedVoiceId, allVoices]);

  const playVoicePreview = async (voiceId: string, voiceName: string) => {
    if (playingVoiceId === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setLoadingVoiceId(voiceId);

    try {
      console.log('Playing voice preview for:', voiceId, voiceName);

      // Use supabase.functions.invoke for better auth handling
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          voice_id: voiceId,
          text: `Bună, sunt ${voiceName}. Cu ce te pot ajuta astăzi?`
        }
      });

      console.log('TTS response:', { data, error });

      if (error) {
        throw error;
      }

      if (!data?.audio_base64) {
        throw new Error('No audio data received');
      }

      const audioUrl = `data:audio/mpeg;base64,${data.audio_base64}`;
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setPlayingVoiceId(null);
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setPlayingVoiceId(null);
        toast.error('Eroare la redarea audio');
      };

      audioRef.current = audio;
      await audio.play();
      setPlayingVoiceId(voiceId);

    } catch (error) {
      console.error('Error playing voice preview:', error);
      toast.error('Nu s-a putut încărca preview-ul vocal');
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const handleVoiceSelect = (voiceId: string, voiceName: string) => {
    onSelect(voiceId);
    playVoicePreview(voiceId, voiceName);
  };

  const handleCloneNewVoice = () => {
    onOpenChange(false);
    navigate('/account/voice-clone');
  };

  const handleSettingChange = (key: keyof TTSSettings, value: number | string) => {
    if (onTTSSettingsChange) {
      onTTSSettingsChange({
        ...ttsSettings,
        [key]: value
      });
    }
  };

  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingVoiceId(null);
    }
  }, [open]);

  const activeCount = clonedVoices.length;
  const totalCount = allVoices.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] p-0 border-l border-zinc-100 bg-white"
      >
        <aside className="h-full flex flex-col pt-6 px-8 overflow-hidden">
          {/* Header */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-black uppercase tracking-widest">Agent voice</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="text-zinc-300 hover:text-black transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="mb-4">
            <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Voice</label>
            <div className="relative">
              <button
                onClick={() => setSearchQuery(searchQuery ? '' : ' ')}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium hover:border-zinc-300 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🎙️</span>
                  <span className="text-black">{selectedVoiceName}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Voice List - Scrollable */}
          {searchQuery && (
            <div className="mb-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-2 mb-3">
                <Search className="w-3.5 h-3.5 text-zinc-300" />
                <input
                  type="text"
                  placeholder="Type to filter..."
                  value={searchQuery.trim()}
                  onChange={(e) => setSearchQuery(e.target.value || ' ')}
                  autoFocus
                  className="w-full text-zinc-600 placeholder-zinc-300 border-none bg-transparent p-0 text-[13px] focus:outline-none"
                />
                <button onClick={() => setSearchQuery('')} className="text-zinc-300 hover:text-black">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {filteredVoices.map((voice) => {
                  const isSelected = selectedVoiceId === voice.id;
                  const isPlaying = playingVoiceId === voice.id;
                  const isLoading = loadingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => {
                        handleVoiceSelect(voice.id, voice.name);
                        setSearchQuery('');
                      }}
                      className={`cursor-pointer group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${isSelected ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-transparent'}`} />
                        <span className={`text-sm ${isSelected ? 'font-bold text-black' : 'text-zinc-600'}`}>
                          {voice.name}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-300">
                          {voice.meta.gender}
                        </span>
                      </div>
                      {isLoading && (
                        <div className="w-3 h-3 border border-zinc-300 border-t-black rounded-full animate-spin" />
                      )}
                      {isPlaying && (
                        <div className="flex items-center gap-0.5 h-3">
                          <div className="micro-bar" style={{ animationDelay: '0s' }} />
                          <div className="micro-bar" style={{ animationDelay: '0.2s' }} />
                          <div className="micro-bar" style={{ animationDelay: '0.1s' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TTS Model Family */}
          <div className="mb-4">
            <label className="text-xs font-medium text-zinc-500 mb-1 block">TTS model family</label>
            <p className="text-[10px] text-zinc-400 mb-1.5">
              Select the ElevenLabs Model Family used for text-to-speech generation.
            </p>
            <div className="relative">
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium hover:border-zinc-300 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-black">{selectedModel.label}</span>
                  <span className="px-1.5 py-0.5 bg-zinc-200 text-[9px] font-bold text-zinc-500 rounded">
                    {selectedModel.badge}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-10 overflow-hidden">
                  {TTS_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        handleSettingChange('model_id', model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 transition ${model.id === modelId ? 'bg-zinc-50' : ''
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${model.id === modelId ? 'bg-black' : 'bg-transparent'}`} />
                        <span className={model.id === modelId ? 'font-bold text-black' : 'text-zinc-600'}>
                          {model.label}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-zinc-100 text-[9px] font-bold text-zinc-400 rounded">
                        {model.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stability Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-500">Stability</label>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
              <span>More expressive</span>
              <span>More consistent</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={stability}
              onChange={(e) => handleSettingChange('stability', parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-200 rounded-full appearance-none cursor-pointer slider-thumb"
            />
          </div>

          {/* Speed Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-500">Speed</label>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
              <span>Slower</span>
              <span>Faster</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.2"
              step="0.01"
              value={speed}
              onChange={(e) => handleSettingChange('speed', parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-200 rounded-full appearance-none cursor-pointer slider-thumb"
            />
          </div>

          {/* Similarity Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-500">Similarity</label>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
              <span>Low</span>
              <span>High</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={similarity}
              onChange={(e) => handleSettingChange('similarity_boost', parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-200 rounded-full appearance-none cursor-pointer slider-thumb"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-50 pb-4">
            <button
              onClick={handleCloneNewVoice}
              className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 hover:text-black transition uppercase tracking-widest"
            >
              <Plus className="w-3 h-3" />
              Clone New Voice
            </button>
          </div>
        </aside>

        {/* CSS for waveform and slider */}
        <style>{`
          .micro-bar {
            width: 1.5px;
            background-color: #000;
            border-radius: 99px;
            animation: micro-eq 0.8s ease-in-out infinite;
          }
          @keyframes micro-eq {
            0%, 100% { height: 3px; opacity: 0.3; }
            50% { height: 10px; opacity: 1; }
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .slider-thumb::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #000;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          .slider-thumb::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #000;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
        `}</style>
      </SheetContent>
    </Sheet>
  );
}
