import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ZohoContact {
  id: string;
  zoho_id: string;
  zoho_module: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
  account_name: string | null;
  title: string | null;
  lead_status: string | null;
  lead_source: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  street: string | null;
  zip_code: string | null;
  website: string | null;
  industry: string | null;
  annual_revenue: number | null;
  number_of_employees: number | null;
  description: string | null;
  created_at: string;
  last_synced_at: string | null;
  // Additional fields for all modules
  deal_amount: number | null;
  deal_stage: string | null;
  deal_probability: number | null;
  task_subject: string | null;
  task_due_date: string | null;
  task_priority: string | null;
  task_status: string | null;
  account_type: string | null;
  rating: string | null;
  owner_name: string | null;
  owner_email: string | null;
  [key: string]: any;
}

const ITEMS_PER_PAGE_OPTIONS = [50, 100, 200];

const getStatusBadgeVariant = (status: string | null) => {
  if (!status) return "secondary";
  switch (status.toLowerCase()) {
    case "new lead":
      return "default";
    case "pre-qualified":
      return "secondary";
    case "qualified":
      return "default";
    case "junk lead":
      return "destructive";
    default:
      return "secondary";
  }
};

export function ZohoContactsTable() {
  const { user } = useAuth();
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Drag-to-scroll refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Fetch all contacts
  const { data: contacts, isLoading } = useQuery({
    queryKey: ["zoho-contacts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("zoho_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ZohoContact[];
    },
    enabled: !!user?.id,
  });

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    if (!contacts) return [];
    const statuses = new Set(
      contacts
        .map((c) => c.lead_status)
        .filter((s): s is string => s !== null)
    );
    return Array.from(statuses).sort();
  }, [contacts]);

  // Filter and search
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    return contacts.filter((contact) => {
      // Module filter
      if (moduleFilter !== "all" && contact.zoho_module !== moduleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && contact.lead_status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          contact.full_name?.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.phone?.toLowerCase().includes(query) ||
          contact.mobile?.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query) ||
          contact.account_name?.toLowerCase().includes(query) ||
          contact.task_subject?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [contacts, moduleFilter, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Module counts for all modules
  const moduleCounts = useMemo(() => {
    if (!contacts) return { Leads: 0, Contacts: 0, Accounts: 0, Deals: 0, Tasks: 0 };
    return contacts.reduce(
      (acc, contact) => {
        const module = contact.zoho_module || 'Contacts';
        acc[module as keyof typeof acc] = (acc[module as keyof typeof acc] || 0) + 1;
        return acc;
      },
      { Leads: 0, Contacts: 0, Accounts: 0, Deals: 0, Tasks: 0 }
    );
  }, [contacts]);

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header - Stats & Filters */}
      <div className="flex-shrink-0 space-y-4 pb-4">
        {/* Stats - compact row with all modules */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border text-sm">
            <span className="font-bold">{filteredContacts.length}</span>
            <span className="text-xs text-muted-foreground">Afișat</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm">
            <span className="font-bold text-purple-600">{moduleCounts.Leads}</span>
            <span className="text-xs text-muted-foreground">Leads</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
            <span className="font-bold text-blue-600">{moduleCounts.Contacts}</span>
            <span className="text-xs text-muted-foreground">Contacts</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
            <span className="font-bold text-green-600">{moduleCounts.Accounts}</span>
            <span className="text-xs text-muted-foreground">Accounts</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
            <span className="font-bold text-amber-600">{moduleCounts.Deals}</span>
            <span className="text-xs text-muted-foreground">Deals</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-sm">
            <span className="font-bold text-cyan-600">{moduleCounts.Tasks}</span>
            <span className="text-xs text-muted-foreground">Tasks</span>
          </div>
        </div>

        {/* Filters - compact row */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Caută..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFilterChange();
              }}
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={moduleFilter}
            onValueChange={(value) => {
              setModuleFilter(value);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Modul" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="Leads">Leads</SelectItem>
              <SelectItem value="Contacts">Contacts</SelectItem>
              <SelectItem value="Accounts">Accounts</SelectItem>
              <SelectItem value="Deals">Deals</SelectItem>
              <SelectItem value="Tasks">Tasks</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate statusurile</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(parseInt(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option} / pag
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto overflow-y-auto border border-[#EBEAE9] rounded-lg bg-white cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-sm"
        style={{ 
          width: 'calc(100vw - 16rem - 4rem)',
          maxWidth: '100%',
          maxHeight: "calc(100vh - 340px)",
          WebkitOverflowScrolling: "touch",
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <table 
          className="border-collapse bg-white"
          style={{ minWidth: "1800px", tableLayout: "fixed" }}
        >
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F7F6F3] border-b border-[#EBEAE9]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider border-r border-[#EBEAE9] whitespace-nowrap" style={{ width: "90px" }}>Modul</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider border-r border-[#EBEAE9] whitespace-nowrap" style={{ width: "180px" }}>Nume</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider border-r border-[#EBEAE9] whitespace-nowrap" style={{ width: "220px" }}>Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider border-r border-[#EBEAE9] whitespace-nowrap" style={{ width: "130px" }}>Telefon</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider border-r border-[#EBEAE9] whitespace-nowrap" style={{ width: "200px" }}>Companie</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider border-r border-[#EBEAE9] whitespace-nowrap" style={{ width: "150px" }}>Poziție</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider border-r border-[#EBEAE9] whitespace-nowrap" style={{ width: "120px" }}>Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider border-r border-[#EBEAE9] whitespace-nowrap" style={{ width: "100px" }}>Oraș</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[#787774] uppercase tracking-wider whitespace-nowrap" style={{ width: "100px" }}>Țară</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#787774]">
                    Niciun contact găsit
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-[#EBEAE9] hover:bg-[#F7F6F3] transition-colors">
                    <td className="px-4 py-2 text-sm border-r border-[#EBEAE9] whitespace-nowrap">
                      <Badge variant="outline">{contact.zoho_module}</Badge>
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-[#373530] border-r border-[#EBEAE9] whitespace-nowrap">{contact.full_name || contact.task_subject || "-"}</td>
                    <td className="px-4 py-2 text-sm text-[#787774] border-r border-[#EBEAE9] whitespace-nowrap">{contact.email || "-"}</td>
                    <td className="px-4 py-2 text-sm text-[#373530] border-r border-[#EBEAE9] whitespace-nowrap">{contact.phone || contact.mobile || "-"}</td>
                    <td className="px-4 py-2 text-sm text-[#373530] border-r border-[#EBEAE9] whitespace-nowrap">{contact.company || contact.account_name || "-"}</td>
                    <td className="px-4 py-2 text-sm text-[#787774] border-r border-[#EBEAE9] whitespace-nowrap">{contact.title || "-"}</td>
                    <td className="px-4 py-2 text-sm border-r border-[#EBEAE9] whitespace-nowrap">
                      {contact.lead_status || contact.task_status || contact.deal_stage ? (
                        <Badge variant={getStatusBadgeVariant(contact.lead_status)}>
                          {contact.lead_status || contact.task_status || contact.deal_stage}
                        </Badge>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-[#373530] border-r border-[#EBEAE9] whitespace-nowrap">{contact.city || "-"}</td>
                    <td className="px-4 py-2 text-sm text-[#373530] whitespace-nowrap">{contact.country || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* Fixed Footer - Pagination */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Pag. {currentPage}/{totalPages} ({filteredContacts.length} rezultate)
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-8 w-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
