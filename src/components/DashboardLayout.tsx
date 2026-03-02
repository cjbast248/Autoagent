import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { BlockedUserOverlay } from './BlockedUserOverlay';
import PlatformChatWidget from './PlatformChatWidget';
const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [userBlocked, setUserBlocked] = useState(false);
  const isMobile = useIsMobile();
  const {
    user,
    signOut
  } = useAuth();
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const isChatPage = pathname.toLowerCase().includes('chat');
  // Only use workflow layout for the editor (with projectId), not the list page
  const isWorkflowEditorPage = /\/account\/workflow\/[^/]+/.test(pathname);
  // Check if we're on any workflow page (list or editor)
  const isWorkflowPage = pathname.startsWith('/account/workflow');
  // Sidebar should be collapsed only on workflow editor (with projectId)
  const [sidebarOpen, setSidebarOpen] = useState(!isWorkflowEditorPage);

  // Clean up any stuck overlays when route changes
  useEffect(() => {
    // Immediately close any open dialogs/sheets by pressing Escape
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(escapeEvent);

    // Small delay to let animations complete, then clean up orphaned overlays
    const timeout = setTimeout(() => {
      // Find and remove any orphaned Radix overlays that might be blocking
      const overlays = document.querySelectorAll('[data-radix-portal]');
      overlays.forEach((overlay) => {
        // Check if the overlay's content is actually visible
        const content = overlay.querySelector('[data-state]');
        const state = content?.getAttribute('data-state');
        // Remove if closed or if it's an orphaned overlay
        if (!content || state === 'closed') {
          overlay.remove();
        }
      });

      // Also remove any backdrop/overlay elements that might be stuck
      const backdrops = document.querySelectorAll('.fixed.inset-0.z-50');
      backdrops.forEach((backdrop) => {
        // Check if this is not part of an active component
        const parent = backdrop.closest('[data-radix-portal]');
        if (!parent) {
          backdrop.remove();
        }
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [pathname]);

  // Auto-collapse sidebar only on workflow editor (with projectId), expand on other pages
  useEffect(() => {
    if (isWorkflowEditorPage) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isWorkflowEditorPage]);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return;
      try {
        // Add 5s timeout to prevent hanging
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 5000)
        );
        const queryPromise = supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .maybeSingle(); // Use maybeSingle to avoid errors on missing profile

        const result = await Promise.race([queryPromise, timeoutPromise]);
        const profile = result && 'data' in result ? result.data : null;

        if (profile) {
          setUserBlocked(profile.account_type === 'banned');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    checkUserStatus();

    // Set up real-time subscription to listen for changes
    const subscription = supabase.channel('profile_changes').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${user?.id}`
    }, payload => {
      if (payload.new.account_type === 'banned') {
        setUserBlocked(true);
      } else {
        setUserBlocked(false);
      }
    }).subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  // For Workflow page - full screen with permanent sidebar
  const sidebarWidth = isMobile ? "18rem" : "16rem"; // corespunde w-72 / w-64
  const [sidebarHidden, setSidebarHidden] = useState(false);

  // Listen for workflow-config-open class on html element
  useEffect(() => {
    if (!isWorkflowEditorPage) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const hasConfigOpen = document.documentElement.classList.contains('workflow-config-open');
          setSidebarHidden(hasConfigOpen);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [isWorkflowEditorPage]);

  if (isWorkflowEditorPage) {
    return (
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div
          className="min-h-screen w-full bg-[#1a1a1a] overflow-hidden flex relative"
          style={{ ["--sidebar-width" as any]: sidebarHidden ? "0px" : (sidebarOpen ? sidebarWidth : "52px") }}
        >
          <BlockedUserOverlay isBlocked={userBlocked} />

          <div
            className={`relative z-40 transition-all duration-300 ${sidebarHidden ? 'opacity-0 pointer-events-none -translate-x-full' : 'opacity-100'}`}
            style={{ width: sidebarHidden ? 0 : undefined }}
          >
            <AppSidebar />
          </div>

          <div
            className="flex-1 min-w-0 transition-all duration-300"
            style={{ marginLeft: sidebarHidden ? 0 : "var(--sidebar-width)" }}
          >
            {children}
          </div>

          {/* Platform Chat Widget */}
          <PlatformChatWidget />
        </div>
      </SidebarProvider>
    );
  }

  return <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
    <div className="min-h-screen flex w-full mobile-safe-area bg-white">
      <BlockedUserOverlay isBlocked={userBlocked} />

      <AppSidebar />

      <div className="flex-1 flex flex-col" style={{ paddingTop: userBlocked ? '80px' : '0' }}>

        {/* Mobile Header with Sidebar Trigger */}
        {isMobile && (
          <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-100/50 backdrop-blur-sm lg:hidden">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">Agent Automation</span>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={`flex-1 min-h-0 bg-white ${isChatPage ? 'overflow-hidden' : 'overflow-auto'}`}>
          {/* allow pages to use full width - no padding wrapper */}
          <div className={`w-full bg-white ${isMobile && !isChatPage ? 'min-h-[calc(100vh-4rem)]' : 'h-full'}`}>
            {children}
          </div>
        </main>

      </div>

      {/* Platform Chat Widget */}
      <PlatformChatWidget />
    </div>
  </SidebarProvider>;
};
export default DashboardLayout;