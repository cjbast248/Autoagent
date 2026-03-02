import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Copy, Activity, Clock, Webhook, Globe, Eye, ArrowLeft } from 'lucide-react';

interface InboundWebhook {
  id: string;
  user_id: string;
  webhook_name: string;
  webhook_token: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_received_at: string | null;
  total_requests: number;
}

interface WebhookData {
  id: string;
  webhook_url_id: string;
  received_data: any;
  source_ip: string;
  received_at: string;
}

const Webhooks = () => {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<InboundWebhook[]>([]);
  const [webhookData, setWebhookData] = useState<WebhookData[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<InboundWebhook | null>(null);
  const [isViewDataDialogOpen, setIsViewDataDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    webhook_name: '',
    description: ''
  });

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('user_webhook_urls' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks((data as any) || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast({
        title: "Error",
        description: "Failed to load webhooks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookData = async (webhookId: string) => {
    try {
      const { data, error } = await supabase
        .from('webhook_received_data' as any)
        .select('*')
        .eq('webhook_url_id', webhookId)
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setWebhookData((data as any) || []);
    } catch (error) {
      console.error('Error fetching webhook data:', error);
      toast({
        title: "Error",
        description: "Failed to load webhook data",
        variant: "destructive"
      });
    }
  };

  const createWebhook = async () => {
    if (!formData.webhook_name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a webhook name",
        variant: "destructive"
      });
      return;
    }

    if (webhooks.length >= 3) {
      toast({
        title: "Error",
        description: "Maximum of 3 webhooks allowed per user",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate unique token
      const token = `kalina_${crypto.randomUUID().replace(/-/g, '')}`;
      
      const { data, error } = await supabase
        .from('user_webhook_urls' as any)
        .insert({
          webhook_name: `Kalina ${formData.webhook_name}`,
          webhook_token: token,
          description: formData.description,
          is_active: true,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setWebhooks([data as any, ...webhooks]);
      setIsCreateDialogOpen(false);
      
      setFormData({
        webhook_name: '',
        description: ''
      });

      toast({
        title: "Success",
        description: "Webhook created successfully"
      });
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast({
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive"
      });
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_webhook_urls' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWebhooks(webhooks.filter(w => w.id !== id));
      toast({
        title: "Success",
        description: "Webhook deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive"
      });
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_webhook_urls' as any)
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setWebhooks(webhooks.map(w => 
        w.id === id ? { ...w, is_active: isActive } : w
      ));

      toast({
        title: "Success",
        description: `Webhook ${isActive ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast({
        title: "Error",
        description: "Failed to update webhook",
        variant: "destructive"
      });
    }
  };

  const copyWebhookUrl = (webhook: InboundWebhook) => {
    const webhookUrl = `https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/kalina-webhook/${webhook.webhook_token}`;
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard"
    });
  };

  const openDataViewer = (webhook: InboundWebhook) => {
    setSelectedWebhook(webhook);
    fetchWebhookData(webhook.id);
    setIsViewDataDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header with back button */}
        <div className="space-y-6">
          <Link to="/account/integrations" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            Connectors
          </Link>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <Webhook className="w-6 h-6 text-gray-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">Webhooks</h1>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Enabled</Badge>
              </div>
              <p className="text-gray-500 mt-1">
                Receive and send data through webhook URLs
              </p>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <section className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Overview</h2>
          <p className="text-sm text-gray-500 mb-6">
            Generate unique webhook URLs to receive data from external platforms. You can create up to 3 webhooks.
          </p>
          
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Webhook URLs</p>
              <p className="text-sm text-gray-500">Create and manage your webhook endpoints</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={webhooks.length >= 3}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Webhook {webhooks.length > 0 && `(${webhooks.length}/3)`}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New Webhook</DialogTitle>
                  <DialogDescription>
                    Create a unique webhook URL to receive data from other platforms
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook_name">Webhook Name</Label>
                    <Input
                      id="webhook_name"
                      value={formData.webhook_name}
                      onChange={(e) => setFormData({...formData, webhook_name: e.target.value})}
                      placeholder="Integration Name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Will be prefixed with "Kalina"
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="What will this webhook be used for?"
                      rows={3}
                    />
                  </div>

                  <Button onClick={createWebhook} className="w-full">
                    Generate Webhook URL
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Webhooks List */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
            <Webhook className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No webhooks yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create your first webhook to start receiving data
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Webhook
            </Button>
          </div>
        ) : (
          <section className="space-y-3">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="border border-gray-200 rounded-xl bg-white p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Webhook className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">{webhook.webhook_name}</h3>
                        <Badge variant={webhook.is_active ? "default" : "secondary"} className="text-xs">
                          {webhook.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {webhook.description && (
                        <p className="text-sm text-gray-500">{webhook.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Webhook URL */}
                <div className="mb-4">
                  <Label className="text-xs font-medium text-gray-500 mb-2 block">WEBHOOK URL</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <code className="text-xs flex-1 truncate text-gray-700">
                      https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/kalina-webhook/{webhook.webhook_token}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyWebhookUrl(webhook)}
                      className="h-7 px-2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Requests:</span>
                    <span className="font-medium text-gray-900">{webhook.total_requests.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Last:</span>
                    <span className="font-medium text-gray-900">
                      {webhook.last_received_at 
                        ? new Date(webhook.last_received_at).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Never'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDataViewer(webhook)}
                    className="ml-auto h-8"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Data
                  </Button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* View Webhook Data Dialog */}
        <Dialog open={isViewDataDialogOpen} onOpenChange={setIsViewDataDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedWebhook?.webhook_name} - Received Data
              </DialogTitle>
              <DialogDescription>
                Recent webhook requests received from external platforms
              </DialogDescription>
            </DialogHeader>
            
            {webhookData.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No data received yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhookData.map((data) => (
                  <Card key={data.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="text-xs text-muted-foreground">
                          {new Date(data.received_at).toLocaleString('ro-RO')}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {data.source_ip}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(data.received_data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Webhooks;
