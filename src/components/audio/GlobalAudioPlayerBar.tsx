import React, { useMemo } from 'react';
import { useGlobalAudioPlayer } from './GlobalAudioPlayerContext';
import {
  Play,
  Pause,
  Download,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + secs.toString().padStart(2, '0');
};

export const GlobalAudioPlayerBar: React.FC = () => {
  const {
    isVisible,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    currentConversation,
    showUnavailableNotification,
    togglePlayPause,
    seek,
    hide,
    downloadCurrent,
    hideUnavailableNotification,
  } = useGlobalAudioPlayer();

  // Generate waveform bars pattern
  const waveformBars = useMemo(() => {
    const bars = [];
    for (let i = 0; i < 50; i++) {
      // Create a varied pattern
      let height;
      if (i % 5 === 0) height = 70;
      else if (i % 4 === 0) height = 40;
      else if (i % 3 === 0) height = 90;
      else if (i % 2 === 0) height = 30;
      else height = 60;
      bars.push(height);
    }
    return bars;
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLoading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    seek(percentage * duration);
  };

if (!isVisible && !showUnavailableNotification) return null;

  return (
    <>
      <style>{`
        @keyframes slideUpFromBottom {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDownToBottom {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        .audio-capsule {
          animation: slideUpFromBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .unavailable-notification {
          animation: slideUpFromBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .unavailable-notification.hiding {
          animation: slideDownToBottom 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .waveform-bar {
          transition: height 0.2s, background-color 0.2s;
        }
        .waveform-bar:hover {
          background-color: #000 !important;
          height: 100% !important;
        }
      `}</style>

      {/* Unavailable notification - bottom right corner */}
      {showUnavailableNotification && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className="unavailable-notification bg-red-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3"
            style={{
              boxShadow: '0 10px 40px -10px rgba(239, 68, 68, 0.5)'
            }}
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Audio indisponibil</span>
            <button
              onClick={hideUnavailableNotification}
              className="ml-1 p-1 hover:bg-red-600 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Audio Player */}
      {!isVisible ? null : (

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4" style={{ maxWidth: '712px' }}>
        <div
          className="audio-capsule flex items-center gap-6 px-6 h-20 bg-white/95 backdrop-blur-xl border border-white rounded-2xl"
          style={{
            maxWidth: '680px',
            width: '100%',
            boxShadow: '0 20px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
          }}
        >
          {/* Play Button */}
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            aria-label={isLoading ? 'Loading audio' : isPlaying ? 'Pause audio' : 'Play audio'}
            className="w-11 h-11 flex-shrink-0 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-800 hover:scale-105 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Meta Column */}
          <div className="w-36 flex-shrink-0 flex flex-col justify-center">
            <div className="text-sm font-bold text-zinc-900 whitespace-nowrap overflow-hidden text-ellipsis">
              {currentConversation?.meta.contactName || 'Conversație'}
            </div>
            <div className="flex items-center gap-1 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#16a34a' }}>
              {isLoading ? (
                <span className="text-zinc-500">Se încarcă...</span>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" style={{ boxShadow: '0 0 6px rgba(22, 163, 74, 0.4)' }} />
                  <span>Ready</span>
                </>
              )}
            </div>
          </div>

          {/* Waveform Track */}
          <div
            className="flex-grow h-8 flex items-center gap-0.5 cursor-pointer"
            onClick={handleWaveformClick}
            style={{
              maskImage: `linear-gradient(to right, black ${progress}%, rgba(0,0,0,0.2) ${progress}%)`,
              WebkitMaskImage: `linear-gradient(to right, black ${progress}%, rgba(0,0,0,0.2) ${progress}%)`
            }}
          >
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className="waveform-bar flex-1 bg-zinc-900 rounded-sm"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          {/* Right Group */}
          <div className="flex items-center gap-4 pl-4 border-l border-zinc-100">
            <div
              className="min-w-10 text-right text-xs font-semibold text-zinc-900"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {formatTime(currentTime)}
            </div>

            <div className="flex gap-1">
              <button
                onClick={downloadCurrent}
                disabled={!currentConversation?.audioUrl}
                aria-label="Download audio"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-black transition-all disabled:opacity-50"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={hide}
                aria-label="Close audio player"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-black transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
};
