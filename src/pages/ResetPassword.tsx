import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Loader2, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Check if we have a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // If there's no session and no hash in URL, redirect to auth
      if (!session && !window.location.hash.includes('access_token')) {
        toast.error('Link invalid sau expirat. Solicită un nou link de resetare.');
        navigate('/auth');
      }
    };

    checkSession();
  }, [navigate]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Parola trebuie să aibă cel puțin 8 caractere';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Parola trebuie să conțină cel puțin o literă mare, o literă mică și o cifră';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('same as the old')) {
          setError('Noua parolă trebuie să fie diferită de cea veche');
        } else {
          setError('Eroare la actualizarea parolei. Te rugăm să încerci din nou.');
        }
      } else {
        setSuccess(true);
        toast.success('Parola a fost schimbată cu succes!');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch {
      setError('Eroare neașteptată');
    } finally {
      setLoading(false);
    }
  };

  // Dotted background pattern - same as Auth.tsx
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px',
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ ...dotPatternStyle, backgroundColor: '#fcfcfc' }}
      >
        <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 max-w-md w-full text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <span className="text-white font-bold text-2xl">K</span>
            </div>
          </div>

          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">
            Parolă schimbată cu succes!
          </h1>
          <p className="text-zinc-500 text-sm mb-4">
            Parola ta a fost actualizată. Vei fi redirecționat automat...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ ...dotPatternStyle, backgroundColor: '#fcfcfc' }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
        </div>

        {/* Header */}
        <h1 className="text-xl font-bold text-center text-zinc-900 tracking-tight">
          Agent Automation
        </h1>
        <p className="text-zinc-400 text-center text-sm mt-1 mb-8">
          Setează parola ta nouă
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 block pl-1">
              Parola Nouă
            </label>
            <div className={`flex items-center bg-white rounded-xl p-1 transition-all ${password ? 'border-2 border-black' : 'border border-zinc-200'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${password ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-100 text-zinc-400'}`}>
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-zinc-900 placeholder-zinc-300"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2 block pl-1">
              Confirmă Parola
            </label>
            <div className={`flex items-center bg-white rounded-xl p-1 transition-all ${confirmPassword ? 'border-2 border-black' : 'border border-zinc-200'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${confirmPassword ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-100 text-zinc-400'}`}>
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none text-zinc-900 placeholder-zinc-300"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="text-[10px] text-zinc-400 bg-zinc-50 rounded-lg p-3">
            <p className="font-semibold mb-1">Parola trebuie să conțină:</p>
            <ul className="space-y-0.5">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>• Cel puțin 8 caractere</li>
              <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>• O literă mare</li>
              <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>• O literă mică</li>
              <li className={/\d/.test(password) ? 'text-green-600' : ''}>• O cifră</li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:bg-zinc-800 hover:-translate-y-px disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                Salvează parola nouă
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Back to Auth Link */}
        <p className="text-center text-xs text-zinc-400 mt-6">
          <Link to="/auth" className="text-zinc-600 hover:text-black transition-colors">
            ← Înapoi la autentificare
          </Link>
        </p>

        {/* Version */}
        <p className="text-center text-[10px] text-zinc-300 mt-4">
          v3.4.0 • Secured by SSL
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
