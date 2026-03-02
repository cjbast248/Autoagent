import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  functionCalled?: string;
  costDeducted?: number;
  remainingBalance?: string;
}

const AgentAI = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch user balance
  const fetchBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_balance')
        .select('balance_usd')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setUserBalance(data?.balance_usd || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);


  useEffect(() => {
    // Find the viewport element inside ScrollArea and scroll to bottom
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check balance before sending
      const COST_PER_QUESTION = 0.08;
      if (userBalance < COST_PER_QUESTION) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Sold insuficient! Ai nevoie de $${COST_PER_QUESTION} pentru a pune o întrebare. Soldul tău curent: $${userBalance.toFixed(2)}. Te rog să îți reîncarci contul.`,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('intelligent-agent-chat', {
        body: {
          message: message,
          userId: user.id,
          conversationHistory: messages.slice(-8).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Handle insufficient balance response
      if (data.error === 'insufficient_balance') {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: (data?.response ?? data?.text) || 'Nu am putut procesa cererea.',
        sender: 'ai',
        timestamp: new Date(),
        functionCalled: data.functionCalled
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update balance if cost was deducted
      if (data.costDeducted && data.remainingBalance) {
        setUserBalance(parseFloat(data.remainingBalance));
        
        toast({
          title: "Întrebare procesată",
          description: `Cost: $${data.costDeducted} | Sold rămas: $${data.remainingBalance}`,
        });
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Scuze, am întâmpinat o problemă. Te rog să încerci din nou.',
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Eroare",
        description: error.message || "Nu am putut trimite mesajul",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };


  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
          <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
            <div>
              <h1 className={`font-bold text-foreground ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Agent AI</h1>
              <p className={`text-muted-foreground ${isMobile ? 'mt-1 text-sm' : 'mt-2'}`}>
                Întreabă-mă orice despre datele tale din conversații. Cost: $0.08 per întrebare.
              </p>
            </div>
            <div className={`${isMobile ? 'text-left' : 'text-right'}`}>
              <p className="text-sm text-muted-foreground">Sold disponibil</p>
              <p className={`font-bold text-primary ${isMobile ? 'text-xl' : 'text-2xl'}`}>${userBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Chat Area - Full Width with Minimalist Design */}
        <div className="w-full">
          <div className={`${isMobile ? 'h-[calc(100vh-12rem)] min-h-[400px]' : 'h-[600px]'} flex flex-col bg-background/50 backdrop-blur-sm rounded-xl border-0 shadow-lg overflow-hidden`}>
            {/* Minimalist Header */}
            <div className={`${isMobile ? 'p-4' : 'p-6'} bg-background/80 backdrop-blur-sm`}>
              <div className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'} font-light text-foreground/80`}>
                <Bot className={`text-primary ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
                <span>Agent Automation</span>
              </div>
              <p className="text-sm text-muted-foreground/70 mt-1">Bună, cum pot să te ajut astăzi?</p>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className={`flex-1 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`} ref={scrollAreaRef}>
                {messages.length === 0 ? (
                  <div className={`text-center text-muted-foreground/60 ${isMobile ? 'py-8' : 'py-16'}`}>
                    <Bot className={`mx-auto mb-6 text-muted-foreground/30 ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`} />
                    <p className={`font-light ${isMobile ? 'text-sm' : 'text-base'}`}>Începe o conversație</p>
                    <p className={`text-xs mt-2 text-muted-foreground/40`}>Întreabă-mă orice despre conversațiile tale</p>
                  </div>
                ) : (
                  <div className={`${isMobile ? 'space-y-6' : 'space-y-8'}`}>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.sender === 'ai' && (
                          <div className={`bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center flex-shrink-0 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
                            <Bot className={`text-primary ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                          </div>
                        )}
                        
                        <div
                          className={`${isMobile ? 'max-w-[85%]' : 'max-w-[75%]'} ${isMobile ? 'p-4' : 'p-5'} rounded-2xl ${
                            message.sender === 'user'
                              ? 'bg-primary/10 border border-primary/20 text-foreground'
                              : 'bg-muted/30 border border-muted text-foreground'
                          } backdrop-blur-sm`}
                        >
                          <p className={`whitespace-pre-wrap leading-relaxed ${isMobile ? 'text-sm' : 'text-base'}`}>{message.content}</p>
                          <div className={`flex items-center gap-3 ${isMobile ? 'mt-3' : 'mt-4'}`}>
                            <span className={`text-muted-foreground/60 font-light ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            {message.functionCalled && (
                              <Badge variant="outline" className={`text-xs px-2 py-1 bg-background/50 border-primary/30`}>
                                {message.functionCalled}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {message.sender === 'user' && (
                          <div className={`bg-muted/20 border border-muted rounded-full flex items-center justify-center flex-shrink-0 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
                            <User className={`text-muted-foreground ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className={`flex items-start ${isMobile ? 'gap-3' : 'gap-3'} justify-start`}>
                        <div className={`bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center flex-shrink-0 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
                          <Bot className={`text-primary animate-pulse ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                        </div>
                        <div className={`bg-muted/30 border border-muted rounded-2xl backdrop-blur-sm ${isMobile ? 'p-4' : 'p-5'}`}>
                          <div className="flex space-x-2">
                            <div className={`bg-muted-foreground/60 rounded-full animate-bounce ${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}></div>
                            <div className={`bg-muted-foreground/60 rounded-full animate-bounce ${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} style={{ animationDelay: '0.1s' }}></div>
                            <div className={`bg-muted-foreground/60 rounded-full animate-bounce ${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
              
              {/* Input Area */}
              <div className={`bg-background/60 backdrop-blur-sm ${isMobile ? 'p-4' : 'p-6'} mobile-safe-area`}>
                <form onSubmit={handleSubmit} className={`flex ${isMobile ? 'gap-3' : 'gap-4'}`}>
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={userBalance >= 0.08 ? "Scrie mesajul tău aici..." : "Sold insuficient pentru întrebări"}
                    disabled={isLoading || userBalance < 0.08}
                    className={`flex-1 bg-background/50 border-muted/40 rounded-xl backdrop-blur-sm focus:border-primary/50 transition-all duration-200 ${isMobile ? 'text-base h-12' : 'h-14'} mobile-input`}
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading || !inputMessage.trim() || userBalance < 0.08}
                    className={`bg-primary/90 hover:bg-primary rounded-xl backdrop-blur-sm transition-all duration-200 shadow-lg hover:shadow-xl mobile-button ${userBalance < 0.08 ? "opacity-50" : ""} ${isMobile ? 'px-4 h-12' : 'px-6 h-14'}`}
                  >
                    <Send className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5'}`} />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentAI;