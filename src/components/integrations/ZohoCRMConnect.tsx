import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Info } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ZohoCRMConnectProps {
  onConnectionSuccess?: () => void;
}

export function ZohoCRMConnect({ onConnectionSuccess }: ZohoCRMConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [zohoRegion, setZohoRegion] = useState("eu");
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);

  const handleConnect = async () => {
    if (!clientId || !clientSecret) {
      toast.error("Client ID și Client Secret sunt obligatorii");
      return;
    }

    setIsConnecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Trebuie să fii autentificat");
        return;
      }

      // Call edge function to initiate OAuth flow with user credentials
      const { data, error } = await supabase.functions.invoke('zoho-oauth-init', {
        body: {
          user_id: user.id,
          client_id: clientId,
          client_secret: clientSecret,
          zoho_region: zohoRegion
        }
      });

      if (error) throw error;

      if (data.authorization_url) {
        // Open OAuth authorization URL
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Zoho connect error:', error);
      toast.error("Eroare la conectarea cu Zoho CRM");
    } finally {
      setIsConnecting(false);
    }
  };

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('zoho_crm_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setIsConnected(!!data);
    } catch (error) {
      console.error('Check connection error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Zoho CRM
              {isConnected && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Conectat
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sincronizare automată a apelurilor și contactelor cu Zoho CRM
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Funcționalități:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Call logs din Agentauto → Zoho CRM Activities</li>
            <li>• Import contacte din Zoho CRM → Agentauto Campaigns</li>
            <li>• Update automat Lead Status după apeluri</li>
            <li>• Sincronizare bidirecțională</li>
          </ul>
        </div>

        {!isConnected ? (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Configurare OAuth Credentials</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-sm">
                  Pentru a conecta Zoho CRM, trebuie să creezi o aplicație în Zoho API Console și să obții Client ID și Client Secret.
                </p>
                <a
                  href="https://api-console.zoho.eu/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  Deschide Zoho API Console <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            {!showCredentialsForm ? (
              <Button
                onClick={() => setShowCredentialsForm(true)}
                className="w-full"
              >
                Configurează OAuth Credentials
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="zoho-region">Zoho Region</Label>
                  <Select value={zohoRegion} onValueChange={setZohoRegion}>
                    <SelectTrigger id="zoho-region">
                      <SelectValue placeholder="Selectează regiunea" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eu">Europe (.eu)</SelectItem>
                      <SelectItem value="com">United States (.com)</SelectItem>
                      <SelectItem value="in">India (.in)</SelectItem>
                      <SelectItem value="au">Australia (.au)</SelectItem>
                      <SelectItem value="jp">Japan (.jp)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selectează data center-ul unde este configurat contul tău Zoho
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zoho-client-id">Client ID</Label>
                  <Input
                    id="zoho-client-id"
                    type="text"
                    placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXX"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zoho-client-secret">Client Secret</Label>
                  <Input
                    id="zoho-client-secret"
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting || !clientId || !clientSecret}
                    className="flex-1"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Conectare...
                      </>
                    ) : (
                      "Conectează Zoho CRM"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCredentialsForm(false)}
                  >
                    Anulează
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Zoho CRM este conectat și sincronizează automat
            </div>
            <Button variant="outline" className="w-full" onClick={checkConnection}>
              Verifică status
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
