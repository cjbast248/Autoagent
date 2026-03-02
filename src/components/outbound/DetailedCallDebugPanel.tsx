
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle, Phone, Mic, Clock, XCircle } from 'lucide-react';

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

interface DetailedCallDebugPanelProps {
  isProcessingBatch: boolean;
  isInitiating: boolean;
  currentCallStatus: string;
  callStatuses: CallStatus[];
  currentContact: string;
  currentProgress: number;
  totalCalls: number;
  agentId: string;
}

export const DetailedCallDebugPanel: React.FC<DetailedCallDebugPanelProps> = ({
  isProcessingBatch,
  isInitiating,
  currentCallStatus,
  callStatuses,
  currentContact,
  currentProgress,
  totalCalls,
  agentId,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'calling':
        return <Phone className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'in-progress':
        return <Mic className="w-4 h-4 text-green-600 animate-pulse" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-gray-100 text-gray-700';
      case 'calling':
        return 'bg-blue-100 text-blue-700';
      case 'in-progress':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'În așteptare';
      case 'calling':
        return 'Se inițiază apelul';
      case 'in-progress':
        return 'În conversație';
      case 'processing':
        return 'Se procesează datele';
      case 'completed':
        return 'Finalizat cu succes';
      case 'failed':
        return 'Eșuat';
      default:
        return 'Necunoscut';
    }
  };

  if (!isProcessingBatch && !isInitiating && callStatuses.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Loader2 className="w-5 h-5 animate-spin" />
          Monitorizare Detaliată Apeluri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status general */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-sm font-medium text-gray-700">Agent ID</div>
            <div className="text-lg font-mono">
              {agentId || <span className="text-red-600">NU ESTE SETAT</span>}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="text-sm font-medium text-gray-700">Progres</div>
            <div className="text-lg font-mono">
              {currentProgress}/{totalCalls}
            </div>
          </div>
        </div>

        {/* Status curent */}
        {currentCallStatus && (
          <div className="bg-white p-4 rounded-lg border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="font-medium text-blue-800">Status curent:</span>
            </div>
            <div className="mt-1 text-gray-700 font-mono text-sm">{currentCallStatus}</div>
            {currentContact && (
              <div className="mt-2 text-sm text-gray-600">
                Contact procesat: <span className="font-medium">{currentContact}</span>
              </div>
            )}
          </div>
        )}

        {/* Lista detailată de apeluri */}
        {callStatuses.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-800">Status Detaliat per Contact:</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {callStatuses.map((callStatus, index) => (
                <div 
                  key={callStatus.contactId} 
                  className="bg-white p-3 rounded-lg border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-gray-500">
                      #{index + 1}
                    </div>
                    {getStatusIcon(callStatus.status)}
                    <div>
                      <div className="font-medium text-gray-900">{callStatus.contactName}</div>
                      {callStatus.conversationId && (
                        <div className="text-xs text-gray-500 font-mono">
                          ID: {callStatus.conversationId.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(callStatus.status)} border-0`}>
                      {getStatusText(callStatus.status)}
                    </Badge>
                    
                    <div className="text-right text-xs text-gray-600">
                      {callStatus.startTime && (
                        <div>Început: {callStatus.startTime.toLocaleTimeString()}</div>
                      )}
                      {callStatus.endTime && (
                        <div>Sfârșit: {callStatus.endTime.toLocaleTimeString()}</div>
                      )}
                      {callStatus.duration && (
                        <div>Durată: {callStatus.duration}s</div>
                      )}
                      {callStatus.cost && (
                        <div>Cost: ${callStatus.cost.toFixed(4)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline de procese */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-3">Timeline Proces Apel:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>1. Inițiere apel către serviciul vocal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>2. Așteptare 30 secunde pentru începerea conversației</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>3. Monitorizare conversații noi (max 2 minute)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>4. Extragere date detaliate conversație</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>5. Salvare în baza de date</span>
            </div>
          </div>
        </div>

        {/* Statistici rapide */}
        {callStatuses.length > 0 && (
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-medium text-gray-800 mb-3">Statistici:</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {callStatuses.filter(s => s.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-600">Finalizate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {callStatuses.filter(s => s.status === 'in-progress' || s.status === 'calling').length}
                </div>
                <div className="text-xs text-gray-600">În progres</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {callStatuses.filter(s => s.status === 'failed').length}
                </div>
                <div className="text-xs text-gray-600">Eșuate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {callStatuses.filter(s => s.status === 'waiting').length}
                </div>
                <div className="text-xs text-gray-600">În așteptare</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
