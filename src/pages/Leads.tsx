import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Plus, Phone, Mail, Filter, Bot, Sparkles,
  MoreVertical, Trash2, Edit2, ChevronDown,
  ArrowUpDown, LayoutGrid, List, Check, Star, Calendar,
  User, DollarSign, MapPin, Type, ListIcon, Table2,
  X, MessageSquare, CheckCircle, PhoneOff, Clock, Circle, Mic
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUserAgents } from '@/hooks/useUserAgents';
import { useContacts, Contact } from '@/hooks/useContacts';
import { useCallHistory } from '@/hooks/useCallHistory';
import { cn } from '@/utils/utils';
import { LeadExtractionModal } from '@/components/leads/LeadExtractionModal';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

// Deterministic AI score based on lead data (not random)
const calculateAiScore = (lead: { callCount?: number; totalDuration?: number; lastCallStatus?: string; email?: string; notes?: string }): number => {
  let score = 50; // Base score
  // More calls = higher intent
  if (lead.callCount && lead.callCount >= 3) score += 20;
  else if (lead.callCount && lead.callCount >= 1) score += 10;
  // Longer total duration = more engaged
  if (lead.totalDuration && lead.totalDuration > 300) score += 15;
  else if (lead.totalDuration && lead.totalDuration > 60) score += 8;
  // Successful calls boost score
  if (lead.lastCallStatus === 'completed' || lead.lastCallStatus === 'done') score += 10;
  // Has email = more contact info
  if (lead.email) score += 5;
  // Has notes/summary = richer data
  if (lead.notes) score += 5;
  return Math.min(100, Math.max(0, score));
};

// Lead interface
interface Lead {
  id: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  status: string;
  source: string;
  created_at: string;
  notes: string;
  agent_id?: string | null;
  callCount?: number;
  totalDuration?: number;
  lastCallDate?: string;
  lastCallStatus?: string;
  agentName?: string;
  aiScore?: number;
  route?: string;
}

// Column configuration for Board view
interface LeadColumn {
  id: string;
  name: string;
  color: string;
  status: string;
}

const defaultColumns: LeadColumn[] = [
  { id: '1', name: 'New Lead', color: '#6B7280', status: 'new' },
  { id: '2', name: 'Not Contacted', color: '#3B82F6', status: 'not_contacted' },
  { id: '3', name: 'Attempted', color: '#F59E0B', status: 'attempted' },
  { id: '4', name: 'Contacted', color: '#10B981', status: 'contacted' },
  { id: '5', name: 'Confirmed', color: '#22C55E', status: 'confirmed' },
];

// Status configuration
const statusConfig: Record<string, { label: string; borderColor: string; bgColor: string; textColor: string }> = {
  'confirmed': { label: 'Confirmed', borderColor: 'border-green-200', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  'processing': { label: 'Processing', borderColor: 'border-amber-200', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  'new': { label: 'New Lead', borderColor: 'border-gray-200', bgColor: 'bg-gray-50', textColor: 'text-gray-500' },
  'not_contacted': { label: 'Not Contacted', borderColor: 'border-blue-200', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  'attempted': { label: 'Attempted', borderColor: 'border-orange-200', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  'contacted': { label: 'Contacted', borderColor: 'border-emerald-200', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
  'future': { label: 'Future', borderColor: 'border-purple-200', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
};

export default function Leads() {
  const { t } = useLanguage();
  const { data: agents = [] } = useUserAgents();
  const queryClient = useQueryClient();
  const { contacts, createContact, updateContact, deleteContact } = useContacts();

  const { callHistory = [], isLoading: isLoadingCalls } = useCallHistory(1, 2000);

  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [columns] = useState<LeadColumn[]>(defaultColumns);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Track status changes for call history leads (with localStorage size limit)
  const [callHistoryLeadStatuses, setCallHistoryLeadStatuses] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('callHistoryLeadStatuses');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Limit to last 500 entries to prevent unbounded growth
        const entries = Object.entries(parsed);
        if (entries.length > 500) {
          const trimmed = Object.fromEntries(entries.slice(-500));
          localStorage.setItem('callHistoryLeadStatuses', JSON.stringify(trimmed));
          return trimmed;
        }
        return parsed;
      }
    } catch {
      localStorage.removeItem('callHistoryLeadStatuses');
    }
    return {};
  });

  useEffect(() => {
    try {
      // Limit stored entries to prevent localStorage bloat
      const entries = Object.entries(callHistoryLeadStatuses);
      const toStore = entries.length > 500
        ? Object.fromEntries(entries.slice(-500))
        : callHistoryLeadStatuses;
      localStorage.setItem('callHistoryLeadStatuses', JSON.stringify(toStore));
    } catch (e) {
      console.error('Error saving lead statuses to localStorage:', e);
    }
  }, [callHistoryLeadStatuses]);

  // New lead form state
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    location: '',
    source: '',
    notes: '',
    status: 'new',
  });

  // Create leads from call history
  const leadsFromCallHistory = useMemo(() => {
    if (!callHistory.length) return [];

    const phoneMap = new Map<string, Lead>();

    for (let i = 0; i < callHistory.length; i++) {
      const call = callHistory[i];
      const phone = call.phone_number?.trim();
      if (!phone) continue;

      const existing = phoneMap.get(phone);

      if (!existing) {
        phoneMap.set(phone, {
          id: `call-${phone}`,
          name: call.contact_name?.split(' ')[0] || phone,
          fullName: call.contact_name || phone,
          email: '',
          phone: phone,
          company: '',
          location: '',
          status: 'new',
          source: 'Conversation Analytics',
          created_at: call.call_date,
          notes: call.summary || '',
          agent_id: call.agent_id || null,
          agentName: call.agent_name || '',
          callCount: 1,
          totalDuration: call.duration_seconds || 0,
          lastCallDate: call.call_date,
          lastCallStatus: call.call_status,
          aiScore: calculateAiScore({ callCount: 1, totalDuration: call.duration_seconds || 0, lastCallStatus: call.call_status, notes: call.summary }),
          route: 'Inbound',
        });
      } else {
        existing.callCount = (existing.callCount || 0) + 1;
        existing.totalDuration = (existing.totalDuration || 0) + (call.duration_seconds || 0);
        if (call.contact_name && existing.fullName.includes('+')) {
          existing.fullName = call.contact_name;
          existing.name = call.contact_name.split(' ')[0];
        }
      }
    }

    return Array.from(phoneMap.values());
  }, [callHistory]);

  // Memoize contacts to leads mapping
  const contactLeads: Lead[] = useMemo(() => contacts.map((contact) => ({
    id: contact.id,
    name: contact.nume.split(' ')[0] || contact.nume,
    fullName: contact.nume,
    email: contact.email || '',
    phone: contact.telefon,
    company: contact.company || '',
    location: contact.locatie || '',
    status: contact.status || 'new',
    source: contact.info || 'Manual',
    created_at: contact.created_at,
    notes: contact.notes || '',
    agent_id: null,
    aiScore: calculateAiScore({ email: contact.email, notes: contact.notes }),
    route: 'Manual',
  })), [contacts]);

  // Combine all leads
  const leads: Lead[] = useMemo(() => {
    const existingPhones = new Set(contactLeads.map(l => l.phone));
    const callHistoryLeadsFiltered = leadsFromCallHistory
      .filter(l => !existingPhones.has(l.phone))
      .map(lead => ({
        ...lead,
        status: callHistoryLeadStatuses[lead.phone] || lead.status
      }));
    return [...callHistoryLeadsFiltered, ...contactLeads];
  }, [leadsFromCallHistory, contactLeads, callHistoryLeadStatuses]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.fullName.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.company.toLowerCase().includes(query) ||
        lead.phone.includes(searchQuery)
    );
  }, [leads, searchQuery]);

  // Get leads for a specific column/status
  const getLeadsForColumn = useCallback((status: string) => {
    return filteredLeads.filter((lead) => lead.status === status);
  }, [filteredLeads]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual select
  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
    setSelectAll(newSelected.size === filteredLeads.length);
  };

  // Track if we're currently dragging to prevent click
  const [isDragging, setIsDragging] = useState(false);

  // Drag and drop handlers for Board view
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setIsDragging(true);
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    // Small delay to prevent click from firing
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, column: LeadColumn) => {
    e.preventDefault();
    e.stopPropagation();

    const leadToMove = draggedLead;

    // Reset drag state immediately
    setDraggedLead(null);
    setDragOverColumn(null);
    setIsDragging(false);

    if (leadToMove && leadToMove.status !== column.status) {
      try {
        if (leadToMove.id.startsWith('call-')) {
          setCallHistoryLeadStatuses(prev => ({
            ...prev,
            [leadToMove.phone]: column.status
          }));
          toast.success(`Lead moved to ${column.name}`);
        } else {
          await updateContact({ id: leadToMove.id, status: column.status });
          toast.success(`Lead moved to ${column.name}`);
        }
      } catch (error) {
        toast.error('Error moving lead');
      }
    }
  };

  // Add new lead
  const handleAddLead = async () => {
    if (!newLead.name || !newLead.phone) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      await createContact({
        nume: newLead.name,
        telefon: newLead.phone,
        email: newLead.email || undefined,
        company: newLead.company || undefined,
        locatie: newLead.location || undefined,
        info: newLead.source || 'Manual',
        notes: newLead.notes || undefined,
        status: newLead.status,
      });

      toast.success('Lead added successfully');
      setShowAddLeadModal(false);
      setNewLead({
        name: '',
        email: '',
        phone: '',
        company: '',
        location: '',
        source: '',
        notes: '',
        status: 'new',
      });
    } catch (error) {
      toast.error('Error adding lead');
    }
  };

  // Update lead
  const handleUpdateLead = async () => {
    if (!selectedLeadForEdit) return;

    try {
      await updateContact({
        id: selectedLeadForEdit.id,
        nume: selectedLeadForEdit.fullName,
        telefon: selectedLeadForEdit.phone,
        email: selectedLeadForEdit.email || undefined,
        company: selectedLeadForEdit.company || undefined,
        locatie: selectedLeadForEdit.location || undefined,
        notes: selectedLeadForEdit.notes || undefined,
        status: selectedLeadForEdit.status,
      });

      toast.success('Lead updated successfully');
      setSelectedLeadForEdit(null);
    } catch (error) {
      toast.error('Error updating lead');
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteContact(leadId);
      toast.success('Lead deleted successfully');
    } catch (error) {
      toast.error('Error deleting lead');
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get initials
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig['new'];
    return (
      <span className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium",
        config.borderColor,
        config.bgColor,
        config.textColor
      )}>
        {config.label}
      </span>
    );
  };

  // Cell border style
  const cellClass = "border-b border-r border-gray-100 py-2 pl-2 pr-4";
  const headerCellClass = "border-b border-r border-gray-200 bg-white py-2 pl-2 pr-4";

  // Close detail panel
  const closeDetailPanel = () => {
    setSelectedLead(null);
  };

  // Open detail panel
  const openDetailPanel = (lead: Lead) => {
    setSelectedLead(lead);
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white relative">
        {/* Detail Panel - Left Side */}
        <aside
          className={cn(
            "bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            selectedLead ? "w-[420px]" : "w-0"
          )}
        >
          {selectedLead && (
            <>
              {/* Panel Header */}
              <div className="px-6 py-5 border-b border-gray-100 min-w-[420px]">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-base font-bold text-gray-600 border border-gray-200">
                      {getInitials(selectedLead.fullName)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedLead.fullName}</h2>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{selectedLead.location || 'Unknown'}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="font-mono text-[11px]">{selectedLead.phone}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closeDetailPanel}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 bg-black text-white text-xs font-medium py-2 rounded-lg hover:bg-gray-800 transition flex justify-center items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </button>
                  <button className="flex-1 bg-white border border-gray-200 text-gray-700 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition flex justify-center items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    SMS
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 min-w-[420px]">
                {/* AI Insight Box - New Design */}
                <div className="pl-4 border-l-2 border-indigo-500/30 mb-8">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">AI Insight</span>
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    {selectedLead.notes || (
                      <>
                        Score: <span className="font-medium text-gray-900">{selectedLead.aiScore || 0}%</span>. {(selectedLead.aiScore || 0) >= 80 ? 'High intent lead. Recommend immediate follow-up.' : 'Moderate interest detected.'}
                      </>
                    )}
                  </p>
                </div>

                {/* History Header */}
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">History</h3>

                {/* Timeline - New Design */}
                <div className="space-y-0 relative">
                  {/* Status Event */}
                  <div className="relative pl-12 pb-8">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-100" />
                    {/* Icon circle */}
                    <div className={cn(
                      "absolute left-0 top-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center z-10 shadow-sm"
                    )}>
                      {selectedLead.status === 'confirmed' ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      ) : selectedLead.status === 'contacted' ? (
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      ) : selectedLead.status === 'attempted' ? (
                        <PhoneOff className="w-3.5 h-3.5 text-orange-500" />
                      ) : selectedLead.status === 'processing' ? (
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pt-1.5">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[13px] font-medium text-gray-900">
                          {statusConfig[selectedLead.status]?.label || 'New Lead'}
                        </span>
                        <span className="text-[10px] text-gray-400">Just now</span>
                      </div>
                      <p className="text-[11px] text-gray-500">Status updated</p>
                    </div>
                  </div>

                  {/* Call Event - if from call history */}
                  {selectedLead.callCount && selectedLead.callCount > 0 && (
                    <div className="relative pl-12 pb-8">
                      {/* Timeline line */}
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-100" />
                      {/* Icon circle */}
                      <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center z-10 shadow-sm">
                        <Mic className="w-3.5 h-3.5 text-gray-900" />
                      </div>
                      {/* Content */}
                      <div className="pt-1.5">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[13px] font-medium text-gray-900">AI Interaction</span>
                          <span className="text-[10px] text-gray-400">
                            {selectedLead.lastCallDate ? formatDate(selectedLead.lastCallDate) : '-'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Duration: {Math.floor((selectedLead.totalDuration || 0) / 60)}m {(selectedLead.totalDuration || 0) % 60}s • {selectedLead.callCount} attempt{selectedLead.callCount > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Created Event - Last item, no line */}
                  <div className="relative pl-12 pb-2">
                    {/* Icon circle */}
                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center z-10 shadow-sm">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    {/* Content */}
                    <div className="pt-1.5">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[13px] font-medium text-gray-900">Lead Created</span>
                        <span className="text-[10px] text-gray-400">{formatDate(selectedLead.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-gray-500">Source: {selectedLead.source || 'Manual'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with Note Input */}
              <div className="px-6 py-4 border-t border-gray-50 min-w-[420px]">
                <input
                  type="text"
                  placeholder="Add a note..."
                  className="w-full text-xs bg-transparent border-none focus:ring-0 placeholder-gray-400 px-0 focus:outline-none"
                />
              </div>
            </>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10">
          {/* Toolbar */}
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-5 shrink-0 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-900 cursor-pointer px-2 py-1 hover:bg-gray-50 rounded">
                <Table2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">All Leads</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{filteredLeads.length}</span>
              <div className="h-4 w-[1px] bg-gray-200" />
              {/* View Toggle */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-1.5 rounded transition",
                    viewMode === 'table' ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={cn(
                    "p-1.5 rounded transition",
                    viewMode === 'board' ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-200 rounded transition">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                Filter
              </button>
              <button className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-200 rounded transition">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                Sort
              </button>
              <button
                onClick={() => setShowExtractionModal(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-200 rounded transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                Extract AI
              </button>
              <button
                data-action="new-lead"
                onClick={() => setShowAddLeadModal(true)}
                className="ml-2 bg-black hover:bg-gray-800 text-white text-[12px] font-medium px-3 py-1.5 rounded shadow-sm flex items-center gap-2 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                New Lead
              </button>
            </div>
          </div>

          {/* Content Area */}
          {viewMode === 'table' ? (
            /* Table View */
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full border-collapse text-left min-w-[800px]">
                {/* Table Header */}
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    <th className={cn(headerCellClass, "w-10 pl-4")}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 cursor-pointer"
                      />
                    </th>
                    <th className={cn(headerCellClass, "min-w-[200px] pl-4")}>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Name</span>
                    </th>
                    <th className={cn(headerCellClass, "min-w-[140px]")}>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Phone</span>
                    </th>
                    <th className={cn(headerCellClass, "min-w-[120px]")}>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Status</span>
                    </th>
                    <th className={cn(headerCellClass, "min-w-[160px]")}>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Agent</span>
                    </th>
                    <th className={cn(headerCellClass, "min-w-[160px]")}>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Route</span>
                    </th>
                    <th className={cn(headerCellClass, "min-w-[100px] text-center")}>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Score</span>
                    </th>
                    <th className={cn(headerCellClass, "min-w-[130px]")}>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase">Date</span>
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="text-[13px] text-gray-900">
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedLeads.has(lead.id);
                    const isDetailOpen = selectedLead?.id === lead.id;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => openDetailPanel(lead)}
                        className={cn(
                          "group cursor-pointer transition-colors border-l-4",
                          isDetailOpen
                            ? "bg-blue-50/50 border-black"
                            : "hover:bg-gray-50 border-transparent hover:border-transparent"
                        )}
                      >
                        <td className={cn(cellClass, "pl-4")} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectLead(lead.id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 cursor-pointer"
                          />
                        </td>
                        <td className={cn(cellClass, "py-3 pl-4")}>
                          <span className="font-medium">{lead.fullName}</span>
                        </td>
                        <td className={cn(cellClass, "py-3 text-gray-500")}>
                          {lead.phone || '-'}
                        </td>
                        <td className={cn(cellClass, "py-3")}>
                          {getStatusBadge(lead.status)}
                        </td>
                        <td className={cn(cellClass, "py-3 text-gray-500")}>
                          {lead.agentName || '-'}
                        </td>
                        <td className={cn(cellClass, "py-3 text-gray-500")}>
                          {lead.route || lead.source || '-'}
                        </td>
                        <td className={cn(cellClass, "py-3 text-gray-500 text-center")}>
                          {lead.aiScore || 0}%
                        </td>
                        <td className={cn(cellClass, "py-3 text-gray-500")}>
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add New Lead Row */}
                  <tr
                    onClick={() => setShowAddLeadModal(true)}
                    className="hover:bg-gray-50/30 transition-colors cursor-pointer border-l-4 border-transparent"
                  >
                    <td className={cn(cellClass, "pl-4 text-gray-300 font-medium")}>+</td>
                    <td colSpan={7} className={cn(cellClass, "text-gray-400 text-[13px]")}>
                      Click to add a new lead...
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Empty State */}
              {filteredLeads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-medium mb-2">No leads found</p>
                  <p className="text-sm text-gray-400">Add your first lead or import from call history</p>
                </div>
              )}
            </div>
          ) : (
            /* Board View */
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50 min-w-0">
              <div className="flex gap-4 p-4 h-full" style={{ width: 'max-content', minWidth: '100%' }}>
                {columns.map((column) => {
                  const columnLeads = getLeadsForColumn(column.status);
                  return (
                    <div
                      key={column.id}
                      className={cn(
                        "w-[280px] min-w-[280px] max-w-[280px] flex-shrink-0 flex flex-col bg-gray-100 rounded-xl h-full",
                        dragOverColumn === column.id && "ring-2 ring-blue-400"
                      )}
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDrop={(e) => handleDrop(e, column)}
                      onDragLeave={(e) => {
                        // Only clear if leaving the column entirely, not entering a child
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverColumn(null);
                        }
                      }}
                    >
                      {/* Column Header */}
                      <div className="px-3 py-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: column.color }}
                          />
                          <span className="font-medium text-gray-900 text-sm">{column.name}</span>
                          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                            {columnLeads.length}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setNewLead({ ...newLead, status: column.status });
                            setShowAddLeadModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Column Cards - Scrollable */}
                      <div
                        className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDrop(e, column);
                        }}
                      >
                        <div className="space-y-2 min-h-[100px]">
                          {columnLeads.map((lead) => (
                            <div
                              key={lead.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, lead)}
                              onDragEnd={handleDragEnd}
                              onClick={() => {
                                // Don't open panel if we were dragging
                                if (!isDragging) {
                                  openDetailPanel(lead);
                                }
                              }}
                              className={cn(
                                "bg-white rounded-lg p-3 shadow-sm border cursor-grab hover:shadow-md transition-shadow group select-none",
                                draggedLead?.id === lead.id && "opacity-50 cursor-grabbing",
                                selectedLead?.id === lead.id ? "border-gray-900 bg-gray-50" : "border-gray-200"
                              )}
                            >
                              {/* Lead Card Header */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                  <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                                    {getInitials(lead.fullName)}
                                  </div>
                                  <h4 className="font-medium text-gray-900 text-sm truncate">
                                    {lead.fullName}
                                  </h4>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-gray-400 hover:text-gray-600 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-white border-gray-200">
                                    <DropdownMenuItem onClick={() => setSelectedLeadForEdit(lead)} className="text-gray-700">
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      Edit Lead
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-gray-700">
                                      <Phone className="w-4 h-4 mr-2" />
                                      Call
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-gray-200" />
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDeleteLead(lead.id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Phone */}
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span className="font-mono text-[11px] truncate">{lead.phone}</span>
                              </div>

                              {/* AI Score */}
                              <div className="flex items-center gap-1.5 mb-2">
                                <Star className={cn(
                                  "w-3 h-3 shrink-0",
                                  (lead.aiScore || 0) >= 80 ? "fill-gray-900 text-gray-900" : "fill-gray-300 text-gray-300"
                                )} />
                                <span className="text-xs text-gray-600">{lead.aiScore || 0}%</span>
                              </div>

                              {/* Footer */}
                              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                                <span className="truncate">{formatDate(lead.created_at)}</span>
                                {lead.agentName && (
                                  <span className="text-[10px] text-gray-500 truncate ml-2">{lead.agentName}</span>
                                )}
                              </div>
                            </div>
                          ))}

                          {columnLeads.length === 0 && (
                            <div
                              className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              Drop here
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Lead Modal */}
      <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
        <DialogContent className="sm:max-w-[500px] bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create New Lead</DialogTitle>
            <DialogDescription className="text-gray-500">
              Add a new lead to your pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 text-[13px]">Name *</Label>
                <Input
                  id="name"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-white border-gray-200 text-[13px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 text-[13px]">Phone *</Label>
                <Input
                  id="phone"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                  className="bg-white border-gray-200 text-[13px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 text-[13px]">Email</Label>
              <Input
                id="email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="email@example.com"
                className="bg-white border-gray-200 text-[13px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-gray-700 text-[13px]">Company</Label>
                <Input
                  id="company"
                  value={newLead.company}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  placeholder="Company Name"
                  className="bg-white border-gray-200 text-[13px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-gray-700 text-[13px]">Location</Label>
                <Input
                  id="location"
                  value={newLead.location}
                  onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                  placeholder="City, Country"
                  className="bg-white border-gray-200 text-[13px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source" className="text-gray-700 text-[13px]">Source</Label>
                <Input
                  id="source"
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  placeholder="Website, Referral, etc."
                  className="bg-white border-gray-200 text-[13px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-gray-700 text-[13px]">Status</Label>
                <Select
                  value={newLead.status}
                  onValueChange={(value) => setNewLead({ ...newLead, status: value })}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-[13px]">
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-700 text-[13px]">Notes</Label>
              <Textarea
                id="notes"
                value={newLead.notes}
                onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                placeholder="Additional information..."
                rows={3}
                className="bg-white border-gray-200 text-[13px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddLeadModal(false)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLead}
              className="bg-black text-white hover:bg-gray-800 text-[13px]"
            >
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Modal */}
      <Dialog open={!!selectedLeadForEdit} onOpenChange={() => setSelectedLeadForEdit(null)}>
        <DialogContent className="sm:max-w-[500px] bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Edit Lead</DialogTitle>
            <DialogDescription className="text-gray-500">
              Update lead information
            </DialogDescription>
          </DialogHeader>

          {selectedLeadForEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-gray-700 text-[13px]">Name *</Label>
                  <Input
                    id="edit-name"
                    value={selectedLeadForEdit.fullName}
                    onChange={(e) => setSelectedLeadForEdit({
                      ...selectedLeadForEdit,
                      fullName: e.target.value,
                      name: e.target.value.split(' ')[0]
                    })}
                    className="bg-white border-gray-200 text-[13px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="text-gray-700 text-[13px]">Phone *</Label>
                  <Input
                    id="edit-phone"
                    value={selectedLeadForEdit.phone}
                    onChange={(e) => setSelectedLeadForEdit({
                      ...selectedLeadForEdit,
                      phone: e.target.value
                    })}
                    className="bg-white border-gray-200 text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-gray-700 text-[13px]">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedLeadForEdit.email}
                  onChange={(e) => setSelectedLeadForEdit({
                    ...selectedLeadForEdit,
                    email: e.target.value
                  })}
                  className="bg-white border-gray-200 text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-company" className="text-gray-700 text-[13px]">Company</Label>
                  <Input
                    id="edit-company"
                    value={selectedLeadForEdit.company}
                    onChange={(e) => setSelectedLeadForEdit({
                      ...selectedLeadForEdit,
                      company: e.target.value
                    })}
                    className="bg-white border-gray-200 text-[13px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location" className="text-gray-700 text-[13px]">Location</Label>
                  <Input
                    id="edit-location"
                    value={selectedLeadForEdit.location}
                    onChange={(e) => setSelectedLeadForEdit({
                      ...selectedLeadForEdit,
                      location: e.target.value
                    })}
                    className="bg-white border-gray-200 text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-gray-700 text-[13px]">Status</Label>
                <Select
                  value={selectedLeadForEdit.status}
                  onValueChange={(value) => setSelectedLeadForEdit({
                    ...selectedLeadForEdit,
                    status: value
                  })}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-[13px]">
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-gray-700 text-[13px]">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={selectedLeadForEdit.notes}
                  onChange={(e) => setSelectedLeadForEdit({
                    ...selectedLeadForEdit,
                    notes: e.target.value
                  })}
                  rows={3}
                  className="bg-white border-gray-200 text-[13px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedLeadForEdit(null)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLead}
              className="bg-black text-white hover:bg-gray-800 text-[13px]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Extraction Modal */}
      <LeadExtractionModal
        isOpen={showExtractionModal}
        onClose={() => setShowExtractionModal(false)}
        agentId={agents[0]?.agent_id || ''}
        agentName={agents[0]?.name || 'Agent'}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }}
      />
    </DashboardLayout>
  );
}
