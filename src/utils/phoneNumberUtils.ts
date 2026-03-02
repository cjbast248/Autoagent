import { supabase } from '@/integrations/supabase/client';

export interface UserPhoneNumber {
  id: string;
  phone_number: string;
  elevenlabs_phone_id: string;
  label: string;
  status: string;
  is_primary?: boolean;
}

export const getUserPhoneNumbers = async (userId: string): Promise<UserPhoneNumber[]> => {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('*')
    .or(`user_id.eq.${userId},and(is_shared.eq.true,shared_with_user_id.eq.${userId})`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user phone numbers:', error);
    return [];
  }

  return data || [];
};

export const getPrimaryPhoneNumber = async (userId: string): Promise<UserPhoneNumber | null> => {
  const phoneNumbers = await getUserPhoneNumbers(userId);
  
  if (phoneNumbers.length === 0) {
    return null;
  }

  // Return the first active phone number (most recent)
  return phoneNumbers[0];
};

export const validateUserHasPhoneNumber = async (userId: string): Promise<{ hasPhone: boolean; phoneNumber?: UserPhoneNumber; error?: string }> => {
  try {
    const phoneNumber = await getPrimaryPhoneNumber(userId);
    
    if (!phoneNumber) {
      return {
        hasPhone: false,
        error: 'Nu aveți niciun număr de telefon activ înregistrat. Vă rugăm să adăugați un număr de telefon în secțiunea "Numere de Telefon".'
      };
    }

    return {
      hasPhone: true,
      phoneNumber
    };
  } catch (error) {
    return {
      hasPhone: false,
      error: 'Eroare la verificarea numerelor de telefon.'
    };
  }
};