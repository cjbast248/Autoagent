import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TransportTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const transportTypes = [
  { value: 'tcp', label: 'TCP', description: 'Transmission Control Protocol' },
  { value: 'udp', label: 'UDP', description: 'User Datagram Protocol' },
  { value: 'tls', label: 'TLS', description: 'Transport Layer Security' },
];

export const TransportTypeSelector: React.FC<TransportTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {transportTypes.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            <div className="flex flex-col">
              <span className="font-medium">{type.label}</span>
              <span className="text-xs text-muted-foreground">{type.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};