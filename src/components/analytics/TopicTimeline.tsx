
import React from 'react';

interface Topic {
  name: string;
  start_time: number;
  end_time: number;
  confidence: number;
}

interface TopicTimelineProps {
  topics: Topic[];
}

const TopicTimeline = ({ topics }: TopicTimelineProps) => {
  const getTopicColor = (index: number) => {
    const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D92'];
    return colors[index % colors.length];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!topics || topics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No topics detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topics.map((topic, index) => (
        <div key={index} className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 capitalize">
              {topic.name}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(topic.confidence * 100)}%
            </span>
          </div>
          
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: getTopicColor(index),
                width: `${topic.confidence * 100}%`
              }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(topic.start_time)}</span>
            <span>{formatTime(topic.end_time)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopicTimeline;
