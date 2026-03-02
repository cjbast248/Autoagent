import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, Pause, Square, RefreshCw, ExternalLink } from 'lucide-react';
import { useGoogleSheetsCampaign } from '@/hooks/useGoogleSheetsCampaign';
import { AgentSelector } from '@/components/outbound/AgentSelector';
import { PhoneSelector } from '@/components/outbound/PhoneSelector';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface GoogleSheetsCampaignManagerProps {
  integrationId: string;
  spreadsheetId: string;
  spreadsheetUrl?: string;
}

export const GoogleSheetsCampaignManager = ({
  integrationId,
  spreadsheetId,
  spreadsheetUrl,
}: GoogleSheetsCampaignManagerProps) => {
  const campaign = useGoogleSheetsCampaign({ integrationId });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: '⏳ Așteptare' },
      calling: { variant: 'default', label: '📞 Sună' },
      completed: { variant: 'default', label: '✅ Finalizat', className: 'bg-green-500' },
      failed: { variant: 'destructive', label: '❌ Eșuat' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-lg">Configurare Campanie</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Agent</Label>
            <AgentSelector
              selectedAgentId={campaign.agentId}
              onAgentSelect={campaign.setAgentId}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Număr Telefon</Label>
            <PhoneSelector
              selectedPhoneId={campaign.phoneNumber}
              onPhoneSelect={campaign.setPhoneNumber}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Interval între apeluri: {campaign.callInterval} secunde</Label>
          <Slider
            value={[campaign.callInterval]}
            onValueChange={([value]) => campaign.setCallInterval(value)}
            min={10}
            max={120}
            step={5}
          />
        </div>
      </Card>

      {/* Contacts List */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Contacte din Google Sheets</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => campaign.refetchContacts()}
              disabled={campaign.isLoadingContacts}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${campaign.isLoadingContacts ? 'animate-spin' : ''}`} />
              Reîmprospătează
            </Button>
            <Button
              size="sm"
              onClick={() => campaign.importContacts()}
              disabled={campaign.isImporting}
            >
              Import Contacte
            </Button>
            {spreadsheetUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(spreadsheetUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Vezi Sheet
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={campaign.selectAllContacts}
          >
            Selectează tot ({campaign.contacts.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={campaign.deselectAllContacts}
          >
            Deselectează tot
          </Button>
          <span className="text-sm text-muted-foreground">
            {campaign.selectedContacts.length} selectate
          </span>
        </div>

        <div className="border rounded-lg max-h-[400px] overflow-y-auto">
          {campaign.contacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Niciun contact. Click "Import Contacte" pentru a începe.
            </div>
          ) : (
            <div className="divide-y">
              {campaign.contacts.map((contact) => (
                <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-accent">
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox
                      checked={campaign.selectedContacts.includes(contact.id)}
                      onCheckedChange={() => campaign.toggleContactSelection(contact.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-muted-foreground">{contact.phone}</div>
                    </div>
                  </div>
                  {getStatusBadge(contact.call_status)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Total: {campaign.contacts.length} | Selectate: {campaign.selectedContacts.length}
        </div>
      </Card>

      {/* Campaign Control */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-lg">Control Campanie</h3>

        <div className="flex items-center justify-center">
          {!campaign.isCampaignRunning ? (
            <Button
              size="lg"
              className="w-full max-w-md"
              onClick={campaign.startCampaign}
              disabled={campaign.selectedContacts.length === 0}
            >
              <Play className="h-5 w-5 mr-2" />
              START CAMPANIE
            </Button>
          ) : campaign.isPaused ? (
            <Button
              size="lg"
              className="w-full max-w-md"
              onClick={campaign.resumeCampaign}
            >
              <Play className="h-5 w-5 mr-2" />
              CONTINUĂ
            </Button>
          ) : (
            <div className="flex gap-4 w-full max-w-md">
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                onClick={campaign.pauseCampaign}
              >
                <Pause className="h-5 w-5 mr-2" />
                PAUZĂ
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="flex-1"
                onClick={campaign.stopCampaign}
              >
                <Square className="h-5 w-5 mr-2" />
                STOP
              </Button>
            </div>
          )}
        </div>

        {campaign.isCampaignRunning && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress: {campaign.progress}/{campaign.totalCalls}</span>
                <span>{Math.round((campaign.progress / campaign.totalCalls) * 100)}%</span>
              </div>
              <Progress value={(campaign.progress / campaign.totalCalls) * 100} />
            </div>

            {campaign.currentContact && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Acum sună:</div>
                <div className="font-medium">{campaign.currentContact}</div>
              </div>
            )}

            {campaign.nextCallCountdown > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                Următorul apel în: {campaign.nextCallCountdown}s
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{campaign.campaignStats.completed}</div>
            <div className="text-xs text-muted-foreground">Reușite</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{campaign.campaignStats.failed}</div>
            <div className="text-xs text-muted-foreground">Eșuate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{campaign.campaignStats.pending}</div>
            <div className="text-xs text-muted-foreground">În așteptare</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{campaign.campaignStats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
