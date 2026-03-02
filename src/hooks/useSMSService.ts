import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SMSConfig {
  enabled: boolean;
  apiToken: string;
  senderId: string;
  message: string;
  delay: number;
}

interface SendSMSParams {
  phoneNumber: string;
  message: string;
  smsConfig: SMSConfig;
}

interface ScheduleSMSParams {
  phoneNumber: string;
  contactName: string;
  smsConfig: SMSConfig;
  conversationId?: string;
}

export const useSMSService = () => {
  const sendSMS = useMutation({
    mutationFn: async ({ phoneNumber, message, smsConfig }: SendSMSParams) => {
      console.log('Sending SMS via edge function...');
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber,
          message,
          smsConfig
        }
      });

      if (error) {
        console.error('Error calling send-sms function:', error);
        throw new Error(error.message || 'Failed to send SMS');
      }

      if (!data?.success) {
        console.error('SMS sending failed:', data);
        throw new Error(data?.error || 'Failed to send SMS');
      }

      console.log('SMS sent successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('SMS sent successfully:', data);
    },
    onError: (error) => {
      console.error('SMS sending failed:', error);
    }
  });

  const scheduleSMS = useMutation({
    mutationFn: async ({ phoneNumber, contactName, smsConfig, conversationId }: ScheduleSMSParams) => {
      if (!smsConfig.enabled) {
        console.log('SMS is disabled, skipping...');
        return { success: false, message: 'SMS is disabled' };
      }

      console.log(`Scheduling SMS for ${contactName} (${phoneNumber}) with ${smsConfig.delay} minute delay`);

      // Personalize message
      const personalizedMessage = smsConfig.message
        .replace(/\{name\}/g, contactName)
        .replace(/\{phone\}/g, phoneNumber)
        .replace(/\{conversationId\}/g, conversationId || '');

      // If delay is 0, send immediately
      if (smsConfig.delay === 0) {
        return sendSMS.mutateAsync({
          phoneNumber,
          message: personalizedMessage,
          smsConfig
        });
      }

      // Schedule SMS with delay
      const delayMs = smsConfig.delay * 60 * 1000; // Convert minutes to milliseconds
      
      setTimeout(async () => {
        try {
          await sendSMS.mutateAsync({
            phoneNumber,
            message: personalizedMessage,
            smsConfig
          });
        } catch (error) {
          console.error('Delayed SMS failed:', error);
        }
      }, delayMs);

      return { 
        success: true, 
        message: `SMS scheduled for ${smsConfig.delay} minutes`,
        scheduled: true 
      };
    }
  });

  return {
    sendSMS,
    scheduleSMS,
    isSending: sendSMS.isPending || scheduleSMS.isPending
  };
};