import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from '@/components/ui/use-toast';

export interface QuizResponse {
  first_name: string;
  last_name: string;
  contact_phone?: string;
  preferred_language?: string;
  how_heard?: string;
  telephony_budget?: string;
  employees_count?: string;
  industry?: string;
}

// LocalStorage key for quiz completion cache
const QUIZ_COMPLETED_KEY = 'agentauto_quiz_completed';

// Check localStorage for cached completion status
const getLocalQuizCompleted = (userId: string): boolean => {
  try {
    const cached = localStorage.getItem(QUIZ_COMPLETED_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if this is for the same user
      if (data.userId === userId && data.completed === true) {
        return true;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return false;
};

// Set localStorage cache for quiz completion
const setLocalQuizCompleted = (userId: string, completed: boolean) => {
  try {
    if (completed) {
      localStorage.setItem(QUIZ_COMPLETED_KEY, JSON.stringify({ userId, completed: true }));
    } else {
      localStorage.removeItem(QUIZ_COMPLETED_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
};

export const useOnboardingQuiz = () => {
  const { user } = useAuth();
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const checkedUserIdRef = useRef<string | null>(null);

  // Check if user has completed the quiz
  const checkQuizCompleted = async () => {
    if (!user) {
      setIsCompleted(null);
      setLoading(false);
      return false;
    }

    // First, check localStorage cache (synchronous, fast)
    if (getLocalQuizCompleted(user.id)) {
      setIsCompleted(true);
      setLoading(false);
      checkedUserIdRef.current = user.id;
      return true;
    }

    // If we've already checked this user and found incomplete, don't re-query
    if (checkedUserIdRef.current === user.id && isCompleted === false) {
      setLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_onboarding_quiz')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[Onboarding] Quiz check error:', error);
        // On error, don't show quiz (safer default)
        setIsCompleted(true);
        setLoading(false);
        return true;
      }

      const completed = !!data;
      // Cache the result
      if (completed) {
        setLocalQuizCompleted(user.id, true);
      }

      setIsCompleted(completed);
      setLoading(false);
      checkedUserIdRef.current = user.id;
      return completed;
    } catch (err) {
      console.error('[Onboarding] Quiz check exception:', err);
      // On exception, don't show quiz (safer default)
      setIsCompleted(true);
      setLoading(false);
      return true;
    }
  };

  // Save quiz response and send Telegram notification
  const saveQuizResponse = async (response: QuizResponse) => {
    // Double-check authentication with fresh session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
      toast({
        title: "Authentication Error",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      return false;
    }

    const authenticatedUserId = session.user.id;

    try {
      // Build company name from first and last name for database compatibility
      const companyName = `${response.first_name} ${response.last_name}`.trim();

      // Save to database with authenticated user ID
      const { error: saveError } = await supabase
        .from('user_onboarding_quiz')
        .insert({
          user_id: authenticatedUserId,
          company_name: companyName,
          expected_calls_per_month: '',
          telephony_budget: response.telephony_budget || '',
          employees_count: response.employees_count || '',
          contact_phone: response.contact_phone || null,
          industry: response.industry || null,
          how_heard: response.how_heard || null,
        });

      if (saveError) {
        console.error('[Quiz] Save error:', saveError);

        // Check if it's a duplicate entry error
        if (saveError.code === '23505') {
          // User already has a quiz entry - mark as completed and cache it
          setLocalQuizCompleted(authenticatedUserId, true);
          setIsCompleted(true);
          toast({
            title: "Success!",
            description: "Your responses have been saved.",
          });
          return true;
        }

        toast({
          title: "Error",
          description: `Could not save your responses: ${saveError.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Send Telegram notification with quiz data
      await sendTelegramNotification(response);

      toast({
        title: "Success!",
        description: "Your responses have been saved successfully.",
      });

      // Cache the completion in localStorage
      setLocalQuizCompleted(authenticatedUserId, true);

      setIsCompleted(true);
      return true;
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Send Telegram notification with complete quiz data
  const sendTelegramNotification = async (response: QuizResponse) => {
    try {
      // Get fresh session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        return;
      }

      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', session.user.id)
        .single();

      await supabase.functions.invoke('telegram-notify-signup', {
        body: {
          user_id: session.user.id,
          email: profile?.email || session.user.email,
          first_name: response.first_name,
          last_name: response.last_name,
          quiz_data: {
            contact_phone: response.contact_phone,
            preferred_language: response.preferred_language,
            how_heard: response.how_heard,
            telephony_budget: response.telephony_budget,
            employees_count: response.employees_count,
            industry: response.industry,
          },
        },
      });
    } catch {
      // Silent fail for notification
    }
  };

  useEffect(() => {
    checkQuizCompleted();
  }, [user]);

  return {
    isCompleted,
    loading,
    checkQuizCompleted,
    saveQuizResponse,
  };
};
