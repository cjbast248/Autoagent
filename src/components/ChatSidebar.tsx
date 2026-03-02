import React, { useState, useMemo } from 'react';
import { MessageSquare, Plus, Trash2, Search, Calendar, Clock, CheckSquare, Square, Download, Edit2, Check, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  preview?: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onExportConversations?: (ids: string[]) => void;
}

// Helper function to group conversations by date
const groupConversationsByDate = (conversations: Conversation[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const groups: { [key: string]: Conversation[] } = {
    'Astăzi': [],
    'Ieri': [],
    'Săptămâna aceasta': [],
    'Luna aceasta': [],
    'Mai vechi': []
  };

  conversations.forEach(conv => {
    const date = new Date(conv.updated_at);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      groups['Astăzi'].push(conv);
    } else if (date.getTime() === yesterday.getTime()) {
      groups['Ieri'].push(conv);
    } else if (date > lastWeek) {
      groups['Săptămâna aceasta'].push(conv);
    } else if (date > lastMonth) {
      groups['Luna aceasta'].push(conv);
    } else {
      groups['Mai vechi'].push(conv);
    }
  });

  return groups;
};

// Helper to get time ago
const getTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Acum';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}z`;
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
};

export function ChatSidebar({
  conversations,
  currentConversationId,
  onLoadConversation,
  onDeleteConversation,
  onNewChat,
  onRenameConversation,
  onExportConversations
}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.title.toLowerCase().includes(query) ||
      c.preview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Group filtered conversations by date
  const groupedConversations = useMemo(() => 
    groupConversationsByDate(filteredConversations),
    [filteredConversations]
  );

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all
  const selectAll = () => {
    setSelectedIds(new Set(filteredConversations.map(c => c.id)));
  };

  // Delete selected
  const deleteSelected = () => {
    selectedIds.forEach(id => onDeleteConversation(id));
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  // Export selected
  const exportSelected = () => {
    if (onExportConversations) {
      onExportConversations(Array.from(selectedIds));
    }
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  // Start editing
  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  // Save edit
  const saveEdit = () => {
    if (editingId && editTitle.trim() && onRenameConversation) {
      onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur border-border hover:bg-accent"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-[340px] p-0 bg-background border-l border-border"
      >
        <TooltipProvider>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Istoric Chat</h2>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setIsSelectMode(!isSelectMode);
                        setSelectedIds(new Set());
                      }}
                    >
                      {isSelectMode ? <XIcon className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isSelectMode ? 'Anulează selecția' : 'Selectează multiple'}</TooltipContent>
                </Tooltip>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onNewChat();
                    setIsOpen(false);
                  }}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Chat Nou
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută conversații..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50"
              />
            </div>

            {/* Bulk actions */}
            {isSelectMode && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground flex-1">
                  {selectedIds.size} selectate
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  Toate
                </Button>
                {onExportConversations && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportSelected}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exportă</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={deleteSelected}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Șterge selectate</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-4">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">
                    {searchQuery ? 'Nicio conversație găsită' : 'Nicio conversație încă'}
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    {searchQuery ? 'Încearcă alt termen de căutare' : 'Începe un chat nou pentru a începe'}
                  </p>
                </div>
              ) : (
                Object.entries(groupedConversations).map(([groupName, convs]) => {
                  if (convs.length === 0) return null;
                  
                  return (
                    <div key={groupName} className="space-y-1">
                      {/* Group Header */}
                      <div className="flex items-center gap-2 px-2 py-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {groupName}
                        </span>
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          {convs.length}
                        </Badge>
                      </div>

                      {/* Conversations in group */}
                      {convs.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`group relative rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                            currentConversationId === conversation.id
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted/50 border border-transparent'
                          }`}
                          onClick={() => {
                            if (isSelectMode) {
                              toggleSelect(conversation.id);
                            } else if (editingId !== conversation.id) {
                              onLoadConversation(conversation.id);
                              setIsOpen(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* Select checkbox or Message icon */}
                            {isSelectMode ? (
                              <div 
                                className="flex-shrink-0 mt-0.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(conversation.id);
                                }}
                              >
                                {selectedIds.has(conversation.id) ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            ) : (
                              <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-md ${
                                currentConversationId === conversation.id 
                                  ? 'bg-primary/20' 
                                  : 'bg-muted'
                              }`}>
                                <MessageSquare className={`h-3 w-3 ${
                                  currentConversationId === conversation.id 
                                    ? 'text-primary' 
                                    : 'text-muted-foreground'
                                }`} />
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {editingId === conversation.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="h-7 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit();
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>
                                    <Check className="h-3 w-3 text-green-500" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>
                                    <XIcon className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <h4 className="text-sm font-medium truncate text-foreground">
                                    {conversation.title}
                                  </h4>
                                  {conversation.preview && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      {conversation.preview}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-3 w-3 text-muted-foreground/50" />
                                    <span className="text-[10px] text-muted-foreground">
                                      {getTimeAgo(conversation.updated_at)}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Actions */}
                            {!isSelectMode && editingId !== conversation.id && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onRenameConversation && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditing(conversation);
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Redenumește</TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteConversation(conversation.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Șterge</TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer with stats */}
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{conversations.length} conversații</span>
              {searchQuery && (
                <span>{filteredConversations.length} rezultate</span>
              )}
            </div>
          </div>
        </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}