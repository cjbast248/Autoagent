import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const PhoneVerificationPending = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Prevent multiple OTP sends
  const hasAttemptedSendRef = useRef(false);

  // Get phone number from user metadata OR profiles table
  useEffect(() => {
    const getPhoneNumber = async () => {
      if (user?.user_metadata?.phone_number) {
        setPhoneNumber(user.user_metadata.phone_number);
      } else if (user?.id) {
        // Fallback: get from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', user.id)
          .single();

        if (profile?.phone_number) {
          setPhoneNumber(profile.phone_number);
        }
      }
    };

    getPhoneNumber();
  }, [user]);

  // Check if phone is already verified
  useEffect(() => {
    const checkPhoneVerified = async () => {
      if (!user?.id) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('phone_verified')
        .eq('id', user.id)
        .single();

      if (!error && profile?.phone_verified) {
        navigate('/');
      }
    };

    checkPhoneVerified();
  }, [user, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Auto-send OTP on mount (only once!)
  useEffect(() => {
    if (user && phoneNumber && !isVerified && !hasAttemptedSendRef.current) {
      hasAttemptedSendRef.current = true;
      sendOTP();
    }
  }, [user, phoneNumber]); // Dependencies needed but ref prevents multiple sends

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const sendOTP = async () => {
    if (!phoneNumber || !user) return;

    setIsResending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Nu ești autentificat');
      }

      const { data, error } = await supabase.functions.invoke('send-phone-otp', {
        body: { phone_number: phoneNumber },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Cod OTP trimis cu succes!');
        setCanResend(false);
        setCountdown(60);
      } else {
        throw new Error(data.error || 'Nu am putut trimite codul OTP');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Nu am putut trimite codul OTP. Încearcă din nou.');
    } finally {
      setIsResending(false);
    }
  };

  const verifyOTP = async (code: string) => {
    if (!phoneNumber || !user || code.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Nu ești autentificat');
      }

      const { data, error } = await supabase.functions.invoke('verify-phone-otp', {
        body: {
          otp_code: code,
          phone_number: phoneNumber
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) throw error;

      if (data.success) {
        setIsVerified(true);
        toast.success('Numărul de telefon a fost verificat cu succes!');
        setTimeout(() => navigate('/'), 1500);
      } else {
        toast.error(data.error || 'Cod invalid. Încearcă din nou.');
        setOtpValue('');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Nu am putut verifica codul OTP. Încearcă din nou.');
      setOtpValue('');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otpValue.length === 6 && !isVerifying) {
      verifyOTP(otpValue);
    }
  }, [otpValue]);

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
                Telefon Verificat!
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
                <Smartphone className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">
              Verifică Numărul de Telefon
            </h1>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-muted-foreground mb-2">
                Am trimis un cod de verificare (OTP) prin SMS la numărul:
              </p>
              <p className="font-semibold text-foreground">
                {phoneNumber}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Introdu codul OTP (6 cifre)
                </label>
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={isVerifying}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {isVerifying && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verificare cod...
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-4 bg-muted/50 rounded-lg border border-border"
            >
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Sfat:</strong> Codul expiră în 10 minute. Dacă nu ai primit SMS-ul, verifică că numărul este corect.
                </span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                variant="outline"
                onClick={sendOTP}
                disabled={!canResend || isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Se trimite...
                  </>
                ) : canResend ? (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Retrimite codul SMS
                  </>
                ) : (
                  <>
                    Retrimite în {countdown}s
                  </>
                )}
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-muted-foreground"
            >
              🔒 Verificarea telefonului este necesară pentru securitatea contului tău
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PhoneVerificationPending;
