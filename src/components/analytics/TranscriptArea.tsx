
import React, { useEffect, useRef } from 'react';

interface TranscriptMessage {
  speaker: string;
  text: string;
  timestamp: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface TranscriptAreaProps {
  transcript: TranscriptMessage[];
  currentTime: number;
  onSeek: (time: number) => void;
}

const TranscriptArea = ({ transcript = [], currentTime, onSeek }: TranscriptAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-50 border-green-200';
      case 'negative': return 'bg-red-50 border-red-200';
      default: return 'bg-yellow-50 border-yellow-200';
    }
  };

  const getSentimentDot = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500';
      case 'negative': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentMessage = () => {
    return transcript.findIndex(msg => msg.timestamp <= currentTime && 
      (transcript[transcript.indexOf(msg) + 1]?.timestamp > currentTime || transcript.indexOf(msg) === transcript.length - 1));
  };

  const currentMessageIndex = getCurrentMessage();

  useEffect(() => {
    if (currentMessageIndex >= 0 && containerRef.current) {
      const messageElement = containerRef.current.children[currentMessageIndex] as HTMLElement;
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMessageIndex]);

  return (
    <div className="p-6 max-h-96 overflow-y-auto bg-white" ref={containerRef}>
      <div className="space-y-4">
        {transcript.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.speaker === 'Agent' ? 'justify-start' : 'justify-end'} cursor-pointer group`}
            onClick={() => onSeek(message.timestamp)}
          >
            <div className={`max-w-xs lg:max-w-md ${message.speaker === 'Agent' ? 'order-1' : 'order-2'}`}>
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  message.speaker === 'Agent' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {message.speaker.charAt(0)}
                </div>
                <span className="text-xs text-gray-500">{message.speaker}</span>
                <div className={`w-2 h-2 rounded-full ${getSentimentDot(message.sentiment)}`} />
                {index % 2 === 0 && (
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(message.timestamp)}
                  </span>
                )}
              </div>
              
              <div className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                index === currentMessageIndex 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : `${getSentimentColor(message.sentiment)} group-hover:shadow-md`
              }`}>
                <p className="text-sm text-gray-900">{message.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptArea;
