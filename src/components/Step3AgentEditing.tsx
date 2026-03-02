import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Upload, FileText, Trash2, Save, Database, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useEnhancedKnowledgeBase } from '../hooks/useEnhancedKnowledgeBase';

interface Step3Props {
  agentIdForEdit: string;
  setAgentIdForEdit: (id: string) => void;
  onNextStep: () => void;
}

export const Step3AgentEditing: React.FC<Step3Props> = ({
  agentIdForEdit,
  setAgentIdForEdit,
  onNextStep,
}) => {
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [selectedExistingDocId, setSelectedExistingDocId] = useState<string>('');

  const {
    documents,
    existingDocuments,
    selectedExistingDocuments,
    isUpdating,
    isLoadingExisting,
    loadExistingDocuments,
    addExistingDocument,
    addTextDocument,
    addFileDocument,
    removeDocument,
    updateAgentKnowledgeBase
  } = useEnhancedKnowledgeBase({ 
    agentId: agentIdForEdit 
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.txt', '.pdf', '.docx', '.doc', '.html', '.htm', '.epub', '.rtf', '.md'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Tip de fișier nesuportat",
        description: `Tipurile suportate sunt: ${allowedTypes.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fișier prea mare",
        description: "Dimensiunea maximă permisă este 10MB",
        variant: "destructive",
      });
      return;
    }

    const success = await addFileDocument(file);
    if (success) {
      event.target.value = ''; // Reset input
    }
  };

  const addManualDocument = async () => {
    if (!newDocName.trim() || !newDocContent.trim()) {
      toast({
        title: "Eroare",
        description: "Te rog completează numele și conținutul documentului.",
        variant: "destructive",
      });
      return;
    }

    const success = await addTextDocument(newDocName, newDocContent);
    if (success) {
      setNewDocName('');
      setNewDocContent('');
      setIsAddingDoc(false);
    }
  };

  const handleRemoveDocument = (id: string) => {
    removeDocument(id);
  };

  const handleUpdateKnowledgeBase = async () => {
    await updateAgentKnowledgeBase(false);
  };

  const handleAddExistingDocument = () => {
    if (!selectedExistingDocId) {
      toast({
        title: "Eroare",
        description: "Te rog selectează un document.",
        variant: "destructive",
      });
      return;
    }

    addExistingDocument(selectedExistingDocId);
    setSelectedExistingDocId('');
  };

  const getAvailableExistingDocuments = () => {
    return existingDocuments.filter(doc => !selectedExistingDocuments.has(doc.id));
  };

  const canProceed = agentIdForEdit.trim() !== '';

  return (
    <Card className="liquid-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Edit className="w-5 h-5 text-accent" />
          Pas 3: Editare Agent și Knowledge Base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="agent-id-edit" className="text-foreground">
            ID Agent pentru Editare
          </Label>
          <Input
            id="agent-id-edit"
            value={agentIdForEdit}
            onChange={(e) => setAgentIdForEdit(e.target.value)}
            placeholder="Introdu ID-ul agentului"
            className="glass-input"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-foreground font-medium">Knowledge Base</Label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadExistingDocuments}
                disabled={isLoadingExisting}
                className="elevenlabs-button elevenlabs-button-secondary flex items-center gap-2 px-3 py-2 text-sm"
              >
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isLoadingExisting ? 'Se încarcă...' : 'Selectează Existente'}
                </span>
                <span className="sm:hidden">Existente</span>
              </button>
              <button
                onClick={() => setIsAddingDoc(true)}
                className="elevenlabs-button elevenlabs-button-secondary flex items-center gap-2 px-3 py-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Adaugă Manual</span>
                <span className="sm:hidden">Manual</span>
              </button>
              <label className="cursor-pointer">
                <span className="elevenlabs-button elevenlabs-button-secondary flex items-center gap-2 px-3 py-2 text-sm">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Încarcă Fișier</span>
                  <span className="sm:hidden">Fișier</span>
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.pdf,.doc,.docx,.html,.htm,.epub,.rtf"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Existing Documents Selection */}
          {existingDocuments.length > 0 && (
            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
              <Label className="text-foreground font-medium">Documente Existente</Label>
              <div className="flex gap-2">
                <Select 
                  value={selectedExistingDocId} 
                  onValueChange={setSelectedExistingDocId}
                >
                  <SelectTrigger className="glass-input flex-1">
                    <SelectValue placeholder="Selectează un document existent" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                    {getAvailableExistingDocuments().map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.name} ({doc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button 
                  onClick={handleAddExistingDocument}
                  disabled={!selectedExistingDocId}
                  className="elevenlabs-button elevenlabs-button-primary flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Adaugă
                </button>
              </div>
            </div>
          )}

          {isAddingDoc && (
            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
              <Input
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Numele documentului"
                className="glass-input"
              />
              <Textarea
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                placeholder="Conținutul documentului..."
                className="glass-input min-h-[100px]"
              />
              <div className="flex gap-2">
                <button 
                  onClick={addManualDocument} 
                  className="elevenlabs-button elevenlabs-button-primary px-4 py-2 text-sm"
                >
                  Adaugă
                </button>
                <button 
                  onClick={() => setIsAddingDoc(false)}
                  className="elevenlabs-button elevenlabs-button-secondary px-4 py-2 text-sm"
                >
                  Anulează
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
              <p><strong>Formate suportate:</strong> TXT, PDF, DOCX, DOC, HTML, EPUB, RTF, MD</p>
              <p><strong>Dimensiune maximă:</strong> 10MB per fișier</p>
              <p>Fișierele vor fi procesate automat de ElevenLabs pentru knowledge base.</p>
            </div>
            {documents.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Nu ai adăugat încă documente în Knowledge Base.
                <br />
                Adaugă documente pentru a îmbunătăți răspunsurile agentului.
              </p>
            ) : (
              documents.map((doc) => {
                const getFileIcon = (name: string, type: string) => {
                  if (type === 'text') return '📄';
                  if (type === 'url') return '🌐';
                  
                  const ext = name.toLowerCase().split('.').pop();
                  switch (ext) {
                    case 'pdf': return '📄';
                    case 'docx':
                    case 'doc': return '📝';
                    case 'html':
                    case 'htm': return '🌐';
                    case 'epub': return '📚';
                    case 'rtf': return '📄';
                    case 'txt': return '📃';
                    case 'md': return '📝';
                    default: return '📄';
                  }
                };

                const getFileTypeLabel = (name: string, type: string) => {
                  if (type === 'text') return 'Document text';
                  if (type === 'url') return 'Document URL';
                  if (type === 'existing') return 'Document existent';
                  
                  const ext = name.split('.').pop()?.toUpperCase();
                  return ext ? `Fișier ${ext}` : 'Document';
                };
                
                return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg">{getFileIcon(doc.name, doc.type || '')}</span>
                    <div className="flex flex-col">
                      <h4 className="font-medium text-foreground">
                        {doc.name}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {getFileTypeLabel(doc.name, doc.type || '')}
                      </span>
                      {doc.elevenLabsId && (
                        <p className="text-xs text-blue-600 mt-1">
                          ID: {doc.elevenLabsId}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="elevenlabs-button elevenlabs-button-danger p-2 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
              })
            )}
          </div>

          {documents.length > 0 && (
            <button
              onClick={handleUpdateKnowledgeBase}
              disabled={isUpdating || !agentIdForEdit.trim()}
              className="elevenlabs-button elevenlabs-button-primary w-full py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Se Actualizează Knowledge Base
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Actualizează Knowledge Base
                </>
              )}
            </button>
          )}
        </div>

        {canProceed && (
          <button
            onClick={onNextStep}
            className="elevenlabs-button elevenlabs-button-primary w-full py-3 text-sm font-medium"
          >
            Continuă la Pasul 4
          </button>
        )}
      </CardContent>
    </Card>
  );
};
