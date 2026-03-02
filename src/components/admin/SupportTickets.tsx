import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, AlertCircle, Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/AuthContext';

export const SupportTickets = () => {
  const { tickets, loading, updateTicketStatus, createTicket } = useSupportTickets();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'support' as 'bug' | 'feature' | 'support' | 'billing' | 'blocked_account',
    user_email: ''
  });

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleAddTicket = async () => {
    if (!newTicket.title || !newTicket.user_email || !user) return;
    
    const success = await createTicket({
      ...newTicket,
      user_id: user.id,
      status: 'open',
      metadata: {},
      assigned_to: null
    });
    
    if (success) {
      setNewTicket({
        title: '',
        description: '',
        priority: 'medium',
        category: 'support',
        user_email: ''
      });
      setIsDialogOpen(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'resolved': return 'secondary';
      case 'closed': return 'outline';
      default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle2 className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const blockedAccountTickets = tickets.filter(t => t.category === 'blocked_account').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Support Tickets</h2>
          <p className="text-muted-foreground">Gestionează solicitările de suport</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ticket Nou
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Creare Ticket Nou</DialogTitle>
              <DialogDescription>Completează informațiile pentru un ticket nou</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titlu</Label>
                <Input
                  id="title"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  placeholder="Rezumă problema..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Utilizator</Label>
                <Input
                  id="email"
                  type="email"
                  value={newTicket.user_email}
                  onChange={(e) => setNewTicket({...newTicket, user_email: e.target.value})}
                  placeholder="client@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descriere</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Descrie problema în detaliu..."
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioritate</Label>
                  <Select 
                    value={newTicket.priority} 
                    onValueChange={(value: any) => setNewTicket({...newTicket, priority: value})}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Scăzută</SelectItem>
                      <SelectItem value="medium">Medie</SelectItem>
                      <SelectItem value="high">Înaltă</SelectItem>
                      <SelectItem value="urgent">Urgentă</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categorie</Label>
                  <Select 
                    value={newTicket.category} 
                    onValueChange={(value: any) => setNewTicket({...newTicket, category: value})}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Funcționalitate</SelectItem>
                      <SelectItem value="support">Suport</SelectItem>
                      <SelectItem value="billing">Facturare</SelectItem>
                      <SelectItem value="blocked_account">Cont Blocat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={handleAddTicket}>Creează Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deschise</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets}</div>
            <p className="text-xs text-muted-foreground">Ticket-uri noi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">În Progres</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTickets}</div>
            <p className="text-xs text-muted-foreground">Se lucrează</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rezolvate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedTickets}</div>
            <p className="text-xs text-muted-foreground">Finalizate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conturi Blocate</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedAccountTickets}</div>
            <p className="text-xs text-muted-foreground">Necesită atenție</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Toate Tickets</CardTitle>
          <CardDescription>Filtrează și gestionează tickets de suport</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută după titlu, descriere sau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate Status-urile</SelectItem>
                <SelectItem value="open">Deschise</SelectItem>
                <SelectItem value="in_progress">În Progres</SelectItem>
                <SelectItem value="resolved">Rezolvate</SelectItem>
                <SelectItem value="closed">Închise</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Prioritate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate Prioritățile</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Înalte</SelectItem>
                <SelectItem value="medium">Medii</SelectItem>
                <SelectItem value="low">Scăzute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tickets List */}
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nicio solicitare</h3>
                <p className="text-sm text-muted-foreground">Nu există tickets care să corespundă criteriilor de căutare.</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <Card key={ticket.id} className={ticket.category === 'blocked_account' ? 'border-red-600 border-2' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                          <h3 className="font-semibold text-lg">{ticket.title}</h3>
                          {ticket.category === 'blocked_account' && (
                            <Badge variant="destructive">🔒 Cont Blocat</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{ticket.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            📧 {ticket.user_email}
                          </span>
                          <span>
                            {new Date(ticket.created_at).toLocaleDateString('ro-RO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                            {ticket.priority === 'urgent' ? '🔥 Urgent' : 
                             ticket.priority === 'high' ? 'High' :
                             ticket.priority === 'medium' ? 'Medium' : 'Low'}
                          </Badge>
                          <Badge variant="outline">{ticket.category}</Badge>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Badge variant={getStatusBadgeVariant(ticket.status)} className="justify-center">
                          {ticket.status === 'open' ? 'Deschis' :
                           ticket.status === 'in_progress' ? 'În Progres' :
                           ticket.status === 'resolved' ? 'Rezolvat' : 'Închis'}
                        </Badge>
                        
                        <Select 
                          value={ticket.status}
                          onValueChange={(value: any) => updateTicketStatus(ticket.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Deschis</SelectItem>
                            <SelectItem value="in_progress">În Progres</SelectItem>
                            <SelectItem value="resolved">Rezolvat</SelectItem>
                            <SelectItem value="closed">Închis</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportTickets;
