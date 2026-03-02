import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleSheetsTemplates } from '@/hooks/useGoogleSheetsTemplates';
import { FileSpreadsheet, Star, Trash2, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface GoogleSheetsTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (mapping: any) => void;
}

export const GoogleSheetsTemplateSelector = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: GoogleSheetsTemplateSelectorProps) => {
  const { templates, defaultTemplates, loading, deleteTemplate, setDefaultTemplate } = useGoogleSheetsTemplates();

  const handleSelectTemplate = (mapping: any) => {
    onSelectTemplate(mapping);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Selectează Template</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Default Templates */}
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Template-uri Predefinite</h3>
              </div>
              <div className="space-y-2">
                {defaultTemplates.map((template, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:border-foreground/20 transition-colors cursor-pointer"
                    onClick={() => handleSelectTemplate(template.column_mapping)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.keys(template.column_mapping).map((key) => (
                              <Badge key={key} variant="secondary" className="text-xs">
                                {key.replace('_column', '').replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Templates */}
            {templates.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Template-urile Mele</h3>
                  </div>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 border rounded-lg hover:border-foreground/20 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div 
                            className="flex items-start gap-3 flex-1 cursor-pointer"
                            onClick={() => handleSelectTemplate(template.column_mapping)}
                          >
                            <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{template.name}</h4>
                                {template.is_default && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Implicit
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.keys(template.column_mapping).map((key) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key.replace('_column', '').replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!template.is_default && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDefaultTemplate(template.id)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
