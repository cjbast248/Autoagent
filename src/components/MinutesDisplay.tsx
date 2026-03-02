import React from 'react';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useAuth } from '@/components/AuthContext';
import { Coins, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { convertBalanceToMinutes, usdToCredits } from '@/utils/costCalculations';

const MinutesDisplay = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { data: balance, isLoading } = useUserBalance();

  if (!user || isLoading) {
    return null;
  }

  const monthlyFreeCredits = balance?.monthly_free_credits ?? 10000;
  const monthlyCreditsUsed = balance?.monthly_credits_used ?? 0;
  const remainingFreeCredits = monthlyFreeCredits - monthlyCreditsUsed;
  const paidCredits = usdToCredits(balance?.balance_usd ?? 0);
  
  // Total available credits = free remaining + paid
  const totalAvailable = remainingFreeCredits + paidCredits;
  const availableMinutes = Math.floor(totalAvailable / 10); // Approx 10 credits per minute

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 rounded-lg">
        <Coins className="w-4 h-4 text-yellow-600" />
        <span className="text-sm text-yellow-700 font-medium">
          {remainingFreeCredits.toLocaleString()} / {monthlyFreeCredits.toLocaleString()}
        </span>
      </div>
      {paidCredits > 0 && (
        <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-lg">
          <Coins className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            +{paidCredits.toLocaleString()} paid
          </span>
        </div>
      )}
      <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
        <Clock className="w-4 h-4 text-blue-600" />
        <span className="text-sm text-blue-700 font-medium">
          ~{availableMinutes} min
        </span>
      </div>
      <Button
        onClick={handleUpgrade}
        size="sm"
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Funds
      </Button>
    </div>
  );
};

export default MinutesDisplay;
