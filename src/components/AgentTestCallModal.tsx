import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserPhoneNumbers } from '@/hooks/useUserPhoneNumbers';
import { useLanguage } from '@/contexts/LanguageContext';
import { ENV } from '@/config/environment';
import { getAccessTokenSync } from '@/utils/sessionManager';

interface AgentTestCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: {
    id: string;
    agent_id: string;
    name: string;
  };
}

export const AgentTestCallModal: React.FC<AgentTestCallModalProps> = ({
  isOpen,
  onClose,
  agent
}) => {
  const { t } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');
  const [isInitiating, setIsInitiating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: userPhoneNumbers = [], isLoading: isLoadingPhones } = useUserPhoneNumbers();

  useEffect(() => {
    if (isOpen) {
      if (userPhoneNumbers.length > 0 && !selectedPhoneId) {
        setSelectedPhoneId(userPhoneNumbers[0].id);
      }
    }
  }, [isOpen, userPhoneNumbers.length]);

  const selectedPhone = userPhoneNumbers.find(p => p.id === selectedPhoneId);

  const handleTestCall = async () => {
    if (!phoneNumber.trim() || !selectedPhone) return;

    setIsInitiating(true);
    try {
      const requestBody = {
        agent_id: agent.agent_id,
        phone_number: phoneNumber.trim(),
        contact_name: `Test pentru ${agent.name}`,
        user_id: user?.id,
        is_test_call: false,
        phone_id: selectedPhoneId,
      };

      console.log('Initiating call with:', requestBody);

      const accessToken = getAccessTokenSync();
      if (!accessToken) {
        toast({
          title: t('common.error'),
          description: 'No access token available',
          variant: "destructive"
        });
        return;
      }

      const url = `${ENV.SUPABASE_URL}/functions/v1/initiate-scheduled-call`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let error: any = null;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'apikey': ENV.SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('Call response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          error = { message: `HTTP ${response.status}: ${errorText}` };
        } else {
          const data = await response.json();
          console.log('Call response data:', data);
          if (data?.error) {
            error = { message: data.error };
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          error = { message: 'Request timed out after 30 seconds' };
        } else {
          error = { message: err.message };
        }
      }

      if (error) {
        toast({
          title: t('common.error'),
          description: t('errors.couldNotInitiateCall'),
          variant: "destructive"
        });
      } else {
        toast({
          title: t('success.callInitiated'),
          description: t('success.callInitiatedDesc'),
        });
        setPhoneNumber('');
        onClose();
      }
    } finally {
      setIsInitiating(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    onClose();
  };

  const canInitiateCall = () => {
    if (!phoneNumber.trim()) return false;
    if (isInitiating) return false;
    return !!selectedPhone;
  };

  const getButtonText = () => {
    if (isInitiating) return t('modals.testCall.initiating');
    if (!selectedPhone) return t('modals.testCall.selectNumberRequired');
    return t('modals.testCall.initiateTest');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleClose}>
      {/* Form card - fără bordură */}
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-6 space-y-4">
          {/* Phone number input */}
          <div className="space-y-2">
            <Label htmlFor="test-phone" className="text-sm font-medium text-gray-700">
              {t('modals.testCall.yourPhoneNumber')}
            </Label>
            <Input
              id="test-phone"
              type="tel"
              placeholder={t('modals.testCall.phoneNumberPlaceholder')}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-white border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          {/* Phone number selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              {t('modals.testCall.chooseCallSource')}
            </Label>
            {isLoadingPhones ? (
              <div className="p-3 rounded-xl border border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-500">{t('modals.testCall.loadingNumbers')}</span>
              </div>
            ) : userPhoneNumbers.length === 0 ? (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50">
                <span className="text-sm text-red-600">{t('modals.testCall.noPhoneNumbers')}</span>
              </div>
            ) : (
              <Select value={selectedPhoneId} onValueChange={setSelectedPhoneId}>
                <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl">
                  <SelectValue placeholder={t('modals.testCall.selectNumber')} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 rounded-xl">
                  {userPhoneNumbers.map((phone) => (
                    <SelectItem key={phone.id} value={phone.id}>
                      <span className="font-mono">{phone.phone_number}</span>
                      {phone.label && <span className="ml-2 text-gray-500">({phone.label})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-xl border-gray-200 hover:bg-gray-50"
              disabled={isInitiating}
            >
              {t('modals.testCall.cancel')}
            </Button>
            <Button
              onClick={handleTestCall}
              disabled={!canInitiateCall()}
              className="flex-1 rounded-xl bg-black hover:bg-gray-800 text-white"
            >
              {isInitiating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {getButtonText()}
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  {getButtonText()}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Agent name - fixed bottom right */}
      <h2 className="fixed bottom-8 right-8 text-3xl font-bold text-gray-900 whitespace-nowrap">
        {agent.name}
      </h2>
    </div>
  );
};
