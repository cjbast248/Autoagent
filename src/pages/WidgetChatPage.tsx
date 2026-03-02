import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, ShoppingBag, Minus, X, Check } from 'lucide-react';
import { cn } from '@/utils/utils';

const SUPABASE_URL = 'https://pwfczzxwjfxomqzhhwvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZmN6enh3amZ4b21xemhod3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwMTA3OTEsImV4cCI6MjA0OTU4Njc5MX0.4FVIwnc25GwEbDTR_TIvVYztvz9pwZ5uKBFkeMw4dHg';
const AGENTAUTO_LOGO = 'https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Group%2010.jpg';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Product {
  id: string;
  name: string;
  price?: number;
  currency?: string;
  image_url?: string;
  image?: string;
  description?: string;
}

interface CartItem {
  productId: string;
  productName: string;
  variant: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface WidgetConfig {
  assistant_name?: string;
  welcome_message?: string;
  system_prompt?: string;
  primary_color?: string;
  placeholder?: string;
  products?: Product[];
  scrape_enabled?: boolean;
  scrape_website_url?: string;
  cart_enabled?: boolean;
  checkout_fields?: any[];
  checkout_button_text?: string;
  checkout_success_message?: string;
}

const WidgetChatPage = () => {
  const { widgetId } = useParams<{ widgetId: string }>();
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [sessionId] = useState(() => {
    // Persist session ID in sessionStorage
    const storageKey = `agentauto_session_${widgetId}`;
    const existingSession = sessionStorage.getItem(storageKey);
    if (existingSession) return existingSession;
    const newSession = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(storageKey, newSession);
    return newSession;
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // Load widget config - EXACT like chat.js
  useEffect(() => {
    const loadConfig = async () => {
      if (!widgetId || hasInitialized.current) return;
      hasInitialized.current = true;

      // Try to load existing messages from sessionStorage (with 30-minute expiry)
      const messagesKey = `agentauto_messages_${widgetId}`;
      const timestampKey = `agentauto_messages_ts_${widgetId}`;
      const savedMessages = sessionStorage.getItem(messagesKey);
      const savedTimestamp = sessionStorage.getItem(timestampKey);
      const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

      // Check if saved messages have expired
      const isExpired = savedTimestamp && (Date.now() - parseInt(savedTimestamp, 10)) > SESSION_EXPIRY_MS;
      if (isExpired) {
        sessionStorage.removeItem(messagesKey);
        sessionStorage.removeItem(timestampKey);
      }
      const validSavedMessages = isExpired ? null : savedMessages;

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-widget-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ widget_id: widgetId })
        });
        const data = await res.json();

        if (data.success && data.config) {
          setConfig(data.config);
          // Only add welcome message if no saved messages exist
          if (validSavedMessages) {
            try {
              setMessages(JSON.parse(validSavedMessages));
            } catch {
              // If parsing fails, add welcome message
              setMessages([{
                id: '1',
                role: 'assistant',
                content: data.config.welcome_message || 'Bună! Cum vă pot ajuta astăzi?'
              }]);
            }
          } else if (data.config.welcome_message) {
            setMessages([{
              id: '1',
              role: 'assistant',
              content: data.config.welcome_message
            }]);
          }
        } else {
          setConfig({
            assistant_name: 'AI Agent',
            welcome_message: 'Bună! Cum vă pot ajuta astăzi?',
            placeholder: 'Scrie mesajul tău...'
          });
          if (!validSavedMessages) {
            setMessages([{
              id: '1',
              role: 'assistant',
              content: 'Bună! Cum vă pot ajuta astăzi?'
            }]);
          }
        }
      } catch (e) {
        console.error('Config load failed:', e);
        setConfig({
          assistant_name: 'AI Agent',
          welcome_message: 'Bună! Cum vă pot ajuta astăzi?',
          placeholder: 'Scrie mesajul tău...'
        });
      } finally {
        setIsConfigLoading(false);
      }
    };

    loadConfig();
  }, [widgetId]);

  // Save messages to sessionStorage whenever they change (with timestamp for expiry)
  useEffect(() => {
    if (widgetId && messages.length > 0) {
      const messagesKey = `agentauto_messages_${widgetId}`;
      const timestampKey = `agentauto_messages_ts_${widgetId}`;
      sessionStorage.setItem(messagesKey, JSON.stringify(messages));
      sessionStorage.setItem(timestampKey, Date.now().toString());
    }
  }, [messages, widgetId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Cart functions
  const getCartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);
  const getCartTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: Product, variant = '', price?: number) => {
    const finalPrice = price || product.price || 0;
    const existingItem = cart.find(item => item.productId === product.id && item.variant === variant);

    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id && item.variant === variant
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        variant,
        price: finalPrice,
        quantity: 1,
        image_url: product.image_url || product.image
      }]);
    }
    showToast(`${product.name} adăugat în coș`);
  };

  const updateQuantity = (productId: string, variant: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId && item.variant === variant) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string, variant: string) => {
    setCart(cart.filter(item => !(item.productId === productId && item.variant === variant)));
  };

  // Format message - EXACT copy from chat.js formatMessage function
  const formatMessage = (text: string): { products: Product[], cleanText: string } => {
    const products: Product[] = [];
    let cleanText = text;

    // Extract local products [PRODUCT:id] - EXACT like chat.js
    const productRegex = /\[PRODUCT:([^\]]+)\]/g;
    cleanText = cleanText.replace(productRegex, (_, productId) => {
      const product = (config?.products || []).find(p => p.id === productId);
      if (product) {
        products.push(product);
      }
      return '';
    });

    // Extract scraped products [SCRAPED_PRODUCT:{...}] - EXACT like chat.js
    const scrapedProductRegex = /\[?SCRAPED_PRODUCT:\s*(\{[^}]+\})\]?/g;
    cleanText = cleanText.replace(scrapedProductRegex, (_, jsonStr) => {
      try {
        const product = JSON.parse(jsonStr);
        products.push({
          id: 'scraped-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: product.name || '',
          price: parseFloat(product.price) || 0,
          image_url: product.image,
          description: product.description
        });
      } catch (e) {
        console.error('Failed to parse scraped product:', e);
      }
      return '';
    });

    cleanText = cleanText.trim().replace(/\n{3,}/g, '\n\n');
    return { products, cleanText };
  };

  const handleProductClick = (product: Product) => {
    setInputValue(`Vreau mai multe detalii despre ${product.name}`);
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !widgetId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-widget-groq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          systemPrompt: config?.system_prompt,
          products: config?.products || [],
          scrapeEnabled: config?.scrape_enabled || false,
          scrapeWebsiteUrl: config?.scrape_website_url || '',
          widgetId: widgetId,
          sessionId: sessionId
        })
      });
      const data = await res.json();

      if (data.success && data.message) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Îmi pare rău, a apărut o eroare.'
        }]);
      }
    } catch (e) {
      console.error('Send message failed:', e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Eroare de conexiune.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  const submitOrder = async (formData: Record<string, string>) => {
    try {
      const orderData = {
        customer_name: formData.name || null,
        customer_phone: formData.phone || null,
        customer_address: formData.address || null,
        customer_notes: formData.notes || null,
        cart_items: cart,
        total_amount: getCartTotal(),
        currency: 'MDL',
        widget_id: widgetId
      };

      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-widget-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify(orderData)
      });

      const data = await res.json();

      if (data.success) {
        setOrderSuccess(true);
        setTimeout(() => {
          setCart([]);
          setIsCartOpen(false);
          setIsCheckoutOpen(false);
          setOrderSuccess(false);
        }, 3000);
      } else {
        throw new Error(data.error || 'Order failed');
      }
    } catch (e) {
      console.error('Order failed:', e);
      alert('Eroare la plasarea comenzii. Vă rugăm încercați din nou.');
    }
  };

  const cartEnabled = config?.cart_enabled !== false;

  if (isConfigLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={AGENTAUTO_LOGO} alt="Agentauto" className="w-16 h-16 rounded-2xl animate-pulse" />
          <span className="text-zinc-400 text-sm">Se încarcă...</span>
        </div>
      </div>
    );
  }

  // Render message with products - EXACT like chat.js
  const renderMessage = (message: Message) => {
    if (message.role === 'user') {
      return (
        <div key={message.id} className="max-w-[85%] ml-auto">
          <div className="px-4 py-3 text-sm leading-relaxed bg-black text-white rounded-[18px] rounded-br-[4px]">
            {message.content}
          </div>
        </div>
      );
    }

    const { products, cleanText } = formatMessage(message.content);

    return (
      <div key={message.id} className="flex flex-col gap-3 max-w-full">
        {/* Product Carousel - EXACT like chat.js */}
        {products.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {products.map((product, idx) => (
              <div
                key={product.id + '-' + idx}
                className="min-w-[180px] max-w-[200px] bg-white border border-zinc-200 rounded-2xl p-3 flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleProductClick(product)}
              >
                {(product.image_url || product.image) && (
                  <img
                    src={product.image_url || product.image}
                    alt={product.name}
                    className="w-full aspect-square object-contain bg-zinc-50 rounded-xl mb-2 p-2"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div className="text-sm font-bold text-zinc-900 leading-tight">{product.name}</div>
                {product.description && (
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{product.description}</div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-green-600 font-mono">
                    {product.price || 0} {product.currency || 'MDL'}
                  </span>
                  {cartEnabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text Content */}
        {cleanText && (
          <div className="max-w-[85%]">
            <div className="px-4 py-3 text-sm leading-relaxed bg-white border border-zinc-200 text-zinc-900 rounded-[4px] rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] shadow-sm whitespace-pre-wrap">
              {cleanText}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-zinc-100 flex items-center bg-white relative z-10">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-3">
          <img src={AGENTAUTO_LOGO} alt="Agent Automation" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-sm font-bold text-zinc-900">{config?.assistant_name || 'AI Agent'}</h1>
            <p className="text-xs text-zinc-400">Online</p>
          </div>
        </div>

        {/* Cart Button */}
        {cartEnabled && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition flex-shrink-0 relative"
          >
            <ShoppingBag className="w-5 h-5" />
            {getCartCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {getCartCount()}
              </span>
            )}
          </button>
        )}
      </header>

      {/* Messages */}
      <main
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          backgroundImage: 'radial-gradient(#e4e4e7 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {messages.map(renderMessage)}

        {isLoading && (
          <div className="max-w-[85%]">
            <div className="bg-white border border-zinc-200 rounded-[4px] rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="flex-shrink-0 px-4 py-3 bg-white border-t border-zinc-100">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={config?.placeholder || 'Scrie mesajul tău...'}
              disabled={isLoading}
              className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-full text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0",
              inputValue.trim() && !isLoading
                ? "bg-black text-white shadow-lg hover:bg-zinc-800"
                : "bg-zinc-100 text-zinc-400"
            )}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="text-center mt-3">
          <a
            href="https://agentauto.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-zinc-400 hover:text-zinc-600 transition inline-flex items-center gap-1"
          >
            <img src={AGENTAUTO_LOGO} alt="Agentauto" className="w-3.5 h-3.5 rounded" />
            Powered by Agentauto
          </a>
        </div>
      </footer>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}

      {/* Cart Panel */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <header className="flex-shrink-0 px-4 py-3 border-b border-zinc-100 flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-zinc-900">Coșul tău</h2>
          </header>

          <main className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 stroke-1" />
                <p>Coșul este gol</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.productId + item.variant} className="flex gap-3 p-3 bg-zinc-50 rounded-xl">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.productName} className="w-16 h-16 object-cover rounded-lg bg-white" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-zinc-900">{item.productName}</div>
                      {item.variant && <div className="text-xs text-zinc-500">{item.variant}</div>}
                      <div className="text-sm font-bold text-green-600 mt-1">{item.price} MDL</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.variant, -1)}
                        className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.variant, 1)}
                        className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.productId, item.variant)}
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {cart.length > 0 && (
            <footer className="flex-shrink-0 p-4 border-t border-zinc-100 bg-zinc-50">
              <div className="flex justify-between text-lg font-bold mb-3">
                <span>Total:</span>
                <span>{getCartTotal()} MDL</span>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-3.5 bg-black text-white rounded-xl font-semibold hover:bg-zinc-800 transition"
              >
                {config?.checkout_button_text || 'Finalizează comanda'}
              </button>
            </footer>
          )}
        </div>
      )}

      {/* Checkout Panel */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <header className="flex-shrink-0 px-4 py-3 border-b border-zinc-100 flex items-center gap-3">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-zinc-900">Finalizare comandă</h2>
          </header>

          {orderSuccess ? (
            <main className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Comandă plasată!</h3>
                <p className="text-zinc-500">{config?.checkout_success_message || 'Mulțumim pentru comandă!'}</p>
              </div>
            </main>
          ) : (
            <CheckoutForm
              config={config}
              total={getCartTotal()}
              onSubmit={submitOrder}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Checkout Form Component
const CheckoutForm = ({ config, total, onSubmit }: { config: WidgetConfig | null, total: number, onSubmit: (data: Record<string, string>) => void }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields = config?.checkout_fields?.filter(f => f.enabled) || [
    { id: 'name', label: 'Nume', type: 'text', required: false, placeholder: 'Introduceți numele' },
    { id: 'phone', label: 'Telefon', type: 'tel', required: true, placeholder: '+373 xxx xxx xxx' },
    { id: 'address', label: 'Adresa', type: 'textarea', required: false, placeholder: 'Introduceți adresa de livrare' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = formData[field.id]?.trim() || '';
      if (field.required && !value) {
        newErrors[field.id] = `${field.label} este obligatoriu`;
      } else if (field.id === 'phone' && value && !/^[\d\s+()-]{6,}$/.test(value)) {
        newErrors[field.id] = 'Număr de telefon invalid';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto p-4">
        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
          {fields.map(field => (
            <div key={field.id}>
              <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.id] || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, [field.id]: e.target.value });
                    setErrors({ ...errors, [field.id]: '' });
                  }}
                  placeholder={field.placeholder}
                  className={cn(
                    "w-full px-4 py-3 border rounded-xl text-sm resize-none h-24 focus:outline-none focus:border-zinc-400 transition",
                    errors[field.id] ? "border-red-400" : "border-zinc-200"
                  )}
                />
              ) : (
                <input
                  type={field.type}
                  value={formData[field.id] || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, [field.id]: e.target.value });
                    setErrors({ ...errors, [field.id]: '' });
                  }}
                  placeholder={field.placeholder}
                  className={cn(
                    "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-zinc-400 transition",
                    errors[field.id] ? "border-red-400" : "border-zinc-200"
                  )}
                />
              )}
              {errors[field.id] && (
                <p className="text-red-500 text-xs mt-1">{errors[field.id]}</p>
              )}
            </div>
          ))}
        </form>
      </main>

      <footer className="flex-shrink-0 p-4 border-t border-zinc-100 bg-zinc-50">
        <div className="flex justify-between text-lg font-bold mb-3">
          <span>Total:</span>
          <span>{total} MDL</span>
        </div>
        <button
          type="submit"
          form="checkout-form"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-black text-white rounded-xl font-semibold hover:bg-zinc-800 transition disabled:opacity-50"
        >
          {isSubmitting ? 'Se procesează...' : (config?.checkout_button_text || 'Finalizează comanda')}
        </button>
      </footer>
    </>
  );
};

export default WidgetChatPage;
