import React from 'react';

export const LoadingFallback = ({ message = "Se încarcă..." }: { message?: string }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
};