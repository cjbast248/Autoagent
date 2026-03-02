import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlayCircle, Settings, Clock, FolderOpen, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserAgents } from '@/hooks/useUserAgents';

interface Company {
  id: string;
  name: string;
  contact_count?: number;
}

interface ContactList {
  id: string;
  name: string;
  contact_count?: number;
}

interface WorkflowCampaignFormProps {
  selectedCompanyId?: string;
  selectedAgentId?: string;
  onCampaignStart?: (campaignData: any) => void;
}

export const WorkflowCampaignForm: React.FC<WorkflowCampaignFormProps> = ({
  selectedCompanyId,
  selectedAgentId,
  onCampaignStart
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: agents } = useUserAgents();
  
  const [sourceType, setSourceType] = useState<'company' | 'folder'>('folder');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(selectedCompanyId || '');
  const [selectedList, setSelectedList] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(selectedAgentId || '');
  const [campaignName, setCampaignName] = useState('');
  const [callInterval, setCallInterval] = useState('30'); // seconds between calls
  const [maxAttempts, setMaxAttempts] = useState('3');
  const [retryInterval, setRetryInterval] = useState('30'); // minutes between retries
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchContactLists();
  }, [user]);

  const fetchCompanies = async () => {
    if (!user) return;

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
    }
  };

  const fetchContactLists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .select(`
          *,
          workflow_contacts(count)
        `)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const listsWithCount = data?.map(list => ({
        ...list,
        contact_count: list.workflow_contacts?.[0]?.count || 0
      })) || [];

      setContactLists(listsWithCount);
    } catch (error) {
      console.error('Error fetching contact lists:', error);
    }
  };

  const handleStartCampaign = async () => {
    const hasSource = sourceType === 'company' ? selectedCompany : selectedList;
    
    if (!hasSource || !selectedAgent || !campaignName.trim()) {
      toast({
        title: 'Eroare',
        description: 'Trebuie să completezi toate câmpurile obligatorii.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const requestBody: any = {
        name: campaignName,
        agent_id: selectedAgent,
        call_interval_seconds: parseInt(callInterval),
        max_attempts: parseInt(maxAttempts),
        retry_interval_minutes: parseInt(retryInterval)
      };

      if (sourceType === 'company') {
        requestBody.company_id = selectedCompany;
      } else {
        requestBody.list_id = selectedList;
      }

      const { error: startError } = await supabase.functions.invoke('start-workflow-campaign', {
        body: requestBody
      });

      if (startError) throw startError;

      toast({
        title: 'Succes',
        description: 'Campania a fost pornită cu succes!'
      });

      onCampaignStart?.(requestBody);
      
      // Reset form
      setCampaignName('');
      setSelectedCompany('');
      setSelectedList('');
      setSelectedAgent('');
      
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut porni campania.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);
  const selectedListData = contactLists.find(l => l.id === selectedList);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configurare Campanie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="campaign-name">Nume Campanie *</Label>
          <Input
            id="campaign-name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Introduceți numele campaniei..."
          />
        </div>

        <div>
          <Label>Sursă Contacte *</Label>
          <RadioGroup value={sourceType} onValueChange={(value) => setSourceType(value as 'company' | 'folder')} className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="folder" id="folder" />
              <Label htmlFor="folder" className="flex items-center gap-2 cursor-pointer">
                <FolderOpen className="w-4 h-4" />
                Dosar
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="company" id="company" />
              <Label htmlFor="company" className="flex items-center gap-2 cursor-pointer">
                <Building2 className="w-4 h-4" />
                Companie
              </Label>
            </div>
          </RadioGroup>
        </div>

        {sourceType === 'folder' ? (
          <div>
            <Label htmlFor="folder-select">Dosar *</Label>
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează dosarul..." />
              </SelectTrigger>
              <SelectContent>
                {contactLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name} ({list.contact_count || 0} contacte)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedListData && (
              <p className="text-sm text-muted-foreground mt-1">
                Contacte disponibile: {selectedListData.contact_count || 0}
              </p>
            )}
          </div>
        ) : (
          <div>
            <Label htmlFor="company-select">Companie *</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează compania..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name} ({company.contact_count || 0} contacte)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompanyData && (
              <p className="text-sm text-muted-foreground mt-1">
                Contacte disponibile: {selectedCompanyData.contact_count || 0}
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="agent-select">Agent Vocal *</Label>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger>
              <SelectValue placeholder="Selectează agentul..." />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((agent) => (
                <SelectItem key={agent.agent_id} value={agent.agent_id}>
                  {agent.name} {agent.is_active ? <Badge variant="secondary" className="ml-2">Activ</Badge> : <Badge variant="destructive" className="ml-2">Inactiv</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="call-interval" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Interval Apeluri (sec)
            </Label>
            <Input
              id="call-interval"
              type="number"
              value={callInterval}
              onChange={(e) => setCallInterval(e.target.value)}
              placeholder="30"
              min="5"
              max="300"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Timpul dintre apeluri (5-300 secunde)
            </p>
          </div>

          <div>
            <Label htmlFor="max-attempts">Încercări Maxime</Label>
            <Input
              id="max-attempts"
              type="number"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
              placeholder="3"
              min="1"
              max="10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Număr maxim de încercări per contact
            </p>
          </div>

          <div>
            <Label htmlFor="retry-interval">Interval Reîncercare (min)</Label>
            <Input
              id="retry-interval"
              type="number"
              value={retryInterval}
              onChange={(e) => setRetryInterval(e.target.value)}
              placeholder="30"
              min="5"
              max="1440"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Timp până la următoarea încercare
            </p>
          </div>
        </div>

        <Button 
          onClick={handleStartCampaign} 
          disabled={isLoading || (sourceType === 'company' ? !selectedCompany : !selectedList) || !selectedAgent || !campaignName.trim()}
          className="w-full"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {isLoading ? 'Se pornește campania...' : 'Pornește Campania'}
        </Button>
      </CardContent>
    </Card>
  );
};