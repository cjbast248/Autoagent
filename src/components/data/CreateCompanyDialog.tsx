import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface CreateCompanyDialogProps {
  onCompanyCreated: () => void;
}

export function CreateCompanyDialog({ onCompanyCreated }: CreateCompanyDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.name.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          description: formData.description.trim() || null
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('companies.successCreated'),
      });

      setFormData({ name: '', description: '' });
      setIsOpen(false);
      onCompanyCreated();
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: t('common.error'),
        description: t('companies.errorCreated'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('companies.newCompany')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('companies.createCompany')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('companies.companyName')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('companies.namePlaceholder')}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">{t('companies.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('companies.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? t('companies.creating') : t('companies.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}