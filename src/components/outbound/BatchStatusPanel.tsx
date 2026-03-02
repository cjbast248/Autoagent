import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertCircle, Users, Pause, Play, Square } from 'lucide-react';

interface CallStatus {
  contactId: string;
  contactName: string;
  status: 'waiting' | 'calling' | 'in-progress' | 'processing' | 'completed' | 'failed';
  conversationId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  cost?: number;
}

interface BatchStatusPanelProps {
  isProcessing: boolean;
  isPaused: boolean;
  isStopped: boolean;
  currentProgress: number;
  totalCalls: number;
  callStatuses: CallStatus[];
  currentCallStatus: string;
  startTime?: Date;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  callInterval?: number;
  nextCallCountdown?: number;
}

export const BatchStatusPanel: React.FC<BatchStatusPanelProps> = ({
  isProcessing,
  isPaused,
  isStopped,
  currentProgress,
  totalCalls,
  callStatuses,
  currentCallStatus,
  startTime,
  onPause,
  onResume,
  onStop,
  callInterval = 60,
  nextCallCountdown = 0,
}) => {
  const completedCalls = callStatuses.filter(call => call.status === 'completed').length;
  const failedCalls = callStatuses.filter(call => call.status === 'failed').length;
  const progressPercentage = totalCalls > 0 ? (currentProgress / totalCalls) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'waiting': 'secondary',
      'calling': 'default',
      'in-progress': 'default',
      'processing': 'default',
      'completed': 'default',
      'failed': 'destructive',
    } as const;

    const labels = {
      'waiting': 'În Așteptare',
      'calling': 'Sună',
      'in-progress': 'În Progres',
      'processing': 'Procesează',
      'completed': 'Finalizat',
      'failed': 'Eșuat',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="text-xs">
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (!isProcessing && callStatuses.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-blue-100 bg-blue-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Status Batch</span>
          </div>
          <Badge variant={isProcessing ? "default" : "secondary"}>
            {isProcessing ? "În Progres" : "Finalizat"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{totalCalls}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{currentProgress}</div>
            <div className="text-xs text-gray-500">Procesate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{completedCalls}</div>
            <div className="text-xs text-gray-500">Reușite</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{failedCalls}</div>
            <div className="text-xs text-gray-500">Eșuate</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progres</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Control Buttons */}
        {isProcessing && (
          <div className="flex gap-2 justify-center">
            {!isPaused && !isStopped && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                className="flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pauză
              </Button>
            )}
            
            {isPaused && !isStopped && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResume}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Continuă
              </Button>
            )}
            
            {!isStopped && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onStop}
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Oprește
              </Button>
            )}
          </div>
        )}

        {/* Current Status Display */}
        {currentCallStatus && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              {isPaused ? (
                <Pause className="w-4 h-4 text-orange-600" />
              ) : isStopped ? (
                <Square className="w-4 h-4 text-red-600" />
              ) : (
                <Clock className="w-4 h-4 animate-pulse text-blue-600" />
              )}
              <span>{currentCallStatus}</span>
            </div>
          </div>
        )}
        
        {/* Countdown Timer */}
        {nextCallCountdown > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-blue-700">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Următorul apel în {nextCallCountdown} secunde</span>
            </div>
            <div className="mt-2 w-full bg-blue-100 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((callInterval - nextCallCountdown) / callInterval) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Time Info */}
        {startTime && (
          <div className="text-xs text-gray-500 flex items-center space-x-2">
            <Clock className="w-3 h-3" />
            <span>Început la: {startTime.toLocaleTimeString()}</span>
          </div>
        )}

        {/* Call Recipients Table */}
        {callStatuses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Destinatari Apeluri</h4>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Contact</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Durată</th>
                  </tr>
                </thead>
                <tbody>
                  {callStatuses.map((call) => (
                    <tr key={call.contactId} className="border-t border-gray-100">
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(call.status)}
                          <span className="truncate">{call.contactName}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        {getStatusBadge(call.status)}
                      </td>
                      <td className="p-2 text-gray-500">
                        {call.duration ? `${call.duration}s` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};