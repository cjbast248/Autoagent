
import React from 'react';
import SentimentTimeline from './SentimentTimeline';
import EmotionWheel from './EmotionWheel';
import KeywordsCloud from './KeywordsCloud';
import MetricsGrid from './MetricsGrid';
import TopicTimeline from './TopicTimeline';

interface AnalyticsSidebarProps {
  conversation: any;
}

const AnalyticsSidebar = ({ conversation }: AnalyticsSidebarProps) => {
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No conversation selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-screen pb-6">
      {/* Sentiment Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Sentiment Evolution</h3>
        <SentimentTimeline data={conversation.sentiment_data} />
      </div>

      {/* Emotion Wheel */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Emotion Analysis</h3>
        <EmotionWheel emotions={conversation.emotions} />
      </div>

      {/* Metrics Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Metrics</h3>
        <MetricsGrid metrics={conversation.metrics} />
      </div>

      {/* Keywords Cloud */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Keywords</h3>
        <KeywordsCloud keywords={conversation.keywords} />
      </div>

      {/* Topic Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Topic Flow</h3>
        <TopicTimeline topics={conversation.topics || []} />
      </div>
    </div>
  );
};

export default AnalyticsSidebar;
