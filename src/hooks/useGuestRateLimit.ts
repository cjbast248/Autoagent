
import { useState, useEffect } from 'react';

export const useGuestRateLimit = () => {
  const [guestUsage, setGuestUsage] = useState<number>(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const GUEST_LIMIT = 10;

  useEffect(() => {
    checkGuestUsage();
  }, []);

  const checkGuestUsage = async () => {
    try {
      // Get user's IP address (in production, you'd get this from the server)
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();

      // Use localStorage as fallback since the guest_usage table might not be in types yet
      const localStorageKey = `guest_usage_${ip}`;
      const stored = localStorage.getItem(localStorageKey);
      const currentUsage = stored ? parseInt(stored, 10) : 0;

      setGuestUsage(currentUsage);
      setIsLimitReached(currentUsage >= GUEST_LIMIT);
    } catch (error) {
      console.error('Error checking guest usage:', error);
      // Fallback to localStorage only
      const stored = localStorage.getItem('guest_usage_fallback');
      const currentUsage = stored ? parseInt(stored, 10) : 0;
      setGuestUsage(currentUsage);
      setIsLimitReached(currentUsage >= GUEST_LIMIT);
    }
  };

  const incrementGuestUsage = async (): Promise<boolean> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();

      const localStorageKey = `guest_usage_${ip}`;
      const stored = localStorage.getItem(localStorageKey);
      const currentUsage = stored ? parseInt(stored, 10) : 0;
      
      if (currentUsage >= GUEST_LIMIT) {
        setIsLimitReached(true);
        return false;
      }

      // Increment usage in localStorage
      const newUsage = currentUsage + 1;
      localStorage.setItem(localStorageKey, newUsage.toString());

      setGuestUsage(newUsage);
      setIsLimitReached(newUsage >= GUEST_LIMIT);
      return true;
    } catch (error) {
      console.error('Error incrementing guest usage:', error);
      // Fallback to localStorage only
      const stored = localStorage.getItem('guest_usage_fallback');
      const currentUsage = stored ? parseInt(stored, 10) : 0;
      
      if (currentUsage >= GUEST_LIMIT) {
        setIsLimitReached(true);
        return false;
      }

      const newUsage = currentUsage + 1;
      localStorage.setItem('guest_usage_fallback', newUsage.toString());
      setGuestUsage(newUsage);
      setIsLimitReached(newUsage >= GUEST_LIMIT);
      return true;
    }
  };

  return {
    guestUsage,
    isLimitReached,
    remainingUses: Math.max(0, GUEST_LIMIT - guestUsage),
    incrementGuestUsage,
    checkGuestUsage
  };
};
