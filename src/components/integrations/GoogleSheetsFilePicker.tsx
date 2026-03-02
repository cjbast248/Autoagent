import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, FileSpreadsheet, Search, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthContext';

interface GoogleSheetFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
}

interface GoogleSheetsFilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelected: (file: GoogleSheetFile) => void;
}

export const GoogleSheetsFilePicker = ({
  open,
  onOpenChange,
  onFileSelected,
}: GoogleSheetsFilePickerProps) => {
  const [files, setFiles] = useState<GoogleSheetFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<GoogleSheetFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [needsConnection, setNeedsConnection] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const initiateGoogleConnect = async () => {
    try {
      // Get current session to ensure auth header is sent
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error('Nu ești autentificat. Te rog să te loghezi din nou.');
      }

      const { data, error } = await supabase.functions.invoke('google-sheets-oauth-init', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;

      // Check for error in response body
      if (data?.error || data?.code === 'UNAUTHORIZED') {
        throw new Error(data?.userMessage || data?.message || 'Eroare de autentificare');
      }

      if (data?.success && data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error(data?.error || 'Failed to initialize OAuth');
      }
    } catch (error: any) {
      console.error('Error initiating Google connect:', error);
      toast({
        title: 'Eroare',
        description: error.message || 'Nu s-a putut iniția conectarea cu Google',
        variant: 'destructive',
      });
    }
  };

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setNeedsConnection(false);

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setNeedsConnection(true);
        setIsLoading(false);
        return;
      }

      // Use supabase.functions.invoke which automatically includes auth headers
      const { data, error: fnError } = await supabase.functions.invoke('list-google-sheets-oauth', {
        method: 'GET',
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch files');
      }

      const result = data as any;

      // Handle specific error codes
      if (result?.error) {
        if (result.code === 'NO_CONNECTION' || result.code === 'NO_OAUTH_TOKEN') {
          setNeedsConnection(true);
          setFiles([]);
          setFilteredFiles([]);
          return;
        } else if (result.code === 'OAUTH_TOKEN_EXPIRED') {
          toast({
            title: 'Token expirat',
            description: 'Se reîmprospătează conexiunea...',
          });
          // Try to refresh token
          const refreshResult = await supabase.functions.invoke('google-sheets-refresh-token');
          if (refreshResult.data?.success) {
            // Retry fetching files - use setTimeout to avoid recursion issues
            setTimeout(() => fetchFiles(), 100);
            return;
          } else {
            setNeedsConnection(true);
            return;
          }
        } else if (result.code === 'OAUTH_ACCESS_DENIED') {
          toast({
            title: 'Acces Google refuzat',
            description: 'Reconectează-te pentru a acorda permisiunile necesare.',
            variant: 'destructive',
          });
          setNeedsConnection(true);
          return;
        }

        throw new Error(result.error);
      }

      setFiles(result.files || []);
      setFilteredFiles(result.files || []);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      const msg = error?.message || 'Nu s-au putut încărca fișierele Google Sheets.';
      toast({
        title: 'Eroare la încărcare',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open, fetchFiles]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredFiles(
        files.filter(file =>
          file.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredFiles(files);
    }
  }, [searchQuery, files]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selectează Google Sheet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută fișiere..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchFiles}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Files grid */}
          <div className="overflow-y-auto max-h-[50vh] space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : needsConnection ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                <p className="text-muted-foreground mb-2">Nu ești conectat la Google Sheets</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Conectează-te pentru a vedea și selecta fișierele tale
                </p>
                <Button onClick={initiateGoogleConnect}>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Conectează cu Google
                </Button>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Niciun fișier Google Sheets găsit</p>
                {searchQuery && (
                  <p className="text-sm mt-2">Încearcă un alt termen de căutare</p>
                )}
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={initiateGoogleConnect}>
                    Reconectează Google
                  </Button>
                  <Button variant="ghost" size="sm" onClick={fetchFiles}>
                    Reîmprospătează
                  </Button>
                </div>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className="p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    onFileSelected(file);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{file.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Modificat: {formatDate(file.modifiedTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.webViewLink && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.webViewLink, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm">Selectează</Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
