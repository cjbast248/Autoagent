import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Phone, PlayCircle, Loader2, MessageSquare, RefreshCw, Wallet, AlertTriangle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import TestCallHistory from '@/components/TestCallHistory';
import { useTestCallHistory } from '@/hooks/useTestCallHistory';
import { useRealtimeConversation } from '@/hooks/useRealtimeConversation';
import { LiveConversationDialog } from '@/components/LiveConversationDialog';
import { AgentSelector } from '@/components/outbound/AgentSelector';
import { COST_PER_MINUTE, calculateCostFromMinutes } from '@/utils/costCalculations';
const TestCall = () => {
  const [agentId, setAgentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [conversation, setConversation] = useState(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { history, addToHistory, updateHistoryItem, clearHistory } = useTestCallHistory();
  const { conversation: realtimeConversation, isActive } = useRealtimeConversation(currentConversationId);

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
      setUserBalance(0);
    }
  };

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('is_admin_user', {
        _user_id: user.id
      });
      
      if (error) throw error;
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    checkAdminStatus();
  }, [user]);

  // Test calls are free for all users
  const estimatedCostPerMinute = 0;
  const availableMinutes = 999;
  const hasInsufficientBalance = false;
  const handleTestCall = async () => {
    if (!agentId || !phoneNumber) {
      toast({
        title: "Câmpuri obligatorii",
        description: "Vă rugăm să completați ID-ul agentului și numărul de telefon",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Eroare de autentificare",
        description: "Trebuie să fiți conectat pentru a iniția un apel",
        variant: "destructive"
      });
      return;
    }

    // Test calls are free - no balance check needed
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('initiate-scheduled-call', {
        body: {
          agent_id: agentId,
          phone_number: phoneNumber,
          contact_name: `Test Call - ${phoneNumber}`,
          user_id: user.id,
          batch_processing: false,
          is_test_call: true
        }
      });
      if (error) {
        console.error('Test call error:', error);
        toast({
          title: "Eroare la inițierea apelului",
          description: error.message || "A apărut o eroare la inițierea apelului de test",
          variant: "destructive"
        });
        return;
      }
      if (data?.success) {
        toast({
          title: "Apel de test inițiat cu succes!",
          description: `Apelul a fost inițiat către ${phoneNumber}. Conversation ID: ${data.conversationId}`
        });

        // Store conversation ID for both later retrieval and real-time tracking
        setConversationId(data.conversationId);
        setCurrentConversationId(data.conversationId);
        
        // Add to history
        addToHistory({
          conversationId: data.conversationId,
          agentId,
          phoneNumber,
        });
        
        // Clear form after successful call
        setAgentId('');
        setPhoneNumber('');
      } else {
        toast({
          title: "Eroare la inițierea apelului",
          description: data?.error || "A apărut o eroare necunoscută",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Test call error:', error);
      toast({
        title: "Eroare la inițierea apelului",
        description: "A apărut o eroare la inițierea apelului de test",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConversation = async (targetConversationId?: string) => {
    const idToFetch = targetConversationId || conversationId;
    
    if (!idToFetch) {
      toast({
        title: "Nu există conversație",
        description: "Vă rugăm să inițiați mai întâi un apel de test",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingConversation(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-elevenlabs-conversation', {
        body: { conversationId: idToFetch }
      });

      if (error) {
        console.error('Error fetching conversation:', error);
        toast({
          title: "Eroare la încărcarea conversației",
          description: error.message || "A apărut o eroare la încărcarea conversației",
          variant: "destructive"
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Conversația nu este încă disponibilă",
          description: "Încercați din nou în câteva momente după finalizarea apelului",
          variant: "destructive"
        });
        return;
      }

      setConversation(data);
      setConversationId(idToFetch);
      
      // Update history with cost if available
      if (data.cost) {
        updateHistoryItem(idToFetch, { cost: parseFloat(data.cost) });
      }
      
      toast({
        title: "Conversația a fost încărcată cu succes!",
        description: "Conversația este afișată mai jos"
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast({
        title: "Eroare la încărcarea conversației",
        description: "A apărut o eroare la încărcarea conversației",
        variant: "destructive"
      });
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleHistoryDoubleClick = (conversationId: string) => {
    fetchConversation(conversationId);
  };

  const renderConversation = () => {
    if (!conversation) return null;

    const messages = conversation.transcript || [];
    
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Conversația ({conversationId})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500">Nu sunt disponibile mesaje pentru această conversație.</p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    message.role === 'agent' 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'bg-gray-50 border-l-4 border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">
                      {message.role === 'agent' ? 'Agent' : 'Utilizator'}
                    </span>
                    {message.timestamp && (
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{message.content || message.text}</p>
                </div>
              ))
            )}
          </div>
          
          {conversation.status && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm"><strong>Status:</strong> {conversation.status}</p>
              {conversation.duration_seconds && (
                <p className="text-sm"><strong>Durată:</strong> {conversation.duration_seconds} secunde</p>
              )}
              {conversation.cost && (
                <p className="text-sm"><strong>Cost:</strong> ${conversation.cost}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-gray-900">Test Apel</h1>
            <p className="text-sm text-gray-500">
              Apeluri de test gratuite
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <AgentSelector
                selectedAgentId={agentId}
                onAgentSelect={setAgentId}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">
                Numărul de telefon
              </label>
              <Input
                placeholder=""
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <Button
              onClick={handleTestCall}
              disabled={isLoading || !agentId || !phoneNumber}
              className="w-full h-12 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Se pornește...' : 'Test'}
            </Button>
          </div>

          {/* Live conversation or Recent calls */}
          {isActive ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-700 text-center">
                Live Conversation
              </div>
              <LiveConversationDialog 
                conversation={realtimeConversation}
                isVisible={true}
              />
            </div>
          ) : history.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm text-gray-700 text-center">
                Recente
              </div>
              <div className="space-y-2">
                {history.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleHistoryDoubleClick(item.conversationId)}
                    className="text-sm p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-blue-600 underline"
                  >
                    {item.phoneNumber}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          {conversationId && (
            <div className="text-center space-y-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-green-600 font-medium">
                Apel activ
              </div>
              <Button
                onClick={() => fetchConversation()}
                disabled={isLoadingConversation}
                variant="outline"
                className="text-sm border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {isLoadingConversation ? 'Se încarcă...' : 'Vezi conversația'}
              </Button>
            </div>
          )}

          {/* Conversation */}
          {conversation && (
            <div className="space-y-3 max-h-60 overflow-y-auto border-t border-gray-200 pt-4">
              {conversation.transcript?.length > 0 ? (
                conversation.transcript.map((message, index) => (
                  <div
                    key={index}
                    className={`text-sm p-3 rounded-lg ${
                      message.role === 'agent'
                        ? 'bg-blue-50 border-l-4 border-blue-500 text-left'
                        : 'bg-gray-50 border-l-4 border-gray-400 text-left ml-4'
                    }`}
                  >
                    <div className="font-medium text-xs text-gray-600 mb-1">
                      {message.role === 'agent' ? 'Agent' : 'Utilizator'}
                    </div>
                    {message.content || message.text}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center">
                  Fără mesaje
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TestCall;