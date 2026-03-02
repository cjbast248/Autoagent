import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { AdvancedHomeAgent } from '@/components/AdvancedHomeAgent';
import { useOnboardingQuiz } from '@/hooks/useOnboardingQuiz';

const Home = () => {
  const { user, session, loading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isCompleted, loading: quizLoading } = useOnboardingQuiz();
  const [forceReady, setForceReady] = useState(false);

  // Safety timeout: after 8 seconds, force loading to complete
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading || quizLoading) {
        console.warn('[Home] Loading timeout reached, forcing ready state');
        setForceReady(true);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loading, quizLoading]);

  useEffect(() => {
    // If user is logged in and quiz is not completed (false or null for new users), redirect to quiz
    if (user && !quizLoading && isCompleted !== true) {
      navigate('/onboarding-quiz');
    }
  }, [user, isCompleted, quizLoading, navigate]);

  // Show loading while auth is initializing (but respect forceReady)
  if (loading && !forceReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // Check both session and user for better reliability
  // If forceReady and no user, redirect to auth
  if (!session && !user) {
    return <Navigate to="/auth" replace />;
  }

  // If forceReady triggered but we got here, user might be partially loaded - proceed anyway
  if (forceReady && (!user || !session)) {
    console.warn('[Home] ForceReady with partial auth state, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Redirect to email verification if email not confirmed
  if (user && !user.email_confirmed_at) {
    return <Navigate to="/email-verification-pending" replace />;
  }

  // Show loading while checking quiz status (but respect forceReady)
  if (quizLoading && !forceReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return <AdvancedHomeAgent />;
};

export default Home;