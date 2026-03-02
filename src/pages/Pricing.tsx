import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Sparkles, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

// Normalize plan name from database
const normalizePlan = (plan: string | null): string => {
  if (!plan) return 'free';
  const lowerPlan = plan.toLowerCase();
  if (lowerPlan === 'starter' || lowerPlan === 'free trial') return 'free';
  if (lowerPlan === 'professional') return 'pro';
  if (['free', 'pro', 'business', 'enterprise'].includes(lowerPlan)) return lowerPlan;
  return 'free';
};

// Plan hierarchy (index = rank, higher = better)
const PLAN_ORDER = ['free', 'pro', 'business', 'enterprise'];

const getPlanRank = (planId: string): number => {
  const index = PLAN_ORDER.indexOf(planId);
  return index === -1 ? 0 : index;
};

const PricingPage = () => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');

  // Fetch user's current plan from database
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setUserPlan(normalizePlan(data.plan));
      }
    };

    fetchUserPlan();
  }, [user?.id]);

  const handleSubscribe = (planName: string, price: number | null) => {
    if (price === null) {
      window.location.href = 'mailto:contact@agentauto.app?subject=Enterprise Plan Inquiry';
      toast.info('Se deschide clientul de email...');
    } else {
      toast.info(`Abonamentul ${planName} va fi disponibil în curând!`);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      priceDisplay: '$0',
      priceSuffix: '/ forever',
      icon: 'sparkles',
      credits: '10k',
      creditsLabel: 'Credits Included',
      features: [
        { title: 'Standard Voices', subtitle: 'Basic quality generation' },
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 330,
      priceDisplay: '$330',
      priceSuffix: '/ month',
      credits: '2M',
      creditsLabel: 'Credits Included',
      features: [
        { title: '0.18 $ / 1k extra', subtitle: 'Overage pricing' },
        { title: '15 Concurrent', subtitle: 'Simultaneous calls' },
      ]
    },
    {
      id: 'business',
      name: 'Business',
      price: 1320,
      priceDisplay: '$1320',
      priceSuffix: '/ month',
      isRecommended: true,
      credits: '11M',
      creditsLabel: 'Credits Included',
      features: [
        { title: '0.10 $ / 1k extra', subtitle: 'Best value overage' },
        { title: '5 Custom Voices', subtitle: 'Clone your own agents' },
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      priceDisplay: 'Custom',
      priceSuffix: '/ volume based',
      icon: 'building',
      credits: '∞',
      creditsLabel: 'Unlimited Scale',
      features: [
        { title: 'As low as $0.03', subtitle: 'Per 1k credits' },
        { title: 'Dedicated Support', subtitle: '24/7 SLA Access' },
      ]
    }
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10">
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl">
          <h1 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">
            Abonamente
          </h1>
          <h2 className="text-4xl md:text-5xl font-bold text-black tracking-tight mb-6">
            Scalable power. <br />Predictable costs.
          </h2>

          {/* Billing Toggle */}
          <div className="inline-flex bg-zinc-100 p-1 rounded-full relative">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-xs font-bold transition ${
                billingCycle === 'monthly'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-500 hover:text-black'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-xs font-bold transition ${
                billingCycle === 'yearly'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-500 hover:text-black'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="w-full max-w-[1400px]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 border border-zinc-100">
            {plans.map((plan) => {
              const isActive = activePlan === plan.id;
              const isEnterprise = plan.id === 'enterprise';
              const isCurrent = userPlan === plan.id;
              const isDowngrade = getPlanRank(plan.id) < getPlanRank(userPlan);
              const isDisabled = isCurrent || isDowngrade;

              return (
                <div
                  key={plan.id}
                  onMouseEnter={() => setActivePlan(plan.id)}
                  onMouseLeave={() => setActivePlan(null)}
                  className={`relative p-8 md:p-12 border-r border-zinc-100 last:border-r-0 flex flex-col justify-between min-h-[700px] transition-all duration-400 cursor-pointer ${
                    isActive
                      ? 'bg-black text-white z-10 scale-y-[1.02] shadow-2xl'
                      : isEnterprise
                        ? 'bg-zinc-50/50 text-black'
                        : 'bg-white text-black'
                  }`}
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div>
                    {/* Header with Icon */}
                    <div className="flex justify-between items-start mb-10">
                      <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                      {plan.isRecommended && isActive && (
                        <span className="px-2 py-1 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded-sm">
                          Recommended
                        </span>
                      )}
                      {plan.icon === 'sparkles' && (
                        <Sparkles className={`w-5 h-5 transition ${isActive ? 'text-zinc-600' : 'text-zinc-300'}`} />
                      )}
                      {plan.icon === 'building' && (
                        <Building2 className={`w-5 h-5 transition ${isActive ? 'text-white' : 'text-zinc-300'}`} />
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-2">
                      <span className={`font-bold tracking-tighter ${plan.price === null ? 'text-4xl' : 'text-6xl'}`}>
                        {plan.priceDisplay}
                      </span>
                    </div>
                    <p className={`text-xs font-medium mb-12 ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {plan.priceSuffix}
                    </p>

                    {/* Features */}
                    <div className="space-y-6">
                      {/* Credits */}
                      <div className={`pt-6 mt-6 border-t ${isActive ? 'border-white/10' : 'border-black/5'}`}>
                        <p className="text-3xl font-bold tracking-tight">{plan.credits}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isActive ? 'text-zinc-400' : 'text-zinc-400'}`}>
                          {plan.creditsLabel}
                        </p>
                      </div>

                      {/* Other Features */}
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className={`pt-6 mt-6 border-t ${isActive ? 'border-white/10' : 'border-black/5'}`}>
                          <p className="text-sm font-medium">{feature.title}</p>
                          <p className={`text-[10px] mt-0.5 ${isActive ? 'text-zinc-400' : 'text-zinc-400'}`}>
                            {feature.subtitle}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.name, plan.price)}
                    disabled={isDisabled}
                    className={`w-full py-4 mt-12 text-xs font-bold uppercase tracking-widest transition ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:scale-[1.02]'
                    } ${
                      isActive
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : isDowngrade ? 'Included' : plan.price !== null ? 'Upgrade' : 'Contact Sales'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Links */}
          <div className="grid grid-cols-4 border-l border-r border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <div className="p-4 border-r border-zinc-100 text-center hover:text-black cursor-pointer transition">
              Documentation
            </div>
            <div className="p-4 border-r border-zinc-100 text-center hover:text-black cursor-pointer transition">
              API Status
            </div>
            <div className="p-4 border-r border-zinc-100 text-center hover:text-black cursor-pointer transition">
              Refund Policy
            </div>
            <div className="p-4 text-center hover:text-black cursor-pointer transition">
              Contact
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PricingPage;
