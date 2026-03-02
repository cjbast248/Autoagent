import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Module-level flag to prevent duplicate processing across React StrictMode remounts
let globalProcessingFlag = false;
let globalProcessingTimestamp = 0;

const GoogleOAuthCallback = () => {
  const navigate = useNavigate();

  // Track if component is still mounted and processing is active
  const isActiveRef = useRef(true);
  // Store timeout ID for proper cleanup
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check module-level flag - if processed within last 10 seconds, skip
    const now = Date.now();
    if (globalProcessingFlag && (now - globalProcessingTimestamp) < 10000) {
      console.log('🔍 OAuth Callback: Already processing, skipping duplicate');
      return;
    }

    const handleGoogleCallback = async () => {
      // Double check and set module-level flag
      if (globalProcessingFlag && (Date.now() - globalProcessingTimestamp) < 10000) return;
      globalProcessingFlag = true;
      globalProcessingTimestamp = Date.now();

      // Safety timeout - if nothing happens in 30 seconds, redirect to auth (no error)
      safetyTimeoutRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          console.warn('⏱️ OAuth callback timeout reached, redirecting to auth');
          globalProcessingFlag = false;
          isActiveRef.current = false;
          navigate('/auth', { replace: true });
        }
      }, 30000);

      try {
        let session = null;

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        // Try to exchange code if present
        if (code) {
          console.log('🔄 OAuth: Exchanging code for session...');
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data.session) {
              session = data.session;
              console.log('✅ OAuth: Code exchange successful');
            }
          } catch (err) {
            console.warn('⚠️ OAuth: Code exchange failed, will check existing session', err);
          }
          // Clean up URL after processing
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // If no session from code exchange, wait a bit and check for existing session
        if (!session) {
          console.log('🔄 OAuth: Waiting for session to be established...');

          // Add a delay to allow Supabase client to process tokens
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Try to get session multiple times with delays (10 attempts instead of 5)
          for (let attempt = 0; attempt < 10; attempt++) {
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
              session = data.session;
              console.log(`✅ OAuth: Session found on attempt ${attempt + 1}`);
              break;
            }

            if (attempt < 9) {
              console.log(`⏳ OAuth: Session not ready yet, waiting... (attempt ${attempt + 1}/10)`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        // Clear timeout
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        isActiveRef.current = false;

        // If we have a session, go to dashboard. Otherwise go to auth (no error shown)
        if (session?.user) {
          console.log('✅ OAuth success, redirecting to dashboard');

          // Send Telegram notification for new Google users
          try {
            const createdAt = new Date(session.user.created_at);
            const now = new Date();
            const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

            console.log('🔍 Google OAuth user info:', {
              userId: session.user.id,
              email: session.user.email,
              createdAt: session.user.created_at,
              minutesSinceCreation: minutesSinceCreation.toFixed(2),
              isNew: minutesSinceCreation < 5
            });

            // Only notify for truly new accounts (created within last 5 minutes)
            if (minutesSinceCreation < 5) {
              console.log('📱 Sending Telegram notification for new Google user');
              const fullName = session.user.user_metadata?.full_name || '';
              const nameParts = fullName.split(' ');

              const response = await supabase.functions.invoke('telegram-notify-signup', {
                body: {
                  user_id: session.user.id,
                  email: session.user.email,
                  first_name: nameParts[0] || session.user.user_metadata?.first_name || '',
                  last_name: nameParts.slice(1).join(' ') || session.user.user_metadata?.last_name || '',
                  is_basic: true,
                  provider: 'google'
                }
              });
              console.log('✅ Telegram notification response:', response);
            } else {
              console.log('⏭️ Skipping notification - account is not new (created', minutesSinceCreation.toFixed(2), 'minutes ago)');
            }
          } catch (notifyErr) {
            console.error('⚠️ Failed to send Telegram notification:', notifyErr);
            // Don't block redirect if notification fails
          }

          navigate('/dashboard', { replace: true });
        } else {
          console.log('⚠️ OAuth: No session found after retries, redirecting to auth');
          navigate('/auth', { replace: true });
        }
        return;

      } catch (err) {
        console.error('❌ OAuth callback error:', err);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        isActiveRef.current = false;
        globalProcessingFlag = false;
        // No error shown - just redirect to auth
        navigate('/auth', { replace: true });
      }
    };

    handleGoogleCallback();

    // Cleanup function to handle component unmount
    return () => {
      isActiveRef.current = false;
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      // Don't reset globalProcessingFlag on unmount - it should persist
    };
  }, []); // Empty dependency array - run only once

  // Always show loading animation - redirects happen automatically
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <div className="text-center">
        {/* Animated logo/brand mark */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-zinc-200 animate-[spin_3s_linear_infinite]" />
          {/* Middle pulsing ring */}
          <div className="absolute inset-2 rounded-full border-2 border-zinc-300 animate-[pulse_2s_ease-in-out_infinite]" />
          {/* Inner gradient circle */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-black via-zinc-800 to-zinc-600 animate-[pulse_1.5s_ease-in-out_infinite] shadow-lg" />
          {/* Center dot */}
          <div className="absolute inset-[38%] rounded-full bg-white animate-[ping_1s_ease-in-out_infinite]" />
        </div>

        {/* Text with fade animation */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-zinc-800 animate-[pulse_2s_ease-in-out_infinite]">
            Se conectează...
          </h2>
          <p className="text-sm text-zinc-500">
            Verificăm datele tale de autentificare
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          <div className="w-2 h-2 rounded-full bg-zinc-400 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-zinc-500 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-zinc-600 animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default GoogleOAuthCallback;
