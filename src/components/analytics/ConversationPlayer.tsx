
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Download, ChevronDown } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import TranscriptArea from './TranscriptArea';

interface ConversationPlayerProps {
  conversation: any;
  onSeek: (time: number) => void;
}

const ConversationPlayer = ({ conversation, onSeek }: ConversationPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(50);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = volume / 100;
    }
  }, [playbackSpeed, volume]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      onSeek(time);
    }
  };

  if (!conversation) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">Select a conversation to analyze</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Audio Waveform */}
      <div className="p-6 border-b border-gray-100">
        <AudioWaveform
          audioUrl={conversation.audio_url}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
        />
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlayPause}
            className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Volume2 size={16} className="text-gray-600" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <button className="flex items-center space-x-1 bg-white border border-gray-300 rounded px-3 py-1 text-sm hover:bg-gray-50">
              <Download size={16} />
              <span>Export</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <TranscriptArea
        transcript={conversation.transcript}
        currentTime={currentTime}
        onSeek={handleSeek}
      />

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={conversation.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};

export default ConversationPlayer;
