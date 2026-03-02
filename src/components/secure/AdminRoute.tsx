import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminRouteProps {
  children: React.ReactNode;
}

// In-memory cache that cannot be manipulated from DevTools
const adminStatusCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checking, setChecking] = useState(true);
  const checkInProgressRef = useRef(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      // Prevent concurrent checks
      if (checkInProgressRef.current) {
        return;
      }

      // Check in-memory cache (secure - cannot be manipulated from DevTools)
      const cached = adminStatusCache.get(user.id);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        setIsAdmin(cached.isAdmin);
        setChecking(false);
        return;
      }

      checkInProgressRef.current = true;

      try {
        // Always verify server-side - this is the secure check
        const { data, error } = await supabase.rpc('is_admin_user', {
          _user_id: user.id,
        });

        if (error) throw error;

        const adminStatus = data || false;
        setIsAdmin(adminStatus);

        // Store in secure in-memory cache only
        adminStatusCache.set(user.id, {
          isAdmin: adminStatus,
          timestamp: now
        });
      } catch (error) {
        // On error, deny access (fail secure)
        setIsAdmin(false);
        // Clear cache on error
        adminStatusCache.delete(user.id);
      } finally {
        setChecking(false);
        checkInProgressRef.current = false;
      }
    };

    checkAdminStatus();
  }, [user?.id]);

  // Clear cache when user changes
  useEffect(() => {
    return () => {
      // Cleanup on unmount or user change
      if (user?.id) {
        // Don't clear immediately - let cache persist for navigation
      }
    };
  }, [user?.id]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Se verifică permisiunile...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
};
