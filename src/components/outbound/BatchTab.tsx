
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Loader2, RotateCcw, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CSVUploadSection } from './CSVUploadSection';
import { ContactsList } from './ContactsList';
import { BatchCallProgress } from './BatchCallProgress';

interface Contact {
  id: string;
  name: string;
  phone: string;
  language: string;
  location: string;
}

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

interface RetrySettings {
  enabled: boolean;
  retryMinutes: number;
  maxRetries: number;
}

interface BatchTabProps {
  contacts: Contact[];
  selectedContacts: Set<string>;
  onContactSelect: (contactId: string, checked: boolean) => void;
  onSelectAll: () => void;
  onFileSelect: () => void;
  onDownloadTemplate: () => void;
  onBatchProcess: () => void;
  agentId: string;
  isProcessingBatch: boolean;
  currentProgress: number;
  totalCalls: number;
  currentCallStatus: string;
  callStatuses: CallStatus[];
  retrySettings: RetrySettings;
  onRetrySettingsChange: (settings: RetrySettings) => void;
}

export const BatchTab: React.FC<BatchTabProps> = ({
  contacts,
  selectedContacts,
  onContactSelect,
  onSelectAll,
  onFileSelect,
  onDownloadTemplate,
  onBatchProcess,
  agentId,
  isProcessingBatch,
  currentProgress,
  totalCalls,
  currentCallStatus,
  callStatuses,
  retrySettings,
  onRetrySettingsChange,
}) => {
  // Check if we can process batch calls
  const canProcessBatch = agentId.trim() !== '' && selectedContacts.size > 0 && !isProcessingBatch;

  console.log('BatchTab - Debug info:', {
    agentId: agentId,
    agentIdTrimmed: agentId.trim(),
    selectedContactsSize: selectedContacts.size,
    isProcessingBatch: isProcessingBatch,
    canProcessBatch: canProcessBatch
  });

  return (
    <div className="space-y-6">
      <CSVUploadSection
        onFileSelect={onFileSelect}
        onDownloadTemplate={onDownloadTemplate}
      />

      {contacts.length > 0 && (
        <div className="space-y-4">
          {/* Retry Settings Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <RotateCcw className="w-4 h-4" />
                Setări Re-apelare Automată
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="retry-enabled"
                    checked={retrySettings.enabled}
                    onCheckedChange={(enabled) => 
                      onRetrySettingsChange({ ...retrySettings, enabled })
                    }
                    disabled={isProcessingBatch}
                  />
                  <Label htmlFor="retry-enabled" className="text-sm font-medium text-blue-700">
                    Activează re-apelare pentru apelurile eșuate
                  </Label>
                </div>
              </div>
              
              {retrySettings.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-blue-600">Interval re-apelare</Label>
                    <Select
                      value={retrySettings.retryMinutes.toString()}
                      onValueChange={(value) => 
                        onRetrySettingsChange({ 
                          ...retrySettings, 
                          retryMinutes: parseInt(value) 
                        })
                      }
                      disabled={isProcessingBatch}
                    >
                      <SelectTrigger className="bg-white border-blue-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minute</SelectItem>
                        <SelectItem value="10">10 minute</SelectItem>
                        <SelectItem value="15">15 minute</SelectItem>
                        <SelectItem value="30">30 minute</SelectItem>
                        <SelectItem value="60">1 oră</SelectItem>
                        <SelectItem value="120">2 ore</SelectItem>
                        <SelectItem value="240">4 ore</SelectItem>
                        <SelectItem value="480">8 ore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-blue-600">Numărul maxim de încercări</Label>
                    <Select
                      value={retrySettings.maxRetries.toString()}
                      onValueChange={(value) => 
                        onRetrySettingsChange({ 
                          ...retrySettings, 
                          maxRetries: parseInt(value) 
                        })
                      }
                      disabled={isProcessingBatch}
                    >
                      <SelectTrigger className="bg-white border-blue-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 încercare</SelectItem>
                        <SelectItem value="2">2 încercări</SelectItem>
                        <SelectItem value="3">3 încercări</SelectItem>
                        <SelectItem value="5">5 încercări</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {retrySettings.enabled && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                  <Settings className="w-3 h-3 inline mr-1" />
                  Apelurile eșuate vor fi re-programate automat după {retrySettings.retryMinutes} minute, 
                  maximum {retrySettings.maxRetries} {retrySettings.maxRetries === 1 ? 'încercare' : 'încercări'}.
                </div>
              )}
            </CardContent>
          </Card>

          <ContactsList
            contacts={contacts}
            selectedContacts={selectedContacts}
            onContactSelect={onContactSelect}
            onSelectAll={onSelectAll}
            isProcessingBatch={isProcessingBatch}
          />

          {/* Enhanced Real-time Status Display */}
          {isProcessingBatch && (
            <BatchCallProgress
              currentProgress={currentProgress}
              totalCalls={totalCalls}
              currentCallStatus={currentCallStatus}
              callStatuses={callStatuses}
              isProcessing={isProcessingBatch}
              isPaused={false}
              isStopped={false}
            />
          )}

          <Button
            onClick={onBatchProcess}
            disabled={!canProcessBatch}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingBatch ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Monitorizează... ({currentProgress}/{totalCalls})
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Procesează cu Monitorizare ({selectedContacts.size} contacte)
              </>
            )}
          </Button>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
              Debug: Agent ID: "{agentId}" | Selected: {selectedContacts.size} | Processing: {isProcessingBatch.toString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
