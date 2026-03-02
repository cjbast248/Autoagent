import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { VoiceVisualizer } from './VoiceVisualizer';
import { Button } from '@/components/ui/button';

interface InteractivePhoneCallProps {
  onCallStart?: () => void;
  onCallEnd?: () => void;
  onToggleMute?: () => void;
  onToggleVolume?: () => void;
}

export const InteractivePhoneCall: React.FC<InteractivePhoneCallProps> = ({
  onCallStart,
  onCallEnd,
  onToggleMute,
  onToggleVolume
}) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeOn, setVolumeOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);

  // Simulate voice activity for demo
  useEffect(() => {
    if (isInCall) {
      const interval = setInterval(() => {
        // Simulate random voice activity
        const shouldSpeak = Math.random() > 0.7;
        const shouldListen = Math.random() > 0.8;
        
        setIsSpeaking(shouldSpeak && !isMuted);
        setIsListening(shouldListen && !shouldSpeak);
        setVoiceLevel(Math.random());
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setIsSpeaking(false);
      setIsListening(false);
      setVoiceLevel(0);
    }
  }, [isInCall, isMuted]);

  const handleCallToggle = () => {
    if (isInCall) {
      setIsInCall(false);
      onCallEnd?.();
    } else {
      setIsInCall(true);
      onCallStart?.();
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    onToggleMute?.();
  };

  const handleVolumeToggle = () => {
    setVolumeOn(!volumeOn);
    onToggleVolume?.();
  };

  return (
    <div className="interactive-phone-call">
      {/* Background Animation */}
      <div className={`call-background ${isInCall ? 'active' : ''}`}>
        <div className="bg-gradient bg-gradient-1"></div>
        <div className="bg-gradient bg-gradient-2"></div>
        <div className="bg-gradient bg-gradient-3"></div>
      </div>

      {/* Main Call Interface */}
      <div className="call-interface">
        {/* Voice Visualizer */}
        <VoiceVisualizer
          isListening={isListening}
          isSpeaking={isSpeaking}
          isConnected={isInCall}
          voiceLevel={voiceLevel}
        />

        {/* Call Controls */}
        <div className="call-controls">
          <Button
            onClick={handleMuteToggle}
            variant="outline"
            size="lg"
            className={`control-button ${isMuted ? 'muted' : ''}`}
            disabled={!isInCall}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            onClick={handleCallToggle}
            size="lg"
            className={`call-button ${isInCall ? 'end-call' : 'start-call'}`}
          >
            {isInCall ? (
              <PhoneOff className="w-8 h-8" />
            ) : (
              <Phone className="w-8 h-8" />
            )}
          </Button>

          <Button
            onClick={handleVolumeToggle}
            variant="outline"
            size="lg"
            className={`control-button ${!volumeOn ? 'muted' : ''}`}
            disabled={!isInCall}
          >
            {volumeOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </Button>
        </div>

        {/* Call Status */}
        {isInCall && (
          <div className="call-status">
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span>Apel în curs...</span>
            </div>
            <div className="call-timer">
              00:42
            </div>
          </div>
        )}
      </div>

      {/* Floating Elements */}
      {isInCall && (
        <div className="floating-elements">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="floating-element"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};