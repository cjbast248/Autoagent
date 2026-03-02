import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SheetStructure {
  sheets: string[];
  currentSheet: string;
  headers: string[];
  columns: string[];
  previewData: any[][];
  totalColumns: number;
}

interface ColumnMapping {
  name_column: string;
  phone_column: string;
  email_column?: string;
  location_column?: string;
  language_column?: string;
  status_column?: string;
  duration_column?: string;
  cost_column?: string;
  summary_column?: string;
  audio_column?: string;
}

interface GoogleSheetsColumnMapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spreadsheetId: string;
  sheetName?: string; // Now optional - will auto-detect first sheet
  onMappingComplete: (mapping: ColumnMapping, autoUpdate: boolean) => void;
}

export const GoogleSheetsColumnMapper = ({
  open,
  onOpenChange,
  spreadsheetId,
  sheetName,
  onMappingComplete,
}: GoogleSheetsColumnMapperProps) => {
  const [structure, setStructure] = useState<SheetStructure | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [mapping, setMapping] = useState<ColumnMapping>({
    name_column: '',
    phone_column: '',
  });
  const [autoUpdate, setAutoUpdate] = useState(true);

  useEffect(() => {
    if (open && spreadsheetId) {
      fetchStructure();
    }
  }, [open, spreadsheetId]);

  const fetchStructure = async (retrySheetName?: string) => {
    setIsLoading(true);
    setError(null);
    setAvailableSheets([]);
    
    try {
      // Build query params for the edge function
      const queryParams = new URLSearchParams({
        spreadsheet_id: spreadsheetId,
      });
      if (retrySheetName || sheetName) {
        queryParams.set('sheet_name', retrySheetName || sheetName || '');
      }

      // Use supabase.functions.invoke with GET method - auth headers are included automatically
      const { data, error: fnError } = await supabase.functions.invoke(
        `get-sheet-structure-oauth?${queryParams.toString()}`,
        { method: 'GET' }
      );

      if (fnError) throw fnError;

      const result = data as any;
      
      if (result?.error) {
        if (result.code === 'NO_CONNECTION' || result.code === 'NO_OAUTH_TOKEN') {
          toast({
            title: 'Conectare necesară',
            description: result.userMessage || 'Conectează-te cu Google pentru a accesa fișierele.',
            variant: 'destructive',
          });
          setError('Nu ești conectat la Google Sheets. Întoarce-te și conectează-te mai întâi.');
          return;
        } else if (result.code === 'TOKEN_EXPIRED' || result.code === 'OAUTH_TOKEN_EXPIRED') {
          toast({
            title: 'Conexiune expirată',
            description: result.userMessage || 'Reconectează-te cu Google.',
            variant: 'destructive',
          });
          setError('Conexiunea cu Google a expirat. Întoarce-te și reconectează-te.');
          return;
        } else if (result.code === 'ACCESS_DENIED' || result.code === 'OAUTH_ACCESS_DENIED') {
          toast({
            title: 'Acces refuzat',
            description: result.userMessage || 'Reconectează-te și acordă acces la Google Drive.',
            variant: 'destructive',
          });
          setError('Nu ai permisiuni pentru această resursă. Întoarce-te și reconectează-te cu Google.');
          return;
        } else if (result.code === 'SPREADSHEET_NOT_FOUND') {
          toast({
            title: 'Fișier negăsit',
            description: 'Verifică Spreadsheet ID-ul introdus.',
            variant: 'destructive',
          });
          setError('Spreadsheet ID invalid');
          return;
        } else if (result.code === 'INVALID_SHEET_NAME' && result.availableSheets) {
          setAvailableSheets(result.availableSheets);
          if (result.availableSheets.length > 0 && !retrySheetName) {
            setSelectedSheet(result.availableSheets[0]);
            await fetchStructure(result.availableSheets[0]);
            return;
          }
          toast({
            title: 'Alege foaia',
            description: 'Selectează foaia din listă.',
          });
          return;
        }
        
        throw new Error(result.error);
      }

      setStructure(result as any);
      autoDetectColumns(result as any);
      
      toast({
        title: 'Structură încărcată',
        description: `Foaia "${result.currentSheet}" a fost încărcată cu succes.`,
      });
    } catch (error: any) {
      console.error('Error fetching sheet structure:', error);
      const errorMsg = error?.message || 'Nu s-a putut încărca structura fișierului.';
      setError(errorMsg);
      toast({
        title: 'Eroare la încărcare',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const autoDetectColumns = (data: any) => {
    const headers = data.headers.map((h: string) => h.toLowerCase());
    const detectedMapping: Partial<ColumnMapping> = {};

    const nameIndex = headers.findIndex((h: string) => 
      h.includes('nume') || h.includes('name') || h.includes('client')
    );
    if (nameIndex >= 0) detectedMapping.name_column = data.columns[nameIndex];

    const phoneIndex = headers.findIndex((h: string) => 
      h.includes('telefon') || h.includes('phone') || h.includes('tel')
    );
    if (phoneIndex >= 0) detectedMapping.phone_column = data.columns[phoneIndex];

    const emailIndex = headers.findIndex((h: string) => h.includes('email') || h.includes('mail'));
    if (emailIndex >= 0) detectedMapping.email_column = data.columns[emailIndex];

    const locationIndex = headers.findIndex((h: string) => 
      h.includes('location') || h.includes('locatie') || h.includes('oras') || h.includes('city')
    );
    if (locationIndex >= 0) detectedMapping.location_column = data.columns[locationIndex];

    setMapping(prev => ({ ...prev, ...detectedMapping }));
  };

  const handleSave = () => {
    if (!mapping.name_column || !mapping.phone_column) {
      toast({
        title: 'Configurare incompletă',
        description: 'Selectează cel puțin coloanele pentru Nume și Telefon.',
        variant: 'destructive',
      });
      return;
    }

    onMappingComplete(mapping, autoUpdate);
    onOpenChange(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Se încarcă structura foii</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Se verifică accesul și se încarcă datele din Google Sheets...
            </p>
          </DialogHeader>
          <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Eroare la încărcarea foii</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nu s-a putut accesa foaia Google Sheets</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>{error}</p>
              <div className="mt-4 text-sm">
                <p className="font-semibold mb-2">Verificați următoarele:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ești autentificat cu Google (apasă "Reconectează Google" dacă e necesar)</li>
                  <li>ID-ul foii este corect (din URL-ul foii Google Sheets)</li>
                  <li>Ai acces la documentul respectiv în Google Drive</li>
                  <li>Documentul este o foaie Google Sheets validă</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Închide
            </Button>
            <Button onClick={() => fetchStructure()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Încearcă din nou
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!structure) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurează coloanele din Google Sheets</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Spreadsheet: {spreadsheetId}
              {structure?.currentSheet && ` • Foaia: ${structure.currentSheet}`}
            </p>
          </DialogHeader>

          <div className="space-y-6">
          {availableSheets.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Selectează foaia</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>Acest spreadsheet conține mai multe foi. Selectează foaia corectă:</p>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alege foaia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheets.map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => fetchStructure(selectedSheet)} 
                  disabled={!selectedSheet}
                  className="w-full"
                >
                  Încarcă foaia selectată
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Mapează coloanele din Google Sheet către câmpurile necesare. Coloanele pentru Status, Durată, Cost, etc. vor fi actualizate automat după fiecare apel.
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-muted">
              <h3 className="font-medium">Preview Date ({structure.previewData?.length || 0} rânduri)</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {structure.headers.map((header: string, index: number) => (
                      <TableHead key={index}>
                        <div className="font-mono text-xs text-muted-foreground">
                          {structure.columns[index]}
                        </div>
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structure.previewData?.map((row: any[], rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell: any, cellIndex: number) => (
                        <TableCell key={cellIndex} className="max-w-[200px] truncate">
                          {cell || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Column mapping */}
          <div className="grid grid-cols-2 gap-6">
            {/* Input columns */}
            <div className="space-y-4">
              <h3 className="font-medium">Coloane de Intrare (necesare)</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name_column">
                  Nume Contact <span className="text-destructive">*</span>
                </Label>
                <Select value={mapping.name_column} onValueChange={(value) => setMapping({ ...mapping, name_column: value })}>
                  <SelectTrigger id="name_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_column">
                  Telefon <span className="text-destructive">*</span>
                </Label>
                <Select value={mapping.phone_column} onValueChange={(value) => setMapping({ ...mapping, phone_column: value })}>
                  <SelectTrigger id="phone_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_column">Email (opțional)</Label>
                <Select value={mapping.email_column || 'none'} onValueChange={(value) => setMapping({ ...mapping, email_column: value === 'none' ? '' : value })}>
                  <SelectTrigger id="email_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicio coloană</SelectItem>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_column">Locație (opțional)</Label>
                <Select value={mapping.location_column || 'none'} onValueChange={(value) => setMapping({ ...mapping, location_column: value === 'none' ? '' : value })}>
                  <SelectTrigger id="location_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicio coloană</SelectItem>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Output columns */}
            <div className="space-y-4">
              <h3 className="font-medium">Coloane de Rezultat (actualizare automată)</h3>
              
              <div className="space-y-2">
                <Label htmlFor="status_column">Status Apel</Label>
                <Select value={mapping.status_column || 'none'} onValueChange={(value) => setMapping({ ...mapping, status_column: value === 'none' ? '' : value })}>
                  <SelectTrigger id="status_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicio coloană</SelectItem>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_column">Durată (secunde)</Label>
                <Select value={mapping.duration_column || 'none'} onValueChange={(value) => setMapping({ ...mapping, duration_column: value === 'none' ? '' : value })}>
                  <SelectTrigger id="duration_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicio coloană</SelectItem>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_column">Cost (USD)</Label>
                <Select value={mapping.cost_column || 'none'} onValueChange={(value) => setMapping({ ...mapping, cost_column: value === 'none' ? '' : value })}>
                  <SelectTrigger id="cost_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicio coloană</SelectItem>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary_column">Rezumat</Label>
                <Select value={mapping.summary_column || 'none'} onValueChange={(value) => setMapping({ ...mapping, summary_column: value === 'none' ? '' : value })}>
                  <SelectTrigger id="summary_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicio coloană</SelectItem>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio_column">Link Audio</Label>
                <Select value={mapping.audio_column || 'none'} onValueChange={(value) => setMapping({ ...mapping, audio_column: value === 'none' ? '' : value })}>
                  <SelectTrigger id="audio_column">
                    <SelectValue placeholder="Selectează coloana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicio coloană</SelectItem>
                    {structure.columns.map((col, index) => (
                      col ? (
                        <SelectItem key={col} value={col}>
                          Coloana {col} - {structure.headers[index]}
                        </SelectItem>
                      ) : null
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Auto-update toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="auto-update">Actualizare automată</Label>
              <p className="text-sm text-muted-foreground">
                Actualizează Google Sheets automat după fiecare apel finalizat
              </p>
            </div>
            <Switch
              id="auto-update"
              checked={autoUpdate}
              onCheckedChange={setAutoUpdate}
            />
          </div>
        </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anulează
            </Button>
            <Button onClick={handleSave}>
              Salvează Configurare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
