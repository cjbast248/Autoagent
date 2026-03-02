import React, { useState } from 'react';
import { Building2, Users, Webhook, Settings, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface Company {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  contact_count?: number;
}

interface CompanyCardProps {
  company: Company;
  onDeleted: (companyId: string) => void;
  onSelect: (company: Company) => void;
}

export function CompanyCard({ company, onDeleted, onSelect }: CompanyCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('companies.successDeleted'),
      });
      onDeleted(company.id);
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: t('common.error'),
        description: t('companies.errorDeleted'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{company.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/account/data/company/${company.id}`)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('companies.deleteCompany')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('companies.deleteConfirm')} "{company.name}"? 
                    {t('companies.deleteWarning')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? t('companies.deleting') : t('companies.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {company.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {company.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{company.contact_count || 0} {t('companies.contacts')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Webhook className="w-4 h-4 text-muted-foreground" />
              <span>{t('companies.webhookActive')}</span>
            </div>
          </div>

          {/* Date */}
          <div className="text-xs text-muted-foreground">
            {t('companies.created')}: {formatDate(company.created_at)}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate(`/account/data/company/${company.id}`)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('companies.viewContacts')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}