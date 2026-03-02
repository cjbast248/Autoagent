import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Phone, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface PhoneNumber {
  id: string;
  phone_number: string;
  label: string;
  elevenlabs_phone_id: string;
  is_shared?: boolean;
  owner_user_id?: string;
}

interface PhoneShareManagerProps {
  targetUserId: string;
  targetUserName: string;
}

export const PhoneShareManager = ({ targetUserId, targetUserName }: PhoneShareManagerProps) => {
  const [adminPhones, setAdminPhones] = useState<PhoneNumber[]>([]);
  const [sharedPhones, setSharedPhones] = useState<PhoneNumber[]>([]);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPhones();
  }, [targetUserId]);

  const loadPhones = async () => {
    try {
      // Get current user (admin)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Load admin's own phone numbers (phones they own, regardless of share status)
      const { data: phones, error: phonesError } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('status', 'active')
        .or(`user_id.eq.${currentUser.id},owner_user_id.eq.${currentUser.id}`);

      if (phonesError) throw phonesError;

      // Filter out phones already shared with THIS specific user
      const availablePhones = (phones || []).filter(phone =>
        phone.shared_with_user_id !== targetUserId
      );
      setAdminPhones(availablePhones);

      // Load phones already shared with this user
      const { data, error } = await supabase.functions.invoke('admin-share-phone', {
        body: { 
          action: 'list',
          targetUserId 
        }
      });

      if (error) throw error;
      setSharedPhones(data?.sharedPhones || []);
    } catch (error: any) {
      console.error('Error loading phones:', error);
      toast.error('Eroare la încărcarea numerelor de telefon');
    }
  };

  const handleShare = async () => {
    if (!selectedPhoneId) {
      toast.error('Selectează un număr de telefon');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-share-phone', {
        body: {
          action: 'share',
          phoneId: selectedPhoneId,
          targetUserId
        }
      });

      if (error) throw error;

      toast.success(data.message);
      setSelectedPhoneId('');
      await loadPhones();
    } catch (error: any) {
      console.error('Error sharing phone:', error);
      toast.error(error.message || 'Eroare la partajarea numărului');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async (sharedPhoneId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-share-phone', {
        body: {
          action: 'unshare',
          sharedPhoneId
        }
      });

      if (error) throw error;

      toast.success(data.message);
      await loadPhones();
    } catch (error: any) {
      console.error('Error unsharing phone:', error);
      toast.error(error.message || 'Eroare la revocarea numărului');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4" />
        <h3 className="font-semibold">Partajare Numere de Telefon</h3>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Select value={selectedPhoneId} onValueChange={setSelectedPhoneId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selectează număr de telefon" />
            </SelectTrigger>
            <SelectContent>
              {adminPhones.map((phone) => (
                <SelectItem key={phone.id} value={phone.id}>
                  {phone.label} - {phone.phone_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleShare} 
            disabled={!selectedPhoneId || isLoading}
            size="sm"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Partajează
          </Button>
        </div>

        {sharedPhones.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Numere partajate cu {targetUserName}:
            </p>
            {sharedPhones.map((phone) => (
              <div 
                key={phone.id}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{phone.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {phone.phone_number}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnshare(phone.id)}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
