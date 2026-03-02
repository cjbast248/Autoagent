import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Plus, Trash2, Copy, FileText, Search, Loader2, Download, Upload, Pencil } from 'lucide-react';
import { WorkflowProject } from '@/hooks/useWorkflowProjects';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface N8NProjectsDrawerProps {
  projects: WorkflowProject[];
  currentProjectId: string | null;
  isLoading: boolean;
  onLoadProject: (project: WorkflowProject) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: WorkflowProject) => void;
  onRenameProject?: (projectId: string, newName: string) => Promise<boolean>;
  onNewProject: () => void;
  onImportProject?: (projectData: { name: string; nodes: any[]; connections: any[] }) => void;
}

export const N8NProjectsDrawer: React.FC<N8NProjectsDrawerProps> = ({
  projects,
  currentProjectId,
  isLoading,
  onLoadProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onNewProject,
  onImportProject,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<WorkflowProject | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLoadProject = (project: WorkflowProject) => {
    onLoadProject(project);
    setOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (projectToDelete) {
      onDeleteProject(projectToDelete);
      setProjectToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicateClick = (e: React.MouseEvent, project: WorkflowProject) => {
    e.stopPropagation();
    onDuplicateProject(project);
  };

  const handleRenameClick = (e: React.MouseEvent, project: WorkflowProject) => {
    e.stopPropagation();
    setProjectToRename(project);
    setNewProjectName(project.name);
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (projectToRename && newProjectName.trim() && onRenameProject) {
      const success = await onRenameProject(projectToRename.id, newProjectName.trim());
      if (success) {
        setRenameDialogOpen(false);
        setProjectToRename(null);
        setNewProjectName('');
      }
    }
  };

  // Export a project as JSON file
  const handleExportProject = (e: React.MouseEvent, project: WorkflowProject) => {
    e.stopPropagation();
    
    const exportData = {
      name: project.name,
      description: project.description || '',
      nodes: project.nodes,
      connections: project.connections,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_workflow.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Workflow "${project.name}" exportat cu succes!`);
  };

  // Import workflow from JSON file
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content);
        
        // Validate the imported data
        if (!importedData.nodes || !Array.isArray(importedData.nodes)) {
          throw new Error('Fișierul nu conține noduri valide');
        }
        if (!importedData.connections || !Array.isArray(importedData.connections)) {
          throw new Error('Fișierul nu conține conexiuni valide');
        }
        
        // Generate new IDs for nodes and update connection references
        const idMapping: Record<string, string> = {};
        const newNodes = importedData.nodes.map((node: any) => {
          const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          idMapping[node.id] = newId;
          return { ...node, id: newId };
        });
        
        const newConnections = importedData.connections.map((conn: any) => ({
          ...conn,
          id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          from: idMapping[conn.from] || conn.from,
          to: idMapping[conn.to] || conn.to,
        }));
        
        const projectName = importedData.name 
          ? `${importedData.name} (Importat)` 
          : `Workflow Importat ${new Date().toLocaleDateString('ro-RO')}`;
        
        if (onImportProject) {
          onImportProject({
            name: projectName,
            nodes: newNodes,
            connections: newConnections,
          });
          setOpen(false);
          toast.success(`Workflow "${importedData.name || 'necunoscut'}" importat cu succes!`);
        }
      } catch (error: any) {
        console.error('Import error:', error);
        toast.error(`Eroare la import: ${error.message || 'Fișier invalid'}`);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNewProject = () => {
    onNewProject();
    setOpen(false);
  };

  // Navigate to main projects page
  const handleNavigateToProjects = () => {
    navigate('/account/workflow');
  };

  return (
    <>
      {/* Proiecte button - navigates to main projects page */}
      <button
        onClick={handleNavigateToProjects}
        className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] rounded-md border border-[#3a3a3a] hover:bg-[#2a2a2a] transition-colors h-7"
      >
        <FolderOpen className="h-3 w-3 text-slate-300" />
        <span className="text-[10px] font-medium text-slate-300 hidden sm:inline">Proiecte</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="center" className="w-[90vw] max-w-[700px] p-0">
          <SheetHeader className="p-6 pb-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Proiectele Mele
            </SheetTitle>
          </SheetHeader>

          <div className="p-4 border-b border-border/50 space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleNewProject}
                className="flex-1 gap-2"
                variant="default"
              >
                <Plus className="h-4 w-4" />
                Proiect Nou
              </Button>

              {/* Import Button */}
              <Button
                onClick={handleImportClick}
                className="flex-1 gap-2"
                variant="outline"
              >
                <Upload className="h-4 w-4" />
                Importă Workflow din JSON
              </Button>
            </div>
            
            {/* Hidden file input for import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              className="hidden"
            />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută proiecte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="h-[calc(85vh-220px)] max-h-[500px] overflow-y-auto scrollbar-hide">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Niciun proiect găsit' : 'Nu ai încă niciun proiect salvat'}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Creează un workflow și salvează-l pentru a-l vedea aici
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleLoadProject(project)}
                    className={`
                      group px-4 py-3 cursor-pointer transition-colors relative
                      hover:bg-accent/10
                      ${currentProjectId === project.id ? 'bg-accent/10' : ''}
                    `}
                  >
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
                        {currentProjectId === project.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <span className="font-medium truncate text-sm">{project.name}</span>
                        <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                          {project.nodes.length} noduri
                        </span>
                      </div>

                      <div className="flex items-center gap-1 absolute right-4">
                        <button
                          className="p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          onClick={(e) => handleExportProject(e, project)}
                          title="Exportă"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          onClick={(e) => handleRenameClick(e, project)}
                          title="Redenumește"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          onClick={(e) => handleDuplicateClick(e, project)}
                          title="Duplică"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors"
                          onClick={(e) => handleDeleteClick(e, project.id)}
                          title="Șterge"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi proiectul?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Proiectul va fi șters permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Redenumește proiectul</DialogTitle>
            <DialogDescription>
              Introdu un nume nou pentru proiect.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nume proiect"
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleConfirmRename} disabled={!newProjectName.trim()}>
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
