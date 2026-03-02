import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const usePhoneSync = () => {
  const [syncing, setSyncing] = useState<string | null>(null);

  const fixPhoneNumber = async (phoneId: string, phoneNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fix-phone-number', {
        body: { phoneId, phoneNumber }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to fix phone number');

      return true;
    } catch (error: any) {
      console.error('💥 Fix phone number error:', error);
      throw error;
    }
  };

  const syncPhoneNumber = async (phoneId: string, phoneLabel: string, phoneNumber?: string) => {
    setSyncing(phoneId);
    
    try {
      console.log('🔄 Starting phone number sync for:', phoneId);

      // First, fix the phone_number field if provided
      if (phoneNumber) {
        console.log('🔧 Fixing phone number in database:', phoneNumber);
        await fixPhoneNumber(phoneId, phoneNumber);
      }

      const { data, error } = await supabase.functions.invoke('update-elevenlabs-phone', {
        body: { phoneId }
      });

      if (error) {
        console.error('❌ Sync error:', error);
        throw error;
      }

      if (!data.success) {
        console.error('❌ Sync failed:', data.error);
        throw new Error(data.error || 'Failed to sync phone number');
      }

      console.log('✅ Phone number synced successfully');

      toast({
        title: '✅ Sincronizare Reușită',
        description: `Numărul ${phoneLabel} a fost sincronizat cu ElevenLabs.`,
      });

      return true;
    } catch (error: any) {
      console.error('💥 Phone sync error:', error);
      
      toast({
        title: '❌ Eroare la Sincronizare',
        description: error.message || 'Nu s-a putut sincroniza numărul de telefon.',
        variant: 'destructive',
      });

      return false;
    } finally {
      setSyncing(null);
    }
  };

  return {
    syncPhoneNumber,
    syncing,
    fixPhoneNumber,
  };
};
