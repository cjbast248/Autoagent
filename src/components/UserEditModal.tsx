import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PhoneShareManager } from "@/components/admin/PhoneShareManager";
import { Separator } from "@/components/ui/separator";
import { KeyRound, Sparkles, Crown, Building2, Rocket, Download } from 'lucide-react';

// Plan configuration with credits
const PLAN_CONFIG: Record<string, { name: string; credits: number; price: string; icon: any; color: string }> = {
  free: { name: 'Free', credits: 10000, price: '$0/forever', icon: Sparkles, color: 'text-zinc-500' },
  pro: { name: 'Pro', credits: 2000000, price: '$330/mo', icon: Rocket, color: 'text-blue-600' },
  business: { name: 'Business', credits: 11000000, price: '$1320/mo', icon: Crown, color: 'text-purple-600' },
  enterprise: { name: 'Enterprise', credits: 50000000, price: 'Custom', icon: Building2, color: 'text-amber-600' },
};

const formatCredits = (credits: number) => {
  if (credits >= 1000000) {
    return `${(credits / 1000000).toFixed(0)}M`;
  } else if (credits >= 1000) {
    return `${(credits / 1000).toFixed(0)}k`;
  }
  return credits.toString();
};

interface AdminUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  account_type: string;
  user_role: 'admin' | 'moderator' | 'user';
  balance_usd: number;
  plan: string;

}

interface UserEditModalProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  open,
  onOpenChange,
  onUserUpdated
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    account_type: 'regular',
    user_role: 'user' as 'admin' | 'moderator' | 'user',
    balance_usd: 0,
    plan: 'free',

  });

  // Normalize plan name from database
  const normalizePlan = (plan: string | null): string => {
    if (!plan) return 'free';
    const lowerPlan = plan.toLowerCase();
    // Map old plan names to new ones
    if (lowerPlan === 'starter' || lowerPlan === 'free trial') return 'free';
    if (lowerPlan === 'professional') return 'pro';
    if (['free', 'pro', 'business', 'enterprise'].includes(lowerPlan)) return lowerPlan;
    return 'free';
  };

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        account_type: user.account_type || 'regular',
        user_role: user.user_role || 'user',
        balance_usd: user.balance_usd || 0,
        plan: normalizePlan(user.plan),
      });
    }
  }, [user]);

  const handleResetPassword = async () => {
    if (!user) return;

    if (!confirm(`Sigur vrei să trimiți un email de resetare parolă către ${user.email}?`)) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          target_user_id: user.user_id,
          target_email: user.email
        }
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: `Email de resetare parolă trimis către ${user.email}`,
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut trimite email-ul de resetare parolă.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const adminUserId = (await supabase.auth.getUser()).data.user?.id;

      // Update profile (without plan - plan is updated separately)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          account_type: formData.account_type,
        })
        .eq('id', user.user_id);

      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase.rpc('admin_change_role', {
        p_target_user_id: user.user_id,
        p_new_role: formData.user_role,
        p_admin_user_id: adminUserId
      });

      if (roleError) throw roleError;

      // Update balance (paid credits)
      const { error: balanceError } = await supabase.rpc('admin_modify_balance', {
        p_target_user_id: user.user_id,
        p_balance_amount: formData.balance_usd,
        p_operation: 'set',
        p_admin_user_id: adminUserId
      });

      if (balanceError) throw balanceError;

      // Update plan if changed (this also updates monthly_free_credits)
      const normalizedCurrentPlan = normalizePlan(user.plan);
      if (formData.plan !== normalizedCurrentPlan) {
        const { data: planResult, error: planError } = await supabase.rpc('admin_change_user_plan', {
          p_admin_user_id: adminUserId,
          p_target_user_id: user.user_id,
          p_new_plan: formData.plan
        });

        if (planError) throw planError;

        const planConfig = PLAN_CONFIG[formData.plan];
        toast({
          title: "Plan Actualizat",
          description: `Planul a fost schimbat în ${planConfig.name} (${formatCredits(planConfig.credits)} credite/lună)`,
        });
      }

      toast({
        title: "Succes",
        description: "Utilizatorul a fost actualizat cu succes.",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut actualiza utilizatorul.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const selectedPlanConfig = PLAN_CONFIG[formData.plan] || PLAN_CONFIG.free;
  const PlanIcon = selectedPlanConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editează Utilizator</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prenume</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nume</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_type">Tip Cont</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="banned">Blocat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_role">Rol</Label>
              <Select
                value={formData.user_role}
                onValueChange={(value) => setFormData({ ...formData, user_role: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilizator</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Plan Selection - Prominent */}
          <div className="space-y-2">
            <Label htmlFor="plan" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Plan Subscripție
            </Label>
            <Select
              value={formData.plan}
              onValueChange={(value) => setFormData({ ...formData, plan: value })}
            >
              <SelectTrigger className="h-auto py-3">
                <div className="flex items-center gap-3">
                  <PlanIcon className={`h-5 w-5 ${selectedPlanConfig.color}`} />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{selectedPlanConfig.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCredits(selectedPlanConfig.credits)} credite/lună • {selectedPlanConfig.price}
                    </span>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLAN_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key} className="py-3">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        <div className="flex flex-col">
                          <span className="font-semibold">{config.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCredits(config.credits)} credite/lună • {config.price}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Schimbarea planului va reseta creditele lunare și va începe un nou ciclu de facturare.
            </p>
          </div>

          {/* Balance (Paid Credits) */}
          <div className="space-y-2">
            <Label htmlFor="balance">Credite Extra (plătite)</Label>
            <div className="flex gap-2">
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.balance_usd}
                onChange={(e) => setFormData({ ...formData, balance_usd: parseFloat(e.target.value) || 0 })}
                placeholder="Valoare în USD"
                className="flex-1"
              />
              <div className="flex items-center px-3 bg-muted rounded-md text-sm font-mono">
                {Math.round(formData.balance_usd * 100).toLocaleString()} cr
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              1 USD = 100 credite. Aceste credite sunt separate de cele incluse în plan.
            </p>
          </div>

          <Separator />

          {/* Special Permissions */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Download className="h-4 w-4" />
              Permisiuni Speciale
            </Label>


          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleResetPassword}
            disabled={loading}
            className="mr-auto"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Resetează Parola
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Se salvează...' : 'Salvează'}
            </Button>
          </div>
        </DialogFooter>

        <Separator className="my-6" />

        {/* Phone Share Manager */}
        <PhoneShareManager
          targetUserId={user.user_id}
          targetUserName={`${user.first_name} ${user.last_name}`}
        />
      </DialogContent>
    </Dialog>
  );
};
