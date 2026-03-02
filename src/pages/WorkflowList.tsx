import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, Plus, Upload, Trash2, Copy, Download, MoreHorizontal, Zap, Box, MessageSquare, Layers, Type } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkflowProjects, WorkflowProject } from '@/hooks/useWorkflowProjects';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Dot pattern style
const dotPatternStyle = {
  backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
};

type FilterTab = 'all' | 'active' | 'drafts' | 'templates';

export default function WorkflowList() {
  const navigate = useNavigate();
  const { projects, isLoading, deleteProject, duplicateProject, saveProject, renameProject } = useWorkflowProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<WorkflowProject | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProjects = projects
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const handleCreateWorkflow = async () => {
    if (isCreating) return; // Prevent multiple clicks
    setIsCreating(true);
    try {
      const projectId = await saveProject('Workflow Nou', [], []);
      if (projectId) {
        navigate(`/account/workflow/${projectId}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenWorkflow = (projectId: string) => {
    navigate(`/account/workflow/${projectId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete);
      setProjectToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicate = async (e: React.MouseEvent, project: WorkflowProject) => {
    e.stopPropagation();
    await duplicateProject(project);
  };

  const handleRenameClick = (e: React.MouseEvent, project: WorkflowProject) => {
    e.stopPropagation();
    setProjectToRename(project);
    setNewProjectName(project.name);
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (projectToRename && newProjectName.trim()) {
      const success = await renameProject(projectToRename.id, newProjectName.trim());
      if (success) {
        setRenameDialogOpen(false);
        setProjectToRename(null);
        setNewProjectName('');
      }
    }
  };

  const handleExport = (e: React.MouseEvent, project: WorkflowProject) => {
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

    toast.success(`Workflow exportat!`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content);

        if (!importedData.nodes || !Array.isArray(importedData.nodes)) {
          throw new Error('Fișierul nu conține noduri valide');
        }

        const idMapping: Record<string, string> = {};
        const newNodes = importedData.nodes.map((node: any) => {
          const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          idMapping[node.id] = newId;
          return { ...node, id: newId };
        });

        const newConnections = (importedData.connections || []).map((conn: any) => ({
          ...conn,
          id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          from: idMapping[conn.from] || conn.from,
          to: idMapping[conn.to] || conn.to,
        }));

        const projectName = importedData.name
          ? `${importedData.name} (Importat)`
          : `Workflow Importat`;

        const projectId = await saveProject(projectName, newNodes, newConnections);
        if (projectId) {
          toast.success('Workflow importat cu succes!');
        }
      } catch (error: any) {
        console.error('Import error:', error);
        toast.error(`Eroare la import: ${error.message || 'Fișier invalid'}`);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get icon for workflow based on index
  const getWorkflowIcon = (index: number) => {
    const icons = [Zap, Box, MessageSquare, Layers];
    return icons[index % icons.length];
  };

  // Render flow complexity visualization
  const renderFlowComplexity = (nodeCount: number) => {
    if (nodeCount === 0) {
      return (
        <div className="flex items-center gap-1 opacity-30">
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
          <div className="w-5 h-px bg-black" />
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
        </div>
      );
    }

    // Simple flow: dot-line-dot
    if (nodeCount <= 2) {
      return (
        <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
          <div className="w-5 h-px bg-black" />
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
        </div>
      );
    }

    // Medium flow: dot-line-dot-line-branch-line-dot
    if (nodeCount <= 5) {
      return (
        <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
          <div className="w-4 h-px bg-black" />
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
          <div className="w-4 h-px bg-black" />
          <div className="w-3 h-3 border border-black rounded-sm" />
          <div className="w-4 h-px bg-black" />
          <div className="w-1.5 h-1.5 rounded-full bg-black" />
        </div>
      );
    }

    // Complex flow
    return (
      <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
        <div className="w-1.5 h-1.5 rounded-full bg-black" />
        <div className="w-3 h-px bg-black" />
        <div className="w-1.5 h-1.5 rounded-full bg-black" />
        <div className="w-3 h-px bg-black" />
        <div className="w-3 h-3 border border-black rounded-sm" />
        <div className="w-3 h-px bg-black" />
        <div className="w-1.5 h-1.5 rounded-full bg-black" />
        <div className="w-3 h-px bg-black" />
        <div className="w-1.5 h-1.5 rounded-full bg-black" />
      </div>
    );
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All Flows' },
    { id: 'active', label: 'Active' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'templates', label: 'Templates' },
  ];

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-auto min-h-screen" style={dotPatternStyle}>
        <div className="max-w-6xl mx-auto px-8 py-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-black tracking-tight mb-2">Workflows</h1>
              <p className="text-sm text-zinc-500">
                Automate your business logic visually.
                <br />
                <span className="text-xs text-zinc-400">Library Version: 2.4 • {filteredProjects.length} Active Flows</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Caută workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition placeholder:text-zinc-400"
                />
              </div>

              {/* Create Button */}
              <button
                data-action="new-workflow"
                onClick={handleCreateWorkflow}
                disabled={isCreating}
                className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-800 transition shadow-lg shadow-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Se creează...' : 'Creează Workflow'}
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[13px] font-medium border transition",
                  activeTab === tab.id
                    ? "bg-black text-white border-black"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-black"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Create New Card - Dashed */}
          <div
            onClick={isCreating ? undefined : handleCreateWorkflow}
            className={cn(
              "group flex items-center justify-center gap-3 p-5 mb-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 transition-all",
              isCreating
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-black hover:bg-white cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            )}
          >
            <div className="w-8 h-8 rounded-full border border-dashed border-zinc-400 flex items-center justify-center group-hover:border-black group-hover:bg-black group-hover:text-white transition text-zinc-500">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-zinc-500 group-hover:text-black transition">
              {isCreating ? 'Se creează...' : 'Start from scratch'}
            </span>
            <span className="text-xs text-zinc-400 ml-2">or select a template below</span>
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            className="hidden"
          />

          {/* Table Header */}
          <div
            className="grid px-6 mb-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest"
            style={{ gridTemplateColumns: '3fr 1fr 3fr 2fr 80px' }}
          >
            <div>Name</div>
            <div>ID</div>
            <div>Complexity</div>
            <div>Activity</div>
            <div></div>
          </div>

          {/* Workflow Cards */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-zinc-200">
                    <div className="grid items-center" style={{ gridTemplateColumns: '3fr 1fr 3fr 2fr 80px' }}>
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-xl" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-2 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </div>
                  </div>
                ))}
              </>
            ) : filteredProjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 px-6 py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-zinc-300" />
                </div>
                <h3 className="text-lg font-bold text-black mb-2">
                  {searchQuery ? 'No workflows found' : 'No workflows yet'}
                </h3>
                <p className="text-sm text-zinc-500 mb-6">
                  {searchQuery ? 'Try a different search term' : 'Create your first workflow to get started'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleCreateWorkflow}
                    disabled={isCreating}
                    className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-800 transition shadow-lg shadow-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    {isCreating ? 'Se creează...' : 'Creează Workflow'}
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredProjects.map((project, index) => {
                  const IconComponent = getWorkflowIcon(index);

                  return (
                    <div
                      key={project.id}
                      onClick={() => handleOpenWorkflow(project.id)}
                      className="group bg-white rounded-2xl border border-zinc-200 p-4 px-6 cursor-pointer transition-all duration-200 hover:border-zinc-400 hover:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:-translate-y-px"
                      style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 3fr 2fr 80px', alignItems: 'center' }}
                    >
                      {/* Name */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-black group-hover:text-white transition">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-black group-hover:underline decoration-zinc-200 underline-offset-4">
                            {project.name}
                          </h3>
                          <p className="text-xs text-zinc-400">
                            {project.description || 'General Automation'}
                          </p>
                        </div>
                      </div>

                      {/* ID */}
                      <div className="font-mono text-[10px] text-zinc-400">
                        {project.id.slice(0, 8)}
                      </div>

                      {/* Complexity */}
                      <div>
                        {renderFlowComplexity(project.nodes.length)}
                      </div>

                      {/* Activity */}
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{formatDate(project.updated_at)}</div>
                        <div className="text-[10px] text-zinc-400">
                          {project.nodes.length > 0 ? 'Active' : 'Draft'}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-black transition">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleRenameClick(e as any, project)}>
                              <Type className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleExport(e as any, project)}>
                              <Download className="h-4 w-4 mr-2" />
                              Export JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDuplicate(e as any, project)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteClick(e as any, project.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-zinc-900">Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500">
              This action cannot be undone. The workflow will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-black hover:bg-zinc-100 border-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="bg-white rounded-2xl border-0 shadow-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900">Rename workflow</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              Enter a new name for this workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Workflow name"
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmRename();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRename}
              disabled={!newProjectName.trim()}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-black text-white hover:bg-zinc-800"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
