import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Webhook,
  Zap,
  Globe,
  ArrowRightLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'synced' | 'active' | 'available' | 'coming-soon';
  lastSync?: string;
  comingSoonDate?: string;
  url?: string;
  iconType: 'image' | 'text' | 'lucide';
  iconSrc?: string;
  iconText?: string;
  iconLucide?: 'webhook' | 'zap';
}

// Integration images/icons config
const integrationImages: Record<string, string> = {
  'calendar': 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg',
  'google-sheets': 'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg',
  'zoho-crm': 'https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/images%20(1).jpeg',
};

const Integrations = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({
    'calendar': true,
    'webhooks': true,
  });

  const handleToggle = (id: string) => {
    setToggleStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleIntegrationClick = (integration: Integration) => {
    if (integration.status === 'coming-soon') return;
    setSelectedIntegration(integration);
    setIsModalOpen(true);
  };

  const handleConnect = () => {
    if (selectedIntegration?.url) {
      setIsModalOpen(false);
      navigate(selectedIntegration.url);
    }
  };

  // Active Pipelines (enabled integrations)
  const activePipelines: Integration[] = [
    {
      id: 'calendar',
      name: 'Google Calendar',
      description: 'Scheduling & Events',
      status: 'synced',
      lastSync: '2m ago',
      url: '/account/calendar',
      iconType: 'image',
      iconSrc: integrationImages['calendar'],
    },
    {
      id: 'webhooks',
      name: 'Webhooks',
      description: 'Receive & send raw data',
      status: 'active',
      url: '/account/webhooks',
      iconType: 'lucide',
      iconLucide: 'webhook',
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description: 'Data Sync & Export',
      status: 'available',
      url: '/account/integrations/google-sheets',
      iconType: 'image',
      iconSrc: integrationImages['google-sheets'],
    },
    {
      id: 'zoho-crm',
      name: 'Zoho CRM',
      description: 'Leads management',
      status: 'available',
      url: '/account/integrations/zoho',
      iconType: 'text',
      iconText: 'ZOHO',
    },
  ];

  // Upcoming Connectors
  const upcomingConnectors: Integration[] = [
    {
      id: 'pipedrive',
      name: 'Pipedrive',
      description: 'CRM Integration',
      status: 'coming-soon',
      comingSoonDate: 'Q2 2026',
      iconType: 'text',
      iconText: 'PD',
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect 5000+ apps',
      status: 'coming-soon',
      comingSoonDate: 'PLANNED',
      iconType: 'lucide',
      iconLucide: 'zap',
    },
  ];

  // Dotted background pattern
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px',
  };

  const renderIcon = (integration: Integration, isComingSoon: boolean = false) => {
    const baseClasses = `w-7 h-7 ${isComingSoon ? 'text-zinc-400' : 'text-zinc-800'}`;

    if (integration.iconType === 'image' && integration.iconSrc) {
      return (
        <img
          src={integration.iconSrc}
          alt={integration.name}
          className="w-7 h-7 object-contain"
        />
      );
    }

    if (integration.iconType === 'text' && integration.iconText) {
      return (
        <span className={`text-xs font-bold ${isComingSoon ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {integration.iconText}
        </span>
      );
    }

    if (integration.iconType === 'lucide') {
      if (integration.iconLucide === 'webhook') {
        return <Webhook className={baseClasses} />;
      }
      if (integration.iconLucide === 'zap') {
        return <Zap className={baseClasses} />;
      }
    }

    return null;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-10 pb-32" style={dotPatternStyle}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="flex items-start justify-between mb-12">
            <div>
              <h1 className="text-3xl font-bold text-black tracking-tight mb-2">Integrations</h1>
              <p className="text-sm text-zinc-500">Connect your favorite apps and data sources.</p>
            </div>

            <div className="flex items-center gap-6">
              <a href="#" className="text-xs font-semibold text-zinc-500 hover:text-black transition">
                Documentation
              </a>
              <a href="#" className="text-xs font-semibold text-zinc-500 hover:text-black transition">
                API Keys
              </a>
            </div>
          </header>

          {/* Active Pipelines Section */}
          <section className="mb-12">
            <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">
              Active Pipelines
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activePipelines.map((integration) => {
                const isSynced = integration.status === 'synced';
                const isActive = integration.status === 'active';
                const isAvailable = integration.status === 'available';
                const isToggled = toggleStates[integration.id];

                return (
                  <div
                    key={integration.id}
                    className="group bg-white border border-zinc-200 rounded-2xl p-6 flex items-center justify-between cursor-pointer transition-all hover:border-zinc-400 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
                    onClick={() => !isAvailable && integration.url && navigate(integration.url)}
                  >
                    <div className="flex items-center">
                      <div className="w-[52px] h-[52px] rounded-[14px] bg-white border border-zinc-200 flex items-center justify-center mr-4 shadow-sm">
                        {renderIcon(integration)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-black">{integration.name}</h3>
                          {(isSynced || isActive) && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                              <span className={`w-1.5 h-1.5 rounded-full bg-green-600 ${isSynced ? 'animate-pulse' : ''}`}></span>
                              {isSynced ? 'SYNCED' : 'ACTIVE'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{integration.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {(isSynced || isActive) && (
                        <>
                          <button
                            onClick={() => handleToggle(integration.id)}
                            className={`w-11 h-6 rounded-full relative transition-colors ${
                              isToggled ? 'bg-black' : 'bg-zinc-200'
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                isToggled ? 'left-[22px]' : 'left-0.5'
                              }`}
                            />
                          </button>
                          {isSynced && integration.lastSync && (
                            <span className="text-[9px] text-zinc-400 font-mono">
                              Last: {integration.lastSync}
                            </span>
                          )}
                        </>
                      )}
                      {isAvailable && (
                        <button
                          data-integration={integration.id}
                          data-action="connect"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIntegrationClick(integration);
                          }}
                          className="px-4 py-2 rounded-[10px] border border-zinc-200 bg-white text-xs font-semibold text-black hover:border-black hover:bg-black hover:text-white transition"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upcoming Connectors Section */}
          <section className="mb-12">
            <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">
              Upcoming Connectors
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingConnectors.map((integration) => (
                <div
                  key={integration.id}
                  className="relative bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-6 flex items-center justify-between cursor-not-allowed overflow-hidden"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.015) 10px, rgba(0,0,0,0.015) 20px)',
                  }}
                >
                  <div className="flex items-center opacity-50">
                    <div className="w-[52px] h-[52px] rounded-[14px] bg-transparent border border-dashed border-zinc-300 flex items-center justify-center mr-4">
                      {renderIcon(integration, true)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-500 mb-1">{integration.name}</h3>
                      <p className="text-xs text-zinc-400">{integration.description}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md uppercase">
                    {integration.comingSoonDate}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Custom Integration Banner */}
          <section className="relative overflow-hidden rounded-3xl bg-black p-10 flex items-center justify-between shadow-2xl">
            {/* Banner decoration */}
            <div
              className="absolute right-0 top-0 bottom-0 w-[300px]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05))',
                maskImage: 'radial-gradient(circle at center, black, transparent)',
              }}
            />

            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white mb-2">Need a custom integration?</h3>
              <p className="text-sm text-zinc-400 max-w-md">
                Our engineering team can build dedicated connectors for your enterprise infrastructure.
              </p>
            </div>

            <div className="flex items-center gap-6 relative z-10">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-white text-xs font-bold">
                  K
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-black flex items-center justify-center text-zinc-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-white">
                  <Globe className="w-4 h-4" />
                </div>
              </div>

              <button
                onClick={() => window.location.href = 'mailto:support@agentauto.app?subject=Custom Integration Request'}
                className="bg-white text-black px-6 py-3 rounded-xl text-xs font-bold hover:bg-zinc-200 transition"
              >
                Contact Support
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Integration Connection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent hideCloseButton className="bg-white w-full max-w-[420px] p-0 rounded-2xl shadow-2xl border-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white border border-zinc-100 flex items-center justify-center p-2 shadow-sm">
                {selectedIntegration && renderIcon(selectedIntegration)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  Connect {selectedIntegration?.name}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Link your account
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-zinc-400 hover:text-black transition p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-sm text-zinc-500 leading-relaxed">
              We'll connect you to {selectedIntegration?.name}. A pop-up will open, please make sure your browser doesn't block pop-ups.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-black transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              className="px-6 py-2.5 rounded-lg text-xs font-bold bg-black text-white hover:bg-zinc-800 shadow-sm transition active:scale-95"
            >
              Connect
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Integrations;
