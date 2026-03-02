import React, { useState } from 'react';
import { useCallbackOperations } from '@/hooks/useCallbacks';
import { useUserAgents } from '@/hooks/useUserAgents';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Phone, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Trash2, Edit, Play, User, PhoneCall, MessageSquare, Bell, RotateCcw, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
const CallbackScheduler = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedCallback, setSelectedCallback] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    client_name: '',
    phone_number: '',
    scheduled_datetime: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    description: '',
    notes: '',
    callback_reason: ''
  });
  const {
    callbacks,
    groupedCallbacks,
    statistics,
    isLoading,
    createCallback,
    updateCallback: updateCallbackMutation,
    deleteCallback: deleteCallbackMutation,
    executeCallback: executeCallbackMutation
  } = useCallbackOperations();
  const {
    data: userAgents
  } = useUserAgents();

  // Filter callbacks based on selected filters
  const filteredCallbacks = callbacks?.filter(callback => {
    const statusMatch = statusFilter === 'all' || callback.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || callback.priority === priorityFilter;
    return statusMatch && priorityMatch;
  }) || [];
  const handleEditCallback = (callback: any) => {
    setEditForm({
      client_name: callback.client_name,
      phone_number: callback.phone_number,
      scheduled_datetime: callback.scheduled_time.slice(0, 16),
      priority: callback.priority === 'urgent' ? 'high' : callback.priority,
      description: callback.description || '',
      notes: callback.notes || '',
      callback_reason: callback.reason || ''
    });
    setSelectedCallback(callback);
    setIsEditDialogOpen(true);
  };
  const handleViewCallback = (callback: any) => {
    setSelectedCallback(callback);
    setIsDetailSheetOpen(true);
  };
  const handleUpdateCallback = () => {
    if (!selectedCallback) return;
    updateCallbackMutation.mutate({
      id: selectedCallback.id,
      client_name: editForm.client_name,
      phone_number: editForm.phone_number,
      scheduled_time: editForm.scheduled_datetime,
      priority: editForm.priority,
      description: editForm.description,
      notes: editForm.notes
    });
    setIsEditDialogOpen(false);
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✓ Finalizat</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">✗ Eșuat</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">⏳ În progres</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">📋 Programat</Badge>;
    }
  };
  const renderCallbackTable = (callbacks: any[], title: string, emptyMessage: string) => {
    if (callbacks.length === 0) return null;
    return <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <Badge variant="outline">{callbacks.length}</Badge>
        </div>
        
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div className="col-span-2">Contact Number</div>
            <div className="col-span-2">Nume Contact</div>
            <div className="col-span-2">Agent</div>
            <div className="col-span-2">Programat pentru</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Acțiuni</div>
          </div>
          
          {/* Table Rows */}
            {callbacks.map(callback => {
          const isOverdue = new Date(callback.scheduled_time) < new Date() && callback.status === 'scheduled';
          return <div key={callback.id} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center cursor-pointer" onClick={() => handleViewCallback(callback)}>
                <div className="col-span-2 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">{callback.phone_number}</span>
                </div>
                
                <div className="col-span-2">
                  <span className="text-sm font-medium text-gray-900">{callback.client_name}</span>
                </div>
                
                <div className="col-span-2">
                  <span className="text-sm text-gray-600">
                    {callback.agent_id ? `Agent ${callback.agent_id.slice(0, 8)}...` : 'Nu este specificat'}
                  </span>
                </div>
                
                <div className="col-span-2">
                  <div className="text-sm text-gray-600">
                    {format(new Date(callback.scheduled_time), 'dd MMM, HH:mm', {
                  locale: ro
                })}
                    {isOverdue && <div className="text-xs text-red-600 font-medium">Întârziat</div>}
                  </div>
                </div>
                
                <div className="col-span-2">
                  {getStatusBadge(callback.status)}
                </div>
                
                <div className="col-span-2 flex items-center gap-2">
                  {callback.status === 'scheduled' && <Button size="sm" onClick={e => {
                e.stopPropagation();
                executeCallbackMutation.mutate(callback);
              }} disabled={executeCallbackMutation.isPending} className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white">
                      Sună acum
                    </Button>}
                  
                  <Button size="sm" variant="outline" onClick={e => {
                e.stopPropagation();
                handleEditCallback(callback);
              }} className="h-8 px-3 text-xs">
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  <Button size="sm" variant="destructive" onClick={e => {
                e.stopPropagation();
                deleteCallbackMutation.mutate(callback.id);
              }} disabled={deleteCallbackMutation.isPending} className="h-8 w-8 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>;
        })}
        </div>
      </div>;
  };
  return <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6 min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">📞 Programări Callback</h1>
              <p className="text-gray-600 mt-1">
                Gestionează contactele care au cerut să fie sunați înapoi
              </p>
            </div>
            
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filtrează status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📋 Toate</SelectItem>
                  <SelectItem value="scheduled">🕐 Programate</SelectItem>
                  <SelectItem value="completed">✅ Completate</SelectItem>
                  <SelectItem value="failed">❌ Eșuate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filtrează prioritate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Toate</SelectItem>
                  
                  <SelectItem value="high">🟠 Mare</SelectItem>
                  <SelectItem value="medium">🟡 Medie</SelectItem>
                  <SelectItem value="low">🟢 Mică</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-red-500">●</span>
              <span>{groupedCallbacks.overdue.length} întârziate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">●</span>
              <span>{groupedCallbacks.upcoming.length} programate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">●</span>
              <span>{groupedCallbacks.completed.length} completate</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-3">Se încarcă callback-urile...</p>
          </div> : <div className="space-y-8">
            {/* Overdue Callbacks */}
            {renderCallbackTable(groupedCallbacks.overdue, "🔴 Callback-uri Întârziate", "Nu există callback-uri întârziate")}

            {/* Upcoming Callbacks */}
            {renderCallbackTable(groupedCallbacks.upcoming, "🕐 Callback-uri Programate", "Nu există callback-uri programate")}

            {/* Completed Callbacks */}
            {renderCallbackTable(groupedCallbacks.completed.slice(0, 10), "✅ Callback-uri Completate", "Nu există callback-uri completate")}

            {filteredCallbacks.length === 0 && <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <PhoneCall className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există callback-uri</h3>
                <p className="text-gray-600">
                  Nu ai niciun callback programat în acest moment.
                </p>
              </div>}
          </div>}

        {/* Detail Sheet */}
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Detalii Callback</SheetTitle>
            </SheetHeader>
            {selectedCallback && <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Client</Label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCallback.client_name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Telefon</Label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCallback.phone_number}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Programat pentru</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {format(new Date(selectedCallback.scheduled_time), 'dd MMMM yyyy, HH:mm', {
                    locale: ro
                  })}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedCallback.status)}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Prioritate</Label>
                    <p className="text-sm text-gray-900 mt-1 capitalize">{selectedCallback.priority}</p>
                  </div>
                  
                  {selectedCallback.reason && <div>
                      <Label className="text-sm font-medium text-gray-700">Motiv callback</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedCallback.reason}</p>
                    </div>}
                  
                  {selectedCallback.description && <div>
                      <Label className="text-sm font-medium text-gray-700">Descriere</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedCallback.description}</p>
                    </div>}
                  
                  {selectedCallback.notes && <div>
                      <Label className="text-sm font-medium text-gray-700">Note</Label>
                      <p className="text-sm text-gray-900 mt-1">{selectedCallback.notes}</p>
                    </div>}
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Creat la</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {format(new Date(selectedCallback.created_at), 'dd MMMM yyyy, HH:mm', {
                    locale: ro
                  })}
                    </p>
                  </div>
                  
                  {selectedCallback.created_via_webhook && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Creat prin Webhook</span>
                      </div>
                    </div>}
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  {selectedCallback.status === 'scheduled' && <Button onClick={() => executeCallbackMutation.mutate(selectedCallback)} disabled={executeCallbackMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Play className="h-4 w-4 mr-2" />
                      Sună acum
                    </Button>}
                  
                  <Button variant="outline" onClick={() => {
                handleEditCallback(selectedCallback);
                setIsDetailSheetOpen(false);
              }} className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Editează
                  </Button>
                </div>
              </div>}
          </SheetContent>
        </Sheet>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editează Callback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client_name">Numele Clientului</Label>
                <Input id="client_name" value={editForm.client_name} onChange={e => setEditForm({
                ...editForm,
                client_name: e.target.value
              })} />
              </div>

              <div>
                <Label htmlFor="phone_number">Numărul de Telefon</Label>
                <Input id="phone_number" value={editForm.phone_number} onChange={e => setEditForm({
                ...editForm,
                phone_number: e.target.value
              })} />
              </div>

              <div>
                <Label htmlFor="scheduled_datetime">Data și Ora</Label>
                <Input id="scheduled_datetime" type="datetime-local" value={editForm.scheduled_datetime} onChange={e => setEditForm({
                ...editForm,
                scheduled_datetime: e.target.value
              })} />
              </div>

              <div>
                <Label htmlFor="priority">Prioritate</Label>
                <Select value={editForm.priority} onValueChange={value => setEditForm({
                ...editForm,
                priority: value as any
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Mică</SelectItem>
                    <SelectItem value="medium">Medie</SelectItem>
                    <SelectItem value="high">Mare</SelectItem>
                    
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="callback_reason">Motivul Callback-ului</Label>
                <Input id="callback_reason" value={editForm.callback_reason} onChange={e => setEditForm({
                ...editForm,
                callback_reason: e.target.value
              })} placeholder="De ex: întrebare despre produs, programare întâlnire" />
              </div>

              <div>
                <Label htmlFor="description">Descriere</Label>
                <Textarea id="description" value={editForm.description} onChange={e => setEditForm({
                ...editForm,
                description: e.target.value
              })} rows={3} />
              </div>

              <div>
                <Label htmlFor="notes">Note</Label>
                <Textarea id="notes" value={editForm.notes} onChange={e => setEditForm({
                ...editForm,
                notes: e.target.value
              })} rows={2} />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateCallback} disabled={updateCallbackMutation.isPending} className="flex-1">
                  {updateCallbackMutation.isPending ? 'Se salvează...' : 'Salvează'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                  Anulează
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>;
};
export default CallbackScheduler;