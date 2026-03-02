
import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="p-6 border border-gray-200 rounded-xl bg-white transition-all duration-300 hover:shadow-md animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          {/* Animated shimmer effect for label */}
          <div className="relative overflow-hidden">
            <div className="h-3 bg-gray-200 rounded-full w-20">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
            </div>
          </div>
          
          {/* Animated shimmer effect for value */}
          <div className="relative overflow-hidden">
            <div className="h-8 bg-gray-200 rounded-full w-16">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
        
        {/* Animated shimmer effect for icon */}
        <div className="relative overflow-hidden">
          <div className="w-12 h-12 bg-gray-200 rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
      
      {/* Loading indicator with animated dots */}
      <div className="flex items-center justify-center mt-4 space-x-1">
        {[0, 1, 2].map(i => (
          <div 
            key={i} 
            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      
      {/* Subtle progress bar */}
      <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gray-300 rounded-full animate-pulse w-3/4" />
      </div>
    </div>
  );
};

export default SkeletonCard;
