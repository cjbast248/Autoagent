import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Plus, Settings2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import type { Database } from '@/integrations/supabase/types';
import { decryptSipConfig } from '@/utils/encryption';
import { ENV } from '@/config/environment';

type PhoneNumber = Database['public']['Tables']['phone_numbers']['Row'];

const PhoneNumberDetail: React.FC = () => {
  const { phoneId } = useParams<{ phoneId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phone, setPhone] = useState<PhoneNumber | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [decryptedSipConfig, setDecryptedSipConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (phoneId) {
      loadPhoneNumber();
    }
  }, [phoneId]);

  useEffect(() => {
    if (user) {
      loadAllPhoneNumbers();
    }
  }, [user]);

  const loadPhoneNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('id', phoneId)
        .single();

      if (error) throw error;
      setPhone(data);

      if (data?.sip_config) {
        try {
          const decrypted = await decryptSipConfig(data.sip_config);
          setDecryptedSipConfig(decrypted);
        } catch (decryptError) {
          console.error('Error decrypting SIP config:', decryptError);
          setDecryptedSipConfig(data.sip_config);
        }
      }
    } catch (error: any) {
      console.error('Error loading phone number:', error);
      toast({
        title: 'Error',
        description: 'Failed to load phone number details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllPhoneNumbers = async () => {
    if (!user) return;

    try {
      let accessToken: string | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed?.access_token) {
                accessToken = parsed.access_token;
                break;
              }
            }
          } catch (e) {
            // Continue
          }
        }
      }

      if (!accessToken) return;

      const url = `${ENV.SUPABASE_URL}/rest/v1/phone_numbers?order=created_at.desc`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data || []);
      }
    } catch (error) {
      console.error('Error loading phone numbers:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  const sipConfig = decryptedSipConfig || phone?.sip_config as any;
  const inboundConfig = sipConfig?.inbound_trunk_config || {};
  const outboundConfig = sipConfig?.outbound_trunk_config || {};

  const isTwilio = phone?.provider_type === 'twilio';

  // Format phone number to show last digits
  const formatLastDigits = (phoneNumber: string) => {
    const digits = phoneNumber.replace(/\D/g, '');
    return '...' + digits.slice(-7).replace(/(\d{3})(\d{4})/, '$1 $2');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen bg-white">
          <div className="flex-1 px-16 py-12">
            <div className="max-w-4xl">
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-zinc-100 rounded w-1/2"></div>
                <div className="h-4 bg-zinc-100 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!phone) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen bg-white">
          <div className="flex-1 px-16 py-12">
            <div className="max-w-4xl text-center py-20">
              <h3 className="text-lg font-medium text-zinc-900 mb-2">Phone number not found</h3>
              <button
                onClick={() => navigate('/account/phone-numbers')}
                className="text-sm font-medium text-zinc-500 hover:text-black transition"
              >
                Back to Phone Numbers
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex min-h-screen bg-white overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 flex flex-col h-screen shrink-0 bg-white pt-10 pl-10 pr-4">
          <div className="mb-10">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Numbers</h2>
          </div>

          <div className="flex-1 space-y-6 overflow-auto">
            {phoneNumbers.map((p) => {
              const isActive = p.id === phoneId;
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/account/phone-numbers/${p.id}`)}
                  className={`nav-item cursor-pointer group relative ${
                    isActive ? 'text-black' : 'text-zinc-400 hover:text-black'
                  }`}
                  style={{
                    position: 'relative',
                  }}
                >
                  {/* Active indicator */}
                  <div
                    className={`absolute -left-6 top-1/2 -translate-y-1/2 w-[3px] bg-black transition-all duration-200 ${
                      isActive ? 'h-4' : 'h-0'
                    }`}
                  />
                  <p className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {p.label || 'Untitled'}
                  </p>
                  <p className={`text-[10px] font-mono mt-0.5 transition ${
                    isActive ? 'text-zinc-400' : 'text-zinc-300 group-hover:text-zinc-500'
                  }`}>
                    {formatLastDigits(p.phone_number)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="pb-10">
            <button
              onClick={() => navigate('/account/phone-numbers')}
              className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-black transition"
            >
              <Plus className="w-4 h-4" />
              Add Number
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-screen overflow-y-auto bg-white px-16 py-12">
          <div className="max-w-4xl">
            {/* Header */}
            <div className="flex justify-between items-start mb-16">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-5xl font-bold tracking-tight text-black">
                    {phone.phone_number}
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  {phone.status === 'active' && (
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                  <p className="text-sm text-zinc-500 font-medium">
                    {isTwilio ? 'Twilio' : 'SIP Trunk'} • {phone.status === 'active' ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              <button className="group w-10 h-10 rounded-full border border-zinc-200 hover:border-black flex items-center justify-center transition">
                <Settings2 className="w-4 h-4 text-zinc-400 group-hover:text-black transition" />
              </button>
            </div>

            {/* Inbound Configuration */}
            <div className="mb-16">
              <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Inbound Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                {/* SIP Server URI */}
                <div className="md:col-span-2 group cursor-pointer" onClick={() => copyToClipboard('sip:sip.rtc.elevenlabs.io:5061;transport=tls')}>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    SIP Server URI (TLS)
                  </label>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-mono text-zinc-800 break-all border-b border-transparent hover:border-zinc-200 transition pb-0.5">
                      sip:sip.rtc.elevenlabs.io:5061;transport=tls
                    </p>
                    <Copy className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform" />
                  </div>
                </div>

                {/* Media Encryption */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Media Encryption
                  </label>
                  <p className="text-sm font-medium text-black">
                    {inboundConfig.media_encryption || 'Allowed'}
                  </p>
                </div>

                {/* Whitelist */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Whitelist
                  </label>
                  <p className="text-sm font-medium text-black">
                    {inboundConfig.allowed_addresses?.length > 0
                      ? inboundConfig.allowed_addresses.join(', ')
                      : 'All addresses allowed'
                    }
                  </p>
                </div>

                {/* Divider */}
                <div className="md:col-span-2 my-2 h-px bg-gradient-to-r from-zinc-100 via-zinc-100 to-transparent" />

                {/* Authentication Username */}
                {inboundConfig.credentials?.username && (
                  <div className="md:col-span-2 group cursor-pointer" onClick={() => copyToClipboard(inboundConfig.credentials.username)}>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Authentication Username
                    </label>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-mono text-zinc-800">
                        {inboundConfig.credentials.username}
                      </p>
                      <Copy className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Outbound Configuration */}
            <div>
              <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Outbound Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                {/* Host Address */}
                <div className="group cursor-pointer" onClick={() => outboundConfig.address && copyToClipboard(outboundConfig.address)}>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Host Address
                  </label>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-mono text-zinc-800">
                      {outboundConfig.address || 'Not configured'}
                    </p>
                    {outboundConfig.address && (
                      <Copy className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform" />
                    )}
                  </div>
                </div>

                {/* Transport */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Transport
                  </label>
                  <p className="text-sm font-medium text-black">
                    {outboundConfig.transport?.toUpperCase() || 'TCP'}
                  </p>
                </div>

                {/* Divider */}
                <div className="md:col-span-2 my-2 h-px bg-gradient-to-r from-zinc-100 via-zinc-100 to-transparent" />

                {/* Outbound Username */}
                {outboundConfig.credentials?.username && (
                  <div className="md:col-span-2 group cursor-pointer" onClick={() => copyToClipboard(outboundConfig.credentials.username)}>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                      Outbound Username
                    </label>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-mono text-zinc-800">
                        {outboundConfig.credentials.username}
                      </p>
                      <Copy className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform" />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default PhoneNumberDetail;
