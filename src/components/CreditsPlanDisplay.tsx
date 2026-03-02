import React from 'react';
import { useAuth } from '@/components/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserBalance } from '@/hooks/useUserBalance';
import { usdToCredits } from '@/utils/costCalculations';
import { Crown, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreditsPlanDisplay = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const { data: userBalance, isLoading } = useUserBalance();
  
  if (!user || isLoading) {
    return null;
  }
  
  const monthlyFreeCredits = userBalance?.monthly_free_credits ?? 10000;
  const monthlyCreditsUsed = userBalance?.monthly_credits_used ?? 0;
  const remainingFreeCredits = monthlyFreeCredits - monthlyCreditsUsed;
  const paidCredits = usdToCredits(userBalance?.balance_usd ?? 0);

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Credits Balance - ElevenLabs style */}
      <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm">
        <div className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-500">Total</span>
          <span className="font-medium text-gray-900">{monthlyFreeCredits.toLocaleString()}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Remaining</span>
          <span className="font-medium text-gray-900">{remainingFreeCredits.toLocaleString()}</span>
        </div>
        {paidCredits > 0 && (
          <>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Paid</span>
              <span className="font-medium text-green-600">{paidCredits.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>

      {/* Upgrade Button */}
      <button
        onClick={handleUpgrade}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Crown className="w-4 h-4" />
        <span>{t('settings.upgrade') || 'Upgrade'}</span>
      </button>
    </div>
  );
};

export default CreditsPlanDisplay;
