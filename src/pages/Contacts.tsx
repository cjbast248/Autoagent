import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ContactsList } from '@/components/contacts/ContactsList';
import { ContactForm } from '@/components/contacts/ContactForm';
import { ContactInteractionHistory } from '@/components/contacts/ContactInteractionHistory';
import { ContactStats } from '@/components/contacts/ContactStats';
import { CSVImportExport } from '@/components/contacts/CSVImportExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Filter } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Contacts() {
  const { t } = useLanguage();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInteractionHistory, setShowInteractionHistory] = useState(false);

  const {
    contacts,
    isLoading,
    createContact,
    updateContact,
    deleteContact,
    refreshContacts
  } = useContacts();

  const filteredContacts = contacts?.filter(contact => {
    const matchesSearch = contact.nume.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.telefon.includes(searchTerm) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleEditContact = (contact: any) => {
    setSelectedContact(contact);
    setIsFormOpen(true);
  };

  const handleViewHistory = (contact: any) => {
    setSelectedContact(contact);
    setShowInteractionHistory(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedContact(null);
  };

  const handleFormSubmit = async (data: any) => {
    if (selectedContact) {
      await updateContact({ id: selectedContact.id, ...data });
    } else {
      await createContact(data);
    }
    handleFormClose();
    refreshContacts();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('contacts.title')}</h1>
            <p className="text-muted-foreground">{t('contacts.subtitle')}</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button data-action="new-contact" onClick={() => setSelectedContact(null)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('contacts.newContact')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedContact ? t('contacts.editContact') : t('contacts.newContact')}
                </DialogTitle>
              </DialogHeader>
              <ContactForm
                contact={selectedContact}
                onSubmit={handleFormSubmit}
                onCancel={handleFormClose}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <ContactStats contacts={contacts} />

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t('contacts.searchAndFilter')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder={t('contacts.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('contacts.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('contacts.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('contacts.activeStatus')}</SelectItem>
                  <SelectItem value="inactive">{t('contacts.inactiveStatus')}</SelectItem>
                  <SelectItem value="blocked">{t('contacts.blockedStatus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* CSV Import/Export */}
        <CSVImportExport onImportSuccess={refreshContacts} />

        {/* Contacts List */}
        <ContactsList
          contacts={filteredContacts}
          isLoading={isLoading}
          onEdit={handleEditContact}
          onDelete={deleteContact}
          onViewHistory={handleViewHistory}
        />

        {/* Interaction History Modal */}
        <Dialog open={showInteractionHistory} onOpenChange={setShowInteractionHistory}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t('contacts.interactionHistory')} - {selectedContact?.nume}
              </DialogTitle>
            </DialogHeader>
            {selectedContact && (
              <ContactInteractionHistory contactId={selectedContact.id} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}