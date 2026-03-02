
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  language: string;
  location: string;
}

interface ContactsListProps {
  contacts: Contact[];
  selectedContacts: Set<string>;
  onContactSelect: (contactId: string, checked: boolean) => void;
  onSelectAll: () => void;
  isProcessingBatch: boolean;
}

export const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  selectedContacts,
  onContactSelect,
  onSelectAll,
  isProcessingBatch,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Contacte Încărcate ({contacts.length})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            disabled={isProcessingBatch}
          >
            {selectedContacts.size === contacts.length ? 'Deselectează Tot' : 'Selectează Tot'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
          {contacts.map(contact => (
            <div key={contact.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={selectedContacts.has(contact.id)}
                onChange={(e) => onContactSelect(contact.id, e.target.checked)}
                className="rounded"
                disabled={isProcessingBatch}
              />
              <div className="flex-1">
                <span className="font-medium">{contact.name}</span>
                <span className="text-sm text-gray-600 ml-2">{contact.phone}</span>
              </div>
              <span className="text-xs text-gray-500">
                {contact.language}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
