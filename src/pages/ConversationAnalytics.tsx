import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useCallHistory } from "@/hooks/useCallHistory";
import { useCallInitiation } from "@/hooks/useCallInitiation";
import { useConversationAnalyticsCache } from "@/hooks/useConversationAnalyticsCache";
import { useGlobalAudioPlayer } from "@/components/audio/GlobalAudioPlayerContext";
import { useUserAgents } from "@/hooks/useUserAgents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search,
  Phone,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  Heart,
  Filter,
  Download,
  Volume2,
  AlertTriangle,
  GitMerge,
  Settings,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  ChevronDown,
  X,
  MessageSquare,
  CalendarIcon,
  GripVertical,
  Type,
  Hash,
  DollarSign,
  Coins,
  Timer,
  CheckCircle2,
  FileText,
  Bot,
  Tag,
  Star,
  MoreHorizontal,
  User,
  Lock,
} from "lucide-react";
import { useConclusionAnalyzer } from "@/hooks/useConclusionAnalyzer";
import { ConclusionCell } from "@/components/analytics/ConclusionCell";
import { EditableTagsCell } from "@/components/analytics/EditableTagsCell";
import { cn } from "@/utils/utils";
import { useToast } from "@/hooks/use-toast";
import { ConversationDetailSidebar } from "@/components/outbound/ConversationDetailSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { SyncConversationsButton } from "@/components/SyncConversationsButton";

// Sortable column header component with drag & drop (Notion-style)
const SortableColumnHeader = ({
  id,
  children,
  width,
  onResize,
  onResizeStart,
  onResizeEnd,
  icon: Icon,
}: {
  id: string;
  children: React.ReactNode;
  width: number;
  onResize: (columnId: string, newWidth: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [isResizing, setIsResizing] = useState(false);
  const [showWidthIndicator, setShowWidthIndicator] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const containerRef = useRef<HTMLTableCellElement>(null);
  const resizeDataRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: width });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
  };

  // Resize with visual feedback
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setShowWidthIndicator(true);
    onResizeStart?.(); // This will set isColumnResizing = true in parent
    const startWidth = width;
    setCurrentWidth(startWidth);

    resizeDataRef.current = {
      startX: e.clientX,
      startWidth,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const deltaX = e.clientX - resizeDataRef.current.startX;
      const newWidth = resizeDataRef.current.startWidth + deltaX;
      // Minim foarte mic pentru a permite resize liber
      const constrainedWidth = Math.max(40, newWidth);

      setCurrentWidth(constrainedWidth);
      onResize(id, constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setShowWidthIndicator(false);
      onResizeEnd?.(); // This will set isColumnResizing = false in parent
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, id, onResize, onResizeEnd]);

  return (
    <th
      ref={(node) => {
        setNodeRef(node);
        (containerRef as any).current = node;
      }}
      style={style}
      className={`
        px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider
        select-none relative group bg-white whitespace-nowrap overflow-hidden
        ${isResizing ? "cursor-col-resize" : "cursor-grab"}
        ${isDragging ? "bg-blue-50 shadow-lg" : ""}
      `}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-1.5 justify-start cursor-grab active:cursor-grabbing whitespace-nowrap overflow-hidden"
      >
        {/* Notion-style column icon */}
        {Icon && <Icon className="h-4 w-4 text-[#787774] flex-shrink-0" />}
        <span className="truncate">{children}</span>
      </div>

      {/* Width indicator */}
      {showWidthIndicator && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap">
          {Math.round(currentWidth)}px
        </div>
      )}

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          absolute top-0 right-0 w-1 h-full 
          cursor-col-resize 
          hover:bg-[#0B6AB5] 
          active:bg-[#0B6AB5] 
          transition-all duration-150
          ${isResizing ? "bg-[#0B6AB5] w-1.5" : "bg-transparent"}
          group-hover:bg-gray-300
        `}
        title="Drag pentru a redimensiona coloana"
        style={{ right: "-2px", zIndex: 10 }}
      >
        {/* Visual indicator când resize e activ */}
        {isResizing && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-[#0B6AB5] opacity-50" />}
      </div>
    </th>
  );
};
const ConversationAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Drag-to-scroll refs and state
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // State to track horizontal scroll for sticky column shadow
  const [isHorizontallyScrolled, setIsHorizontallyScrolled] = useState(false);

  // State to disable scroll during column resize
  const [isColumnResizing, setIsColumnResizing] = useState(false);

  // Callbacks for column resize to disable scroll
  const handleColumnResizeStart = useCallback(() => {
    setIsColumnResizing(true);
  }, []);

  const handleColumnResizeEnd = useCallback(() => {
    setIsColumnResizing(false);
  }, []);

  // Add the redial functionality
  const { initiateCall } = useCallInitiation({
    agentId: "",
    phoneId: undefined,
    smsConfig: {
      enabled: false,
      apiToken: "",
      senderId: "",
      message: "",
      delay: 0,
    },
    concurrentCalls: 1,
  });

  // Helper function to load filters from localStorage
  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem("conversationAnalytics_filters");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading saved filters:", e);
    }
    return null;
  };

  const savedFilters = loadSavedFilters();

  // Search and Filters - Load from localStorage if available
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  // Multi-select filters for Agents and AI Scores
  const [selectedAgents, setSelectedAgents] = useState<string[]>(savedFilters?.selectedAgents || []);
  const [statusFilter, setStatusFilter] = useState(savedFilters?.statusFilter || "all");
  const [dateAfter, setDateAfter] = useState(savedFilters?.dateAfter || "");
  const [dateBefore, setDateBefore] = useState(savedFilters?.dateBefore || "");
  const [onlyLiked, setOnlyLiked] = useState(savedFilters?.onlyLiked || false);
  const [minDuration, setMinDuration] = useState(savedFilters?.minDuration || "");
  const [maxDuration, setMaxDuration] = useState(savedFilters?.maxDuration || "");
  const [durationPreset, setDurationPreset] = useState(savedFilters?.durationPreset || "all");
  // AI Score & Tags Filters - multi-select
  const [aiScoreFilters, setAiScoreFilters] = useState<string[]>(savedFilters?.aiScoreFilters || []);
  const [aiTagsFilter, setAiTagsFilter] = useState<string[]>(savedFilters?.aiTagsFilter || []);
  // Active filter panel (which filter is currently expanded)
  const [showFilters, setShowFilters] = useState<string | null>(null);
  // Search expanded state (Notion-style)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  // Calendar control state
  const [dateAfterOpen, setDateAfterOpen] = useState(false);
  const [dateBeforeOpen, setDateBeforeOpen] = useState(false);
  // Search input ref for Cmd+K shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination - Fixed at 50 items per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // Fixed value, no dropdown

  // Save all filters to localStorage whenever they change
  useEffect(() => {
    const filtersToSave = {
      selectedAgents,
      statusFilter,
      dateAfter,
      dateBefore,
      onlyLiked,
      minDuration,
      maxDuration,
      durationPreset,
      aiScoreFilters,
      aiTagsFilter,
    };
    localStorage.setItem("conversationAnalytics_filters", JSON.stringify(filtersToSave));
  }, [
    selectedAgents,
    statusFilter,
    dateAfter,
    dateBefore,
    onlyLiked,
    minDuration,
    maxDuration,
    durationPreset,
    aiScoreFilters,
    aiTagsFilter,
  ]);

  // Keyboard shortcut: Cmd+K (Mac) or Ctrl+K (Windows) for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
      if (e.key === 'Escape' && isSearchExpanded && !searchTerm) {
        setIsSearchExpanded(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchExpanded, searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedAgents,
    statusFilter,
    debouncedSearchTerm,
    dateAfter,
    dateBefore,
    onlyLiked,
    durationPreset,
    minDuration,
    maxDuration,
    aiScoreFilters,
    aiTagsFilter,
  ]);

  // Fetch unique phone count for filtered conversations
  useEffect(() => {
    const fetchUniquePhoneCount = async () => {
      if (!user?.id) return;

      try {
        let query = supabase
          .from("call_history")
          .select("phone_number", { count: "exact", head: false })
          .eq("user_id", user.id);

        // Apply all filters
        if (selectedAgents.length > 0) {
          query = query.in("agent_id", selectedAgents);
        }
        if (debouncedSearchTerm) {
          query = query.or(
            `phone_number.ilike.%${debouncedSearchTerm}%,contact_name.ilike.%${debouncedSearchTerm}%,summary.ilike.%${debouncedSearchTerm}%`
          );
        }
        if (statusFilter && statusFilter !== "all") {
          query = query.eq("call_status", statusFilter);
        }
        if (dateAfter) {
          query = query.gte("call_date", dateAfter);
        }
        if (dateBefore) {
          query = query.lte("call_date", dateBefore);
        }

        // Duration filters
        const minDur =
          durationPreset === "< 30s"
            ? 0
            : durationPreset === "30s - 1m"
              ? 30
              : durationPreset === "> 1m"
                ? 60
                : minDuration
                  ? parseInt(minDuration)
                  : undefined;
        const maxDur =
          durationPreset === "< 30s"
            ? 30
            : durationPreset === "30s - 1m"
              ? 60
              : durationPreset === "> 1m"
                ? undefined
                : maxDuration
                  ? parseInt(maxDuration)
                  : undefined;

        if (minDur !== undefined) {
          query = query.gte("duration_seconds", minDur);
        }
        if (maxDur !== undefined) {
          query = query.lte("duration_seconds", maxDur);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Calculate unique phone numbers
        const uniquePhones = new Set(
          (data || [])
            .map((record) => record.phone_number?.trim())
            .filter(Boolean)
        );
        setUniquePhoneCount(uniquePhones.size);
      } catch (error) {
        console.error("Error fetching unique phone count:", error);
        setUniquePhoneCount(0);
      }
    };

    fetchUniquePhoneCount();
  }, [
    user?.id,
    selectedAgents,
    statusFilter,
    debouncedSearchTerm,
    dateAfter,
    dateBefore,
    durationPreset,
    minDuration,
    maxDuration,
  ]);

  // Sidebar
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Unique phone count for filtered conversations
  const [uniquePhoneCount, setUniquePhoneCount] = useState<number>(0);
  
  // Filtered audio count (conversations with conversation_id)
  const [filteredAudioCount, setFilteredAudioCount] = useState<number>(0);

  // Row selection state (Notion-style)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Fetch all user agents
  const { data: allAgents = [] } = useUserAgents();

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking on a filter button or inside a dropdown
      if (showFilters) {
        // If click is inside our filter dropdown element, keep it open
        if (target.closest('.filter-dropdown') || target.closest('button[data-filter-trigger]')) return;

        // Radix Popover renders content into a portal; clicks inside that portal won't be inside .filter-dropdown.
        // Detect clicks inside Radix portals by checking for a parent with attribute 'data-radix-portal' or
        // any popover/content element that uses data-state attributes. If so, do not close.
        if (target.closest('[data-radix-portal]') || target.closest('[data-state]')) return;

        // Otherwise it's an outside click -> close
        setShowFilters(null);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showFilters]);

  // Fetch conversations with server-side pagination and ALL filters
  const { callHistory, totalCount, isLoading, filteredCount } = useCallHistory(currentPage, itemsPerPage, {
    agentIds: selectedAgents.length > 0 ? selectedAgents : null,
    searchTerm: debouncedSearchTerm,
    status: statusFilter,
    dateAfter: dateAfter,
    dateBefore: dateBefore,
    minDuration:
      durationPreset === "< 30s"
        ? 0
        : durationPreset === "30s - 1m"
          ? 30
          : durationPreset === "> 1m"
            ? 60
            : minDuration
              ? parseInt(minDuration)
              : undefined,
    maxDuration:
      durationPreset === "< 30s"
        ? 30
        : durationPreset === "30s - 1m"
          ? 60
          : durationPreset === "> 1m"
            ? undefined
            : maxDuration
              ? parseInt(maxDuration)
              : undefined,
    aiScoreFilters: aiScoreFilters,
    aiTagsFilter: aiTagsFilter,
  });
  const {
    getConversationData,
    autoRefreshRecentConversations,
    refreshAllConversations,
    refreshConversation,
    cachedConversations,
    extractionProgress,
    setExtractionProgress,
    dismissExtractionProgress,
  } = useConversationAnalyticsCache();
  const { toast } = useToast();
  const { playFromConversation } = useGlobalAudioPlayer();
  const { analyzeConclusion, isProcessing: isConclusionProcessing } = useConclusionAnalyzer();

  // Duplicate detection + merge state for CSV export
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [duplicatePhones, setDuplicatePhones] = useState<
    Array<{
      phone: string;
      count: number;
    }>
  >([]);
  const [pendingExport, setPendingExport] = useState<{
    data: any[];
    filename: string;
  } | null>(null);
  const [dupSearch, setDupSearch] = useState("");
  const [minDupCount, setMinDupCount] = useState(2);

  // Column visibility settings
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("conversationAnalytics_visibleColumns");
    const defaultColumns = {
      contact_name: true,
      contact_phone: true,
      agent: true,
      status: true,
      cost: true,
      duration: true,
      datetime: true,
      messages_count: true,
      actions: true,
      comments: true,
      conclusion: false,
      // Hidden by default (replaced by ai_concluzie)
      ai_concluzie: true,
      ai_taguri: true,
      ai_scor: true,
    };
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old 'contact' to new split columns
      if ('contact' in parsed && !('contact_name' in parsed)) {
        parsed.contact_name = parsed.contact;
        parsed.contact_phone = parsed.contact;
        delete parsed.contact;
      }
      // Migrate: add new column if it doesn't exist
      if (!("conclusion" in parsed)) {
        parsed.conclusion = true;
      }
      if (!("contact_name" in parsed)) {
        parsed.contact_name = true;
      }
      if (!("contact_phone" in parsed)) {
        parsed.contact_phone = true;
      }
      if (!("messages_count" in parsed)) {
        parsed.messages_count = true;
      }
      // Migrate AI columns if they don't exist
      if (!("ai_concluzie" in parsed)) {
        parsed.ai_concluzie = true;
      }
      if (!("ai_taguri" in parsed)) {
        parsed.ai_taguri = true;
      }
      if (!("ai_scor" in parsed)) {
        parsed.ai_scor = true;
      }
      return parsed;
    }
    return defaultColumns;
  });

  // Custom columns state
  const [customColumns, setCustomColumns] = useState<
    Array<{
      id: string;
      name: string;
      type: "text" | "number" | "select";
      options?: string[];
    }>
  >(() => {
    const saved = localStorage.getItem("conversationAnalytics_customColumns");
    return saved ? JSON.parse(saved) : [];
  });
  const [customColumnValues, setCustomColumnValues] = useState<Record<string, Record<string, any>>>(() => {
    const saved = localStorage.getItem("conversationAnalytics_customColumnValues");
    return saved ? JSON.parse(saved) : {};
  });
  const [showNewColumnDialog, setShowNewColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<"text" | "number" | "select">("text");
  const [newColumnOptions, setNewColumnOptions] = useState("");

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({
    current: 0,
    total: 0,
  });

  // Handle AI analysis
  const handleAnalyzeConversations = async () => {
    if (!user) return;
    const conversationsToAnalyze = filteredCalls; // Analyze all filtered conversations

    if (conversationsToAnalyze.length === 0) {
      toast({
        title: "Nu sunt conversații",
        description: "Nu există conversații pentru analiză.",
        variant: "destructive",
      });
      return;
    }
    const conversationIds = conversationsToAnalyze.map((c) => c.conversation_id).filter(Boolean);
    if (conversationIds.length === 0) {
      toast({
        title: "Nu sunt conversații valide",
        description: "Conversațiile nu au ID-uri valide.",
        variant: "destructive",
      });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisProgress({
      current: 0,
      total: conversationIds.length,
    });
    try {
      const { data, error } = await supabase.functions.invoke("analyze-conversations-custom", {
        body: {
          conversationIds,
          userId: user.id,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: "Analiză completă",
          description: `${data.successCount}/${data.totalProcessed} conversații analizate cu succes.`,
        });
        // Force page refresh to show new data
        window.location.reload();
      } else {
        throw new Error(data?.error || "Analiză eșuată");
      }
    } catch (error: any) {
      console.error("Error analyzing conversations:", error);
      toast({
        title: "Eroare la analiză",
        description: error.message || "A apărut o eroare la analiza conversațiilor.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress({
        current: 0,
        total: 0,
      });
    }
  };

  // Column order state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("conversationAnalytics_columnOrder");
    const defaultOrder = [
      "contact_name",
      "contact_phone",
      "agent",
      "status",
      "cost",
      "duration",
      "datetime",
      "messages_count",
      "comments",
      "conclusion",
      "ai_concluzie",
      "ai_taguri",
      "ai_scor",
      "actions",
    ];
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Migrate old 'contact' to new split columns
      const contactIndex = parsed.indexOf("contact");
      if (contactIndex !== -1) {
        parsed.splice(contactIndex, 1, "contact_name", "contact_phone");
      }
      
      // Migrate: add new column if it doesn't exist
      if (!parsed.includes("conclusion")) {
        const commentsIndex = parsed.indexOf("comments");
        if (commentsIndex !== -1) {
          parsed.splice(commentsIndex + 1, 0, "conclusion");
        } else {
          parsed.push("conclusion");
        }
      }
      
      // Ensure new columns exist
      if (!parsed.includes("contact_name")) {
        parsed.unshift("contact_name");
      }
      if (!parsed.includes("contact_phone")) {
        const nameIndex = parsed.indexOf("contact_name");
        if (nameIndex !== -1) {
          parsed.splice(nameIndex + 1, 0, "contact_phone");
        } else {
          parsed.push("contact_phone");
        }
      }
      
      // Add messages_count column after datetime if it doesn't exist
      if (!parsed.includes("messages_count")) {
        const datetimeIndex = parsed.indexOf("datetime");
        if (datetimeIndex !== -1) {
          parsed.splice(datetimeIndex + 1, 0, "messages_count");
        } else {
          parsed.push("messages_count");
        }
      }

      // Add AI columns if they don't exist (ai_concluzie, ai_taguri, ai_scor)
      if (!parsed.includes("ai_concluzie")) {
        const conclusionIndex = parsed.indexOf("conclusion");
        if (conclusionIndex !== -1) {
          parsed.splice(conclusionIndex + 1, 0, "ai_concluzie");
        } else {
          // Insert before actions if actions exists
          const actionsIndex = parsed.indexOf("actions");
          if (actionsIndex !== -1) {
            parsed.splice(actionsIndex, 0, "ai_concluzie");
          } else {
            parsed.push("ai_concluzie");
          }
        }
      }

      if (!parsed.includes("ai_taguri")) {
        const aiConcluzieIndex = parsed.indexOf("ai_concluzie");
        if (aiConcluzieIndex !== -1) {
          parsed.splice(aiConcluzieIndex + 1, 0, "ai_taguri");
        } else {
          const actionsIndex = parsed.indexOf("actions");
          if (actionsIndex !== -1) {
            parsed.splice(actionsIndex, 0, "ai_taguri");
          } else {
            parsed.push("ai_taguri");
          }
        }
      }

      if (!parsed.includes("ai_scor")) {
        const aiTaguriIndex = parsed.indexOf("ai_taguri");
        if (aiTaguriIndex !== -1) {
          parsed.splice(aiTaguriIndex + 1, 0, "ai_scor");
        } else {
          const actionsIndex = parsed.indexOf("actions");
          if (actionsIndex !== -1) {
            parsed.splice(actionsIndex, 0, "ai_scor");
          } else {
            parsed.push("ai_scor");
          }
        }
      }

      return parsed;
    }
    return defaultOrder;
  });

  // Column widths state (in pixels for stable resizing - Notion-style)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("conversationAnalytics_columnWidths");

    // Notion-style defaults: toate în pixeli, nu procente
    const defaultWidths = {
      contact_name: 180, // Nume contact
      contact_phone: 140, // Număr telefon
      agent: 150, // Agent name
      status: 120, // Status badge
      cost: 100, // Cost USD
      duration: 100, // Durată
      datetime: 180, // Data și ora
      messages_count: 120, // Număr mesaje
      comments: 250, // Input pentru comentarii
      conclusion: 250, // ⚠️ IMPORTANT: Schimbat din 15% la 250px
      ai_concluzie: 300, // AI Concluzie (mai lată pentru text)
      ai_taguri: 200, // Tags
      ai_scor: 80, // Scor numeric
      actions: 150, // Butoane acțiuni
    };

    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Migrate old 'contact' to new split columns
      if ('contact' in parsed && !('contact_name' in parsed)) {
        const contactWidth = parsed.contact || 200;
        parsed.contact_name = Math.floor(contactWidth * 0.55); // 55% pentru nume
        parsed.contact_phone = Math.floor(contactWidth * 0.45); // 45% pentru telefon
        delete parsed.contact;
      }
      
      // Migrare: convertește % în px pentru coloanele vechi
      Object.keys(parsed).forEach((key) => {
        if (typeof parsed[key] === "string" || parsed[key] < 50) {
          // E % sau valoare suspectă, resetează la default
          parsed[key] = defaultWidths[key as keyof typeof defaultWidths] || 150;
        }
      });
      return { ...defaultWidths, ...parsed };
    }

    return defaultWidths;
  });

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem("conversationAnalytics_columnWidths", JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem("conversationAnalytics_visibleColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save custom columns to localStorage
  useEffect(() => {
    localStorage.setItem("conversationAnalytics_customColumns", JSON.stringify(customColumns));
  }, [customColumns]);

  // Save custom column values to localStorage
  useEffect(() => {
    localStorage.setItem("conversationAnalytics_customColumnValues", JSON.stringify(customColumnValues));
  }, [customColumnValues]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem("conversationAnalytics_columnOrder", JSON.stringify(columnOrder));
  }, [columnOrder]);

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem("conversationAnalytics_columnWidths", JSON.stringify(columnWidths));
  }, [columnWidths]);
  const toggleColumn = (column: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // Add new custom column with Notion-style default widths
  const handleAddCustomColumn = () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Eroare",
        description: "Numele coloanei este obligatoriu",
        variant: "destructive",
      });
      return;
    }
    const columnId = `custom_${Date.now()}`;
    const newColumn = {
      id: columnId,
      name: newColumnName.trim(),
      type: newColumnType,
      options:
        newColumnType === "select"
          ? newColumnOptions
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
    };
    setCustomColumns((prev) => [...prev, newColumn]);
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: true,
    }));
    setColumnOrder((prev) => [...prev, columnId]);

    // ⚠️ IMPORTANT: Set default width în pixeli, nu procente
    const defaultWidthByType: Record<string, number> = {
      text: 200,
      number: 120,
      select: 180,
    };

    setColumnWidths((prev) => ({
      ...prev,
      [columnId]: defaultWidthByType[newColumnType] || 150,
    }));

    setShowNewColumnDialog(false);
    setNewColumnName("");
    setNewColumnType("text");
    setNewColumnOptions("");
    toast({
      title: "Succes",
      description: "Coloană nouă adăugată",
    });
  };

  // Delete custom column
  const handleDeleteCustomColumn = (columnId: string) => {
    setCustomColumns((prev) => prev.filter((col) => col.id !== columnId));
    setVisibleColumns((prev) => {
      const newVis = {
        ...prev,
      };
      delete newVis[columnId];
      return newVis;
    });
    setColumnOrder((prev) => prev.filter((id) => id !== columnId));
    setColumnWidths((prev) => {
      const newWidths = {
        ...prev,
      };
      delete newWidths[columnId];
      return newWidths;
    });
    setCustomColumnValues((prev) => {
      const newVals = {
        ...prev,
      };
      delete newVals[columnId];
      return newVals;
    });
  };

  // Update custom column value
  const handleUpdateCustomColumnValue = (conversationId: string, columnId: string, value: any) => {
    setCustomColumnValues((prev) => ({
      ...prev,
      [conversationId]: {
        ...(prev[conversationId] || {}),
        [columnId]: value,
      },
    }));
  };

  // Handle column resize - Notion-style (no max limits, just min)
  const handleColumnResize = useCallback((columnId: string, newWidth: number) => {
    // Doar minim, fără maxim - exact ca în Notion
    const MIN_WIDTH = 40;
    const constrainedWidth = Math.max(MIN_WIDTH, newWidth);

    setColumnWidths((prev) => ({
      ...prev,
      [columnId]: constrainedWidth,
    }));
  }, []);

  // DnD sensors for column reordering (Notion-style)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle column drag end
  const handleColumnDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Pretty confirm dialog (replaces window.confirm)
  type ConfirmOptions = {
    title: string;
    description?: string;
    details?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions>({
    title: "",
  });
  const confirmResolverRef = useRef<(v: boolean) => void>();
  const askConfirm = useCallback((opts: ConfirmOptions) => {
    setConfirmOpts({
      cancelText: "Anulează",
      confirmText: "OK",
      ...opts,
    });
    setConfirmOpen(true);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);
  const closeConfirm = (result: boolean) => {
    setConfirmOpen(false);
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = undefined;
    if (resolver) resolver(result);
  };

  // Find duplicates by phone_number in a dataset
  const findDuplicatePhones = useCallback((rows: any[]) => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const phone = (r.phone_number || "").trim();
      if (!phone) continue;
      counts.set(phone, (counts.get(phone) || 0) + 1);
    }
    const dups: Array<{
      phone: string;
      count: number;
    }> = [];
    counts.forEach((cnt, phone) => {
      if (cnt > 1)
        dups.push({
          phone,
          count: cnt,
        });
    });
    // sort by highest count first
    dups.sort((a, b) => b.count - a.count);
    return dups;
  }, []);

  // Merge strategy: one row per phone_number, aggregate fields sensibly
  const mergeRowsByPhone = useCallback((rows: any[]) => {
    const groups = new Map<string, any[]>();
    for (const r of rows) {
      const phone = (r.phone_number || "").trim();
      if (!phone) continue;
      if (!groups.has(phone)) groups.set(phone, []);
      groups.get(phone)!.push(r);
    }
    const merged: any[] = [];
    groups.forEach((items, phone) => {
      if (items.length === 1) {
        merged.push(items[0]);
        return;
      }
      // pick most recent by call_date
      const sortedByDate = items
        .slice()
        .sort((a, b) => new Date(b.call_date || 0).getTime() - new Date(a.call_date || 0).getTime());
      const latest = sortedByDate[0];
      const unique = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));
      const join = (arr: any[], sep = " | ") => unique(arr).join(sep);
      const sum = (arr: any[]) => arr.reduce((acc, x) => acc + (Number(x) || 0), 0);
      const allConvIds = unique(items.map((i) => i.conversation_id));
      const allAgents = unique(items.map((i) => i.agent_name || i.agent_id));
      const allSummaries = unique(items.map((i) => i.summary));

      // Build combined transcript for export
      const combinedTranscript = items
        .map((i, idx) => {
          const date = i.call_date ? new Date(i.call_date).toLocaleString("ro-RO") : "";
          let t = "";
          try {
            if (i.dialog_json) {
              const d = JSON.parse(i.dialog_json);
              const normalize = (s: string) =>
                (s || "")
                  .toString()
                  .replace(/\r?\n|\r/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
              // try explicit transcript fields
              t = normalize(d?.clean_conversations?.transcript || d?.transcript || d?.dialog || d?.text || "");
              // if structured turns available, build a line
              const turns = d?.clean_conversations?.turns || d?.turns || d?.messages || d?.dialog;
              if (!t && Array.isArray(turns)) {
                t = normalize(
                  turns
                    .map((x: any) => `${x.speaker || x.role || "Speaker"}: ${x.text || x.content || ""}`)
                    .join(" | "),
                );
              }
            }
          } catch (_) {}
          return `[#${idx + 1} ${date}] ${t}`.trim();
        })
        .filter(Boolean)
        .join(" || ");
      const mergedRow = {
        // IDs concatenated (note: exportToCSV quotes fields)
        conversation_id: join(allConvIds),
        phone_number: phone,
        contact_name: latest.contact_name || items.find((i) => i.contact_name)?.contact_name || phone,
        agent_name: join(allAgents),
        call_status: latest.call_status || "unknown",
        // latest call date
        call_date: latest.call_date,
        call_date_display: latest.call_date_display,
        duration_seconds: sum(items.map((i) => i.duration_seconds)),
        cost_usd: sum(items.map((i) => i.cost_usd)),
        // keep one agent_id if consistent, else blank
        agent_id: unique(items.map((i) => i.agent_id)).length === 1 ? latest.agent_id : "",
        language: latest.language,
        elevenlabs_history_id: join(items.map((i) => i.elevenlabs_history_id)),
        summary: join(allSummaries),
        // embed combined transcript so exportToCSV can extract it
        dialog_json: JSON.stringify({
          transcript: combinedTranscript,
        }),
      } as any;
      merged.push(mergedRow);
    });
    // include rows without phone as-is
    const withoutPhone = rows.filter((r) => !(r.phone_number || "").trim());
    return [...merged, ...withoutPhone];
  }, []);
  const preExportWithDuplicatesCheck = useCallback(
    (rows: any[], filename: string) => {
      const dups = findDuplicatePhones(rows);
      if (dups.length === 0) {
        exportToCSV(rows, filename);
        return;
      }
      setDuplicatePhones(dups);
      setPendingExport({
        data: rows,
        filename,
      });
      setMergeDialogOpen(true);
    },
    [findDuplicatePhones],
  );

  // Debounce search term - 500ms delay for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedAgents,
    statusFilter,
    dateAfter,
    dateBefore,
    onlyLiked,
    minDuration,
    maxDuration,
    durationPreset,
  ]);

  // Local likes (per conversation) persisted in localStorage
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("conversationLikes");
      if (raw) setLikes(JSON.parse(raw));
    } catch (_) {}
  }, []);
  const persistLikes = (next: Record<string, boolean>) => {
    try {
      localStorage.setItem("conversationLikes", JSON.stringify(next));
    } catch (_) {}
  };
  const toggleLike = (e: React.MouseEvent, conversationId?: string | null) => {
    e.stopPropagation();
    if (!conversationId) return;
    setLikes((prev) => {
      const next = {
        ...prev,
        [conversationId]: !prev[conversationId],
      };
      persistLikes(next);
      return next;
    });
  };

  // Note: With fixed itemsPerPage at 50, onlyLiked filter works client-side on current page
  // For full liked filter functionality across all data, a server-side approach would be needed

  // Comments persisted in localStorage (keyed by conversation_id when available, else call id)
  const [comments, setComments] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("conversationComments");
      if (raw) setComments(JSON.parse(raw));
    } catch (_) {}
  }, []);
  const persistComments = (next: Record<string, string>) => {
    try {
      localStorage.setItem("conversationComments", JSON.stringify(next));
    } catch (_) {}
  };
  const getCommentKey = (call: any) => call.conversation_id || `call_${call.id}`;
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>, call: any) => {
    e.stopPropagation();
    const key = getCommentKey(call);
    const value = e.target.value;
    setComments((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };
      persistComments(next);
      return next;
    });
  };

  // Auto-refresh recent conversations when call history changes
  useEffect(() => {
    if (callHistory.length > 0) {
      autoRefreshRecentConversations(callHistory);
    }
  }, [callHistory.length, autoRefreshRecentConversations]);

  // Drag-to-scroll implementation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Don't activate drag-to-scroll if clicking on thead (column headers)
      const target = e.target as HTMLElement;
      if (target.closest('thead')) {
        return;
      }
      
      isDraggingRef.current = true;
      el.style.cursor = "grabbing";
      startXRef.current = e.pageX - el.offsetLeft;
      scrollLeftRef.current = el.scrollLeft;
      el.style.userSelect = "none";
    };

    const handleMouseLeaveOrUp = () => {
      isDraggingRef.current = false;
      el.style.cursor = "grab";
      el.style.userSelect = "";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startXRef.current) * 1.5; // scroll speed multiplier
      el.scrollLeft = scrollLeftRef.current - walk;
    };

    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("mouseleave", handleMouseLeaveOrUp);
    el.addEventListener("mouseup", handleMouseLeaveOrUp);
    el.addEventListener("mousemove", handleMouseMove);

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("mouseleave", handleMouseLeaveOrUp);
      el.removeEventListener("mouseup", handleMouseLeaveOrUp);
      el.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Wheel-to-horizontal scroll mapping
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      if (!hasOverflow) return;

      // Only map vertical wheel to horizontal scroll when using Shift key
      // This allows normal vertical scrolling of the page
      if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Track horizontal scroll for sticky column shadow (Notion-style)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setIsHorizontallyScrolled(el.scrollLeft > 0);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsSidebarOpen(true);
  };
  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedConversationId(null);
  };
  const handleManualRefresh = async () => {
    try {
      const result = await refreshAllConversations.mutateAsync(callHistory);
      toast({
        title: "Actualizare completă",
        description: `${result.successCount}/${result.totalCount} conversații au fost actualizate cu succes`,
      });
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la actualizarea conversațiilor",
        variant: "destructive",
      });
    }
  };
  const handleRefreshSingle = async (conversationId: string) => {
    try {
      await refreshConversation.mutateAsync(conversationId);
      toast({
        title: "Conversație actualizată",
        description: "Datele conversației au fost actualizate cu succes",
      });
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza conversația",
        variant: "destructive",
      });
    }
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiat",
      description: "Conversation ID a fost copiat în clipboard",
    });
  };
  const handleRedial = async (agentId: string, phoneNumber: string, contactName: string) => {
    if (!agentId || !phoneNumber) {
      toast({
        title: "Eroare",
        description: "Nu pot să re-apelez - lipsesc informațiile agentului sau numărul de telefon",
        variant: "destructive",
      });
      return;
    }
    try {
      const contact = {
        id: `redial-${Date.now()}`,
        name: contactName || `Re-apel ${phoneNumber}`,
        phone: phoneNumber,
        language: "ro",
        location: "Necunoscut",
      };
      await initiateCall(contact, agentId);
      toast({
        title: "Apel inițiat",
        description: `S-a inițiat re-apelul către ${contactName || phoneNumber}`,
      });
    } catch (error) {
      console.error("Eroare la re-apelare:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut iniția re-apelul. Încearcă din nou.",
        variant: "destructive",
      });
    }
  };

  // Redial filtered contacts - navigate to Outbound with preloaded contacts
  const handleRedialFiltered = async () => {
    if (filteredCalls.length === 0) {
      toast({
        title: "Nici o conversație selectată",
        description: "Nu există conversații care să corespundă filtrelor aplicate",
        variant: "destructive",
      });
      return;
    }

    // Extract unique phone numbers from filtered data
    const uniquePhones = new Set<string>();
    const contactsForRedial: Array<{
      id: string;
      name: string;
      phone: string;
      language: string;
      location: string;
    }> = [];
    filteredCalls.forEach((call, index) => {
      const phone = call.phone_number?.trim();
      if (phone && !uniquePhones.has(phone)) {
        uniquePhones.add(phone);
        contactsForRedial.push({
          id: `redial-${index}`,
          name: call.contact_name || `Contact ${phone}`,
          phone: phone,
          language: call.language || "ro",
          location: "Necunoscut",
        });
      }
    });
    if (contactsForRedial.length === 0) {
      toast({
        title: "Nici un număr valid",
        description: "Nu s-au găsit numere de telefon valide în conversațiile filtrate",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog with filter summary
    const filtersList = (
      <div className="text-sm space-y-2">
        <p className="font-medium">Se vor pregăti pentru re-apelare:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>{contactsForRedial.length}</strong> numere unice
          </li>
          <li>
            din <strong>{filteredCount || totalCount}</strong> conversații filtrate
          </li>
          {selectedAgents.length > 0 && (
            <li>
              Agents: <strong>{selectedAgents.length} selectați</strong>
            </li>
          )}
          {statusFilter !== "all" && (
            <li>
              Status: <strong>{statusFilter}</strong>
            </li>
          )}
          {(dateAfter || dateBefore) && (
            <li>
              Perioadă:{" "}
              <strong>
                {dateAfter || "început"} - {dateBefore || "acum"}
              </strong>
            </li>
          )}
        </ul>
        <p className="text-muted-foreground mt-3">
          Veți fi redirecționat către pagina Outbound pentru a selecta agentul și începe apelurile.
        </p>
      </div>
    );
    const confirmed = await askConfirm({
      title: "Confirmi re-apelarea contactelor?",
      description: `Se vor transfera ${contactsForRedial.length} numere unice către Outbound.`,
      details: filtersList,
      confirmText: "Da, continuă",
      cancelText: "Anulează",
    });
    if (!confirmed) return;

    // Navigate to Outbound page with state
    navigate("/account/outbound", {
      state: {
        preloadedContacts: contactsForRedial,
        source: "analytics",
        filterSummary: {
          totalConversations: filteredCount || totalCount,
          uniquePhones: contactsForRedial.length,
          agent: selectedAgents.length > 0 ? selectedAgents : null,
          status: statusFilter,
          dateRange: {
            from: dateAfter,
            to: dateBefore,
          },
        },
      },
    });
  };

  // ❌ REMOVED: Auto-refresh was causing massive performance issues
  // The massive refresh that ran once per session has been removed
  // Users can manually refresh if needed via the refresh button

  // Prefer transcript from cache, then from dialog_json; do not fall back to summary
  const normalizeOneLine = (s: string) =>
    s
      .replace(/\r?\n|\r/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const transcriptFromAny = (t: any): string => {
    if (!t) return "";
    if (typeof t === "string") return normalizeOneLine(t);
    const turns = Array.isArray(t) ? t : t.turns || t.messages || t.dialog || t.segments || t.items;
    if (Array.isArray(turns)) {
      const lines = turns
        .map((x: any) => {
          const speaker = x.speaker || x.role || x.from || x.name || "Speaker";
          const text = x.text || x.content || x.message || x.value || "";
          return normalizeOneLine(`${speaker}: ${String(text)}`);
        })
        .filter(Boolean);
      if (lines.length) return lines.join(" | ");
    }
    const s = t.transcript || t.dialog || t.text || t.content;
    if (typeof s === "string") return normalizeOneLine(s);
    return "";
  };
  const extractTranscript = (conversationId?: string, dialogJson?: string): string => {
    if (conversationId && cachedConversations?.length) {
      const cached = cachedConversations.find((c) => c.conversation_id === conversationId);
      const fromCache = transcriptFromAny(cached?.transcript);
      if (fromCache) return fromCache;
    }
    if (dialogJson) {
      try {
        const data = JSON.parse(dialogJson);
        const fromJson = transcriptFromAny(data?.clean_conversations?.transcript || data?.transcript || data);
        if (fromJson) return fromJson;
        const turns = data?.clean_conversations?.turns || data?.turns || data?.messages || data?.dialog;
        const fromTurns = transcriptFromAny(turns);
        if (fromTurns) return fromTurns;
      } catch (_) {}
    }
    return "";
  };

  // Extract message count from conversation data
  const extractMessageCount = (conversationId?: string, dialogJson?: string): number => {
    // Helper function to extract turns from transcript object
    const extractTurnsFromTranscript = (transcript: any): any[] | null => {
      if (!transcript) return null;

      // ElevenLabs transcript can be:
      // 1. Direct array of turns: [{ role: "agent", message: "..." }, ...]
      // 2. Object with turns property: { turns: [...] }
      // 3. Object with transcript property: { transcript: [...] }
      // 4. Object with messages property: { messages: [...] }

      if (Array.isArray(transcript)) {
        return transcript;
      }
      if (transcript?.turns && Array.isArray(transcript.turns)) {
        return transcript.turns;
      }
      if (transcript?.transcript && Array.isArray(transcript.transcript)) {
        return transcript.transcript;
      }
      if (transcript?.messages && Array.isArray(transcript.messages)) {
        return transcript.messages;
      }
      if (transcript?.dialog && Array.isArray(transcript.dialog)) {
        return transcript.dialog;
      }
      return null;
    };

    // Try from cached conversations first
    if (conversationId && cachedConversations?.length) {
      const cached = cachedConversations.find((c) => c.conversation_id === conversationId);
      if (cached?.transcript) {
        const turns = extractTurnsFromTranscript(cached.transcript);
        if (turns) {
          return turns.length;
        }
      }
    }

    // Try from dialog_json (call_history)
    if (dialogJson) {
      try {
        const data = JSON.parse(dialogJson);

        // Webhook saves dialog_json with structure:
        // { transcript: [...], conversation_details: { transcript: [...] }, ... }

        // 1. Check direct transcript (most common - from webhook)
        let turns = extractTurnsFromTranscript(data?.transcript);
        if (turns && turns.length > 0) return turns.length;

        // 2. Check conversation_details.transcript (from ElevenLabs API)
        turns = extractTurnsFromTranscript(data?.conversation_details?.transcript);
        if (turns && turns.length > 0) return turns.length;

        // 3. Check webhook_payload.transcript
        turns = extractTurnsFromTranscript(data?.webhook_payload?.transcript);
        if (turns && turns.length > 0) return turns.length;

        // 4. Check response object (for older format)
        if (data?.response) {
          turns = extractTurnsFromTranscript(data.response.transcript) ||
                  extractTurnsFromTranscript(data.response.messages) ||
                  extractTurnsFromTranscript(data.response.turns) ||
                  extractTurnsFromTranscript(data.response);
          if (turns && turns.length > 0) return turns.length;
        }

        // 5. Check other locations
        turns = extractTurnsFromTranscript(data?.clean_conversations?.turns) ||
                extractTurnsFromTranscript(data?.turns) ||
                extractTurnsFromTranscript(data?.messages) ||
                extractTurnsFromTranscript(data?.dialog);
        if (turns && turns.length > 0) return turns.length;
      } catch (e) {
        // Silent fail - return 0
      }
    }

    return 0;
  };

  // CSV Export functionality
  const exportToCSV = (data: any[], filename: string) => {
    const csvHeaders = [
      "ID Conversație",
      "Numărul de Telefon",
      "Nume Contact",
      "Agent",
      "Status Apel",
      "Data Apelului",
      "Durată (secunde)",
      "Cost (USD)",
      "Sumarul",
      "Conversația",
      "Limba",
      "ElevenLabs History ID",
      "Analiza Agent",
      "Concluzia",
      "Analizat la",
    ];
    const csvData = data.map((call) => {
      const duration = call.duration_seconds || 0;
      const cost = call.cost_usd || 0;
      const conversation = extractTranscript(call.conversation_id, call.dialog_json).replace(/\"/g, '""');
      return [
        call.conversation_id || "",
        call.phone_number || "",
        call.contact_name || "Necunoscut",
        call.agent_name || "",
        call.call_status || "unknown",
        call.call_date ? new Date(call.call_date).toLocaleString("ro-RO") : "",
        duration,
        cost.toFixed(4),
        (call.summary || "").replace(/"/g, '""'),
        conversation,
        call.language || "ro",
        call.elevenlabs_history_id || "",
        (call.analysis_agent_evaluation || "").replace(/"/g, '""'),
        (call.analysis_conclusion || "").replace(/"/g, '""'),
        call.analysis_processed_at ? new Date(call.analysis_processed_at).toLocaleString("ro-RO") : "",
      ];
    });
    const csvContent = [csvHeaders.join(","), ...csvData.map((row) => row.map((field) => `"${field}"`).join(","))].join(
      "\n",
    );
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export completat",
      description: `${data.length} conversații au fost exportate în ${filename}`,
    });
  };

  // ✅ Helper function pentru a aplica toate filtrele la orice query Supabase
  const buildFilteredQuery = useCallback((query: any) => {
    // Apply agent filter
    if (selectedAgents.length > 0) {
      query = query.in("agent_id", selectedAgents);
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("call_status", statusFilter);
    }

    // Apply search filter
    if (debouncedSearchTerm) {
      query = query.or(
        `phone_number.ilike.%${debouncedSearchTerm}%,contact_name.ilike.%${debouncedSearchTerm}%,summary.ilike.%${debouncedSearchTerm}%,conversation_id.ilike.%${debouncedSearchTerm}%`
      );
    }

    // Apply date filters
    if (dateAfter) {
      query = query.gte("call_date", dateAfter);
    }
    if (dateBefore) {
      // Add one day to include the entire end date
      const endDate = new Date(dateBefore);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt("call_date", endDate.toISOString().split("T")[0]);
    }

    // Apply duration filters
    const minDur =
      durationPreset === "< 30s"
        ? 0
        : durationPreset === "30s - 1m"
          ? 30
          : durationPreset === "> 1m"
            ? 60
            : minDuration
              ? parseInt(minDuration)
              : undefined;

    const maxDur =
      durationPreset === "< 30s"
        ? 30
        : durationPreset === "30s - 1m"
          ? 60
          : durationPreset === "> 1m"
            ? undefined
            : maxDuration
              ? parseInt(maxDuration)
              : undefined;

    if (minDur !== undefined) {
      query = query.gte("duration_seconds", minDur);
    }
    if (maxDur !== undefined) {
      query = query.lte("duration_seconds", maxDur);
    }

    return query;
  }, [
    selectedAgents,
    statusFilter,
    debouncedSearchTerm,
    dateAfter,
    dateBefore,
    durationPreset,
    minDuration,
    maxDuration,
  ]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      selectedAgents.length > 0 ||
      statusFilter !== "all" ||
      debouncedSearchTerm !== "" ||
      dateAfter !== "" ||
      dateBefore !== "" ||
      durationPreset !== "all" ||
      minDuration !== "" ||
      maxDuration !== "" ||
      aiScoreFilters.length > 0 ||
      aiTagsFilter.length > 0 ||
      onlyLiked
    );
  }, [
    selectedAgents,
    statusFilter,
    debouncedSearchTerm,
    dateAfter,
    dateBefore,
    durationPreset,
    minDuration,
    maxDuration,
    aiScoreFilters,
    aiTagsFilter,
    onlyLiked,
  ]);

  const handleExportAll = async () => {
    // Folosește filteredCount dacă există filtre active, altfel totalCount
    const exportCount = hasActiveFilters ? filteredCalls.length : totalCount;
    
    if (exportCount === 0) {
      toast({
        title: "Nici o conversație",
        description: "Nu există conversații de exportat",
        variant: "destructive",
      });
      return;
    }
    
    const filterInfo = hasActiveFilters ? ` (cu filtre aplicate)` : "";
    const confirmed = await askConfirm({
      title: "Confirmi exportul?",
      description: `Se vor exporta ${hasActiveFilters ? 'toate conversațiile filtrate' : `${totalCount} conversații`}${filterInfo}. Această operație poate dura câteva secunde.`,
      confirmText: "Exportă",
    });
    if (!confirmed) return;
    try {
      toast({
        title: "Exportul a început",
        description: `Se exportă conversații${filterInfo}...`,
      });

      // Fetch all conversations in batches with filters applied
      const batchSize = 1000;
      let allConversations: any[] = [];

      // First, get all agents for mapping
      const { data: agents } = await supabase.from("kalina_agents").select("agent_id, name").eq("user_id", user?.id);
      const agentMap = new Map(agents?.map((agent) => [agent.agent_id, agent.name]) || []);
      
      // Get count with filters
      let countQuery = supabase
        .from("call_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);
      countQuery = buildFilteredQuery(countQuery);
      const { count: filteredTotalCount } = await countQuery;
      const actualTotal = filteredTotalCount || totalCount;
      const totalBatches = Math.ceil(actualTotal / batchSize);
      
      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * batchSize;
        const end = start + batchSize - 1;
        
        // ✅ Aplică filtrele la query
        let query = supabase
          .from("call_history")
          .select("*")
          .eq("user_id", user?.id)
          .order("call_date", { ascending: false })
          .range(start, end);
        
        query = buildFilteredQuery(query);
        
        const { data, error } = await query;
        if (error) throw error;
        const mappedData =
          data?.map((record: any) => ({
            id: record.id,
            phone_number: record.phone_number || "",
            caller_number: record.caller_number || "",
            contact_name: record.contact_name || record.phone_number || "Necunoscut",
            call_status: record.call_status || "unknown",
            summary: record.summary || "",
            dialog_json: record.dialog_json || "",
            call_date: record.call_date ? new Date(record.call_date).toISOString() : "",
            call_date_display: record.call_date ? new Date(record.call_date).toLocaleString("ro-RO") : "",
            cost_usd: record.cost_usd ? Number(record.cost_usd) : 0,
            agent_id: record.agent_id,
            agent_name: agentMap.get(record.agent_id) || record.agent_id || "Agent necunoscut",
            language: record.language,
            conversation_id: record.conversation_id,
            elevenlabs_history_id: record.elevenlabs_history_id,
            duration_seconds: record.duration_seconds,
            analysis_agent_evaluation: record.analysis_agent_evaluation,
            analysis_conclusion: record.analysis_conclusion,
            analysis_processed_at: record.analysis_processed_at,
          })) || [];
        allConversations = [...allConversations, ...mappedData];
      }
      
      // ✅ Nume fișier cu indicator pentru filtre
      const filterSuffix = hasActiveFilters ? '_filtrate' : '_toate';
      preExportWithDuplicatesCheck(allConversations, `conversatii${filterSuffix}_${new Date().toISOString().split("T")[0]}.csv`);
    } catch (error) {
      console.error("Error exporting all conversations:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut exporta toate conversațiile",
        variant: "destructive",
      });
    }
  };
  const handleExportFiltered = async () => {
    const actualFilteredCount = filteredCount || totalCount;
    
    if (actualFilteredCount === 0) {
      toast({
        title: "Nici o conversație de exportat",
        description: "Nu există conversații care să corespundă filtrelor aplicate",
        variant: "destructive",
      });
      return;
    }

    // Generate filename with filter information
    const filterParts = [];
    if (selectedAgents.length > 0) filterParts.push(`agents_${selectedAgents.length}`);
    if (statusFilter !== "all") filterParts.push(`status_${statusFilter}`);
    if (durationPreset !== "all") filterParts.push(`dur_${durationPreset}`);
    if (minDuration) filterParts.push(`min_${minDuration}s`);
    if (maxDuration) filterParts.push(`max_${maxDuration}s`);
    if (onlyLiked) filterParts.push("liked");
    const filterSuffix = filterParts.length > 0 ? `_${filterParts.join("_")}` : "";
    const filename = `conversatii_filtrate${filterSuffix}_${new Date().toISOString().split("T")[0]}.csv`;

    // Show confirmation with details
    const filtersList = (
      <div className="text-sm">
        <p className="mb-1 text-muted-foreground">Filtre active:</p>
        <ul className="list-disc pl-5 space-y-0.5">
          {getActiveFiltersSummary().length > 0 ? (
            getActiveFiltersSummary().map((f, i) => <li key={i}>{f}</li>)
          ) : (
            <li>Niciun filtru activ</li>
          )}
        </ul>
      </div>
    );
    const confirmed = await askConfirm({
      title: "Confirmi exportul filtrat?",
      description: `Se vor exporta ${actualFilteredCount} conversații conform filtrelor selectate.`,
      details: filtersList,
      confirmText: "Exportă",
    });
    
    if (!confirmed) return;
    
    try {
      toast({
        title: "Exportul a început",
        description: `Se exportă ${actualFilteredCount} conversații filtrate...`,
      });

      // Fetch ALL filtered conversations from server in batches
      const batchSize = 1000;
      const totalBatches = Math.ceil(actualFilteredCount / batchSize);
      let allConversations: any[] = [];

      const { data: agents } = await supabase.from("kalina_agents").select("agent_id, name").eq("user_id", user?.id);
      const agentMap = new Map(agents?.map((agent) => [agent.agent_id, agent.name]) || []);

      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * batchSize;
        const end = start + batchSize - 1;

        // ✅ Aplică TOATE filtrele la fiecare batch
        let query = supabase
          .from("call_history")
          .select("*")
          .eq("user_id", user?.id)
          .order("call_date", { ascending: false })
          .range(start, end);

        query = buildFilteredQuery(query);

        const { data, error } = await query;
        if (error) throw error;

        const mappedData = data?.map((record: any) => ({
          id: record.id,
          phone_number: record.phone_number || "",
          caller_number: record.caller_number || "",
          contact_name: record.contact_name || record.phone_number || "Necunoscut",
          call_status: record.call_status || "unknown",
          summary: record.summary || "",
          dialog_json: record.dialog_json || "",
          call_date: record.call_date ? new Date(record.call_date).toISOString() : "",
          call_date_display: record.call_date ? new Date(record.call_date).toLocaleString("ro-RO") : "",
          cost_usd: record.cost_usd ? Number(record.cost_usd) : 0,
          agent_id: record.agent_id,
          agent_name: agentMap.get(record.agent_id) || record.agent_id || "Agent necunoscut",
          language: record.language,
          conversation_id: record.conversation_id,
          elevenlabs_history_id: record.elevenlabs_history_id,
          duration_seconds: record.duration_seconds,
          analysis_agent_evaluation: record.analysis_agent_evaluation,
          analysis_conclusion: record.analysis_conclusion,
          analysis_processed_at: record.analysis_processed_at,
        })) || [];

        allConversations = [...allConversations, ...mappedData];
      }

      preExportWithDuplicatesCheck(allConversations, filename);
    } catch (error) {
      console.error("Error exporting filtered conversations:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut exporta conversațiile filtrate",
        variant: "destructive",
      });
    }
  };
  const handleExportLast200 = async () => {
    try {
      // Fetch last 200 directly from database with filters applied
      const { data: agents } = await supabase.from("kalina_agents").select("agent_id, name").eq("user_id", user?.id);
      const agentMap = new Map(agents?.map((agent) => [agent.agent_id, agent.name]) || []);
      
      // ✅ Aplică filtrele și apoi limit 200
      let query = supabase
        .from("call_history")
        .select("*")
        .eq("user_id", user?.id)
        .order("call_date", { ascending: false })
        .limit(200);
      
      query = buildFilteredQuery(query);
      
      const { data, error } = await query;
      if (error) throw error;
      const mappedData =
        data?.map((record: any) => ({
          id: record.id,
          phone_number: record.phone_number || "",
          caller_number: record.caller_number || "",
          contact_name: record.contact_name || record.phone_number || "Necunoscut",
          call_status: record.call_status || "unknown",
          summary: record.summary || "",
          dialog_json: record.dialog_json || "",
          call_date: record.call_date ? new Date(record.call_date).toISOString() : "",
          call_date_display: record.call_date ? new Date(record.call_date).toLocaleString("ro-RO") : "",
          cost_usd: record.cost_usd ? Number(record.cost_usd) : 0,
          agent_id: record.agent_id,
          agent_name: agentMap.get(record.agent_id) || record.agent_id || "Agent necunoscut",
          language: record.language,
          conversation_id: record.conversation_id,
          elevenlabs_history_id: record.elevenlabs_history_id,
          duration_seconds: record.duration_seconds,
          analysis_agent_evaluation: record.analysis_agent_evaluation,
          analysis_conclusion: record.analysis_conclusion,
          analysis_processed_at: record.analysis_processed_at,
        })) || [];
      
      // ✅ Nume fișier cu indicator pentru filtre
      const filterSuffix = hasActiveFilters ? '_filtrate' : '';
      exportToCSV(mappedData, `conversatii_ultimele_200${filterSuffix}_${new Date().toISOString().split("T")[0]}.csv`);
    } catch (error) {
      console.error("Error exporting last 200:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut exporta ultimele 200 conversații",
        variant: "destructive",
      });
    }
  };
  const handleExportCurrentPage = () => {
    if (paginatedCalls.length === 0) {
      toast({
        title: "Nici o conversație pe pagina curentă",
        description: "Nu există conversații de exportat pe această pagină",
        variant: "destructive",
      });
      return;
    }
    askConfirm({
      title: "Confirmi exportul paginii curente?",
      description: `Se vor exporta ${paginatedCalls.length} conversații de pe pagina ${currentPage}.`,
      confirmText: "Exportă",
    }).then((ok) => {
      if (ok)
        preExportWithDuplicatesCheck(
          paginatedCalls,
          `conversatii_pagina_${currentPage}_${new Date().toISOString().split("T")[0]}.csv`,
        );
    });
  };
  const handlePlayInBottomBar = async (
    conversationId: string,
    contactName?: string,
    callDate?: string,
    durationSeconds?: number,
    phoneNumber?: string,
  ) => {
    if (!conversationId) {
      toast({
        title: "Eroare",
        description: "ID conversație lipsă",
        variant: "destructive",
      });
      return;
    }
    console.log("🎵 Playing audio in bottom bar for conversation:", conversationId);
    await playFromConversation(conversationId, {
      contactName,
      callDate,
      duration: durationSeconds,
      phoneNumber,
    });
  };
  const handleDownloadAudio = async (conversationId: string, phoneNumber: string) => {
    if (!conversationId) {
      toast({
        title: "Eroare",
        description: "ID conversație lipsă",
        variant: "destructive",
      });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("get-conversation-audio", {
        body: {
          conversationId,
        },
      });
      if (error) throw error;
      if (data?.audioUrl) {
        // Download the audio file
        const link = document.createElement("a");
        link.href = data.audioUrl;
        link.download = `${phoneNumber || "necunoscut"}.mp3`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast({
          title: "Audio indisponibil",
          description: "Nu s-a găsit audio pentru această conversație",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error downloading audio:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut descarca audio-ul conversației",
        variant: "destructive",
      });
    }
  };
  const handleBulkAudioDownload = async (conversations: any[]) => {
    if (conversations.length === 0) {
      toast({
        title: "Nici o conversație",
        description: "Nu există conversații pentru descărcarea audio",
        variant: "destructive",
      });
      return;
    }

    // 1) Keep only conversations with a valid conversation_id and deduplicate them
    const conversationsWithId = Array.from(
      new Map(conversations.filter((c) => c.conversation_id).map((c: any) => [c.conversation_id, c])).values(),
    );
    if (conversationsWithId.length === 0) {
      toast({
        title: "Audio indisponibil",
        description: "Nici o conversație nu are ID pentru descărcarea audio",
        variant: "destructive",
      });
      return;
    }
    if (conversationsWithId.length === 1) {
      // Single file download (fast path)
      const conversation = conversationsWithId[0];
      try {
        const response = await supabase.functions.invoke("get-conversation-audio", {
          body: {
            conversationId: conversation.conversation_id,
          },
        });
        if (response.error) throw response.error;
        if (response.data?.audioUrl) {
          const link = document.createElement("a");
          link.href = response.data.audioUrl;
          const contactName = conversation.contact_name || "Necunoscut";
          const phoneNumber = conversation.phone_number || "necunoscut";
          link.download = `${contactName}_${phoneNumber}.mp3`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        return;
      } catch (err) {
        console.error("Error on single audio download:", err);
      }
    }

    // Multiple files: faster, concurrency-limited with cache-skipping and chunked ZIPs
    const confirmed = await askConfirm({
      title: "Confirmi descărcarea audio?",
      description: `Se vor descărca audio pentru ${conversationsWithId.length} conversații (în ZIP-uri). Operația rulează în paralel pentru viteză.`,
      confirmText: "Descarcă",
    });
    if (!confirmed) return;
    const CONCURRENCY = 20; // run ~20 in parallel as requested
    const ZIP_CHUNK = 300; // balanced zip size

    // Progress init
    setExtractionProgress(
      conversationsWithId.map((c: any) => ({
        id: c.conversation_id,
        contactName: c.contact_name || c.phone_number || "Necunoscut",
        status: "pending",
      })),
    );

    // Start immediately; rely on server function cache checks
    const cachedMap = new Map<string, string>();

    // Helper to run a pool of promises with limited concurrency
    const runPool = async <T,>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<void>) => {
      const executing = new Set<Promise<void>>();
      for (let i = 0; i < items.length; i++) {
        const p = Promise.resolve().then(() => worker(items[i], i));
        executing.add(p);
        const clean = () => executing.delete(p);
        p.then(clean).catch(clean);
        if (executing.size >= limit) {
          await Promise.race(executing).catch(() => {});
        }
      }
      await Promise.allSettled(Array.from(executing));
    };

    // Collect downloaded files first, then zip in chunks
    const downloaded: {
      fileName: string;
      blob: Blob;
      convId: string;
    }[] = [];
    await runPool(conversationsWithId, CONCURRENCY, async (conversation) => {
      const convId = conversation.conversation_id as string;
      // Mark processing
      setExtractionProgress((prev) =>
        prev.map((p) =>
          p.id === convId
            ? {
                ...p,
                status: "processing",
              }
            : p,
        ),
      );
      try {
        const response = await supabase.functions.invoke("get-conversation-audio", {
          body: {
            conversationId: convId,
          },
        });
        if (response.error) throw response.error;
        const audioUrl = response.data?.audioUrl || null;
        if (!audioUrl) throw new Error("audio_url_missing");
        const audioResponse = await fetch(audioUrl!);
        const audioBlob = await audioResponse.blob();
        const contactName = conversation.contact_name || "Necunoscut";
        const phoneNumber = conversation.phone_number || convId;
        const safe = (s: string) => s.replace(/[^a-zA-Z0-9_\-\. ]/g, "_");
        const fileName = `${safe(contactName)}_${safe(phoneNumber)}.mp3`;
        downloaded.push({
          fileName,
          blob: audioBlob,
          convId: convId,
        });
        setExtractionProgress((prev) =>
          prev.map((p) =>
            p.id === convId
              ? {
                  ...p,
                  status: "completed",
                  progress: 100,
                }
              : p,
          ),
        );
      } catch (err) {
        console.error("Error fetching audio for", convId, err);
        setExtractionProgress((prev) =>
          prev.map((p) =>
            p.id === convId
              ? {
                  ...p,
                  status: "error",
                }
              : p,
          ),
        );
      }
    });
    if (downloaded.length === 0) return;

    // Build ZIPs in chunks for stability
    const JSZip = (await import("jszip")).default;
    let zipIndex = 1;
    for (let i = 0; i < downloaded.length; i += ZIP_CHUNK) {
      const zip = new JSZip();
      const slice = downloaded.slice(i, i + ZIP_CHUNK);
      slice.forEach(({ fileName, blob }) => zip.file(fileName, blob));
      const zipBlob = await zip.generateAsync({
        type: "blob",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `conversatii_audio_${new Date().toISOString().split("T")[0]}_${zipIndex}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      zipIndex++;
    }
  };
  const handleBulkAudioDownloadAll = async () => {
    // Folosește numărul filtrat dacă sunt filtre active
    const targetCount = hasActiveFilters ? filteredCalls.length : totalCount;
    
    if (targetCount === 0) {
      toast({
        title: "Nici o conversație",
        description: "Nu există conversații pentru descărcarea audio",
        variant: "destructive",
      });
      return;
    }
    
    const filterInfo = hasActiveFilters ? " (cu filtre aplicate)" : "";
    const confirmed = await askConfirm({
      title: "Confirmi descărcarea audio?",
      description: `Se vor descărca audio pentru ${hasActiveFilters ? 'conversațiile filtrate' : `TOATE ${totalCount} conversațiile`}${filterInfo}. Această operație poate dura mult timp.`,
      confirmText: "Descarcă",
    });
    if (!confirmed) return;
    try {
      toast({
        title: "Descărcarea a început",
        description: `Se procesează conversații${filterInfo}...`,
      });

      // Fetch conversations in batches with filters applied
      const batchSize = 1000;
      let allConversations: any[] = [];
      
      // Get count with filters
      let countQuery = supabase
        .from("call_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .not("conversation_id", "is", null);
      countQuery = buildFilteredQuery(countQuery);
      const { count: filteredTotalCount } = await countQuery;
      const actualTotal = filteredTotalCount || totalCount;
      const totalBatches = Math.ceil(actualTotal / batchSize);
      
      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * batchSize;
        const end = start + batchSize - 1;
        
        // ✅ Aplică filtrele
        let query = supabase
          .from("call_history")
          .select("id, conversation_id, contact_name, phone_number")
          .eq("user_id", user?.id)
          .not("conversation_id", "is", null)
          .order("call_date", { ascending: false })
          .range(start, end);
        
        query = buildFilteredQuery(query);
        
        const { data, error } = await query;
        if (error) throw error;
        allConversations = [...allConversations, ...(data || [])];
      }

      // Deduplicate by conversation_id
      const conversationsWithId = Array.from(
        new Map(allConversations.filter((c) => c.conversation_id).map((c: any) => [c.conversation_id, c])).values(),
      );
      if (conversationsWithId.length === 0) {
        toast({
          title: "Audio indisponibil",
          description: "Nici o conversație nu are ID pentru descărcarea audio",
          variant: "destructive",
        });
        return;
      }

      // Initialize progress tracking
      setExtractionProgress(
        conversationsWithId.map((c: any) => ({
          id: c.conversation_id,
          contactName: c.contact_name || c.phone_number || "Necunoscut",
          status: "pending" as const,
        })),
      );

      // Start immediately; rely on server function cache checks
      const cachedMap = new Map<string, string>();
      const CONCURRENCY = 20; // run ~20 concurrently
      const ZIP_CHUNK = 350; // balanced zip size

      // Helper: concurrency pool
      const runPool = async <T,>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<void>) => {
        const executing = new Set<Promise<void>>();
        for (let i = 0; i < items.length; i++) {
          const p = Promise.resolve().then(() => worker(items[i], i));
          executing.add(p);
          const clean = () => executing.delete(p);
          p.then(clean).catch(clean);
          if (executing.size >= limit) {
            await Promise.race(executing).catch(() => {});
          }
        }
        await Promise.allSettled(Array.from(executing));
      };
      const downloaded: {
        fileName: string;
        blob: Blob;
        convId: string;
      }[] = [];
      await runPool(conversationsWithId, CONCURRENCY, async (conversation) => {
        const convId = conversation.conversation_id as string;
        setExtractionProgress((prev) =>
          prev.map((p) =>
            p.id === convId
              ? {
                  ...p,
                  status: "processing",
                }
              : p,
          ),
        );
        try {
          const response = await supabase.functions.invoke("get-conversation-audio", {
            body: {
              conversationId: convId,
            },
          });
          if (response.error) throw response.error;
          const audioUrl = response.data?.audioUrl || null;
          if (!audioUrl) throw new Error("audio_url_missing");
          const audioResponse = await fetch(audioUrl!);
          const audioBlob = await audioResponse.blob();
          const contactName = conversation.contact_name || "Necunoscut";
          const phoneNumber = conversation.phone_number || convId;
          const safe = (s: string) => s.replace(/[^a-zA-Z0-9_\-\. ]/g, "_");
          const fileName = `${safe(contactName)}_${safe(phoneNumber)}.mp3`;
          downloaded.push({
            fileName,
            blob: audioBlob,
            convId: convId,
          });
          setExtractionProgress((prev) =>
            prev.map((p) =>
              p.id === convId
                ? {
                    ...p,
                    status: "completed",
                    progress: 100,
                  }
                : p,
            ),
          );
        } catch (err) {
          console.error("Error fetching audio for", convId, err);
          setExtractionProgress((prev) =>
            prev.map((p) =>
              p.id === convId
                ? {
                    ...p,
                    status: "error",
                  }
                : p,
            ),
          );
        }
      });
      if (downloaded.length === 0) {
        toast({
          title: "Eroare",
          description: "Nu s-a putut descărca nici un audio",
          variant: "destructive",
        });
        return;
      }
      const JSZip = (await import("jszip")).default;
      let zipIndex = 1;
      for (let i = 0; i < downloaded.length; i += ZIP_CHUNK) {
        const zip = new JSZip();
        const slice = downloaded.slice(i, i + ZIP_CHUNK);
        slice.forEach(({ fileName, blob }) => zip.file(fileName, blob));
        const zipBlob = await zip.generateAsync({
          type: "blob",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = `conversatii_audio_toate_${new Date().toISOString().split("T")[0]}_${zipIndex}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        zipIndex++;
      }
      toast({
        title: "Descărcare completă",
        description: `${downloaded.length}/${conversationsWithId.length} audio-uri au fost descărcate cu succes`,
      });
    } catch (error) {
      console.error("Error downloading all audio:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut descărca audio-urile",
        variant: "destructive",
      });
    }
  };

  // ✅ Funcție pentru a descărca audio pentru TOATE conversațiile filtrate (nu doar cele de pe pagină)
  const handleBulkAudioDownloadFiltered = async () => {
    const actualFilteredCount = filteredCount || totalCount;
    
    if (actualFilteredCount === 0) {
      toast({
        title: "Nici o conversație",
        description: "Nu există conversații filtrate pentru descărcarea audio",
        variant: "destructive",
      });
      return;
    }

    const confirmed = await askConfirm({
      title: "Confirmi descărcarea audio (filtrate)?",
      description: `Se vor descărca audio pentru ${actualFilteredCount} conversații filtrate. Această operație poate dura mult timp.`,
      confirmText: "Descarcă",
    });

    if (!confirmed) return;

    try {
      toast({
        title: "Descărcarea a început",
        description: `Se procesează ${actualFilteredCount} conversații filtrate...`,
      });

      // Fetch ALL filtered conversations from server in batches
      const batchSize = 1000;
      const totalBatches = Math.ceil(actualFilteredCount / batchSize);
      let allConversations: any[] = [];

      for (let batch = 0; batch < totalBatches; batch++) {
        const start = batch * batchSize;
        const end = start + batchSize - 1;

        // ✅ Aplică TOATE filtrele
        let query = supabase
          .from("call_history")
          .select("id, conversation_id, contact_name, phone_number")
          .eq("user_id", user?.id)
          .not("conversation_id", "is", null)
          .order("call_date", { ascending: false })
          .range(start, end);

        query = buildFilteredQuery(query);

        const { data, error } = await query;
        if (error) throw error;
        allConversations = [...allConversations, ...(data || [])];
      }

      // Acum apelează funcția existentă cu toate datele
      if (allConversations.length === 0) {
        toast({
          title: "Audio indisponibil",
          description: "Nici o conversație filtrată nu are audio disponibil",
          variant: "destructive",
        });
        return;
      }

      // Apelează funcția existentă de download
      await handleBulkAudioDownload(allConversations);
    } catch (error) {
      console.error("Error downloading filtered audio:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut descărca audio-urile filtrate",
        variant: "destructive",
      });
    }
  };

  const handleExportByPhones = async () => {
    const phoneNumbers = prompt("Introduceți numerele de telefon separate prin virgulă:");
    if (!phoneNumbers) return;
    const phoneList = phoneNumbers.split(",").map((p) => p.trim());
    try {
      // Fetch all conversations with matching phone numbers
      const { data: agents } = await supabase.from("kalina_agents").select("agent_id, name").eq("user_id", user?.id);
      const agentMap = new Map(agents?.map((agent) => [agent.agent_id, agent.name]) || []);

      // Build a query that checks for any of the phone numbers
      let query = supabase.from("call_history").select("*").eq("user_id", user?.id);

      // Add OR conditions for each phone number
      const orConditions = phoneList.map((phone) => `phone_number.ilike.%${phone}%`).join(",");
      query = query.or(orConditions);
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({
          title: "Nici o conversație găsită",
          description: "Nu s-au găsit conversații pentru numerele specificate",
          variant: "destructive",
        });
        return;
      }
      const mappedData =
        data?.map((record: any) => ({
          id: record.id,
          phone_number: record.phone_number || "",
          caller_number: record.caller_number || "",
          contact_name: record.contact_name || record.phone_number || "Necunoscut",
          call_status: record.call_status || "unknown",
          summary: record.summary || "",
          dialog_json: record.dialog_json || "",
          call_date: record.call_date ? new Date(record.call_date).toISOString() : "",
          call_date_display: record.call_date ? new Date(record.call_date).toLocaleString("ro-RO") : "",
          cost_usd: record.cost_usd ? Number(record.cost_usd) : 0,
          agent_id: record.agent_id,
          agent_name: agentMap.get(record.agent_id) || record.agent_id || "Agent necunoscut",
          language: record.language,
          conversation_id: record.conversation_id,
          elevenlabs_history_id: record.elevenlabs_history_id,
          duration_seconds: record.duration_seconds,
          analysis_agent_evaluation: record.analysis_agent_evaluation,
          analysis_conclusion: record.analysis_conclusion,
          analysis_processed_at: record.analysis_processed_at,
        })) || [];
      exportToCSV(mappedData, `conversatii_numere_specifice_${new Date().toISOString().split("T")[0]}.csv`);
    } catch (error) {
      console.error("Error exporting by phones:", error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut exporta conversațiile",
        variant: "destructive",
      });
    }
  };

  // --- Merge duplicates dialog UI ---
  const confirmMergeAndExport = useCallback(
    (merge: boolean) => {
      if (!pendingExport) {
        setMergeDialogOpen(false);
        return;
      }
      const { data, filename } = pendingExport;
      setMergeDialogOpen(false);
      setPendingExport(null);
      if (merge) {
        const merged = mergeRowsByPhone(data);
        exportToCSV(merged, filename.replace(/\.csv$/, "_combinat.csv"));
      } else {
        exportToCSV(data, filename);
      }
    },
    [pendingExport, mergeRowsByPhone],
  );

  // Render merge dialog
  // Note: placed near the bottom of component return tree below toolbar; keep minimal styling.

  // Helper function to extract AI score from analysis_conclusion
  const extractAiScore = (call: any): number | null => {
    if (!call.analysis_conclusion) return null;
    const match = call.analysis_conclusion.match(/Scor:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  };

  // Helper function to extract AI tags from analysis_conclusion
  const extractAiTags = (call: any): string[] => {
    if (!call.analysis_conclusion) return [];
    const match = call.analysis_conclusion.match(/Tag-uri:\s*([^\n]+)/i);
    if (!match) return [];
    return match[1].split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
  };

  // Filtered calls - now only client-side filter for "liked" (stored in localStorage)
  // All other filters are applied server-side in useCallHistory
  const filteredCalls = useMemo(() => {
    if (!onlyLiked) {
      return callHistory;
    }
    return callHistory.filter((call) => {
      const isLiked = !!(call.conversation_id && likes[call.conversation_id]);
      return isLiked;
    });
  }, [callHistory, onlyLiked, likes]);

  // AI Score statistics
  const aiScoreStats = useMemo(() => {
    const scores = callHistory.map(call => extractAiScore(call)).filter((s): s is number => s !== null);
    const excellent = scores.filter(s => s >= 80).length;
    const good = scores.filter(s => s >= 60 && s < 80).length;
    const medium = scores.filter(s => s >= 40 && s < 60).length;
    const poor = scores.filter(s => s < 40).length;
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { excellent, good, medium, poor, avg };
  }, [callHistory]);

  // Get all unique AI tags from current data
  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    callHistory.forEach(call => {
      const tags = extractAiTags(call);
      tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [callHistory]);

  // Update filteredAudioCount whenever filteredCalls changes
  useEffect(() => {
    const audioCount = filteredCalls.filter(call => call.conversation_id).length;
    setFilteredAudioCount(audioCount);
  }, [filteredCalls]);

  // Pagination calculations
  // onlyLiked is the only remaining client-side filter
  const hasClientSideFilters = onlyLiked;
  const noPagination = false; // Fixed at 50 items per page

  // If we have client-side filters, use filtered data length, otherwise use server count
  const totalPages = noPagination
    ? 1
    : hasClientSideFilters
      ? Math.ceil(filteredCalls.length / itemsPerPage)
      : Math.ceil((filteredCount || totalCount) / itemsPerPage);

  // For client-side filtering, we paginate the filtered results
  const paginatedCalls = hasClientSideFilters
    ? filteredCalls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredCalls; // Already paginated by server or fetched all when noPagination

  // Row selection functions (Notion-style)
  const toggleRowSelection = useCallback((rowId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedRows(prev => {
      if (prev.size === paginatedCalls.length && paginatedCalls.length > 0) {
        return new Set();
      }
      return new Set(paginatedCalls.map(call => call.id));
    });
  }, [paginatedCalls]);

  const isRowSelected = useCallback((rowId: string) => {
    return selectedRows.has(rowId);
  }, [selectedRows]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const allRowsSelected = paginatedCalls.length > 0 && selectedRows.size === paginatedCalls.length;

  // Calculate display indices for showing "X-Y of Z"
  const totalForRange = hasClientSideFilters ? filteredCalls.length : (filteredCount || totalCount);
  const startIndex = noPagination ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = noPagination
    ? totalForRange
    : Math.min(startIndex + (hasClientSideFilters ? paginatedCalls.length : itemsPerPage), totalForRange);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setSelectedAgents([]);
    setDateAfter("");
    setDateBefore("");
    setDurationPreset("all");
    setMinDuration("");
    setMaxDuration("");
    setOnlyLiked(false);
    setAiScoreFilters([]);
    setAiTagsFilter([]);
    setCurrentPage(1);
    // Also clear from localStorage
    localStorage.removeItem("conversationAnalytics_filters");
  }, []);

  // Get active filters summary
  const getActiveFiltersSummary = () => {
    const filters = [];
    if (debouncedSearchTerm) filters.push(`Căutare: "${debouncedSearchTerm}"`);
    if (selectedAgents.length > 0) filters.push(`Agents: ${selectedAgents.length} selectați`);
    if (statusFilter !== "all") filters.push(`Status: ${statusFilter}`);
    if (dateAfter || dateBefore) {
      const dateRange = `${dateAfter || "început"} - ${dateBefore || "acum"}`;
      filters.push(`Perioadă: ${dateRange}`);
    }
    if (durationPreset !== "all") filters.push(`Durată: ${durationPreset}`);
    if (minDuration) filters.push(`Min: ${minDuration}s`);
    if (maxDuration) filters.push(`Max: ${maxDuration}s`);
    if (onlyLiked) filters.push("Doar apreciate");
    return filters;
  };
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "completed":
      case "done":
      case "initiated":
        return "text-[#548164] bg-[#EEF3ED] rounded-full px-3 py-1 font-medium text-xs";
      case "failed":
      case "error":
        return "text-[#C4554D] bg-[#FAECEC] rounded-full px-3 py-1 font-medium text-xs";
      case "busy":
        return "text-[#CC782F] bg-[#F8ECDF] rounded-full px-3 py-1 font-medium text-xs";
      case "no-answer":
      case "no_answer":
        return "text-[#787774] bg-[#F1F1EF] rounded-full px-3 py-1 font-medium text-xs";
      case "started":
        return "text-[#787774] bg-[#F1F1EF] rounded-full px-3 py-1 font-medium text-xs";
      default:
        return "text-[#787774] bg-[#F1F1EF] rounded-full px-3 py-1 font-medium text-xs";
    }
  };

  // Map status for display - show "initiated" as "Done"
  const getDisplayStatus = (status: string) => {
    return status.toLowerCase() === "initiated" ? "Done" : status;
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("ro-RO", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  const getUniqueAgents = () => {
    const agentNames = [...new Set(callHistory.map((call) => call.agent_name).filter(Boolean))];
    return agentNames;
  };
  const formatLastUpdated = (lastUpdated: string | null) => {
    if (!lastUpdated) return "Nu este actualizat";
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diffMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
    if (diffMinutes < 1) return "Acum";
    if (diffMinutes < 60) return `${diffMinutes}m în urmă`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h în urmă`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d în urmă`;
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto p-2 sm:p-6 space-y-3 sm:space-y-6 max-w-full bg-white">
        {/* Header */}
        <div className="flex flex-col gap-3">
          {/* Title and Right Controls */}
          <div className="flex items-start justify-between gap-3 pt-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#373530]">{t("analytics.title")}</h1>
              <p className="text-sm text-[#787774] mt-1">
                {t("analytics.showing")} {startIndex + 1}-
                {Math.min(endIndex, hasClientSideFilters ? filteredCalls.length : filteredCount || totalCount)}{" "}
                {t("analytics.of")} {totalCount} {t("analytics.conversations")}
                {hasActiveFilters && (filteredCount || totalCount) !== totalCount && (
                  <span className="text-[#487CA5] font-medium">
                    {" "}
                    ({filteredCount || filteredCalls.length} {t("analytics.filtered")})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Merge duplicates confirmation dialog */}
        <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Găsite numere duplicate
                <Badge variant="secondary" className="ml-2">
                  {duplicatePhones.length}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Am detectat numere care apar de mai multe ori în selecția pentru export. Poți alege să le combini
                într-un singur rând per număr de telefon.
              </DialogDescription>
            </DialogHeader>

            {/* Quick stats and controls */}
            <div className="mt-1 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {(() => {
                    const totalRows = pendingExport?.data?.length || 0;
                    const withPhone = pendingExport?.data?.filter((r) => (r.phone_number || "").trim()).length || 0;
                    const uniquePhones = new Set(
                      (pendingExport?.data || []).map((r) => (r.phone_number || "").trim()).filter(Boolean),
                    ).size;
                    const expectedAfter = uniquePhones + (totalRows - withPhone);
                    const reduced = totalRows - expectedAfter;
                    return (
                      <>
                        <span>
                          Total rânduri: <strong>{totalRows}</strong>
                        </span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>
                          După combinare: <strong>{expectedAfter}</strong>{" "}
                          {reduced > 0 && <span className="text-emerald-600">(-{reduced})</span>}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={dupSearch}
                      onChange={(e) => setDupSearch(e.target.value)}
                      placeholder="Caută număr…"
                      className="pl-9 h-9 w-[220px]"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Min. apariții</span>
                    <Input
                      type="number"
                      min={2}
                      value={minDupCount}
                      onChange={(e) => setMinDupCount(Math.max(2, Number(e.target.value || 2)))}
                      className="h-9 w-20"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Duplicates list */}
              {(() => {
                const filtered = duplicatePhones.filter(
                  (d) =>
                    d.count >= (minDupCount || 2) &&
                    (!dupSearch || d.phone.toLowerCase().includes(dupSearch.toLowerCase())),
                );
                const maxCount = filtered.reduce((m, d) => Math.max(m, d.count), 1);
                return (
                  <ScrollArea className="h-64 border rounded-md p-2">
                    <div className="space-y-2">
                      {filtered.map((d) => (
                        <div key={d.phone} className="rounded-md p-2 border bg-muted/30">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-mono text-foreground">{d.phone}</span>
                            <Badge variant="outline">x{d.count}</Badge>
                          </div>
                          <Progress value={(d.count / maxCount) * 100} className="h-1.5 mt-2" />
                        </div>
                      ))}
                      {filtered.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          Niciun rezultat pentru filtrele curente
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                );
              })()}
            </div>

            <DialogFooter className="gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => confirmMergeAndExport(false)}>
                Nu, exportă așa
              </Button>
              <Button onClick={() => confirmMergeAndExport(true)}>
                <GitMerge className="w-4 h-4 mr-2" />
                Da, combină și exportă
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Column Settings Dialog */}
        <Dialog open={showColumnSettings} onOpenChange={setShowColumnSettings}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] rounded-3xl p-0 gap-0 overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6">
              <DialogTitle className="text-2xl font-semibold text-[#1a1a1a] mb-1">
                Table Layout
              </DialogTitle>
              <DialogDescription className="text-sm text-[#666666]">
                Customize columns and their order
              </DialogDescription>
            </div>

            <ScrollArea className="max-h-[55vh] px-8">
              <div className="space-y-8 pb-6">
                {/* Required Fields Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider whitespace-nowrap">Required Fields</span>
                    <div className="flex-1 h-px bg-[#e5e5e5]" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Contact Name - Locked */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#999999]">Nume Contact</span>
                      </div>
                      <div className="w-11 h-6 bg-[#d1d1d1] rounded-full relative cursor-not-allowed">
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>

                    {/* Phone Number - Locked */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#999999]">Număr Telefon</span>
                      </div>
                      <div className="w-11 h-6 bg-[#d1d1d1] rounded-full relative cursor-not-allowed">
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>

                    {/* Agent - Locked */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#f8f8f8] border border-[#e5e5e5] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#999999]">Agent</span>
                      </div>
                      <div className="w-11 h-6 bg-[#d1d1d1] rounded-full relative cursor-not-allowed">
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider whitespace-nowrap">Performance Metrics</span>
                    <div className="flex-1 h-px bg-[#e5e5e5]" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Status */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">Status</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("status")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.status ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.status ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">Durată</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("duration")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.duration ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.duration ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Cost */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">Cost</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("cost")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.cost ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.cost ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">Dată & Oră</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("datetime")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.datetime ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.datetime ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Replici */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">Replici</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("messages_count")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.messages_count ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.messages_count ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Comments */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">Comentarii</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("comments")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.comments ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.comments ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Conclusion */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">Concluzie Auto</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("conclusion")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.conclusion ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.conclusion ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">Acțiuni</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("actions")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.actions ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.actions ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Analysis & Data Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider whitespace-nowrap">AI Analysis & Data</span>
                    <div className="flex-1 h-px bg-[#e5e5e5]" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* AI Concluzie */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">AI Concluzie</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("ai_concluzie")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.ai_concluzie ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.ai_concluzie ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* AI Tag-uri */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">AI Tag-uri</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("ai_taguri")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.ai_taguri ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.ai_taguri ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>

                    {/* AI Scor */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-[#999999]" />
                        <span className="text-sm font-medium text-[#1a1a1a]">AI Scor</span>
                      </div>
                      <button
                        onClick={() => toggleColumn("ai_scor")}
                        className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns.ai_scor ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns.ai_scor ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Columns Section */}
                {customColumns.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider whitespace-nowrap">Coloane Personalizate</span>
                      <div className="flex-1 h-px bg-[#e5e5e5]" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {customColumns.map((col) => (
                        <div key={col.id} className="flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5e5] rounded-xl hover:border-[#999999] transition-colors cursor-grab group">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-[#999999]" />
                            <span className="text-sm font-medium text-[#1a1a1a]">{col.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteCustomColumn(col.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <button
                              onClick={() => toggleColumn(col.id)}
                              className={`w-11 h-6 rounded-full relative transition-colors ${visibleColumns[col.id] ? 'bg-[#1a1a1a]' : 'bg-[#d1d1d1]'}`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${visibleColumns[col.id] ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between px-8 py-6 border-t border-[#e5e5e5] bg-white">
              <Button
                variant="ghost"
                onClick={() => {
                  const defaultColumns = {
                    contact_name: true,
                    contact_phone: true,
                    agent: true,
                    status: true,
                    cost: true,
                    duration: true,
                    datetime: true,
                    messages_count: true,
                    actions: true,
                    comments: true,
                    conclusion: false,
                    ai_concluzie: true,
                    ai_taguri: true,
                    ai_scor: true,
                  };
                  const defaultOrder = [
                    "contact_name",
                    "contact_phone",
                    "agent",
                    "status",
                    "cost",
                    "duration",
                    "datetime",
                    "messages_count",
                    "comments",
                    "conclusion",
                    "ai_concluzie",
                    "ai_taguri",
                    "ai_scor",
                    "actions",
                  ];
                  setVisibleColumns(defaultColumns);
                  setColumnOrder(defaultOrder);
                  localStorage.setItem("conversationAnalytics_visibleColumns", JSON.stringify(defaultColumns));
                  localStorage.setItem("conversationAnalytics_columnOrder", JSON.stringify(defaultOrder));
                  toast({
                    title: "Resetare completă",
                    description: "Toate coloanele au fost resetate la implicit"
                  });
                }}
                className="text-sm text-[#666666] hover:text-[#1a1a1a] hover:bg-transparent px-0"
              >
                Reset to Default
              </Button>
              <Button
                onClick={() => setShowColumnSettings(false)}
                className="bg-[#1a1a1a] hover:bg-[#333333] text-white px-8 py-2 rounded-lg text-sm font-medium"
              >
                Apply View
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Custom Column Dialog */}
        <Dialog open={showNewColumnDialog} onOpenChange={setShowNewColumnDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adaugă Coloană Nouă
              </DialogTitle>
              <DialogDescription>
                Creează o coloană personalizată pentru a stoca informații suplimentare
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="column-name">Nume Coloană</Label>
                <Input
                  id="column-name"
                  placeholder="ex: Prioritate, Categorie, etc."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="column-type">Tip Coloană</Label>
                <Select
                  value={newColumnType}
                  onValueChange={(value: "text" | "number" | "select") => setNewColumnType(value)}
                >
                  <SelectTrigger id="column-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Număr</SelectItem>
                    <SelectItem value="select">Select (opțiuni)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newColumnType === "select" && (
                <div className="space-y-2">
                  <Label htmlFor="column-options">Opțiuni (separate prin virgulă)</Label>
                  <Input
                    id="column-options"
                    placeholder="ex: Urgent, Normal, Scăzut"
                    value={newColumnOptions}
                    onChange={(e) => setNewColumnOptions(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Introduceți opțiunile separate prin virgulă</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowNewColumnDialog(false)}>
                Anulează
              </Button>
              <Button onClick={handleAddCustomColumn}>
                <Plus className="w-4 h-4 mr-2" />
                Adaugă Coloană
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generic confirmation dialog (replaces native confirm) */}
        <Dialog
          open={confirmOpen}
          onOpenChange={(o) => {
            if (!o) closeConfirm(false);
            else setConfirmOpen(true);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmOpts.title}</DialogTitle>
              {confirmOpts.description && <DialogDescription>{confirmOpts.description}</DialogDescription>}
            </DialogHeader>
            {confirmOpts.details && <div className="mt-2">{confirmOpts.details}</div>}
            <DialogFooter className="gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => closeConfirm(false)}>
                {confirmOpts.cancelText || "Anulează"}
              </Button>
              <Button onClick={() => closeConfirm(true)}>{confirmOpts.confirmText || "OK"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modern Filter Section - Sticky */}
        <Card className="border-0 shadow-none bg-white sticky top-0 z-40">
          <CardContent className="space-y-4 pt-2 px-0 relative bg-white">
            {/* Filter Buttons Row with Search */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {/* Period Filter - with relative wrapper */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((prev) => (prev === "date" ? null : "date"))}
                  data-filter-trigger
                  className={`h-7 px-2 text-xs font-normal rounded-md hover:bg-[#EFEFEF] hover:text-[#37352F] transition-colors ${dateAfter || dateBefore ? "bg-[#F0F0F0] text-[#37352F]" : "text-[#6B6B6B]"}`}
                >
                  {dateAfter || dateBefore ? (
                    <>
                      <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-[#91918E]" />
                      <span>{dateAfter || "..."} - {dateBefore || "..."}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDateAfter("");
                          setDateBefore("");
                        }}
                        className="ml-1.5 hover:bg-[#E0E0E0] rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                      Period
                    </>
                  )}
                </Button>
                {/* Period Dropdown */}
                {showFilters === "date" && (
                  <div className="filter-dropdown absolute top-full mt-1 left-0 z-50 w-80 bg-white rounded-lg shadow-lg border border-[#E8E8E7] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-[#373530]">Perioadă</h4>
                        <button
                          onClick={() => setShowFilters(null)}
                          className="text-[#787774] hover:text-[#191919] p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick Date Filters */}
                      <div className="grid grid-cols-3 gap-2 pb-2 border-b border-[#E8E8E7]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setDateAfter(today);
                            setDateBefore(today);
                            setShowFilters(null);
                          }}
                          className="h-8 text-xs text-[#373530] hover:bg-[#E8F2FC] hover:text-[#0B6AB5]"
                        >
                          Astăzi
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const lastWeek = new Date(today);
                            lastWeek.setDate(today.getDate() - 7);
                            setDateAfter(lastWeek.toISOString().split('T')[0]);
                            setDateBefore(today.toISOString().split('T')[0]);
                            setShowFilters(null);
                          }}
                          className="h-8 text-xs text-[#373530] hover:bg-[#E8F2FC] hover:text-[#0B6AB5]"
                        >
                          7 zile
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const lastMonth = new Date(today);
                            lastMonth.setDate(today.getDate() - 30);
                            setDateAfter(lastMonth.toISOString().split('T')[0]);
                            setDateBefore(today.toISOString().split('T')[0]);
                            setShowFilters(null);
                          }}
                          className="h-8 text-xs text-[#373530] hover:bg-[#E8F2FC] hover:text-[#0B6AB5]"
                        >
                          30 zile
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-[#787774] mb-1 block">De la</label>
                            <Popover open={dateAfterOpen} onOpenChange={setDateAfterOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal h-9 text-sm"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateAfter ? format(new Date(dateAfter + 'T00:00:00'), "dd.MM.yyyy", { locale: ro }) : "Selectează"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dateAfter ? new Date(dateAfter + 'T00:00:00') : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const day = String(date.getDate()).padStart(2, '0');
                                      setDateAfter(`${year}-${month}-${day}`);
                                    }
                                  }}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                                <div className="p-3 border-t border-[#E8E8E7] flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDateAfter("");
                                      setDateAfterOpen(false);
                                    }}
                                    className="h-8 text-xs"
                                  >
                                    Șterge
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setDateAfterOpen(false)}
                                    className="h-8 text-xs"
                                  >
                                    OK
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <label className="text-xs text-[#787774] mb-1 block">Până la</label>
                            <Popover open={dateBeforeOpen} onOpenChange={setDateBeforeOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal h-9 text-sm"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateBefore ? format(new Date(dateBefore + 'T00:00:00'), "dd.MM.yyyy", { locale: ro }) : "Selectează"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dateBefore ? new Date(dateBefore + 'T00:00:00') : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const day = String(date.getDate()).padStart(2, '0');
                                      setDateBefore(`${year}-${month}-${day}`);
                                    }
                                  }}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                                <div className="p-3 border-t border-[#E8E8E7] flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDateBefore("");
                                      setDateBeforeOpen(false);
                                    }}
                                    className="h-8 text-xs"
                                  >
                                    Șterge
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setDateBeforeOpen(false)}
                                    className="h-8 text-xs"
                                  >
                                    OK
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                      {(dateAfter || dateBefore) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDateAfter("");
                            setDateBefore("");
                          }}
                          className="w-full h-8 text-xs text-[#787774] hover:text-[#191919]"
                        >
                          Șterge filtrele de dată
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Filter - with relative wrapper */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((prev) => (prev === "status" ? null : "status"))}
                  data-filter-trigger
                  className={`h-7 px-2 text-xs font-normal rounded-md hover:bg-[#EFEFEF] hover:text-[#37352F] transition-colors ${statusFilter !== "all" ? "bg-[#F0F0F0] text-[#37352F]" : "text-[#6B6B6B]"}`}
                >
                  {statusFilter !== "all" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-[#91918E]" />
                      <span className="capitalize">{statusFilter}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusFilter("all");
                        }}
                        className="ml-1.5 hover:bg-[#E0E0E0] rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Status
                    </>
                  )}
                </Button>
                {/* Status Dropdown */}
                {showFilters === "status" && (
                  <div className="filter-dropdown absolute top-full mt-1 left-0 z-50 w-64 bg-white rounded-lg shadow-lg border border-[#E8E8E7] p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-[#373530]">Status apel</h4>
                        <button
                          onClick={() => setShowFilters(null)}
                          className="text-[#787774] hover:text-[#191919] p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { value: "all", label: "Toate", color: null },
                          { value: "done", label: "Done", color: "bg-green-100 text-green-700" },
                          { value: "failed", label: "Failed", color: "bg-red-100 text-red-700" },
                          { value: "busy", label: "Busy", color: "bg-orange-100 text-orange-700" },
                          { value: "no-answer", label: "No Answer", color: "bg-gray-100 text-gray-700" },
                        ].map((status) => (
                          <button
                            key={status.value}
                            onClick={() => {
                              setStatusFilter(status.value);
                              setShowFilters(null);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                              statusFilter === status.value
                                ? "bg-[#E8F2FC] text-[#0B6AB5] font-medium"
                                : "hover:bg-[#F5F5F5] text-[#373530]"
                            }`}
                          >
                            {status.color && (
                              <span className={`w-2 h-2 rounded-full ${status.color.split(" ")[0]}`} />
                            )}
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Agent Filter - with relative wrapper */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((prev) => (prev === "agent" ? null : "agent"))}
                  data-filter-trigger
                  className={`h-7 px-2 text-xs font-normal rounded-md hover:bg-[#EFEFEF] hover:text-[#37352F] transition-colors ${selectedAgents.length > 0 ? "bg-[#F0F0F0] text-[#37352F]" : "text-[#6B6B6B]"}`}
                >
                  {selectedAgents.length > 0 ? (
                    <>
                      <Bot className="w-3.5 h-3.5 mr-1.5 text-[#91918E]" />
                      <span>Agents ({selectedAgents.length})</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgents([]);
                        }}
                        className="ml-1.5 hover:bg-[#E0E0E0] rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5 mr-1.5" />
                      Agent
                    </>
                  )}
                </Button>
                {/* Agent Dropdown */}
                {showFilters === "agent" && (
                  <div className="filter-dropdown absolute top-full mt-1 left-0 z-50 w-80 bg-white rounded-lg shadow-lg border border-[#E8E8E7] p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-[#373530]">Selectează agenți</h4>
                        <button
                          onClick={() => setShowFilters(null)}
                          className="text-[#787774] hover:text-[#191919] p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {allAgents.map((agent) => (
                          <label
                            key={agent.agent_id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F5F5F5] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAgents.includes(agent.agent_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAgents([...selectedAgents, agent.agent_id]);
                                } else {
                                  setSelectedAgents(selectedAgents.filter(id => id !== agent.agent_id));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-[#0B6AB5] focus:ring-[#0B6AB5]"
                            />
                            <span className="text-sm text-[#373530]">{agent.name}</span>
                          </label>
                        ))}
                      </div>
                      {selectedAgents.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAgents([])}
                          className="w-full h-8 text-xs text-[#787774] hover:text-[#191919]"
                        >
                          Deselectează toți
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Duration Filter - with relative wrapper */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((prev) => (prev === "duration" ? null : "duration"))}
                  data-filter-trigger
                  className={`h-7 px-2 text-xs font-normal rounded-md hover:bg-[#EFEFEF] hover:text-[#37352F] transition-colors ${durationPreset !== "all" || minDuration || maxDuration ? "bg-[#F0F0F0] text-[#37352F]" : "text-[#6B6B6B]"}`}
                >
                  {durationPreset !== "all" || minDuration || maxDuration ? (
                    <>
                      <Timer className="w-3.5 h-3.5 mr-1.5 text-[#91918E]" />
                      <span>{durationPreset !== "all" ? durationPreset : "Custom"}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDurationPreset("all");
                          setMinDuration("");
                          setMaxDuration("");
                        }}
                        className="ml-1.5 hover:bg-[#E0E0E0] rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Timer className="w-3.5 h-3.5 mr-1.5" />
                      Duration
                    </>
                  )}
                </Button>
                {/* Duration Dropdown */}
                {showFilters === "duration" && (
                  <div className="filter-dropdown absolute top-full mt-1 left-0 z-50 w-72 bg-white rounded-lg shadow-lg border border-[#E8E8E7] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-[#373530]">Durată apel</h4>
                        <button
                          onClick={() => setShowFilters(null)}
                          className="text-[#787774] hover:text-[#191919] p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Preset buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "all", label: "Toate" },
                          { value: "< 30s", label: "< 30 sec" },
                          { value: "30s - 1m", label: "30s - 1 min" },
                          { value: "> 1m", label: "> 1 min" },
                        ].map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => {
                              setDurationPreset(preset.value);
                              setMinDuration("");
                              setMaxDuration("");
                              setShowFilters(null);
                            }}
                            className={`px-3 py-2 rounded-md text-xs transition-colors ${
                              durationPreset === preset.value
                                ? "bg-[#E8F2FC] text-[#0B6AB5] font-medium"
                                : "hover:bg-[#F5F5F5] text-[#373530]"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom range */}
                      <div className="pt-2 border-t border-[#E8E8E7]">
                        <p className="text-xs text-[#787774] mb-2">Sau setează un interval personalizat (secunde):</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={minDuration}
                            onChange={(e) => {
                              setMinDuration(e.target.value);
                              setDurationPreset("all");
                            }}
                            className="h-8 text-xs"
                          />
                          <span className="text-[#787774]">-</span>
                          <Input
                            type="number"
                            placeholder="Max"
                            value={maxDuration}
                            onChange={(e) => {
                              setMaxDuration(e.target.value);
                              setDurationPreset("all");
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Favorite Filter - with relative wrapper */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((prev) => (prev === "liked" ? null : "liked"))}
                  data-filter-trigger
                  className={`h-7 px-2 text-xs font-normal rounded-md hover:bg-[#EFEFEF] hover:text-[#37352F] transition-colors ${onlyLiked ? "bg-[#F0F0F0] text-[#37352F]" : "text-[#6B6B6B]"}`}
                >
                  {onlyLiked ? (
                    <>
                      <Heart className="w-3.5 h-3.5 mr-1.5 text-[#91918E]" />
                      <span>Favorites ({Object.values(likes).filter(Boolean).length})</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOnlyLiked(false);
                        }}
                        className="ml-1.5 hover:bg-[#E0E0E0] rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                  </>
                ) : (
                  <>
                    <Heart className="w-3.5 h-3.5 mr-1.5" />
                    Favorites
                  </>
                )}
              </Button>
                {/* Favorites Dropdown */}
                {showFilters === "liked" && (
                  <div className="filter-dropdown absolute top-full mt-1 left-0 z-50 w-72 bg-white rounded-lg shadow-lg border border-[#E8E8E7] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-[#373530]">Favorite</h4>
                        <button
                          onClick={() => setShowFilters(null)}
                          className="text-[#787774] hover:text-[#191919] p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setOnlyLiked(!onlyLiked);
                          setTimeout(() => setShowFilters(null), 200);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-[#F1F1EF] transition-colors ${
                          onlyLiked ? "bg-[#E8F2FC]" : ""
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${onlyLiked ? "bg-[#487CA5]" : "bg-transparent border border-[#E8E8E7]"}`} />
                        <span className="flex-1 text-left text-[#373530]">Arată doar favorite</span>
                      </button>
                      <div className="px-3 py-2 text-xs text-[#787774] border-t border-[#E8E8E7] mt-2">
                        {Object.values(likes).filter(Boolean).length > 0
                          ? `${Object.values(likes).filter(Boolean).length} conversații marcate ca favorite`
                          : "Nu există conversații marcate ca favorite"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Score Filter - with relative wrapper for dropdown positioning */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((prev) => (prev === "aiScore" ? null : "aiScore"))}
                  data-filter-trigger
                  className={`h-7 px-2 text-xs font-normal rounded-md hover:bg-[#EFEFEF] hover:text-[#37352F] transition-colors ${aiScoreFilters.length > 0 ? "bg-[#F0F0F0] text-[#37352F]" : "text-[#6B6B6B]"}`}
                >
                  {aiScoreFilters.length > 0 ? (
                    <>
                      <Star className="w-3.5 h-3.5 mr-1.5 text-[#91918E]" />
                      <span>Score ({aiScoreFilters.length})</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAiScoreFilters([]);
                        }}
                        className="ml-1.5 hover:bg-[#E0E0E0] rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 mr-1.5" />
                      AI Score
                    </>
                  )}
                </Button>
                
                {/* AI Score Filter Dropdown - Multi-select with checkboxes */}
                {showFilters === "aiScore" && (
                  <div className="filter-dropdown absolute top-full mt-1 left-0 z-50 w-80 bg-white rounded-lg shadow-lg border border-[#E8E8E7] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-[#373530]">Filtrare după AI Scor</h4>
                        <button
                          onClick={() => setShowFilters(null)}
                          className="text-[#787774] hover:text-[#191919] p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* AI Score Stats */}
                      <div className="flex gap-2 p-2 bg-[#F7F6F3] rounded-lg">
                        <div className="flex-1 text-center">
                          <div className="text-lg font-bold text-[#373530]">{aiScoreStats.avg}</div>
                          <div className="text-xs text-[#787774]">Scor mediu</div>
                        </div>
                        <div className="w-px bg-[#E8E8E7]" />
                        <div className="flex-1 flex items-center justify-center gap-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium bg-[#EEF3ED] text-[#548164]">{aiScoreStats.excellent}</span>
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium bg-[#E7F0F8] text-[#487CA5]">{aiScoreStats.good}</span>
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium bg-[#F8ECDF] text-[#CC782F]">{aiScoreStats.medium}</span>
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium bg-[#FAECEC] text-[#C4554D]">{aiScoreStats.poor}</span>
                        </div>
                      </div>
                      
                      {/* Multi-select Score Options with Checkboxes */}
                      <div className="space-y-1">
                        {[
                          { value: "80+", label: "Excelent (80+)", color: "text-[#548164]", bg: "bg-[#EEF3ED]" },
                          { value: "60-79", label: "Bun (60-79)", color: "text-[#487CA5]", bg: "bg-[#E7F0F8]" },
                          { value: "40-59", label: "Mediu (40-59)", color: "text-[#CC782F]", bg: "bg-[#F8ECDF]" },
                          { value: "<40", label: "Slab (<40)", color: "text-[#C4554D]", bg: "bg-[#FAECEC]" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setAiScoreFilters(prev => 
                                prev.includes(option.value) 
                                  ? prev.filter(v => v !== option.value)
                                  : [...prev, option.value]
                              );
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-[#F1F1EF] transition-colors ${
                              aiScoreFilters.includes(option.value) ? (option.bg || "bg-[#F1F1EF]") : ""
                            }`}
                          >
                            <Checkbox checked={aiScoreFilters.includes(option.value)} className="h-4 w-4" />
                            <span className={`flex-1 text-left ${option.color}`}>{option.label}</span>
                          </button>
                        ))}
                      </div>
                      
                      {aiScoreFilters.length > 0 && (
                        <button
                          onClick={() => setAiScoreFilters([])}
                          className="w-full text-xs text-[#787774] hover:text-[#191919] py-2 border-t border-[#E8E8E7] mt-2 pt-2"
                        >
                          Șterge toate selecțiile
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Tags Filter - with relative wrapper for dropdown positioning */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters((prev) => (prev === "aiTags" ? null : "aiTags"))}
                  data-filter-trigger
                  className={`h-7 px-2 text-xs font-normal rounded-md hover:bg-[#EFEFEF] hover:text-[#37352F] transition-colors ${aiTagsFilter.length > 0 ? "bg-[#F0F0F0] text-[#37352F]" : "text-[#6B6B6B]"}`}
                >
                  {aiTagsFilter.length > 0 ? (
                    <>
                      <Tag className="w-3.5 h-3.5 mr-1.5 text-[#91918E]" />
                      <span>Tags ({aiTagsFilter.length})</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAiTagsFilter([]);
                        }}
                        className="ml-1.5 hover:bg-[#E0E0E0] rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Tag className="w-3.5 h-3.5 mr-1.5" />
                      AI Tags
                    </>
                  )}
                </Button>
                
                {/* AI Tags Filter Dropdown - positioned under button */}
                {showFilters === "aiTags" && (
                  <div className="filter-dropdown absolute top-full mt-1 left-0 z-50 w-80 bg-white rounded-lg shadow-lg border border-[#E8E8E7] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-[#373530]">Filtrare după AI Tag-uri</h4>
                        <button
                          onClick={() => setShowFilters(null)}
                          className="text-[#787774] hover:text-[#191919] p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Selected Tags */}
                      {aiTagsFilter.length > 0 && (
                        <div className="flex flex-wrap gap-1 p-2 bg-[#F7F6F3] rounded-lg">
                          {aiTagsFilter.map((tag) => (
                            <Badge 
                              key={tag} 
                              variant="secondary" 
                              className="text-xs bg-[#E7F0F8] text-[#487CA5] cursor-pointer hover:bg-[#d0e3f0]"
                              onClick={() => setAiTagsFilter((prev) => prev.filter((t) => t !== tag))}
                            >
                              {tag} <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Available Tags */}
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {allUniqueTags.length > 0 ? (
                          allUniqueTags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => {
                                if (aiTagsFilter.includes(tag)) {
                                  setAiTagsFilter((prev) => prev.filter((t) => t !== tag));
                                } else {
                                  setAiTagsFilter((prev) => [...prev, tag]);
                                }
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-[#F1F1EF] transition-colors ${
                                aiTagsFilter.includes(tag) ? "bg-[#E7F0F8]" : ""
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${aiTagsFilter.includes(tag) ? "bg-[#487CA5]" : "bg-transparent border border-[#E8E8E7]"}`} />
                              <span className="flex-1 text-left text-[#373530]">{tag}</span>
                            </button>
                          ))
                        ) : (
                          <div className="text-xs text-[#787774] text-center py-4">
                            Nu există tag-uri în conversații
                          </div>
                        )}
                      </div>
                      
                      {aiTagsFilter.length > 0 && (
                        <button
                          onClick={() => setAiTagsFilter([])}
                          className="w-full text-xs text-[#787774] hover:text-[#191919] py-2 border-t border-[#E8E8E7] mt-2 pt-2"
                        >
                          Șterge toate selecțiile
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sync Conversations Button */}
              <SyncConversationsButton
                variant="ghost"
                iconOnly
                className="h-7"
              />

              {/* Separator */}
              <div className="w-px h-5 bg-[#E0E0E0] mx-1" />

              {/* Export CSV */}
              <Select
                onValueChange={(value) => {
                  switch (value) {
                    case "all":
                      handleExportAll();
                      break;
                    case "filtered":
                      handleExportFiltered();
                      break;
                    case "current-page":
                      handleExportCurrentPage();
                      break;
                    case "last200":
                      handleExportLast200();
                      break;
                    case "phones":
                      handleExportByPhones();
                      break;
                  }
                }}
              >
                <SelectTrigger className="w-auto h-7 px-2 text-xs font-normal rounded-md border-0 bg-transparent text-[#6B6B6B] hover:bg-[#EFEFEF] hover:text-[#37352F] whitespace-nowrap gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>{t("analytics.exportCSV")}</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("analytics.all")} ({hasActiveFilters ? filteredCalls.length : totalCount})
                  </SelectItem>
                  <SelectItem value="filtered" disabled={(filteredCount || totalCount) === 0}>
                    {t("analytics.filtered")} ({filteredCount || totalCount})
                  </SelectItem>
                  <SelectItem value="current-page">
                    {t("analytics.currentPage")} ({paginatedCalls.length})
                  </SelectItem>
                  <SelectItem value="last200">{t("analytics.last200")}</SelectItem>
                  <SelectItem value="phones">{t("analytics.specificNumbers")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Audio Download */}
              <Select
                onValueChange={(value) => {
                  switch (value) {
                    case "audio-all":
                      handleBulkAudioDownloadAll();
                      break;
                    case "audio-filtered":
                      handleBulkAudioDownloadFiltered();
                      break;
                    case "audio-page":
                      handleBulkAudioDownload(paginatedCalls);
                      break;
                  }
                }}
              >
                <SelectTrigger className="w-auto h-7 px-2 text-xs font-normal rounded-md border-0 bg-transparent text-[#6B6B6B] hover:bg-[#EFEFEF] hover:text-[#37352F] whitespace-nowrap gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>{t("analytics.downloadAudio")}</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audio-all">
                    {t("analytics.audioAll")} ({totalCount})
                  </SelectItem>
                  <SelectItem
                    value="audio-filtered"
                    disabled={(filteredCount || 0) === 0}
                  >
                    {t("analytics.audioFiltered")} ({filteredCount || totalCount})
                  </SelectItem>
                  <SelectItem value="audio-page">
                    {t("analytics.audioPage")} ({paginatedCalls.filter((c) => c.conversation_id).length})
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Redial Button */}
              <Button
                onClick={handleRedialFiltered}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-normal rounded-md text-[#6B6B6B] hover:bg-[#EFEFEF] hover:text-[#37352F] whitespace-nowrap"
                disabled={(filteredCount || totalCount) === 0}
                title="Trimite numerele filtrate către Outbound pentru re-apelare"
              >
                <Phone className="w-3.5 h-3.5 mr-1.5" />
                Call again ({uniquePhoneCount})
              </Button>

              {/* Search Icon/Input - Notion Style with Cmd+K hint */}
              {!isSearchExpanded ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSearchExpanded(true)}
                  className="h-7 px-2 text-xs font-normal text-[#6B6B6B] hover:bg-[#EFEFEF] hover:text-[#37352F] rounded-md gap-1"
                  title="Caută conversații (⌘K)"
                >
                  <Search className="w-4 h-4" />
                  <span className="text-[10px] text-[#91918E]">⌘K</span>
                </Button>
              ) : (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#91918E] w-3.5 h-3.5" />
                  <Input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => {
                      if (!searchTerm) setIsSearchExpanded(false);
                    }}
                    autoFocus
                    className="pl-9 pr-8 h-7 text-xs rounded-md border-0 bg-[#F0F0F0] text-[#37352F] placeholder:text-[#91918E] focus:border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setIsSearchExpanded(false);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#91918E] hover:text-[#37352F]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Add Column Button */}
              <Button
                onClick={() => setShowNewColumnDialog(true)}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-[#6B6B6B] hover:bg-[#EFEFEF] hover:text-[#37352F] rounded-md"
                title="Adaugă coloană nouă"
              >
                <Plus className="w-4 h-4" />
              </Button>

              {/* Settings Button */}
              <Button
                onClick={() => setShowColumnSettings(true)}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-[#6B6B6B] hover:bg-[#EFEFEF] hover:text-[#37352F] rounded-md"
                title="Customize columns"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>

          </CardContent>
        </Card>

        {/* Old collapsible filters - REMOVE */}
        {false && showFilters && (
          <Card className="border border-gray-200 rounded-2xl bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Filter className="w-4 h-4" />
                Filtre de Căutare
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Search Bar - Full Width */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Caută după numărul de telefon, nume contact, sumar conversație sau ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-gray-200 bg-white/70 focus-visible:ring-0 focus:border-gray-300"
                />
              </div>

              {/* Date Range Section */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Perioada</label>
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <Input
                    type="date"
                    value={dateAfter}
                    onChange={(e) => setDateAfter(e.target.value)}
                    className="h-10 w-full sm:w-44 rounded-xl border-gray-200 bg-white/70 focus-visible:ring-0 focus:border-gray-300"
                    placeholder="De la"
                  />
                  <span className="text-muted-foreground text-sm px-2">până la</span>
                  <Input
                    type="date"
                    value={dateBefore}
                    onChange={(e) => setDateBefore(e.target.value)}
                    className="h-10 w-full sm:w-44 rounded-xl border-gray-200 bg-white/70 focus-visible:ring-0 focus:border-gray-300"
                    placeholder="Până la"
                  />
                </div>
              </div>

              {/* Status and Agent Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white/70">
                      <SelectValue placeholder="Toate statusurile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Agent</label>
                  <Select value={selectedAgents[0] || "all"} onValueChange={(v) => setSelectedAgents(v === "all" ? [] : [v])}>
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white/70">
                      <SelectValue placeholder="Toți agenții" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toți agenții</SelectItem>
                      {allAgents.map((agent) => (
                        <SelectItem key={agent.agent_id} value={agent.agent_id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Durată</label>
                  <Select value={durationPreset} onValueChange={setDurationPreset}>
                    <SelectTrigger className="h-10 rounded-xl border-gray-200 bg-white/70">
                      <SelectValue placeholder="Toate duratele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate duratele</SelectItem>
                      <SelectItem value="short">Scurte (≤30s)</SelectItem>
                      <SelectItem value="medium">Medii (30s-2min)</SelectItem>
                      <SelectItem value="long">Lungi (&gt;2min)</SelectItem>
                      <SelectItem value="custom">Personalizată…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Preferințe</label>
                  <label className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-muted/40 hover:bg-muted/60 cursor-pointer h-10 border-0">
                    <Checkbox checked={onlyLiked} onCheckedChange={(v) => setOnlyLiked(!!v)} className="h-4 w-4" />
                    <span className="text-sm">Doar cu like</span>
                  </label>
                </div>
              </div>

              {/* Custom Duration Range - Show for 'all' and 'custom' */}
              {(durationPreset === "all" || durationPreset === "custom") && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-xs font-medium text-muted-foreground">Durată Personalizată (secunde)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Minim"
                      value={minDuration}
                      onChange={(e) => setMinDuration(e.target.value)}
                      className="h-10 w-32 rounded-xl border-gray-200 bg-white/70 focus-visible:ring-0 focus:border-gray-300"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Maxim"
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(e.target.value)}
                      className="h-10 w-32 rounded-xl border-gray-200 bg-white/70 focus-visible:ring-0 focus:border-gray-300"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lasă gol unul din câmpuri pentru a filtra „de la” sau „până la”. Pentru durată exactă, pune aceeași
                    valoare la minim și maxim.
                  </p>
                </div>
              )}

              {/* Clear Filters Button */}
              {(searchTerm ||
                statusFilter !== "all" ||
                selectedAgents.length > 0 ||
                dateAfter ||
                dateBefore ||
                durationPreset !== "all" ||
                minDuration ||
                maxDuration ||
                onlyLiked) && (
                <Button variant="ghost" onClick={clearAllFilters} className="w-full sm:w-auto rounded-full">
                  Șterge toate filtrele
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analytics Table - Mobile Responsive */}
        <div>
          <div>
            {/* Mobile Card Layout */}
            <div className="block sm:hidden space-y-3">
              {paginatedCalls.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  {(hasClientSideFilters ? filteredCalls.length : filteredCount || totalCount) === 0
                    ? "Nu sunt conversații care să corespundă filtrelor"
                    : "Nu sunt conversații pe această pagină"}
                </div>
              ) : (
                paginatedCalls.map((call) => {
                  const conversationData = call.conversation_id ? getConversationData(call.conversation_id) : null;
                  
                  // 🔥 CALCULEAZĂ VALORILE FINALE (cu fallback la call_history)
                  const finalDuration = conversationData?.duration || call.duration_seconds || 0;
                  // PRIORITATE: call_history.cost_usd (source of truth - deja dedus din balanță)
                  const finalCredits = call.cost_usd && call.cost_usd > 0
                    ? Math.round(call.cost_usd * 100)  // din DB - USD * 100 = credite (SOURCE OF TRUTH)
                    : Math.round(conversationData?.cost || 0);  // fallback din cache
                  
                  return (
                    <div
                      key={call.id}
                      className="rounded-lg p-4 hover:bg-white/50 cursor-pointer border-0"
                      onClick={() => call.conversation_id && handleConversationClick(call.conversation_id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center text-sm">
                          <Phone className="w-3 h-3 mr-1 text-muted-foreground" />
                          {call.phone_number}
                        </div>
                        <Badge className={getStatusStyle(call.call_status)}>{getDisplayStatus(call.call_status)}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Contact:</strong> {call.contact_name || "Necunoscut"}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Agent:</strong> {call.agent_name || "N/A"}
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <span>
                            Durată: {formatDuration(finalDuration)}
                          </span>
                          <span>
                            Credite: {finalCredits > 0 ? finalCredits : '-'}
                          </span>
                        </div>
                        {call.conversation_id && (
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(call.conversation_id || "");
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRedial(call.agent_id, call.phone_number, call.contact_name);
                              }}
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Sună din nou acest contact"
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayInBottomBar(
                                  call.conversation_id,
                                  call.contact_name || "Necunoscut",
                                  call.call_date,
                                  call.duration_seconds,
                                  call.phone_number,
                                );
                              }}
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Redă audio"
                            >
                              <Volume2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => toggleLike(e, call.conversation_id)}
                              className={`h-6 w-6 p-0 ${likes[call.conversation_id] ? "text-red-500" : "text-gray-400"}`}
                            >
                              <Heart className={`h-3 w-3 ${likes[call.conversation_id] ? "fill-current" : ""}`} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden sm:block -mx-2 sm:-mx-6 lg:-mx-8">
              {/* Table container with horizontal and vertical scroll - thead sticky */}
              <div
                ref={scrollRef}
                className={`bg-white scrollbar-hide ${isColumnResizing ? 'overflow-hidden' : 'overflow-auto cursor-grab active:cursor-grabbing'}`}
                style={{
                  width: 'calc(100vw - 16rem)',
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 160px)',
                  WebkitOverflowScrolling: isColumnResizing ? "auto" : "touch",
                  paddingBottom: '44px',
                }}
              >
                <div style={{ display: 'inline-block', minWidth: '100%' }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleColumnDragEnd}
                  >
                    <table
                      className="border-collapse bg-white"
                      style={{
                        tableLayout: "fixed",
                        width: 'max-content',
                        minWidth: '100%',
                      }}
                    >
                      {/* Define column widths */}
                      <colgroup>
                        {/* Selection column - wider for better visibility */}
                        <col style={{ width: '48px', minWidth: '48px' }} />
                        {columnOrder.map((columnId) => {
                          if (!visibleColumns[columnId]) return null;
                          return (
                            <col 
                              key={columnId} 
                              style={{ 
                                width: `${columnWidths[columnId] || 150}px`,
                                minWidth: `${columnWidths[columnId] || 150}px`,
                              }} 
                            />
                          );
                        })}
                      </colgroup>
                      <thead className="sticky top-0 z-30 bg-white">
                      <tr className="bg-white border-b border-[#EBEAE9] group/header">
                        {/* Selection header - wider for better visibility */}
                        <th
                          className="w-12 px-2 py-2.5 bg-white sticky left-0 z-10 relative"
                          style={{ width: '48px', minWidth: '48px' }}
                        >
                          {/* Shadow overlay that appears on horizontal scroll */}
                          {isHorizontallyScrolled && (
                            <div 
                              className="absolute top-0 right-0 bottom-0 w-[4px] pointer-events-none"
                              style={{ 
                                transform: 'translateX(100%)',
                                background: 'linear-gradient(to right, rgba(0,0,0,0.08), transparent)'
                              }}
                            />
                          )}
                          <div className={`flex items-center justify-center pl-2 transition-opacity duration-100 ${
                            selectedRows.size > 0 ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-100'
                          }`}>
                            <Checkbox
                              checked={allRowsSelected}
                              onCheckedChange={toggleSelectAll}
                              className="h-[14px] w-[14px] rounded-[2px] border-[#CDCCC8] data-[state=checked]:bg-[#2383E2] data-[state=checked]:border-[#2383E2]"
                            />
                          </div>
                        </th>
                        <SortableContext
                          items={columnOrder.filter((colId) => visibleColumns[colId])}
                          strategy={horizontalListSortingStrategy}
                        >
                          {columnOrder.map((columnId) => {
                            if (!visibleColumns[columnId]) return null;
                            const columnLabels: Record<string, string> = {
                              contact_name: "Nume",
                              contact_phone: "Telefon",
                              agent: t("analytics.agent"),
                              status: t("analytics.status"),
                              cost: "Credite",
                              duration: t("analytics.duration"),
                              datetime: t("analytics.startTime"),
                              messages_count: "Replici",
                              comments: t("analytics.comments"),
                              conclusion: "Concluzie Auto",
                              ai_concluzie: "AI Concluzie",
                              ai_taguri: "AI Tag-uri",
                              ai_scor: "AI Scor",
                              actions: t("analytics.actions"),
                            };

                            // Notion-style icons for each column type
                            const columnIcons: Record<string, React.ComponentType<{ className?: string }>> = {
                              contact_name: User,
                              contact_phone: Phone,
                              agent: Bot,
                              status: CheckCircle2,
                              cost: Coins,
                              duration: Timer,
                              datetime: CalendarIcon,
                              messages_count: MessageSquare,
                              comments: FileText,
                              conclusion: FileText,
                              ai_concluzie: Sparkles,
                              ai_taguri: Tag,
                              ai_scor: Star,
                              actions: MoreHorizontal,
                            };

                            // Check if it's a custom column
                            const customColumn = customColumns.find((col) => col.id === columnId);
                            const label = customColumn ? customColumn.name : columnLabels[columnId];
                            const icon = customColumn ? Type : columnIcons[columnId];
                            return (
                              <SortableColumnHeader 
                                key={columnId} 
                                id={columnId}
                                width={columnWidths[columnId] || 150}
                                onResize={handleColumnResize}
                                onResizeStart={handleColumnResizeStart}
                                onResizeEnd={handleColumnResizeEnd}
                                icon={icon}
                              >
                                {label}
                              </SortableColumnHeader>
                            );
                          })}
                        </SortableContext>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {paginatedCalls.length === 0 ? (
                        <tr>
                          <td colSpan={columnOrder.filter(col => visibleColumns[col]).length + 1} className="px-3 py-8 text-center text-[#787774]">
                            {(hasClientSideFilters ? filteredCalls.length : filteredCount || totalCount) === 0
                              ? "Nu sunt conversații care să corespundă filtrelor"
                              : "Nu sunt conversații pe această pagină"}
                          </td>
                        </tr>
                      ) : (
                        paginatedCalls.map((call) => {
                          // ✅ CALCULEAZĂ conversationData O SINGURĂ DATĂ pentru tot rândul
                          const conversationData = call.conversation_id
                            ? getConversationData(call.conversation_id)
                            : null;
                          
                          // 🔥 CALCULEAZĂ VALORILE FINALE O SINGURĂ DATĂ (cu fallback la call_history)
                          const finalDuration = conversationData?.duration || call.duration_seconds || 0;
                          // PRIORITATE: call_history.cost_usd (source of truth - deja dedus din balanță)
                          // Fallback: cache (pentru conversații fără cost în call_history)
                          const finalCredits = call.cost_usd && call.cost_usd > 0
                            ? Math.round(call.cost_usd * 100)  // din DB - USD * 100 = credite (SOURCE OF TRUTH)
                            : Math.round(conversationData?.cost || 0);  // fallback din cache
                          // Replici - din cache sau din dialog_json
                          const finalMessageCount = conversationData?.messageCount || extractMessageCount(call.conversation_id, call.dialog_json);
                          
                          const commentKey = getCommentKey(call);

                          // Helper function to render cell content based on column type
                          const renderCell = (columnId: string) => {
                            if (!visibleColumns[columnId as keyof typeof visibleColumns]) return null;
                            switch (columnId) {
                              case "contact_name":
                                return (
                                  <td
                                    key="contact_name"
                                    className="px-3 py-1 border-r border-[#EBEAE9] text-left whitespace-nowrap overflow-hidden"
                                    style={{
                                      width: `${columnWidths.contact_name}px`,
                                      minWidth: `${columnWidths.contact_name}px`,
                                      maxWidth: `${columnWidths.contact_name}px`,
                                    }}
                                  >
                                    <div className="text-sm font-medium text-[#373530] truncate">
                                      {call.contact_name || "Necunoscut"}
                                    </div>
                                  </td>
                                );
                              case "contact_phone":
                                return (
                                  <td
                                    key="contact_phone"
                                    className="px-3 py-1 border-r border-[#EBEAE9] text-left whitespace-nowrap overflow-hidden"
                                    style={{
                                      width: `${columnWidths.contact_phone}px`,
                                      minWidth: `${columnWidths.contact_phone}px`,
                                      maxWidth: `${columnWidths.contact_phone}px`,
                                    }}
                                  >
                                    <div className="text-sm text-[#787774] truncate">{call.phone_number}</div>
                                  </td>
                                );
                              case "agent":
                                return (
                                  <td
                                    key="agent"
                                    className="px-3 py-1 text-sm text-[#373530] border-r border-[#EBEAE9] text-left whitespace-nowrap overflow-hidden"
                                    style={{
                                      width: `${columnWidths.agent}px`,
                                      minWidth: `${columnWidths.agent}px`,
                                      maxWidth: `${columnWidths.agent}px`,
                                    }}
                                  >
                                    <span className="truncate block">{call.agent_name || "N/A"}</span>
                                  </td>
                                );
                              case "status":
                                return (
                                  <td
                                    key="status"
                                    className="px-3 py-1 border-r border-[#EBEAE9] text-left whitespace-nowrap overflow-hidden"
                                    style={{
                                      width: `${columnWidths.status}px`,
                                      minWidth: `${columnWidths.status}px`,
                                      maxWidth: `${columnWidths.status}px`,
                                    }}
                                  >
                                    <span className={`inline-block ${getStatusStyle(call.call_status)}`}>
                                      {getDisplayStatus(call.call_status)}
                                    </span>
                                  </td>
                                );
                              case "cost":
                                return (
                                  <td
                                    key="cost"
                                    className="px-3 py-1 text-sm text-[#373530] border-r border-[#EBEAE9] text-left whitespace-nowrap overflow-hidden"
                                    style={{
                                      width: `${columnWidths.cost}px`,
                                      minWidth: `${columnWidths.cost}px`,
                                      maxWidth: `${columnWidths.cost}px`,
                                    }}
                                  >
                                    {(() => {
                                      // ✅ Folosește finalCredits calculat MAI SUS (cu fallback la call.cost_usd)
                                      if (finalCredits === 0) {
                                        return <span className="text-[#787774] text-xs">-</span>;
                                      }
                                      
                                      // Afișează credite cu culoare după valoare
                                      const colorClass = finalCredits < 30 
                                        ? "text-[#548164]" // verde pentru cost mic
                                        : finalCredits < 50 
                                          ? "text-[#CC782F]" // portocaliu pentru cost mediu
                                          : "text-[#C4554D]"; // roșu pentru cost mare
                                      
                                      return <span className={colorClass}>{finalCredits}</span>;
                                    })()}
                                  </td>
                                );
                              case "duration":
                                return (
                                  <td
                                    key="duration"
                                    className="px-3 py-1 text-sm text-[#373530] border-r border-[#EBEAE9] text-left whitespace-nowrap overflow-hidden"
                                    style={{
                                      width: `${columnWidths.duration}px`,
                                      minWidth: `${columnWidths.duration}px`,
                                      maxWidth: `${columnWidths.duration}px`,
                                    }}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {/* ✅ Folosește finalDuration calculat MAI SUS */}
                                      {formatDuration(finalDuration)}
                                    </div>
                                  </td>
                                );
                              case "datetime":
                                return (
                                  <td
                                    key="datetime"
                                    className="px-3 py-1 border-r border-[#EBEAE9] text-left whitespace-nowrap overflow-hidden"
                                    style={{
                                      width: `${columnWidths.datetime}px`,
                                      minWidth: `${columnWidths.datetime}px`,
                                      maxWidth: `${columnWidths.datetime}px`,
                                    }}
                                  >
                                    <div className="text-sm text-[#787774] truncate">
                                      {(() => {
                                        const formattedCallDate =
                                          call.call_date_display && call.call_date_display.trim() !== ""
                                            ? call.call_date_display
                                            : call.call_date
                                              ? new Date(call.call_date).toLocaleString("ro-RO")
                                              : null;
                                        if (formattedCallDate) return formattedCallDate;
                                        return "Necunoscut";
                                      })()}
                                    </div>
                                  </td>
                                );
                              case "messages_count":
                                return (
                                  <td
                                    key="messages_count"
                                    className="px-3 py-1 text-sm text-[#373530] border-r border-[#EBEAE9] text-center whitespace-nowrap"
                                    style={{
                                      width: `${columnWidths.messages_count}px`,
                                      minWidth: `${columnWidths.messages_count}px`,
                                      maxWidth: `${columnWidths.messages_count}px`,
                                    }}
                                  >
                                    <span className="font-medium">
                                      {finalMessageCount}
                                    </span>
                                  </td>
                                );
                              case "comments":
                                return (
                                  <td
                                    key="comments"
                                    className="px-3 py-1 border-r border-[#EBEAE9] text-left"
                                    style={{
                                      width: `${columnWidths.comments}px`,
                                      minWidth: `${columnWidths.comments}px`,
                                      maxWidth: `${columnWidths.comments}px`,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <Input
                                      type="text"
                                      placeholder="Adaugă comentariu..."
                                      value={comments[commentKey] || ""}
                                      onChange={(e) => handleCommentChange(e, call)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-7 text-xs border-none bg-transparent hover:bg-gray-50 focus:bg-white focus:border focus:border-[#487CA5] text-left w-full"
                                      style={{ maxWidth: "100%" }}
                                    />
                                  </td>
                                );
                              case "conclusion":
                                return (
                                  <td
                                    key="conclusion"
                                    className="px-3 py-1 border-r border-[#EBEAE9] text-left relative"
                                    style={{
                                      width: `${columnWidths.conclusion}px`,
                                      minWidth: `${columnWidths.conclusion}px`,
                                      maxWidth: `${columnWidths.conclusion}px`,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div className="truncate max-w-full">
                                      <ConclusionCell
                                        conclusion={call.analysis_conclusion}
                                        conversationId={call.conversation_id}
                                        callStatus={call.call_status}
                                        isProcessing={isConclusionProcessing(call.conversation_id)}
                                        onAnalyze={analyzeConclusion}
                                        durationSeconds={call.duration_seconds}
                                      />
                                    </div>
                                  </td>
                                );
                              case "actions":
                                return (
                                  <td
                                    key="actions"
                                    className="px-3 py-1 border-r border-[#EBEAE9] text-left whitespace-nowrap"
                                    style={{
                                      width: `${columnWidths.actions}px`,
                                      minWidth: `${columnWidths.actions}px`,
                                      maxWidth: `${columnWidths.actions}px`,
                                    }}
                                  >
                                    <div className="flex items-center justify-start gap-1">
                                      {call.conversation_id && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRedial(call.agent_id, call.phone_number, call.contact_name);
                                            }}
                                            className="h-7 w-7 p-0 text-[#548164] hover:text-[#548164] hover:bg-[#EEF3ED]"
                                            title="Sună din nou acest contact"
                                          >
                                            <Phone className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePlayInBottomBar(
                                                call.conversation_id,
                                                call.contact_name || "Necunoscut",
                                                call.call_date,
                                                call.duration_seconds,
                                                call.phone_number,
                                              );
                                            }}
                                            className="h-7 w-7 p-0 text-[#487CA5] hover:text-[#487CA5] hover:bg-[#F1F1EF]"
                                            title="Redă audio"
                                          >
                                            <Volume2 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => toggleLike(e, call.conversation_id)}
                                            className={`h-7 w-7 p-0 ${likes[call.conversation_id] ? "text-[#C4554D]" : "text-[#787774]"} hover:text-[#C4554D] hover:bg-[#F1F1EF]`}
                                          >
                                            <Heart
                                              className={`h-3.5 w-3.5 ${likes[call.conversation_id] ? "fill-current" : ""}`}
                                            />
                                          </Button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-7 w-7 p-0 text-[#787774] hover:text-[#373530] hover:bg-[#F1F1EF]"
                                                title="Descarcă"
                                              >
                                                <Download className="h-3.5 w-3.5" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleConversationClick(call.conversation_id);
                                                }}
                                              >
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Vezi toate detaliile
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  // Download transcript using extractTranscript function
                                                  const transcriptText = extractTranscript(call.conversation_id, call.dialog_json) || "Transcript nu este disponibil";
                                                  const blob = new Blob([transcriptText.replace(/ \| /g, '\n\n')], { type: 'text/plain' });
                                                  const url = URL.createObjectURL(blob);
                                                  const a = document.createElement('a');
                                                  a.href = url;
                                                  a.download = `transcript_${call.contact_name || 'unknown'}_${call.conversation_id?.slice(0, 8)}.txt`;
                                                  a.click();
                                                  URL.revokeObjectURL(url);
                                                }}
                                              >
                                                <FileText className="h-4 w-4 mr-2" />
                                                Descarcă Transcript (.txt)
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  // Download audio using Supabase function
                                                  try {
                                                    toast({
                                                      title: "Se descarcă...",
                                                      description: "Audio se descarcă, te rog așteaptă"
                                                    });
                                                    
                                                    const { data, error } = await supabase.functions.invoke('get-conversation-audio', {
                                                      body: { conversationId: call.conversation_id }
                                                    });

                                                    if (error) throw error;
                                                    if (!data?.audioUrl) {
                                                      throw new Error(data?.message || 'Audio indisponibil');
                                                    }

                                                    // Fetch the audio and download it
                                                    const response = await fetch(data.audioUrl);
                                                    if (!response.ok) throw new Error('Nu s-a putut descărca audio-ul');
                                                    
                                                    const blob = await response.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `audio_${call.contact_name || 'unknown'}_${call.conversation_id?.slice(0, 8)}.mp3`;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                    
                                                    toast({
                                                      title: "Descărcare completă",
                                                      description: "Audio a fost descărcat cu succes"
                                                    });
                                                  } catch (err: any) {
                                                    toast({
                                                      title: "Eroare",
                                                      description: err.message || "Nu s-a putut descărca audio-ul",
                                                      variant: "destructive"
                                                    });
                                                  }
                                                }}
                                              >
                                                <Volume2 className="h-4 w-4 mr-2" />
                                                Descarcă Audio (.mp3)
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                );
                              case "ai_concluzie":
                                // ✅ FIX: Parsing mai robust pentru concluzie
                                let conclusionText = "-";
                                try {
                                  let analysisData = call.custom_analysis_data;
                                  
                                  // Dacă e string, parsează-l
                                  if (typeof analysisData === 'string' && analysisData.trim()) {
                                    try {
                                      analysisData = JSON.parse(analysisData);
                                    } catch {
                                      // Nu e JSON valid, continuă
                                    }
                                  }
                                  
                                  if (analysisData && typeof analysisData === 'object' && (analysisData as any).concluzie) {
                                    conclusionText = (analysisData as any).concluzie;
                                  } else if (call.analysis_conclusion) {
                                    // Fallback: parse from old format
                                    const match = call.analysis_conclusion.match(
                                      /Concluzie:\s*(.+?)(?=Tag-uri:|Scor:|$)/is,
                                    );
                                    if (match) {
                                      conclusionText = match[1].trim();
                                    } else {
                                      conclusionText = call.analysis_conclusion;
                                    }
                                  }
                                } catch {}
                                return (
                                  <td
                                    key="ai_concluzie"
                                    className="px-3 py-1 text-sm border-r border-[#EBEAE9] text-left group"
                                    style={{
                                      width: `${columnWidths.ai_concluzie}px`,
                                      minWidth: `${columnWidths.ai_concluzie}px`,
                                      maxWidth: `${columnWidths.ai_concluzie}px`,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div className="truncate cursor-default" title={conclusionText}>
                                      {conclusionText}
                                    </div>
                                  </td>
                                );
                              case "ai_taguri":
                                // Try custom_analysis_data first, fallback to parsing analysis_conclusion
                                let tags: string[] = [];
                                try {
                                  // custom_analysis_data can be object or string
                                  let analysis2 = call.custom_analysis_data;
                                  if (typeof analysis2 === 'string') {
                                    analysis2 = JSON.parse(analysis2);
                                  }
                                  if (analysis2?.taguri && Array.isArray(analysis2.taguri)) {
                                    tags = analysis2.taguri;
                                  } else if (call.analysis_conclusion) {
                                    // Fallback: parse from old format
                                    const match = call.analysis_conclusion.match(/Tag-uri:\s*(.+?)(?=Scor:|$)/is);
                                    if (match) {
                                      tags = match[1]
                                        .split(",")
                                        .map((t) => t.trim())
                                        .filter((t) => t.length > 0);
                                    }
                                  }
                                } catch {}
                                return (
                                  <td
                                    key="ai_taguri"
                                    className="px-3 py-1 text-sm border-r border-[#EBEAE9] text-left whitespace-nowrap overflow-hidden"
                                    style={{
                                      width: `${columnWidths.ai_taguri}px`,
                                      minWidth: `${columnWidths.ai_taguri}px`,
                                      maxWidth: `${columnWidths.ai_taguri}px`,
                                    }}
                                  >
                                    <EditableTagsCell
                                      tags={tags}
                                      callId={call.id}
                                      customAnalysisData={call.custom_analysis_data}
                                    />
                                  </td>
                                );
                              case "ai_scor":
                                // ✅ FIX: Parsing mai robust pentru scor
                                let scor: number | null = null;
                                try {
                                  // 1. Încearcă din custom_analysis_data
                                  let analysisData = call.custom_analysis_data;
                                  
                                  // Dacă e string, parsează-l
                                  if (typeof analysisData === 'string' && analysisData.trim()) {
                                    try {
                                      analysisData = JSON.parse(analysisData);
                                    } catch {
                                      // Nu e JSON valid, continuă
                                    }
                                  }
                                  
                                  // Extrage scor (poate fi scor sau score)
                                  if (analysisData && typeof analysisData === 'object') {
                                    const rawScor = (analysisData as any).scor || (analysisData as any).score;
                                    if (rawScor !== undefined && rawScor !== null) {
                                      scor = typeof rawScor === 'string' ? parseInt(rawScor, 10) : Number(rawScor);
                                    }
                                  }
                                  
                                  // 2. Fallback: caută în analysis_conclusion
                                  if (scor === null && call.analysis_conclusion) {
                                    const match = call.analysis_conclusion.match(/Scor:\s*(\d+)/i);
                                    if (match) {
                                      scor = parseInt(match[1], 10);
                                    }
                                  }
                                  
                                  // Validare: scor trebuie să fie valid
                                  if (scor !== null && (isNaN(scor) || scor < 0 || scor > 100)) {
                                    scor = null;
                                  }
                                } catch {}
                                
                                const getScorStyle = (s: number | null) => {
                                  if (s === null) return "";
                                  if (s >= 80) return "px-2 py-0.5 text-xs font-medium rounded-sm bg-[#DBEDDB] text-[#1E5631]";
                                  if (s >= 60) return "px-2 py-0.5 text-xs font-medium rounded-sm bg-[#D3E5EF] text-[#183A4D]";
                                  if (s >= 40) return "px-2 py-0.5 text-xs font-medium rounded-sm bg-[#FDE8D7] text-[#7D4E24]";
                                  return "px-2 py-0.5 text-xs font-medium rounded-sm bg-[#FFE2DD] text-[#93370D]";
                                };
                                
                                return (
                                  <td
                                    key="ai_scor"
                                    className="px-3 py-1 text-sm border-r border-[#EBEAE9] text-center whitespace-nowrap"
                                    style={{
                                      width: `${columnWidths.ai_scor}px`,
                                      minWidth: `${columnWidths.ai_scor}px`,
                                      maxWidth: `${columnWidths.ai_scor}px`,
                                    }}
                                  >
                                    {scor !== null ? (
                                      <span className={getScorStyle(scor)}>{scor}</span>
                                    ) : (
                                      <span className="text-[#787774] text-xs">-</span>
                                    )}
                                  </td>
                                );
                              default:
                                // Check if it's a custom column
                                const customColumn = customColumns.find((col) => col.id === columnId);
                                if (customColumn) {
                                  const value = customColumnValues[call.conversation_id || call.id]?.[columnId] || "";
                                  return (
                                    <td
                                      key={columnId}
                                      className="px-3 py-1 text-sm border-r border-[#EBEAE9] text-left"
                                      style={{
                                        width: `${columnWidths[columnId] || 150}px`,
                                        minWidth: `${columnWidths[columnId] || 150}px`,
                                        maxWidth: `${columnWidths[columnId] || 150}px`,
                                        overflow: "hidden",
                                      }}
                                    >
                                      {customColumn.type === "select" ? (
                                        <Select
                                          value={value}
                                          onValueChange={(newValue) => {
                                            handleUpdateCustomColumnValue(
                                              call.conversation_id || call.id,
                                              columnId,
                                              newValue,
                                            );
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-xs border-none bg-transparent hover:bg-muted/50 w-full">
                                            <SelectValue placeholder="Selectează..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {customColumn.options?.map((option) => (
                                              <SelectItem key={option} value={option} className="text-xs">
                                                {option}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input
                                          type={customColumn.type === "number" ? "number" : "text"}
                                          value={value}
                                          onChange={(e) => {
                                            handleUpdateCustomColumnValue(
                                              call.conversation_id || call.id,
                                              columnId,
                                              e.target.value,
                                            );
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-7 text-xs border-none bg-transparent hover:bg-muted/50 focus:bg-white focus:border-border w-full"
                                          placeholder={`Adaugă ${customColumn.name.toLowerCase()}...`}
                                          style={{ maxWidth: "100%" }}
                                        />
                                      )}
                                    </td>
                                  );
                                }
                                return null;
                            }
                          };
                          const rowSelected = isRowSelected(call.id);
                          return (
                            <tr
                              key={call.id}
                              className={`group/row cursor-pointer border-b border-[#EBEAE9] transition-colors duration-150 ${
                                rowSelected 
                                  ? 'bg-[#E8F4FC] hover:bg-[#D3EAFC]' 
                                  : 'bg-white hover:bg-[#F1F1EF]'
                              }`}
                              onClick={() => call.conversation_id && handleConversationClick(call.conversation_id)}
                            >
                              {/* Selection checkbox cell - wider for better visibility */}
                              <td
                                className="w-12 px-2 py-1 sticky left-0 z-10 relative"
                                style={{
                                  width: '48px',
                                  minWidth: '48px',
                                  backgroundColor: rowSelected ? '#E8F4FC' : 'white'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Shadow overlay that appears on horizontal scroll */}
                                {isHorizontallyScrolled && (
                                  <div 
                                    className="absolute top-0 right-0 bottom-0 w-[4px] pointer-events-none"
                                    style={{ 
                                      transform: 'translateX(100%)',
                                      background: 'linear-gradient(to right, rgba(0,0,0,0.08), transparent)'
                                    }}
                                  />
                                )}
                                <div className={`flex items-center justify-center pl-2 transition-opacity duration-100 ${
                                  rowSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
                                }`}>
                                  <Checkbox
                                    checked={rowSelected}
                                    onCheckedChange={() => toggleRowSelection(call.id)}
                                    className="h-[14px] w-[14px] rounded-[2px] border-[#CDCCC8] data-[state=checked]:bg-[#2383E2] data-[state=checked]:border-[#2383E2]"
                                  />
                                </div>
                              </td>
                              {columnOrder.map((columnId) => renderCell(columnId))}
                            </tr>
                          );
                        })
                      )}
                      
                      {/* Loading state - Skeleton rows */}
                      {isLoading && Array.from({ length: 10 }).map((_, rowIndex) => (
                        <tr key={`skeleton-${rowIndex}`} className="border-b border-[#E8E8E7]">
                          {/* Checkbox + Like column skeleton */}
                          <td
                            className="px-3 py-3 sticky left-0 z-20 bg-white"
                            style={{ width: '60px', minWidth: '60px' }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </td>
                          {/* Dynamic columns skeleton */}
                          {columnOrder.filter(col => visibleColumns[col]).map((columnId) => (
                            <td
                              key={`skeleton-${rowIndex}-${columnId}`}
                              className="px-4 py-3"
                              style={{
                                width: `${columnWidths[columnId] || 150}px`,
                                minWidth: `${columnWidths[columnId] || 150}px`
                              }}
                            >
                              {/* Different skeleton shapes based on column type */}
                              {columnId === 'status' ? (
                                <div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                              ) : columnId === 'ai_scor' ? (
                                <div className="w-10 h-5 bg-gray-200 rounded animate-pulse"></div>
                              ) : columnId === 'ai_taguri' ? (
                                <div className="flex gap-1">
                                  <div className="w-12 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                                  <div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                                </div>
                              ) : columnId === 'actions' ? (
                                <div className="flex gap-2">
                                  <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              ) : columnId === 'conclusion' || columnId === 'ai_concluzie' || columnId === 'comments' ? (
                                <div className="space-y-1">
                                  <div className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: '90%' }}></div>
                                  <div className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: '60%' }}></div>
                                </div>
                              ) : (
                                <div
                                  className="h-4 bg-gray-200 rounded animate-pulse"
                                  style={{ width: `${Math.floor(Math.random() * 30) + 50}%` }}
                                ></div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Empty state când nu sunt conversații */}
                      {!isLoading && paginatedCalls.length === 0 && (
                        <tr>
                          <td colSpan={columnOrder.filter(col => visibleColumns[col]).length + 1} className="py-12">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <p className="text-sm text-[#787774]">Nu există conversații care să corespundă filtrelor aplicate</p>
                              {hasActiveFilters && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={clearAllFilters}
                                  className="text-xs"
                                >
                                  Șterge toate filtrele
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </DndContext>
                </div>
              </div>
            </div>

            {/* Pagination Controls - Fixat jos, centrat, z-index mai mic decât sidebar */}
            {totalPages > 1 && (
              <div className="fixed bottom-0 left-64 right-0 z-30 bg-white border-t border-zinc-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <div className="px-4 py-2 flex items-center justify-center gap-4">
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    Pagina {currentPage} din {totalPages}
                  </div>

                  <Pagination className="mx-0 w-auto">
                    <PaginationContent className="gap-0.5">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={`h-7 px-2 text-xs ${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                        />
                      </PaginationItem>

                      {/* Page numbers */}
                      {Array.from(
                        {
                          length: Math.min(5, totalPages),
                        },
                        (_, i) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNumber)}
                                isActive={currentPage === pageNumber}
                                className="cursor-pointer h-7 w-7 text-xs"
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        },
                      )}

                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <PaginationItem>
                            <PaginationEllipsis className="h-7 w-7" />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer h-7 w-7 text-xs">
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          className={`h-7 px-2 text-xs ${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Detail Sidebar */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="right" className="w-full sm:w-[800px] sm:max-w-[90vw] p-0">
            <SheetHeader className="p-6 border-b">
              <SheetTitle>Detalii Conversație</SheetTitle>
            </SheetHeader>
            {selectedConversationId && <ConversationDetailSidebar conversationId={selectedConversationId} />}
          </SheetContent>
        </Sheet>
      </div>

    </DashboardLayout>
  );
};
export default ConversationAnalytics;
