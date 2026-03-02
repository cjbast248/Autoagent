
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First try to get from user metadata
        const firstName = user.user_metadata?.first_name || user.user_metadata?.firstName;
        const lastName = user.user_metadata?.last_name || user.user_metadata?.lastName;
        
        if (firstName || lastName) {
          setProfile({
            first_name: firstName,
            last_name: lastName,
            email: user.email || ''
          });
          setLoading(false);
          return;
        }

        // If not in metadata, try to fetch from profiles table with timeout
        const timeoutPromise = new Promise<{ data: null; error: { code: string } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { code: 'TIMEOUT' } }), 5000)
        );
        const queryPromise = supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (!error && data) {
          setProfile({
            first_name: data.first_name,
            last_name: data.last_name,
            email: user.email || ''
          });
        } else {
          // Fallback to email
          setProfile({
            first_name: null,
            last_name: null,
            email: user.email || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfile({
          first_name: null,
          last_name: null,
          email: user?.email || ''
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const getDisplayName = () => {
    if (!profile) return '';
    
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile.first_name) {
      return profile.first_name;
    } else if (profile.last_name) {
      return profile.last_name;
    } else {
      return profile.email.split('@')[0];
    }
  };

  return {
    profile,
    loading,
    displayName: getDisplayName()
  };
};
