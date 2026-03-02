import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarPlus, X, User, Phone, Calendar as CalendarIcon, Clock, Bot, ChevronDown, Check } from 'lucide-react';
import { useCallbackOperations } from '@/hooks/useCallbacks';
import { useUserAgents } from '@/hooks/useUserAgents';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  editEvent?: any;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  editEvent
}) => {
  const { t, language } = useLanguage();
  const [eventData, setEventData] = useState({
    client_name: '',
    phone_number: '',
    scheduled_time: selectedDate || new Date(),
    priority: 'medium',
    description: '',
    notes: '',
    agent_id: '',
    time: '10:00'
  });

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setEventData({
        client_name: editEvent?.client_name || '',
        phone_number: editEvent?.phone_number || '',
        scheduled_time: editEvent ? new Date(editEvent.scheduled_time) : selectedDate || new Date(),
        priority: editEvent?.priority || 'medium',
        description: editEvent?.description || '',
        notes: editEvent?.notes || '',
        agent_id: editEvent?.agent_id || '',
        time: editEvent ? format(new Date(editEvent.scheduled_time), 'HH:mm') : '10:00'
      });
    }
  }, [isOpen, editEvent, selectedDate]);

  const { createCallback, updateCallback } = useCallbackOperations();
  const { data: agents = [] } = useUserAgents();

  const validatePhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    return cleanPhone.startsWith('+') && cleanPhone.length >= 8 && /^\+\d+$/.test(cleanPhone);
  };

  const handleSubmit = () => {
    if (!eventData.client_name?.trim()) {
      toast.error(t('calendarEvent.clientNameRequired'));
      return;
    }

    if (!eventData.phone_number?.trim()) {
      toast.error(t('calendarEvent.phoneRequired'));
      return;
    }

    if (!validatePhoneNumber(eventData.phone_number)) {
      toast.error(t('calendarEvent.phoneInvalid'));
      return;
    }

    const [hours, minutes] = eventData.time.split(':');
    const scheduledDateTime = new Date(eventData.scheduled_time);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDateOnly = new Date(scheduledDateTime.getFullYear(), scheduledDateTime.getMonth(), scheduledDateTime.getDate());

    if (selectedDateOnly < today || (selectedDateOnly.getTime() === today.getTime() && scheduledDateTime < now)) {
      toast.error(t('calendarEvent.pastDateError'));
      return;
    }

    const callbackData = {
      client_name: eventData.client_name.trim(),
      phone_number: eventData.phone_number.trim(),
      scheduled_time: scheduledDateTime.toISOString(),
      priority: eventData.priority as 'low' | 'medium' | 'high',
      description: eventData.description?.trim() || null,
      notes: eventData.notes?.trim() || null,
      agent_id: eventData.agent_id?.trim() || null,
      status: 'scheduled' as const
    };

    if (editEvent) {
      updateCallback.mutate({ id: editEvent.id, ...callbackData });
    } else {
      createCallback(callbackData);
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        className="!bg-white w-full !max-w-xl !p-0 !rounded-3xl !shadow-2xl shadow-zinc-200 !border border-zinc-100 overflow-hidden"
        key={language}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                {editEvent ? t('calendarEvent.editSchedule') : t('calendarEvent.newSchedule')}
              </h2>
              <p className="text-xs text-zinc-400">Schedule a meeting or task.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-black transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Client Name & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {t('calendarEvent.clientName')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={eventData.client_name}
                  onChange={(e) => setEventData({ ...eventData, client_name: e.target.value })}
                  placeholder="e.g. Ion Popescu"
                  className="w-full bg-zinc-50 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 border border-transparent transition-all focus:bg-white focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {t('calendarEvent.phone')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="tel"
                  value={eventData.phone_number}
                  onChange={(e) => setEventData({ ...eventData, phone_number: e.target.value })}
                  placeholder="+40 723..."
                  className="w-full bg-zinc-50 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 border border-transparent transition-all focus:bg-white focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {t('calendarEvent.date')}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative w-full bg-zinc-50 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-zinc-900 border border-transparent transition-all hover:bg-zinc-100 focus:bg-white focus:ring-2 focus:ring-black focus:outline-none text-left cursor-pointer">
                    <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                    {eventData.scheduled_time ? format(eventData.scheduled_time, "MMM d, yyyy") : 'Select date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eventData.scheduled_time}
                    onSelect={(date) => date && setEventData({ ...eventData, scheduled_time: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {t('calendarEvent.time')}
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                <input
                  type="time"
                  value={eventData.time}
                  onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                  className="w-full bg-zinc-50 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-zinc-900 border border-transparent transition-all focus:bg-white focus:ring-2 focus:ring-black focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Agent & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {t('calendarEvent.agent')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center">
                    <Bot className="w-3 h-3" />
                  </div>
                </div>
                <select
                  value={eventData.agent_id}
                  onChange={(e) => setEventData({ ...eventData, agent_id: e.target.value })}
                  className="w-full bg-zinc-50 rounded-xl py-2.5 pl-10 pr-8 text-sm font-medium text-zinc-900 border border-transparent cursor-pointer appearance-none transition-all focus:bg-white focus:ring-2 focus:ring-black focus:outline-none"
                >
                  <option value="">{t('calendarEvent.selectAgent')}</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.agent_id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {t('calendarEvent.priority')}
              </label>
              <div className="flex bg-zinc-50 p-1 rounded-xl gap-1">
                {[
                  { value: 'low', label: 'Low', color: 'bg-zinc-400' },
                  { value: 'medium', label: 'Med', color: 'bg-yellow-400' },
                  { value: 'high', label: 'High', color: 'bg-red-500' }
                ].map((prio) => (
                  <button
                    key={prio.value}
                    type="button"
                    onClick={() => setEventData({ ...eventData, priority: prio.value })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                      eventData.priority === prio.value
                        ? 'bg-white border-black text-black shadow-sm'
                        : 'text-zinc-500 border-transparent hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${prio.color}`} />
                    {prio.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {t('calendarEvent.description')}
              </label>
              <textarea
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                placeholder={t('calendarEvent.descriptionPlaceholder')}
                className="w-full bg-zinc-50 rounded-xl p-3 text-sm text-zinc-900 placeholder-zinc-400 border border-transparent min-h-[80px] resize-none transition-all focus:bg-white focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {t('calendarEvent.notes')}
              </label>
              <textarea
                value={eventData.notes}
                onChange={(e) => setEventData({ ...eventData, notes: e.target.value })}
                placeholder={t('calendarEvent.notesPlaceholder')}
                className="w-full bg-zinc-50 rounded-xl p-3 text-sm text-zinc-900 placeholder-zinc-400 border border-transparent min-h-[60px] resize-none transition-all focus:bg-white focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-zinc-50 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-xs font-bold text-zinc-500 hover:text-black hover:bg-zinc-50 transition"
          >
            {t('calendarEvent.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 shadow-lg shadow-zinc-200 transition active:scale-95 flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            {editEvent ? t('calendarEvent.update') : t('calendarEvent.schedule')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
