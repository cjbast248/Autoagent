import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Copy, Save, Loader2, ExternalLink, Wand2, X, Plus, Image, Trash2, ChevronRight, Pencil, Globe, Download, MessageSquare, Settings, ShoppingBag, Users, Phone, MapPin, FileText, GripVertical, Eye, EyeOff, Check, Clock, XCircle, Package, Monitor, Smartphone, Mic, Volume2, ArrowLeft, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WidgetSettings, defaultWidgetSettings } from '@/components/chat-widget/WidgetCustomizer';
import WidgetPreview from '@/components/chat-widget/WidgetPreview';
import { useAuth } from '@/components/AuthContext';
import { CheckoutField, WidgetLead, CartItem } from '@/types/dtos';

type TabType = 'agent' | 'conversations' | 'leads';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface WidgetConfig {
  id: string;
  widget_id: string;
  name: string;
  system_prompt: string;
  welcome_message: string;
  assistant_name: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  bubble_style: string;
  position: string;
  animation_type: string;
  is_active: boolean;
  scrape_website_url?: string;
  scrape_enabled?: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number | null;
  currency: string;
  attributes: Record<string, any>;
  is_active: boolean;
  sort_order: number;
}

interface Conversation {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  metadata?: {
    user_agent?: string;
    page_url?: string;
  };
}

const ChatWidgetSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('agent');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful website assistant. Help users with questions about the website.'
  );
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(defaultWidgetSettings);

  // Product catalog state
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    image_url: '',
    price: '',
    currency: 'RON',
    attributes: ''
  });

  // Import from URL state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [scrapedProducts, setScrapedProducts] = useState<any[]>([]);
  const [selectedScrapedProducts, setSelectedScrapedProducts] = useState<Set<number>>(new Set());

  // Live scraping state
  const [scrapeEnabled, setScrapeEnabled] = useState(false);
  const [scrapeWebsiteUrl, setScrapeWebsiteUrl] = useState('');


  // Checkout & Cart settings
  const [cartEnabled, setCartEnabled] = useState(true);
  const [checkoutFields, setCheckoutFields] = useState<CheckoutField[]>([
    { id: 'name', label: 'Name', type: 'text', required: false, enabled: true, placeholder: 'Enter your name' },
    { id: 'phone', label: 'Phone', type: 'tel', required: true, enabled: true, placeholder: '+1 XXX XXX XXXX' },
    { id: 'address', label: 'Address', type: 'textarea', required: false, enabled: true, placeholder: 'Enter your delivery address' },
    { id: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: false, placeholder: 'Additional notes (optional)' }
  ]);
  const [checkoutButtonText, setCheckoutButtonText] = useState('Complete Order');
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState('Thank you for your order! We will contact you shortly.');

  // Voice settings state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceAgentId, setVoiceAgentId] = useState<string>('');
  const [voiceId, setVoiceId] = useState<string>('');
  const [voiceLanguage, setVoiceLanguage] = useState('ro');
  const [voiceFirstMessage, setVoiceFirstMessage] = useState('');
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: string; name: string; elevenlabs_agent_id: string | null }>>([]);

  // Leads state
  const [leads, setLeads] = useState<WidgetLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<WidgetLead | null>(null);
  const [leadsFilter, setLeadsFilter] = useState<'all' | 'new' | 'processing' | 'completed' | 'cancelled'>('all');
  const [newLeadsCount, setNewLeadsCount] = useState(0);

  // Preview mode state
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Function to parse message content and render product cards in gallery grid
  const renderMessageContent = (content: string) => {
    // Parse [PRODUCT:id] tags
    const productRegex = /\[PRODUCT:([a-f0-9-]+)\]/gi;
    const textParts: React.ReactNode[] = [];
    const productCards: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = productRegex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index).trim();
        if (textContent) {
          textParts.push(<p key={`text-${lastIndex}`} className="text-zinc-600 mb-2">{textContent}</p>);
        }
      }

      // Find the product
      const productId = match[1];
      const product = products.find(p => p.id === productId);

      if (product) {
        productCards.push(
          <div
            key={`product-${productId}-${match.index}`}
            className="group bg-white border border-zinc-200 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-zinc-300 hover:z-10 relative"
          >
            {/* Image Box */}
            <div className="h-36 w-full relative bg-zinc-100">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-zinc-300" />
                </div>
              )}
              {/* Popular badge - show for first product in each batch */}
              {productCards.length === 0 && (
                <div className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold px-2 py-1 rounded">
                  POPULAR
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-3">
              <h4 className="font-bold text-[13px] text-zinc-900 mb-1.5 leading-tight line-clamp-2">
                {product.name}
              </h4>

              {/* Footer with price and arrow */}
              <div className="flex justify-between items-center mt-2">
                <span className="font-mono text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                  {product.price ? `${product.price} ${product.currency || 'MDL'}` : 'Preț la cerere'}
                </span>
                <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center transition-colors group-hover:bg-black group-hover:text-white">
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex).trim();
      if (remainingText) {
        textParts.push(<p key={`text-end-${lastIndex}`} className="text-xs text-zinc-400 mt-3">{remainingText}</p>);
      }
    }

    // If we have products, render as gallery grid
    if (productCards.length > 0) {
      return (
        <div>
          {textParts.filter((_, i) => i === 0)}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {productCards}
          </div>
          {textParts.filter((_, i) => i > 0)}
        </div>
      );
    }

    // No products found, return original content
    return content;
  };

  useEffect(() => {
    if (user) {
      loadWidgetConfig();
      // Load user permissions from profile
      const loadUserPermissions = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) {

        }
      };
      loadUserPermissions();
      // Load available agents for voice selection
      const loadAgents = async () => {
        const { data: agents, error } = await supabase
          .from('kalina_agents')
          .select('id, name, elevenlabs_agent_id')
          .eq('user_id', user.id)
          .order('name');
        if (!error && agents) {
          setAvailableAgents(agents);
        }
      };
      loadAgents();
    }
  }, [user]);

  useEffect(() => {
    if (widgetConfig?.id) {
      console.log('🔄 Widget config loaded, triggering data loads. widget_config_id:', widgetConfig.id);
      loadProducts();
      loadConversations();
      loadLeads();
    }
  }, [widgetConfig?.id]);

  // Real-time subscription for conversations
  useEffect(() => {
    if (!widgetConfig?.id) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_widget_conversations',
          filter: `widget_config_id=eq.${widgetConfig.id}`
        },
        (payload) => {
          console.log('Real-time update:', payload);

          if (payload.eventType === 'INSERT') {
            // New conversation
            setConversations(prev => [payload.new as Conversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            // Updated conversation (new messages)
            setConversations(prev =>
              prev.map(conv =>
                conv.id === (payload.new as Conversation).id
                  ? payload.new as Conversation
                  : conv
              )
            );
            // Also update selected conversation if it's the one being updated
            setSelectedConversation(prev =>
              prev?.id === (payload.new as Conversation).id
                ? payload.new as Conversation
                : prev
            );
          } else if (payload.eventType === 'DELETE') {
            // Deleted conversation
            setConversations(prev =>
              prev.filter(conv => conv.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [widgetConfig?.id]);

  // Real-time subscription for leads
  useEffect(() => {
    if (!widgetConfig?.id) return;

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widget_leads',
          filter: `widget_config_id=eq.${widgetConfig.id}`
        },
        (payload) => {
          console.log('Lead real-time update:', payload);

          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as WidgetLead;
            setLeads(prev => [newLead, ...prev]);
            if (newLead.status === 'new') {
              setNewLeadsCount(prev => prev + 1);
              toast.success('🛒 Comandă nouă primită!');
            }
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev =>
              prev.map(lead =>
                lead.id === (payload.new as WidgetLead).id
                  ? payload.new as WidgetLead
                  : lead
              )
            );
            setSelectedLead(prev =>
              prev?.id === (payload.new as WidgetLead).id
                ? payload.new as WidgetLead
                : prev
            );
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev =>
              prev.filter(lead => lead.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [widgetConfig?.id]);

  const loadLeads = async () => {
    if (!widgetConfig?.id) return;

    setIsLoadingLeads(true);
    try {
      const { data, error } = await (supabase as any)
        .from('widget_leads')
        .select('*')
        .eq('widget_config_id', widgetConfig.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const leadsData = (data || []) as unknown as WidgetLead[];
      setLeads(leadsData);
      setNewLeadsCount(leadsData.filter(l => l.status === 'new').length);
    } catch (error: any) {
      console.error('Error loading leads:', error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: WidgetLead['status']) => {
    try {
      const { error } = await (supabase as any)
        .from('widget_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      setLeads(prev =>
        prev.map(lead =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      }

      // Update new leads count
      if (newStatus !== 'new') {
        setNewLeadsCount(prev => Math.max(0, prev - 1));
      }

      toast.success('Status actualizat!');
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      toast.error('Eroare la actualizarea statusului');
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această comandă?')) return;

    try {
      const { error } = await (supabase as any)
        .from('widget_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
      toast.success('Comandă ștearsă!');
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast.error('Eroare la ștergerea comenzii');
    }
  };

  const exportLeadsToCSV = () => {
    const filteredLeads = leadsFilter === 'all'
      ? leads
      : leads.filter(l => l.status === leadsFilter);

    if (filteredLeads.length === 0) {
      toast.error('Nu există comenzi de exportat');
      return;
    }

    const headers = ['Data', 'Nume', 'Telefon', 'Adresă', 'Note', 'Produse', 'Total', 'Status'];
    const rows = filteredLeads.map(lead => [
      new Date(lead.created_at).toLocaleString('ro-RO'),
      lead.customer_name || '',
      lead.customer_phone || '',
      lead.customer_address || '',
      lead.customer_notes || '',
      lead.cart_items.map((item: CartItem) => `${item.productName} x${item.quantity}`).join('; '),
      `${lead.total_amount} ${lead.currency}`,
      lead.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV descărcat!');
  };

  const loadConversations = async () => {
    if (!widgetConfig?.id) {
      console.log('No widgetConfig.id, skipping loadConversations');
      return;
    }

    console.log('Loading conversations for widget_config_id:', widgetConfig.id);
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('chat_widget_conversations')
        .select('*')
        .eq('widget_config_id', widgetConfig.id)
        .order('created_at', { ascending: false });

      console.log('Conversations query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Supabase error loading conversations:', error);
        toast.error(`Eroare la încărcarea conversațiilor: ${error.message}`);
        throw error;
      }

      const conversationsData = (data || []) as unknown as Conversation[];
      console.log('Setting conversations:', conversationsData.length, 'conversations');
      setConversations(conversationsData);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadProducts = async () => {
    if (!widgetConfig?.id) return;

    try {
      const { data, error } = await supabase
        .from('widget_products')
        .select('*')
        .eq('widget_config_id', widgetConfig.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setProducts((data || []) as unknown as Product[]);
    } catch (error: any) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddProduct = async () => {
    if (!user || !widgetConfig?.id || !newProduct.name || !newProduct.image_url) {
      toast.error('Completează numele și URL-ul imaginii');
      return;
    }

    // Parse attributes JSON if provided
    let parsedAttributes = {};
    if (newProduct.attributes && newProduct.attributes.trim()) {
      try {
        parsedAttributes = JSON.parse(newProduct.attributes);
      } catch {
        toast.error('Atributele trebuie să fie în format JSON valid (ex: {"marime": "42", "culoare": "negru"})');
        return;
      }
    }

    setIsUploadingProduct(true);
    try {
      const { data, error } = await supabase
        .from('widget_products')
        .insert({
          widget_config_id: widgetConfig.id,
          user_id: user.id,
          name: newProduct.name,
          description: newProduct.description,
          image_url: newProduct.image_url,
          price: newProduct.price ? parseFloat(newProduct.price) : null,
          currency: newProduct.currency || 'RON',
          attributes: parsedAttributes,
          sort_order: products.length
        })
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [...prev, data as unknown as Product]);
      setNewProduct({ name: '', description: '', image_url: '', price: '', currency: 'RON', attributes: '' });
      setIsProductModalOpen(false);
      toast.success('Produs adăugat cu succes!');
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error('Eroare la adăugarea produsului');
    } finally {
      setIsUploadingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('widget_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Produs șters!');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Eroare la ștergerea produsului');
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    // Parse attributes JSON if provided
    let parsedAttributes = editingProduct.attributes || {};
    if (typeof editingProduct.attributes === 'string' && (editingProduct.attributes as string).trim()) {
      try {
        parsedAttributes = JSON.parse(editingProduct.attributes as string);
      } catch {
        toast.error('Atributele trebuie să fie în format JSON valid');
        return;
      }
    }

    setIsUploadingProduct(true);
    try {
      const { data, error } = await supabase
        .from('widget_products')
        .update({
          name: editingProduct.name,
          description: editingProduct.description,
          image_url: editingProduct.image_url,
          price: editingProduct.price,
          attributes: parsedAttributes
        })
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === editingProduct.id ? (data as unknown as Product) : p));
      setEditingProduct(null);
      setSelectedProduct(null);
      toast.success('Produs actualizat!');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error('Eroare la actualizarea produsului');
    } finally {
      setIsUploadingProduct(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, forEdit = false) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingProduct(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('widget-products')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('widget-products')
        .getPublicUrl(fileName);

      if (forEdit && editingProduct) {
        setEditingProduct(prev => prev ? { ...prev, image_url: publicUrl } : null);
      } else {
        setNewProduct(prev => ({ ...prev, image_url: publicUrl }));
      }
      toast.success('Imagine încărcată!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Eroare la încărcarea imaginii');
    } finally {
      setIsUploadingProduct(false);
    }
  };

  const handleScrapeProducts = async () => {
    if (!importUrl.trim()) {
      toast.error('Introdu URL-ul site-ului');
      return;
    }

    setIsImporting(true);
    setScrapedProducts([]);
    setSelectedScrapedProducts(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('scrape-products', {
        body: { url: importUrl }
      });

      if (error) throw error;

      if (data?.success && data?.products?.length > 0) {
        setScrapedProducts(data.products);
        // Select all by default
        setSelectedScrapedProducts(new Set(data.products.map((_: any, i: number) => i)));
        toast.success(`Am găsit ${data.products.length} produse!`);
      } else {
        toast.error(data?.error || 'Nu am găsit produse pe această pagină');
      }
    } catch (error: any) {
      console.error('Error scraping products:', error);
      toast.error('Eroare la extragerea produselor');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSelected = async () => {
    if (!user || !widgetConfig?.id || selectedScrapedProducts.size === 0) return;

    setIsImporting(true);
    try {
      const productsToImport = scrapedProducts
        .filter((_, i) => selectedScrapedProducts.has(i))
        .map((p, i) => ({
          widget_config_id: widgetConfig.id,
          user_id: user.id,
          name: p.name,
          description: p.description || '',
          image_url: p.image_url,
          price: p.price,
          currency: p.currency || 'RON',
          attributes: {},
          sort_order: products.length + i
        }));

      const { data, error } = await supabase
        .from('widget_products')
        .insert(productsToImport)
        .select();

      if (error) throw error;

      setProducts(prev => [...prev, ...((data || []) as unknown as Product[])]);
      setIsImportModalOpen(false);
      setScrapedProducts([]);
      setSelectedScrapedProducts(new Set());
      setImportUrl('');
      toast.success(`${data?.length || 0} produse importate cu succes!`);
    } catch (error: any) {
      console.error('Error importing products:', error);
      toast.error('Eroare la importarea produselor');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleScrapedProduct = (index: number) => {
    setSelectedScrapedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Delete all products
  const handleDeleteAllProducts = async () => {
    if (!widgetConfig?.id) return;

    if (!confirm('Are you sure you want to delete ALL products? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('widget_products')
        .delete()
        .eq('widget_config_id', widgetConfig.id);

      if (error) throw error;

      setProducts([]);
      toast.success('All products deleted!');
    } catch (error: any) {
      console.error('Error deleting products:', error);
      toast.error('Error deleting products');
    }
  };


  const loadWidgetConfig = async () => {
    if (!user) return;

    setIsLoadingConfig(true);
    try {
      // Always get the FIRST widget created for this user (order by created_at ascending, limit 1)
      // This prevents creating duplicate widgets when multiple exist
      const { data: existingConfigs, error: fetchError } = await supabase
        .from('chat_widget_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      console.log('🔍 [loadWidgetConfig] Fetch result:', { count: existingConfigs?.length, error: fetchError });

      if (fetchError) {
        console.error('❌ [loadWidgetConfig] Fetch error:', fetchError);
        throw fetchError;
      }

      const existingConfig = existingConfigs && existingConfigs.length > 0 ? existingConfigs[0] : null;

      if (existingConfig) {
        console.log('✅ Existing widget loaded:', existingConfig);
        console.log('✅ Widget ID (text):', existingConfig.widget_id);
        console.log('✅ Widget Config ID (UUID):', existingConfig.id);

        // If widget_id is missing (old record), generate one
        if (!existingConfig.widget_id) {
          console.log('⚠️ Widget ID missing, generating new one...');
          const newWidgetId = crypto.randomUUID();
          const { error: updateError } = await supabase
            .from('chat_widget_configs')
            .update({ widget_id: newWidgetId })
            .eq('id', existingConfig.id);

          if (updateError) {
            console.error('❌ Failed to generate widget_id:', updateError);
          } else {
            existingConfig.widget_id = newWidgetId;
            console.log('✅ Generated new widget_id:', newWidgetId);
          }
        }

        setWidgetConfig(existingConfig as WidgetConfig);
        setSystemPrompt(existingConfig.system_prompt || systemPrompt);
        setScrapeEnabled((existingConfig as any).scrape_enabled || false);
        setScrapeWebsiteUrl((existingConfig as any).scrape_website_url || '');
        // Load voice settings
        setVoiceEnabled((existingConfig as any).voice_enabled || false);
        setVoiceAgentId((existingConfig as any).voice_agent_id || '');
        setVoiceId((existingConfig as any).voice_id || '');
        setVoiceLanguage((existingConfig as any).voice_language || 'ro');
        setVoiceFirstMessage((existingConfig as any).voice_first_message || '');
        // Load checkout settings
        setCartEnabled((existingConfig as any).cart_enabled ?? true);
        if ((existingConfig as any).checkout_fields) {
          setCheckoutFields((existingConfig as any).checkout_fields);
        }
        setCheckoutButtonText((existingConfig as any).checkout_button_text || 'Complete Order');
        setCheckoutSuccessMessage((existingConfig as any).checkout_success_message || 'Thank you for your order! We will contact you shortly.');
        setWidgetSettings(prev => ({
          ...prev,
          primaryColor: existingConfig.primary_color || prev.primaryColor,
          secondaryColor: existingConfig.secondary_color || prev.secondaryColor,
          textColor: existingConfig.text_color || prev.textColor,
          position: existingConfig.position as any || prev.position,
          animationType: existingConfig.animation_type as any || prev.animationType,
          welcomeMessage: existingConfig.welcome_message || prev.welcomeMessage,
          borderRadius: (existingConfig as any).border_radius ?? prev.borderRadius,
          buttonSize: (existingConfig as any).button_size ?? prev.buttonSize,
          windowWidth: (existingConfig as any).window_width ?? prev.windowWidth,
          windowHeight: (existingConfig as any).window_height ?? prev.windowHeight,
          offsetX: (existingConfig as any).offset_x ?? prev.offsetX,
          offsetY: (existingConfig as any).offset_y ?? prev.offsetY,
          animationDuration: (existingConfig as any).animation_duration ?? prev.animationDuration,
          buttonAnimation: (existingConfig as any).button_animation as any || prev.buttonAnimation,
          chatBgColor: (existingConfig as any).chat_bg_color || prev.chatBgColor,
          placeholder: (existingConfig as any).placeholder || prev.placeholder,
          showPoweredBy: (existingConfig as any).show_powered_by ?? prev.showPoweredBy,
          soundEnabled: (existingConfig as any).sound_enabled ?? prev.soundEnabled,
        }));
      } else {
        // CREATE NEW WIDGET IF NONE EXISTS
        console.log('✨ [loadWidgetConfig] No widget found, creating default for user:', user.id);
        const newWidgetId = crypto.randomUUID();
        const { data: newConfigs, error: createError } = await supabase
          .from('chat_widget_configs')
          .insert({
            user_id: user.id,
            widget_id: newWidgetId,
            name: 'My Chat Widget',
            system_prompt: systemPrompt,
            welcome_message: widgetSettings.welcomeMessage,
            assistant_name: 'AI Assistant',
            primary_color: widgetSettings.primaryColor,
            secondary_color: widgetSettings.secondaryColor,
            text_color: widgetSettings.textColor,
            bubble_style: 'rounded',
            position: widgetSettings.position,
            animation_type: widgetSettings.animationType,
            border_radius: widgetSettings.borderRadius,
            button_size: widgetSettings.buttonSize,
            window_width: widgetSettings.windowWidth,
            window_height: widgetSettings.windowHeight,
            offset_x: widgetSettings.offsetX,
            offset_y: widgetSettings.offsetY,
            animation_duration: widgetSettings.animationDuration,
            button_animation: widgetSettings.buttonAnimation,
            chat_bg_color: widgetSettings.chatBgColor,
            placeholder: widgetSettings.placeholder,
            show_powered_by: widgetSettings.showPoweredBy,
            sound_enabled: widgetSettings.soundEnabled,
          } as any)
          .select(); // Removed .single() to handle potential array return, though insert usually returns single.

        if (createError) {
          console.error('❌ [loadWidgetConfig] Create error:', createError);
          throw createError;
        }

        const newConfig = newConfigs && (newConfigs as any[]).length > 0 ? newConfigs[0] : null;
        console.log('✅ [loadWidgetConfig] Widget created:', newConfig);
        setWidgetConfig(newConfig as WidgetConfig);
        toast.success('Widget created successfully!');
      }
    } catch (error: any) {
      console.error('Error loading widget config:', error);
      toast.error('Error loading widget configuration');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const saveWidgetConfig = async () => {
    if (!user || !widgetConfig) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('chat_widget_configs')
        .update({
          system_prompt: systemPrompt,
          welcome_message: widgetSettings.welcomeMessage,
          primary_color: widgetSettings.primaryColor,
          secondary_color: widgetSettings.secondaryColor,
          text_color: widgetSettings.textColor,
          position: widgetSettings.position,
          animation_type: widgetSettings.animationType,
          border_radius: widgetSettings.borderRadius,
          button_size: widgetSettings.buttonSize,
          window_width: widgetSettings.windowWidth,
          window_height: widgetSettings.windowHeight,
          offset_x: widgetSettings.offsetX,
          offset_y: widgetSettings.offsetY,
          animation_duration: widgetSettings.animationDuration,
          button_animation: widgetSettings.buttonAnimation,
          chat_bg_color: widgetSettings.chatBgColor,
          placeholder: widgetSettings.placeholder,
          show_powered_by: widgetSettings.showPoweredBy,
          sound_enabled: widgetSettings.soundEnabled,
          scrape_enabled: scrapeEnabled,
          scrape_website_url: scrapeWebsiteUrl || null,
          cart_enabled: cartEnabled,
          checkout_fields: checkoutFields,
          checkout_button_text: checkoutButtonText,
          checkout_success_message: checkoutSuccessMessage,
          // Voice settings
          voice_enabled: voiceEnabled,
          voice_agent_id: voiceAgentId || null,
          voice_id: voiceId || null,
          voice_language: voiceLanguage,
          voice_first_message: voiceFirstMessage || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', widgetConfig.id);

      if (error) throw error;
      toast.success('Configuration saved!');
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error('Error saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const embedCode = widgetConfig ? `<agentauto-chat widget-id="${widgetConfig.widget_id || ''}"></agentauto-chat>
<script src="https://cjbast248.github.io/Autoagent/widget/chat.js" async></script>` : '';

  // Debug logging for widget_id
  console.log('🔍 Embed code debug:', {
    hasWidgetConfig: !!widgetConfig,
    widget_id: widgetConfig?.widget_id,
    embedCode: embedCode.substring(0, 100)
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success('Code copied to clipboard!');
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-widget-groq', {
        body: {
          messages: [...messages, userMessage],
          systemPrompt,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            image_url: p.image_url,
            price: p.price,
            currency: p.currency || 'RON',
            attributes: p.attributes
          })),
          scrapeEnabled,
          scrapeWebsiteUrl
        }
      });

      if (error) throw error;

      if (data?.success && data?.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        const errorMsg = data?.error || 'Error generating response';
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error('Eroare la conectare');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Could not establish connection. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handler pentru click pe produs - trimite automat o întrebare despre produs
  const handleProductClick = (productName: string) => {
    if (isLoading) return;

    const question = `Spune-mi mai multe despre "${productName}" - ce prețuri are și ce conține?`;
    setInputMessage(question);

    // Trimite mesajul automat după un mic delay pentru a permite UI-ului să se actualizeze
    setTimeout(() => {
      const userMessage: Message = { role: 'user', content: question };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsLoading(true);

      supabase.functions.invoke('chat-widget-groq', {
        body: {
          messages: [...messages, userMessage],
          systemPrompt,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            image_url: p.image_url,
            price: p.price,
            currency: p.currency || 'RON',
            attributes: p.attributes
          })),
          scrapeEnabled,
          scrapeWebsiteUrl
        }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Chat error:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Nu am putut stabili conexiunea. Te rog încearcă din nou.'
          }]);
        } else if (data?.success && data?.message) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data?.error || 'Error generating response'
          }]);
        }
      }).finally(() => {
        setIsLoading(false);
      });
    }, 100);
  };

  // Custom styles for the page
  const pageStyles = `
    /* Hide scrollbar but keep scroll functionality */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* --- BACKGROUND DOTS --- */
    .bg-dots {
      background-image: radial-gradient(#e4e4e7 1.5px, transparent 1.5px);
      background-size: 24px 24px;
    }

    /* --- THE HEADER --- */
    .agentauto-header {
        height: 52px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid #e4e4e7;
        position: fixed; top: 0; left: 0; right: 0;
        z-index: 50;
    }

    .header-content {
        max-width: 1280px; margin: 0 auto; height: 100%;
        padding: 0 24px;
        display: flex; align-items: center; justify-content: space-between;
    }

    /* Left Section */
    .back-btn {
        width: 32px; height: 32px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        color: #71717a; transition: all 0.2s; cursor: pointer;
    }
    .back-btn:hover { background: #f4f4f5; color: #000; }

    .divider { width: 1px; height: 24px; background: #e4e4e7; margin: 0 16px; }

    .page-title { font-size: 14px; font-weight: 600; color: #18181b; }

    /* Center Tabs */
    .nav-tabs { display: flex; height: 100%; gap: 8px; }

    .tab-item {
        position: relative;
        display: flex; align-items: center;
        padding: 0 12px;
        font-size: 13px; font-weight: 500; color: #71717a;
        cursor: pointer; transition: color 0.2s;
        height: 100%;
    }
    .tab-item:hover { color: #000; }

    .tab-item.active { color: #000; font-weight: 600; }
    .tab-item.active::after {
        content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
        height: 2px; background: #000;
    }

    /* Right Actions */
    .action-btn {
        font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px;
        transition: all 0.2s; cursor: pointer;
    }

    .btn-ghost {
        background: #fff; border: 1px solid #e4e4e7; color: #18181b;
    }
    .btn-ghost:hover { border-color: #000; }

    .btn-primary {
        background: #000; border: 1px solid #000; color: #fff;
        display: flex; align-items: center; gap: 6px;
    }
    .btn-primary:hover { background: #27272a; transform: translateY(-1px); }

    /* --- HEADER ACTIONS (legacy) --- */
    .black-btn {
      background: #000;
      color: #fff;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .black-btn:hover { background: #27272a; transform: translateY(-1px); }
    .black-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    /* --- TABS (legacy) --- */
    .tab-btn {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      color: #71717a;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tab-btn:hover { color: #000; }
    .tab-btn.active { color: #000; border-bottom-color: #000; font-weight: 600; }

    /* --- CONFIG SECTIONS --- */
    .config-section {
      margin-bottom: 32px;
    }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a1a1aa;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Textarea / Input Style */
    .tech-input-area {
      width: 100%;
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 16px;
      padding: 16px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #18181b;
      min-height: 140px;
      resize: vertical;
      transition: all 0.2s;
    }
    .tech-input-area:focus { outline: none; border-color: #000; box-shadow: 0 0 0 1px #000; }

    /* Code Snippet Box */
    .snippet-box {
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 16px;
      position: relative;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 12px;
      color: #52525b;
      overflow-x: auto;
    }
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #fff;
      border: 1px solid #e4e4e7;
      padding: 6px;
      border-radius: 6px;
      color: #71717a;
      transition: all 0.2s;
      cursor: pointer;
    }
    .copy-btn:hover { color: #000; border-color: #000; }

    /* Dashed Upload Area */
    .dashed-slot {
      width: 100%;
      height: 100px;
      border: 1px dashed #d4d4d8;
      background-color: #fafafa;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;
      color: #52525b;
    }
    .dashed-slot:hover {
      border-color: #000;
      background-color: #fff;
      color: #000;
    }

    /* Toggle Switch */
    .toggle-switch {
      width: 40px;
      height: 22px;
      background-color: #e4e4e7;
      border-radius: 99px;
      position: relative;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      background-color: #fff;
      border-radius: 50%;
      transition: transform 0.3s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .toggle-switch.active { background-color: #000; }
    .toggle-switch.active::after { transform: translateX(18px); }

  `;

  if (isLoadingConfig) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <style>{pageStyles}</style>

      {/* Main Content */}
      <div className="min-h-screen bg-dots p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-black tracking-tight mb-2">Chat Widget</h1>
              <p className="text-sm text-zinc-500">Customize the appearance and behavior of your web agent.</p>
            </div>

            {activeTab === 'agent' && (
              <button
                onClick={saveWidgetConfig}
                disabled={isSaving}
                className="black-btn"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            )}
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-6 border-b border-zinc-200 mb-8">
            <button
              onClick={() => setActiveTab('agent')}
              className={`tab-btn ${activeTab === 'agent' ? 'active' : ''}`}
            >
              <Settings className="w-3.5 h-3.5" />
              Agent Settings
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Conversations Logs
            </button>
            <button
              onClick={() => {
                setActiveTab('leads');
                setNewLeadsCount(0);
              }}
              className={`tab-btn ${activeTab === 'leads' ? 'active' : ''} relative`}
            >
              <Users className="w-3.5 h-3.5" />
              Leads
              {newLeadsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {newLeadsCount > 9 ? '9+' : newLeadsCount}
                </span>
              )}
            </button>
          </div>

          {/* Agent Tab Content */}
          {activeTab === 'agent' && (
            <div className="max-w-xl">
              {/* Config Column */}
              <div>
                {/* System Prompt */}
                <div className="config-section">
                  <div className="section-label">
                    <span>System Prompt</span>
                    <Wand2 className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div className="relative">
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="tech-input-area"
                      placeholder="Enter instructions..."
                      maxLength={2000}
                    />
                    <button
                      onClick={() => setIsPromptModalOpen(true)}
                      className="absolute top-3 right-3 p-1 text-zinc-300 hover:text-zinc-500 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-2 text-right">{systemPrompt.length} / 2000 characters</p>
                </div>

                {/* Embed Code */}
                <div className="config-section">
                  <div className="section-label">
                    <span>Embed Code</span>
                    <span className="text-[10px] font-normal text-zinc-400 normal-case">Paste before &lt;/body&gt;</span>
                  </div>
                  <div className="snippet-box">
                    <span className="text-blue-600">&lt;agentauto-chat</span>{' '}
                    <span className="text-purple-600">widget-id</span>=
                    <span className="text-green-600">"{widgetConfig?.widget_id}"</span>
                    <span className="text-blue-600">&gt;&lt;/agentauto-chat&gt;</span>
                    <br />
                    <span className="text-blue-600">&lt;script</span>{' '}
                    <span className="text-purple-600">src</span>=
                    <span className="text-green-600">"https://app.agentauto.app/widget/chat.js"</span>{' '}
                    <span className="text-purple-600">async</span>
                    <span className="text-blue-600">&gt;&lt;/script&gt;</span>

                    <button onClick={handleCopyCode} className="copy-btn">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Product Catalog */}
                <div className="config-section">
                  <div className="section-label">
                    <span>Product Catalog</span>
                    <div className="flex items-center gap-3">
                      {products.length > 0 && (
                        <button
                          onClick={handleDeleteAllProducts}
                          className="flex items-center gap-1 text-[10px] font-normal normal-case text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Șterge tot
                        </button>
                      )}
                      {canImportEsushi && (
                        <button
                          onClick={handleImportEsushi}
                          disabled={isImportingEsushi}
                          className="flex items-center gap-1 text-[10px] font-normal normal-case text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50"
                        >
                          {isImportingEsushi ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          Import esushi.md
                        </button>
                      )}
                      <button
                        onClick={() => setIsProductModalOpen(true)}
                        className="flex items-center gap-1 text-[10px] font-normal normal-case text-zinc-500 hover:text-black transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add product
                      </button>
                    </div>
                  </div>

                  {products.length === 0 ? (
                    <div onClick={() => setIsProductModalOpen(true)} className="dashed-slot group">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition">
                        <Image className="w-5 h-5 text-zinc-400 group-hover:text-black" />
                      </div>
                      <span className="text-xs font-bold">Connect Product Database</span>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsGalleryOpen(true)}
                      className="flex items-center gap-3 p-4 bg-white border border-zinc-200 rounded-2xl cursor-pointer hover:border-zinc-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex -space-x-2">
                        {products.slice(0, 4).map((product, idx) => (
                          <div
                            key={product.id}
                            className="w-10 h-10 rounded-lg border-2 border-white overflow-hidden shadow-sm"
                            style={{ zIndex: 4 - idx }}
                          >
                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-black">{products.length} products</p>
                        <p className="text-xs text-zinc-500">Click to manage catalog</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                </div>

                {/* Toggle Options */}
                <div className="config-section">
                  <div className="flex items-center justify-between py-4 border-t border-zinc-100">
                    <div>
                      <div className="text-sm font-bold text-black flex items-center gap-2">
                        <Globe className="w-4 h-4 text-zinc-500" />
                        Live product search
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Activează pentru a permite chat-ului să caute produse în timp real pe un site extern.
                      </div>
                    </div>
                    <div
                      onClick={() => setScrapeEnabled(!scrapeEnabled)}
                      className={`toggle-switch ${scrapeEnabled ? 'active' : ''}`}
                    />
                  </div>

                  {scrapeEnabled && (
                    <div className="pl-6 pb-4 space-y-3">
                      <input
                        type="url"
                        value={scrapeWebsiteUrl}
                        onChange={(e) => setScrapeWebsiteUrl(e.target.value)}
                        placeholder="https://andys.md"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-black"
                      />
                    </div>
                  )}

                  {/* Cart Toggle */}
                  <div className="flex items-center justify-between py-4 border-t border-zinc-100">
                    <div>
                      <div className="text-sm font-bold text-black flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-zinc-500" />
                        Coș de cumpărături
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Permite utilizatorilor să adauge produse în coș și să plaseze comenzi.
                      </div>
                    </div>
                    <div
                      onClick={() => setCartEnabled(!cartEnabled)}
                      className={`toggle-switch ${cartEnabled ? 'active' : ''}`}
                    />
                  </div>
                </div>

                {/* Checkout Settings - only show if cart is enabled */}
                {cartEnabled && (
                  <div className="config-section">
                    <div className="section-label">
                      <span>Checkout Settings</span>
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    </div>

                    {/* Checkout Fields Configuration */}
                    <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
                      <p className="text-xs text-zinc-500 mb-3">Configurează câmpurile care vor apărea în formularul de checkout:</p>

                      {checkoutFields.map((field, index) => (
                        <div
                          key={field.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${field.enabled ? 'bg-white border-zinc-200' : 'bg-zinc-50 border-zinc-100 opacity-60'
                            }`}
                        >
                          <GripVertical className="w-4 h-4 text-zinc-300 cursor-move" />

                          {/* Field icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${field.enabled ? 'bg-zinc-100' : 'bg-zinc-50'
                            }`}>
                            {field.id === 'name' && <Users className="w-4 h-4 text-zinc-500" />}
                            {field.id === 'phone' && <Phone className="w-4 h-4 text-zinc-500" />}
                            {field.id === 'address' && <MapPin className="w-4 h-4 text-zinc-500" />}
                            {field.id === 'notes' && <FileText className="w-4 h-4 text-zinc-500" />}
                          </div>

                          {/* Field info */}
                          <div className="flex-1">
                            <span className="text-sm font-medium text-black">{field.label}</span>
                            <span className="text-xs text-zinc-400 block">{field.type === 'tel' ? 'Telefon' : field.type === 'textarea' ? 'Text lung' : 'Text'}</span>
                          </div>

                          {/* Required toggle */}
                          {field.enabled && (
                            <button
                              onClick={() => {
                                const newFields = [...checkoutFields];
                                newFields[index].required = !newFields[index].required;
                                setCheckoutFields(newFields);
                              }}
                              className={`text-xs px-2 py-1 rounded-lg transition-colors ${field.required
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                                }`}
                            >
                              {field.required ? 'Obligatoriu' : 'Opțional'}
                            </button>
                          )}

                          {/* Enable toggle */}
                          <button
                            onClick={() => {
                              const newFields = [...checkoutFields];
                              newFields[index].enabled = !newFields[index].enabled;
                              setCheckoutFields(newFields);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${field.enabled
                              ? 'bg-green-50 text-green-600 hover:bg-green-100'
                              : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                              }`}
                          >
                            {field.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Button text */}
                    <div className="mt-4">
                      <label className="block text-xs text-zinc-500 mb-2">Text buton checkout</label>
                      <input
                        type="text"
                        value={checkoutButtonText}
                        onChange={(e) => setCheckoutButtonText(e.target.value)}
                        placeholder="Finalizează comanda"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-black"
                      />
                    </div>

                    {/* Success message */}
                    <div className="mt-4">
                      <label className="block text-xs text-zinc-500 mb-2">Mesaj de confirmare</label>
                      <textarea
                        value={checkoutSuccessMessage}
                        onChange={(e) => setCheckoutSuccessMessage(e.target.value)}
                        placeholder="Mulțumim pentru comandă!"
                        rows={2}
                        className="w-full px-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl resize-none focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>
                )}

                {/* Voice Settings */}
                <div className="config-section">
                  <div className="section-label">
                    <span>Voice Settings</span>
                    <Mic className="w-3.5 h-3.5 text-zinc-400" />
                  </div>

                  {/* Voice Enable Toggle */}
                  <div className="flex items-center justify-between py-4 border-t border-zinc-100">
                    <div>
                      <div className="text-sm font-bold text-black flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-zinc-500" />
                        Conversație vocală
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Permite utilizatorilor să vorbească cu agentul prin microfon.
                      </div>
                    </div>
                    <div
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`toggle-switch ${voiceEnabled ? 'active' : ''}`}
                    />
                  </div>

                  {voiceEnabled && (
                    <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-4 mt-2">
                      {/* Agent Selection */}
                      <div>
                        <label className="block text-xs text-zinc-500 mb-2">Selectează agentul pentru voce</label>
                        <select
                          value={voiceAgentId}
                          onChange={(e) => setVoiceAgentId(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:border-black"
                        >
                          <option value="">Selectează un agent...</option>
                          {availableAgents
                            .filter(agent => agent.elevenlabs_agent_id)
                            .map(agent => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name}
                              </option>
                            ))}
                        </select>
                        {availableAgents.filter(a => a.elevenlabs_agent_id).length === 0 && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            Nu ai agenți cu ElevenLabs configurat. Creează un agent și conectează-l la ElevenLabs.
                          </p>
                        )}
                      </div>

                      {/* Info Box */}
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-xs text-blue-700">
                          <strong>Notă:</strong> Selectează un agent din pagina "Agents" care are ElevenLabs Agent ID configurat.
                          Agentul va folosi toate tool-urile și setările configurate în ElevenLabs.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fixed Widget Preview - Bottom Right Corner */}
          {activeTab === 'agent' && (
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
              {/* Preview Mode Toggle */}
              <div className="bg-white rounded-full shadow-lg p-1 flex items-center gap-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${previewMode === 'desktop'
                    ? 'bg-black text-white'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${previewMode === 'mobile'
                    ? 'bg-black text-white'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Mobile
                </button>
              </div>

              <WidgetPreview
                settings={widgetSettings}
                messages={messages}
                inputMessage={inputMessage}
                isLoading={isLoading}
                products={products}
                onInputChange={setInputMessage}
                onSendMessage={sendMessage}
                onKeyPress={handleKeyPress}
                onProductClick={handleProductClick}
                cartEnabled={cartEnabled}
                checkoutFields={checkoutFields}
                checkoutButtonText={checkoutButtonText}
                checkoutSuccessMessage={checkoutSuccessMessage}
                widgetConfigId={widgetConfig?.id}
                previewMode={previewMode}
                voiceEnabled={voiceEnabled}
                voiceAgentId={availableAgents.find(a => a.id === voiceAgentId)?.elevenlabs_agent_id || ''}
                onOrderSubmit={async (orderData) => {
                  try {
                    const { data, error } = await supabase.functions.invoke('widget-submit-order', {
                      body: orderData
                    });
                    if (error) throw error;
                    if (data?.success) {
                      toast.success('🛒 Comandă de test plasată cu succes!');
                      await loadLeads();
                      return true;
                    }
                    return false;
                  } catch (err: any) {
                    console.error('Error submitting order:', err);
                    toast.error('Eroare la plasarea comenzii');
                    return false;
                  }
                }}
              />
            </div>
          )}

          {/* Conversations Tab Content */}
          {activeTab === 'conversations' && (
            <div className="space-y-6">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nicio conversație încă</h3>
                  <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                    Conversațiile vor apărea aici în timp real când utilizatorii vor interacționa cu chat widget-ul tău.
                  </p>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Real-time activ
                  </div>
                </div>
              ) : (
                <div className="flex gap-6 h-[600px]">
                  {/* Conversations List - Sidebar */}
                  <div className="w-80 flex-shrink-0 flex flex-col bg-white border border-zinc-200 rounded-3xl overflow-hidden">
                    {/* Header */}
                    <div className="p-5 border-b border-zinc-100">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-zinc-900">Conversations</h2>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-medium">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          Live
                        </div>
                      </div>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto">
                      {conversations.map((conv, index) => {
                        const firstUserMsg = conv.messages.find(m => m.role === 'user');
                        const lastMsg = conv.messages[conv.messages.length - 1];
                        const isSelected = selectedConversation?.id === conv.id;
                        // Clean the preview text by removing [PRODUCT:...] tags
                        const previewText = (lastMsg?.content || 'Conversație nouă').replace(/\[PRODUCT:[a-f0-9-]+\]/gi, '').trim() || 'Conversație nouă';

                        return (
                          <div
                            key={conv.id}
                            onClick={() => setSelectedConversation(conv)}
                            className={`p-4 border-b border-zinc-100 cursor-pointer transition-all ${isSelected
                              ? 'bg-zinc-100'
                              : 'hover:bg-zinc-50'
                              }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-zinc-900">
                                Vizitator #{String(conversations.length - index).padStart(4, '0')}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {index === 0 ? 'Live now...' : new Date(conv.updated_at || conv.created_at).toLocaleTimeString('ro-RO', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 truncate">
                              {previewText.slice(0, 50)}{previewText.length > 50 ? '...' : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Conversation - Main Area */}
                  <div className="flex-1 flex flex-col bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]">
                    {selectedConversation ? (
                      <>
                        {/* Conversation Header */}
                        <div className="px-8 py-4 border-b border-zinc-100 bg-white/90 backdrop-blur-sm z-10">
                          <div className="flex items-center justify-between">
                            <h1 className="text-lg font-bold text-zinc-900">Live Session Inspection</h1>
                            <span className="font-mono text-xs bg-zinc-100 px-3 py-1.5 rounded-lg text-zinc-600">
                              ID: {selectedConversation.session_id?.slice(-8) || selectedConversation.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>

                        {/* Messages Area - with dot pattern background */}
                        <div
                          className="flex-1 overflow-y-auto p-10 space-y-8"
                          style={{
                            backgroundImage: 'radial-gradient(#e4e4e7 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                          }}
                        >
                          {selectedConversation.messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex gap-4 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                              {/* Avatar */}
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${msg.role === 'user'
                                ? 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                                : 'bg-black text-white'
                                }`}>
                                {msg.role === 'user' ? 'V' : 'K'}
                              </div>

                              <div className={`${msg.role === 'user' ? 'text-right' : ''}`}>
                                {/* Message Bubble */}
                                <div
                                  className={`text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-black text-white px-5 py-3 rounded-[20px] rounded-br-[4px] shadow-lg inline-block max-w-md'
                                    : 'bg-white border border-zinc-200 px-5 py-4 rounded-[4px] rounded-tr-[20px] rounded-br-[20px] rounded-bl-[20px] shadow-sm max-w-2xl'
                                    }`}
                                >
                                  {msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}
                                </div>

                                {/* Timestamp */}
                                <span className="font-mono text-[10px] text-zinc-400 mt-2 block">
                                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ro-RO', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  }) : ''}
                                  {msg.role === 'assistant' && ' • Bot Response'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                          <MessageSquare className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-1">Selectează o conversație</h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                          Alege o conversație din lista din stânga pentru a vedea mesajele.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leads Tab Content */}
          {activeTab === 'leads' && (
            <div className="space-y-8">
              {/* Header with title and actions */}
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-black tracking-tight mb-2">Leads Registry</h1>
                  <p className="text-sm text-zinc-500">Monitor and process incoming orders in real-time.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={exportLeadsToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 hover:border-black"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => loadLeads()}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-zinc-800"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                    Sync Data
                  </button>
                </div>
              </div>

              {/* Metric Cards - Tech Style */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 h-[100px] flex flex-col justify-between hover:border-zinc-400">
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Total Comenzi</span>
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[28px] font-bold text-zinc-900 font-mono tracking-tight">{leads.length}</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 h-[100px] flex flex-col justify-between hover:border-zinc-400">
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Noi (Astăzi)</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  </div>
                  <p className="text-[28px] font-bold text-blue-600 font-mono tracking-tight">{leads.filter(l => l.status === 'new').length}</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 h-[100px] flex flex-col justify-between hover:border-zinc-400">
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>În Procesare</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                  </div>
                  <p className="text-[28px] font-bold text-orange-500 font-mono tracking-tight">{leads.filter(l => l.status === 'processing').length}</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 h-[100px] flex flex-col justify-between hover:border-zinc-400">
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Finalizate</span>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <p className="text-[28px] font-bold text-green-600 font-mono tracking-tight">{leads.filter(l => l.status === 'completed').length}</p>
                </div>
              </div>

              {/* Table Frame */}
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Filter Tabs & Search */}
                <div className="px-6 py-3 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {(['all', 'new', 'processing', 'completed', 'cancelled'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setLeadsFilter(filter)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium ${leadsFilter === filter
                          ? 'bg-black text-white'
                          : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                          }`}
                      >
                        {filter === 'all' ? 'Toate' :
                          filter === 'new' ? 'Noi' :
                            filter === 'processing' ? 'În procesare' :
                              filter === 'completed' ? 'Finalizate' : 'Anulate'}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search ID or Name..."
                      className="pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs w-48 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-[80px_2fr_1.5fr_1fr_1fr_1fr] px-6 py-3 border-b border-zinc-100 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <div>Order ID</div>
                  <div>Client Info</div>
                  <div>Status</div>
                  <div>Amount</div>
                  <div>Date</div>
                  <div className="text-right">Action</div>
                </div>

                {isLoadingLeads ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  </div>
                ) : leads.length === 0 ? (
                  /* Empty State - Scanner Zone */
                  <div
                    className="h-80 relative flex flex-col items-center justify-center overflow-hidden"
                    style={{
                      background: 'linear-gradient(90deg, transparent 49%, #f4f4f5 50%, transparent 51%), linear-gradient(180deg, transparent 49%, #f4f4f5 50%, transparent 51%)',
                      backgroundSize: '40px 40px'
                    }}
                  >
                    <div className="font-mono text-xs text-zinc-400 bg-white px-4 py-2 rounded-full border border-zinc-200 flex items-center gap-2 z-10">
                      <span className="text-green-500">{'>'}</span>
                      Waiting for incoming webhook...
                      <div className="w-1.5 h-3 bg-green-500"></div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-3">System is listening on port 443 (Secure)</p>
                  </div>
                ) : (
                  /* Leads Table Rows */
                  <div className="divide-y divide-zinc-100">
                    {(leadsFilter === 'all' ? leads : leads.filter(l => l.status === leadsFilter)).map((lead, idx) => {
                      const statusStyles = {
                        new: 'bg-blue-50 text-blue-600 border-blue-200',
                        processing: 'bg-orange-50 text-orange-600 border-orange-200',
                        completed: 'bg-green-50 text-green-600 border-green-200',
                        cancelled: 'bg-red-50 text-red-600 border-red-200'
                      };

                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`grid grid-cols-[80px_2fr_1.5fr_1fr_1fr_1fr] px-6 py-4 items-center cursor-pointer hover:bg-zinc-50 ${selectedLead?.id === lead.id ? 'bg-zinc-100' : ''
                            }`}
                        >
                          <div className="font-mono text-xs text-zinc-500">#{String(leads.length - idx).padStart(4, '0')}</div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{lead.customer_name || 'Client'}</p>
                            <p className="text-xs text-zinc-400">{lead.customer_phone || 'No phone'}</p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${statusStyles[lead.status]}`}>
                              {lead.status === 'new' ? 'NOU' :
                                lead.status === 'processing' ? 'PROCESARE' :
                                  lead.status === 'completed' ? 'FINALIZAT' : 'ANULAT'}
                            </span>
                          </div>
                          <div className="font-mono text-sm font-bold text-zinc-900">{lead.total_amount} {lead.currency}</div>
                          <div className="text-xs text-zinc-500">
                            {new Date(lead.created_at).toLocaleDateString('ro-RO', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(lead);
                              }}
                              className="px-3 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Table Footer */}
                <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center font-mono text-[10px] uppercase text-zinc-400">
                  <span>{(leadsFilter === 'all' ? leads : leads.filter(l => l.status === leadsFilter)).length} records found</span>
                  <span>Page 1 of 1</span>
                </div>
              </div>

              {/* Lead Details Modal/Sidebar */}
              {selectedLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
                  <div className="relative bg-white rounded-2xl border border-zinc-200 w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-zinc-900">Order #{leads.indexOf(selectedLead) + 1}</h3>
                        <p className="text-xs text-zinc-400 font-mono">{selectedLead.id.slice(0, 8)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedLead.status}
                          onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value as WidgetLead['status'])}
                          className="px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-black cursor-pointer"
                        >
                          <option value="new">Nou</option>
                          <option value="processing">În procesare</option>
                          <option value="completed">Finalizat</option>
                          <option value="cancelled">Anulat</option>
                        </select>
                        <button onClick={() => setSelectedLead(null)} className="p-1.5 hover:bg-zinc-100 rounded-lg">
                          <X className="w-4 h-4 text-zinc-500" />
                        </button>
                      </div>
                    </div>

                    {/* Modal Body */}
                    <div className="overflow-y-auto max-h-[60vh] p-6 space-y-6">
                      {/* Customer Info */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Client Information</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedLead.customer_name && (
                            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                              <Users className="w-4 h-4 text-zinc-400" />
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase">Nume</p>
                                <p className="text-sm font-medium text-black">{selectedLead.customer_name}</p>
                              </div>
                            </div>
                          )}
                          {selectedLead.customer_phone && (
                            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                              <Phone className="w-4 h-4 text-zinc-400" />
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase">Telefon</p>
                                <p className="text-sm font-medium text-black">{selectedLead.customer_phone}</p>
                              </div>
                            </div>
                          )}
                          {selectedLead.customer_address && (
                            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl col-span-2">
                              <MapPin className="w-4 h-4 text-zinc-400" />
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase">Adresă</p>
                                <p className="text-sm font-medium text-black">{selectedLead.customer_address}</p>
                              </div>
                            </div>
                          )}
                          {selectedLead.customer_notes && (
                            <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl col-span-2">
                              <FileText className="w-4 h-4 text-zinc-400 mt-0.5" />
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase">Note</p>
                                <p className="text-sm text-black">{selectedLead.customer_notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Products */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Order Items</h4>
                        <div className="space-y-2">
                          {selectedLead.cart_items.map((item: CartItem, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                              {item.image_url && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-zinc-200">
                                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-black truncate">{item.productName}</p>
                                {item.variant && <p className="text-xs text-zinc-400">{item.variant}</p>}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold font-mono text-black">{item.price} MDL</p>
                                <p className="text-xs text-zinc-400">x{item.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex items-center justify-between p-4 bg-black text-white rounded-xl">
                        <span className="text-sm font-medium">Total Amount</span>
                        <span className="text-xl font-bold font-mono">{selectedLead.total_amount} {selectedLead.currency}</span>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 border-t border-zinc-100 flex justify-between">
                      <button
                        onClick={() => deleteLead(selectedLead.id)}
                        className="px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Delete Order
                      </button>
                      <button
                        onClick={() => setSelectedLead(null)}
                        className="px-4 py-2 text-xs font-medium bg-black text-white rounded-lg hover:bg-zinc-800"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* System Prompt Modal */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsPromptModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-base font-medium text-gray-900">System prompt</span>
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 pb-6">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-[400px] px-4 py-3 text-sm text-gray-700 bg-white resize-none focus:outline-none"
                placeholder="You are a helpful website assistant..."
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsProductModalOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-base font-medium text-gray-900">Add product</span>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Image</label>
                {newProduct.image_url ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                    <img src={newProduct.image_url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setNewProduct(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 hover:bg-gray-50/50 transition-colors">
                    <Image className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Or URL */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Or paste image URL</label>
                <input
                  type="url"
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Product name"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Description</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description, size, color, etc."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Price with Currency */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Price (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300"
                  />
                  <select
                    value={newProduct.currency}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, currency: e.target.value }))}
                    className="px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300 cursor-pointer"
                  >
                    <option value="RON">RON</option>
                    <option value="MDL">MDL</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="LEI">LEI</option>
                  </select>
                </div>
              </div>

              {/* Attributes (JSON) */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Attributes (JSON, optional)</label>
                <textarea
                  value={newProduct.attributes}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, attributes: e.target.value }))}
                  placeholder='{"size": "42", "color": "black"}'
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleAddProduct}
                disabled={isUploadingProduct || !newProduct.name || !newProduct.image_url}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingProduct ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Gallery Modal - Agentauto Floating Catalog Design */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50">
          {/* Background dots pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(#d4d4d8 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Overlay with blur */}
          <div
            className="absolute inset-0 bg-zinc-100/85 backdrop-blur-md"
            onClick={() => {
              setIsGalleryOpen(false);
              setSelectedProduct(null);
            }}
          />

          {/* Floating content container */}
          <div className="relative h-full flex flex-col items-center p-6 md:p-10 overflow-hidden">

            {/* Floating Header */}
            <div className="w-full max-w-[1100px] bg-white border border-zinc-200 rounded-[20px] px-6 py-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] flex justify-between items-center mb-6 flex-shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-black tracking-tight">Product Catalog</h2>
                <div className="h-6 w-px bg-zinc-200" />
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="bg-zinc-100 border-none rounded-[10px] py-2.5 pl-9 pr-4 text-[13px] w-[260px] focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsGalleryOpen(false);
                    setIsProductModalOpen(true);
                  }}
                  className="bg-black text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] hover:bg-zinc-800 transition-all hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
                <button
                  onClick={() => {
                    setIsGalleryOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-[10px] text-zinc-400 hover:bg-zinc-100 hover:text-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Transparent Grid with opaque cards */}
            <div className="w-full max-w-[1100px] flex-1 overflow-y-auto pb-20 no-scrollbar">
              {selectedProduct ? (
                /* Product Detail View */
                <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)]">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="flex items-center gap-1 text-sm text-zinc-500 hover:text-black mb-6 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to catalog
                  </button>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-50 p-4">
                      <img
                        src={selectedProduct.image_url}
                        alt=""
                        className="w-full h-full object-contain rounded-xl"
                        style={{ filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.1))' }}
                      />
                    </div>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[11px] font-mono text-zinc-300 mb-2">#{selectedProduct.id.slice(0, 8)}</p>
                        <h3 className="text-2xl font-bold text-black">{selectedProduct.name}</h3>
                      </div>

                      {/* Price with variants */}
                      <div className="space-y-3">
                        {(() => {
                          const attrs = selectedProduct.attributes as any;
                          const variants = attrs?.variants || attrs?.price_options || [];
                          const variantType = attrs?.variant_type || 'none';

                          if (variants.length > 0) {
                            return (
                              <div className="space-y-2">
                                {variantType === 'attribute' && (
                                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Variante disponibile</p>
                                )}
                                {variants.map((v: any, i: number) => (
                                  <div
                                    key={i}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl border ${i === 0 ? 'bg-green-50 border-green-200' : 'bg-zinc-50 border-zinc-200'
                                      }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {/* Show attribute for text-based variants (Avocado, Castraveți, etc.) */}
                                      {v.attribute && <span className="text-sm font-medium text-zinc-700">{v.attribute}</span>}
                                      {/* Show bucati for numeric variants (10, 8, 4 bucăți) */}
                                      {!v.attribute && v.bucati && <span className="text-sm font-medium text-zinc-700">{v.bucati}</span>}
                                      {v.gramaj && <span className="text-sm text-zinc-500">{v.gramaj}</span>}
                                      {!v.bucati && !v.gramaj && !v.attribute && <span className="text-sm text-zinc-500">Standard</span>}
                                    </div>
                                    <span className={`font-mono font-bold ${i === 0 ? 'text-green-600 text-lg' : 'text-zinc-700'}`}>
                                      {v.price} MDL
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          } else if (selectedProduct.price) {
                            return (
                              <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                                <span className="font-mono font-bold text-lg text-green-600">
                                  {selectedProduct.price} {selectedProduct.currency}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {selectedProduct.description && (
                        <p className="text-sm text-zinc-600 leading-relaxed">{selectedProduct.description}</p>
                      )}

                      {/* Category & Source */}
                      {(selectedProduct.attributes as any)?.category && (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-600 rounded-lg">
                            {(selectedProduct.attributes as any).category}
                          </span>
                          {(selectedProduct.attributes as any)?.source && (
                            <span className="px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-600 rounded-lg">
                              {(selectedProduct.attributes as any).source}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Ingredients */}
                      {(selectedProduct.attributes as any)?.ingredients && (
                        <div>
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Ingrediente</p>
                          <p className="text-sm text-zinc-600">{(selectedProduct.attributes as any).ingredients}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-4">
                        <button
                          onClick={() => setEditingProduct(selectedProduct)}
                          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteProduct(selectedProduct.id);
                            setSelectedProduct(null);
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Grid View - Agentauto Style Cards */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {products.map((product, idx) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-white border border-zinc-200 rounded-3xl p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] hover:border-zinc-300 relative group"
                    >
                      {/* Product ID badge */}
                      <span className="absolute top-5 left-5 font-mono text-[11px] text-zinc-300">
                        #{(idx + 1).toString().padStart(2, '0')}
                      </span>

                      {/* Circular image with shadow */}
                      <div
                        className="w-32 h-32 rounded-full mb-5 overflow-hidden transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
                        style={{ filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.1))' }}
                      >
                        <img
                          src={product.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product name */}
                      <h3 className="text-[15px] font-bold text-black min-h-[44px] flex items-center justify-center leading-tight">
                        {product.name}
                      </h3>

                      {/* Price badge */}
                      {product.price && (
                        <div className="mt-auto pt-3">
                          <span className="inline-flex font-mono text-sm font-bold text-green-600 bg-green-50 border border-green-100 px-3.5 py-1.5 rounded-[10px]">
                            {product.price} MDL
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Floating Footer */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white border border-zinc-200 rounded-full px-6 py-2.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] flex items-center gap-5">
              <button className="text-zinc-400 hover:text-black transition-colors">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <span className="text-sm font-mono font-bold text-black">
                {products.length} produse
              </span>
              <button className="text-zinc-400 hover:text-black transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setEditingProduct(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-base font-medium text-gray-900">Edit product</span>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Image */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Image</label>
                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                  <img src={editingProduct.image_url} alt="" className="w-full h-full object-cover" />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="text-white text-sm font-medium">Change image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Or URL */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Or paste image URL</label>
                <input
                  type="url"
                  value={editingProduct.image_url}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, image_url: e.target.value } : null)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Name</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Product name"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Description</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Product description, size, color, etc."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Price (optional)</label>
                <input
                  type="number"
                  value={editingProduct.price || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, price: e.target.value ? parseFloat(e.target.value) : null } : null)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Attributes (JSON) */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Attributes (JSON, optional)</label>
                <textarea
                  value={typeof editingProduct.attributes === 'object' ? JSON.stringify(editingProduct.attributes, null, 2) : editingProduct.attributes || ''}
                  onChange={(e) => setEditingProduct(prev => prev ? { ...prev, attributes: e.target.value as any } : null)}
                  placeholder='{"size": "42", "color": "black"}'
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-gray-300"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleEditProduct}
                disabled={isUploadingProduct || !editingProduct.name || !editingProduct.image_url}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingProduct ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ChatWidgetSettings;
