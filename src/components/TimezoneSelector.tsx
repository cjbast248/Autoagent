import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TimezoneSelectorProps {
  value?: string;
  onChange: (timezone: string) => void;
  className?: string;
}

const COMMON_TIMEZONES = [
  'UTC',
  'Eastern Time (US)',
  'Central Time (US)', 
  'Mountain Time (US)',
  'Pacific Time (US)',
  'London',
  'Paris/Berlin',
  'Amsterdam',
  'Tokyo',
  'Shanghai',
  'India',
  'Sydney',
  'Auckland'
];

const ALL_TIMEZONES = [
  'UTC',
  'Eastern Time (US)',
  'Central Time (US)',
  'Mountain Time (US)', 
  'Pacific Time (US)',
  'London',
  'Paris/Berlin',
  'Amsterdam',
  'Tokyo',
  'Shanghai',
  'India',
  'Sydney',
  'Auckland',
  'Europe/Chisinau',
  'Europe/Bucharest',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Australia/Melbourne',
  'Africa/Cairo',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Athens',
  'Asia/Seoul',
  'Asia/Manila'
];

const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({ value, onChange, className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredTimezones = searchQuery.trim() 
    ? ALL_TIMEZONES.filter(tz => 
        tz.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : COMMON_TIMEZONES;

  const handleTimezoneSelect = (timezone: string) => {
    onChange(timezone);
    setIsExpanded(false);
    setSearchQuery('');
  };

  return (
    <div className={className}>
      <Label className="text-foreground">Fus Orar</Label>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={value || ''}
            readOnly
            placeholder="Selectează fusul orar..."
            className="glass-input cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="glass-button border-border"
          >
            {isExpanded ? 'Închide' : 'Selectează'}
          </Button>
        </div>

        {isExpanded && (
          <Card className="border border-border bg-background/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Search Timezones</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search for a timezone (e.g., America/New_York, Europe/London)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  {searchQuery.trim() ? 'Search Results' : 'Common Timezones'}
                </Label>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredTimezones.map((timezone) => (
                    <Button
                      key={timezone}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-accent/10 text-foreground"
                      onClick={() => handleTimezoneSelect(timezone)}
                    >
                      {timezone}
                    </Button>
                  ))}
                  {filteredTimezones.length === 0 && (
                    <div className="text-sm text-muted-foreground p-2">
                      Nu s-au găsit fusuri orare
                    </div>
                  )}
                </div>
              </div>

              {value && (
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTimezoneSelect('')}
                    className="w-full text-muted-foreground"
                  >
                    Remove timezone
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TimezoneSelector;