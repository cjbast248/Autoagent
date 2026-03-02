import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';

interface CSVImportExportProps {
  onImportSuccess: () => void;
}

export function CSVImportExport({ onImportSuccess }: CSVImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { contacts, createContact } = useContacts();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Vă rugăm să selectați un fișier CSV valid');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Validate required headers
      const requiredHeaders = ['nume', 'telefon'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        toast.error(`CSV-ul trebuie să conțină coloanele: ${missingHeaders.join(', ')}`);
        return;
      }

      const contactsToImport = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        
        const contact: any = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            switch (header) {
              case 'nume':
                contact.nume = values[index];
                break;
              case 'telefon':
                contact.telefon = values[index];
                break;
              case 'email':
                contact.email = values[index];
                break;
              case 'tara':
                contact.tara = values[index];
                break;
              case 'locatie':
                contact.locatie = values[index];
                break;
              case 'company':
              case 'companie':
                contact.company = values[index];
                break;
              case 'info':
              case 'informatii':
                contact.info = values[index];
                break;
              case 'notes':
              case 'note':
                contact.notes = values[index];
                break;
              case 'status':
                contact.status = values[index];
                break;
            }
          }
        });

        if (contact.nume && contact.telefon) {
          contactsToImport.push(contact);
        }
      }

      if (contactsToImport.length === 0) {
        toast.error('Nu s-au găsit contacte valide în fișier');
        return;
      }

      // Import contacts
      let importedCount = 0;
      for (const contact of contactsToImport) {
        try {
          await createContact(contact);
          importedCount++;
        } catch (error) {
          console.error('Error importing contact:', contact, error);
        }
      }

      toast.success(`${importedCount} contacte importate cu succes`);
      onImportSuccess();
      
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast.error('Eroare la procesarea fișierului CSV');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = 'nume,telefon,email,tara,locatie,company,info,notes,status\n"Ion Popescu","+40712345678","ion@example.com","Romania","Bucuresti","ABC Company","Client important","Contact preferat dimineata","active"';
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'template_contacte.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportContacts = () => {
    if (contacts.length === 0) {
      toast.error('Nu există contacte de exportat');
      return;
    }

    const headers = 'nume,telefon,email,tara,locatie,company,info,notes,status,created_at';
    const csvContent = [
      headers,
      ...contacts.map(contact => 
        `"${contact.nume}","${contact.telefon}","${contact.email || ''}","${contact.tara || ''}","${contact.locatie || ''}","${contact.company || ''}","${contact.info || ''}","${contact.notes || ''}","${contact.status}","${contact.created_at}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `contacte_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast.success(`${contacts.length} contacte exportate cu succes`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Import/Export CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <Button onClick={handleFileSelect} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importă CSV
          </Button>
          
          <Button onClick={exportContacts} variant="outline" disabled={contacts.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportă CSV
          </Button>
          
          <Button onClick={downloadTemplate} variant="ghost">
            <Download className="w-4 h-4 mr-2" />
            Descarcă Template
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4">
          CSV-ul trebuie să conțină cel puțin coloanele: <strong>nume, telefon</strong>
          <br />
          Coloane opționale: email, tara, locatie, company, info, notes, status
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </CardContent>
    </Card>
  );
}