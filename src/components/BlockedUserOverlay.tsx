import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from '@/hooks/use-toast';

interface BlockedUserOverlayProps {
  isBlocked: boolean;
}

export const BlockedUserOverlay: React.FC<BlockedUserOverlayProps> = ({ isBlocked }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  if (!isBlocked) return null;

  const handleSupport = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert([{
          user_id: user.id,
          user_email: user.email || 'unknown@email.com',
          title: 'Cont Blocat - Solicit Deblocare',
          description: 'Contul meu a fost blocat și nu pot accesa aplicația. Vă rog să mă ajutați să deblocați contul.',
          status: 'open',
          priority: 'urgent',
          category: 'blocked_account',
          metadata: {
            source: 'blocked_overlay',
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }]);

      if (error) throw error;

      toast({
        title: "Ticket trimis",
        description: "Am primit solicitarea ta. Echipa de suport te va contacta în curând.",
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut trimite ticketul. Te rog încearcă din nou.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-red-600 flex flex-col items-center justify-center pointer-events-auto">
      <div className="text-center space-y-8 animate-fade-in px-4">
        <AlertTriangle className="w-32 h-32 text-white mx-auto animate-pulse" strokeWidth={2} />
        
        <h1 className="text-9xl font-black text-white tracking-wider drop-shadow-2xl">
          BLOCAT
        </h1>
        
        <p className="text-2xl text-white/90 font-semibold max-w-2xl mx-auto">
          Contul tău a fost restricționat. Toate funcționalitățile sunt blocate.
        </p>
        
        <div className="pt-8">
          <Button 
            onClick={handleSupport}
            size="lg"
            variant="secondary"
            disabled={loading}
            className="bg-white text-red-600 hover:bg-white/90 text-lg px-8 py-6 shadow-2xl"
          >
            <MessageCircle className="h-6 w-6 mr-3" />
            {loading ? 'Se trimite...' : 'Contactează Suportul'}
          </Button>
        </div>
        
        <p className="text-white/70 text-sm mt-8">
          Pentru a debloca contul, te rugăm să contactezi echipa de suport
        </p>
      </div>
    </div>
  );
};