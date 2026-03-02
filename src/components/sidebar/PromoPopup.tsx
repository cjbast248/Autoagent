import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PromoData {
    id: string;
    title: string;
    description: string;
    image_url: string;
    credits_reward: number;
    gradient_from: string;
    gradient_to: string;
}

export const PromoPopup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [promo, setPromo] = useState<PromoData | null>(null);
    const [claiming, setClaiming] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;

        const loadPromo = async () => {
            try {
                // Fetch active promo
                const { data: activePromo, error: promoError } = await supabase
                    .from('sidebar_promos')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (promoError) {
                    console.error('Error loading promo:', promoError);
                    return;
                }

                if (!activePromo) {
                    return;
                }

                // Check if user already claimed this promo
                const { data: claimedRecord } = await supabase
                    .from('user_dismissed_promos')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('promo_id', activePromo.id)
                    .maybeSingle();

                // Only show if not claimed yet
                if (!claimedRecord) {
                    setPromo(activePromo);
                    setTimeout(() => setIsVisible(true), 500);
                }
            } catch (err) {
                console.error('Error loading promo:', err);
            }
        };

        loadPromo();
    }, [user]);

    const handleDismiss = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
    };

    const handleClaim = async () => {
        if (!promo || !user || claiming) return;

        try {
            setClaiming(true);
            setIsVisible(false);

            // Add credits to user account
            const { data: profile } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', user.id)
                .single();

            const currentCredits = profile?.credits || 0;
            const newCredits = currentCredits + promo.credits_reward;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ credits: newCredits })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Mark promo as claimed
            await supabase
                .from('user_dismissed_promos')
                .insert({
                    user_id: user.id,
                    promo_id: promo.id
                });

            // Show success message
            toast({
                title: "🎉 Felicitări!",
                description: `Ai primit ${promo.credits_reward.toLocaleString()} credite cadou!`,
                duration: 5000
            });

        } catch (err: any) {
            console.error('Error claiming promo:', err);
            toast({
                title: "Eroare",
                description: "Nu am putut adăuga creditele. Încearcă din nou.",
                variant: "destructive"
            });
            setIsVisible(true);
        } finally {
            setClaiming(false);
        }
    };

    if (!isVisible || !promo) return null;

    const fromColor = promo.gradient_from || 'orange-500';
    const toColor = promo.gradient_to || 'orange-600';

    return (
        <div
            className={`w-full mb-3 relative overflow-hidden rounded-xl bg-gradient-to-r from-${fromColor}/20 to-${toColor}/20 border border-${fromColor}/40 p-4 shadow-lg hover:shadow-xl transition-all duration-300`}
        >
            {/* Background decoration */}
            <div className={`absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-${fromColor}/10 blur-2xl rounded-full`} />

            {/* Dismiss Button */}
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 text-zinc-400 hover:text-zinc-600 transition-colors z-10"
            >
                <X className="w-3 h-3" />
            </button>

            <div className="relative z-0">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-2">
                    {promo.title}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
                    {promo.description}
                </p>

                {/* Image - Clickable */}
                <div
                    onClick={handleClaim}
                    className="cursor-pointer group mb-2"
                >
                    <img
                        src={promo.image_url}
                        alt={promo.title}
                        className="w-full rounded-lg object-cover group-hover:scale-[1.02] transition-transform duration-200"
                        onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%23ccc" width="400" height="200"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImagine indisponibilă%3C/text%3E%3C/svg%3E';
                        }}
                    />
                </div>

                <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className={`w-full py-2 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-${fromColor} to-${toColor} hover:opacity-90 transition-opacity disabled:opacity-50`}
                >
                    {claiming ? 'Se procesează...' : `🎁 Revendică ${promo.credits_reward.toLocaleString()} Credite`}
                </button>
            </div>
        </div>
    );
};
