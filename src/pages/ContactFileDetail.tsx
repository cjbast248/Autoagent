import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Phone,
  MapPin,
  Search,
  UserPlus,
  Download,
  Filter,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';

interface ContactFile {
  id: string;
  name: string;
  description: string | null;
}

interface Contact {
  id: string;
  full_name: string;
  phone_e164: string;
  info_json: any;
  status: string;
  created_at: string;
}

const ContactFileDetail: React.FC = () => {
  const { user, loading } = useAuth();
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  const [file, setFile] = useState<ContactFile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLocation, setContactLocation] = useState('');
  const [contactLanguage, setContactLanguage] = useState('ro');

  useEffect(() => {
    if (user && fileId) {
      loadFileAndContacts();
    }
  }, [user, fileId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter(
        (c) =>
          c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone_e164.includes(searchQuery)
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const loadFileAndContacts = async () => {
    try {
      setIsLoading(true);

      const { data: fileData, error: fileError } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fileError) throw fileError;
      setFile(fileData);

      const { data: contactsData, error: contactsError } = await supabase
        .from('workflow_contacts')
        .select('*')
        .eq('list_id', fileId)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
      setFilteredContacts(contactsData || []);
    } catch (error: any) {
      console.error('Error loading file and contacts:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca datele',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      toast({
        title: 'Eroare',
        description: 'Numele și telefonul sunt obligatorii',
        variant: 'destructive',
      });
      return;
    }

    try {
      const phone = contactPhone.startsWith('+') ? contactPhone : `+${contactPhone}`;

      const { data, error } = await supabase
        .from('workflow_contacts')
        .insert({
          list_id: fileId,
          full_name: contactName.trim(),
          phone_e164: phone,
          info_json: {
            location: contactLocation.trim() || null,
            language: contactLanguage,
          },
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Contact adăugat cu succes',
      });

      setContacts([data, ...contacts]);
      setAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut adăuga contactul',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact || !contactName.trim() || !contactPhone.trim()) {
      toast({
        title: 'Eroare',
        description: 'Numele și telefonul sunt obligatorii',
        variant: 'destructive',
      });
      return;
    }

    try {
      const phone = contactPhone.startsWith('+') ? contactPhone : `+${contactPhone}`;

      const { error } = await supabase
        .from('workflow_contacts')
        .update({
          full_name: contactName.trim(),
          phone_e164: phone,
          info_json: {
            location: contactLocation.trim() || null,
            language: contactLanguage,
          },
        })
        .eq('id', editingContact.id);

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Contact actualizat cu succes',
      });

      loadFileAndContacts();
      setEditingContact(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating contact:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza contactul',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteContact = async (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Sigur doriți să ștergeți acest contact?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workflow_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Succes',
        description: 'Contact șters cu succes',
      });

      setContacts(contacts.filter((c) => c.id !== contactId));
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut șterge contactul',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(contact);
    setContactName(contact.full_name);
    setContactPhone(contact.phone_e164);
    setContactLocation(contact.info_json?.location || '');
    setContactLanguage(contact.info_json?.language || 'ro');
  };

  const resetForm = () => {
    setContactName('');
    setContactPhone('');
    setContactLocation('');
    setContactLanguage('ro');
  };

  const handleExportCSV = async () => {
    if (contacts.length === 0) {
      toast({
        title: 'Info',
        description: 'Nu există contacte de exportat',
      });
      return;
    }

    const headers = 'Nume,Telefon,Locație,Limbă\n';
    const rows = contacts
      .map((c) => {
        const location = c.info_json?.location || '';
        const language = c.info_json?.language || 'ro';
        return `${c.full_name || ''},${c.phone_e164 || ''},${location},${language}`;
      })
      .join('\n');

    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file?.name?.replace(/\s+/g, '_') || 'contacts'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Succes',
      description: 'CSV exportat cu succes',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Stats
  const validContacts = contacts.filter((c) => c.status !== 'failed').length;
  const invalidContacts = contacts.filter((c) => c.status === 'failed').length;
  const validPercent = contacts.length > 0 ? Math.round((validContacts / contacts.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-400" />
          <p className="text-zinc-500">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-64px)] bg-white relative pb-32">
        {/* Main Content - Centered */}
        <div className="flex justify-center p-10">
          <div className="w-full max-w-5xl">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/account/files')}
                  className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-black hover:border-black hover:text-white transition group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <div>
                  <h1 className="text-xl font-bold text-black tracking-tight flex items-center gap-2">
                    {file?.name || 'Se încarcă...'}
                    <span className="px-2 py-0.5 bg-zinc-100 rounded-full text-[10px] font-medium text-zinc-500">
                      Active
                    </span>
                  </h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {contacts.length} contacts • Updated 2h ago
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 group-hover:text-black transition" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-xs bg-zinc-50 border border-transparent rounded-lg focus:bg-white focus:border-black focus:outline-none transition w-64"
                  />
                </div>
                <button
                  onClick={() => setAddDialogOpen(true)}
                  className="flex items-center gap-2 bg-black hover:bg-zinc-800 text-white text-xs font-medium px-4 py-2 rounded-lg transition active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Contact
                </button>
              </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                  Total
                </span>
                <span className="text-lg font-bold text-black">{contacts.length}</span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                  Valid
                </span>
                <span className="text-lg font-bold text-black">{validContacts}</span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                  Invalid
                </span>
                <span className="text-lg font-bold text-zinc-300">{invalidContacts}</span>
              </div>
              <div
                onClick={handleExportCSV}
                className="p-3 rounded-lg border border-dashed border-zinc-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-zinc-50 transition hover:border-black group"
              >
                <span className="text-[10px] text-zinc-400 group-hover:text-black uppercase tracking-widest font-semibold transition">
                  Export
                </span>
                <Download className="w-4 h-4 text-zinc-300 group-hover:text-black mt-1 transition" />
              </div>
            </div>

            {/* Contacts List */}
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-4 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                <div className="col-span-4">Name / Company</div>
                <div className="col-span-3">Phone</div>
                <div className="col-span-3">Location</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-400" />
                  <p className="text-zinc-500 mt-4 text-sm">Se încarcă contactele...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16 border border-zinc-100 rounded-xl bg-zinc-50/50">
                  <div className="w-14 h-14 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-7 h-7 text-zinc-400" />
                  </div>
                  <h3 className="text-sm font-medium text-zinc-900 mb-1">
                    {searchQuery ? 'Nu s-au găsit rezultate' : 'Niciun contact'}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4">
                    {searchQuery
                      ? 'Încearcă o altă căutare'
                      : 'Adaugă primul contact în acest dosar'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setAddDialogOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-black rounded-md hover:bg-zinc-800 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adaugă Contact
                    </button>
                  )}
                </div>
              ) : (
                /* Contact Rows */
                filteredContacts.map((contact, index) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    index={index}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteContact}
                    getInitials={getInitials}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Dock */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50">
          <div className="flex items-center gap-6 bg-white/80 backdrop-blur-md border border-zinc-200 shadow-2xl shadow-zinc-200/50 rounded-full px-5 py-2.5 hover:scale-[1.02] transition-transform duration-300 ease-out">
            {/* Valid Percentage */}
            <div className="flex items-center gap-3 pr-6 border-r border-zinc-100 group cursor-pointer">
              <div className="relative w-8 h-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-black transition-all duration-1000 ease-out group-hover:text-zinc-600"
                    strokeDasharray={`${validPercent}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
                  {validPercent}%
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-zinc-900">Valid</span>
                <span className="text-[9px] text-zinc-400">Database health</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <DockButton icon={Filter} tooltip="Filter" />
              <DockButton icon={ArrowUpDown} tooltip="Sort" />
              <DockButton icon={Download} tooltip="Export" onClick={handleExportCSV} />
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Contact Dialog - New Minimal Design */}
      <Dialog
        open={addDialogOpen || !!editingContact}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingContact(null);
            resetForm();
          }
        }}
      >
        <DialogContent hideCloseButton className="sm:max-w-[420px] p-0 gap-0 overflow-hidden bg-white rounded-xl border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {/* Header */}
          <div className="px-6 pt-6 pb-2 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-zinc-900">
              {editingContact ? 'Edit Contact' : 'New Contact'}
            </h2>
            <button
              onClick={() => {
                setAddDialogOpen(false);
                setEditingContact(null);
                resetForm();
              }}
              className="text-zinc-400 hover:text-black transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500 ml-1">FULL NAME</label>
              <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 h-10 transition-all focus-within:border-black focus-within:shadow-[0_0_0_1px_black]">
                <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Ion Popescu"
                  className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500 ml-1">PHONE NUMBER</label>
              <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 h-10 transition-all focus-within:border-black focus-within:shadow-[0_0_0_1px_black]">
                <Phone className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+40..."
                  className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Location & Language Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Location */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 ml-1">LOCATION</label>
                <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 h-10 transition-all focus-within:border-black focus-within:shadow-[0_0_0_1px_black]">
                  <MapPin className="w-4 h-4 text-zinc-300" strokeWidth={1.5} />
                  <input
                    type="text"
                    value={contactLocation}
                    onChange={(e) => setContactLocation(e.target.value)}
                    placeholder="City"
                    className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Language */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500 ml-1">LANGUAGE</label>
                <div className="flex items-center bg-white border border-zinc-200 rounded-lg px-3 h-10 transition-all focus-within:border-black focus-within:shadow-[0_0_0_1px_black]">
                  <select
                    value={contactLanguage}
                    onChange={(e) => setContactLanguage(e.target.value)}
                    className="w-full bg-transparent text-sm text-zinc-900 focus:outline-none cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0 center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em',
                      paddingRight: '1.5rem',
                    }}
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="it">Italiano</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex justify-end gap-3">
            <button
              onClick={() => {
                setAddDialogOpen(false);
                setEditingContact(null);
                resetForm();
              }}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-black transition"
            >
              Cancel
            </button>
            <button
              onClick={editingContact ? handleUpdateContact : handleAddContact}
              className="px-6 py-2 rounded-lg text-xs font-medium bg-black text-white hover:bg-zinc-800 shadow-sm transition active:scale-95"
            >
              {editingContact ? 'Save Changes' : 'Save Contact'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// Dock Button Component
const DockButton: React.FC<{
  icon: React.ElementType;
  tooltip: string;
  onClick?: () => void;
}> = ({ icon: Icon, tooltip, onClick }) => (
  <button
    onClick={onClick}
    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-black transition relative group"
  >
    <Icon className="w-4 h-4" strokeWidth={1.5} />
    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-lg">
      {tooltip}
    </span>
  </button>
);

// Contact Row Component
const ContactRow: React.FC<{
  contact: Contact;
  index: number;
  onEdit: (contact: Contact, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  getInitials: (name: string) => string;
}> = ({ contact, index, onEdit, onDelete, getInitials }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Alternate avatar styles
  const avatarStyles = [
    'bg-zinc-100 text-zinc-600 border border-zinc-200',
    'bg-black text-white',
    'bg-zinc-50 text-zinc-400 border border-zinc-100',
    'bg-zinc-900 text-white',
  ];
  const avatarStyle = avatarStyles[index % avatarStyles.length];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-white rounded-xl p-3 grid grid-cols-12 items-center group cursor-default border transition-all duration-200 ${isHovered
          ? 'border-black scale-[1.005] shadow-[0_4px_12px_rgba(0,0,0,0.03)] z-10'
          : 'border-zinc-100'
        }`}
    >
      {/* Name / Company */}
      <div className="col-span-4 flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${avatarStyle}`}
        >
          {getInitials(contact.full_name)}
        </div>
        <div>
          <h3 className="text-xs font-semibold text-zinc-900">{contact.full_name}</h3>
          <p className="text-[10px] text-zinc-400">
            {contact.info_json?.company || contact.status}
          </p>
        </div>
      </div>

      {/* Phone */}
      <div className="col-span-3 flex items-center gap-2 text-zinc-600">
        <Phone className="w-3 h-3 text-zinc-300" />
        <span className="text-xs font-mono">{contact.phone_e164}</span>
      </div>

      {/* Location */}
      <div className="col-span-3 flex items-center gap-2 text-zinc-600">
        <MapPin className="w-3 h-3 text-zinc-300" />
        <span className="text-xs truncate">{contact.info_json?.location || '-'}</span>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex justify-end">
        <div
          className={`flex gap-1 bg-white pl-2 transition-all duration-200 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2.5'
            }`}
        >
          <button
            onClick={(e) => onEdit(contact, e)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-black transition"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => onDelete(contact.id, e)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-red-600 transition"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactFileDetail;
