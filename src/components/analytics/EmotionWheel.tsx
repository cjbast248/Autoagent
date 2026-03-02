
import React from 'react';

interface EmotionWheelProps {
  emotions: Record<string, number>;
}

const EmotionWheel = ({ emotions }: EmotionWheelProps) => {
  const emotionColors = {
    happy: '#10B981',
    sad: '#EF4444',
    angry: '#DC2626',
    surprised: '#F59E0B',
    disgusted: '#8B5CF6',
    fearful: '#6B7280',
    neutral: '#9CA3AF',
    excited: '#06B6D4'
  };

  const emotionEmojis = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    surprised: '😲',
    disgusted: '🤢',
    fearful: '😨',
    neutral: '😐',
    excited: '🤩'
  };

  const totalIntensity = Object.values(emotions).reduce((sum, val) => sum + val, 0);
  const dominantEmotion = Object.entries(emotions).reduce((a, b) => emotions[a[0]] > emotions[b[0]] ? a : b);

  return (
    <div className="flex flex-col items-center">
      {/* Dominant emotion in center */}
      <div className="text-4xl mb-4">
        {emotionEmojis[dominantEmotion[0] as keyof typeof emotionEmojis] || '😐'}
      </div>

      {/* Emotion bars */}
      <div className="w-full space-y-2">
        {Object.entries(emotions).map(([emotion, intensity]) => (
          <div key={emotion} className="flex items-center space-x-2">
            <span className="text-xs w-16 capitalize">{emotion}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(intensity / Math.max(...Object.values(emotions))) * 100}%`,
                  backgroundColor: emotionColors[emotion as keyof typeof emotionColors] || '#9CA3AF'
                }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8">
              {Math.round(intensity * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmotionWheel;
