import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Sparkles,
  Globe,
  Pencil,
  GitBranch,
  Code,
  Users,
  Zap,
  ArrowRight,
  Bot,
  Database,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  Webhook,
  MessageCircle,
  FileText,
  Music,
  History,
  Building,
  DollarSign,
  Package,
  FileCheck,
  ShoppingCart,
  Truck,
  Receipt,
  Clock,
  MapPin
} from 'lucide-react';
import {
  TelegramIcon,
  ZohoCRMIcon,
  GoogleSheetsIcon,
  GroqIcon,
  RAGIcon,
  KalinaIcon,
  HTTPIcon,
  WebhookIcon,
  RespondToWebhookIcon,
  CodeIcon,
  ManualTriggerIcon,
  ScheduleIcon,
  WaitIcon,
  CallHistoryIcon,
  PhoneIcon,
  InfobipEmailIcon,
  InfobipSMSIcon,
  AltegioIcon,
  OdooIcon,
  AmoCRMIcon,
  Bitrix24Icon,
  Scraper999Icon,
  SplitOutIcon,
  LoopIcon,
} from './BrandIcons';

interface NodeCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
}

interface NodeOption {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
}

const categories: NodeCategory[] = [
  { id: 'triggers', name: 'Triggers', description: 'Start your workflow with a trigger event', icon: Zap },
  { id: 'ai', name: 'AI', description: 'Build autonomous agents, summarize or search documents, etc.', icon: GroqIcon },
  { id: 'action', name: 'Action in an app', description: 'Do something in an app or service like Google Sheets, Telegram or Notion', icon: Globe },
  { id: 'data', name: 'Data transformation', description: 'Manipulate, filter or convert data', icon: Pencil },
  { id: 'flow', name: 'Flow', description: 'Branch, merge or loop the flow, etc.', icon: GitBranch },
  { id: 'core', name: 'Core', description: 'Run code, make HTTP requests, set webhooks, etc.', icon: CodeIcon },
  { id: 'human', name: 'Human in the loop', description: 'Wait for approval or human input before continuing', icon: Users },
  { id: 'kalina', name: 'Kalina', description: 'Access call history, agents, leads and more', icon: KalinaIcon },
];

export const nodeOptions: NodeOption[] = [
  // Triggers
  { id: 'manual-trigger', name: 'Manual Trigger', description: 'Start workflow manually with a click', icon: ManualTriggerIcon, category: 'triggers' },
  { id: 'chat-trigger', name: 'Chat Trigger', description: 'Start workflow when chat message received', icon: MessageCircle, category: 'triggers' },
  { id: 'webhook-trigger', name: 'Webhook Trigger', description: 'Start workflow on webhook call', icon: WebhookIcon, category: 'triggers' },
  { id: 'schedule-trigger', name: 'Schedule Trigger', description: 'Start workflow on schedule', icon: ScheduleIcon, category: 'triggers' },
  { id: 'call-completed', name: 'Call Completed', description: 'Trigger when a call is completed', icon: PhoneIcon, category: 'triggers' },
  // Google Sheets Triggers
  { id: 'gsheets-row-added', name: 'On Row Added', description: 'Trigger when a new row is added', icon: GoogleSheetsIcon, category: 'triggers' },
  { id: 'gsheets-row-updated', name: 'On Row Updated', description: 'Trigger when a row is updated', icon: GoogleSheetsIcon, category: 'triggers' },
  { id: 'gsheets-row-added-updated', name: 'On Row Added or Updated', description: 'Trigger on row add or update', icon: GoogleSheetsIcon, category: 'triggers' },
  
  // Kalina
  { id: 'call-history', name: 'Call History', description: 'Get calls from history with filters', icon: CallHistoryIcon, category: 'kalina' },
  { id: 'kalina-call', name: 'Kalina Call', description: 'Inițiază apel cu agentul AI', icon: KalinaIcon, category: 'kalina' },
  { id: 'wait-call-completion', name: 'Wait for Call', description: 'Așteaptă finalizarea apelului și obține transcript', icon: WaitIcon, category: 'kalina' },
  { id: 'get-transcription', name: 'Get Transcription', description: 'Get call transcription', icon: FileText, category: 'kalina' },
  { id: 'get-audio', name: 'Get Audio', description: 'Get call audio file', icon: Music, category: 'kalina' },
  
  // AI
  { id: 'ai-agent', name: 'AI Agent', description: 'Build an autonomous agent', icon: Bot, category: 'ai' },
  { id: 'groq-analysis', name: 'Groq Analysis', description: 'Analizează conversația cu AI Groq', icon: GroqIcon, category: 'ai' },
  { id: 'rag-search', name: 'RAG Search', description: 'Caută informații în baza de cunoștințe RAG', icon: RAGIcon, category: 'ai' },
  { id: 'openai', name: 'OpenAI', description: 'Use GPT models', icon: Sparkles, category: 'ai' },
  { id: 'basic-llm-chain', name: 'Basic LLM Chain', description: 'A simple chain to prompt a large language model', icon: 'link', category: 'ai' },
  { id: 'groq-chat-model', name: 'Groq Chat Model', description: 'Chat model for Groq LLMs', icon: GroqIcon, category: 'ai' },
  
  // Actions
  { id: 'telegram', name: 'Telegram', description: 'Send messages via Telegram', icon: TelegramIcon, category: 'action' },
  { id: 'email', name: 'Email', description: 'Send emails', icon: Mail, category: 'action' },
  // Infobip
  { id: 'infobip-send-email', name: 'Infobip: Send Email', description: 'Trimite email prin Infobip', icon: InfobipEmailIcon, category: 'action' },
  { id: 'infobip-send-sms', name: 'Infobip: Send SMS', description: 'Trimite SMS prin Infobip', icon: InfobipSMSIcon, category: 'action' },
  // amoCRM
  { id: 'amocrm-connect', name: 'amoCRM', description: 'Conectează-ți contul amoCRM prin OAuth', icon: AmoCRMIcon, category: 'action' },
  // Bitrix24
  { id: 'bitrix24', name: 'Bitrix24', description: 'Interact with Bitrix24 CRM - leads, deals, contacts, companies', icon: Bitrix24Icon, category: 'action' },
  { id: 'bitrix24-trigger', name: 'Bitrix24 Trigger', description: 'Trigger workflow on Bitrix24 events', icon: Bitrix24Icon, category: 'triggers' },
  // Altegio
  {
    id: 'altegio',
    name: 'Altegio API',
    description: 'List, create, update or cancel bookings plus staff/services/branches.',
    icon: AltegioIcon,
    category: 'action',
  },
  { id: 'altegio-webhook', name: 'Altegio: Webhook Trigger', description: 'Trigger workflow on Altegio events', icon: AltegioIcon, category: 'triggers' },
  // Odoo
  { id: 'odoo-search-read', name: 'Odoo: Search Records', description: 'Find records via domain filters (search_read)', icon: OdooIcon, category: 'action' },
  { id: 'odoo-get-record', name: 'Odoo: Get Record', description: 'Read a single record by ID', icon: OdooIcon, category: 'action' },
  { id: 'odoo-create-record', name: 'Odoo: Create Record', description: 'Create a record in any Odoo model', icon: OdooIcon, category: 'action' },
  { id: 'odoo-update-record', name: 'Odoo: Update Record', description: 'Update one or more records by ID', icon: OdooIcon, category: 'action' },
  { id: 'odoo-delete-record', name: 'Odoo: Delete Record', description: 'Delete records by ID', icon: OdooIcon, category: 'action' },
  { id: 'odoo-get-fields', name: 'Odoo: Get Fields', description: 'Inspect fields for a model (fields_get)', icon: OdooIcon, category: 'action' },
  { id: 'odoo-execute-method', name: 'Odoo: Execute Method', description: 'Call any method via execute_kw', icon: OdooIcon, category: 'action' },
  // Google Sheets Actions
  { id: 'google-sheets', name: 'Google Sheets', description: 'Read/write spreadsheets', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-create-spreadsheet', name: 'Create Spreadsheet', description: 'Create a new spreadsheet', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-delete-spreadsheet', name: 'Delete Spreadsheet', description: 'Delete a spreadsheet', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-append-row', name: 'Append Row', description: 'Create a new row in a sheet', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-append-update-row', name: 'Append or Update Row', description: 'Append or update a row (upsert)', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-clear-sheet', name: 'Clear Sheet', description: 'Delete all contents of a sheet', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-create-sheet', name: 'Create Sheet', description: 'Create a new sheet', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-delete-sheet', name: 'Delete Sheet', description: 'Permanently delete a sheet', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-delete-rows-columns', name: 'Delete Rows or Columns', description: 'Delete rows or columns from a sheet', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-get-rows', name: 'Get Row(s)', description: 'Retrieve rows from a sheet', icon: GoogleSheetsIcon, category: 'action' },
  { id: 'gsheets-update-row', name: 'Update Row', description: 'Update an existing row', icon: GoogleSheetsIcon, category: 'action' },
  
  { id: 'phone-call', name: 'Make Call', description: 'Initiate phone calls', icon: PhoneIcon, category: 'action' },
  { id: 'calendar', name: 'Calendar', description: 'Manage calendar events', icon: Calendar, category: 'action' },
  
  // Zoho CRM - Lead Actions
  { id: 'zoho-create-lead', name: 'Zoho: Create Lead', description: 'Create a new lead in Zoho CRM', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-lead', name: 'Zoho: Create or Update Lead', description: 'Create or update a lead (upsert)', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-lead', name: 'Zoho: Delete Lead', description: 'Delete a lead from Zoho CRM', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-lead', name: 'Zoho: Get Lead', description: 'Get a single lead by ID', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-leads', name: 'Zoho: Get Many Leads', description: 'Get multiple leads with filters', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-lead', name: 'Zoho: Update Lead', description: 'Update an existing lead', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-lead-fields', name: 'Zoho: Get Lead Fields', description: 'Get available fields for leads', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Contact Actions
  { id: 'zoho-create-contact', name: 'Zoho: Create Contact', description: 'Create a new contact', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-contact', name: 'Zoho: Create or Update Contact', description: 'Create or update a contact', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-contact', name: 'Zoho: Delete Contact', description: 'Delete a contact', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-contact', name: 'Zoho: Get Contact', description: 'Get a single contact', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-contacts', name: 'Zoho: Get Many Contacts', description: 'Get multiple contacts', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-contact', name: 'Zoho: Update Contact', description: 'Update a contact', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Account Actions
  { id: 'zoho-create-account', name: 'Zoho: Create Account', description: 'Create a new account', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-account', name: 'Zoho: Create or Update Account', description: 'Create or update an account', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-account', name: 'Zoho: Delete Account', description: 'Delete an account', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-account', name: 'Zoho: Get Account', description: 'Get a single account', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-accounts', name: 'Zoho: Get Many Accounts', description: 'Get multiple accounts', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-account', name: 'Zoho: Update Account', description: 'Update an account', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Deal Actions
  { id: 'zoho-create-deal', name: 'Zoho: Create Deal', description: 'Create a new deal', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-deal', name: 'Zoho: Create or Update Deal', description: 'Create or update a deal', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-deal', name: 'Zoho: Delete Deal', description: 'Delete a deal', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-deal', name: 'Zoho: Get Deal', description: 'Get a single deal', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-deals', name: 'Zoho: Get Many Deals', description: 'Get multiple deals', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-deal', name: 'Zoho: Update Deal', description: 'Update a deal', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Product Actions
  { id: 'zoho-create-product', name: 'Zoho: Create Product', description: 'Create a new product', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-product', name: 'Zoho: Create or Update Product', description: 'Create or update a product', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-product', name: 'Zoho: Delete Product', description: 'Delete a product', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-product', name: 'Zoho: Get Product', description: 'Get a single product', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-products', name: 'Zoho: Get Many Products', description: 'Get multiple products', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-product', name: 'Zoho: Update Product', description: 'Update a product', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Quote Actions
  { id: 'zoho-create-quote', name: 'Zoho: Create Quote', description: 'Create a new quote', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-quote', name: 'Zoho: Create or Update Quote', description: 'Create or update a quote', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-quote', name: 'Zoho: Delete Quote', description: 'Delete a quote', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-quote', name: 'Zoho: Get Quote', description: 'Get a single quote', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-quotes', name: 'Zoho: Get Many Quotes', description: 'Get multiple quotes', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-quote', name: 'Zoho: Update Quote', description: 'Update a quote', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Sales Order Actions
  { id: 'zoho-create-sales-order', name: 'Zoho: Create Sales Order', description: 'Create a new sales order', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-sales-order', name: 'Zoho: Create or Update Sales Order', description: 'Create or update a sales order', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-sales-order', name: 'Zoho: Delete Sales Order', description: 'Delete a sales order', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-sales-order', name: 'Zoho: Get Sales Order', description: 'Get a single sales order', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-sales-orders', name: 'Zoho: Get Many Sales Orders', description: 'Get multiple sales orders', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-sales-order', name: 'Zoho: Update Sales Order', description: 'Update a sales order', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Purchase Order Actions
  { id: 'zoho-create-purchase-order', name: 'Zoho: Create Purchase Order', description: 'Create a new purchase order', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-purchase-order', name: 'Zoho: Create or Update Purchase Order', description: 'Create or update a purchase order', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-purchase-order', name: 'Zoho: Delete Purchase Order', description: 'Delete a purchase order', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-purchase-order', name: 'Zoho: Get Purchase Order', description: 'Get a single purchase order', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-purchase-orders', name: 'Zoho: Get Many Purchase Orders', description: 'Get multiple purchase orders', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-purchase-order', name: 'Zoho: Update Purchase Order', description: 'Update a purchase order', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Invoice Actions
  { id: 'zoho-create-invoice', name: 'Zoho: Create Invoice', description: 'Create a new invoice', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-invoice', name: 'Zoho: Create or Update Invoice', description: 'Create or update an invoice', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-invoice', name: 'Zoho: Delete Invoice', description: 'Delete an invoice', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-invoice', name: 'Zoho: Get Invoice', description: 'Get a single invoice', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-invoices', name: 'Zoho: Get Many Invoices', description: 'Get multiple invoices', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-invoice', name: 'Zoho: Update Invoice', description: 'Update an invoice', icon: ZohoCRMIcon, category: 'action' },
  
  // Zoho CRM - Vendor Actions
  { id: 'zoho-create-vendor', name: 'Zoho: Create Vendor', description: 'Create a new vendor', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-upsert-vendor', name: 'Zoho: Create or Update Vendor', description: 'Create or update a vendor', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-delete-vendor', name: 'Zoho: Delete Vendor', description: 'Delete a vendor', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-vendor', name: 'Zoho: Get Vendor', description: 'Get a single vendor', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-get-many-vendors', name: 'Zoho: Get Many Vendors', description: 'Get multiple vendors', icon: ZohoCRMIcon, category: 'action' },
  { id: 'zoho-update-vendor', name: 'Zoho: Update Vendor', description: 'Update a vendor', icon: ZohoCRMIcon, category: 'action' },
  
  // Core
  { id: 'webhook', name: 'Webhook', description: 'Receive HTTP requests', icon: WebhookIcon, category: 'core' },
  { id: 'respond-to-webhook', name: 'Respond to Webhook', description: 'Send response back to webhook caller', icon: RespondToWebhookIcon, category: 'core' },
  { id: 'http-request', name: 'HTTP Request', description: 'Make HTTP requests', icon: HTTPIcon, category: 'core' },
  { id: 'code', name: 'Code', description: 'Run custom JavaScript', icon: CodeIcon, category: 'core' },

  // 999.md Scraper
  { id: '999-scraper', name: '999.md Scraper', description: 'Extrage anunțuri imobiliare de pe 999.md', icon: Scraper999Icon, category: 'action' },
  
  // Flow
  { id: 'if', name: 'IF', description: 'Branch based on condition', icon: GitBranch, category: 'flow' },
  { id: 'switch', name: 'Switch', description: 'Route to different paths', icon: GitBranch, category: 'flow' },
  { id: 'split-out', name: 'Split Out', description: 'Separă un array în items individuale pentru procesare', icon: SplitOutIcon, category: 'flow' },
  { id: 'loop', name: 'Loop Over Items', description: 'Iterează peste fiecare item din array', icon: LoopIcon, category: 'flow' },

  // Data transformation
  { id: 'merge', name: 'Merge', description: 'Combină datele din mai multe surse', icon: GitBranch, category: 'data' },
  { id: 'filter', name: 'Filter', description: 'Filtrează items bazat pe condiții', icon: Pencil, category: 'data' },
  { id: 'sort', name: 'Sort', description: 'Sortează items după un câmp', icon: Pencil, category: 'data' },
  { id: 'limit', name: 'Limit', description: 'Limitează numărul de items', icon: Pencil, category: 'data' },
  { id: 'city-lookup', name: 'City Lookup', description: 'Caută ID-uri de locații din nume de orașe', icon: MapPin, category: 'data' },
  { id: 'galltrans-routes', name: 'Galltrans Routes', description: 'Caută rute de transport (autobus, tren) între orașe', icon: Truck, category: 'data' },
];

interface N8NNodeSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (node: NodeOption) => void;
  position?: { x: number; y: number };
}

export const N8NNodeSearch: React.FC<N8NNodeSearchProps> = ({
  isOpen,
  onClose,
  onSelectNode,
  position
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Debug: see if nodeOptions is available at runtime
  console.log('N8NNodeSearch nodeOptions length:', nodeOptions.length);

  const filteredNodes = searchQuery
    ? nodeOptions.filter(node => 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selectedCategory
    ? nodeOptions.filter(node => node.category === selectedCategory)
    : [];

  const showCategories = !searchQuery && !selectedCategory;

  // Category icon colors
  const categoryIconColors: Record<string, string> = {
    triggers: 'text-emerald-400',
    ai: 'text-purple-400',
    action: 'text-blue-400',
    data: 'text-amber-400',
    flow: 'text-cyan-400',
    core: 'text-orange-400',
    human: 'text-pink-400',
    kalina: 'text-rose-400',
  };

  // Helper to render icon with color
  const renderIcon = (IconComponent: any, size: number = 18, categoryId?: string) => {
    // Check if it's a brand icon (custom SVG component that accepts size prop)
    const isBrandIcon = IconComponent.toString().includes('size') || 
                        ['TelegramIcon', 'ZohoCRMIcon', 'GoogleSheetsIcon', 'GroqIcon', 'KalinaIcon', 
                         'HTTPIcon', 'WebhookIcon', 'CodeIcon', 'ManualTriggerIcon', 'ScheduleIcon',
                         'WaitIcon', 'CallHistoryIcon', 'PhoneIcon'].some(name => 
                           IconComponent.name === name || IconComponent.displayName === name
                         );
    
    if (isBrandIcon) {
      return <IconComponent size={size} />;
    }
    // Lucide icon - add color based on category
    const colorClass = categoryId ? categoryIconColors[categoryId] || 'text-slate-300' : 'text-slate-300';
    return <IconComponent style={{ width: `${size}px`, height: `${size}px` }} className={colorClass} />;
  };

  return (
    <div 
      ref={panelRef}
      className="fixed z-50 overflow-hidden"
      style={{
        width: '340px',
        maxHeight: '500px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #333',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        left: position?.x ? `${position.x}px` : '50%',
        top: position?.y ? `${position.y}px` : '50%',
        transform: position ? 'none' : 'translate(-50%, -50%)',
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-[#2a2a2a]">
        <div className="text-sm font-medium text-white mb-2">Add node</div>
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" 
            style={{ width: '16px', height: '16px' }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedCategory(null);
            }}
            className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#555]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight: '400px' }}
      >
        {showCategories ? (
          // Show categories
          <div className="py-2">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#252525] transition-colors"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div 
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{ width: '32px', height: '32px' }}
                  >
                    {renderIcon(IconComponent, 24, category.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{category.name}</div>
                    <div className="text-xs text-slate-500 truncate">{category.description}</div>
                  </div>
                  <ArrowRight className="text-slate-500" style={{ width: '16px', height: '16px' }} />
                </div>
              );
            })}
          </div>
        ) : (
          // Show nodes
          <div className="py-2">
            {selectedCategory && !searchQuery && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowRight className="rotate-180" style={{ width: '14px', height: '14px' }} />
                Back to categories
              </button>
            )}
            {filteredNodes.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No nodes found
              </div>
            ) : (
              filteredNodes.map((node) => {
                const IconComponent = node.icon;
                return (
                  <div
                    key={node.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#252525] transition-colors"
                    onClick={() => {
                      onSelectNode(node);
                      onClose();
                    }}
                  >
                    <div 
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{ width: '28px', height: '28px' }}
                    >
                      {renderIcon(IconComponent, 22, node.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white">{node.name}</div>
                      <div className="text-xs text-slate-500 truncate">{node.description}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
