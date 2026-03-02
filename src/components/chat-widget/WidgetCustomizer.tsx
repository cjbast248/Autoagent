import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Palette, Square, Sparkles, Move, RotateCcw, MessageCircle, Bot } from 'lucide-react';

export interface WidgetSettings {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  chatBgColor: string;
  
  // Shape & Dimensions
  borderRadius: number;
  buttonSize: number;
  windowWidth: number;
  windowHeight: number;
  
  // Animations
  animationType: 'fade' | 'slide' | 'scale' | 'bounce';
  animationDuration: number;
  buttonAnimation: 'pulse' | 'shake' | 'none';
  
  // Position
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  offsetX: number;
  offsetY: number;
  
  // Other
  welcomeMessage: string;
  placeholder: string;
  showPoweredBy: boolean;
  soundEnabled: boolean;
}

interface WidgetCustomizerProps {
  settings: WidgetSettings;
  onChange: (settings: WidgetSettings) => void;
}

export const defaultWidgetSettings: WidgetSettings = {
  primaryColor: '#6366f1',
  secondaryColor: '#f3f4f6',
  textColor: '#1f2937',
  chatBgColor: '#ffffff',
  borderRadius: 16,
  buttonSize: 56,
  windowWidth: 380,
  windowHeight: 520,
  animationType: 'slide',
  animationDuration: 0.3,
  buttonAnimation: 'pulse',
  position: 'bottom-right',
  offsetX: 20,
  offsetY: 20,
  welcomeMessage: 'Bună! Cu ce te pot ajuta astăzi?',
  placeholder: 'Scrie mesajul tău...',
  showPoweredBy: true,
  soundEnabled: false,
};

const WidgetCustomizer: React.FC<WidgetCustomizerProps> = ({ settings, onChange }) => {
  const updateSetting = <K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const resetToDefaults = () => {
    onChange(defaultWidgetSettings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Personalizare Widget
          </span>
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </CardTitle>
        <CardDescription>
          Personalizează aspectul și comportamentul widget-ului
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="colors" className="flex items-center gap-1 text-xs">
              <Palette className="h-3 w-3" />
              Culori
            </TabsTrigger>
            <TabsTrigger value="shape" className="flex items-center gap-1 text-xs">
              <Square className="h-3 w-3" />
              Formă
            </TabsTrigger>
            <TabsTrigger value="animation" className="flex items-center gap-1 text-xs">
              <Sparkles className="h-3 w-3" />
              Animații
            </TabsTrigger>
            <TabsTrigger value="position" className="flex items-center gap-1 text-xs">
              <Move className="h-3 w-3" />
              Poziție
            </TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Culoare Primară</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="primaryColor"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="flex-1"
                    placeholder="#6366f1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Butonul și header-ul</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Culoare Secundară</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="secondaryColor"
                    value={settings.secondaryColor}
                    onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                    className="flex-1"
                    placeholder="#f3f4f6"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Fundal mesaje primite</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="textColor">Culoare Text</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="textColor"
                    value={settings.textColor}
                    onChange={(e) => updateSetting('textColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.textColor}
                    onChange={(e) => updateSetting('textColor', e.target.value)}
                    className="flex-1"
                    placeholder="#1f2937"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Text în chat</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatBgColor">Fundal Chat</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="chatBgColor"
                    value={settings.chatBgColor}
                    onChange={(e) => updateSetting('chatBgColor', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.chatBgColor}
                    onChange={(e) => updateSetting('chatBgColor', e.target.value)}
                    className="flex-1"
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Fundal fereastră chat</p>
              </div>
            </div>
          </TabsContent>

          {/* Shape Tab */}
          <TabsContent value="shape" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Rotunjire Colțuri</Label>
                  <span className="text-sm text-muted-foreground">{settings.borderRadius}px</span>
                </div>
                <Slider
                  value={[settings.borderRadius]}
                  onValueChange={([value]) => updateSetting('borderRadius', value)}
                  min={0}
                  max={30}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pătrat</span>
                  <span>Rotund</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Dimensiune Buton</Label>
                  <span className="text-sm text-muted-foreground">{settings.buttonSize}px</span>
                </div>
                <Slider
                  value={[settings.buttonSize]}
                  onValueChange={([value]) => updateSetting('buttonSize', value)}
                  min={40}
                  max={80}
                  step={4}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mic</span>
                  <span>Mare</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Lățime Fereastră</Label>
                  <span className="text-sm text-muted-foreground">{settings.windowWidth}px</span>
                </div>
                <Slider
                  value={[settings.windowWidth]}
                  onValueChange={([value]) => updateSetting('windowWidth', value)}
                  min={300}
                  max={500}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Înălțime Fereastră</Label>
                  <span className="text-sm text-muted-foreground">{settings.windowHeight}px</span>
                </div>
                <Slider
                  value={[settings.windowHeight]}
                  onValueChange={([value]) => updateSetting('windowHeight', value)}
                  min={400}
                  max={700}
                  step={10}
                />
              </div>
            </div>
          </TabsContent>

          {/* Animation Tab */}
          <TabsContent value="animation" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Animație Deschidere</Label>
                <Select
                  value={settings.animationType}
                  onValueChange={(value) => updateSetting('animationType', value as WidgetSettings['animationType'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">Fade (Apariție lină)</SelectItem>
                    <SelectItem value="slide">Slide (Alunecare)</SelectItem>
                    <SelectItem value="scale">Scale (Mărire)</SelectItem>
                    <SelectItem value="bounce">Bounce (Săritură)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Durată Animație</Label>
                  <span className="text-sm text-muted-foreground">{settings.animationDuration}s</span>
                </div>
                <Slider
                  value={[settings.animationDuration * 10]}
                  onValueChange={([value]) => updateSetting('animationDuration', value / 10)}
                  min={1}
                  max={8}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Rapid</span>
                  <span>Lent</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Animație Buton</Label>
                <Select
                  value={settings.buttonAnimation}
                  onValueChange={(value) => updateSetting('buttonAnimation', value as WidgetSettings['buttonAnimation'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pulse">Pulse (Pulsare)</SelectItem>
                    <SelectItem value="shake">Shake (Tremur)</SelectItem>
                    <SelectItem value="none">Fără animație</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Position Tab */}
          <TabsContent value="position" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Poziție pe Ecran</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map((pos) => (
                    <Button
                      key={pos}
                      variant={settings.position === pos ? 'default' : 'outline'}
                      className="h-16"
                      onClick={() => updateSetting('position', pos)}
                    >
                      <div className="text-center">
                        <div className="text-xs capitalize">{pos.replace('-', ' ')}</div>
                        <div className="mt-1">
                          {pos === 'bottom-right' && '↘'}
                          {pos === 'bottom-left' && '↙'}
                          {pos === 'top-right' && '↗'}
                          {pos === 'top-left' && '↖'}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Distanță de la Margine (X)</Label>
                  <span className="text-sm text-muted-foreground">{settings.offsetX}px</span>
                </div>
                <Slider
                  value={[settings.offsetX]}
                  onValueChange={([value]) => updateSetting('offsetX', value)}
                  min={0}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Distanță de la Margine (Y)</Label>
                  <span className="text-sm text-muted-foreground">{settings.offsetY}px</span>
                </div>
                <Slider
                  value={[settings.offsetY]}
                  onValueChange={([value]) => updateSetting('offsetY', value)}
                  min={0}
                  max={50}
                  step={5}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Additional Options */}
        <div className="mt-6 pt-6 border-t space-y-4">
          <h4 className="font-medium text-sm">Opțiuni Suplimentare</h4>
          
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Mesaj de Întâmpinare</Label>
            <Input
              id="welcomeMessage"
              value={settings.welcomeMessage}
              onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
              placeholder="Bună! Cu ce te pot ajuta?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="placeholder">Placeholder Input</Label>
            <Input
              id="placeholder"
              value={settings.placeholder}
              onChange={(e) => updateSetting('placeholder', e.target.value)}
              placeholder="Scrie mesajul tău..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Arată "Powered by Agentauto"</Label>
              <p className="text-xs text-muted-foreground">Afișează branding-ul în footer</p>
            </div>
            <Switch
              checked={settings.showPoweredBy}
              onCheckedChange={(checked) => updateSetting('showPoweredBy', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sunet la Mesaj Nou</Label>
              <p className="text-xs text-muted-foreground">Redă un sunet când primești răspuns</p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WidgetCustomizer;
