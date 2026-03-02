import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  FileCode, 
  Globe, 
  ShoppingBag, 
  LayoutTemplate, 
  Code2, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  Zap,
  Shield,
  Palette,
  Settings,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const ChatWidgetDocs = () => {
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Codul a fost copiat!');
  };

  const basicEmbedCode = `<!-- Agentauto Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://app.agentauto.app/widget/chat.js';
    script.setAttribute('data-widget-id', 'YOUR_WIDGET_ID');
    script.setAttribute('data-position', 'bottom-right');
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

  const advancedEmbedCode = `<!-- Agentauto Chat Widget - Configurare Avansată -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://app.agentauto.app/widget/chat.js';
    
    // Configurare de bază
    script.setAttribute('data-widget-id', 'YOUR_WIDGET_ID');
    script.setAttribute('data-position', 'bottom-right');
    
    // Personalizare culori
    script.setAttribute('data-primary-color', '#6366f1');
    script.setAttribute('data-secondary-color', '#f3f4f6');
    script.setAttribute('data-text-color', '#1f2937');
    
    // Dimensiuni și formă
    script.setAttribute('data-border-radius', '16');
    script.setAttribute('data-button-size', '56');
    script.setAttribute('data-window-width', '380');
    script.setAttribute('data-window-height', '520');
    
    // Animații
    script.setAttribute('data-animation', 'slide');
    script.setAttribute('data-animation-duration', '0.3');
    
    // Texte personalizate
    script.setAttribute('data-welcome-message', 'Bună! Cu ce te pot ajuta?');
    script.setAttribute('data-placeholder', 'Scrie mesajul tău...');
    
    // Poziție exactă (opțional)
    script.setAttribute('data-offset-x', '20');
    script.setAttribute('data-offset-y', '20');
    
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

  const reactCode = `// React / Next.js Integration
import { useEffect } from 'react';

export function ChatWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.agentauto.app/widget/chat.js';
    script.setAttribute('data-widget-id', 'YOUR_WIDGET_ID');
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-primary-color', '#6366f1');
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      const existingScript = document.querySelector(
        'script[src="https://app.agentauto.app/widget/chat.js"]'
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null;
}

// Folosește în App.tsx sau layout:
// <ChatWidget />`;

  const vueCode = `<!-- Vue.js Integration -->
<template>
  <div>
    <!-- Widget-ul se încarcă automat -->
  </div>
</template>

<script>
export default {
  name: 'ChatWidget',
  mounted() {
    const script = document.createElement('script');
    script.src = 'https://app.agentauto.app/widget/chat.js';
    script.setAttribute('data-widget-id', 'YOUR_WIDGET_ID');
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-primary-color', '#6366f1');
    script.async = true;
    document.head.appendChild(script);
  },
  beforeUnmount() {
    const script = document.querySelector(
      'script[src="https://app.agentauto.app/widget/chat.js"]'
    );
    if (script) script.remove();
  }
}
</script>`;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link to="/account/chat-widget">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi la Chat Widget
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Documentație Completă - Chat Widget
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Ghid detaliat pentru integrarea widget-ului de chat AI pe orice platformă
          </p>
        </div>

        {/* Quick Start */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Start Rapid - 3 Pași Simpli
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-semibold">Copiază Codul</p>
                  <p className="text-sm text-muted-foreground">Copiază codul de integrare de mai jos</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-semibold">Lipește pe Site</p>
                  <p className="text-sm text-muted-foreground">Adaugă-l înainte de &lt;/body&gt;</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-semibold">Gata!</p>
                  <p className="text-sm text-muted-foreground">Widget-ul apare automat</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Code */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Cod de Integrare - Versiune Simplă
            </CardTitle>
            <CardDescription>
              Codul minim necesar pentru a funcționa widget-ul
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="p-4 bg-secondary text-secondary-foreground rounded-lg text-sm overflow-x-auto whitespace-pre font-mono">
                {basicEmbedCode}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => copyCode(basicEmbedCode)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiază
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Platform Guides */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Ghiduri pe Platformă
            </CardTitle>
            <CardDescription>
              Instrucțiuni detaliate pentru fiecare platformă
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="html" className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
                <TabsTrigger value="html" className="flex items-center gap-1">
                  <FileCode className="h-4 w-4" />
                  HTML
                </TabsTrigger>
                <TabsTrigger value="wordpress" className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  WordPress
                </TabsTrigger>
                <TabsTrigger value="shopify" className="flex items-center gap-1">
                  <ShoppingBag className="h-4 w-4" />
                  Shopify
                </TabsTrigger>
                <TabsTrigger value="wix" className="flex items-center gap-1">
                  <LayoutTemplate className="h-4 w-4" />
                  Wix
                </TabsTrigger>
                <TabsTrigger value="dev" className="flex items-center gap-1">
                  <Code2 className="h-4 w-4" />
                  React/Vue
                </TabsTrigger>
              </TabsList>

              {/* HTML Guide */}
              <TabsContent value="html" className="space-y-6">
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <h3 className="font-semibold flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <FileCode className="h-5 w-5" />
                    Site HTML Simplu / Clasic
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Pentru site-uri statice sau orice site unde ai acces direct la codul HTML
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">📝 Pași Detaliați:</h4>
                  
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</div>
                        <div className="flex-1">
                          <h5 className="font-semibold">Deschide fișierul HTML principal</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Folosește un editor de text (recomandat: VS Code, Sublime Text, sau Notepad++). 
                            Deschide fișierul <code className="bg-muted px-2 py-0.5 rounded">index.html</code> sau 
                            fișierul HTML al paginii unde vrei să apară widget-ul.
                          </p>
                          <div className="mt-3 p-3 bg-muted rounded text-sm font-mono">
                            C:\Site-ul-meu\index.html
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</div>
                        <div className="flex-1">
                          <h5 className="font-semibold">Găsește tag-ul &lt;/body&gt;</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Apasă <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-xs">F</kbd> 
                            (sau <kbd className="px-2 py-1 bg-muted rounded text-xs">Cmd</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-xs">F</kbd> pe Mac) 
                            și caută <code className="bg-muted px-2 py-0.5 rounded">&lt;/body&gt;</code>. 
                            Ar trebui să fie aproape de sfârșitul fișierului.
                          </p>
                          <div className="mt-3 p-3 bg-muted rounded text-sm font-mono">
                            <span className="text-muted-foreground">... alt cod ...</span><br/>
                            <span className="text-green-600 dark:text-green-400">&lt;!-- AICI VEI LIPI CODUL --&gt;</span><br/>
                            <span className="text-primary font-bold">&lt;/body&gt;</span><br/>
                            <span className="text-muted-foreground">&lt;/html&gt;</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</div>
                        <div className="flex-1">
                          <h5 className="font-semibold">Lipește codul widget-ului</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Poziționează cursorul pe linia de deasupra lui <code className="bg-muted px-2 py-0.5 rounded">&lt;/body&gt;</code>, 
                            creează o linie nouă (Enter) și lipește codul copiat cu 
                            <kbd className="px-2 py-1 bg-muted rounded text-xs ml-1">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-xs">V</kbd>.
                          </p>
                          <div className="mt-3 p-3 bg-muted rounded text-sm font-mono overflow-x-auto">
                            <span className="text-muted-foreground">... conținutul paginii ...</span><br/><br/>
                            <span className="text-green-600 dark:text-green-400">&lt;!-- Agentauto Chat Widget --&gt;</span><br/>
                            <span className="text-blue-600 dark:text-blue-400">&lt;script&gt;</span><br/>
                            <span className="text-muted-foreground ml-4">// codul widget-ului aici</span><br/>
                            <span className="text-blue-600 dark:text-blue-400">&lt;/script&gt;</span><br/><br/>
                            <span className="text-primary font-bold">&lt;/body&gt;</span><br/>
                            <span className="text-muted-foreground">&lt;/html&gt;</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</div>
                        <div className="flex-1">
                          <h5 className="font-semibold">Salvează și testează</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            Apasă <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-xs">S</kbd> 
                            pentru a salva fișierul. Apoi deschide pagina în browser și reîncarcă-o 
                            (<kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-xs">R</kbd> 
                            pentru a ignora cache-ul).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      <strong>Succes!</strong> Ar trebui să vezi butonul de chat în colțul paginii.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* WordPress Guide */}
              <TabsContent value="wordpress" className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Globe className="h-5 w-5" />
                    WordPress
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    3 metode disponibile - alege-o pe cea mai potrivită pentru tine
                  </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="method1">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">RECOMANDAT</span>
                        Metoda 1: Cu Plugin (Cel mai simplu)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                          <div>
                            <p className="font-medium">Instalează un plugin pentru cod</p>
                            <p className="text-sm text-muted-foreground">
                              Din panoul WordPress, mergi la <strong>Plugins → Add New</strong> și caută unul din:
                            </p>
                            <ul className="mt-2 text-sm text-muted-foreground list-disc ml-4">
                              <li><strong>WPCode</strong> (recomandat - gratuit)</li>
                              <li><strong>Insert Headers and Footers</strong></li>
                              <li><strong>Header Footer Code Manager</strong></li>
                            </ul>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                          <div>
                            <p className="font-medium">Activează plugin-ul</p>
                            <p className="text-sm text-muted-foreground">
                              Click pe <strong>Activate</strong> după instalare.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                          <div>
                            <p className="font-medium">Adaugă codul</p>
                            <p className="text-sm text-muted-foreground">
                              Pentru WPCode: Mergi la <strong>Code Snippets → + Add Snippet → Add Custom Snippet (HTML)</strong><br/>
                              Lipește codul și selectează <strong>"Site Wide Footer"</strong> la locație.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                          <div>
                            <p className="font-medium">Salvează și activează</p>
                            <p className="text-sm text-muted-foreground">
                              Activează snippet-ul și salvează. Widget-ul va apărea pe tot site-ul!
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="method2">
                    <AccordionTrigger className="text-left">
                      Metoda 2: În fișierul temei (Avansat)
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <strong>Atenție:</strong> Modificările se pierd la actualizarea temei! Folosește o temă copil.
                        </p>
                      </div>
                      <div className="space-y-3 text-sm">
                        <p>1. Mergi la <strong>Appearance → Theme File Editor</strong></p>
                        <p>2. În panoul din dreapta, găsește și click pe <code className="bg-muted px-2 py-0.5 rounded">footer.php</code></p>
                        <p>3. Găsește <code className="bg-muted px-2 py-0.5 rounded">&lt;/body&gt;</code> și lipește codul înainte</p>
                        <p>4. Click pe <strong>Update File</strong></p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="method3">
                    <AccordionTrigger className="text-left">
                      Metoda 3: functions.php (Pentru dezvoltatori)
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <p className="text-sm text-muted-foreground">Adaugă acest cod în functions.php al temei copil:</p>
                      <div className="relative">
                        <pre className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto">
{`function add_agentauto_chat_widget() {
  ?>
  <!-- Agentauto Chat Widget -->
  <script>
    (function() {
      var script = document.createElement('script');
      script.src = 'https://app.agentauto.app/widget/chat.js';
      script.setAttribute('data-widget-id', 'YOUR_WIDGET_ID');
      script.async = true;
      document.head.appendChild(script);
    })();
  </script>
  <?php
}
add_action('wp_footer', 'add_agentauto_chat_widget');`}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              {/* Shopify Guide */}
              <TabsContent value="shopify" className="space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold flex items-center gap-2 text-green-800 dark:text-green-200">
                    <ShoppingBag className="h-5 w-5" />
                    Shopify
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Integrare simplă prin editorul de temă
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</div>
                      <div>
                        <h5 className="font-semibold">Accesează editorul de temă</h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          Din panoul Shopify Admin, mergi la: <br/>
                          <strong>Online Store → Themes → Click pe "..." → Edit code</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</div>
                      <div>
                        <h5 className="font-semibold">Deschide theme.liquid</h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          În panoul din stânga, sub secțiunea <strong>Layout</strong>, 
                          click pe fișierul <code className="bg-muted px-2 py-0.5 rounded">theme.liquid</code>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</div>
                      <div>
                        <h5 className="font-semibold">Găsește &lt;/body&gt; și lipește codul</h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          Folosește <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-muted rounded text-xs">F</kbd> 
                          pentru a găsi <code className="bg-muted px-2 py-0.5 rounded">&lt;/body&gt;</code>. 
                          Lipește codul widget-ului pe linia de deasupra.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</div>
                      <div>
                        <h5 className="font-semibold">Salvează</h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click pe butonul <strong>Save</strong> din colțul dreapta sus. 
                          Widget-ul va fi activ imediat pe magazin!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Wix Guide */}
              <TabsContent value="wix" className="space-y-6">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold flex items-center gap-2 text-purple-800 dark:text-purple-200">
                    <LayoutTemplate className="h-5 w-5" />
                    Wix & Squarespace
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-4">Wix</h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>1.</strong> Din Dashboard, mergi la <strong>Settings</strong></p>
                      <p><strong>2.</strong> Click pe <strong>Custom Code</strong> (sub Advanced)</p>
                      <p><strong>3.</strong> Click pe <strong>+ Add Custom Code</strong></p>
                      <p><strong>4.</strong> Lipește codul widget-ului</p>
                      <p><strong>5.</strong> La "Add Code to Pages" selectează <strong>All Pages</strong></p>
                      <p><strong>6.</strong> La "Place Code in" selectează <strong>Body - end</strong></p>
                      <p><strong>7.</strong> Click <strong>Apply</strong></p>
                      <p><strong>8.</strong> <strong>Publică site-ul</strong> pentru a activa</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-4">Squarespace</h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>1.</strong> Din panoul de control, mergi la <strong>Settings</strong></p>
                      <p><strong>2.</strong> Click pe <strong>Advanced</strong></p>
                      <p><strong>3.</strong> Click pe <strong>Code Injection</strong></p>
                      <p><strong>4.</strong> În câmpul <strong>Footer</strong>, lipește codul</p>
                      <p><strong>5.</strong> Click <strong>Save</strong></p>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded text-xs">
                      <p className="text-muted-foreground">
                        <strong>Notă:</strong> Code Injection necesită un plan Business sau superior.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Developer Guide */}
              <TabsContent value="dev" className="space-y-6">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <h3 className="font-semibold flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                    <Code2 className="h-5 w-5" />
                    Pentru Dezvoltatori
                  </h3>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                    Integrare în aplicații React, Vue, Angular și alte framework-uri
                  </p>
                </div>

                <div className="grid gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="text-blue-500">⚛️</span> React / Next.js
                    </h4>
                    <div className="relative">
                      <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">
                        {reactCode}
                      </pre>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(reactCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="text-green-500">💚</span> Vue.js
                    </h4>
                    <div className="relative">
                      <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">
                        {vueCode}
                      </pre>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => copyCode(vueCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Advanced Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurare Avansată
            </CardTitle>
            <CardDescription>
              Toate opțiunile disponibile pentru personalizare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <pre className="p-4 bg-secondary text-secondary-foreground rounded-lg text-xs overflow-x-auto whitespace-pre font-mono">
                {advancedEmbedCode}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => copyCode(advancedEmbedCode)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiază
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Atribute pentru Culori
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <code>data-primary-color</code>
                    <span className="text-muted-foreground">Culoare buton și header</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <code>data-secondary-color</code>
                    <span className="text-muted-foreground">Fundal mesaje</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <code>data-text-color</code>
                    <span className="text-muted-foreground">Culoare text</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Atribute pentru Dimensiuni
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <code>data-border-radius</code>
                    <span className="text-muted-foreground">Rotunjire colțuri (px)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <code>data-button-size</code>
                    <span className="text-muted-foreground">Dimensiune buton (px)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <code>data-window-width</code>
                    <span className="text-muted-foreground">Lățime fereastră</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <code>data-window-height</code>
                    <span className="text-muted-foreground">Înălțime fereastră</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Probleme Frecvente și Soluții
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="p1">
                <AccordionTrigger className="text-left">
                  Widget-ul nu apare deloc pe site
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p><strong>Soluții:</strong></p>
                    <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                      <li>Verifică dacă codul este plasat corect înainte de <code className="bg-muted px-1 rounded">&lt;/body&gt;</code></li>
                      <li>Golește cache-ul browserului: <kbd className="px-1 bg-muted rounded text-xs">Ctrl+Shift+R</kbd></li>
                      <li>Verifică consola browserului (F12 → Console) pentru erori</li>
                      <li>Dezactivează temporar extensiile de blocare (adblocker)</li>
                      <li>Asigură-te că site-ul folosește HTTPS</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="p2">
                <AccordionTrigger className="text-left">
                  Widget-ul apare dar nu răspunde la mesaje
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p><strong>Soluții:</strong></p>
                    <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                      <li>Verifică conexiunea la internet</li>
                      <li>Verifică dacă Widget ID-ul este valid</li>
                      <li>Reîncarcă pagina și încearcă din nou</li>
                      <li>Dacă eroarea persistă, contactează suportul</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="p3">
                <AccordionTrigger className="text-left">
                  Widget-ul se suprapune cu alte elemente
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p><strong>Soluții:</strong></p>
                    <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                      <li>Schimbă poziția widget-ului (data-position)</li>
                      <li>Ajustează offset-ul X și Y pentru a-l muta</li>
                      <li>Verifică z-index-ul altor elemente de pe pagină</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="p4">
                <AccordionTrigger className="text-left">
                  Culorile nu se aplică corect
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p><strong>Soluții:</strong></p>
                    <ul className="list-disc ml-6 space-y-1 text-muted-foreground">
                      <li>Folosește formatul HEX complet (#6366f1 nu #6366)</li>
                      <li>Verifică că valorile sunt între ghilimele</li>
                      <li>Golește cache-ul browserului după modificări</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">Ai nevoie de ajutor suplimentar?</h3>
                <p className="text-muted-foreground">Echipa noastră este aici pentru tine!</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <a href="mailto:support@agentauto.app">
                    Contactează Suportul
                  </a>
                </Button>
                <Link to="/account/chat-widget">
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Înapoi la Configurare
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ChatWidgetDocs;
