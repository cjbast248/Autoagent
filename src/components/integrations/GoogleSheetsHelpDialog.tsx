import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ExternalLink, Key, FileSpreadsheet, Settings, Phone } from 'lucide-react';

interface GoogleSheetsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GoogleSheetsHelpDialog = ({ open, onOpenChange }: GoogleSheetsHelpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Ghid Complet: Integrare Google Sheets</DialogTitle>
          <DialogDescription>
            Instrucțiuni pas cu pas pentru configurarea și utilizarea integrării Google Sheets
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="api-key" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api-key">API Key</TabsTrigger>
            <TabsTrigger value="spreadsheet">Spreadsheet ID</TabsTrigger>
            <TabsTrigger value="setup">Configurare</TabsTrigger>
            <TabsTrigger value="usage">Utilizare</TabsTrigger>
          </TabsList>

          {/* API Key Instructions */}
          <TabsContent value="api-key" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Cum obții Google API Key</h3>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-2">Pasul 1: Accesează Google Cloud Console</p>
                  <a 
                    href="https://console.cloud.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Deschide Google Cloud Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 2: Creează un proiect nou (dacă nu ai)</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click pe dropdown-ul de proiecte din partea de sus</li>
                    <li>Click "NEW PROJECT"</li>
                    <li>Denumește proiectul (ex: "Kalina Integration")</li>
                    <li>Click "CREATE"</li>
                  </ol>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 3: Activează Google Sheets API</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>În meniul din stânga, mergi la "APIs & Services" → "Library"</li>
                    <li>Caută "Google Sheets API"</li>
                    <li>Click pe "Google Sheets API"</li>
                    <li>Click "ENABLE"</li>
                  </ol>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 4: Activează Google Drive API</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Caută "Google Drive API" în Library</li>
                    <li>Click pe "Google Drive API"</li>
                    <li>Click "ENABLE"</li>
                  </ol>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 5: Creează API Key</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Mergi la "APIs & Services" → "Credentials"</li>
                    <li>Click "CREATE CREDENTIALS" → "API key"</li>
                    <li>API Key-ul va fi generat automat</li>
                    <li>Copiază API Key-ul (începe cu "AIza...")</li>
                    <li>(Opțional) Click "RESTRICT KEY" pentru securitate suplimentară</li>
                  </ol>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">⚠️ Important pentru securitate:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-300 ml-2">
                    <li>Restricționează API Key-ul la "Google Sheets API" și "Google Drive API"</li>
                    <li>Nu distribui API Key-ul public</li>
                    <li>Păstrează-l în siguranță</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Spreadsheet ID Instructions */}
          <TabsContent value="spreadsheet" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Cum obții Spreadsheet ID</h3>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-2">Pasul 1: Creează sau deschide un Google Sheet</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Accesează <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Sheets</a></li>
                    <li>Creează un sheet nou sau deschide unul existent</li>
                  </ol>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 2: Copiază Spreadsheet ID din URL</p>
                  <div className="space-y-2">
                    <p>URL-ul unui Google Sheet arată așa:</p>
                    <code className="block p-3 bg-muted rounded text-xs overflow-x-auto">
                      https://docs.google.com/spreadsheets/d/<span className="text-primary font-bold">1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</span>/edit
                    </code>
                    <p>Partea evidențiată cu <span className="text-primary font-bold">bold</span> este Spreadsheet ID-ul</p>
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 3: Setează permisiunile sheet-ului</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Click pe butonul "Share" din dreapta sus</li>
                    <li>În "General access", selectează "Anyone with the link"</li>
                    <li>Setează permisiunea la "Editor" (pentru actualizare automată)</li>
                    <li>Click "Done"</li>
                  </ol>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">💡 Sfat:</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Recomandăm să creezi un sheet dedicat pentru Kalina, cu coloane pre-configurate pentru datele pe care vrei să le exporți.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Setup Instructions */}
          <TabsContent value="setup" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Configurare Integrare</h3>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-2">Pasul 1: Adaugă API Key</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>În formularul de mai sus, lipește Google API Key obținut</li>
                    <li>API Key-ul începe cu "AIza..."</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 2: Selectează Google Sheet</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Click pe butonul "Browser Fișiere Google Sheets"</li>
                    <li>Se va deschide o listă cu toate spreadsheet-urile tale</li>
                    <li>Selectează sheet-ul dorit</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 3: Configurează coloanele</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Se va deschide automat configuratorul de coloane</li>
                    <li>Mapează coloanele din sheet către câmpurile Kalina:</li>
                    <ul className="list-circle list-inside ml-4 space-y-1">
                      <li><strong>Coloane de intrare:</strong> Nume, Telefon, Email, Locație</li>
                      <li><strong>Coloane de rezultat:</strong> Status, Durată, Cost, Rezumat, Link Audio</li>
                    </ul>
                    <li>Activează "Actualizare automată" pentru sincronizare în timp real</li>
                    <li>Click "Salvează Configurare"</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-2">Pasul 4: Importă contactele</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>După configurare, mergi la tab-ul "Contacte"</li>
                    <li>Click "Import Contacte"</li>
                    <li>Contactele vor fi importate din Google Sheets în Kalina</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Usage Instructions */}
          <TabsContent value="usage" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Utilizare: Apelare din Google Sheets</h3>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-2">1. Vizualizare contacte</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Mergi la tab-ul "Contacte"</li>
                    <li>Vei vedea toate contactele importate din Google Sheets</li>
                    <li>Fiecare contact are status: Pending, Calling, Completed sau Failed</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-2">2. Configurare campanie</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Mergi la tab-ul "Campanii"</li>
                    <li>Selectează Agentul care va efectua apelurile</li>
                    <li>Selectează Numărul de telefon de utilizat</li>
                    <li>Setează intervalul între apeluri (10-120 secunde)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-2">3. Selectare contacte</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Bifează contactele pe care dorești să le apelezi</li>
                    <li>Sau folosește "Selectează tot" pentru toate contactele</li>
                    <li>Poți filtra contactele după status</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-2">4. Start campanie</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Click "START CAMPANIE"</li>
                    <li>Sistemul va începe apelarea contactelor automat</li>
                    <li>Vei vedea progresul în timp real</li>
                    <li>Poți întrerupe oricând cu "PAUZĂ" sau "STOP"</li>
                  </ul>
                </div>

                <div>
                  <p className="font-medium mb-2">5. Actualizare automată Google Sheets</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>După fiecare apel finalizat, Google Sheets se actualizează automat</li>
                    <li>Coloanele configurate vor fi completate cu:</li>
                    <ul className="list-circle list-inside ml-4 space-y-1">
                      <li>Status apel (Completed/Failed)</li>
                      <li>Durată în secunde</li>
                      <li>Cost în USD</li>
                      <li>Rezumat conversație</li>
                      <li>Link către înregistrare audio</li>
                    </ul>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="font-medium text-green-800 dark:text-green-200 mb-1">✅ Avantaje:</p>
                  <ul className="list-disc list-inside space-y-1 text-green-700 dark:text-green-300 ml-2">
                    <li>Sincronizare în timp real - vezi rezultatele instant în Google Sheets</li>
                    <li>Fără export manual - totul se întâmplă automat</li>
                    <li>Date mereu actualizate - perfect pentru rapoarte și analiză</li>
                    <li>Acces de oriunde - datele sunt în Google Sheets, accesibile de pe orice dispozitiv</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
