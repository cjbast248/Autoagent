import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contact } from '@/hooks/useContacts';

interface ContactFormProps {
  contact?: Contact | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function ContactForm({ contact, onSubmit, onCancel }: ContactFormProps) {
  const [formData, setFormData] = useState({
    nume: '',
    telefon: '',
    email: '',
    company: '',
    tara: '',
    locatie: '',
    info: '',
    notes: '',
    status: 'active',
    tags: [] as string[]
  });

  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (contact) {
      setFormData({
        nume: contact.nume || '',
        telefon: contact.telefon || '',
        email: contact.email || '',
        company: contact.company || '',
        tara: contact.tara || '',
        locatie: contact.locatie || '',
        info: contact.info || '',
        notes: contact.notes || '',
        status: contact.status || 'active',
        tags: contact.tags || []
      });
      setTagsInput(contact.tags?.join(', ') || '');
    }
  }, [contact]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nume">Nume *</Label>
          <Input
            id="nume"
            value={formData.nume}
            onChange={(e) => handleChange('nume', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefon">Telefon *</Label>
          <Input
            id="telefon"
            value={formData.telefon}
            onChange={(e) => handleChange('telefon', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Companie</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => handleChange('company', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tara">Țară</Label>
          <Input
            id="tara"
            value={formData.tara}
            onChange={(e) => handleChange('tara', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locatie">Locație</Label>
          <Input
            id="locatie"
            value={formData.locatie}
            onChange={(e) => handleChange('locatie', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activ</SelectItem>
            <SelectItem value="inactive">Inactiv</SelectItem>
            <SelectItem value="blocked">Blocat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (separați prin virgulă)</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => handleTagsChange(e.target.value)}
          placeholder="client_vip, prospect, urgent"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="info">Informații Generale</Label>
        <Textarea
          id="info"
          value={formData.info}
          onChange={(e) => handleChange('info', e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Anulează
        </Button>
        <Button type="submit">
          {contact ? 'Actualizează' : 'Adaugă'} Contact
        </Button>
      </div>
    </form>
  );
}