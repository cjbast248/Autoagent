import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InteractivePhoneCall } from '@/components/voice/InteractivePhoneCall';
import { VoiceWaveAnimation } from '@/components/voice/VoiceWaveAnimation';
import { VoiceVisualizer } from '@/components/voice/VoiceVisualizer';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { Mic, Volume2, Phone } from 'lucide-react';
import { toast } from 'sonner';

const VoiceDemo = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [waveIntensity, setWaveIntensity] = useState(0.5);

  const {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceRecognition({
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        toast.success(`Recunoscut: "${text}"`);
      }
    },
    onError: (error) => {
      toast.error(`Eroare: ${error}`);
    }
  });

  const handleDemoChange = (demo: string) => {
    setActiveDemo(activeDemo === demo ? null : demo);
    if (demo === 'wave') {
      // Simulate varying intensity
      const interval = setInterval(() => {
        setWaveIntensity(Math.random());
      }, 200);
      
      setTimeout(() => clearInterval(interval), 5000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            🎙️ KALINA Voice Experience
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Experimentează cu animațiile vocale interactive și tehnologia de recunoaștere vocală
          </p>
        </div>

        <Tabs defaultValue="visualizer" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visualizer">Voice Visualizer</TabsTrigger>
            <TabsTrigger value="phone">Phone Call</TabsTrigger>
            <TabsTrigger value="waves">Wave Animation</TabsTrigger>
            <TabsTrigger value="recognition">Voice Recognition</TabsTrigger>
          </TabsList>

          <TabsContent value="visualizer" className="space-y-6">
            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Voice Visualizer
                </CardTitle>
                <CardDescription>
                  Vizualizare avansată a activității vocale cu efecte interactive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <VoiceVisualizer
                    isListening={activeDemo === 'listening'}
                    isSpeaking={activeDemo === 'speaking'}
                    isConnected={activeDemo !== null}
                    voiceLevel={waveIntensity}
                  />
                  
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={() => handleDemoChange('listening')}
                      variant={activeDemo === 'listening' ? 'default' : 'outline'}
                      className="glass-button"
                    >
                      Simulează Ascultare
                    </Button>
                    <Button
                      onClick={() => handleDemoChange('speaking')}
                      variant={activeDemo === 'speaking' ? 'default' : 'outline'}
                      className="glass-button"
                    >
                      Simulează Vorbire
                    </Button>
                    <Button
                      onClick={() => setActiveDemo(null)}
                      variant="outline"
                      className="glass-button"
                    >
                      Stop
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phone" className="space-y-6">
            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Interactive Phone Call
                </CardTitle>
                <CardDescription>
                  Experiență completă de apel telefonic cu animații și controale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InteractivePhoneCall
                  onCallStart={() => toast.success('Apel început!')}
                  onCallEnd={() => toast.info('Apel încheiat!')}
                  onToggleMute={() => toast.info('Mute activat/dezactivat')}
                  onToggleVolume={() => toast.info('Volum activat/dezactivat')}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waves" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="liquid-glass">
                <CardHeader>
                  <CardTitle>Primary Wave</CardTitle>
                  <CardDescription>Animație cu tema principală</CardDescription>
                </CardHeader>
                <CardContent>
                  <VoiceWaveAnimation
                    isActive={activeDemo === 'wave-primary'}
                    intensity={waveIntensity}
                    color="primary"
                    size="lg"
                  />
                  <div className="mt-4 text-center">
                    <Button
                      onClick={() => handleDemoChange('wave-primary')}
                      variant={activeDemo === 'wave-primary' ? 'default' : 'outline'}
                      className="glass-button"
                    >
                      {activeDemo === 'wave-primary' ? 'Stop' : 'Start'} Primary
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="liquid-glass">
                <CardHeader>
                  <CardTitle>Success Wave</CardTitle>
                  <CardDescription>Animație pentru acțiuni reușite</CardDescription>
                </CardHeader>
                <CardContent>
                  <VoiceWaveAnimation
                    isActive={activeDemo === 'wave-success'}
                    intensity={waveIntensity}
                    color="success"
                    size="lg"
                  />
                  <div className="mt-4 text-center">
                    <Button
                      onClick={() => handleDemoChange('wave-success')}
                      variant={activeDemo === 'wave-success' ? 'default' : 'outline'}
                      className="glass-button"
                    >
                      {activeDemo === 'wave-success' ? 'Stop' : 'Start'} Success
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recognition" className="space-y-6">
            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Voice Recognition
                </CardTitle>
                <CardDescription>
                  Recunoaștere vocală în timp real cu transcript live
                  {!isSupported && (
                    <span className="text-destructive block mt-1">
                      ⚠️ Browser-ul nu suportă recunoașterea vocală
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <VoiceWaveAnimation
                    isActive={isListening}
                    intensity={0.7}
                    color="success"
                    size="xl"
                  />
                  
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={isListening ? stopListening : startListening}
                      disabled={!isSupported}
                      variant={isListening ? 'destructive' : 'default'}
                      className="glass-button"
                    >
                      {isListening ? 'Stop Listening' : 'Start Listening'}
                    </Button>
                    <Button
                      onClick={resetTranscript}
                      variant="outline"
                      className="glass-button"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                {transcript && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Transcript Live:</h3>
                    <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                      <p className="text-sm leading-relaxed">
                        {transcript || "Vorbește pentru a vedea textul aici..."}
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-destructive text-sm">Eroare: {error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default VoiceDemo;