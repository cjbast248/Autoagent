
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { useTranslation } from "react-i18next";
import { AdminRoute } from "./components/secure/AdminRoute";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BackgroundColorProvider } from "./contexts/BackgroundColorContext";
import { ActiveCallsProvider } from "./contexts/ActiveCallsContext";
import { KalinaWelcomeAnimation } from "./components/KalinaWelcomeAnimation";
import OnboardingQuizModal from "./components/OnboardingQuizModal";
import DashboardLayout from "@/components/DashboardLayout";


import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import OnboardingQuiz from "./pages/OnboardingQuiz";
import OnboardingSuccess from "./pages/OnboardingSuccess";
import EmailVerificationPending from "./pages/EmailVerificationPending";
import PhoneVerificationPending from "./pages/PhoneVerificationPending";
import GoogleOAuthCallback from "./pages/GoogleOAuthCallback";
import MainChat from "./pages/MainChat";
import Dashboard from "./pages/Dashboard";
import RetellDashboard from "./pages/RetellDashboard";
import NotFound from "./pages/NotFound";
import AccountSettings from "./pages/AccountSettings";

// Lazy-load heavy pages that pull voice/11labs deps
const KalinaAgents = React.lazy(() => import("./pages/KalinaAgents"));
const AgentEdit = React.lazy(() => import("./pages/AgentEdit"));
const Workflow = React.lazy(() => import("./pages/Workflow"));
const WorkflowList = React.lazy(() => import("./pages/WorkflowList"));
const Voices = React.lazy(() => import("./pages/Voices"));
const VoiceClone = React.lazy(() => import("./pages/VoiceClone"));

import Transcript from "./pages/Transcript";
// Lazy-load heavy pages for better performance
const Outbound = React.lazy(() => import("./pages/Outbound"));
import Calendar from "./pages/Calendar";
// Lazy-load heavy analytics page
const ConversationAnalytics = React.lazy(() => import("./pages/ConversationAnalytics"));
const GoogleSheetsIntegration = React.lazy(() => import("./pages/GoogleSheetsIntegration"));
const ZohoIntegration = React.lazy(() => import("./pages/ZohoIntegration"));
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { GlobalAudioPlayerProvider } from "@/components/audio/GlobalAudioPlayerContext";
import { GlobalAudioPlayerBar } from "@/components/audio/GlobalAudioPlayerBar";
import AgentConsultant from "./pages/AgentConsultant";
import Gmail from "./pages/Gmail";
import AgentAnalytic from "./pages/AgentAnalytic";

// import Documentation from "./pages/Documentation";
import PhoneNumbers from "./pages/PhoneNumbers";
import ImportPhoneNumber from "./pages/ImportPhoneNumber";
import TestCall from "./pages/TestCall";
import ConversationDetail from "./pages/ConversationDetail";
// import VoiceDemo from "./pages/VoiceDemo";
// import CallbackScheduler from "./pages/CallbackScheduler";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
const MigrateSipCredentials = React.lazy(() => import("./pages/admin/MigrateSipCredentials"));
import Contacts from "./pages/Contacts";
import Data from "./pages/Data";
import CompanyDetail from "./pages/CompanyDetail";
import Leads from "./pages/Leads";
import Integrations from "./pages/Integrations";
import ChatWidgetSettings from "./pages/ChatWidgetSettings";
import ChatWidgetDocs from "./pages/ChatWidgetDocs";
import WidgetChatPage from "./pages/WidgetChatPage";
import ContactFiles from "./pages/ContactFiles";
import ContactFileDetail from "./pages/ContactFileDetail";
import ConfirmAccountDeletion from "./pages/ConfirmAccountDeletion";
import Webhooks from "./pages/Webhooks";
import Help from "./pages/Help";
import PhoneNumberDetail from "./pages/PhoneNumberDetail";

// Optimize React Query for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce background refetches
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Reduce network requests
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

function AppWithWelcome() {
  const { showWelcome, setShowWelcome } = useAuth();
  const { t } = useTranslation();

  // Check for ?welcome=true in URL for testing animation
  const [forceWelcome, setForceWelcome] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('welcome') === 'true';
  });

  const shouldShowWelcome = showWelcome || forceWelcome;

  return (
    <>
      {shouldShowWelcome && (
        <KalinaWelcomeAnimation
          onComplete={() => {
            setShowWelcome(false);
            setForceWelcome(false);
            // Remove ?welcome=true from URL
            if (forceWelcome) {
              const url = new URL(window.location.href);
              url.searchParams.delete('welcome');
              window.history.replaceState({}, '', url.pathname);
            }
          }}
        />
      )}

      {/* Mandatory onboarding quiz modal - appears after 30 seconds if not completed */}
      <OnboardingQuizModal />

      <React.Suspense
        fallback={
          <DashboardLayout>
            <div className="min-h-[400px] w-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground animate-pulse">{t("common.loading")}</p>
              </div>
            </div>
          </DashboardLayout>
        }
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route path="/event" element={<Navigate to="/" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/login" element={<Navigate to="/auth?mode=login" replace />} />
          <Route path="/auth/signup" element={<Navigate to="/auth?mode=signup" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding-quiz" element={<OnboardingQuiz />} />
          <Route path="/onboarding-success" element={<OnboardingSuccess />} />
          <Route path="/email-verification-pending" element={<EmailVerificationPending />} />
          <Route path="/phone-verification-pending" element={<PhoneVerificationPending />} />
          <Route path="/google-oauth-callback" element={<GoogleOAuthCallback />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/admin/migrate-sip" element={<AdminRoute><MigrateSipCredentials /></AdminRoute>} />

          {/* Account routes */}
          <Route path="/account" element={<Dashboard />} />
          <Route path="/chat" element={<MainChat />} />
          <Route path="/chat/:widgetId" element={<WidgetChatPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/retell-dashboard" element={<RetellDashboard />} />
          <Route path="/account/kalina-agents" element={<KalinaAgents />} />
          <Route path="/account/agent-edit/:agentId" element={<AgentEdit />} />
          <Route path="/account/workflow" element={<WorkflowList />} />
          <Route path="/account/workflow/:projectId" element={<Workflow />} />
          <Route path="/account/voices" element={<Voices />} />
          <Route path="/account/voice-clone" element={<VoiceClone />} />
          <Route path="/account/conversation-analytics" element={<ConversationAnalytics />} />
          <Route path="/account/conversation/:conversationId" element={<ConversationDetail />} />
          <Route path="/account/transcript" element={<Transcript />} />
          <Route path="/account/agent-analytic" element={<AgentAnalytic />} />
          <Route path="/account/outbound" element={<Outbound />} />
          <Route path="/account/contacts" element={<Contacts />} />
          <Route path="/account/leads" element={<Leads />} />
          <Route path="/account/files" element={<ContactFiles />} />
          <Route path="/account/files/:fileId" element={<ContactFileDetail />} />
          <Route path="/account/data" element={<Data />} />
          <Route path="/account/data/company/:companyId" element={<CompanyDetail />} />
          <Route path="/account/phone-numbers" element={<PhoneNumbers />} />
          <Route path="/account/phone-numbers/import" element={<ImportPhoneNumber />} />
          <Route path="/account/phone-numbers/:phoneId" element={<PhoneNumberDetail />} />
          <Route path="/account/test-call" element={<TestCall />} />

          <Route path="/account/webhooks" element={<Webhooks />} />
          <Route path="/account/integrations" element={<Integrations />} />
          <Route path="/account/integrations/google-sheets" element={<GoogleSheetsIntegration />} />
          <Route path="/account/integrations/zoho" element={<ZohoIntegration />} />
          <Route path="/account/chat-widget" element={<ChatWidgetSettings />} />
          <Route path="/account/chat-widget/docs" element={<ChatWidgetDocs />} />
          <Route path="/account/calendar" element={<Calendar />} />
          {/* Chat AI page removed */}
          {/* <Route path="/account/gmail" element={<Gmail />} /> */}
          <Route path="/account/agent-consultant" element={<AgentConsultant />} />
          {/* <Route path="/account/callback-scheduler" element={<CallbackScheduler />} /> */}
          {/* <Route path="/account/documentation" element={<Documentation />} /> */}
          {/* <Route path="/account/voice-demo" element={<VoiceDemo />} /> */}
          <Route path="/account/settings" element={<AccountSettings />} />
          <Route path="/account/*" element={<Navigate to="/account" replace />} />
          <Route path="/help" element={<Help />} />
          <Route path="/confirm-account-deletion" element={<ConfirmAccountDeletion />} />

          {/* Catch-all for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </React.Suspense>
    </>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <BackgroundColorProvider>
              <QueryClientProvider client={queryClient}>
                <ActiveCallsProvider>
                  <GlobalAudioPlayerProvider>
                    <AppWithWelcome />
                    <GlobalAudioPlayerBar />
                    <Toaster />
                  </GlobalAudioPlayerProvider>
                </ActiveCallsProvider>
              </QueryClientProvider>
            </BackgroundColorProvider>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
