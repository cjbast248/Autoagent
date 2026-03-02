import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/AuthContext';
import { Mail, Bell, Send, Users, MessageSquare, Calendar, Target, TrendingUp, Loader2, CheckCircle, XCircle, AlertCircle, MessageCircle, Gift, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'notification' | 'announcement';
  status: 'draft' | 'scheduled' | 'sent';
  recipients: number;
  openRate?: number;
  clickRate?: number;
  createdAt: string;
  scheduledAt?: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  announcement_type: 'info' | 'warning' | 'success' | 'promotion';
  email_type: 'email' | 'notification' | 'announcement';
  is_active: boolean;
  target_users: 'all' | 'premium' | 'free' | 'active';
  send_status: 'draft' | 'sending' | 'completed' | 'failed';
  total_recipients: number;
  emails_sent: number;
  emails_failed: number;
  sent_at: string | null;
  created_at: string;
  admin_user_id: string;
}

const MarketingNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState('announcements');
  const [loading, setLoading] = useState(false);
  const [sendingAnnouncementId, setSendingAnnouncementId] = useState<string | null>(null);
  const [sendingToTelegram, setSendingToTelegram] = useState(false);

  // New Campaign Form
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'email' as const,
    subject: '',
    message: '',
    targetUsers: 'all',
    scheduleDate: ''
  });

  // Sidebar Promo State
  interface Promo {
    id: string;
    title: string;
    description: string;
    image_url: string;
    credits_reward: number;
    is_active: boolean;
    gradient_from: string;
    gradient_to: string;
  }
  const [promos, setPromos] = useState<Promo[]>([]);
  const [newPromo, setNewPromo] = useState({
    title: '',
    description: '',
    imageUrl: '',
    creditsReward: 100000,
    isActive: true
  });

  // New Announcement Form
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    emailType: 'announcement' as const,
    targetUsers: 'all' as const,
    isActive: true
  });

  useEffect(() => {
    loadAnnouncements();
    // Safely load promos, ignoring error if table doesn't exist
    loadPromos().catch(() => {
      console.warn('Sidebar promos table not found. Run migration to create it.');
    });

    // Mock data for campaigns (kept for UI demonstration)
    setCampaigns([
      {
        id: '1',
        name: 'Welcome Email Series',
        type: 'email',
        status: 'sent',
        recipients: 1250,
        openRate: 65.2,
        clickRate: 12.8,
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        name: 'Feature Update Notification',
        type: 'notification',
        status: 'scheduled',
        recipients: 890,
        createdAt: '2024-01-14T14:20:00Z',
        scheduledAt: '2024-01-16T09:00:00Z'
      }
    ]);
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAnnouncements(data as Announcement[] || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut încărca anunțurile.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      toast({
        title: "Eroare",
        description: "Completează toate câmpurile obligatorii.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Eroare",
        description: "Nu sunteți autentificat.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('marketing_announcements')
        .insert({
          admin_user_id: user.id,
          title: newAnnouncement.title,
          message: newAnnouncement.message,
          announcement_type: newAnnouncement.type,
          email_type: newAnnouncement.emailType,
          target_users: newAnnouncement.targetUsers,
          is_active: newAnnouncement.isActive,
          send_status: 'draft'
        });

      if (error) throw error;

      setNewAnnouncement({
        title: '',
        message: '',
        type: 'info',
        emailType: 'announcement',
        targetUsers: 'all',
        isActive: true
      });

      await loadAnnouncements();

      toast({
        title: "Succes",
        description: "Anunțul a fost creat cu succes. Apasă 'Trimite Email' pentru a-l trimite utilizatorilor.",
      });
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu am putut crea anunțul.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendAnnouncement = async (announcementId: string) => {
    if (!user) return;

    try {
      setSendingAnnouncementId(announcementId);

      const { data, error } = await supabase.functions.invoke('send-marketing-announcement', {
        body: { announcement_id: announcementId }
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: data.message || "Anunțul a fost trimis cu succes!",
        duration: 5000,
      });

      await loadAnnouncements();
    } catch (error: any) {
      console.error('Error sending announcement:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu am putut trimite anunțul.",
        variant: "destructive"
      });
    } finally {
      setSendingAnnouncementId(null);
    }
  };

  const toggleAnnouncement = async (id: string) => {
    try {
      const announcement = announcements.find(a => a.id === id);
      if (!announcement) return;

      const { error } = await supabase
        .from('marketing_announcements')
        .update({ is_active: !announcement.is_active })
        .eq('id', id);

      if (error) throw error;

      await loadAnnouncements();

      toast({
        title: "Succes",
        description: `Anunțul a fost ${!announcement.is_active ? 'activat' : 'dezactivat'}.`,
      });
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut actualiza anunțul.",
        variant: "destructive"
      });
    }
  };

  const sendAllUsersToTelegram = async () => {
    if (!user) return;

    try {
      setSendingToTelegram(true);

      const { data, error } = await supabase.functions.invoke('telegram-send-all-users', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: `Trimise ${data.successCount} notificări pe Telegram din ${data.totalUsers} utilizatori.`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Error sending to Telegram:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu am putut trimite notificările pe Telegram.",
        variant: "destructive"
      });
    } finally {
      setSendingToTelegram(false);
    }
  };

  const loadPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('sidebar_promos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Sidebar promos table might not exist yet:', error.message);
        return;
      }

      setPromos(data || []);
    } catch (error) {
      console.error('Error loading promos:', error);
    }
  };

  const createPromo = async () => {
    if (!newPromo.title || !newPromo.description || !newPromo.imageUrl) {
      toast({ title: "Eroare", description: "Titlu, descriere și imagine sunt obligatorii", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('sidebar_promos')
        .insert({
          title: newPromo.title,
          description: newPromo.description,
          image_url: newPromo.imageUrl,
          credits_reward: newPromo.creditsReward,
          is_active: newPromo.isActive,
          gradient_from: 'orange-500',
          gradient_to: 'red-600'
        });

      if (error) throw error;

      toast({ title: "Succes", description: `Popup creat! Utilizatorii vor primi ${newPromo.creditsReward} credite.` });
      loadPromos();
      // Reset form
      setNewPromo({
        title: '',
        description: '',
        imageUrl: '',
        creditsReward: 100000,
        isActive: true
      });
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const togglePromo = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sidebar_promos')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast({
        title: !currentStatus ? "Popup activat" : "Popup dezactivat",
        description: !currentStatus ? "Utilizatorii vor vedea acest popup" : "Popup-ul este acum ascuns"
      });
      loadPromos();
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Sigur vrei să ștergi acest popup? Această acțiune este permanentă.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('sidebar_promos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Succes", description: "Popup șters cu succes" });
      loadPromos();
    } catch (error: any) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; color: string }> = {
      draft: { label: 'Draft', color: 'bg-gray-500' },
      sending: { label: 'Se trimite...', color: 'bg-blue-500' },
      completed: { label: 'Trimis', color: 'bg-green-500' },
      failed: { label: 'Eșuat', color: 'bg-red-500' }
    };

    const variant = variants[status] || variants.draft;

    return (
      <Badge className={`${variant.color} text-white`}>
        {variant.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; color: string; icon: any }> = {
      info: { label: 'Informație', color: 'bg-blue-500', icon: <Bell className="w-3 h-3" /> },
      warning: { label: 'Atenție', color: 'bg-orange-500', icon: <AlertCircle className="w-3 h-3" /> },
      success: { label: 'Succes', color: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" /> },
      promotion: { label: 'Promoție', color: 'bg-purple-500', icon: <TrendingUp className="w-3 h-3" /> }
    };

    const variant = variants[type] || variants.info;

    return (
      <Badge className={`${variant.color} text-white flex items-center gap-1`}>
        {variant.icon}
        {variant.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Marketing & Notificări</h2>
        <p className="text-muted-foreground">
          Gestionează campaniile de marketing și anunțurile pentru utilizatori
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanii Trimise</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'sent').length}</div>
            <p className="text-xs text-muted-foreground">
              {campaigns.length} total campanii
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email-uri Trimise</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {announcements.reduce((sum, a) => sum + a.emails_sent, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              către {announcements.reduce((sum, a) => sum + a.total_recipients, 0)} utilizatori
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anunțuri Active</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{announcements.filter(a => a.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {announcements.length} total anunțuri
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata de Succes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {announcements.length > 0
                ? Math.round((announcements.filter(a => a.send_status === 'completed').length / announcements.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              pentru anunțuri
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('campaigns')}
            className={activeTab === 'campaigns' ? 'border-b-2 border-primary rounded-none' : ''}
          >
            <Mail className="mr-2 h-4 w-4" />
            Campaniile Email
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('announcements')}
            className={activeTab === 'announcements' ? 'border-b-2 border-primary rounded-none' : ''}
          >
            <Bell className="mr-2 h-4 w-4" />
            Anunțuri
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('popups')}
            className={activeTab === 'popups' ? 'border-b-2 border-primary rounded-none' : ''}
          >
            <Gift className="mr-2 h-4 w-4" />
            Popups
          </Button>
        </div>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaniile Email</CardTitle>
              <CardDescription>
                Funcționalitate în dezvoltare - acum sunt disponibile doar anunțurile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există campanii de email momentan
                </p>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{campaign.name}</h4>
                          <Badge>{campaign.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {campaign.recipients} destinatari
                        </p>
                      </div>
                      {campaign.openRate && (
                        <div className="text-right">
                          <p className="text-sm font-medium">Deschidere: {campaign.openRate}%</p>
                          <p className="text-sm text-muted-foreground">Click: {campaign.clickRate}%</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          {/* Create New Announcement */}
          <Card>
            <CardHeader>
              <CardTitle>Creează Anunț Nou</CardTitle>
              <CardDescription>
                Anunțul va fi trimis pe email către utilizatorii selectați
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="announcementTitle">Titlu</Label>
                <Input
                  id="announcementTitle"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder="ex. Funcționalitate nouă disponibilă"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="announcementMessage">Mesaj</Label>
                <Textarea
                  id="announcementMessage"
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                  placeholder="Scrie mesajul anunțului..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="announcementType">Tip</Label>
                  <Select value={newAnnouncement.type} onValueChange={(value: any) => setNewAnnouncement({ ...newAnnouncement, type: value })}>
                    <SelectTrigger id="announcementType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">📢 Informație</SelectItem>
                      <SelectItem value="warning">⚠️ Atenție</SelectItem>
                      <SelectItem value="success">✅ Succes</SelectItem>
                      <SelectItem value="promotion">🎉 Promoție</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="announcementTarget">Utilizatori Țintă</Label>
                  <Select value={newAnnouncement.targetUsers} onValueChange={(value: any) => setNewAnnouncement({ ...newAnnouncement, targetUsers: value })}>
                    <SelectTrigger id="announcementTarget">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toți utilizatorii</SelectItem>
                      <SelectItem value="premium">Utilizatori Premium</SelectItem>
                      <SelectItem value="free">Utilizatori Free</SelectItem>
                      <SelectItem value="active">Utilizatori Activi (30 zile)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="activeAnnouncement"
                  checked={newAnnouncement.isActive}
                  onCheckedChange={(checked) => setNewAnnouncement({ ...newAnnouncement, isActive: checked })}
                />
                <Label htmlFor="activeAnnouncement">Activ</Label>
              </div>

              <Button onClick={createAnnouncement} disabled={loading}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Publică Anunțul
              </Button>
            </CardContent>
          </Card>

          {/* Telegram Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Notificări Telegram
              </CardTitle>
              <CardDescription>
                Trimite toate înregistrările utilizatorilor pe Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-4">
                  Această acțiune va trimite o notificare pe Telegram pentru fiecare utilizator înregistrat pe platformă,
                  incluzând email, nume și data înregistrării.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-500">
                    Folosește cu atenție - va trimite notificări pentru toți utilizatorii
                  </span>
                </div>
              </div>

              <Button
                onClick={sendAllUsersToTelegram}
                disabled={sendingToTelegram}
                variant="default"
                className="w-full"
              >
                {sendingToTelegram ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se trimit notificările...
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Trimite Toate Înregistrările pe Telegram
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Announcements List */}
          <Card>
            <CardHeader>
              <CardTitle>Anunțuri Existente</CardTitle>
              <CardDescription>
                Gestionează anunțurile create
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && announcements.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : announcements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nu există anunțuri momentan
                </p>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-6 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-lg">{announcement.title}</h4>
                            {getTypeBadge(announcement.announcement_type)}
                            {getStatusBadge(announcement.send_status)}
                            {announcement.is_active && (
                              <Badge variant="outline" className="bg-green-50">
                                Activ
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{announcement.message}</p>

                          {announcement.send_status === 'completed' && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                {announcement.emails_sent} trimise
                              </span>
                              {announcement.emails_failed > 0 && (
                                <span className="flex items-center gap-1">
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  {announcement.emails_failed} eșuate
                                </span>
                              )}
                              <span>Total: {announcement.total_recipients} destinatari</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Utilizatori: {announcement.target_users === 'all' ? 'Toți' : announcement.target_users}</span>
                            <span>•</span>
                            <span>Creat: {new Date(announcement.created_at).toLocaleDateString('ro-RO')}</span>
                            {announcement.sent_at && (
                              <>
                                <span>•</span>
                                <span>Trimis: {new Date(announcement.sent_at).toLocaleDateString('ro-RO')}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAnnouncement(announcement.id)}
                          >
                            {announcement.is_active ? 'Dezactivează' : 'Activează'}
                          </Button>

                          {announcement.send_status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => sendAnnouncement(announcement.id)}
                              disabled={sendingAnnouncementId === announcement.id}
                            >
                              {sendingAnnouncementId === announcement.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Se trimite...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Trimite Email
                                </>
                              )}
                            </Button>
                          )}

                          {announcement.send_status === 'sending' && (
                            <Badge className="bg-blue-500">
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              În curs de trimitere...
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Popups Tab */}
      {activeTab === 'popups' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurează Sidebar Popup</CardTitle>
              <CardDescription>Pop-up-ul care apare în sidebar pentru toți utilizatorii.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Titlu</Label>
                <Input
                  value={newPromo.title}
                  onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Descriere</Label>
                <Textarea
                  value={newPromo.description}
                  onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>URL Imagine *</Label>
                <Input
                  value={newPromo.imageUrl}
                  onChange={(e) => setNewPromo({ ...newPromo, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.png"
                />
                <p className="text-xs text-muted-foreground">
                  Link-ul imaginii care va apărea în popup
                </p>
                {newPromo.imageUrl && (
                  <div className="mt-2 border rounded-lg p-2">
                    <p className="text-xs text-muted-foreground mb-2">Previzualizare:</p>
                    <img
                      src={newPromo.imageUrl}
                      alt="Preview"
                      className="w-full h-auto max-h-48 rounded object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.alt = 'Imagine invalidă';
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Credite Cadou *</Label>
                <Input
                  type="number"
                  value={newPromo.creditsReward}
                  onChange={(e) => setNewPromo({ ...newPromo, creditsReward: parseInt(e.target.value) || 0 })}
                  placeholder="100000"
                />
                <p className="text-xs text-muted-foreground">
                  Câte credite primește utilizatorul când dă click pe imagine
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activePromo"
                  checked={newPromo.isActive}
                  onCheckedChange={(checked) => setNewPromo({ ...newPromo, isActive: checked })}
                />
                <Label htmlFor="activePromo">Activ imediat</Label>
              </div>
              <Button onClick={createPromo} disabled={loading}>Salvează Popup Nou</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Popups Existente</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {promos.map(promo => (
                  <div key={promo.id} className="flex items-start justify-between p-4 border rounded-xl bg-muted/20 gap-4">
                    {promo.image_url && (
                      <img
                        src={promo.image_url}
                        alt={promo.title}
                        className="w-24 h-24 rounded object-cover shrink-0"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-base">{promo.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
                      <div className="text-xs text-muted-foreground mt-2">
                        💰 Cadou: {promo.credits_reward?.toLocaleString()} credite
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={promo.is_active ? 'default' : 'outline'}>
                        {promo.is_active ? 'Activ' : 'Inactiv'}
                      </Badge>
                      <Switch
                        checked={promo.is_active}
                        onCheckedChange={() => togglePromo(promo.id, promo.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePromo(promo.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {promos.length === 0 && <p className="text-muted-foreground text-center">Niciun popup configurat.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MarketingNotifications;