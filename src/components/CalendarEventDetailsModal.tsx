import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  Phone,
  Trash2,
  Pencil,
  MessageSquare,
  Copy
} from 'lucide-react';
import { useCallbackOperations } from '@/hooks/useCallbacks';
import { CalendarEventModal } from './CalendarEventModal';
import { toast } from 'sonner';

interface CalendarEventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
}

export const CalendarEventDetailsModal: React.FC<CalendarEventDetailsModalProps> = ({
  isOpen,
  onClose,
  event
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const { deleteCallback } = useCallbackOperations();

  if (!event) return null;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          label: 'Înaltă',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-100',
          textColor: 'text-red-600',
          dotColor: 'bg-red-500'
        };
      case 'medium':
        return {
          label: 'Medie',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-100',
          textColor: 'text-yellow-600',
          dotColor: 'bg-yellow-400'
        };
      case 'low':
        return {
          label: 'Scăzută',
          bgColor: 'bg-zinc-50',
          borderColor: 'border-zinc-100',
          textColor: 'text-zinc-600',
          dotColor: 'bg-zinc-400'
        };
      default:
        return {
          label: priority,
          bgColor: 'bg-zinc-50',
          borderColor: 'border-zinc-100',
          textColor: 'text-zinc-600',
          dotColor: 'bg-zinc-400'
        };
    }
  };

  const getStatusConfig = (status: string, isOverdue: boolean) => {
    if (isOverdue) {
      return {
        label: 'Întârziat',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-100',
        textColor: 'text-red-600'
      };
    }
    switch (status) {
      case 'scheduled':
        return {
          label: 'Programat',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-100',
          textColor: 'text-blue-600'
        };
      case 'completed':
        return {
          label: 'Completat',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-100',
          textColor: 'text-green-600'
        };
      case 'failed':
        return {
          label: 'Eșuat',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-100',
          textColor: 'text-red-600'
        };
      default:
        return {
          label: status,
          bgColor: 'bg-zinc-50',
          borderColor: 'border-zinc-100',
          textColor: 'text-zinc-600'
        };
    }
  };

  const scheduledDate = new Date(event.scheduled_time || event.scheduled_datetime);
  const isOverdue = event.status === 'scheduled' && scheduledDate < new Date();
  const priorityConfig = getPriorityConfig(event.priority);
  const statusConfig = getStatusConfig(event.status, isOverdue);

  const handleDelete = () => {
    if (window.confirm('Ești sigur că vrei să ștergi această programare?')) {
      deleteCallback.mutate(event.id);
      onClose();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiat în clipboard');
  };

  // Get initials from client name
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name[0].toUpperCase();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          hideCloseButton
          className="!bg-white w-full !max-w-md !p-0 !rounded-[32px] !shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] !border border-zinc-100 overflow-hidden flex flex-col"
        >
          {/* Header Section */}
          <div className="p-8 pb-6">
            {/* Status & Priority Pills */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`px-2.5 py-1 rounded-full ${statusConfig.bgColor} border ${statusConfig.borderColor} text-[10px] font-bold ${statusConfig.textColor} uppercase tracking-wide`}>
                {statusConfig.label}
              </span>
              <span className={`px-2.5 py-1 rounded-full ${priorityConfig.bgColor} border ${priorityConfig.borderColor} text-[10px] font-bold ${priorityConfig.textColor} uppercase tracking-wide flex items-center gap-1`}>
                <div className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotColor}`} />
                {priorityConfig.label}
              </span>
            </div>

            {/* Client Info */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black tracking-tight mb-1">
                  {event.client_name || 'Unnamed'}
                </h1>
                <a
                  href={`tel:${event.phone_number}`}
                  className="flex items-center gap-2 text-zinc-500 hover:text-black transition group"
                >
                  <Phone className="w-4 h-4 text-zinc-300 group-hover:text-black transition" />
                  <span className="text-sm font-medium font-mono tracking-tight">
                    {event.phone_number}
                  </span>
                </a>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                <span className="text-lg font-bold text-black">
                  {getInitials(event.client_name)}
                </span>
              </div>
            </div>
          </div>

          {/* Date/Time Card */}
          <div className="px-8 mb-6">
            <div className="bg-zinc-50 rounded-2xl p-4 flex items-center justify-between border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-zinc-900">
                  <span className="text-xs font-bold uppercase">
                    {format(scheduledDate, 'MMM', { locale: ro })}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Data</p>
                  <p className="text-sm font-bold text-zinc-900">
                    {format(scheduledDate, 'EEEE, dd', { locale: ro })}
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-zinc-200" />
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide text-right">Ora</p>
                <p className="text-xl font-bold text-zinc-900">
                  {format(scheduledDate, 'HH:mm')}
                </p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="px-8 space-y-6 flex-1 overflow-y-auto">
            {/* Description */}
            {event.description && (
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">
                  Descriere
                </label>
                <p className="text-sm text-zinc-800 leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {/* Notes */}
            {event.notes && (
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">
                  Notițe
                </label>
                <p className="text-sm text-zinc-800 leading-relaxed">
                  {event.notes}
                </p>
              </div>
            )}

            {/* Conversation Reference */}
            {event.conversation_id && (
              <div
                className="group cursor-pointer"
                onClick={() => handleCopy(event.conversation_id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Referință Conversație
                  </label>
                  <Copy className="w-3 h-3 text-black opacity-50 group-hover:opacity-100 transition" />
                </div>
                <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 hover:border-zinc-300 transition">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-zinc-400 mt-0.5" />
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-zinc-500 font-mono break-all line-clamp-2">
                        {event.conversation_id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-4 pt-2 pb-4">
              <div className="text-[10px] text-zinc-300">
                Creat: <span className="font-medium text-zinc-400">
                  {format(new Date(event.created_at), 'dd.MM.yyyy')}
                </span>
              </div>
              <div className="text-[10px] text-zinc-300">
                Updated: <span className="font-medium text-zinc-400">
                  {format(new Date(event.updated_at), 'HH:mm')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-zinc-50 bg-white mt-auto flex gap-3">
            <button
              onClick={handleDelete}
              className="flex-1 py-3.5 rounded-xl border border-zinc-100 text-xs font-bold text-red-500 hover:bg-red-50 hover:border-red-100 transition flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Șterge
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-[2] py-3.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-lg shadow-zinc-200 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editează
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <CalendarEventModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editEvent={event}
      />
    </>
  );
};
