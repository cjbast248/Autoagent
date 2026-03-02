import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Loader2, Phone } from 'lucide-react';

interface CallInitiationSectionProps {
  phoneNumber: string;
  setPhoneNumber: React.Dispatch<React.SetStateAction<string>>;
  customAgentId: string;
  setCustomAgentId: React.Dispatch<React.SetStateAction<string>>;
  createdAgentId: string;
  onInitiateCall: () => void;
  isInitiatingCall: boolean;
}

export const CallInitiationSection: React.FC<CallInitiationSectionProps> = ({
                                                                              phoneNumber,
                                                                              setPhoneNumber,
                                                                              customAgentId,
                                                                              setCustomAgentId,
                                                                              createdAgentId,
                                                                              onInitiateCall,
                                                                              isInitiatingCall,
                                                                            }) => {
  const agentIdToUse = customAgentId.trim() || createdAgentId;
  const isCallDisabled = !agentIdToUse || !phoneNumber.trim() || isInitiatingCall;

  return (
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Phone className="w-5 h-5 text-accent" />
            Pas 2: Inițiază Apel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone-number" className="text-foreground">
              Numărul de Telefon
            </Label>
            <Input
                id="phone-number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+40712345678"
                className="glass-input"
            />
          </div>

          <div>
            <Label htmlFor="custom-agent-id" className="text-foreground">
              ID Agent (opțional - folosește agentul creat mai sus dacă este gol)
            </Label>
            <Input
                id="custom-agent-id"
                value={customAgentId}
                onChange={(e) => setCustomAgentId(e.target.value)}
                placeholder="agent_id_custom"
                className="glass-input"
            />
          </div>

          {agentIdToUse && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Agent folosit: <span className="font-mono text-foreground">{agentIdToUse}</span>
                </p>
              </div>
          )}

          <Button
              onClick={onInitiateCall}
              disabled={isCallDisabled}
              className="bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center"
          >
            {isInitiatingCall ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se Inițiază Apel
                </>
            ) : (
                'Inițiază Apel'
            )}
          </Button>
        </CardContent>
      </Card>
  );
};

