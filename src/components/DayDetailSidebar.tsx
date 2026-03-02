import React, { useState } from 'react';
import { X, Clock, User, Phone, Calendar, MoreVertical, Play, Edit, Trash2, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { useCallbackOperations } from '@/hooks/useCallbacks';
import { toast } from 'sonner';

interface DayDetailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events: any[];
}

export const DayDetailSidebar: React.FC<DayDetailSidebarProps> = ({
  isOpen,
  onClose,
  selectedDate,
  events
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const { deleteCallback, executeCallback } = useCallbackOperations();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { label: 'Programat', color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'completed':
        return { label: 'Completat', color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' };
      case 'failed':
        return { label: 'Eșuat', color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' };
      case 'overdue':
        return { label: 'Întârziat', color: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50' };
      default:
        return { label: 'Unknown', color: 'bg-gray-500', textColor: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { label: 'Înaltă', color: 'bg-red-500', icon: '🔴' };
      case 'medium':
        return { label: 'Medie', color: 'bg-yellow-500', icon: '🟡' };
      case 'low':
        return { label: 'Scăzută', color: 'bg-green-500', icon: '🟢' };
      default:
        return { label: 'Normal', color: 'bg-gray-500', icon: '⚪' };
    }
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleDelete = (eventId: string) => {
    if (window.confirm('Ești sigur că vrei să ștergi această programare?')) {
      deleteCallback.mutate(eventId as any, {
        onSuccess: () => {
          toast.success('Programarea a fost ștearsă cu succes');
        },
        onError: () => {
          toast.error('Eroare la ștergerea programării');
        }
      });
    }
  };

  const handleExecute = (eventId: string) => {
    if (window.confirm('Ești sigur că vrei să execuți această programare?')) {
      executeCallback.mutate(eventId as any, {
        onSuccess: () => {
          toast.success('Programarea a fost executată cu succes');
        },
        onError: () => {
          toast.error('Eroare la executarea programării');
        }
      });
    }
  };

  // Group events by status
  const groupedEvents = events.reduce((acc, event) => {
    const status = event.status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(event);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-[500px] overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {selectedDate && format(selectedDate, 'EEEE, d MMMM yyyy', { locale: ro })}
                  </div>
                  <div className="text-sm text-gray-500 font-normal">
                    {events?.length || 0} {(events?.length || 0) === 1 ? 'programare' : 'programări'}
                  </div>
                </div>
              </SheetTitle>
              <Button 
                onClick={() => setShowNewEventModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Programare Nouă
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {Object.keys(groupedEvents).length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nu există programări pentru această zi</p>
              </div>
            ) : (
              Object.entries(groupedEvents).map(([status, statusEvents]) => {
                const statusConfig = getStatusConfig(status);
                return (
                  <div key={status} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusConfig.color}`} />
                       <h3 className="font-medium text-gray-900">
                        {statusConfig.label} ({(statusEvents as any[]).length})
                       </h3>
                    </div>
                    
                    <div className="space-y-2">
                      {(statusEvents as any[])
                        .sort((a: any, b: any) => new Date(a.scheduled_time || a.scheduled_datetime).getTime() - new Date(b.scheduled_time || b.scheduled_datetime).getTime())
                        .map((event: any) => {
                          const priorityConfig = getPriorityConfig(event.priority);
                          return (
                            <div
                              key={event.id}
                              className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${statusConfig.bgColor} border-gray-200`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span className="font-semibold text-gray-900">
                                      {format(new Date(event.scheduled_time || event.scheduled_datetime), 'HH:mm')}
                                    </span>
                                    <span className="text-xs">
                                      {priorityConfig.icon}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-400" />
                                      <span className="font-medium text-gray-900 truncate">
                                        {event.client_name || 'Unknown'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">
                                        {event.phone_number}
                                      </span>
                                    </div>
                                    
                                    {event.reason && (
                                      <div className="text-sm text-gray-600 mt-2">
                                        <span className="font-medium">Motiv:</span> {event.reason}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 ml-2">
                                  {status === 'scheduled' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleExecute(event.id)}
                                      className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                                      title="Execută"
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  )}
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(event)}
                                    className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                                    title="Editează"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(event.id)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                    title="Șterge"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {event.notes && (
                                <div className="mt-3 p-2 bg-white/60 rounded-md">
                                  <span className="text-xs text-gray-500 font-medium">Notițe:</span>
                                  <p className="text-sm text-gray-700 mt-1">{event.notes}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CalendarEventModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEvent(null);
        }}
        editEvent={editingEvent}
      />

      <CalendarEventModal
        isOpen={showNewEventModal}
        onClose={() => setShowNewEventModal(false)}
        selectedDate={selectedDate}
      />
    </>
  );
};