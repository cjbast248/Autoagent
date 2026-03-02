import React, { useEffect, useState } from 'react';
import { Mic, Phone, PhoneCall } from 'lucide-react';

interface VoiceVisualizerProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  isConnected?: boolean;
  voiceLevel?: number;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isListening = false,
  isSpeaking = false,
  isConnected = false,
  voiceLevel = 0
}) => {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (isSpeaking || isListening) {
      setAnimationKey(prev => prev + 1);
    }
  }, [isSpeaking, isListening]);

  // Generate voice bars based on voice level
  const generateVoiceBars = () => {
    return Array.from({ length: 20 }, (_, i) => {
      const height = Math.max(10, Math.random() * 80 * (voiceLevel || 0.5));
      const delay = i * 0.05;
      
      return (
        <div
          key={`${animationKey}-${i}`}
          className="voice-visualizer-bar"
          style={{
            height: `${height}px`,
            animationDelay: `${delay}s`,
            opacity: isListening || isSpeaking ? 1 : 0.3
          }}
        />
      );
    });
  };

  return (
    <div className="voice-visualizer-container">
      {/* Main Voice Visualization */}
      <div className={`voice-visualizer ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
        <div className="voice-bars-container">
          {generateVoiceBars()}
        </div>
        
        {/* Central Icon */}
        <div className="voice-icon-container">
          <div className={`voice-icon ${isConnected ? 'connected' : ''}`}>
            {isListening ? (
              <Mic className="icon" />
            ) : isSpeaking ? (
              <PhoneCall className="icon" />
            ) : (
              <Phone className="icon" />
            )}
          </div>
          
          {/* Pulse rings */}
          {(isListening || isSpeaking) && (
            <>
              <div className="pulse-ring ring-1"></div>
              <div className="pulse-ring ring-2"></div>
              <div className="pulse-ring ring-3"></div>
            </>
          )}
        </div>
      </div>
      
      {/* Sound waves emanating outward */}
      {isSpeaking && (
        <div className="sound-waves-outer">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="sound-wave-outer"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      )}
      
      {/* Status indicator */}
      <div className="voice-status">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} style={{ animation: 'none' }} />
        <span className="status-text">
          {isListening ? 'Ascult...' : isSpeaking ? 'Vorbesc...' : isConnected ? 'Conectat' : 'Deconectat'}
        </span>
      </div>
    </div>
  );
};