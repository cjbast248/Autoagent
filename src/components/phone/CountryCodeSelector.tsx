import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const countries = [
  { code: '+1', name: 'US', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+49', name: 'DE', flag: '🇩🇪' },
  { code: '+33', name: 'FR', flag: '🇫🇷' },
  { code: '+39', name: 'IT', flag: '🇮🇹' },
  { code: '+34', name: 'ES', flag: '🇪🇸' },
  { code: '+31', name: 'NL', flag: '🇳🇱' },
  { code: '+32', name: 'BE', flag: '🇧🇪' },
  { code: '+41', name: 'CH', flag: '🇨🇭' },
  { code: '+43', name: 'AT', flag: '🇦🇹' },
  { code: '+45', name: 'DK', flag: '🇩🇰' },
  { code: '+46', name: 'SE', flag: '🇸🇪' },
  { code: '+47', name: 'NO', flag: '🇳🇴' },
  { code: '+48', name: 'PL', flag: '🇵🇱' },
  { code: '+351', name: 'PT', flag: '🇵🇹' },
  { code: '+352', name: 'LU', flag: '🇱🇺' },
  { code: '+353', name: 'IE', flag: '🇮🇪' },
  { code: '+354', name: 'IS', flag: '🇮🇸' },
  { code: '+358', name: 'FI', flag: '🇫🇮' },
  { code: '+373', name: 'MD', flag: '🇲🇩' },
  { code: '+40', name: 'RO', flag: '🇷🇴' },
  { code: '+7', name: 'RU', flag: '🇷🇺' },
  { code: '+380', name: 'UA', flag: '🇺🇦' },
  { code: '+90', name: 'TR', flag: '🇹🇷' },
  { code: '+30', name: 'GR', flag: '🇬🇷' },
  { code: '+385', name: 'HR', flag: '🇭🇷' },
  { code: '+386', name: 'SI', flag: '🇸🇮' },
  { code: '+387', name: 'BA', flag: '🇧🇦' },
  { code: '+381', name: 'RS', flag: '🇷🇸' },
  { code: '+382', name: 'ME', flag: '🇲🇪' },
  { code: '+383', name: 'XK', flag: '🇽🇰' },
  { code: '+389', name: 'MK', flag: '🇲🇰' },
  { code: '+359', name: 'BG', flag: '🇧🇬' },
];

export const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {countries.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <div className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span className="text-sm">{country.code}</span>
              <span className="text-xs text-muted-foreground">{country.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};