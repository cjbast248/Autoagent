
import React, { useRef, useEffect, useState } from 'react';

interface AudioWaveformProps {
  audioUrl: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

const AudioWaveform = ({ audioUrl, currentTime, duration, onSeek }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);

  // Mock waveform data - in real app, this would be generated from audio
  const waveformData = Array.from({ length: 200 }, () => Math.random() * 0.8 + 0.2);

  useEffect(() => {
    drawWaveform();
  }, [currentTime, duration, isHovering, hoverTime]);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveformData.length;
    const progressPosition = duration > 0 ? (currentTime / duration) * width : 0;

    waveformData.forEach((amplitude, index) => {
      const barHeight = amplitude * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      // Color based on progress
      if (x < progressPosition) {
        ctx.fillStyle = '#007AFF';
      } else {
        ctx.fillStyle = '#E5E5E7';
      }

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw playhead
    if (duration > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.fillRect(progressPosition - 1, 0, 2, height);
      ctx.shadowBlur = 0;
    }

    // Draw hover indicator
    if (isHovering) {
      const hoverPosition = (hoverTime / duration) * width;
      ctx.fillStyle = 'rgba(0, 122, 255, 0.3)';
      ctx.fillRect(hoverPosition - 1, 0, 2, height);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * duration;
    
    setHoverTime(time);
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * duration;
    
    onSeek(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      <div className="bg-gray-50 rounded-xl p-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={120}
          className="w-full h-30 cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={handleClick}
        />
        
        {/* Time tooltip on hover */}
        {isHovering && (
          <div
            className="absolute top-0 bg-black text-white px-2 py-1 rounded text-xs pointer-events-none transform -translate-x-1/2"
            style={{ left: `${(hoverTime / duration) * 100}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>
      
      {/* Timeline */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default AudioWaveform;
