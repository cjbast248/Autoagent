
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
  startTime: number;
  endTime: number;
}

interface SaveTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcriptEntries: TranscriptEntry[];
  originalFilename?: string;
  rawText?: string;
  durationSeconds?: number;
  fileSizeMb?: number;
  onSave: (data: {
    title: string;
    transcriptEntries: TranscriptEntry[];
    originalFilename?: string;
    rawText?: string;
    durationSeconds?: number;
    fileSizeMb?: number;
  }) => void;
  isSaving: boolean;
}

const SaveTranscriptDialog: React.FC<SaveTranscriptDialogProps> = ({
  open,
  onOpenChange,
  transcriptEntries,
  originalFilename,
  rawText,
  durationSeconds,
  fileSizeMb,
  onSave,
  isSaving
}) => {
  const [title, setTitle] = useState(() => {
    if (originalFilename) {
      return originalFilename.split('.')[0];
    }
    return `Transcript ${new Date().toLocaleDateString('ro-RO')}`;
  });

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      transcriptEntries,
      originalFilename,
      rawText,
      durationSeconds,
      fileSizeMb
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-[#0A5B4C]" />
            Salvează Transcriptul
          </DialogTitle>
          <DialogDescription>
            Introdu un nume pentru transcriptul tău. Va fi salvat în contul tău și va fi accesibil oricând.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Numele transcriptului</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Introdu numele transcriptului..."
              className="w-full"
            />
          </div>

          {originalFilename && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Fișier original:</span> {originalFilename}
            </div>
          )}

          <div className="text-sm text-gray-600">
            <span className="font-medium">Replici:</span> {transcriptEntries.length}
            {durationSeconds && durationSeconds > 0 && (
              <>
                {' • '}
                <span className="font-medium">Durată:</span> {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, '0')}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Anulează
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="bg-[#0A5B4C] hover:bg-[#0A5B4C]/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvează
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveTranscriptDialog;
