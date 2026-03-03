import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, Play, Square, Plus, ChevronDown, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { elevenLabsApi } from '@/utils/apiService';

// Type for cloned voice from database
interface ClonedVoice {
  id: string;
  voice_id: string;
  voice_name: string;
  description: string | null;
  preview_url: string | null;
}

// Voice data - available voices
const VOICE_DATA = [
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'Female',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Premium',
    tags: ['FEMALE', 'SOFT', 'AMERICAN'],
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    gender: 'Female',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Premium',
    tags: ['FEMALE', 'BRIGHT', 'AMERICAN'],
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    gender: 'Male',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Standard',
    tags: ['MALE', 'WARM', 'AMERICAN'],
  },
  {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    gender: 'Female',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Standard',
    tags: ['FEMALE', 'CLEAR', 'AMERICAN'],
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    gender: 'Male',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Premium',
    tags: ['MALE', 'DEEP', 'AMERICAN'],
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    gender: 'Male',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Standard',
    tags: ['MALE', 'DEEP', 'AMERICAN'],
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    gender: 'Male',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Premium',
    tags: ['MALE', 'NARRATION', 'AMERICAN'],
  },
  {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    gender: 'Male',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Standard',
    tags: ['MALE', 'NATURAL', 'AMERICAN'],
  },
  {
    id: 'ZQe5CZNOzWyzPSCn5a3c',
    name: 'James',
    gender: 'Male',
    accent: 'American',
    provider: 'elevenlabs',
    tier: 'Premium',
    tags: ['MALE', 'CLEAR', 'AMERICAN'],
  },
];

// Dot pattern style
const dotPatternStyle = {
  backgroundImage: 'radial-gradient(#d4d4d8 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
};

type FilterTab = 'all' | 'elevenlabs' | 'playht' | 'cloned' | 'gender' | 'accent';

export default function Voices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>('21m00Tcm4TlvDq8ikWAM');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [loadingClonedVoices, setLoadingClonedVoices] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch cloned voices from database
  useEffect(() => {
    const fetchClonedVoices = async () => {
      if (!user) {
        setLoadingClonedVoices(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_voices')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching cloned voices:', error);
        } else {
          setClonedVoices(data || []);
        }
      } catch (error) {
        console.error('Error fetching cloned voices:', error);
      } finally {
        setLoadingClonedVoices(false);
      }
    };

    fetchClonedVoices();
  }, [user]);

  // Combine static voices with cloned voices
  const allVoices = [
    // User's cloned voices first
    ...clonedVoices.map(cv => ({
      id: cv.voice_id,
      name: cv.voice_name,
      gender: 'Custom' as const,
      accent: 'Custom',
      provider: 'cloned' as const,
      tier: 'Cloned',
      tags: ['CUSTOM', 'CLONED'],
      isCloned: true,
      previewUrl: cv.preview_url,
    })),
    // Static voices
    ...VOICE_DATA.map(v => ({ ...v, isCloned: false, previewUrl: null })),
  ];

  // Filter voices based on active tab and search
  const filteredVoices = allVoices.filter(voice => {
    const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTab = true;
    switch (activeTab) {
      case 'elevenlabs':
        matchesTab = voice.provider === 'elevenlabs';
        break;
      case 'playht':
        matchesTab = voice.provider === 'playht';
        break;
      case 'cloned':
        matchesTab = voice.isCloned;
        break;
      default:
        matchesTab = true;
    }

    return matchesSearch && matchesTab;
  });

  // Play voice preview
  const playVoicePreview = async (voiceId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }

    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
      return;
    }

    setLoadingVoiceId(voiceId);

    try {
      const data = await elevenLabsApi.textToSpeech(
        'Bună ziua! Aceasta este o demonstrație a vocii mele.',
        voiceId
      );

      if (data?.audioContent) {
        const audioDataUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioDataUrl);
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => {
          toast.error('Nu am putut reda previzualizarea');
          setPlayingVoiceId(null);
        };
        audioRef.current = audio;
        await audio.play();
        setPlayingVoiceId(voiceId);
      } else {
        toast.info('Previzualizare indisponibilă');
      }
    } catch (error) {
      toast.error('Eroare la redarea previzualizării');
    } finally {
      setLoadingVoiceId(null);
    }
  };

  // Select voice
  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    toast.success('Vocea a fost selectată');
  };

  // Get provider badge style
  const getProviderBadge = (voice: typeof allVoices[0]) => {
    if (voice.isCloned) {
      return {
        text: 'CLONED',
        className: 'bg-black text-white',
      };
    }
    if (voice.provider === 'elevenlabs') {
      return {
        text: 'ELEVENLABS',
        className: 'bg-zinc-100 text-zinc-600',
      };
    }
    if (voice.provider === 'playht') {
      return {
        text: 'PLAYHT',
        className: 'bg-zinc-100 text-zinc-600',
      };
    }
    if (voice.tier === 'Premium') {
      return {
        text: 'PREMIUM',
        className: 'bg-amber-100 text-amber-700',
      };
    }
    return {
      text: voice.provider.toUpperCase(),
      className: 'bg-zinc-100 text-zinc-600',
    };
  };

  // Spectrum visualizer component
  const SpectrumBars = ({ isActive, isPlaying }: { isActive: boolean; isPlaying: boolean }) => {
    const barCount = 20;
    const heights = [60, 80, 45, 90, 70, 55, 85, 40, 75, 95, 50, 65, 88, 42, 78, 58, 82, 48, 72, 62];

    return (
      <div className="flex items-end justify-center gap-[3px] h-12 mb-4">
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-[4px] rounded-sm transition-all",
              isActive || isPlaying
                ? "bg-black"
                : "bg-zinc-200"
            )}
            style={{
              height: isActive || isPlaying ? `${heights[i]}%` : '30%',
              animation: isActive || isPlaying ? `spectrum 0.8s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
    );
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All Models' },
    { id: 'elevenlabs', label: 'ElevenLabs' },
    { id: 'playht', label: 'PlayHT' },
    { id: 'cloned', label: 'Cloned' },
    { id: 'gender', label: 'Gender' },
    { id: 'accent', label: 'Accent' },
  ];

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-auto min-h-screen" style={dotPatternStyle}>
        <div className="w-full max-w-6xl mx-auto px-8 py-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Voice Registry</h1>
              <p className="text-zinc-400 text-sm mt-1">Select a voice model for your AI agents</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search voices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:border-black focus:outline-none transition placeholder:text-zinc-400"
                />
              </div>

              {/* Clone Voice Button */}
              <button
                onClick={() => navigate('/account/voice-clone')}
                className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition"
              >
                <Plus className="w-4 h-4" />
                Clone Voice
              </button>
            </div>
          </div>

          {/* Tab Filters */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold border transition flex items-center gap-1",
                  activeTab === tab.id
                    ? "bg-black text-white border-black"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                )}
              >
                {tab.label}
                {(tab.id === 'gender' || tab.id === 'accent') && (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>

          {/* Voice Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Clone Voice Card - Ghost Style */}
            <div
              onClick={() => navigate('/account/voice-clone')}
              className="group rounded-2xl p-5 cursor-pointer flex flex-col items-center justify-center min-h-[260px] text-center transition-all duration-300 hover:scale-[1.02] border-2 border-dashed border-zinc-300 hover:border-black bg-zinc-50/50 hover:bg-white"
            >
              {/* Mic Icon with Plus Badge */}
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm group-hover:shadow-md transition">
                  <Mic className="w-7 h-7 text-zinc-300 group-hover:text-black transition" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center border-2 border-zinc-50 shadow">
                  <Plus className="w-3 h-3" />
                </div>
              </div>

              <h3 className="font-bold text-zinc-500 group-hover:text-black transition mb-1">Clone New Voice</h3>
              <p className="text-xs text-zinc-400 group-hover:text-zinc-500 transition">Upload MP3 or record sample</p>

              {/* Animated spectrum preview on hover */}
              <div className="flex items-end justify-center gap-[2px] h-6 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-zinc-300 rounded-sm"
                    style={{
                      height: `${20 + Math.random() * 60}%`,
                      animation: 'spectrum 0.8s ease-in-out infinite',
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {filteredVoices.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isPlaying = playingVoiceId === voice.id;
              const isHovered = hoveredCardId === voice.id;
              const badge = getProviderBadge(voice);

              return (
                <div
                  key={voice.id}
                  onMouseEnter={() => setHoveredCardId(voice.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  className={cn(
                    "bg-white rounded-2xl p-5 transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "border-2 border-black shadow-lg"
                      : "border border-zinc-200 hover:border-zinc-400 hover:shadow-md"
                  )}
                >
                  {/* Top Row: Play + Name + Badge */}
                  <div className="flex items-center gap-3 mb-4">
                    {/* Play Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playVoicePreview(voice.id);
                      }}
                      disabled={loadingVoiceId === voice.id}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                        isSelected || isPlaying || isHovered
                          ? "bg-black text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      )}
                    >
                      {loadingVoiceId === voice.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-black truncate">{voice.name}</h3>
                    </div>

                    {/* Provider Badge */}
                    <span className={cn(
                      "px-2 py-1 rounded text-[9px] font-black tracking-wider shrink-0",
                      badge.className
                    )}>
                      {badge.text}
                    </span>
                  </div>

                  {/* Spectrum Visualizer */}
                  <SpectrumBars isActive={isSelected} isPlaying={isPlaying || isHovered} />

                  {/* Tech Tags */}
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {voice.tags.slice(0, 4).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-zinc-100 text-[9px] font-bold text-zinc-500 tracking-wide"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectVoice(voice.id);
                    }}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-xs font-bold transition-all",
                      isSelected
                        ? "bg-black text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    )}
                  >
                    {isSelected ? 'Current' : 'Select'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredVoices.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
                <Search className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold text-black mb-2">No voices found</h3>
              <p className="text-zinc-500 text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>

      {/* CSS for spectrum animation */}
      <style>{`
        @keyframes spectrum {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
