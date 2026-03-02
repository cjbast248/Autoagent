import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useUserAgents } from '@/hooks/useUserAgents';
import { useUserPhoneNumbers } from '@/hooks/useUserPhoneNumbers';

interface NodePropertiesPanelProps {
  node: any;
  onUpdate: (newData: any) => void;
  onClose: () => void;
}

export const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  node,
  onUpdate,
  onClose,
}) => {
  const [label, setLabel] = useState(node.label || '');
  const [description, setDescription] = useState(node.description || '');
  const [config, setConfig] = useState(node.config || {});

  const { data: agents = [] } = useUserAgents();
  const { data: phoneNumbers = [] } = useUserPhoneNumbers();

  // Sync state when node changes
  useEffect(() => {
    setLabel(node.label || '');
    setDescription(node.description || '');
    setConfig(node.config || {});
  }, [node.id]);

  const handleSave = () => {
    onUpdate({ label, description, config });
    onClose();
  };

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  return (
    <Card className="w-80 border-l rounded-none h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Configurare</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-label">Nume Nod</Label>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Numele nodului"
            />
          </div>

          {/* Trigger Node Config */}
          {node.type === 'trigger' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="trigger-type">Tip Pornire</Label>
                <Select
                  value={config.triggerType || 'manual'}
                  onValueChange={(value) => updateConfig('triggerType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alege tip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (buton)</SelectItem>
                    <SelectItem value="scheduled">Programat (interval)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.triggerType === 'scheduled' && (
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval (minute)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={config.intervalMinutes || 5}
                    onChange={(e) => updateConfig('intervalMinutes', parseInt(e.target.value))}
                    placeholder="5"
                    min="1"
                  />
                </div>
              )}
            </>
          )}

          {/* Call Node Config */}
          {node.type === 'call' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="agent-id">Agent AI</Label>
                <Select
                  value={config.agentId || ''}
                  onValueChange={(value) => updateConfig('agentId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.agent_id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-id">Număr Telefon</Label>
                <Select
                  value={config.phoneId || ''}
                  onValueChange={(value) => updateConfig('phoneId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează număr" />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneNumbers.map((phone: any) => (
                      <SelectItem key={phone.id} value={phone.id}>
                        {phone.phone_number} {phone.label && `(${phone.label})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-source">Sursă Contacte</Label>
                <Select
                  value={config.contactSource || 'zoho'}
                  onValueChange={(value) => updateConfig('contactSource', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alege sursă" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoho">Zoho CRM</SelectItem>
                    <SelectItem value="contacts_database">Contacte Database</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="call-interval">Interval între Apeluri (sec)</Label>
                <Input
                  id="call-interval"
                  type="number"
                  value={config.callInterval || 20}
                  onChange={(e) => updateConfig('callInterval', parseInt(e.target.value))}
                  placeholder="20"
                  min="5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-attempts">Încercări Maxime</Label>
                <Input
                  id="max-attempts"
                  type="number"
                  value={config.maxAttempts || 2}
                  onChange={(e) => updateConfig('maxAttempts', parseInt(e.target.value))}
                  placeholder="2"
                  min="1"
                  max="5"
                />
              </div>
            </>
          )}

          {/* Destination Node Config */}
          {node.type === 'destination' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="destination-type">Tip Destinație</Label>
                <Select
                  value={config.destinationType || 'zoho_crm'}
                  onValueChange={(value) => updateConfig('destinationType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alege destinație" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_sheets">Google Sheets</SelectItem>
                    <SelectItem value="zoho_crm">Zoho CRM</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.destinationType === 'zoho_crm' && (
                <>
                  <div className="space-y-2">
                    <Label>Modul Zoho</Label>
                    <Select
                      value={config.zohoModule || 'Leads'}
                      onValueChange={(value) => updateConfig('zohoModule', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Leads">Leads</SelectItem>
                        <SelectItem value="Contacts">Contacts</SelectItem>
                        <SelectItem value="Deals">Deals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Acțiune</Label>
                    <Select
                      value={config.zohoAction || 'update'}
                      onValueChange={(value) => updateConfig('zohoAction', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {config.destinationType === 'webhook' && (
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    value={config.webhookUrl || ''}
                    onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="field-mapping">Mapare Date (JSON)</Label>
                <Textarea
                  id="field-mapping"
                  value={typeof config.fieldMapping === 'string' ? config.fieldMapping : JSON.stringify(config.fieldMapping || {}, null, 2)}
                  onChange={(e) => updateConfig('fieldMapping', e.target.value)}
                  placeholder={'{\n  "zoho_field": "{{extracted.value}}"\n}'}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}

          {/* End Node Config */}
          {node.type === 'end' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="end-action">Acțiune Finală</Label>
                <Select
                  value={config.action || 'stop'}
                  onValueChange={(value) => updateConfig('action', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alege acțiune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stop">Stop (termină)</SelectItem>
                    <SelectItem value="loop">Loop (reîncepe)</SelectItem>
                    <SelectItem value="conditional_loop">Loop Condiționat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.action === 'loop' && (
                <div className="space-y-2">
                  <Label>Pauză înainte de Loop (minute)</Label>
                  <Input
                    type="number"
                    value={config.loopDelay || 5}
                    onChange={(e) => updateConfig('loopDelay', parseInt(e.target.value))}
                    placeholder="5"
                    min="1"
                  />
                </div>
              )}
            </>
          )}

          <Button onClick={handleSave} className="w-full">
            Salvează Configurarea
          </Button>
        </div>
      </ScrollArea>
    </Card>
  );
};
