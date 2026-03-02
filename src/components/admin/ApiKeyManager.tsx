import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Key, Save, RotateCcw } from 'lucide-react';

const ApiKeyManager: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [keyExists, setKeyExists] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkApiKeyExists();
  }, []);

  const checkApiKeyExists = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-voice-api-key');
      if (error) throw error;
      setKeyExists(data?.exists || false);
    } catch (error) {
      console.error('Error checking API key:', error);
    }
  };

  const handleUpdateApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Eroare",
        description: "Cheia API nu poate fi goală",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('update-voice-api-key', {
        body: { apiKey: apiKey.trim() }
      });

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Cheia API pentru serviciul vocal a fost actualizată cu succes",
      });

      setApiKey('');
      setShowApiKey(false);
      setKeyExists(true);
    } catch (error) {
      console.error('Error updating API key:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut actualiza cheia API",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestApiKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-voice-api-key');
      if (error) throw error;

      if (data?.valid) {
        toast({
          title: "Succes",
          description: "Cheia API funcționează corect",
        });
      } else {
        toast({
          title: "Eroare",
          description: "Cheia API nu este validă sau serviciul nu este disponibil",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut testa cheia API",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Gestionare Cheie API Serviciu Vocal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">Cheie API Serviciu Vocal</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={keyExists ? "••••••••••••••••••••••••••••••••" : "Introduceți cheia API"}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleUpdateApiKey}
              disabled={isUpdating || !apiKey.trim()}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <RotateCcw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {keyExists ? 'Actualizează' : 'Salvează'}
            </Button>
          </div>
        </div>

        {keyExists && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestApiKey}
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              Testează Conexiunea
            </Button>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Informații importante:</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Cheia API este stocată securizat în baza de date criptată</li>
            <li>• Modificarea cheii va afecta toate funcționalitățile vocale ale platformei</li>
            <li>• Asigurați-vă că noua cheie API este validă înainte de salvare</li>
            <li>• Serviciul vocal va fi întrerupt temporar în timpul actualizării</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyManager;