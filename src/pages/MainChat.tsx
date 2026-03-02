import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';
import { ArrowRight, Mic, Copy, Check, Volume2, VolumeX, RotateCcw, ThumbsUp, ThumbsDown, Share, MoreHorizontal, PanelRightOpen, ChevronsRight, Search, Plus, PhoneCall, Calendar, BarChart2 } from 'lucide-react';
import TypingIndicatorMinimal from '@/components/TypingIndicatorMinimal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useChatConversations } from '@/hooks/useChatConversations';
import { PaymentButton } from '@/components/PaymentButton';
import ConversationAudioPlayer from '@/components/chat/ConversationAudioPlayer';
import { MessageFormatter } from '@/components/chat/MessageFormatter';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  paymentButton?: {
    text: string;
    url: string;
    amount: number;
  };
}

// Dot pattern style
const dotPatternStyle = {
  backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
  backgroundSize: '32px 32px'
};

const MainChat = () => {
  const { user, loading: authLoading } = useAuth();

  const {
    conversations,
    currentConversationId,
    messages: chatMessages,
    createConversation,
    addMessage,
    deleteConversation,
    loadConversation,
    startNewConversation,
    updateConversationTitle
  } = useChatConversations();

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserScrollingRef = useRef(false);

  // Voice input
  const { isListening, isSupported, interimTranscript, toggleListening } = useVoiceInput({
    onTranscript: (text) => {
      setInputValue(prev => prev ? `${prev} ${text}` : text);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    language: 'ro-RO',
    continuous: false
  });

  // Text to speech
  const { speak, stopSpeaking } = useTextToSpeech({ autoPlay: true });

  // Payment helpers
  const parsePaymentFromText = (text: string): Message['paymentButton'] | undefined => {
    if (!text) return undefined;
    const urlMatch = text.match(/https?:\/\/checkout\.stripe\.com[^\s)\]]+/i);
    if (!urlMatch) return undefined;
    const amountMatch = text.match(/(Achit[ăa]|pl[ăa]te[șs]te|generat|pentru)?\s*(\d+(?:[.,]\d+)?)\s*(\$|usd|dolari)/i);
    const amount = amountMatch ? parseFloat(amountMatch[2].replace(',', '.')) : NaN;
    return {
      text: amount && !isNaN(amount) ? `Achită ${amount}$` : 'Achită acum',
      url: urlMatch[0],
      amount: amount && !isNaN(amount) ? amount : 0
    };
  };

  const cleanPaymentLinks = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\[[^\]]*\]\((https?:\/\/[^)]+stripe\.com[^)]*)\)/gi, '')
      .replace(/https?:\/\/checkout\.stripe\.com[^\s)\]]+/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  // Convert chat messages to local format
  useEffect(() => {
    const converted = chatMessages.map(msg => {
      const paymentButton = !msg.is_user ? parsePaymentFromText(msg.content) : undefined;
      return {
        id: msg.id,
        text: msg.content,
        isUser: msg.is_user,
        timestamp: new Date(msg.created_at),
        paymentButton
      };
    });
    setLocalMessages(converted);
  }, [chatMessages]);

  const scrollToBottom = () => {
    if (!isUserScrollingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    isUserScrollingRef.current = !isAtBottom;
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages.length]);

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (authLoading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Se încarcă...</div>
      </div>
    );
  }

  const isNewChat = localMessages.length === 0;
  const quickSuggestions = [
    { icon: PhoneCall, text: 'Rezumă ultimul apel' },
    { icon: Calendar, text: 'Programează întâlnire' },
    { icon: BarChart2, text: 'Analiză costuri' }
  ];

  const sendMessageImpl = async (userMessageText: string) => {
    if (!userMessageText.trim()) return;
    setIsLoading(true);
    try {
      let conversationId = currentConversationId;

      if (!conversationId) {
        const title = userMessageText.length > 50 ? userMessageText.substring(0, 50) + '...' : userMessageText;
        conversationId = await createConversation(title);
        if (!conversationId) throw new Error('Nu s-a putut crea conversația');
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        text: userMessageText,
        isUser: true,
        timestamp: new Date()
      };
      setLocalMessages(prev => [...prev, userMessage]);
      await addMessage(conversationId, userMessageText, true);

      const conversationHistory = localMessages.slice(-10).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      }));

      const { data, error } = await supabase.functions.invoke('intelligent-agent-chat', {
        body: { message: userMessageText, userId: user?.id, conversationHistory }
      });

      if (error) throw error;

      const rawResponse: string = (data?.response ?? data?.text) || "Ne pare rău, nu am putut procesa cererea.";
      const paymentButton = parsePaymentFromText(rawResponse);

      const aiMessageId = (Date.now() + 1).toString();

      // Add AI message immediately (no typing animation for better performance)
      const aiMessage: Message = {
        id: aiMessageId,
        text: rawResponse,
        isUser: false,
        timestamp: new Date(),
        paymentButton
      };
      setLocalMessages(prev => [...prev, aiMessage]);
      scrollToBottom();

      // Save AI message to database
      addMessage(conversationId, rawResponse, false, false).catch(err => {
        console.error('Failed to save AI message:', err);
        toast.error('Mesajul AI nu a putut fi salvat. Răspunsul este vizibil, dar nu va persista.');
      });

      if (voiceResponseEnabled && rawResponse) {
        speak(rawResponse);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Eroare la trimiterea mesajului');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Ne pare rău, a apărut o eroare tehnică. Te rog să încerci din nou.',
        isUser: false,
        timestamp: new Date()
      };
      setLocalMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const userMessageText = inputValue.trim();
    setInputValue('');
    await sendMessageImpl(userMessageText);
  };

  const handleNewChat = async () => {
    startNewConversation();
    setLocalMessages([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Nu s-a putut copia');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      sendMessageImpl(suggestion);
    });
  };

  const renderMessageContent = (message: Message) => {
    const rawText = message.isUser ? message.text : cleanPaymentLinks(message.text);

    const audioPlayerMatch = rawText.match(/<div class="conversation-audio-player" data-conversation-id="([^"]+)" data-audio-url="([^"]+)">.*?<\/div>/s);

    if (audioPlayerMatch) {
      const [, conversationId, audioUrl] = audioPlayerMatch;
      const textWithoutAudioPlayer = rawText.replace(audioPlayerMatch[0], '').trim();

      return (
        <div className="space-y-3">
          {textWithoutAudioPlayer && (
            <MessageFormatter text={textWithoutAudioPlayer} onSuggestionClick={handleSuggestionClick} />
          )}
          <ConversationAudioPlayer conversation_id={conversationId} audio_url={audioUrl} />
        </div>
      );
    }

    if (message.isUser) {
      return <div className="whitespace-pre-wrap">{rawText}</div>;
    }

    return <MessageFormatter text={rawText} onSuggestionClick={handleSuggestionClick} />;
  };

  const handleExportConversations = async (ids: string[]) => {
    try {
      const exportData = conversations
        .filter(c => ids.includes(c.id))
        .map(c => ({
          title: c.title,
          updated_at: c.updated_at
        }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agentauto-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${ids.length} conversații exportate`);
    } catch (error) {
      toast.error('Eroare la export');
    }
  };

  // Zen-style input component
  const zenInputJSX = (
    <div className="w-full max-w-4xl mx-auto px-6">
      <form onSubmit={handleSendMessage}>
        <div
          className={cn(
            "bg-white border border-zinc-200 rounded-[2rem] p-3 pl-8 flex items-center gap-4 h-20 w-full",
            "transition-all duration-400",
            inputFocused && "shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border-black",
            isListening && "border-red-500"
          )}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={interimTranscript || inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={isListening ? "Ascult..." : "Întreabă orice..."}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none text-lg text-zinc-900 placeholder-zinc-400 h-full w-full"
          />

          <div className="flex items-center gap-2 pr-2">
            {/* Mic Button */}
            {isSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={cn(
                  "w-12 h-12 rounded-full hover:bg-zinc-50 text-zinc-400 hover:text-black transition flex items-center justify-center",
                  isListening && "text-red-500 bg-red-50"
                )}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all group",
                inputValue.trim() && !isLoading
                  ? "bg-black text-white hover:bg-zinc-800 shadow-lg"
                  : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
              )}
            >
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <DashboardLayout>
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative" style={isNewChat ? dotPatternStyle : {}}>
        {/* History Toggle Button - Top Right */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="absolute top-6 right-6 z-20 w-10 h-10 rounded-xl bg-white border border-zinc-200 hover:border-black flex items-center justify-center text-zinc-500 hover:text-black transition shadow-sm"
          title="Toggle History"
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>

        {/* History Sidebar - Slide from Right */}
        <aside
          className={cn(
            "fixed top-4 right-4 bottom-4 w-[calc(100vw-2rem)] md:w-[340px] bg-white border border-zinc-100 rounded-[24px] z-30 flex flex-col overflow-hidden",
            "transition-transform duration-400",
            showHistory
              ? "translate-x-0 shadow-[-20px_0_50px_-10px_rgba(0,0,0,0.05)]"
              : "translate-x-[calc(100%+16px)]"
          )}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Sidebar Header */}
          <div className="px-6 pt-6 pb-4 flex justify-between items-center bg-white z-10">
            <h2 className="text-sm font-bold text-black uppercase tracking-widest">Jurnal</h2>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-black transition">
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-black transition"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar Content - Conversations List */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-8" style={{ scrollbarWidth: 'thin' }}>
            {/* Today */}
            {conversations.filter(c => {
              const today = new Date();
              const convDate = new Date(c.updated_at);
              return convDate.toDateString() === today.toDateString();
            }).length > 0 && (
                <div>
                  <p className="px-3 text-[10px] font-bold text-zinc-300 mb-2">AZI</p>
                  <div className="space-y-1">
                    {conversations
                      .filter(c => {
                        const today = new Date();
                        const convDate = new Date(c.updated_at);
                        return convDate.toDateString() === today.toDateString();
                      })
                      .map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => {
                            loadConversation(conv.id);
                            setShowHistory(false);
                          }}
                          className={cn(
                            "p-3 cursor-pointer flex justify-between items-start group rounded-xl transition-all",
                            currentConversationId === conv.id
                              ? "bg-black text-white"
                              : "hover:bg-zinc-50"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-medium leading-relaxed truncate pr-2",
                            currentConversationId === conv.id ? "font-bold" : "text-zinc-600 group-hover:text-black"
                          )}>
                            {conv.title}
                          </span>
                          <span className={cn(
                            "text-[10px] font-mono pt-0.5 transition",
                            currentConversationId === conv.id ? "text-zinc-400" : "text-zinc-300 group-hover:text-black"
                          )}>
                            {new Date(conv.updated_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Yesterday */}
            {conversations.filter(c => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const convDate = new Date(c.updated_at);
              return convDate.toDateString() === yesterday.toDateString();
            }).length > 0 && (
                <div>
                  <p className="px-3 text-[10px] font-bold text-zinc-300 mb-2">IERI</p>
                  <div className="space-y-1">
                    {conversations
                      .filter(c => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const convDate = new Date(c.updated_at);
                        return convDate.toDateString() === yesterday.toDateString();
                      })
                      .map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => {
                            loadConversation(conv.id);
                            setShowHistory(false);
                          }}
                          className={cn(
                            "p-3 cursor-pointer flex justify-between items-start group rounded-xl transition-all",
                            currentConversationId === conv.id
                              ? "bg-black text-white"
                              : "hover:bg-zinc-50"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-medium leading-relaxed truncate pr-2",
                            currentConversationId === conv.id ? "font-bold" : "text-zinc-600 group-hover:text-black"
                          )}>
                            {conv.title}
                          </span>
                          <span className={cn(
                            "text-[10px] font-mono pt-0.5 transition",
                            currentConversationId === conv.id ? "text-zinc-400" : "text-zinc-300 group-hover:text-black"
                          )}>
                            {new Date(conv.updated_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Older */}
            {conversations.filter(c => {
              const today = new Date();
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const convDate = new Date(c.updated_at);
              return convDate.toDateString() !== today.toDateString() && convDate.toDateString() !== yesterday.toDateString();
            }).length > 0 && (
                <div>
                  <p className="px-3 text-[10px] font-bold text-zinc-300 mb-2">MAI VECHI</p>
                  <div className="space-y-1">
                    {conversations
                      .filter(c => {
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const convDate = new Date(c.updated_at);
                        return convDate.toDateString() !== today.toDateString() && convDate.toDateString() !== yesterday.toDateString();
                      })
                      .map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => {
                            loadConversation(conv.id);
                            setShowHistory(false);
                          }}
                          className={cn(
                            "p-3 cursor-pointer flex justify-between items-start group rounded-xl transition-all",
                            currentConversationId === conv.id
                              ? "bg-black text-white"
                              : "hover:bg-zinc-50"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-medium leading-relaxed truncate pr-2",
                            currentConversationId === conv.id ? "font-bold" : "text-zinc-600 group-hover:text-black"
                          )}>
                            {conv.title}
                          </span>
                          <span className={cn(
                            "text-[10px] font-mono pt-0.5 transition",
                            currentConversationId === conv.id ? "text-zinc-400" : "text-zinc-300 group-hover:text-black"
                          )}>
                            {new Date(conv.updated_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 bg-white border-t border-zinc-50">
            <button
              onClick={() => {
                handleNewChat();
                setShowHistory(false);
              }}
              className="w-full py-3 rounded-xl bg-black text-white hover:bg-zinc-800 transition text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" /> Chat Nou
            </button>
          </div>
        </aside>

        {isNewChat ? (
          /* ===== Empty State - Zen Architectural Style ===== */
          <main className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-center text-black mb-16 tracking-tight">
              Cu ce te pot ajuta?
            </h1>

            {/* Input */}
            <div className="w-full mb-12">
              {zenInputJSX}
            </div>

            {/* Suggestion Pills */}
            <div className="flex flex-wrap justify-center gap-3 w-full max-w-2xl">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion.text}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="px-6 py-3 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-500 shadow-sm flex items-center gap-2 hover:border-black hover:text-black transition-all"
                >
                  <suggestion.icon className="w-3.5 h-3.5" />
                  {suggestion.text}
                </button>
              ))}
            </div>

            {/* Footer Branding */}
            <div className="absolute bottom-8 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
              Agent Automation OS
            </div>
          </main>
        ) : (
          /* ===== Conversation View ===== */
          <>
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto min-h-0"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="max-w-3xl mx-auto px-4 pt-8 pb-6 space-y-12">
                {localMessages.map((message) => (
                  <div key={message.id} className="group">
                    {message.isUser ? (
                      /* User Message - Soft Zinc Block */
                      <div className="flex justify-end">
                        <div className="flex flex-col items-end max-w-[80%]">
                          <div
                            className="bg-zinc-100 hover:bg-zinc-200 px-6 py-4 text-[15px] font-medium leading-relaxed shadow-sm transition-all hover:-translate-y-0.5"
                            style={{ borderRadius: '20px 4px 20px 20px' }}
                          >
                            <div className="text-zinc-900">
                              {renderMessageContent(message)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 mr-1">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {message.timestamp.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Check className="w-3 h-3 text-zinc-300" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* AI Message - Transparent Technical Style */
                      <div className="flex gap-5">
                        {/* AI Avatar - White Square with Logo */}
                        <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                          <img
                            src="/lovable-uploads/kalina-logo.png"
                            alt="Agentauto"
                            className="w-7 h-7 object-contain"
                          />
                        </div>

                        <div className="flex flex-col max-w-[90%]">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-black uppercase tracking-widest">Agent Automation</span>
                          </div>

                          {/* Message Content */}
                          <div className="text-[15px] text-zinc-800 leading-relaxed mb-4 min-h-[24px]">
                            {renderMessageContent(message)}
                          </div>

                          {message.paymentButton && (
                            <div className="mb-4">
                              <PaymentButton
                                text={message.paymentButton.text}
                                url={message.paymentButton.url}
                                amount={message.paymentButton.amount}
                              />
                            </div>
                          )}

                          {/* Action Bar - Appears on Hover */}
                          <div className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 self-start flex items-center bg-white border border-zinc-100 rounded-full px-2 py-1 shadow-sm">
                            <button
                              onClick={() => copyToClipboard(message.text, message.id)}
                              className="p-2 hover:bg-zinc-50 rounded-full text-zinc-400 hover:text-black transition"
                              title="Copy"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div className="w-px h-3 bg-zinc-200 mx-1" />
                            <button
                              onClick={() => sendMessageImpl(message.text)}
                              className="p-2 hover:bg-zinc-50 rounded-full text-zinc-400 hover:text-black transition"
                              title="Regenerate"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-3 bg-zinc-200 mx-1" />
                            <button
                              className="p-2 hover:bg-zinc-50 rounded-full text-zinc-400 hover:text-black transition"
                              title="Bad Response"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                      <img
                        src="/lovable-uploads/kalina-logo.png"
                        alt="Agentauto"
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-black uppercase tracking-widest">Agent Automation</span>
                      </div>
                      <TypingIndicatorMinimal />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Fixed Bottom Input - Centered & Smaller */}
            <div className="flex-shrink-0 bg-white py-4">
              <div className="w-full max-w-2xl mx-auto px-6">
                <form onSubmit={handleSendMessage}>
                  <div
                    className={cn(
                      "bg-zinc-50 border border-zinc-200 rounded-full p-2 pl-6 flex items-center gap-3 h-14 w-full",
                      "transition-all duration-300",
                      inputFocused && "shadow-lg border-zinc-300 bg-white",
                      isListening && "border-red-500"
                    )}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={interimTranscript || inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      placeholder={isListening ? "Ascult..." : "Întreabă orice..."}
                      disabled={isLoading}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 placeholder-zinc-400"
                    />

                    <div className="flex items-center gap-1 pr-1">
                      {/* Mic Button */}
                      {isSupported && (
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={cn(
                            "w-10 h-10 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black transition flex items-center justify-center",
                            isListening && "text-red-500 bg-red-50"
                          )}
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                      )}

                      {/* Send Button */}
                      <button
                        type="submit"
                        disabled={isLoading || (!inputValue.trim() && !interimTranscript)}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition",
                          inputValue.trim() || interimTranscript
                            ? "bg-black text-white hover:bg-zinc-800"
                            : "bg-zinc-200 text-zinc-400"
                        )}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MainChat;
