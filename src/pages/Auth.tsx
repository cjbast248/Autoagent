import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, AlertTriangle, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import CubeGridAnimation from '@/components/CubeGridAnimation';
import '@/styles/cube-grid.css';

// Rate limiting configuration
//
// WARNING: This rate limiting is CLIENT-SIDE ONLY, stored in localStorage.
// It can be bypassed by clearing browser storage, using incognito mode, or
// switching browsers. It exists as a UX safeguard to discourage rapid repeated
// attempts, NOT as a security measure. True rate limiting must be enforced
// server-side (e.g., Supabase's built-in rate limiting, or a custom edge function).
//
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_STORAGE_KEY = 'auth_rate_limit';

interface RateLimitData {
  attempts: number;
  firstAttemptTime: number;
  lockedUntil?: number;
}

// Rate limiting helper functions
const getRateLimitData = (email: string): RateLimitData | null => {
  try {
    const data = localStorage.getItem(`${RATE_LIMIT_STORAGE_KEY}_${email.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setRateLimitData = (email: string, data: RateLimitData): void => {
  try {
    localStorage.setItem(`${RATE_LIMIT_STORAGE_KEY}_${email.toLowerCase()}`, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

const clearRateLimitData = (email: string): void => {
  try {
    localStorage.removeItem(`${RATE_LIMIT_STORAGE_KEY}_${email.toLowerCase()}`);
  } catch {
    // Ignore storage errors
  }
};

const checkRateLimit = (email: string): { allowed: boolean; remainingTime?: number; attemptsLeft?: number } => {
  const data = getRateLimitData(email);
  const now = Date.now();

  if (!data) {
    return { allowed: true, attemptsLeft: RATE_LIMIT_MAX_ATTEMPTS };
  }

  // Check if locked
  if (data.lockedUntil && now < data.lockedUntil) {
    return { allowed: false, remainingTime: Math.ceil((data.lockedUntil - now) / 1000 / 60) };
  }

  // Check if window expired
  if (now - data.firstAttemptTime > RATE_LIMIT_WINDOW_MS) {
    clearRateLimitData(email);
    return { allowed: true, attemptsLeft: RATE_LIMIT_MAX_ATTEMPTS };
  }

  // Check attempts
  if (data.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    // Lock for remaining window time
    const lockedUntil = data.firstAttemptTime + RATE_LIMIT_WINDOW_MS;
    setRateLimitData(email, { ...data, lockedUntil });
    return { allowed: false, remainingTime: Math.ceil((lockedUntil - now) / 1000 / 60) };
  }

  return { allowed: true, attemptsLeft: RATE_LIMIT_MAX_ATTEMPTS - data.attempts };
};

const recordFailedAttempt = (email: string): void => {
  const data = getRateLimitData(email);
  const now = Date.now();

  if (!data || now - data.firstAttemptTime > RATE_LIMIT_WINDOW_MS) {
    setRateLimitData(email, { attempts: 1, firstAttemptTime: now });
  } else {
    setRateLimitData(email, { ...data, attempts: data.attempts + 1 });
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { t } = useLanguage();

  // Check URL for mode parameter and referral code
  const [searchParams] = React.useState(() => new URLSearchParams(window.location.search));
  const modeParam = searchParams.get('mode');
  const refParam = searchParams.get('ref');

  // Save referral code to localStorage for later use during signup
  React.useEffect(() => {
    if (refParam === 'summit') {
      localStorage.setItem('promo_code', 'summit');
      localStorage.setItem('promo_credits', '100000');
      console.log('🎁 Summit promo code detected and saved');
    }
  }, [refParam]);

  const [isLogin, setIsLogin] = useState(modeParam !== 'signup');
  const [email, setEmail] = useState('');

  // Pre-populate email from summit landing page
  React.useEffect(() => {
    if (modeParam === 'signup' && refParam === 'summit') {
      const promoEmail = localStorage.getItem('promo_email');
      if (promoEmail) {
        setEmail(promoEmail);
        console.log('📧 Pre-populated email from summit promo:', promoEmail);
        // Clear it from localStorage after using it
        localStorage.removeItem('promo_email');
      }
    }
  }, [modeParam, refParam]);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email'); // NEW: choose between email or phone
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remainingTime?: number; attemptsLeft?: number } | null>(null);

  // Password validation
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return t('auth.errors.passwordLength');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return t('auth.errors.passwordComplexity');
    }
    return null;
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');

      const redirectUrl = `${window.location.origin}/google-oauth-callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setError(t('auth.errors.googleError'));
        setGoogleLoading(false);
      }
    } catch {
      setError(t('auth.errors.googleError'));
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(forgotEmail)) {
      toast.error(t('auth.errors.invalidEmail'));
      return;
    }

    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(t('auth.errors.sendingEmailError'));
      } else {
        toast.success(t('auth.passwordResetSent'));
        setShowForgotPassword(false);
        setForgotEmail('');
      }
    } catch {
      toast.error(t('auth.errors.unexpectedError'));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email || !validateEmail(email)) {
      toast.error(t('auth.errors.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      // Try using Supabase's built-in resend first
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        // If built-in fails, try our edge function as backup
        const { error: fnError } = await supabase.functions.invoke('send-custom-verification-email', {
          body: { email }
        });

        if (fnError) {
          toast.error(t('auth.errors.sendingEmailError'));
        } else {
          toast.success(t('auth.confirmEmailSent'));
        }
      } else {
        toast.success(t('auth.confirmEmailSent'));
      }
    } catch {
      toast.error(t('auth.errors.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setRateLimitInfo(null);

    try {
      // Validate email only for login or email signup
      if (isLogin || (!isLogin && authMethod === 'email')) {
        if (!validateEmail(email)) {
          setError(t('auth.errors.invalidEmail'));
          setLoading(false);
          return;
        }
      }

      // Check rate limit for login attempts
      // NOTE: This is a client-side UX safeguard only. Server-side rate limiting
      // (via Supabase or edge functions) is the actual security enforcement.
      if (isLogin) {
        const rateLimitCheck = checkRateLimit(email);
        if (!rateLimitCheck.allowed) {
          const message = t('auth.errors.tooManyAttempts') || `Prea multe încercări. Încearcă din nou în ${rateLimitCheck.remainingTime} minute.`;
          setError(message);
          setRateLimitInfo({ remainingTime: rateLimitCheck.remainingTime });
          toast.warning(message);
          setLoading(false);
          return;
        }
        setRateLimitInfo({ attemptsLeft: rateLimitCheck.attemptsLeft });
      }

      let result;
      if (isLogin) {
        result = await signIn(email, password);
        if (result.error) {
          // Record failed attempt for rate limiting
          recordFailedAttempt(email);
          const newRateLimitCheck = checkRateLimit(email);
          setRateLimitInfo({ attemptsLeft: newRateLimitCheck.attemptsLeft });

          const errorMsg = result.error.message || '';

          // More detailed error messages
          if (errorMsg.includes('Invalid login credentials')) {
            setError('Email sau parolă incorectă. Verifică datele și încearcă din nou.');
          } else if (errorMsg.includes('Email not confirmed')) {
            setError('Trebuie să confirmi emailul înainte de autentificare. Verifică inbox-ul și folder-ul Spam.');
          } else if (errorMsg.includes('Too many requests')) {
            setError('Prea multe încercări. Te rugăm să aștepți câteva minute.');
          } else if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('Failed to fetch')) {
            setError('Eroare de conexiune. Verifică conexiunea la internet și încearcă din nou.');
          } else if (errorMsg.includes('User not found')) {
            setError('Nu există un cont cu această adresă de email.');
          } else {
            console.error('Login error:', errorMsg);
            setError(errorMsg || t('auth.errors.invalidCredentials'));
          }
        } else {
          // Clear rate limit on successful login
          clearRateLimitData(email);
          setRateLimitInfo(null);

          // Wait a short moment to ensure session is persisted
          await new Promise(resolve => setTimeout(resolve, 150));

          const { data: { user: freshUser } } = await supabase.auth.getUser();

          if (!freshUser?.email_confirmed_at) {
            toast.info(t('auth.emailNotConfirmedMessage') || 'Te rugăm să îți confirmi adresa de email pentru a continua.');
            navigate('/email-verification-pending');
            return;
          }

          navigate('/');
        }
      } else {
        // Signup logic
        if (!firstName.trim() || !lastName.trim()) {
          setError(t('auth.errors.nameRequired'));
          setLoading(false);
          return;
        }

        // Validate based on auth method
        if (authMethod === 'email') {
          if (!email.trim() || !validateEmail(email)) {
            setError(t('auth.errors.invalidEmail'));
            setLoading(false);
            return;
          }
        } else {
          // Phone method
          if (!phoneNumber.trim()) {
            setError('Numărul de telefon este obligatoriu');
            setLoading(false);
            return;
          }
          // Generate a dummy email for phone-based signup
          // Format: phone_{normalized_phone}@agentauto.temp
          const normalizedPhone = phoneNumber.replace(/[^0-9+]/g, '');
          const dummyEmail = `phone_${normalizedPhone.replace('+', '')}@agentauto.temp`;
          setEmail(dummyEmail);
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
          setError(passwordError);
          setLoading(false);
          return;
        }

        const finalEmail = authMethod === 'email' ? email : `phone_${phoneNumber.replace(/[^0-9+]/g, '').replace('+', '')}@agentauto.temp`;
        result = await signUp(finalEmail, password, firstName, lastName, authMethod === 'phone' ? phoneNumber : undefined);
        if (result.error) {
          const errorMsg = result.error.message || '';

          if (errorMsg.includes('User already registered')) {
            // Show helpful message that account exists
            setError('account_exists');
          } else if (errorMsg.includes('Password should be at least')) {
            setError(t('auth.errors.passwordComplexity'));
          } else if (errorMsg.includes('Database error')) {
            setError(t('auth.errors.databaseError'));
          } else if (errorMsg.includes('Invalid email')) {
            setError('Adresa de email nu este validă.');
          } else if (errorMsg.includes('Signup requires a valid password')) {
            setError('Parola trebuie să aibă minim 6 caractere.');
          } else if (errorMsg.includes('Email rate limit exceeded')) {
            setError('Prea multe încercări. Te rugăm să aștepți câteva minute.');
          } else if (errorMsg.includes('Email not confirmed')) {
            setError('Trebuie să confirmi emailul. Verifică inbox-ul și folder-ul Spam.');
          } else if (errorMsg.includes('Unable to validate email')) {
            setError('Nu am putut valida adresa de email. Verifică dacă este corectă.');
          } else if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('Failed to fetch')) {
            setError('Eroare de conexiune. Verifică conexiunea la internet și încearcă din nou.');
          } else {
            // Show detailed error for debugging
            console.error('Signup error:', errorMsg);
            setError(`Eroare la înregistrare: ${errorMsg || 'Eroare necunoscută. Te rugăm să încerci din nou.'}`);
          }
        } else {
          // Redirect based on auth method
          if (authMethod === 'phone') {
            // Phone signup - login first to get session, then send OTP
            toast.success('Cont creat! Autentificare...');

            try {
              // Auto-login after signup to get session
              const finalEmail = `phone_${phoneNumber.replace(/[^0-9+]/g, '').replace('+', '')}@agentauto.temp`;

              const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: finalEmail,
                password: password
              });

              if (loginError || !loginData.session) {
                throw new Error('Nu am putut obține sesiunea după înregistrare');
              }

              // Now send OTP via Edge Function
              toast.success('Trimit codul OTP...');

              const { data: otpData, error: otpError } = await supabase.functions.invoke('send-phone-otp', {
                body: { phone_number: phoneNumber },
                headers: {
                  Authorization: `Bearer ${loginData.session.access_token}`
                }
              });

              if (otpError || !otpData?.success) {
                throw new Error(otpData?.error || 'Nu am putut trimite codul OTP');
              }

              toast.success('Cod OTP trimis! Verifică SMS-ul.');
              navigate('/phone-verification-pending');
            } catch (otpErr: any) {
              console.error('Error sending OTP:', otpErr);
              setError(`Cont creat, dar: ${otpErr.message}`);
            }
          } else {
            // Email signup - show success message
            setSuccess(t('auth.signupSuccess'));
          }
        }
      }
    } catch (err: any) {
      setError(t('auth.errors.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-4 relative overflow-hidden bg-[#1a1a1a]"
    >
      {/* Left Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-4">
        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-md-2xl p-8 max-w-md w-full">
              <h2 className="text-xl font-bold mb-2 text-white tracking-tight">
                {t('auth.resetPassword')}
              </h2>
              <p className="text-zinc-400 mb-6 text-xs">
                {t('auth.resetPasswordDesc')}
              </p>
              <form onSubmit={handleForgotPassword}>
                <div className="mb-4">
                  <label className="text-xs font-medium text-zinc-300 mb-2 block">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-zinc-700 rounded-md outline-none focus:border-zinc-500 text-white placeholder-zinc-500 transition-colors"
                    required
                    disabled={forgotLoading}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotEmail('');
                    }}
                    className="flex-1 px-4 py-3 rounded-md text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors"
                    disabled={forgotLoading}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-white text-black rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('common.sending')}
                      </>
                    ) : (
                      t('auth.sendLink')
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Login Card - Lovable Style */}
        <div className="bg-[#1a1a1a] rounded-2xl p-8 w-full max-w-[480px] relative z-10">
          {/* Header */}
          <div className="mb-8">
            <img
              src="/lovable-uploads/kalina-logo.png"
              alt="Agentauto"
              className="w-10 h-10 mb-6"
            />
            <h1 className="text-2xl font-bold text-white mb-1">
              {isLogin ? 'Bine ai revenit' : 'Creează-ți contul'}
            </h1>
          </div>

          {/* Google Button - Lovable Style */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full bg-[#1f1f1f] text-white py-3 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all mb-3 disabled:opacity-50 border border-blue-500/30 hover:border-blue-500/50 relative"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Se conectează...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuă cu Google
              </>
            )}
          </button>

          {/* Divider - Lovable Style */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-zinc-700"></div>
            <span className="px-4 text-xs text-zinc-400">
              OR
            </span>
            <div className="flex-1 h-px bg-zinc-700"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit}>
            {/* Name Fields (Signup only) */}
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-medium text-zinc-300 mb-2 block">
                    Prenume
                  </label>
                  <input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-zinc-700 rounded-md outline-none focus:border-zinc-500 text-white placeholder-zinc-500 transition-colors"
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-300 mb-2 block">
                    Nume
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[#1a1a1a] border border-zinc-700 rounded-md outline-none focus:border-zinc-500 text-white placeholder-zinc-500 transition-colors"
                    required={!isLogin}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Auth Method Toggle (Signup only) */}
            {!isLogin && (
              <div className="mb-3">
                <label className="text-[10px] font-medium text-zinc-400 mb-1.5 block">
                  Metodă de autentificare
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('email');
                      setPhoneNumber('');
                    }}
                    className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 border bg-[#1a1a1a] ${authMethod === 'email'
                      ? 'text-white border-zinc-600'
                      : 'text-zinc-500 hover:text-zinc-300 border-zinc-700'
                      }`}
                    disabled={loading}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('phone');
                      setEmail('');
                    }}
                    className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 border bg-[#1a1a1a] ${authMethod === 'phone'
                      ? 'text-white border-zinc-600'
                      : 'text-zinc-500 hover:text-zinc-300 border-zinc-700'
                      }`}
                    disabled={loading}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Phone
                  </button>
                </div>
              </div>
            )}

            {/* Phone Number Field (Signup only - when phone method selected) */}
            {!isLogin && authMethod === 'phone' && (
              <div className="mb-4">
                <label className="text-xs font-medium text-zinc-300 mb-2 block">
                  Număr de telefon
                </label>
                <input
                  type="tel"
                  placeholder="+40 712 345 678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-transparent border border-zinc-700 rounded-md outline-none focus:border-zinc-500 text-white placeholder-zinc-500 transition-colors"
                  required
                  disabled={loading}
                />
              </div>
            )}

            {/* Email Field (Login OR Signup with email method) */}
            {(isLogin || (!isLogin && authMethod === 'email')) && (
              <div className="mb-4">
                <label className="text-xs font-medium text-zinc-300 mb-2 block">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full px-3 py-2.5 text-sm bg-transparent border border-zinc-700 rounded-md outline-none focus:border-zinc-500 text-white placeholder-zinc-500 transition-colors"
                  required
                  disabled={loading}
                />
              </div>
            )}

            {/* Password Field */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-zinc-300">
                  Parolă
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Ai uitat?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full px-3 py-2.5 pr-10 text-sm bg-transparent border border-zinc-700 rounded-md outline-none focus:border-zinc-500 text-white placeholder-zinc-500 transition-colors"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Rate Limit Warning */}
            {isLogin && rateLimitInfo?.attemptsLeft !== undefined && rateLimitInfo.attemptsLeft <= 3 && rateLimitInfo.attemptsLeft > 0 && (
              <div className="text-xs text-amber-400 bg-amber-950/20 rounded-md-xl p-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{t('auth.attemptsRemaining') || `${rateLimitInfo.attemptsLeft} încercări rămase`}</span>
              </div>
            )}

            {/* Error Message */}
            {error && error !== 'account_exists' && (
              <div className="text-xs text-red-400 bg-red-950/20 rounded-md-xl p-3 mb-4">
                {rateLimitInfo?.remainingTime ? (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : (
                  <>
                    {error}
                    {error.includes('confirm') && (
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        className="ml-2 underline hover:no-underline"
                      >
                        {t('auth.resendConfirmation')}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Account Already Exists Message */}
            {error === 'account_exists' && (
              <div className="text-xs bg-amber-950/20 rounded-md-xl p-4 mb-4">
                <div className="flex items-start gap-2 text-amber-400 mb-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Acest email este deja înregistrat</p>
                    <p className="text-amber-500">Contul există deja. Poți să te autentifici sau să îți resetezi parola.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setIsLogin(true);
                    }}
                    className="flex-1 px-3 py-2 bg-white text-black rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
                  >
                    Autentifică-te
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setForgotEmail(email);
                      setShowForgotPassword(true);
                    }}
                    className="flex-1 px-3 py-2 text-amber-400 rounded-md text-xs font-semibold hover:bg-amber-950/30 transition-colors"
                  >
                    Resetează parola
                  </button>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="text-xs text-green-400 bg-green-950/20 rounded-md-xl p-3 mb-4">
                {success}
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  className="block mt-2 text-xs underline hover:no-underline"
                >
                  {t('auth.resendEmail')}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-white text-black py-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Se procesează...
                </>
              ) : (
                'Continuă'
              )}
            </button>
          </form>

          {/* Bottom Links */}
          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-400">
              {isLogin ? "Nu ai cont?" : "Ai deja cont?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                  setEmail('');
                  setPassword('');
                  setFirstName('');
                  setLastName('');
                  setPhoneNumber('');
                  setAuthMethod('email');
                  setShowPassword(false);
                  setRateLimitInfo(null);
                }}
                className="text-white hover:underline"
                disabled={loading || googleLoading}
              >
                {isLogin ? 'Înregistrează-te' : 'Autentifică-te'}
              </button>
            </p>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Auth;
