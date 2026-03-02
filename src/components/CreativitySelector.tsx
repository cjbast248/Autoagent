
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface CreativitySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const creativityOptions = [
  { label: 'Deterministic', value: 0.0, description: 'Răspunsuri consistente și predictibile' },
  { label: 'Creativ', value: 0.5, description: 'Echilibru între consistență și creativitate' },
  { label: 'Foarte Creativ', value: 1.0, description: 'Răspunsuri foarte creative și variate' }
];

const CreativitySelector: React.FC<CreativitySelectorProps> = ({ value, onChange }) => {
  const currentOption = creativityOptions.find(option => option.value === value) || creativityOptions[0];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Label htmlFor="creativity-select" className="text-foreground">Creativitate</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">Setarea creativității</p>
                <p className="text-sm">
                  Această setare controlează creativitatea și aleatorismul răspunsurilor generate de agent.
                </p>
                <p className="text-sm text-amber-600">
                  <strong>Atenție:</strong> Cu cât agentul este mai creativ, cu atât mai mult se poate abate de la instrucțiuni.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Select
        value={value.toString()}
        onValueChange={(stringValue) => onChange(parseFloat(stringValue))}
      >
        <SelectTrigger id="creativity-select" className="glass-input">
          <SelectValue placeholder="Selectează creativitatea" />
        </SelectTrigger>
        <SelectContent className="bg-background border border-border">
          {creativityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              <div className="flex flex-col text-left w-full">
                <span className="text-left">{option.label}</span>
                <span className="text-xs text-muted-foreground text-left">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CreativitySelector;
