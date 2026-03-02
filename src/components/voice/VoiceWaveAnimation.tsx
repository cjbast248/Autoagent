import React, { useEffect, useState } from 'react';

interface VoiceWaveAnimationProps {
  isActive?: boolean;
  intensity?: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const VoiceWaveAnimation: React.FC<VoiceWaveAnimationProps> = ({
  isActive = false,
  intensity = 0.5,
  color = 'primary',
  size = 'md'
}) => {
  const [waveData, setWaveData] = useState<number[]>([]);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        // Generate realistic wave data
        const newWaveData = Array.from({ length: 32 }, (_, i) => {
          const baseWave = Math.sin((i / 32) * Math.PI * 4) * 0.5;
          const noise = (Math.random() - 0.5) * 0.3;
          const envelope = Math.sin((i / 32) * Math.PI);
          return Math.max(0.1, (baseWave + noise) * envelope * intensity);
        });
        setWaveData(newWaveData);
      }, 50);

      return () => clearInterval(interval);
    } else {
      setWaveData(Array(32).fill(0.1));
    }
  }, [isActive, intensity]);

  const sizeClasses = {
    sm: 'h-16',
    md: 'h-24',
    lg: 'h-32',
    xl: 'h-40'
  };

  return (
    <div className={`voice-wave-animation ${sizeClasses[size]} ${isActive ? 'active' : ''}`}>
      <div className="wave-container">
        {waveData.map((amplitude, index) => (
          <div
            key={index}
            className={`wave-bar wave-bar-${color}`}
            style={{
              height: `${amplitude * 100}%`,
              animationDelay: `${index * 20}ms`
            }}
          />
        ))}
      </div>
      
      {/* Glow effect */}
      {isActive && (
        <div className={`wave-glow wave-glow-${color}`} />
      )}
    </div>
  );
};