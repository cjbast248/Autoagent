import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Phone, Trash2, Power, PowerOff, Search, Copy, Mic, MoreHorizontal, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUserAgents } from '@/hooks/useUserAgents';
import { useAgentOperations } from '@/hooks/useAgentOperations';
import { useClipboard } from '@/hooks/useClipboard';
import { toast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AgentTestCallModal } from '@/components/AgentTestCallModal';
import VoiceAIWidget, { Message } from '@/components/VoiceAIWidget';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { VOICES } from '@/constants/constants';
import { supabase } from '@/integrations/supabase/client';

// Get Notionists avatar URL from DiceBear
const getNotionistsAvatar = (seed: string) => {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
};

// Dotted background pattern style
const dotPatternStyle = {
  backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
};

const KalinaAgents = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const {
    data: userAgents,
    isLoading,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
    status,
    fetchStatus
  } = useUserAgents();

  const {
    deactivateAgent,
    activateAgent,
    deleteAgent,
    duplicateAgent,
    isDeleting,
    isDuplicating
  } = useAgentOperations();
  const {
    copyToClipboard
  } = useClipboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentForDeletion, setSelectedAgentForDeletion] = useState<any>(null);
  const [testCallAgent, setTestCallAgent] = useState<any>(null);
  const [voiceTestAgent, setVoiceTestAgent] = useState<any>(null);
  const [voiceTestMessages, setVoiceTestMessages] = useState<Message[]>([]);
  const voiceTestMessagesEndRef = useRef<HTMLDivElement>(null);
  const [customVoices, setCustomVoices] = useState<{ voice_id: string, voice_name: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  // Fetch custom voices from Supabase
  useEffect(() => {
    let mounted = true;

    const fetchCustomVoices = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_voices')
          .select('voice_id, voice_name');
        if (error) throw error;
        if (data && mounted) {
          setCustomVoices(data);
        }
      } catch (error) {
        console.error('Error fetching custom voices:', error);
        if (mounted) {
          toast({
            title: "Eroare",
            description: "Nu s-au putut încărca vocile personalizate",
            variant: "destructive",
          });
        }
      }
    };
    fetchCustomVoices();

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-scroll voice test messages to bottom
  useEffect(() => {
    voiceTestMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voiceTestMessages]);

  // Clear voice test messages when modal closes
  useEffect(() => {
    if (!voiceTestAgent) {
      setVoiceTestMessages([]);
    }
  }, [voiceTestAgent]);

  const handleVoiceTestMessage = (message: Message) => {
    setVoiceTestMessages(prev => [...prev, message]);
  };

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!userAgents) return [];
    if (!searchQuery.trim()) return userAgents;
    return userAgents.filter(agent => agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) || agent.agent_id.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [userAgents, searchQuery]);

  // Pagination
  const itemsPerPage = 10;
  const paginatedAgents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAgents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAgents, currentPage]);
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);

  const handleToggleAgentStatus = (agent: any) => {
    if (agent.is_active) {
      deactivateAgent({
        id: agent.id,
        isActive: false
      });
    } else {
      activateAgent({
        id: agent.id,
        isActive: true
      });
    }
  };
  const handleDeleteAgent = (agent: any) => {
    deleteAgent({
      id: agent.id,
      agent_id: agent.agent_id
    });
    setSelectedAgentForDeletion(null);
  };
  const handleDuplicateAgent = (agent: any) => {
    duplicateAgent(agent);
  };
  const handleEditAgent = (agentId: string) => {
    navigate(`/account/agent-edit/${agentId}`);
  };
  const handleCopyAgentId = async (agentId: string) => {
    await copyToClipboard(agentId);
  };
  const handleTestCall = (agent: any) => {
    setTestCallAgent(agent);
  };

  // Format date helper - returns date and time separately
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return { date: dateStr, time: timeStr };
  };

  // Get voice name - prefer voice_name from DB, fallback to lookup
  const getVoiceName = (agent: any) => {
    // First check if voice_name is stored directly on agent
    if (agent.voice_name) return agent.voice_name;

    const voiceId = agent.voice_id;
    if (!voiceId) return 'Default';
    // Check standard voices
    const standardVoice = VOICES.find(v => v.id === voiceId);
    if (standardVoice) return standardVoice.name;
    // Check custom voices from state
    const customVoice = customVoices.find(v => v.voice_id === voiceId);
    if (customVoice) return customVoice.voice_name;
    // Return fallback
    return 'Cloned Voice';
  };

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen p-8" style={dotPatternStyle}>
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
              <div className="text-zinc-500 text-sm">{t('agents.loading')}</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show loading state while fetching agents
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen p-8" style={dotPatternStyle}>
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
              <div className="text-zinc-500 text-sm">{t('agents.loading')}</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state with retry button
  if (isError) {
    console.error('KalinaAgents error:', error);
    return (
      <DashboardLayout>
        <div className="min-h-screen p-8" style={dotPatternStyle}>
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-zinc-900 font-medium mb-1">{t('agents.errorLoading') || 'Error loading agents'}</h3>
                <p className="text-zinc-500 text-sm mb-6">{t('agents.tryAgain') || 'Please try again'}</p>
                <button
                  onClick={() => refetch()}
                  className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
                >
                  {t('common.retry') || 'Retry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-4 md:p-8" style={dotPatternStyle}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-10 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-black tracking-tight">My Agents</h1>
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-500">
                  BETA
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                Manage your AI agents and their configurations. <br />
                <span className="text-xs text-zinc-400">Library Version: 2.4 • {filteredAgents.length} Total Agents</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-[13px] w-[280px] transition-all focus:border-black focus:outline-none"
                />
              </div>

              {/* New Agent button */}
              <Link to="/account/agent-consultant" data-action="new-agent">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[13px] font-semibold rounded-xl hover:bg-zinc-800 transition-all shadow-md hover:-translate-y-px">
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  New Agent
                </button>
              </Link>
            </div>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[2.5fr_1.5fr_1.5fr_auto] mb-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400 pl-6">
              Agent Name
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
              Voice Engine
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
              Created At
            </div>
            <div></div>
          </div>

          {/* Agents List */}
          <div>
            {paginatedAgents && paginatedAgents.length > 0 ? paginatedAgents.map(agent => {
              const { date, time } = formatDate(agent.created_at);
              return (
                <div
                  key={agent.id}
                  data-agent-row
                  data-agent-id={agent.agent_id}
                  data-agent-name={agent.name}
                  className="group relative bg-white border border-zinc-200 rounded-xl p-3 md:px-6 mb-2.5 flex flex-col md:grid md:grid-cols-[2.5fr_1.5fr_1.5fr_auto] gap-2.5 md:gap-0 items-start md:items-center cursor-pointer transition-all hover:border-zinc-400 hover:shadow-md hover:-translate-y-px"
                  onClick={() => handleEditAgent(agent.agent_id)}
                >
                  {/* Name with Avatar */}
                  <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                    <div className="w-[42px] h-[42px] rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img
                        src={getNotionistsAvatar(agent.name || agent.agent_id)}
                        alt={agent.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-black group-hover:underline decoration-zinc-200 underline-offset-4 truncate">
                          {agent.name}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {agent.description || 'AI Agent'}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row (Mobile: Voice + Date combined, Desktop: Separate cols) */}
                  <div className="flex flex-row md:contents gap-4 md:gap-0 w-full md:w-auto mt-1 md:mt-0 pl-[54px] md:pl-0">

                    {/* Voice Engine */}
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Mic className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs md:text-sm font-medium text-zinc-700">
                        {getVoiceName(agent)}
                      </span>
                    </div>

                    {/* Mobile Date Separator */}
                    <div className="md:hidden w-1 h-1 rounded-full bg-zinc-300 self-center" />

                    {/* Created at */}
                    <div className="flex items-center md:block">
                      <div>
                        <div className="text-xs md:text-sm font-medium md:font-bold text-zinc-500 md:text-zinc-900">{date}</div>
                        <div className="hidden md:block text-[11px] text-zinc-500 font-mono">{time}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-4 right-4 md:static md:flex md:items-center md:gap-2 md:justify-end">

                    {/* Desktop Buttons (Audio/Apel) - Hidden on Mobile */}
                    <button
                      data-action="test-audio"
                      data-agent-id={agent.agent_id}
                      className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-semibold text-zinc-600 opacity-0 translate-x-2.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all hover:border-black hover:text-black hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!agent.is_active}
                      onClick={e => {
                        e.stopPropagation();
                        setVoiceTestAgent(agent);
                      }}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Audio
                    </button>

                    <button
                      data-action="test-call"
                      data-agent-id={agent.agent_id}
                      className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-semibold text-zinc-600 opacity-0 translate-x-2.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all hover:border-black hover:text-black hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={!agent.is_active}
                      onClick={e => {
                        e.stopPropagation();
                        handleTestCall(agent);
                      }}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Apel
                    </button>

                    {/* More Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          data-action="agent-menu"
                          data-agent-id={agent.agent_id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-black transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white border border-zinc-100 shadow-lg shadow-zinc-200/50 rounded-xl p-1">
                        <DropdownMenuItem
                          data-action={agent.is_active ? 'deactivate-agent' : 'activate-agent'}
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleAgentStatus(agent);
                          }}
                          className="cursor-pointer text-sm py-2 px-3 text-zinc-700 hover:bg-zinc-50 rounded-lg"
                        >
                          {agent.is_active ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-2.5 text-zinc-500" />
                              {t('agents.deactivate')}
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2.5 text-zinc-500" />
                              {t('agents.activate')}
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          data-action="duplicate-agent"
                          onClick={e => {
                            e.stopPropagation();
                            handleDuplicateAgent(agent);
                          }}
                          className="cursor-pointer text-sm py-2 px-3 text-zinc-700 hover:bg-zinc-50 rounded-lg"
                          disabled={isDuplicating}
                        >
                          <Copy className="w-4 h-4 mr-2.5 text-zinc-500" />
                          {t('agents.duplicate')}
                        </DropdownMenuItem>

                        {/* Mobile Only Actions in Menu */}
                        <div className="md:hidden">
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation();
                              setVoiceTestAgent(agent);
                            }}
                            disabled={!agent.is_active}
                            className="cursor-pointer text-sm py-2 px-3 text-zinc-700 hover:bg-zinc-50 rounded-lg"
                          >
                            <Mic className="w-4 h-4 mr-2.5 text-zinc-500" />
                            Test Audio
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation();
                              handleTestCall(agent);
                            }}
                            disabled={!agent.is_active}
                            className="cursor-pointer text-sm py-2 px-3 text-zinc-700 hover:bg-zinc-50 rounded-lg"
                          >
                            <Phone className="w-4 h-4 mr-2.5 text-zinc-500" />
                            Test Call
                          </DropdownMenuItem>
                        </div>

                        <DropdownMenuSeparator className="bg-zinc-100 my-1" />

                        <DropdownMenuItem
                          data-action="delete-agent"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedAgentForDeletion(agent);
                          }}
                          className="cursor-pointer text-sm py-2 px-3 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 mr-2.5" />
                          {t('agents.deleteAgent')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            }) : searchQuery.trim() ? (
              <div className="py-20 text-center">
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-zinc-400" />
                </div>
                <h3 className="text-base font-medium text-zinc-900 mb-1">{t('agents.noAgentsFound')}</h3>
                <p className="text-sm text-zinc-500 mb-6">
                  {t('agents.noAgentsMatch')} "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-5 py-2 text-sm font-medium border border-zinc-200 rounded-xl text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {t('agents.clearSearch')}
                </button>
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-zinc-400" />
                </div>
                <h3 className="text-base font-medium text-zinc-900 mb-1">{t('agents.noAgentsYet')}</h3>
                <p className="text-sm text-zinc-500 mb-6">{t('agents.createFirstAgent')}</p>
                <Link to="/account/agent-consultant">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200 mx-auto">
                    <Plus className="w-4 h-4" strokeWidth={2} />
                    {t('agents.createNewAgent')}
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredAgents.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-200">
              <p className="text-sm text-zinc-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAgents.length)} of {filteredAgents.length} agents
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === page
                      ? 'bg-black text-white'
                      : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Agent Test Call Modal */}
          <AgentTestCallModal isOpen={!!testCallAgent} onClose={() => setTestCallAgent(null)} agent={testCallAgent || {
            id: '',
            agent_id: '',
            name: ''
          }} />

          {/* Voice Test Modal */}
          {voiceTestAgent && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setVoiceTestAgent(null)}>
              {/* Messages and Agent name - fixed bottom right of screen */}
              <div className="fixed bottom-8 right-8 flex flex-col items-end max-w-md">
                {/* Chat messages - appear above agent name, with gradient fade at top */}
                {voiceTestMessages.length > 0 && (
                  <div className="relative mb-4 w-full">
                    {/* Top gradient fade - creates the fade to transparent effect */}
                    <div
                      className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-10"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 30%, rgba(255,255,255,0) 100%)'
                      }}
                    />

                    <div
                      className="max-h-[60vh] overflow-y-auto flex flex-col gap-2 pt-20"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      <style>{`
                        .voice-messages-container::-webkit-scrollbar { display: none; }
                      `}</style>
                      <div className="voice-messages-container flex flex-col gap-2">
                        {voiceTestMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[280px] px-4 py-2.5 rounded-2xl shadow-sm ${msg.isUser
                                ? 'bg-zinc-100 text-zinc-900 rounded-br-sm'
                                : 'bg-white text-zinc-800 rounded-bl-sm border border-zinc-100'
                                }`}
                            >
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={voiceTestMessagesEndRef} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Agent name */}
                <h2 className="text-3xl font-bold text-zinc-900 whitespace-nowrap">
                  {voiceTestAgent.name}
                </h2>
              </div>

              {/* Close button - fixed top right */}
              <button
                onClick={(e) => { e.stopPropagation(); setVoiceTestAgent(null); }}
                className="fixed top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-zinc-100 shadow-lg shadow-zinc-200/50 hover:bg-zinc-50 transition-colors z-10"
              >
                <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              {/* Voice test area with orbital animation - centered */}
              <div onClick={(e) => e.stopPropagation()}>
                <VoiceAIWidget
                  size={200}
                  agentId={voiceTestAgent.agent_id}
                  agentName={voiceTestAgent.name}
                  onMessage={handleVoiceTestMessage}
                />
              </div>
            </div>
          )}

          <AlertDialog open={!!selectedAgentForDeletion} onOpenChange={open => {
            if (!open) setSelectedAgentForDeletion(null);
          }}>
            <AlertDialogContent className="bg-white border border-zinc-100 rounded-2xl shadow-xl shadow-zinc-200/50 p-6">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-zinc-900 text-lg font-semibold">{t('agents.deleteConfirm')}</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-500 text-sm mt-2">
                  {t('agents.deleteConfirmMessage')} "{selectedAgentForDeletion?.name}"?
                  {t('agents.deleteWarning')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 mt-6">
                <AlertDialogCancel className="px-5 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-sm font-medium transition-colors">{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => selectedAgentForDeletion && handleDeleteAgent(selectedAgentForDeletion)} className="px-5 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-medium transition-colors">
                  {isDeleting ? t('agents.deleting') : t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KalinaAgents;
