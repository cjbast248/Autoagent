import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Hash, Phone, MoreHorizontal, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { ENV } from '@/config/environment';
import DashboardLayout from '@/components/DashboardLayout';
import { PhoneTestCallModal } from '@/components/outbound/PhoneTestCallModal';
import { InboundAgentConfig } from '@/components/phone/InboundAgentConfig';
import type { Database } from '@/integrations/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePhoneSync } from '@/hooks/usePhoneSync';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PhoneNumber = Database['public']['Tables']['phone_numbers']['Row'];

// Fetch agent names from kalina_agents (the table used for phone number associations)
const useAgentNames = () => {
  const [agents, setAgents] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('kalina_agents')
        .select('id, name, agent_id');

      if (data) {
        const agentMap: Record<string, string> = {};
        data.forEach(agent => {
          // Map by agent_id (ElevenLabs ID) which is used in phone_numbers.connected_agent_id
          if (agent.agent_id) {
            agentMap[agent.agent_id] = agent.name;
          }
          // Also map by id for backwards compatibility
          agentMap[agent.id] = agent.name;
        });
        setAgents(agentMap);
      }
    };
    fetchAgents();
  }, []);

  return agents;
};

const PhoneNumbers: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { syncPhoneNumber, syncing } = usePhoneSync();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [testCallModal, setTestCallModal] = useState<{ open: boolean; phone?: PhoneNumber }>({ open: false });
  const [inboundConfigModal, setInboundConfigModal] = useState<{ open: boolean; phone?: PhoneNumber }>({ open: false });
  const agents = useAgentNames();

  const loadPhoneNumbers = async (signal?: AbortSignal) => {
    if (!user) return;

    console.log('PhoneNumbers: Loading for user:', user.id);

    try {
      // Get token from localStorage
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

      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Direct fetch to Supabase REST API - RLS handles access control
      const url = `${ENV.SUPABASE_URL}/rest/v1/phone_numbers?order=created_at.desc`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': ENV.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('PhoneNumbers: Got numbers:', data?.length, data);
      setPhoneNumbers(data || []);
    } catch (error: any) {
      // Ignore abort errors - these are expected when component unmounts or re-renders
      if (error.name === 'AbortError') return;

      console.error('Error loading phone numbers:', error);
      toast({
        title: t('phoneNumbers.error'),
        description: t('phoneNumbers.failedToLoad'),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    loadPhoneNumbers(controller.signal);

    return () => controller.abort();
  }, [user?.id]);

  const deletePhoneNumber = async (id: string) => {
    if (!user) return;

    try {
      // Use edge function to delete from ElevenLabs, Asterisk, and database
      const { data, error } = await supabase.functions.invoke('delete-phone-number', {
        body: {
          phone_id: id,
          user_id: user.id,
        },
      });

      if (error) throw error;

      if (!data.success) {
        // Partial failure - show warning with details
        console.warn('Partial delete:', data);
        toast({
          title: 'Atenție',
          description: `Numărul a fost șters parțial. Erori: ${data.results?.errors?.join(', ') || 'necunoscute'}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('phoneNumbers.success'),
          description: t('phoneNumbers.deletedSuccess'),
        });
      }

      loadPhoneNumbers();
    } catch (error: any) {
      console.error('Error deleting phone number:', error);
      toast({
        title: t('phoneNumbers.error'),
        description: t('phoneNumbers.failedToDelete'),
        variant: 'destructive',
      });
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return null;
    return agents[agentId] || null;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Phone number copied to clipboard',
    });
  };

  // Filter phone numbers based on search
  const filteredNumbers = phoneNumbers.filter(phone => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      phone.label?.toLowerCase().includes(query) ||
      phone.phone_number.toLowerCase().includes(query)
    );
  });

  // Dotted background pattern
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px',
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-10 pb-32" style={dotPatternStyle}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-black tracking-tight">Phone Numbers</h1>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-500">
                {filteredNumbers.length} {filteredNumbers.length === 1 ? 'LINE' : 'LINES'}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mb-1">Manage inbound & outbound connectivity lines</p>
            <p className="text-xs text-zinc-400">Twilio Integration • SIP Trunking Active</p>
          </header>

          {/* Search & Import Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lines..."
                className="pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 transition w-64 placeholder-zinc-400"
              />
            </div>
            <button
              onClick={() => navigate('/account/phone-numbers/import')}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold hover:bg-zinc-800 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Import Number
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[2fr_2fr_2fr_1.5fr_60px] px-6 pb-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <div>Line Name</div>
            <div>Phone Number</div>
            <div>Assigned Agent</div>
            <div>Provider</div>
            <div></div>
          </div>

          {/* Connect New Phone - Dashed Row */}
          <div
            onClick={() => navigate('/account/phone-numbers/import')}
            className="group border-2 border-dashed border-zinc-300 rounded-2xl p-3 px-6 mb-3 grid grid-cols-[2fr_2fr_2fr_1.5fr_60px] items-center cursor-pointer hover:border-zinc-400 hover:bg-white/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center group-hover:border-zinc-400 transition">
                <Plus className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition" />
              </div>
              <span className="text-sm text-zinc-500 group-hover:text-zinc-700 transition font-medium">Connect new phone number via Twilio or SIP</span>
            </div>
          </div>

          {/* Phone Number Rows */}
          {filteredNumbers.length === 0 && searchQuery ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-2">No numbers found</h3>
              <p className="text-sm text-zinc-500">Try a different search term</p>
            </div>
          ) : (
            filteredNumbers.map((phone) => {
              const agentName = getAgentName(phone.connected_agent_id);
              const isTwilio = phone.provider_type === 'twilio';

              return (
                <div
                  key={phone.id}
                  onClick={() => navigate(`/account/phone-numbers/${phone.id}`)}
                  className="group bg-white border border-zinc-200 rounded-2xl p-3 px-6 mb-3 grid grid-cols-[2fr_2fr_2fr_1.5fr_60px] items-center cursor-pointer transition-all hover:border-zinc-400 hover:shadow-md hover:-translate-y-px"
                >
                  {/* Line Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                      {isTwilio ? (
                        <Hash className="w-5 h-5 text-zinc-500" />
                      ) : (
                        <Phone className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-black">{phone.label || 'Unnamed Line'}</div>
                      <div className="text-[11px] text-zinc-400">{isTwilio ? 'Twilio Number' : 'SIP Trunk'}</div>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-700 font-mono">{phone.phone_number}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(phone.phone_number);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-black"
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Assigned Agent */}
                  <div>
                    {agentName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden">
                          <img
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${agentName}`}
                            alt=""
                            className="w-full h-full"
                          />
                        </div>
                        <span className="text-sm text-zinc-600">{agentName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Not assigned</span>
                    )}
                  </div>

                  {/* Provider Badge */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-[11px] font-semibold text-zinc-600">
                      <span className={`w-2 h-2 rounded-full ${isTwilio ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                      {isTwilio ? 'Twilio' : 'SIP Trunk'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black transition opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setInboundConfigModal({ open: true, phone })}
                          className="text-sm cursor-pointer"
                        >
                          Configure Inbound
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTestCallModal({ open: true, phone })}
                          className="text-sm cursor-pointer"
                        >
                          Test Call
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            const success = await syncPhoneNumber(phone.id, phone.label || phone.phone_number);
                            if (success) {
                              loadPhoneNumbers();
                            }
                          }}
                          disabled={syncing === phone.id}
                          className="text-sm cursor-pointer"
                        >
                          {syncing === phone.id ? 'Syncing...' : 'Re-sync'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deletePhoneNumber(phone.id)}
                          disabled={phone.is_shared}
                          className="text-sm text-red-600 cursor-pointer focus:text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

{/* Test Call Modal */}
      <PhoneTestCallModal
        isOpen={testCallModal.open}
        onClose={() => setTestCallModal({ open: false })}
        phoneNumber={testCallModal.phone?.phone_number || ''}
        phoneLabel={testCallModal.phone?.label || ''}
      />

      {/* Inbound Agent Config Modal */}
      <InboundAgentConfig
        open={inboundConfigModal.open}
        onOpenChange={(open) => setInboundConfigModal({ ...inboundConfigModal, open })}
        phoneId={inboundConfigModal.phone?.id || ''}
        phoneNumber={inboundConfigModal.phone?.phone_number || ''}
        phoneLabel={inboundConfigModal.phone?.label || ''}
        currentAgentId={inboundConfigModal.phone?.connected_agent_id || null}
        onSuccess={loadPhoneNumbers}
      />
    </DashboardLayout>
  );
};

export default PhoneNumbers;
