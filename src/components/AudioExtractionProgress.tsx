import React from 'react';
import { X, Download, Loader2, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface AudioExtractionItem {
  id: string;
  contactName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
}

interface AudioExtractionProgressProps {
  items: AudioExtractionItem[];
  onDismiss: () => void;
}

export const AudioExtractionProgress: React.FC<AudioExtractionProgressProps> = ({
  items,
  onDismiss
}) => {
  if (items.length === 0) return null;

  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;
  const hasErrors = items.some(item => item.status === 'error');
  const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 animate-slide-in-right">
      <Card className="bg-green-50 dark:bg-green-950/20 backdrop-blur-sm border-green-200 dark:border-green-800 shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {allCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                {allCompleted ? 'Extragere completă!' : `Extragere audio (${completedCount}/${totalCount})`}
              </span>
            </div>
            {(allCompleted || hasErrors) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-green-700 dark:text-green-300 mb-1">
              <span>Progres total</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress 
              value={overallProgress} 
              className="h-2 bg-green-100 dark:bg-green-900/50"
            />
          </div>

          <div className="space-y-2">
            {items.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-green-700 dark:text-green-300 font-medium">
                    Audio pentru: {item.contactName}
                  </div>
                  {item.status === 'processing' && item.progress !== undefined && (
                    <Progress 
                      value={item.progress} 
                      className="h-1 mt-1 bg-green-100 dark:bg-green-900/50" 
                    />
                  )}
                </div>
                <div className="flex-shrink-0">
                  {item.status === 'processing' && (
                    <Loader2 className="h-3 w-3 animate-spin text-green-600 dark:text-green-400" />
                  )}
                  {item.status === 'completed' && (
                    <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                  )}
                  {item.status === 'error' && (
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                  )}
                  {item.status === 'pending' && (
                    <div className="h-3 w-3 rounded-full bg-green-300 dark:bg-green-700" />
                  )}
                </div>
              </div>
            ))}
            
            {items.length > 4 && (
              <div className="text-xs text-green-600 dark:text-green-400 text-center pt-1">
                +{items.length - 4} mai multe fișiere...
              </div>
            )}
          </div>

          {hasErrors && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded">
              Unele extractări au eșuat
            </div>
          )}

          {allCompleted && (
            <div className="mt-3 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-2 rounded">
              Toate fișierele audio au fost extrase cu succes!
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};