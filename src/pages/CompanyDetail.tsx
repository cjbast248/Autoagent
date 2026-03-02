import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Webhook, TestTube, Copy, Check, Phone, User, MapPin, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Company {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  language: string | null;
  location: string | null;
  metadata: any;
  created_at: string;
}

interface CallHistory {
  id: string;
  agent_id: string | null;
  conversation_id: string | null;
  call_date: string;
  call_status: string;
  duration_seconds: number | null;
  cost_usd: number | null;
}

export default function CompanyDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (user && companyId) {
      fetchCompanyData();
    }
  }, [user, companyId]);

  const fetchCompanyData = async () => {
    if (!user || !companyId) return;

    setIsLoading(true);
    try {
      // Fetch company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('company_contacts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;
      setContacts((contactsData || []).map(c => ({
        ...c,
        language: c.country || 'ro' // Map country to language
      })));

      // Generate webhook URL
      const baseUrl = window.location.origin;
      setWebhookUrl(`${baseUrl}/api/webhook/company/${companyId}`);

    } catch (error) {
      console.error('Error fetching company data:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca datele companiei.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !company) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('telefon'));
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('nume'));
    const countryIndex = headers.findIndex(h => h.includes('country') || h.includes('tara'));
    const locationIndex = headers.findIndex(h => h.includes('location') || h.includes('locatie'));

    if (phoneIndex === -1) {
      toast({
        title: 'Eroare',
        description: 'Fișierul CSV trebuie să conțină o coloană pentru telefon.',
        variant: 'destructive',
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Eroare',
        description: 'Nu ești autentificat.',
        variant: 'destructive',
      });
      return;
    }

    const contactsToInsert = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        company_id: company.id,
        user_id: user.id,
        phone: values[phoneIndex],
        name: nameIndex >= 0 ? values[nameIndex] : 'Contact',
        country: countryIndex >= 0 ? values[countryIndex] : null,
        location: locationIndex >= 0 ? values[locationIndex] : null,
      };
    }).filter(contact => contact.phone);

    try {
      const { error } = await supabase
        .from('company_contacts')
        .insert(contactsToInsert);

      if (error) throw error;

      toast({
        title: 'Succes',
        description: `Au fost importate ${contactsToInsert.length} contacte.`,
      });

      fetchCompanyData();
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut importa contactele.',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) return;

    try {
      const contact = contacts.find(c => c.phone === testPhone.trim());
      if (!contact) {
        toast({
          title: 'Nu s-a găsit',
          description: 'Contactul nu există în baza de date.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch call history for this contact
      const { data: callData, error: callError } = await supabase
        .from('call_history')
        .select('*')
        .eq('phone_number', testPhone.trim())
        .eq('user_id', user?.id)
        .order('call_date', { ascending: false });

      const result = {
        contact: {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          language: contact.language || 'ro',
          location: contact.location,
          metadata: contact.metadata,
          created_at: contact.created_at
        },
        conversations: callData || [],
        total_calls: callData?.length || 0,
        last_call: callData?.[0]?.call_date || null
      };

      setTestResult(result);
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca datele pentru test.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: 'Copiat',
        description: 'URL-ul webhook-ului a fost copiat.',
      });
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut copia URL-ul.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Compania nu a fost găsită</h1>
        <Button onClick={() => navigate('/account/data')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Înapoi la Date
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/account/data')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{company.name}</h1>
          {company.description && (
            <p className="text-muted-foreground">{company.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contacts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Contacte ({contacts.length})
            </CardTitle>
            <div className="flex gap-2">
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </span>
                </Button>
              </Label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVUpload}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nu există contacte. Importă un fișier CSV pentru a începe.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nume</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Locație</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.slice(0, 5).map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>{contact.name || 'N/A'}</TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell>
                          {contact.location && contact.language 
                            ? `${contact.location}, ${contact.language}`
                            : contact.location || contact.language || 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {contacts.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  și încă {contacts.length - 5} contacte...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Webhook Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Webhook API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL Webhook</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-2">
                <TestTube className="w-4 h-4" />
                Test Webhook
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Numărul de telefon pentru test"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <Button onClick={handleTest} disabled={!testPhone.trim()}>
                  Test
                </Button>
              </div>
            </div>

            {testResult && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-semibold mb-2">Rezultat test:</h4>
                <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}