import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Settings, Brain, FileText, Phone, CalendarDays,
  Network, MessageSquare, Smartphone, Zap,
  Mic, BarChart3, Users, FolderOpen, LogOut,
  ChevronDown, ChevronsUpDown, Leaf, Megaphone, Info, Plus, Shield, PieChart, GitFork, PhoneOutgoing,
  Sparkles, Rocket, Crown, Building2, Moon, Sun
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from './AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { SettingsDialog } from './settings/SettingsDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usdToCredits } from '@/utils/costCalculations';
import { PromoPopup } from './sidebar/PromoPopup';

// Plan configuration
const PLAN_CONFIG: Record<string, { name: string; icon: any; color: string }> = {
  free: { name: 'Free', icon: Sparkles, color: 'text-zinc-500' },
  pro: { name: 'Pro', icon: Rocket, color: 'text-blue-600' },
  business: { name: 'Business', icon: Crown, color: 'text-purple-600' },
  enterprise: { name: 'Enterprise', icon: Building2, color: 'text-amber-600' },
};

// Normalize plan name from database
const normalizePlan = (plan: string | null): string => {
  if (!plan) return 'free';
  const lowerPlan = plan.toLowerCase();
  if (lowerPlan === 'starter' || lowerPlan === 'free trial') return 'free';
  if (lowerPlan === 'professional') return 'pro';
  if (['free', 'pro', 'business', 'enterprise'].includes(lowerPlan)) return lowerPlan;
  return 'free';
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [balanceData, setBalanceData] = useState<{
    balance_usd: number;
    monthly_free_credits: number;
    monthly_credits_used: number;
  }>({ balance_usd: 0, monthly_free_credits: 10000, monthly_credits_used: 0 });
  const [userPlan, setUserPlan] = useState<string | null>(null); // null = loading
  const [planLoaded, setPlanLoaded] = useState(false);

  // Fetch user balance and plan from database - PARALLELIZED for performance
  useEffect(() => {
    let isMounted = true;
    let debounceTimer: NodeJS.Timeout | null = null;

    const fetchBalanceAndPlan = async () => {
      if (!user?.id) return;

      // Fetch balance AND plan in PARALLEL (50% faster)
      const [balanceResult, profileResult] = await Promise.all([
        supabase
          .from('user_balance')
          .select('balance_usd, monthly_free_credits, monthly_credits_used')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .maybeSingle()
      ]);

      if (!isMounted) return;

      if (!balanceResult.error && balanceResult.data) {
        setBalanceData({
          balance_usd: balanceResult.data.balance_usd || 0,
          monthly_free_credits: balanceResult.data.monthly_free_credits || 10000,
          monthly_credits_used: balanceResult.data.monthly_credits_used || 0,
        });
      }

      if (!profileResult.error && profileResult.data) {
        setUserPlan(normalizePlan(profileResult.data.plan));
      } else {
        setUserPlan('free'); // Default if no profile found
      }
      setPlanLoaded(true);
    };

    // Debounced fetch for realtime updates
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchBalanceAndPlan, 300);
    };

    fetchBalanceAndPlan();

    // Subscribe to balance changes
    const balanceChannel = supabase
      .channel('user-balance-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_balance',
        filter: `user_id=eq.${user?.id}`
      }, debouncedFetch)
      .subscribe();

    // Subscribe to profile changes (for plan updates)
    const profileChannel = supabase
      .channel('user-profile-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user?.id}`
      }, debouncedFetch)
      .subscribe();

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  // Calculate remaining free credits
  const remainingFreeCredits = balanceData.monthly_free_credits - balanceData.monthly_credits_used;
  const paidCredits = usdToCredits(balanceData.balance_usd);

  // Check if user is the specific admin user
  const isSpecificAdmin = user?.id === 'a698e3c2-f0e6-4f42-8955-971d91e725ce' &&
    user?.email === 'mariusvirlan109@gmail.com';

  // Get Google avatar if user signed in with Google
  const googleAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.photo_url;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleSignOut = async () => {
    // signOut() from AuthContext handles everything including redirect
    // Don't add duplicate redirects or toasts here
    console.log('[SIDEBAR] Sign out initiated');
    await signOut();
    // AuthContext.signOut() will handle redirect to /auth
  };

  // Menu Item Component with collapse support
  const MenuItem = ({
    to,
    icon: Icon,
    label,
    hasAddButton,
    onAdd
  }: {
    to: string;
    icon: React.ElementType;
    label: string;
    hasAddButton?: boolean;
    onAdd?: () => void;
  }) => {
    const active = isActive(to);

    const linkContent = (
      <Link
        to={to}
        data-nav-path={to}
        className={`flex items-center justify-between rounded-md transition-all group ${isCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-1.5'
          } ${active
            ? isCollapsed
              ? 'bg-zinc-700 text-white'
              : 'bg-white text-zinc-900 shadow-sm'
            : isCollapsed
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/60'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
          }`}
      >
        <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
          <Icon className={`w-4 h-4 stroke-[1.5] shrink-0 ${isCollapsed ? 'text-white' : ''}`} />
          {!isCollapsed && <span className="text-[13px] font-medium">{label}</span>}
        </div>
        {hasAddButton && !isCollapsed && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdd?.();
            }}
            className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-500 hover:text-zinc-700 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </div>
        )}
      </Link>
    );

    // Show tooltip when collapsed
    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-900 text-white border-0">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  // Section Label Component
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className={`text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 transition-opacity ${isCollapsed ? 'opacity-0 h-0 mb-0 overflow-hidden' : 'px-5'
      }`}>
      {children}
    </p>
  );

  return (
    <>
      <Sidebar collapsible="icon" className={`transition-all duration-200 ${isMobile ? 'w-72' : isCollapsed ? 'w-[52px]' : 'w-64'} ${isCollapsed ? 'border-r border-zinc-700' : 'border-r border-zinc-200'}`} style={{ backgroundColor: isCollapsed ? '#1f1f1f' : '#f5f5f4' }}>
        {/* Header - same background, no border */}
        <SidebarHeader className={`py-4 transition-all ${isCollapsed ? 'px-2' : 'px-4'}`} style={{ backgroundColor: isCollapsed ? '#1f1f1f' : '#f5f5f4' }}>
          <div className="flex items-center justify-between">
            <Link to="/account" className={`flex items-center text-zinc-900 hover:text-black transition-colors ${isCollapsed ? '' : 'gap-3'}`}>
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src="/lovable-uploads/kalina-logo.png" loading="eager" />
                <AvatarFallback className="bg-zinc-200 text-zinc-700 text-xs">KA</AvatarFallback>
              </Avatar>
              {!isCollapsed && <span className="text-[15px] font-semibold text-zinc-900">Agent Automation</span>}
            </Link>
          </div>
        </SidebarHeader>

        {/* Content */}
        <SidebarContent className="py-4 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ backgroundColor: isCollapsed ? '#1f1f1f' : '#f5f5f4' }}>
          {/* Home & AI Chat */}
          <div className="px-2 mb-6 space-y-0.5">
            <MenuItem to="/" icon={Home} label={t('sidebar.home')} />
            <MenuItem to="/chat" icon={MessageSquare} label={t('sidebar.chatAI')} />
          </div>

          {/* Configure */}
          <div className="mb-5">
            <SectionLabel>Configure</SectionLabel>
            <div className="px-2 space-y-0.5">
              <MenuItem
                to="/account/kalina-agents"
                icon={Brain}
                label={t('sidebar.agents')}
                hasAddButton
                onAdd={() => navigate('/account/agent-consultant')}
              />
              <MenuItem to="/account/workflow" icon={GitFork} label={t('sidebar.workflow')} />
              <MenuItem
                to="/account/voices"
                icon={Mic}
                label={t('sidebar.voices')}
                hasAddButton
                onAdd={() => navigate('/account/voices?new=true')}
              />
            </div>
          </div>

          {/* Evaluate */}
          <div className="mb-5">
            <SectionLabel>{t('sidebar.evaluate')}</SectionLabel>
            <div className="px-2 space-y-0.5">
              <MenuItem to="/account/conversation-analytics" icon={BarChart3} label={t('sidebar.callHistory')} />
              <MenuItem to="/account/transcript" icon={FileText} label={t('sidebar.transcripts')} />
              <MenuItem to="/account/agent-analytic" icon={PieChart} label={t('sidebar.agentAnalytic')} />
              <MenuItem to="/account/leads" icon={Users} label={t('sidebar.leads')} />
              <MenuItem to="/account/files" icon={FolderOpen} label={t('sidebar.files')} />
            </div>
          </div>

          {/* Integrations */}
          <div className="mb-5">
            <SectionLabel>{t('sidebar.integrations')}</SectionLabel>
            <div className="px-2 space-y-0.5">
              <MenuItem to="/account/integrations" icon={Zap} label={t('sidebar.integrationsMenu')} />
              <MenuItem to="/account/chat-widget" icon={MessageSquare} label="Chat Widget" />
              <MenuItem to="/account/calendar" icon={CalendarDays} label={t('sidebar.calendar')} />
            </div>
          </div>

          {/* Telephony */}
          <div className="mb-5">
            <SectionLabel>{t('sidebar.telephony')}</SectionLabel>
            <div className="px-2 space-y-0.5">
              <MenuItem to="/account/phone-numbers" icon={Smartphone} label={t('sidebar.phoneNumbers')} />
              <MenuItem to="/account/outbound" icon={PhoneOutgoing} label={t('sidebar.outboundCalls')} />
            </div>
          </div>
        </SidebarContent>

        {/* Footer - same background, no border */}
        <SidebarFooter className={`transition-all ${isCollapsed ? 'p-2' : 'p-4'}`} style={{ backgroundColor: isCollapsed ? '#1f1f1f' : '#f5f5f4' }}>
          {user && (
            <div className="flex flex-col gap-3">
              {/* Promo Popup - visible only when expanded */}
              {!isCollapsed && <PromoPopup />}


              {/* Plan Box - hidden when collapsed */}
              {!isCollapsed && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-200/60 transition group w-full">
                      {(() => {
                        // Show loading state while plan is being fetched
                        if (!planLoaded || userPlan === null) {
                          return (
                            <>
                              <div className="w-4 h-4 rounded-full bg-zinc-300 animate-pulse" />
                              <span className="text-sm font-medium text-zinc-400">...</span>
                            </>
                          );
                        }
                        const planConfig = PLAN_CONFIG[userPlan] || PLAN_CONFIG.free;
                        const PlanIcon = planConfig.icon;
                        return (
                          <>
                            <PlanIcon className={`w-4 h-4 ${planConfig.color}`} />
                            <span className={`text-sm font-medium ${planConfig.color}`}>{planConfig.name}</span>
                          </>
                        );
                      })()}
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-auto" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-56 bg-white border border-zinc-200 rounded-xl shadow-lg p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-300"></div>
                        <span className="text-sm font-semibold text-zinc-900">Balance</span>
                      </div>
                      <Link to="/pricing" className="px-3 py-1 text-xs font-medium text-white bg-zinc-800 rounded-md hover:bg-zinc-700 transition">
                        Upgrade
                      </Link>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Total</span>
                        <span className="text-zinc-900 font-medium">{balanceData.monthly_free_credits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Remaining</span>
                        <span className="text-zinc-900 font-medium">{remainingFreeCredits.toLocaleString()}</span>
                      </div>
                      {paidCredits > 0 && (
                        <div className="flex justify-between pt-2 border-t border-zinc-100">
                          <span className="text-zinc-500">Paid credits</span>
                          <span className="text-zinc-900 font-medium">{paidCredits.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* User Profile Box */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`rounded-xl flex items-center cursor-pointer transition shadow-sm ${isCollapsed
                    ? 'p-1.5 justify-center bg-zinc-700 border border-zinc-600 hover:bg-zinc-600'
                    : 'p-2 justify-between w-full bg-white border border-zinc-200 hover:bg-zinc-50'
                    }`}>
                    <div className={`flex items-center overflow-hidden ${isCollapsed ? '' : 'gap-3'}`}>
                      <Avatar className={`shrink-0 ${isCollapsed ? 'w-7 h-7' : 'w-8 h-8'}`}>
                        {googleAvatarUrl && (
                          <AvatarImage src={googleAvatarUrl} alt={userName} />
                        )}
                        <AvatarFallback className="bg-zinc-200 text-zinc-700 text-sm font-medium">
                          {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {!isCollapsed && (
                        <span className="text-sm font-medium text-zinc-700 truncate max-w-[120px]">
                          {user.email?.split('@')[0]}...
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="pr-1">
                        <ChevronsUpDown className="w-4 h-4 text-zinc-400" />
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-56 bg-white border border-zinc-200 rounded-lg shadow-lg p-1">
                  {/* Settings Section */}
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer px-2.5 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 rounded-md">
                    <Settings className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    {t('sidebar.settings')}
                  </DropdownMenuItem>

                  {isSpecificAdmin && (
                    <DropdownMenuItem
                      onClick={() => navigate('/admin')}
                      className="flex items-center gap-2 cursor-pointer px-2.5 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 rounded-md"
                    >
                      <Shield className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{t('sidebar.adminPanel')}</span>
                    </DropdownMenuItem>
                  )}

                  <div className="my-1 border-t border-zinc-100" />

                  {/* Sign out */}
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer px-2.5 py-2 text-[13px] text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 rounded-md">
                    <LogOut className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{t('auth.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Help & Updates Buttons - hidden when collapsed */}
              {!isCollapsed && (
                <div className="flex items-center pt-2 px-2">
                  <Link
                    to="/help"
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 transition flex-1 justify-center border-r border-zinc-200"
                  >
                    <Info className="w-4 h-4" />
                    <span className="text-[13px] font-medium">{t('sidebar.help')}</span>
                  </Link>

                  <button
                    onClick={() => toast.info('În curând', { description: 'Pagina cu noutăți va fi disponibilă în curând.' })}
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 transition flex-1 justify-center"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span className="text-[13px] font-medium">Updates</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
