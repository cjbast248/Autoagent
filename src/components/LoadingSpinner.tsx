
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} rounded-full border-2 border-gray-200 animate-spin`}>
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-2 border-transparent border-t-gray-900 animate-spin" />
        </div>
        
        {/* Inner dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-1 bg-gray-900 rounded-full animate-ping" />
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
