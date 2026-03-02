import React from 'react';
import { Play, Square } from 'lucide-react';
import { cn } from '@/utils/utils';

interface ExecuteButtonProps {
  onClick: () => void;
  onStop?: () => void;
  isRunning?: boolean;
  className?: string;
}

export const ExecuteButton: React.FC<ExecuteButtonProps> = ({
  onClick,
  onStop,
  isRunning,
  className,
}) => {
  if (isRunning) {
    return (
      <button
        onClick={onStop}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm",
          "bg-red-600 text-white",
          className
        )}
      >
        <Square className="w-4 h-4" />
        Stop
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm",
        "bg-emerald-600 text-white",
        className
      )}
    >
      <Play className="w-4 h-4" />
      Execute workflow
    </button>
  );
};

// Mini version for canvas
export const ExecuteButtonMini: React.FC<ExecuteButtonProps> = ({
  onClick,
  onStop,
  isRunning,
  className,
}) => {
  if (isRunning) {
    return (
      <button
        onClick={onStop}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded font-medium text-xs",
          "bg-red-600 text-white",
          className
        )}
      >
        <Square className="w-3 h-3" />
        Stop
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded font-medium text-xs",
        "bg-emerald-600 text-white",
        className
      )}
    >
      <Play className="w-3 h-3" />
      Execute workflow
    </button>
  );
};
