import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Plus, SendHorizontal, Maximize2, Minimize2, ShoppingBag, Minus, Trash2, ArrowLeft, Check, Phone, MapPin, User, FileText, Mic, MicOff, Volume2 } from 'lucide-react';
import { WidgetSettings } from './WidgetCustomizer';
import { CheckoutField } from '@/types/dtos';
import { useConversation } from '@11labs/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  image_url: string;
  price?: number | null;
  currency?: string;
  attributes?: {
    variants?: Array<{
      bucati?: string;
      price?: number;
      attribute?: string;
    }>;
    variant_type?: 'bucati' | 'attribute' | 'none';
  };
}

interface CartItem {
  productId: string;
  productName: string;
  variant?: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface WidgetPreviewProps {
  settings: WidgetSettings;
  messages?: Message[];
  inputMessage?: string;
  isLoading?: boolean;
  products?: Product[];
  onInputChange?: (value: string) => void;
  onSendMessage?: () => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  onProductClick?: (productName: string) => void;
  // Checkout props
  cartEnabled?: boolean;
  checkoutFields?: CheckoutField[];
  checkoutButtonText?: string;
  checkoutSuccessMessage?: string;
  widgetConfigId?: string;
  onOrderSubmit?: (orderData: any) => Promise<boolean>;
  // Preview mode - 'desktop' or 'mobile'
  previewMode?: 'desktop' | 'mobile';
  // Voice props
  voiceEnabled?: boolean;
  voiceAgentId?: string;
  onVoiceMessage?: (userText: string, agentText: string) => void;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({
  settings,
  messages = [],
  inputMessage = '',
  isLoading = false,
  products = [],
  onInputChange,
  onSendMessage,
  onKeyPress,
  onProductClick,
  cartEnabled = true,
  checkoutFields = [
    { id: 'name', label: 'Nume', type: 'text', required: false, enabled: true, placeholder: 'Introduceți numele' },
    { id: 'phone', label: 'Telefon', type: 'tel', required: true, enabled: true, placeholder: '+373 xxx xxx xxx' },
    { id: 'address', label: 'Adresa', type: 'textarea', required: false, enabled: true, placeholder: 'Introduceți adresa de livrare' },
    { id: 'notes', label: 'Note', type: 'textarea', required: false, enabled: false, placeholder: 'Note suplimentare (opțional)' }
  ],
  checkoutButtonText = 'Finalizează comanda',
  checkoutSuccessMessage = 'Mulțumim pentru comandă! Vă vom contacta în curând.',
  widgetConfigId,
  onOrderSubmit,
  previewMode = 'desktop',
  voiceEnabled = false,
  voiceAgentId,
  onVoiceMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Checkout state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutFormData, setCheckoutFormData] = useState<Record<string, string>>({});
  const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Voice state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Local voice messages state (for preview)
  const [voiceMessages, setVoiceMessages] = useState<Message[]>([]);
  const [voiceProductCards, setVoiceProductCards] = useState<Product[]>([]);

  // Helper to find products by name
  const findProductsByNames = useCallback((names: string[]) => {
    return names.map(name => {
      const found = products.find(p =>
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(p.name.toLowerCase())
      );
      return found;
    }).filter(Boolean) as Product[];
  }, [products]);

  // ElevenLabs conversation hook with client tools
  const conversation = useConversation({
    onConnect: () => {
      console.log('[Voice] Connected to ElevenLabs');
      setVoiceStatus('listening');
    },
    onDisconnect: () => {
      console.log('[Voice] Disconnected from ElevenLabs');
      setVoiceStatus('idle');
      setIsVoiceActive(false);
      setCurrentTranscript('');
    },
    onMessage: (message: any) => {
      console.log('[Voice] Message:', message);

      // Handle message format from ElevenLabs SDK
      if (message.message && typeof message.message === 'string') {
        const isUser = message.source === 'user';
        const newMessage: Message = {
          role: isUser ? 'user' : 'assistant',
          content: message.message
        };

        // Add to local voice messages
        setVoiceMessages(prev => [...prev, newMessage]);

        // Update transcript indicator
        if (isUser) {
          setCurrentTranscript(message.message);
          setVoiceStatus('listening');
        } else {
          setCurrentTranscript('');
          setVoiceStatus('speaking');
        }

        // Call callback if provided
        if (onVoiceMessage && !isUser) {
          onVoiceMessage('', message.message);
        }
      }
    },
    onError: (error) => {
      console.error('[Voice] Error:', error);
      setVoiceStatus('error');
      setTimeout(() => setVoiceStatus('idle'), 3000);
    },
    onModeChange: (mode: any) => {
      console.log('[Voice] Mode changed:', mode);
      if (mode.mode === 'speaking') {
        setVoiceStatus('speaking');
      } else if (mode.mode === 'listening') {
        setVoiceStatus('listening');
        setCurrentTranscript('');
      }
    },
    // Client tools that the agent can call
    clientTools: {
      show_products: async (params: { product_names?: string[] }) => {
        console.log('[Voice Tool] show_products called with:', params);

        const productNames = params.product_names || [];
        let foundProducts: Product[] = [];

        if (productNames.length > 0) {
          // Find specific products by name
          foundProducts = findProductsByNames(productNames);
        } else {
          // Show all products if no names specified
          foundProducts = products.slice(0, 6); // Limit to 6
        }

        if (foundProducts.length > 0) {
          // Add products to display
          setVoiceProductCards(foundProducts);

          // Add a message showing products were displayed
          setVoiceMessages(prev => [...prev, {
            role: 'assistant',
            content: `[PRODUCTS:${foundProducts.map(p => p.id).join(',')}]`
          }]);

          return `Am afișat ${foundProducts.length} produse în chat: ${foundProducts.map(p => p.name).join(', ')}`;
        } else {
          return 'Nu am găsit produsele solicitate în catalog.';
        }
      },
      get_products: async (params: { search?: string }) => {
        console.log('[Voice Tool] get_products called with:', params);

        let filteredProducts = products;
        if (params.search) {
          const search = params.search.toLowerCase();
          filteredProducts = products.filter(p =>
            p.name.toLowerCase().includes(search) ||
            (p.description && p.description.toLowerCase().includes(search))
          );
        }

        return JSON.stringify({
          products: filteredProducts.slice(0, 10).map(p => ({
            name: p.name,
            description: p.description,
            price: p.price,
            currency: p.currency || 'MDL'
          }))
        });
      },
      add_to_cart: async (params: { product_name: string; quantity?: number }) => {
        console.log('[Voice Tool] add_to_cart called with:', params);

        const product = products.find(p =>
          p.name.toLowerCase().includes(params.product_name.toLowerCase())
        );

        if (product) {
          const qty = params.quantity || 1;
          // Add to cart
          for (let i = 0; i < qty; i++) {
            addToCart(product);
          }
          return `Am adăugat ${qty}x ${product.name} în coș. Total în coș: ${cart.length + qty} produse.`;
        }
        return `Nu am găsit produsul "${params.product_name}" în catalog.`;
      }
    }
  });

  // Handle voice toggle
  const handleVoiceToggle = useCallback(async () => {
    if (!voiceEnabled || !voiceAgentId) {
      console.warn('[Voice] Voice not enabled or no agent ID');
      return;
    }

    if (isVoiceActive) {
      // Stop voice session
      await conversation.endSession();
      setIsVoiceActive(false);
      setVoiceStatus('idle');
      setCurrentTranscript('');
    } else {
      // Start voice session
      setVoiceStatus('connecting');
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Start ElevenLabs session
        await conversation.startSession({
          agentId: voiceAgentId,
        });
        setIsVoiceActive(true);
      } catch (error) {
        console.error('[Voice] Failed to start session:', error);
        setVoiceStatus('error');
        setTimeout(() => setVoiceStatus('idle'), 3000);
      }
    }
  }, [voiceEnabled, voiceAgentId, isVoiceActive, conversation]);

  const isFunctional = onInputChange && onSendMessage;

  // Helper function to detect requested variant from conversation context
  const detectRequestedVariant = (): string | null => {
    // Look through recent messages for variant requests
    for (let i = messages.length - 1; i >= Math.max(0, messages.length - 5); i--) {
      const msg = messages[i];
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();
        // Match patterns like "10 bucăți", "cu 10", "vreau 10", "pentru 10"
        const bucatiMatch = content.match(/(?:cu\s+)?(\d+)\s*(?:bucăți|bucati|buc)?/);
        if (bucatiMatch) {
          return bucatiMatch[1]; // Return the number (e.g., "10")
        }
      }
    }
    return null;
  };

  // Helper function to get variant by requested number or smallest price
  const getVariantForProduct = (product: Product, requestedBucati?: string | null) => {
    const attrs = product.attributes as any;
    const variants = attrs?.variants || [];

    if (variants.length > 0) {
      // If user requested a specific variant, try to find it
      if (requestedBucati) {
        const requestedVariant = variants.find((v: any) => {
          const bucatiNum = v.bucati?.replace(/\D/g, ''); // Extract number from "10 bucăți"
          return bucatiNum === requestedBucati;
        });
        if (requestedVariant) {
          return {
            price: requestedVariant.price || product.price || 0,
            label: requestedVariant.bucati || requestedVariant.attribute || '',
            variant: requestedVariant
          };
        }
      }

      // Default: get the largest/most expensive variant (usually what's shown on esushi.md)
      const sortedVariants = [...variants].sort((a: any, b: any) => (b.price || 0) - (a.price || 0));
      const largest = sortedVariants[0];
      return {
        price: largest.price || product.price || 0,
        label: largest.bucati || largest.attribute || '',
        variant: largest
      };
    }
    return {
      price: product.price || 0,
      label: '',
      variant: null
    };
  };

  // Helper function to get smallest price variant (for default add to cart)
  const getSmallestPriceVariant = (product: Product) => {
    const attrs = product.attributes as any;
    const variants = attrs?.variants || [];

    if (variants.length > 0) {
      // Sort by price ascending and get the cheapest
      const sortedVariants = [...variants].sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
      const cheapest = sortedVariants[0];
      return {
        price: cheapest.price || product.price || 0,
        label: cheapest.bucati || cheapest.attribute || '',
        variant: cheapest
      };
    }
    return {
      price: product.price || 0,
      label: '',
      variant: null
    };
  };

  // Add to cart function - uses the variant from context (what user requested)
  const addToCart = (product: Product, e?: React.MouseEvent, overrideVariant?: { price: number; label: string }) => {
    if (e) e.stopPropagation(); // Prevent triggering the card click if event exists

    // Use override variant if provided, otherwise detect from conversation
    const requestedBucati = detectRequestedVariant();
    const variantInfo = overrideVariant || getVariantForProduct(product, requestedBucati);
    const { price, label } = variantInfo;
    const cartKey = `${product.id}-${label}`;

    setCart(prev => {
      const existingItem = prev.find(item => item.productId === product.id && item.variant === label);
      if (existingItem) {
        return prev.map(item =>
          item.productId === product.id && item.variant === label
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        variant: label,
        price,
        quantity: 1,
        image_url: product.image_url
      }];
    });

    // Trigger animation
    setAddedAnimation(cartKey);
    setTimeout(() => setAddedAnimation(null), 500);
  };

  // Remove from cart
  const removeFromCart = (productId: string, variant?: string) => {
    setCart(prev => prev.filter(item => !(item.productId === productId && item.variant === variant)));
  };

  // Update quantity
  const updateQuantity = (productId: string, variant: string | undefined, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId && item.variant === variant) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Cart totals
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Validate checkout form
  const validateCheckout = (): boolean => {
    const errors: Record<string, string> = {};
    const enabledFields = checkoutFields.filter(f => f.enabled);

    for (const field of enabledFields) {
      if (field.required && !checkoutFormData[field.id]?.trim()) {
        errors[field.id] = `${field.label} este obligatoriu`;
      }
      // Phone validation
      if (field.id === 'phone' && checkoutFormData[field.id]) {
        const phoneRegex = /^[\d\s+()-]{6,}$/;
        if (!phoneRegex.test(checkoutFormData[field.id])) {
          errors[field.id] = 'Număr de telefon invalid';
        }
      }
    }

    setCheckoutErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (!validateCheckout()) return;

    setIsSubmitting(true);
    try {
      const orderData = {
        customer_name: checkoutFormData.name || null,
        customer_phone: checkoutFormData.phone || null,
        customer_address: checkoutFormData.address || null,
        customer_notes: checkoutFormData.notes || null,
        cart_items: cart,
        total_amount: cartTotal,
        currency: 'MDL',
        widget_config_id: widgetConfigId
      };

      if (onOrderSubmit) {
        const success = await onOrderSubmit(orderData);
        if (success) {
          setOrderSuccess(true);
          // Clear cart after 3 seconds
          setTimeout(() => {
            setCart([]);
            setOrderSuccess(false);
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
            setCheckoutFormData({});
          }, 3000);
        }
      } else {
        // Demo mode - just show success
        setOrderSuccess(true);
        setTimeout(() => {
          setCart([]);
          setOrderSuccess(false);
          setIsCheckoutOpen(false);
          setIsCartOpen(false);
          setCheckoutFormData({});
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open checkout
  const openCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
    setOrderSuccess(false);
  };

  // Get field icon
  const getFieldIcon = (fieldId: string) => {
    switch (fieldId) {
      case 'name': return <User className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'address': return <MapPin className="w-4 h-4" />;
      case 'notes': return <FileText className="w-4 h-4" />;
      default: return null;
    }
  };

  // Format message with product cards - returns {textParts, productCards}
  const formatMessage = (text: string): { textParts: string[], productCards: JSX.Element[] } => {
    const textParts: string[] = [];
    const productCards: JSX.Element[] = [];

    // Handle [PRODUCTS:id1,id2,id3] format from voice tools
    const productsMatch = text.match(/\[PRODUCTS:([^\]]+)\]/);
    if (productsMatch) {
      const productIds = productsMatch[1].split(',');
      const foundProducts = productIds
        .map(id => products.find(p => p.id === id.trim()))
        .filter(Boolean) as Product[];

      foundProducts.forEach((product, index) => {
        const requestedBucati = detectRequestedVariant();
        const { price: displayPrice, label: variantLabel } = getVariantForProduct(product, requestedBucati);
        productCards.push(
          <div
            key={`voice-product-${product.id}-${index}`}
            className="product-card group"
            onClick={() => onProductClick?.(product.name)}
          >
            <img src={product.image_url} alt={product.name} className="card-img" />
            <h4 className="text-sm font-bold text-black group-hover:underline">{product.name}</h4>
            {variantLabel && (
              <div className="text-[10px] text-zinc-400 mt-0.5">{variantLabel}</div>
            )}
            {product.description && (
              <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{product.description}</div>
            )}
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm font-bold text-green-600 font-mono">
                {displayPrice} {product.currency || 'MDL'}
              </span>
              {cartEnabled && (
                <div
                  className="add-btn"
                  onClick={(e) => addToCart(product, e, { price: displayPrice, label: variantLabel })}
                >
                  <Plus className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        );
      });

      // Return early with just the product cards for voice tool messages
      return { textParts: [], productCards };
    }

    const combinedRegex = /\[PRODUCT:([^\]]+)\]|\[?SCRAPED_PRODUCT:\s*(\{[^}]+\})\]?/g;
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index).trim();
        if (textBefore) textParts.push(textBefore);
      }

      if (match[1]) {
        const productId = match[1];
        const product = products.find(p => p.id === productId);

        if (product) {
          // Use the variant requested by user from conversation context
          const requestedBucati = detectRequestedVariant();
          const { price: displayPrice, label: variantLabel } = getVariantForProduct(product, requestedBucati);
          productCards.push(
            <div
              key={`product-${productId}-${match.index}`}
              className="product-card group"
              onClick={() => onProductClick?.(product.name)}
            >
              <img src={product.image_url} alt={product.name} className="card-img" />
              <h4 className="text-sm font-bold text-black group-hover:underline">{product.name}</h4>
              {variantLabel && (
                <div className="text-[10px] text-zinc-400 mt-0.5">{variantLabel}</div>
              )}
              {product.description && (
                <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{product.description}</div>
              )}
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm font-bold text-green-600 font-mono">
                  {displayPrice} {product.currency || 'MDL'}
                </span>
                {cartEnabled && (
                  <div
                    className="add-btn"
                    onClick={(e) => addToCart(product, e, { price: displayPrice, label: variantLabel })}
                  >
                    <Plus className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        }
      } else if (match[2]) {
        try {
          const scrapedProduct = JSON.parse(match[2]);
          const scrapedAsProduct: Product = {
            id: `scraped-${match.index}`,
            name: scrapedProduct.name,
            description: scrapedProduct.description,
            image_url: scrapedProduct.image,
            price: parseFloat(scrapedProduct.price) || 0,
            currency: 'MDL'
          };
          productCards.push(
            <div
              key={`scraped-${match.index}`}
              className="product-card group"
              onClick={() => onProductClick?.(scrapedProduct.name)}
            >
              {scrapedProduct.image && (
                <img
                  src={scrapedProduct.image}
                  alt={scrapedProduct.name}
                  className="card-img"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <h4 className="text-sm font-bold text-black group-hover:underline">{scrapedProduct.name}</h4>
              {scrapedProduct.description && (
                <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{scrapedProduct.description}</div>
              )}
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm font-bold text-green-600 font-mono">{scrapedProduct.price || ''}</span>
                {cartEnabled && (
                  <div
                    className="add-btn"
                    onClick={(e) => addToCart(scrapedAsProduct, e)}
                  >
                    <Plus className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        } catch (e) {
          console.error('Failed to parse scraped product:', e);
        }
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex).trim();
      if (remainingText) textParts.push(remainingText);
    }

    return { textParts, productCards };
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col items-center justify-center">
      <style>{`
        /* Hide Scrollbar */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* --- WIDGET FRAME (The Morphing Container) --- */
        .widget-frame {
            width: 380px;
            height: 720px;
            background: #fff;
            border-radius: 28px;
            box-shadow: 0 40px 80px -20px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* EXPANDED STATE */
        .widget-frame.expanded {
            width: 90vw;
            height: 90vh;
            max-width: 1000px;
            border-radius: 24px;
        }

        /* MOBILE PREVIEW MODE */
        .widget-frame.mobile-preview {
            width: 375px;
            height: 812px;
            border-radius: 40px;
            border: 12px solid #1a1a1a;
            box-shadow: 0 40px 80px -20px rgba(0,0,0,0.3), inset 0 0 0 2px #333;
        }

        .widget-frame.mobile-preview::before {
            content: '';
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: 28px;
            background: #1a1a1a;
            border-radius: 20px;
            z-index: 100;
        }

        .widget-frame.mobile-preview .chat-header {
            padding-top: 44px;
            background: #fff;
            border-bottom: 1px solid #e4e4e7;
        }

        .widget-frame.mobile-preview .chat-scroll-area {
            padding-top: 100px;
        }

        /* --- HEADER --- */
        .chat-header {
            padding: 16px 24px;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 20;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
        }

        .brand-logo {
            width: 32px;
            height: 32px;
            background: #cc0000;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }

        /* --- CHAT AREA --- */
        .chat-scroll-area {
            flex-grow: 1;
            padding: 80px 24px 100px 24px;
            overflow-y: auto;
            background: radial-gradient(#e4e4e7 1px, transparent 1px);
            background-size: 20px 20px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            scroll-behavior: smooth;
        }

        /* --- BUBBLES --- */
        .msg-bot-container {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
            max-width: 100%;
        }

        .msg-bubble {
            background: #fff;
            border: 1px solid #e4e4e7;
            padding: 12px 18px;
            border-radius: 4px 18px 18px 18px;
            font-size: 14px;
            color: #18181b;
            line-height: 1.5;
            box-shadow: 0 2px 8px -2px rgba(0,0,0,0.05);
            max-width: 600px;
        }

        .msg-user {
            align-self: flex-end;
            max-width: 600px;
            background: #000;
            color: #fff;
            padding: 12px 18px;
            border-radius: 18px 18px 4px 18px;
            font-size: 14px;
            line-height: 1.5;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        /* --- FULL BLEED CAROUSEL --- */
        .carousel-scroller {
            display: flex;
            gap: 16px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            width: calc(100% + 48px);
            margin-left: -24px;
            padding: 4px 24px;
        }

        .product-card {
            min-width: 200px;
            max-width: 220px;
            background: #fff;
            border: 1px solid #e4e4e7;
            border-radius: 16px;
            padding: 12px;
            scroll-snap-align: start;
            transition: all 0.2s;
            cursor: pointer;
            position: relative;
            flex-shrink: 0;
        }

        .product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px -6px rgba(0,0,0,0.12);
            border-color: #d4d4d8;
        }

        .card-img {
            width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: contain;
            background: #f9fafb;
            border-radius: 12px;
            margin-bottom: 12px;
            padding: 8px;
        }

        .add-btn {
            width: 32px;
            height: 32px;
            background: #000;
            color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }

        .product-card:hover .add-btn {
            transform: scale(1.1);
        }

        /* --- INPUT DOCK --- */
        .input-dock {
            position: absolute;
            bottom: 24px;
            left: 24px;
            right: 24px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.6);
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border-radius: 20px;
            padding: 10px 10px 10px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 30;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Expanded Input Adjustment */
        .widget-frame.expanded .input-dock {
            max-width: 800px;
            margin: 0 auto;
            bottom: 40px;
        }

        .chat-input {
            flex-grow: 1;
            background: transparent;
            border: none;
            font-size: 15px;
            color: #18181b;
            padding: 8px 0;
        }

        .chat-input:focus {
            outline: none;
        }

        .chat-input::placeholder {
            color: #a1a1aa;
        }

        .send-btn {
            width: 44px;
            height: 44px;
            background: #000;
            color: #fff;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: transform 0.2s;
            border: none;
            flex-shrink: 0;
        }

        .send-btn:hover:not(:disabled) {
            transform: scale(1.05);
        }

        .send-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* Loading dots animation */
        @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-6px); }
        }

        .loading-dot {
            width: 6px;
            height: 6px;
            background: #a1a1aa;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out;
        }

        .loading-dot:nth-child(1) { animation-delay: 0s; }
        .loading-dot:nth-child(2) { animation-delay: 0.16s; }
        .loading-dot:nth-child(3) { animation-delay: 0.32s; }

        /* --- CART BUTTON --- */
        .cart-btn {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
          cursor: pointer;
          background: transparent;
        }
        .cart-btn:hover {
          background: #f4f4f5;
        }
        .cart-btn.has-items {
          background: #000;
          color: #fff;
        }
        .cart-btn.has-items:hover {
          background: #27272a;
        }
        .cart-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        /* --- CART PANEL --- */
        .cart-panel {
          position: absolute;
          top: 60px;
          right: 16px;
          width: 320px;
          max-height: 400px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
          z-index: 40;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .cart-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f4f4f5;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .cart-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: #fafafa;
          border-radius: 12px;
          margin-bottom: 8px;
        }

        .cart-item-img {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          object-fit: cover;
          background: #fff;
        }

        .cart-item-info {
          flex: 1;
          min-width: 0;
        }

        .cart-item-name {
          font-size: 13px;
          font-weight: 600;
          color: #18181b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cart-item-variant {
          font-size: 11px;
          color: #71717a;
        }

        .cart-item-price {
          font-size: 13px;
          font-weight: 700;
          color: #16a34a;
          font-family: monospace;
        }

        .cart-qty-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }

        .cart-qty-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #fff;
          border: 1px solid #e4e4e7;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .cart-qty-btn:hover {
          border-color: #000;
          background: #000;
          color: #fff;
        }

        .cart-footer {
          padding: 16px 20px;
          border-top: 1px solid #f4f4f5;
          background: #fafafa;
        }

        .cart-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .cart-checkout-btn {
          width: 100%;
          padding: 12px;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cart-checkout-btn:hover {
          background: #27272a;
          transform: translateY(-1px);
        }

        /* Add animation */
        @keyframes cartPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .cart-pop {
          animation: cartPop 0.3s ease-out;
        }

        /* Line clamp for descriptions */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* --- CHECKOUT PANEL --- */
        .checkout-panel {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #fff;
          z-index: 50;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .checkout-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f4f4f5;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .checkout-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          cursor: pointer;
          background: #f4f4f5;
          color: #71717a;
        }

        .checkout-back-btn:hover {
          background: #e4e4e7;
          color: #000;
        }

        .checkout-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .checkout-field {
          margin-bottom: 16px;
        }

        .checkout-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #18181b;
          margin-bottom: 8px;
        }

        .checkout-label-icon {
          width: 24px;
          height: 24px;
          background: #f4f4f5;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #71717a;
        }

        .checkout-required {
          color: #ef4444;
          font-size: 11px;
          font-weight: 500;
        }

        .checkout-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
          background: #fafafa;
        }

        .checkout-input:focus {
          outline: none;
          border-color: #000;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
        }

        .checkout-input.error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .checkout-error {
          font-size: 12px;
          color: #ef4444;
          margin-top: 4px;
        }

        .checkout-textarea {
          min-height: 80px;
          resize: none;
        }

        .checkout-summary {
          background: #fafafa;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .checkout-summary-title {
          font-size: 12px;
          font-weight: 700;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .checkout-summary-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #e4e4e7;
        }

        .checkout-summary-item:last-child {
          border-bottom: none;
        }

        .checkout-summary-img {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          background: #fff;
        }

        .checkout-footer {
          padding: 20px;
          border-top: 1px solid #f4f4f5;
          background: #fafafa;
        }

        .checkout-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .checkout-submit-btn {
          width: 100%;
          padding: 14px;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .checkout-submit-btn:hover:not(:disabled) {
          background: #27272a;
          transform: translateY(-1px);
        }

        .checkout-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* Success animation */
        .checkout-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          animation: successPop 0.5s ease-out;
        }

        @keyframes successPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .success-title {
          font-size: 20px;
          font-weight: 700;
          color: #18181b;
          margin-bottom: 8px;
        }

        .success-message {
          font-size: 14px;
          color: #71717a;
          max-width: 280px;
        }
      `}</style>

      {/* Chat Widget */}
      {isOpen && (
        <div className={`widget-frame ${isExpanded ? 'expanded' : ''} ${previewMode === 'mobile' ? 'mobile-preview' : ''}`}>
          {/* Header */}
          <div className="chat-header">
            <div className="flex items-center gap-3">
              <img
                src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Group%2010.jpg"
                alt="Agentauto"
                className="w-8 h-8 rounded-lg object-cover"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 transition"
                title="Toggle Size"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              {/* Cart Button with Badge - only show if cart is enabled */}
              {cartEnabled && (
                <button
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  className={`cart-btn ${cartCount > 0 ? 'has-items' : 'text-zinc-400'} ${addedAnimation ? 'cart-pop' : ''}`}
                  title="Coș"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="cart-badge">{cartCount}</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Cart Panel */}
          {isCartOpen && (
            <div className="cart-panel">
              <div className="cart-header">
                <span className="text-sm font-bold text-black">Coșul tău</span>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-zinc-400 hover:text-black transition"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="cart-items no-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400">Coșul este gol</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={`${item.productId}-${item.variant}-${idx}`} className="cart-item">
                      <img src={item.image_url} alt="" className="cart-item-img" />
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.productName}</div>
                        {item.variant && (
                          <div className="cart-item-variant">{item.variant}</div>
                        )}
                        <div className="cart-item-price">{item.price} MDL</div>
                        <div className="cart-qty-controls">
                          <button
                            className="cart-qty-btn"
                            onClick={() => updateQuantity(item.productId, item.variant, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            className="cart-qty-btn"
                            onClick={() => updateQuantity(item.productId, item.variant, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            className="cart-qty-btn ml-auto text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500"
                            onClick={() => removeFromCart(item.productId, item.variant)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="cart-footer">
                  <div className="cart-total">
                    <span className="text-sm text-zinc-500">Total</span>
                    <span className="text-lg font-bold text-black font-mono">{cartTotal} MDL</span>
                  </div>
                  <button className="cart-checkout-btn" onClick={openCheckout}>
                    {checkoutButtonText}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Checkout Panel */}
          {isCheckoutOpen && (
            <div className="checkout-panel">
              {orderSuccess ? (
                /* Success State */
                <div className="checkout-success">
                  <div className="success-icon">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="success-title">Comandă plasată!</h3>
                  <p className="success-message">{checkoutSuccessMessage}</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="checkout-header">
                    <button
                      className="checkout-back-btn"
                      onClick={() => {
                        setIsCheckoutOpen(false);
                        setIsCartOpen(true);
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-base font-bold text-black">Finalizare comandă</h3>
                      <p className="text-xs text-zinc-400">{cart.length} produse • {cartTotal} MDL</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="checkout-content no-scrollbar">
                    {/* Order Summary */}
                    <div className="checkout-summary">
                      <h4 className="checkout-summary-title">Sumar comandă</h4>
                      {cart.map((item, idx) => (
                        <div key={idx} className="checkout-summary-item">
                          <img src={item.image_url} alt="" className="checkout-summary-img" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black truncate">{item.productName}</p>
                            {item.variant && <p className="text-xs text-zinc-400">{item.variant}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-black">{item.price * item.quantity} MDL</p>
                            <p className="text-xs text-zinc-400">x{item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Form Fields */}
                    {checkoutFields.filter(f => f.enabled).map(field => (
                      <div key={field.id} className="checkout-field">
                        <label className="checkout-label">
                          <span className="checkout-label-icon">{getFieldIcon(field.id)}</span>
                          {field.label}
                          {field.required && <span className="checkout-required">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            className={`checkout-input checkout-textarea ${checkoutErrors[field.id] ? 'error' : ''}`}
                            placeholder={field.placeholder}
                            value={checkoutFormData[field.id] || ''}
                            onChange={(e) => {
                              setCheckoutFormData(prev => ({ ...prev, [field.id]: e.target.value }));
                              if (checkoutErrors[field.id]) {
                                setCheckoutErrors(prev => {
                                  const next = { ...prev };
                                  delete next[field.id];
                                  return next;
                                });
                              }
                            }}
                          />
                        ) : (
                          <input
                            type={field.type}
                            className={`checkout-input ${checkoutErrors[field.id] ? 'error' : ''}`}
                            placeholder={field.placeholder}
                            value={checkoutFormData[field.id] || ''}
                            onChange={(e) => {
                              setCheckoutFormData(prev => ({ ...prev, [field.id]: e.target.value }));
                              if (checkoutErrors[field.id]) {
                                setCheckoutErrors(prev => {
                                  const next = { ...prev };
                                  delete next[field.id];
                                  return next;
                                });
                              }
                            }}
                          />
                        )}
                        {checkoutErrors[field.id] && (
                          <p className="checkout-error">{checkoutErrors[field.id]}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="checkout-footer">
                    <div className="checkout-total">
                      <span className="text-sm font-medium text-zinc-500">Total de plată</span>
                      <span className="text-xl font-bold text-black font-mono">{cartTotal} MDL</span>
                    </div>
                    <button
                      className="checkout-submit-btn"
                      onClick={handleSubmitOrder}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Se procesează...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Plasează comanda
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Chat Area */}
          <div className="chat-scroll-area no-scrollbar">
            {/* Welcome message */}
            {messages.length === 0 && voiceMessages.length === 0 && (
              <div className="msg-bot-container">
                <div className="msg-bubble">
                  {settings.welcomeMessage}
                </div>
              </div>
            )}

            {/* Messages (chat + voice combined) */}
            {[...messages, ...voiceMessages].map((msg, idx) => {
              if (msg.role === 'user') {
                return (
                  <div key={idx} className="msg-user">
                    {msg.content}
                  </div>
                );
              }

              // Assistant message - parse for products
              const { textParts, productCards } = formatMessage(msg.content);
              // Combine all text parts into one
              const fullText = textParts.filter(t => t).join('\n\n');

              return (
                <div key={idx} className="msg-bot-container">
                  {/* Product carousel first */}
                  {productCards.length > 0 && (
                    <div className="carousel-scroller no-scrollbar" style={{ marginBottom: '12px' }}>
                      {productCards}
                    </div>
                  )}

                  {/* All text in one bubble below products */}
                  {fullText && (
                    <div className="msg-bubble">
                      {fullText}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Voice transcript indicator */}
            {isVoiceActive && currentTranscript && (
              <div className="msg-user" style={{ opacity: 0.7, fontStyle: 'italic' }}>
                🎤 {currentTranscript}...
              </div>
            )}

            {/* Voice status indicator */}
            {isVoiceActive && voiceStatus === 'speaking' && (
              <div className="msg-bot-container">
                <div className="msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>Agent vorbește...</span>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="msg-bot-container">
                <div className="msg-bubble">
                  <div className="flex gap-1.5 py-1">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-6" />
          </div>

          {/* Input Dock */}
          <div className="input-dock">
            {/* Voice transcript indicator */}
            {isVoiceActive && currentTranscript && (
              <div className="absolute -top-12 left-0 right-0 mx-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 animate-pulse">
                {currentTranscript}...
              </div>
            )}

            <input
              type="text"
              className="chat-input"
              placeholder={isVoiceActive ? "Ascult..." : (settings.placeholder || "Scrie mesajul tău...")}
              value={inputMessage}
              onChange={(e) => onInputChange?.(e.target.value)}
              onKeyPress={onKeyPress}
              disabled={!isFunctional || isLoading || isVoiceActive}
            />

            {/* Voice button - only show if voice is enabled */}
            {voiceEnabled && (
              <button
                className={`voice-btn ${isVoiceActive ? 'active' : ''} ${voiceStatus === 'error' ? 'error' : ''}`}
                onClick={handleVoiceToggle}
                disabled={voiceStatus === 'connecting'}
                title={isVoiceActive ? 'Oprește conversația vocală' : 'Pornește conversația vocală'}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  marginRight: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  backgroundColor: isVoiceActive
                    ? '#ef4444'
                    : voiceStatus === 'error'
                      ? '#fca5a5'
                      : '#f3f4f6',
                  color: isVoiceActive ? '#fff' : '#6b7280',
                }}
              >
                {voiceStatus === 'connecting' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : voiceStatus === 'speaking' ? (
                  <Volume2 className="w-5 h-5" />
                ) : isVoiceActive ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )}

            <button
              className="send-btn"
              onClick={onSendMessage}
              disabled={!isFunctional || isLoading || !inputMessage?.trim() || isVoiceActive}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SendHorizontal className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button - Only show when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110 overflow-hidden border-2 border-white"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
        >
          <img
            src="https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Group%2010.jpg"
            alt="Agentauto"
            className="w-full h-full object-cover"
          />
        </button>
      )}
    </div>
  );
};

export default WidgetPreview;
