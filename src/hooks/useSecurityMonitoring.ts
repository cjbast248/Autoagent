import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

interface SecurityEvent {
  event_type: string;
  severity?: 'low' | 'medium' | 'high';
  details?: Record<string, any>;
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();

  const logSecurityEvent = useCallback(async (event: SecurityEvent) => {
    if (!user) return;

    try {
      // Log security events for monitoring
      await supabase.functions.invoke('log-security-event', {
        body: {
          user_id: user.id,
          event_type: event.event_type,
          severity: event.severity || 'medium',
          details: event.details,
          ip_address: null // Will be captured server-side
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, [user]);

  const logFailedAttempt = useCallback((action: string, details?: Record<string, any>) => {
    logSecurityEvent({
      event_type: `FAILED_${action}`,
      severity: 'medium',
      details
    });
  }, [logSecurityEvent]);

  const logSuspiciousActivity = useCallback((activity: string, details?: Record<string, any>) => {
    logSecurityEvent({
      event_type: `SUSPICIOUS_${activity}`,
      severity: 'high',
      details
    });
  }, [logSecurityEvent]);

  const logRateLimitHit = useCallback((resource: string, limit: number) => {
    logSecurityEvent({
      event_type: 'RATE_LIMIT_EXCEEDED',
      severity: 'medium',
      details: { resource, limit }
    });
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    logFailedAttempt,
    logSuspiciousActivity,
    logRateLimitHit
  };
};