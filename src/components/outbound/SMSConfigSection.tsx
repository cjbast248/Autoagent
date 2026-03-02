import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface SMSConfig {
  enabled: boolean;
  apiToken: string;
  senderId: string;
  message: string;
  delay: number;
}

interface SMSConfigSectionProps {
  config: SMSConfig;
  onConfigChange: (config: SMSConfig) => void;
}

export const SMSConfigSection: React.FC<SMSConfigSectionProps> = ({
  config,
  onConfigChange
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">SMS</span>
          <Badge variant={config.enabled ? "default" : "secondary"} className="text-xs">
            {config.enabled ? "Activat" : "Dezactivat"}
          </Badge>
        </div>
        <Switch 
          checked={config.enabled} 
          onCheckedChange={(checked) => onConfigChange({...config, enabled: checked})}
        />
      </div>
      
      {config.enabled && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Token API</label>
            <Input
              placeholder="Token API pentru SMS"
              value={config.apiToken}
              onChange={(e) => onConfigChange({...config, apiToken: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Mesaj</label>
            <Textarea
              placeholder="Mesajul care va fi trimis după apel"
              value={config.message}
              onChange={(e) => onConfigChange({...config, message: e.target.value})}
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
};