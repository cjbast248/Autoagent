import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const EmailVerificationPending = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // IMMEDIATE check on mount - redirect already verified users instantly
  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check verification status periodically for unverified users
  useEffect(() => {
    if (!user || user.email_confirmed_at) return;

    const checkVerification = async () => {
      // Refresh session to get latest user data
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      
      if (refreshedUser?.email_confirmed_at) {
        setIsVerified(true);
        setTimeout(() => navigate('/'), 1500);
      }
    };

    // Check immediately
    checkVerification();

    // Then check every 5 seconds
    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      // Try using Supabase's built-in resend first
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        // If built-in fails, try our edge function as backup
        const { error: fnError } = await supabase.functions.invoke('send-custom-verification-email', {
          body: { email: user.email }
        });

        if (fnError) {
          throw new Error(fnError.message);
        }
      }

      toast({
        title: "Email trimis",
        description: "Un nou email de verificare a fost trimis.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message || "Nu am putut trimite emailul. Încearcă din nou.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!user) return;

    setIsChecking(true);
    try {
      // Refresh session to get latest user data
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();

      if (refreshedUser?.email_confirmed_at) {
        setIsVerified(true);
        toast({
          title: "Email verificat!",
          description: "Redirecționare către dashboard...",
        });
        setTimeout(() => navigate('/'), 1500);
      } else {
        toast({
          title: "În așteptare",
          description: "Emailul nu a fost încă confirmat. Verifică inbox-ul.",
        });
      }
    } catch {
      // Silent fail for status check
    } finally {
      setIsChecking(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              </motion.div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Email Verificat!
              </h1>
              <p className="text-muted-foreground">
                Redirecționare către dashboard...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">
              Verifică-ți emailul
            </h1>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-muted-foreground">
                Am trimis un link de verificare la adresa ta de email. 
                Te rugăm să verifici inbox-ul și să confirmi emailul pentru a-ți activa contul.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 bg-muted/50 rounded-lg border border-border"
            >
              <p className="text-sm text-muted-foreground">
                <strong>Sfat:</strong> Verifică și folderul de spam dacă nu găsești emailul în inbox.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-3 pt-2"
            >
              <Button
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificare...
                  </>
                ) : (
                  'Am confirmat emailul'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Se trimite...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Retrimite emailul
                  </>
                )}
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-muted-foreground"
            >
              🔒 Verificarea emailului este necesară pentru securitatea contului tău
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default EmailVerificationPending;
