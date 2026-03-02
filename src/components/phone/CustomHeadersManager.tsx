import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

interface CustomHeader {
  key: string;
  value: string;
}

interface CustomHeadersManagerProps {
  headers: CustomHeader[];
  onChange: (headers: CustomHeader[]) => void;
}

export const CustomHeadersManager: React.FC<CustomHeadersManagerProps> = ({ headers, onChange }) => {
  const addHeader = () => {
    onChange([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    onChange(newHeaders);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = headers.map((header, i) => 
      i === index ? { ...header, [field]: value } : header
    );
    onChange(newHeaders);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Custom Headers</Label>
        <Button type="button" variant="outline" size="sm" onClick={addHeader}>
          <Plus className="h-4 w-4 mr-1" />
          Add Header
        </Button>
      </div>
      
      {headers.length === 0 && (
        <p className="text-sm text-muted-foreground">No custom headers added</p>
      )}
      
      {headers.map((header, index) => (
        <div key={index} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="Header key"
              value={header.key}
              onChange={(e) => updateHeader(index, 'key', e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Header value"
              value={header.value}
              onChange={(e) => updateHeader(index, 'value', e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeHeader(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};