import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  FolderOpen,
  Plus,
  UploadCloud,
  Trash2,
  ArrowDownToLine,
  Megaphone,
  Users,
  FileUp,
  Loader2,
  Search,
  MoreHorizontal,
  FileSpreadsheet,
  Folder,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContactFile {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const ContactFiles: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<ContactFile[]>([]);
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newFileName, setNewFileName] = useState('');
  const [newFileDescription, setNewFileDescription] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>('');

  // Dotted background pattern
  const dotPatternStyle = {
    backgroundImage: 'radial-gradient(#e4e4e7 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px',
  };

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contact_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);

      // Load contact counts for all files
      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        for (const file of data) {
          const { count } = await supabase
            .from('workflow_contacts')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', file.id);
          counts[file.id] = count || 0;
        }
        setContactCounts(counts);
      }
    } catch (error: any) {
      console.error('Error loading contact files:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca fișierele",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "Eroare",
        description: "Numele fișierului este obligatoriu",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Eroare",
        description: "Trebuie să fii autentificat",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contact_lists')
        .insert({
          name: newFileName.trim(),
          description: newFileDescription.trim() || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Fișier creat cu succes",
      });

      setFiles([data, ...files]);
      setContactCounts({ ...contactCounts, [data.id]: 0 });
      setCreateDialogOpen(false);
      setNewFileName('');
      setNewFileDescription('');
    } catch (error: any) {
      console.error('Error creating file:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut crea fișierul",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Sigur doriți să ștergeți acest fișier? Toate contactele din el vor fi șterse.')) {
      return;
    }

    try {
      const { error: contactsError } = await supabase
        .from('workflow_contacts')
        .delete()
        .eq('list_id', fileId);

      if (contactsError) throw contactsError;

      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Fișier șters cu succes",
      });

      setFiles(files.filter(f => f.id !== fileId));
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge fișierul",
        variant: "destructive",
      });
    }
  };

  const handleUploadCSV = async () => {
    if (!csvFile || !selectedListId) {
      toast({
        title: "Eroare",
        description: "Selectați un fișier CSV și un dosar de destinație",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('Fișierul CSV este gol sau invalid');
      }

      const contacts = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());

        if (values.length >= 2 && values[1]) {
          const contact: any = {
            list_id: selectedListId,
            full_name: values[0] || `Contact ${i}`,
            phone_e164: values[1].startsWith('+') ? values[1] : `+${values[1]}`,
            info_json: {
              location: values[2] || null,
              language: values[3] || 'ro',
            },
            status: 'pending',
          };
          contacts.push(contact);
        }
      }

      if (contacts.length === 0) {
        throw new Error('Nu s-au găsit contacte valide în fișierul CSV');
      }

      const { error } = await supabase
        .from('workflow_contacts')
        .insert(contacts);

      if (error) throw error;

      toast({
        title: "Succes",
        description: `${contacts.length} contacte importate cu succes`,
      });

      setUploadDialogOpen(false);
      setCsvFile(null);
      setSelectedListId('');
      loadFiles();
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut încărca fișierul CSV",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = async (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: contacts, error } = await supabase
        .from('workflow_contacts')
        .select('full_name, phone_e164, info_json')
        .eq('list_id', fileId);

      if (error) throw error;

      if (!contacts || contacts.length === 0) {
        toast({
          title: "Info",
          description: "Nu există contacte de exportat",
        });
        return;
      }

      const headers = 'Nume,Telefon,Locație,Limbă\n';
      const rows = contacts.map(c => {
        const infoJson = c.info_json as any;
        const location = infoJson?.location || '';
        const language = infoJson?.language || 'ro';
        return `${c.full_name || ''},${c.phone_e164 || ''},${location},${language}`;
      }).join('\n');

      const csvContent = headers + rows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Succes",
        description: "CSV exportat cu succes",
      });
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut exporta fișierul CSV",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setCsvFile(droppedFile);
      setUploadDialogOpen(true);
    } else {
      toast({
        title: "Eroare",
        description: "Vă rugăm să încărcați doar fișiere CSV",
        variant: "destructive",
      });
    }
  };

  // Filter files based on search
  const filteredFiles = files.filter(file => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return file.name.toLowerCase().includes(query);
  });

  // Calculate total contacts
  const totalContacts = Object.values(contactCounts).reduce((sum, count) => sum + count, 0);

  // Get icon for file based on index
  const getFileIcon = (index: number) => {
    const icons = [FolderOpen, Megaphone, Users, FileSpreadsheet];
    return icons[index % icons.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
          <p className="text-zinc-500">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen p-10 pb-32" style={dotPatternStyle}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="mb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-black tracking-tight">Contact Data</h1>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-500">
                    {filteredFiles.length} {filteredFiles.length === 1 ? 'SET' : 'SETS'}
                  </span>
                </div>
                <p className="text-sm text-zinc-500">
                  Manage CSV datasets for outbound campaigns.
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Synced with CRM • {totalContacts.toLocaleString()} Total Contacts
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-black transition w-64 placeholder-zinc-400"
                  />
                </div>
                <button
                  onClick={() => setCreateDialogOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  New Dataset
                </button>
              </div>
            </div>
          </header>

          {/* Upload Zone - Dashed Row */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => setUploadDialogOpen(true)}
            className={`group w-full h-20 border border-dashed rounded-2xl flex items-center justify-center gap-4 cursor-pointer mb-8 transition-all ${
              isDragOver
                ? 'border-black bg-white'
                : 'border-zinc-300 bg-zinc-50/50 hover:border-black hover:bg-white'
            }`}
            style={{
              backgroundImage: isDragOver
                ? 'none'
                : 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px)',
            }}
          >
            <div className={`w-10 h-10 rounded-xl bg-white border flex items-center justify-center shadow-sm transition ${
              isDragOver ? 'border-black scale-110' : 'border-zinc-200 group-hover:border-black group-hover:scale-110'
            }`}>
              <FileUp className={`w-5 h-5 transition ${isDragOver ? 'text-black' : 'text-zinc-400 group-hover:text-black'}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-black">Upload CSV Dataset</span>
              <span className="text-xs text-zinc-400">Drag & drop or click to browse local files</span>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[3fr_1.5fr_1.5fr_60px] px-6 mb-3">
            <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Dataset Name</div>
            <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Date Uploaded</div>
            <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Volume</div>
            <div></div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-400" />
              <p className="text-zinc-500 mt-4 text-sm">Se încarcă datele...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white border border-zinc-200 flex items-center justify-center mx-auto mb-4">
                <Folder className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900 mb-2">
                {searchQuery ? 'No datasets found' : 'No datasets yet'}
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                {searchQuery ? 'Try a different search term' : 'Upload your first CSV dataset to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setUploadDialogOpen(true)}
                  className="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-zinc-200 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Upload your first dataset
                </button>
              )}
            </div>
          ) : (
            /* Data Rows */
            filteredFiles.map((file, index) => {
              const IconComponent = getFileIcon(index);
              const count = contactCounts[file.id] || 0;

              return (
                <div
                  key={file.id}
                  onClick={() => navigate(`/account/files/${file.id}`)}
                  className="group bg-white border border-zinc-200 rounded-2xl p-5 px-6 mb-3 grid grid-cols-[3fr_1.5fr_1.5fr_60px] items-center cursor-pointer transition-all hover:border-zinc-400 hover:shadow-md hover:-translate-y-px"
                >
                  {/* Dataset Name */}
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 transition group-hover:bg-black group-hover:border-black group-hover:text-white">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-black group-hover:underline decoration-zinc-200 underline-offset-4">
                        {file.name}
                      </div>
                      <div className="text-xs text-zinc-400">{file.description || 'No description'}</div>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-[11px] text-zinc-500 font-mono">
                    {new Date(file.created_at).toLocaleDateString('ro-RO', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).replace(/\//g, '.')}
                  </div>

                  {/* Contact Count */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-black font-mono">{count.toLocaleString()}</span>
                    <span className="text-[10px] text-zinc-400 uppercase">contacts</span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-black transition">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={(e) => handleExportCSV(file.id, file.name, e as any)}
                          className="text-sm cursor-pointer"
                        >
                          <ArrowDownToLine className="w-4 h-4 mr-2" />
                          Export CSV
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteFile(file.id, e as any)}
                          className="text-sm text-red-600 cursor-pointer focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent hideCloseButton className="sm:max-w-[420px] p-0 gap-0 overflow-hidden bg-white rounded-2xl border-0 shadow-2xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">New Dataset</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Create a collection to organize contacts.</p>
            </div>
            <button
              onClick={() => setCreateDialogOpen(false)}
              className="text-zinc-400 hover:text-black transition p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5">
            {/* Folder Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Dataset Name
              </label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. VIP Clients Q1"
                className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black focus:bg-white transition"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Description <span className="font-normal text-zinc-400">(Optional)</span>
              </label>
              <textarea
                value={newFileDescription}
                onChange={(e) => setNewFileDescription(e.target.value)}
                placeholder="Optional details about this collection..."
                className="w-full h-24 px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm placeholder:text-zinc-300 focus:outline-none focus:border-black focus:bg-white transition resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex justify-end gap-3">
            <button
              onClick={() => {
                setCreateDialogOpen(false);
                setNewFileName('');
                setNewFileDescription('');
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-black transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFile}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-black text-white hover:bg-zinc-800 shadow-lg shadow-zinc-200 transition active:scale-95"
            >
              Create Dataset
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent hideCloseButton className="sm:max-w-md p-0 gap-0 overflow-hidden bg-white rounded-2xl border-0 shadow-2xl">
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-100 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Import CSV</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Upload contacts to a specific dataset.</p>
            </div>
            <button
              onClick={() => setUploadDialogOpen(false)}
              className="text-zinc-400 hover:text-black transition p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* CSV File Upload Zone */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">CSV File</label>

              <div
                onClick={() => document.getElementById('csv-file-input')?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile && droppedFile.name.endsWith('.csv')) {
                    setCsvFile(droppedFile);
                  }
                }}
                className={`h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer group transition-all ${
                  csvFile ? 'border-black bg-zinc-50' : 'border-zinc-300 hover:border-black'
                }`}
              >
                {csvFile ? (
                  <>
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-3">
                      <FileSpreadsheet className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-bold text-zinc-900">{csvFile.name}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">Click to change file</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition">
                      <UploadCloud className="w-6 h-6 text-zinc-400 group-hover:text-black transition" />
                    </div>
                    <p className="text-sm font-bold text-zinc-900">Click to upload</p>
                    <p className="text-[10px] text-zinc-400 mt-1">or drag and drop (max 10MB)</p>
                  </>
                )}
              </div>

              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <p className="text-[10px] text-zinc-400">
                Required columns: Name, Phone, Location
              </p>
            </div>

            {/* Destination Folder Select */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Destination Dataset
              </label>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-900 appearance-none cursor-pointer focus:outline-none focus:border-black focus:bg-white transition"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px'
                }}
              >
                <option value="">Select a dataset...</option>
                {files.map(file => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex justify-end gap-3">
            <button
              onClick={() => {
                setUploadDialogOpen(false);
                setCsvFile(null);
                setSelectedListId('');
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-black transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadCSV}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-black text-white hover:bg-zinc-800 shadow-lg shadow-zinc-200 transition active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              Upload File
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ContactFiles;
