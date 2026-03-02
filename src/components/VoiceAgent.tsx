import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useGuestRateLimit } from '@/hooks/useGuestRateLimit';
import GuestLimitModal from '@/components/GuestLimitModal';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateCostFromMinutes } from '@/utils/costCalculations';

const VoiceAgent = () => {
  const { user } = useAuth();
  const { guestUsage, isLimitReached, remainingUses, incrementGuestUsage } = useGuestRateLimit();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<any>(null);

  // Check if user should be shown limit modal
  useEffect(() => {
    if (!user && isLimitReached) {
      setShowLimitModal(true);
    }
  }, [user, isLimitReached]);

  const handleVoiceInteraction = async () => {
    // For guest users, check rate limit
    if (!user) {
      if (isLimitReached) {
        setShowLimitModal(true);
        return;
      }
      
      const canProceed = await incrementGuestUsage();
      if (!canProceed) {
        setShowLimitModal(true);
        return;
      }

      // Show remaining uses for guests
      if (remainingUses <= 3 && remainingUses > 0) {
        toast({
          title: "Răspunsuri rămase",
          description: `Îți mai rămân ${remainingUses - 1} răspunsuri gratuite. Înregistrează-te pentru credite nelimitate!`,
        });
      }
    }

    // For authenticated users, track conversation in USD
    if (user) {
      // Create conversation record for tracking
      const { data: conversation } = await supabase
        .from('conversations')
        .insert({
          agent_id: 'default-agent',
          agent_name: 'Assistant Vocal',
          user_id: user.id,
          message_count: 0,
          duration_minutes: 0,
          cost_usd: 0
        })
        .select()
        .single();
      
      setCurrentConversation(conversation);
    }

    // Continue with normal voice interaction logic
    console.log('Voice interaction started');
  };

  const handleConversationEnd = async (durationMinutes: number) => {
    if (user && currentConversation && durationMinutes > 0) {
      const costUsd = calculateCostFromMinutes(durationMinutes);
      const creditsUsed = Math.round(costUsd * 100); // Convert to credits
      
      // Deduct from user balance
      const { error: balanceError } = await supabase.rpc('deduct_balance', {
        p_user_id: user.id,
        p_amount: costUsd,
        p_description: `Convorbire vocală - ${creditsUsed} credite`,
        p_conversation_id: currentConversation.id // Aici folosim UUID-ul valid din tabela conversations
      });

      if (!balanceError) {
        // Update conversation with final duration and cost
        await supabase
          .from('conversations')
          .update({
            duration_minutes: durationMinutes,
            cost_usd: costUsd,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentConversation.id);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Voice Agent UI - keep existing implementation */}
      
      {!user && (
        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm">
            Răspunsuri gratuite folosite: {guestUsage}/10
          </p>
          {remainingUses > 0 && (
            <p className="text-white text-sm">
              Îți mai rămân {remainingUses} răspunsuri gratuite
            </p>
          )}
        </div>
      )}

      <GuestLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        remainingUses={remainingUses}
      />
    </div>
  );
};

export { VoiceAgent };
