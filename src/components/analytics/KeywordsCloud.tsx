
import React, { useState } from 'react';

interface KeywordsCloudProps {
  keywords: string[];
}

const KeywordsCloud = ({ keywords }: KeywordsCloudProps) => {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  // Create frequency map (mock data)
  const keywordFrequency = keywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + Math.floor(Math.random() * 10) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxFrequency = Math.max(...Object.values(keywordFrequency));

  const getWordSize = (frequency: number) => {
    const baseSize = 12;
    const maxSize = 24;
    return baseSize + (frequency / maxFrequency) * (maxSize - baseSize);
  };

  const getWordColor = (frequency: number) => {
    const intensity = frequency / maxFrequency;
    if (intensity > 0.7) return 'text-blue-600';
    if (intensity > 0.4) return 'text-blue-500';
    return 'text-gray-600';
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-32">
      <div className="flex flex-wrap gap-2 items-center justify-center">
        {Object.entries(keywordFrequency).map(([keyword, frequency]) => (
          <button
            key={keyword}
            onClick={() => setSelectedKeyword(selectedKeyword === keyword ? null : keyword)}
            className={`px-2 py-1 rounded transition-all duration-200 hover:bg-white hover:shadow-sm ${
              selectedKeyword === keyword ? 'bg-blue-100 border border-blue-300' : ''
            } ${getWordColor(frequency)}`}
            style={{ fontSize: `${getWordSize(frequency)}px` }}
          >
            {keyword}
          </button>
        ))}
      </div>
      
      {selectedKeyword && (
        <div className="mt-3 p-2 bg-white rounded border text-xs text-gray-600">
          <strong>{selectedKeyword}</strong> mentioned {keywordFrequency[selectedKeyword]} times
        </div>
      )}
    </div>
  );
};

export default KeywordsCloud;
