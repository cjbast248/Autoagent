import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AgentSelector } from './AgentSelector';
import { PhoneSelector } from './PhoneSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';

interface BatchConfigPanelProps {
  selectedAgentId: string;
  onAgentSelect: (agentId: string) => void;
  selectedPhoneId: string;
  onPhoneSelect: (phoneId: string) => void;
  totalRecipients: number;
  selectedRecipients: number;
  concurrentCalls: number;
  onConcurrentCallsChange: (value: number) => void;
  callInterval: number;
  onCallIntervalChange: (value: number) => void;
}
export const BatchConfigPanel: React.FC<BatchConfigPanelProps> = ({
  selectedAgentId,
  onAgentSelect,
  selectedPhoneId,
  onPhoneSelect,
  totalRecipients,
  selectedRecipients,
  concurrentCalls,
  onConcurrentCallsChange,
  callInterval,
  onCallIntervalChange
}) => {
  const { t } = useLanguage();
  
  return <Card className="p-6">
      <CardContent className="px-0 space-y-6">
        {/* Agent Selection */}
        <div className="space-y-2">
          <AgentSelector selectedAgentId={selectedAgentId} onAgentSelect={onAgentSelect} />
        </div>

        {/* Phone Number Selection */}
        <div className="space-y-2">
          <PhoneSelector selectedPhoneId={selectedPhoneId} onPhoneSelect={onPhoneSelect} />
        </div>

        {/* Call Interval Selection */}
        <div className="space-y-2">
          <Label htmlFor="call-interval">{t('outbound.callInterval')}</Label>
          <Select value={callInterval.toString()} onValueChange={value => onCallIntervalChange(parseInt(value))}>
            <SelectTrigger className="bg-white/[0.31]">
              <SelectValue placeholder={t('outbound.selectCallInterval')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">{t('outbound.seconds10')}</SelectItem>
              <SelectItem value="20">{t('outbound.seconds20')}</SelectItem>
              <SelectItem value="30">{t('outbound.seconds30')}</SelectItem>
              <SelectItem value="60">{t('outbound.minute1')}</SelectItem>
              <SelectItem value="120">{t('outbound.minutes2')}</SelectItem>
              <SelectItem value="300">{t('outbound.minutes5')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('outbound.fixedIntervalBetweenCalls')}
          </p>
        </div>

        {/* Concurrent Calls Selection - Hidden for now, using sequential mode */}
        <div className="space-y-2" style={{
        display: 'none'
      }}>
          <Label htmlFor="concurrent-calls">{t('outbound.concurrentCalls')}</Label>
          <Select value={concurrentCalls.toString()} onValueChange={value => onConcurrentCallsChange(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder={t('outbound.selectConcurrentCalls')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t('outbound.call1Sequential')}</SelectItem>
              <SelectItem value="2">{t('outbound.calls2Concurrent')}</SelectItem>
              <SelectItem value="3">{t('outbound.calls3Concurrent')}</SelectItem>
              <SelectItem value="4">{t('outbound.calls4Concurrent')}</SelectItem>
              <SelectItem value="5">{t('outbound.calls5Concurrent')}</SelectItem>
              <SelectItem value="6">{t('outbound.calls6Concurrent')}</SelectItem>
              <SelectItem value="8">{t('outbound.calls8Concurrent')}</SelectItem>
              <SelectItem value="10">{t('outbound.calls10Concurrent')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('outbound.moreConcurrentFasterProcessing')}
          </p>
        </div>

        {/* Recipients Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('outbound.contactsSelected')}</span>
            <span className="text-sm font-medium">
              {selectedRecipients} {t('outbound.outOf')} {totalRecipients}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-muted">
            <span className="text-xs text-muted-foreground">{t('outbound.callInterval')}</span>
            <span className="text-xs font-medium">{callInterval}s</span>
          </div>
        </div>
      </CardContent>
    </Card>;
};