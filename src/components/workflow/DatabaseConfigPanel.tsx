import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Database, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  contact_count?: number;
}

interface DatabaseConfigPanelProps {
  onCompanySelect: (companyId: string, companyName: string, contactCount: number) => void;
  selectedCompanyId?: string;
}

export const DatabaseConfigPanel: React.FC<DatabaseConfigPanelProps> = ({
  onCompanySelect,
  selectedCompanyId
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(selectedCompanyId || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, [user]);

  const fetchCompanies = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          company_contacts(count)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const companiesWithCount = data?.map(company => ({
        ...company,
        contact_count: company.company_contacts?.[0]?.count || 0
      })) || [];

      setCompanies(companiesWithCount);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca companiile.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    const company = companies.find(c => c.id === companyId);
    if (company) {
      onCompanySelect(companyId, company.name, company.contact_count || 0);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Configurare Bază de Date
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="company-select">Selectează Compania</Label>
          <Select value={selectedCompany} onValueChange={handleCompanyChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Alege compania pentru contacte..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {company.name}
                    <Badge variant="secondary">
                      {company.contact_count || 0} contacte
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCompanyData && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Companie Selectată:</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Nume:</strong> {selectedCompanyData.name}</p>
              <p><strong>Contacte disponibile:</strong> {selectedCompanyData.contact_count || 0}</p>
            </div>
          </div>
        )}

        {companies.length === 0 && !isLoading && (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nu ai companii create.</p>
            <p className="text-sm">Mergi la pagina Date pentru a crea o companie.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};