// Agentauto Chat Widget - Identical to Dashboard Preview
(function() {
  'use strict';

  const SUPABASE_URL = 'https://pwfczzxwjfxomqzhhwvj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZmN6enh3amZ4b21xemhod3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwMTA3OTEsImV4cCI6MjA0OTU4Njc5MX0.4FVIwnc25GwEbDTR_TIvVYztvz9pwZ5uKBFkeMw4dHg';

  const AGENTAUTO_LOGO = 'https://pwfczzxwjfxomqzhhwvj.supabase.co/storage/v1/object/public/Poze%20Agentauto/Group%2010.jpg';

  // Load ElevenLabs Convai SDK
  let ElevenLabsConvai = null;
  const loadElevenLabsSDK = () => {
    return new Promise((resolve, reject) => {
      if (ElevenLabsConvai) {
        resolve(ElevenLabsConvai);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@11labs/client@latest/dist/browser.min.js';
      script.onload = () => {
        ElevenLabsConvai = window.ElevenLabsClient;
        console.log('[Agentauto Voice] ElevenLabs SDK loaded');
        resolve(ElevenLabsConvai);
      };
      script.onerror = () => reject(new Error('Failed to load ElevenLabs SDK'));
      document.head.appendChild(script);
    });
  };

  class AgentautoChat extends HTMLElement {
    constructor() {
      super();
      this.messages = [];
      this.isLoading = false;
      this.isOpen = false;
      this.isExpanded = false;
      this.config = null;
      this.widgetId = null;
      this.sessionId = null;
      // Cart state
      this.cart = [];
      this.isCartOpen = false;
      this.isCheckoutOpen = false;
      this.addedAnimation = null;
      this.hasShownWelcome = false;
      // Voice state
      this.isVoiceActive = false;
      this.voiceStatus = 'idle'; // idle, connecting, listening, speaking, error
      this.currentTranscript = '';
      this.elevenLabsConversation = null;
    }

    generateSessionId() {
      return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    connectedCallback() {
      console.log('[Agentauto Chat] Widget connected');
      const widgetId = this.getAttribute('widget-id');
      if (!widgetId) {
        console.error('[Agentauto Chat] widget-id attribute is required');
        return;
      }
      this.widgetId = widgetId;

      // Load or create session ID from sessionStorage
      const sessionKey = `agentauto_session_${widgetId}`;
      const existingSession = sessionStorage.getItem(sessionKey);
      if (existingSession) {
        this.sessionId = existingSession;
      } else {
        this.sessionId = this.generateSessionId();
        sessionStorage.setItem(sessionKey, this.sessionId);
      }

      // Check if welcome message was already shown this session
      const welcomeKey = `agentauto_welcome_shown_${widgetId}`;
      this.hasShownWelcome = sessionStorage.getItem(welcomeKey) === 'true';

      console.log('[Agentauto Chat] Loading config for widget:', widgetId);
      this.loadConfigAndRender(widgetId);
    }

    async loadConfigAndRender(widgetId) {
      try {
        console.log('[Agentauto Chat] Fetching config...');
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-widget-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ widget_id: widgetId })
        });
        const data = await res.json();
        console.log('[Agentauto Chat] Config response:', data);

        if (data.success && data.config) {
          this.config = data.config;
        } else {
          console.log('[Agentauto Chat] Using default config');
          this.config = this.getDefaultConfig();
        }
      } catch (e) {
        console.error('[Agentauto Chat] Config load failed:', e);
        this.config = this.getDefaultConfig();
      }

      console.log('[Agentauto Chat] Rendering widget...');
      this.render();
      console.log('[Agentauto Chat] Widget rendered successfully');
    }

    getDefaultConfig() {
      return {
        assistant_name: 'AI Agent',
        welcome_message: 'Bună! Cum vă pot ajuta astăzi?',
        system_prompt: 'Ești un asistent AI prietenos și profesional.',
        primary_color: '#000000',
        text_color: '#1f2937',
        position: 'bottom-right',
        border_radius: 28,
        button_size: 56,
        window_width: 380,
        window_height: 720,
        offset_x: 24,
        offset_y: 24,
        chat_bg_color: '#ffffff',
        placeholder: 'Scrie mesajul tău...',
        show_powered_by: true,
        cart_enabled: true,
        checkout_fields: [
          { id: 'name', label: 'Nume', type: 'text', required: false, enabled: true, placeholder: 'Introduceți numele' },
          { id: 'phone', label: 'Telefon', type: 'tel', required: true, enabled: true, placeholder: '+373 xxx xxx xxx' },
          { id: 'address', label: 'Adresa', type: 'textarea', required: false, enabled: true, placeholder: 'Introduceți adresa de livrare' },
          { id: 'notes', label: 'Note', type: 'textarea', required: false, enabled: false, placeholder: 'Note suplimentare' }
        ],
        checkout_button_text: 'Finalizează comanda',
        checkout_success_message: 'Mulțumim pentru comandă! Vă vom contacta în curând.',
        // Voice defaults
        voice_enabled: false,
        voice_id: null,
        voice_language: 'ro',
        voice_first_message: null
      };
    }

    // Cart functions
    getCartCount() {
      return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    getCartTotal() {
      return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    addToCart(product, variantLabel = '', price = null) {
      const finalPrice = price || product.price || 0;
      const cartKey = `${product.id}-${variantLabel}`;

      const existingItem = this.cart.find(item => item.productId === product.id && item.variant === variantLabel);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        this.cart.push({
          productId: product.id,
          productName: product.name,
          variant: variantLabel,
          price: finalPrice,
          quantity: 1,
          image_url: product.image_url || product.image
        });
      }

      // Trigger animation
      this.addedAnimation = cartKey;
      setTimeout(() => {
        this.addedAnimation = null;
        this.updateCartBadge();
      }, 500);

      this.updateCartBadge();
      this.showAddedFeedback(product.name);
    }

    removeFromCart(productId, variant) {
      this.cart = this.cart.filter(item => !(item.productId === productId && item.variant === variant));
      this.updateCartBadge();
      this.renderCartPanel();
    }

    updateQuantity(productId, variant, delta) {
      const item = this.cart.find(i => i.productId === productId && i.variant === variant);
      if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
          this.removeFromCart(productId, variant);
        } else {
          this.updateCartBadge();
          this.renderCartPanel();
        }
      }
    }

    updateCartBadge() {
      const badge = this.shadowRoot.querySelector('.cart-badge');
      const count = this.getCartCount();
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    }

    showAddedFeedback(productName) {
      // Show a brief toast notification
      const toast = document.createElement('div');
      toast.className = 'cart-toast';
      toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> ${productName} adăugat`;
      this.shadowRoot.querySelector('.widget-frame').appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }

    render() {
      const c = this.config;
      const position = c.position || 'bottom-right';
      const offsetX = c.offset_x ?? 24;
      const offsetY = c.offset_y ?? 24;
      const placeholder = c.placeholder || 'Scrie mesajul tău...';
      const cartEnabled = c.cart_enabled !== false;
      const voiceEnabled = c.voice_enabled === true;

      // Only attach shadow once
      const shadow = this.shadowRoot || this.attachShadow({ mode: 'open' });
      const positionStyles = this.getPositionStyles(position, offsetX, offsetY);

      // EXACT COPY OF WidgetPreview.tsx STYLES
      shadow.innerHTML = `
        <style>
          /* Hide Scrollbar */
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

          * { box-sizing: border-box; margin: 0; padding: 0; }

          .kw-container {
            position: fixed;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            ${positionStyles}
          }

          /* --- WIDGET FRAME (The Morphing Container) --- */
          .widget-frame {
            position: absolute;
            bottom: 72px;
            right: 0;
            width: 380px;
            height: 720px;
            background: #fff;
            border-radius: 28px;
            box-shadow: 0 40px 80px -20px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
            pointer-events: none;
            transform: translateY(20px);
          }

          .widget-frame.open {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
          }

          /* EXPANDED STATE */
          .widget-frame.expanded {
            width: 90vw;
            height: 90vh;
            max-width: 1000px;
            border-radius: 24px;
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

          .header-logo {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            overflow: hidden;
          }

          /* Mobile back button - hidden on desktop */
          .mobile-back-btn {
            display: none;
          }

          .header-logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .header-actions {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .header-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: none;
            background: transparent;
            color: #a1a1aa;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
          }

          .header-btn:hover {
            background: #f4f4f5;
            color: #18181b;
          }

          .header-btn svg {
            width: 16px;
            height: 16px;
          }

          /* Cart Badge */
          .cart-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            width: 18px;
            height: 18px;
            background: #ef4444;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
          }

          /* --- CHAT AREA --- */
          .chat-scroll-area {
            flex-grow: 1;
            padding: 80px 24px 100px 24px;
            overflow-y: auto;
            overflow-x: hidden;
            background: radial-gradient(#e4e4e7 1px, transparent 1px);
            background-size: 20px 20px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            scroll-behavior: smooth;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .chat-scroll-area::-webkit-scrollbar {
            display: none;
          }

          /* --- BUBBLES --- */
          .msg-bot-container {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
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
            max-width: 85%;
          }

          .msg-user {
            align-self: flex-end;
            max-width: 85%;
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
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .carousel-scroller::-webkit-scrollbar {
            display: none;
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

          .product-name {
            font-size: 14px;
            font-weight: 700;
            color: #18181b;
            line-height: 1.3;
          }

          .product-card:hover .product-name {
            text-decoration: underline;
          }

          .product-variant {
            font-size: 10px;
            color: #a1a1aa;
            margin-top: 2px;
          }

          .product-desc {
            font-size: 11px;
            color: #71717a;
            margin-top: 2px;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .product-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
          }

          .product-price {
            font-size: 14px;
            font-weight: 700;
            color: #16a34a;
            font-family: ui-monospace, SFMono-Regular, monospace;
          }

          .add-btn {
            width: 32px;
            height: 32px;
            background: #000;
            color: #fff;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          }

          .add-btn:hover {
            transform: scale(1.1);
          }

          .add-btn.added {
            background: #16a34a;
            transform: scale(1.2);
          }

          .add-btn svg {
            width: 16px;
            height: 16px;
            stroke: currentColor;
            stroke-width: 2;
            fill: none;
          }

          /* --- INPUT DOCK --- */
          .input-dock {
            position: absolute;
            bottom: 36px;
            left: 24px;
            right: 24px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
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
            left: 50%;
            transform: translateX(-50%);
            bottom: 40px;
          }

          .chat-input {
            flex-grow: 1;
            background: transparent;
            border: none;
            font-size: 15px;
            color: #18181b;
            padding: 8px 0;
            font-family: inherit;
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

          /* Voice Button */
          .voice-btn {
            width: 40px;
            height: 40px;
            background: #f3f4f6;
            color: #6b7280;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            flex-shrink: 0;
          }

          .voice-btn:hover {
            background: #e5e7eb;
            color: #374151;
          }

          .voice-btn.active {
            background: #ef4444;
            color: #fff;
            animation: voice-pulse 1.5s ease-in-out infinite;
          }

          .voice-btn.connecting {
            background: #f59e0b;
            color: #fff;
          }

          .voice-btn.speaking {
            background: #22c55e;
            color: #fff;
          }

          .voice-btn.error {
            background: #fca5a5;
            color: #ef4444;
          }

          .voice-btn svg {
            width: 20px;
            height: 20px;
            stroke: currentColor;
            stroke-width: 2;
            fill: none;
          }

          @keyframes voice-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }

          /* Voice transcript indicator */
          .voice-transcript {
            position: absolute;
            top: -48px;
            left: 0;
            right: 0;
            margin: 0 8px;
            padding: 8px 12px;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 12px;
            font-size: 14px;
            color: #1d4ed8;
            animation: transcript-pulse 1.5s ease-in-out infinite;
          }

          @keyframes transcript-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          .send-btn:hover:not(:disabled) {
            transform: scale(1.05);
          }

          .send-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .send-btn svg {
            width: 20px;
            height: 20px;
            stroke: currentColor;
            stroke-width: 2;
            fill: none;
          }

          /* --- POWERED BY --- */
          .powered-by {
            position: absolute;
            bottom: 6px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 11px;
            color: #a1a1aa;
            z-index: 25;
          }

          .powered-by a {
            color: #71717a;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: color 0.2s;
          }

          .powered-by a:hover {
            color: #18181b;
          }

          .powered-by img {
            width: 14px;
            height: 14px;
            border-radius: 3px;
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

          /* --- TOGGLE BUTTON --- */
          .toggle-btn {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: 2px solid #fff;
            cursor: pointer;
            background: #fff;
            box-shadow: 0 8px 24px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease;
            overflow: hidden;
          }

          .toggle-btn:hover {
            transform: scale(1.1);
          }

          .toggle-btn img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: opacity 0.2s, transform 0.2s;
          }

          .toggle-btn .close-icon {
            position: absolute;
            opacity: 0;
            transform: rotate(90deg);
            transition: opacity 0.2s, transform 0.2s;
          }

          .toggle-btn.open img {
            opacity: 0;
            transform: rotate(-90deg);
          }

          .toggle-btn.open .close-icon {
            opacity: 1;
            transform: rotate(0);
          }

          .close-icon svg {
            width: 24px;
            height: 24px;
            stroke: #18181b;
            stroke-width: 2;
          }

          /* --- CART PANEL --- */
          .cart-panel {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #fff;
            z-index: 100;
            display: flex;
            flex-direction: column;
            transform: translateX(100%);
            transition: transform 0.3s ease;
          }

          .cart-panel.open {
            transform: translateX(0);
          }

          .cart-header {
            padding: 16px 24px;
            border-bottom: 1px solid #e4e4e7;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .back-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: none;
            background: #f4f4f5;
            cursor: pointer;
            transition: all 0.2s;
          }

          .back-btn:hover {
            background: #e4e4e7;
          }

          .back-btn svg {
            width: 16px;
            height: 16px;
            stroke: #18181b;
            stroke-width: 2;
          }

          .cart-title {
            font-size: 18px;
            font-weight: 700;
            color: #18181b;
          }

          .cart-items {
            flex-grow: 1;
            overflow-y: auto;
            padding: 16px 24px;
          }

          .cart-item {
            display: flex;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid #f4f4f5;
          }

          .cart-item-img {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            object-fit: cover;
            background: #f9fafb;
          }

          .cart-item-info {
            flex-grow: 1;
          }

          .cart-item-name {
            font-size: 14px;
            font-weight: 600;
            color: #18181b;
          }

          .cart-item-variant {
            font-size: 12px;
            color: #71717a;
          }

          .cart-item-price {
            font-size: 14px;
            font-weight: 700;
            color: #16a34a;
            margin-top: 4px;
          }

          .cart-item-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .qty-btn {
            width: 28px;
            height: 28px;
            border: 1px solid #e4e4e7;
            background: #fff;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          }

          .qty-btn:hover {
            background: #f4f4f5;
          }

          .qty-btn svg {
            width: 14px;
            height: 14px;
            stroke: #18181b;
            stroke-width: 2;
          }

          .qty-value {
            font-size: 14px;
            font-weight: 600;
            min-width: 24px;
            text-align: center;
          }

          .remove-btn {
            width: 28px;
            height: 28px;
            border: none;
            background: #fef2f2;
            color: #ef4444;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            margin-left: 8px;
          }

          .remove-btn:hover {
            background: #fee2e2;
          }

          .remove-btn svg {
            width: 14px;
            height: 14px;
            stroke: currentColor;
            stroke-width: 2;
          }

          .cart-empty {
            text-align: center;
            padding: 40px 20px;
            color: #71717a;
          }

          .cart-empty svg {
            width: 48px;
            height: 48px;
            stroke: #d4d4d8;
            margin-bottom: 12px;
          }

          .cart-footer {
            padding: 16px 24px;
            border-top: 1px solid #e4e4e7;
            background: #fafafa;
          }

          .cart-total {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
          }

          .checkout-btn {
            width: 100%;
            padding: 14px;
            background: #000;
            color: #fff;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .checkout-btn:hover {
            background: #18181b;
            transform: translateY(-1px);
          }

          .checkout-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          /* --- CHECKOUT PANEL --- */
          .checkout-panel {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #fff;
            z-index: 110;
            display: flex;
            flex-direction: column;
            transform: translateX(100%);
            transition: transform 0.3s ease;
          }

          .checkout-panel.open {
            transform: translateX(0);
          }

          .checkout-form {
            flex-grow: 1;
            overflow-y: auto;
            padding: 16px 24px;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #18181b;
            margin-bottom: 6px;
          }

          .form-label svg {
            width: 14px;
            height: 14px;
            stroke: #71717a;
          }

          .form-label .required {
            color: #ef4444;
          }

          .form-input {
            width: 100%;
            padding: 12px 14px;
            border: 1px solid #e4e4e7;
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.2s;
          }

          .form-input:focus {
            outline: none;
            border-color: #000;
            box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
          }

          .form-input.error {
            border-color: #ef4444;
          }

          .form-error {
            font-size: 12px;
            color: #ef4444;
            margin-top: 4px;
          }

          textarea.form-input {
            resize: none;
            min-height: 80px;
          }

          /* Success message */
          .order-success {
            text-align: center;
            padding: 40px 20px;
          }

          .success-icon {
            width: 64px;
            height: 64px;
            background: #dcfce7;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
          }

          .success-icon svg {
            width: 32px;
            height: 32px;
            stroke: #16a34a;
            stroke-width: 2;
          }

          .success-title {
            font-size: 18px;
            font-weight: 700;
            color: #18181b;
            margin-bottom: 8px;
          }

          .success-message {
            font-size: 14px;
            color: #71717a;
          }

          /* Toast notification */
          .cart-toast {
            position: absolute;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: #18181b;
            color: #fff;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 200;
            white-space: nowrap;
          }

          .cart-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          .cart-toast svg {
            width: 16px;
            height: 16px;
            stroke: #16a34a;
            stroke-width: 2;
          }

          /* Mobile - Full Screen - use multiple breakpoints */
          @media (max-width: 768px), (hover: none) and (pointer: coarse) {
            .widget-frame {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              max-height: 100% !important;
              border-radius: 0 !important;
              transform: translateY(100%);
              opacity: 0;
              pointer-events: none;
              box-shadow: none !important;
            }

            .widget-frame.open {
              transform: translateY(0) !important;
              opacity: 1 !important;
              pointer-events: auto !important;
            }

            .chat-header {
              padding: 12px 16px;
              padding-top: calc(12px + env(safe-area-inset-top, 0px));
              background: #fff;
              border-bottom: 1px solid #e4e4e7;
            }

            /* Mobile back button - only visible on mobile */
            .mobile-back-btn {
              display: flex !important;
              width: 36px;
              height: 36px;
              border-radius: 10px;
              align-items: center;
              justify-content: center;
              background: #f4f4f5;
              border: none;
              cursor: pointer;
              margin-right: 12px;
              transition: all 0.2s;
            }

            .mobile-back-btn:hover {
              background: #e4e4e7;
            }

            .mobile-back-btn svg {
              width: 20px;
              height: 20px;
              stroke: #71717a;
              stroke-width: 2;
            }

            .chat-scroll-area {
              padding: 70px 16px 90px 16px;
              padding-top: calc(70px + env(safe-area-inset-top, 0px));
            }

            .input-dock {
              left: 12px;
              right: 12px;
              bottom: calc(28px + env(safe-area-inset-bottom, 0px));
              border-radius: 16px;
            }

            .powered-by {
              bottom: calc(6px + env(safe-area-inset-bottom, 0px));
            }

            .carousel-scroller {
              width: calc(100% + 32px);
              margin-left: -16px;
              padding: 4px 16px;
            }

            .cart-panel,
            .checkout-panel {
              border-radius: 0;
            }

            .cart-header {
              padding-top: calc(12px + env(safe-area-inset-top, 0px));
            }

            .cart-footer {
              padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            }

            /* Toggle button on mobile - ensure it stays visible */
            .toggle-btn {
              position: fixed;
              bottom: calc(24px + env(safe-area-inset-bottom, 0px));
              right: 24px;
              z-index: 999999;
            }
          }
        </style>

        <div class="kw-container">
          <div class="widget-frame">
            <!-- Header -->
            <div class="chat-header">
              <button class="mobile-back-btn" title="Înapoi">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor"/>
                </svg>
              </button>
              <div class="header-logo">
                <img src="${AGENTAUTO_LOGO}" alt=""/>
              </div>
              <div class="header-actions">
                <button class="header-btn expand-btn" title="Expand">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                </button>
                ${cartEnabled ? `
                <button class="header-btn cart-btn" title="Coș">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
                  </svg>
                  <span class="cart-badge">0</span>
                </button>
                ` : ''}
              </div>
            </div>

            <!-- Chat Area -->
            <div class="chat-scroll-area no-scrollbar"></div>

            <!-- Input Dock -->
            <div class="input-dock">
              <input type="text" class="chat-input" placeholder="${placeholder}"/>
              ${voiceEnabled ? `
              <button class="voice-btn" title="Pornește conversația vocală">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" x2="12" y1="19" y2="22"></line>
                </svg>
              </button>
              ` : ''}
              <button class="send-btn" title="Trimite">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>

            <!-- Powered By -->
            <div class="powered-by">
              <a href="https://agentauto.app" target="_blank">
                <img src="${AGENTAUTO_LOGO}" alt="Agentauto"/>
                Powered by Agentauto
              </a>
            </div>

            <!-- Cart Panel -->
            ${cartEnabled ? `
            <div class="cart-panel">
              <div class="cart-header">
                <button class="back-btn" title="Înapoi">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <span class="cart-title">Coșul tău</span>
              </div>
              <div class="cart-items"></div>
              <div class="cart-footer">
                <div class="cart-total">
                  <span>Total:</span>
                  <span class="total-value">0 MDL</span>
                </div>
                <button class="checkout-btn">${c.checkout_button_text || 'Finalizează comanda'}</button>
              </div>
            </div>

            <!-- Checkout Panel -->
            <div class="checkout-panel">
              <div class="cart-header">
                <button class="back-btn checkout-back-btn" title="Înapoi">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <span class="cart-title">Finalizare comandă</span>
              </div>
              <div class="checkout-form"></div>
              <div class="cart-footer">
                <div class="cart-total">
                  <span>Total:</span>
                  <span class="checkout-total-value">0 MDL</span>
                </div>
                <button class="checkout-btn submit-order-btn">${c.checkout_button_text || 'Finalizează comanda'}</button>
              </div>
            </div>
            ` : ''}
          </div>

          <!-- Toggle Button -->
          <button class="toggle-btn">
            <img src="${AGENTAUTO_LOGO}" alt="Chat"/>
            <span class="close-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </span>
          </button>
        </div>
      `;

      this.setupEvents(shadow);
    }

    getPositionStyles(position, offsetX, offsetY) {
      const styles = [];
      if (position.includes('bottom')) styles.push(`bottom: ${offsetY}px`);
      if (position.includes('top')) styles.push(`top: ${offsetY}px`);
      if (position.includes('right')) styles.push(`right: ${offsetX}px`);
      if (position.includes('left')) styles.push(`left: ${offsetX}px`);
      return styles.join('; ');
    }

    setupEvents(shadow) {
      const toggleBtn = shadow.querySelector('.toggle-btn');
      const widgetFrame = shadow.querySelector('.widget-frame');
      const expandBtn = shadow.querySelector('.expand-btn');
      const mobileBackBtn = shadow.querySelector('.mobile-back-btn');
      const input = shadow.querySelector('.chat-input');
      const sendBtn = shadow.querySelector('.send-btn');
      const voiceBtn = shadow.querySelector('.voice-btn');
      const chatArea = shadow.querySelector('.chat-scroll-area');
      this.chatArea = chatArea;
      this.inputDock = shadow.querySelector('.input-dock');

      const cartEnabled = this.config.cart_enabled !== false;
      const voiceEnabled = this.config.voice_enabled === true;
      const cartBtn = shadow.querySelector('.cart-btn');
      const cartPanel = shadow.querySelector('.cart-panel');
      const cartBackBtn = cartPanel?.querySelector('.back-btn');
      const checkoutBtn = cartPanel?.querySelector('.checkout-btn');
      const checkoutPanel = shadow.querySelector('.checkout-panel');
      const checkoutBackBtn = shadow.querySelector('.checkout-back-btn');
      const submitOrderBtn = shadow.querySelector('.submit-order-btn');

      // Check if mobile - use multiple detection methods
      const isMobile = () => {
        const width = window.innerWidth <= 768;
        const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        return width || (touch && userAgent);
      };

      // Create mobile fullscreen overlay (outside Shadow DOM for true fullscreen)
      let mobileOverlay = null;
      const createMobileOverlay = () => {
        if (mobileOverlay) return mobileOverlay;

        mobileOverlay = document.createElement('div');
        mobileOverlay.id = 'agentauto-mobile-overlay';
        mobileOverlay.innerHTML = `
          <style>
            #agentauto-mobile-overlay {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              height: 100dvh !important;
              background: #fff !important;
              z-index: 2147483647 !important;
              display: flex !important;
              flex-direction: column !important;
              transform: translateY(100%);
              transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            #agentauto-mobile-overlay.open {
              transform: translateY(0) !important;
            }
            #agentauto-mobile-overlay * {
              box-sizing: border-box;
            }
            .km-header {
              display: flex;
              align-items: center;
              padding: 12px 16px;
              padding-top: calc(12px + env(safe-area-inset-top, 0px));
              background: #fff;
              border-bottom: 1px solid #e4e4e7;
              flex-shrink: 0;
            }
            .km-back-btn {
              width: 36px;
              height: 36px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f4f4f5;
              border: none;
              cursor: pointer;
              margin-right: 12px;
            }
            .km-back-btn svg {
              width: 20px;
              height: 20px;
              stroke: #71717a;
              stroke-width: 2;
            }
            .km-logo {
              width: 32px;
              height: 32px;
              border-radius: 8px;
              overflow: hidden;
            }
            .km-logo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .km-title {
              margin-left: 12px;
              font-size: 14px;
              font-weight: 600;
              color: #18181b;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .km-close-btn {
              margin-left: auto;
              width: 36px;
              height: 36px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: transparent;
              border: none;
              cursor: pointer;
            }
            .km-close-btn svg {
              width: 20px;
              height: 20px;
              stroke: #71717a;
              stroke-width: 2;
            }
            .km-messages {
              flex: 1;
              overflow-y: auto;
              padding: 16px;
              background: radial-gradient(#e4e4e7 1px, transparent 1px);
              background-size: 20px 20px;
            }
            .km-messages::-webkit-scrollbar { display: none; }
            .km-msg-container {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
              max-width: 100%;
              margin-bottom: 12px;
            }
            .km-msg-bot {
              background: #fff;
              border: 1px solid #e4e4e7;
              padding: 12px 18px;
              border-radius: 4px 18px 18px 18px;
              font-size: 14px;
              color: #18181b;
              line-height: 1.5;
              max-width: 85%;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .km-msg-user {
              background: #000;
              color: #fff;
              padding: 12px 18px;
              border-radius: 18px 18px 4px 18px;
              font-size: 14px;
              line-height: 1.5;
              max-width: 85%;
              margin-left: auto;
              margin-bottom: 12px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            /* Mobile Carousel */
            .km-carousel {
              display: flex;
              gap: 12px;
              overflow-x: auto;
              scroll-snap-type: x mandatory;
              width: calc(100% + 32px);
              margin-left: -16px;
              padding: 4px 16px;
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .km-carousel::-webkit-scrollbar { display: none; }
            .km-product-card {
              min-width: 180px;
              max-width: 200px;
              background: #fff;
              border: 1px solid #e4e4e7;
              border-radius: 16px;
              padding: 12px;
              scroll-snap-align: start;
              flex-shrink: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .km-product-card img {
              width: 100%;
              aspect-ratio: 1 / 1;
              object-fit: contain;
              background: #f9fafb;
              border-radius: 12px;
              margin-bottom: 10px;
              padding: 8px;
            }
            .km-product-name {
              font-size: 13px;
              font-weight: 700;
              color: #18181b;
              line-height: 1.3;
            }
            .km-product-desc {
              font-size: 11px;
              color: #71717a;
              margin-top: 2px;
              line-height: 1.3;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .km-product-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 10px;
            }
            .km-product-price {
              font-size: 13px;
              font-weight: 700;
              color: #16a34a;
              font-family: ui-monospace, SFMono-Regular, monospace;
            }
            .km-add-btn {
              width: 28px;
              height: 28px;
              background: #000;
              color: #fff;
              border: none;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            }
            .km-add-btn svg {
              width: 14px;
              height: 14px;
              stroke: currentColor;
              stroke-width: 2;
              fill: none;
            }
            .km-loading {
              display: flex;
              gap: 6px;
              padding: 12px 18px;
              background: #fff;
              border: 1px solid #e4e4e7;
              border-radius: 4px 18px 18px 18px;
              max-width: 80px;
            }
            .km-loading-dot {
              width: 6px;
              height: 6px;
              background: #a1a1aa;
              border-radius: 50%;
              animation: km-bounce 1.4s infinite ease-in-out;
            }
            .km-loading-dot:nth-child(1) { animation-delay: 0s; }
            .km-loading-dot:nth-child(2) { animation-delay: 0.16s; }
            .km-loading-dot:nth-child(3) { animation-delay: 0.32s; }
            @keyframes km-bounce {
              0%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-6px); }
            }
            .km-input-area {
              padding: 12px 16px;
              padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
              background: #fff;
              border-top: 1px solid #e4e4e7;
              flex-shrink: 0;
            }
            .km-input-wrap {
              display: flex;
              align-items: center;
              gap: 12px;
              background: rgba(255,255,255,0.9);
              border: 1px solid #e4e4e7;
              border-radius: 20px;
              padding: 8px 8px 8px 20px;
            }
            .km-input {
              flex: 1;
              border: none;
              background: transparent;
              font-size: 15px;
              color: #18181b;
              outline: none;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .km-input::placeholder {
              color: #a1a1aa;
            }
            .km-send-btn {
              width: 44px;
              height: 44px;
              background: #000;
              color: #fff;
              border-radius: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: none;
              cursor: pointer;
              flex-shrink: 0;
            }
            .km-send-btn:disabled {
              opacity: 0.4;
            }
            .km-send-btn svg {
              width: 20px;
              height: 20px;
              stroke: currentColor;
              stroke-width: 2;
            }
            .km-powered {
              text-align: center;
              padding: 8px;
              font-size: 11px;
              color: #a1a1aa;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .km-powered a {
              color: #71717a;
              text-decoration: none;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            }
            .km-powered img {
              width: 14px;
              height: 14px;
              border-radius: 3px;
            }
          </style>
          <div class="km-header">
            <button class="km-back-btn">
              <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor"/></svg>
            </button>
            <div class="km-logo"><img src="${AGENTAUTO_LOGO}" alt=""/></div>
            <span class="km-title">${this.config.assistant_name || 'AI Agent'}</span>
            <button class="km-close-btn">
              <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor"/></svg>
            </button>
          </div>
          <div class="km-messages"></div>
          <div class="km-input-area">
            <div class="km-input-wrap">
              <input type="text" class="km-input" placeholder="${this.config.placeholder || 'Scrie mesajul tău...'}"/>
              <button class="km-send-btn">
                <svg viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
            <div class="km-powered">
              <a href="https://agentauto.app" target="_blank">
                <img src="${AGENTAUTO_LOGO}" alt=""/>
                Powered by Agentauto
              </a>
            </div>
          </div>
        `;
        document.body.appendChild(mobileOverlay);

        // Setup mobile overlay events
        const backBtn = mobileOverlay.querySelector('.km-back-btn');
        const closeBtn = mobileOverlay.querySelector('.km-close-btn');
        const mobileInput = mobileOverlay.querySelector('.km-input');
        const mobileSendBtn = mobileOverlay.querySelector('.km-send-btn');

        const closeMobile = () => {
          this.isOpen = false;
          mobileOverlay.classList.remove('open');
          toggleBtn.style.display = '';
          document.body.style.cssText = '';
          document.documentElement.style.cssText = '';
        };

        backBtn.addEventListener('click', closeMobile);
        closeBtn.addEventListener('click', closeMobile);

        mobileSendBtn.addEventListener('click', () => {
          if (mobileInput.value.trim() && !this.isLoading) {
            this.sendMessageMobile(mobileInput.value.trim(), mobileOverlay);
            mobileInput.value = '';
          }
        });

        mobileInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && mobileInput.value.trim() && !this.isLoading) {
            this.sendMessageMobile(mobileInput.value.trim(), mobileOverlay);
            mobileInput.value = '';
          }
        });

        return mobileOverlay;
      };

      // Check if running inside an iframe
      const isInIframe = () => {
        try {
          return window.self !== window.top;
        } catch (e) {
          return true; // Cross-origin iframe
        }
      };

      const toggle = () => {
        const mobile = isMobile();
        const inIframe = isInIframe();
        console.log('[Agentauto Chat] Toggle clicked, isOpen:', this.isOpen, 'isMobile:', mobile, 'inIframe:', inIframe);

        if (mobile && inIframe) {
          // MOBILE + IFRAME: Redirect to fullscreen chat page
          // This is the ONLY way to get true fullscreen in cross-origin iframes
          const chatPageUrl = `https://agentauto.app/chat/${this.widgetId}`;
          console.log('[Agentauto Chat] Mobile in iframe - redirecting to:', chatPageUrl);
          window.location.href = chatPageUrl;
          return;
        }

        if (mobile && !inIframe) {
          // MOBILE + NOT IN IFRAME: Use the mobile overlay for true fullscreen
          const overlay = createMobileOverlay();
          this.isOpen = !this.isOpen;

          if (this.isOpen) {
            // Lock body scroll
            document.body.style.cssText = 'overflow: hidden !important; position: fixed !important; width: 100% !important; height: 100% !important; top: 0 !important; left: 0 !important;';
            document.documentElement.style.cssText = 'overflow: hidden !important;';
            overlay.classList.add('open');
            toggleBtn.style.display = 'none';

            this.renderMobileMessages(overlay);
            if (this.messages.length === 0 && !this.hasShownWelcome) {
              this.addMessage('assistant', this.config.welcome_message || 'Bună! Cum vă pot ajuta astăzi?');
              this.hasShownWelcome = true;
              sessionStorage.setItem(`agentauto_welcome_shown_${this.widgetId}`, 'true');
              this.renderMobileMessages(overlay);
            }
            setTimeout(() => overlay.querySelector('.km-input')?.focus(), 300);
          } else {
            document.body.style.cssText = '';
            document.documentElement.style.cssText = '';
            overlay.classList.remove('open');
            toggleBtn.style.display = '';
          }
          console.log('[Agentauto Chat] Mobile overlay now:', this.isOpen ? 'OPEN' : 'CLOSED');
          return;
        }

        // DESKTOP: Use shadow DOM widget
        this.isOpen = !this.isOpen;
        widgetFrame.classList.toggle('open', this.isOpen);
        toggleBtn.classList.toggle('open', this.isOpen);

        if (this.isOpen && this.messages.length === 0 && !this.hasShownWelcome) {
          this.addMessage('assistant', this.config.welcome_message || 'Bună! Cum vă pot ajuta astăzi?');
          this.hasShownWelcome = true;
          sessionStorage.setItem(`agentauto_welcome_shown_${this.widgetId}`, 'true');
        }

        if (this.isOpen) {
          setTimeout(() => input.focus(), 100);
        }

        console.log('[Agentauto Chat] Widget now:', this.isOpen ? 'OPEN' : 'CLOSED');
      };

      const toggleExpand = () => {
        this.isExpanded = !this.isExpanded;
        widgetFrame.classList.toggle('expanded', this.isExpanded);
        expandBtn.innerHTML = this.isExpanded
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
      };

      console.log('[Agentauto Chat] Setting up events, toggleBtn:', toggleBtn);
      toggleBtn.addEventListener('click', toggle);
      expandBtn.addEventListener('click', toggleExpand);

      // Mobile back button - closes the widget
      if (mobileBackBtn) {
        mobileBackBtn.addEventListener('click', () => {
          this.isOpen = false;
          widgetFrame.classList.remove('open');
          toggleBtn.classList.remove('open');
          console.log('[Agentauto Chat] Mobile back button clicked, widget closed');
        });
      }

      // Cart events
      if (cartEnabled && cartBtn && cartPanel) {
        cartBtn.addEventListener('click', () => {
          this.isCartOpen = true;
          cartPanel.classList.add('open');
          this.renderCartPanel();
        });

        cartBackBtn?.addEventListener('click', () => {
          this.isCartOpen = false;
          cartPanel.classList.remove('open');
        });

        checkoutBtn?.addEventListener('click', () => {
          if (this.cart.length > 0) {
            this.isCheckoutOpen = true;
            checkoutPanel?.classList.add('open');
            this.renderCheckoutForm();
          }
        });

        checkoutBackBtn?.addEventListener('click', () => {
          this.isCheckoutOpen = false;
          checkoutPanel?.classList.remove('open');
        });

        submitOrderBtn?.addEventListener('click', () => this.submitOrder());
      }

      const send = async () => {
        const text = input.value.trim();
        if (!text || this.isLoading) return;

        this.addMessage('user', text);
        this.messages.push({ role: 'user', content: text });
        input.value = '';
        this.isLoading = true;
        sendBtn.disabled = true;

        // Add loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.className = 'msg-bot-container';
        loadingEl.innerHTML = `
          <div class="msg-bubble">
            <div style="display: flex; gap: 6px; padding: 4px 0;">
              <div class="loading-dot"></div>
              <div class="loading-dot"></div>
              <div class="loading-dot"></div>
            </div>
          </div>
        `;
        chatArea.appendChild(loadingEl);
        chatArea.scrollTop = chatArea.scrollHeight;

        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-widget-groq`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
              messages: this.messages,
              systemPrompt: this.config.system_prompt,
              products: this.config.products || [],
              scrapeEnabled: this.config.scrape_enabled || false,
              scrapeWebsiteUrl: this.config.scrape_website_url || '',
              widgetId: this.widgetId,
              sessionId: this.sessionId
            })
          });
          const data = await res.json();

          loadingEl.remove();

          if (data.success && data.message) {
            this.addMessage('assistant', data.message);
            this.messages.push({ role: 'assistant', content: data.message });
          } else {
            this.addMessage('assistant', 'Îmi pare rău, a apărut o eroare.');
          }
        } catch (e) {
          loadingEl.remove();
          this.addMessage('assistant', 'Eroare de conexiune.');
        }

        this.isLoading = false;
        sendBtn.disabled = false;
      };

      sendBtn.addEventListener('click', send);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      });

      // Voice button event handler
      if (voiceBtn && voiceEnabled) {
        voiceBtn.addEventListener('click', () => this.toggleVoice());
      }
    }

    // Voice methods
    async toggleVoice() {
      if (!this.config.voice_enabled) {
        console.warn('[Agentauto Voice] Voice is not enabled');
        return;
      }

      if (this.isVoiceActive) {
        // Stop voice session
        this.stopVoice();
      } else {
        // Start voice session
        await this.startVoice();
      }
    }

    async startVoice() {
      try {
        this.voiceStatus = 'connecting';
        this.updateVoiceButton();
        this.showVoiceIndicator('Se conectează...');

        console.log('[Agentauto Voice] Requesting microphone permission...');

        // Check HTTPS
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          throw new Error('HTTPS este necesar pentru microfon');
        }

        // Request microphone permission first
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('[Agentauto Voice] Microphone access granted');
        stream.getTracks().forEach(track => track.stop()); // Release for SDK to use

        // Get voice session config from backend
        const response = await fetch(`${SUPABASE_URL}/functions/v1/widget-voice-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ widget_id: this.widgetId })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Nu s-a putut crea sesiunea voice');
        }

        console.log('[Agentauto Voice] Session config received:', data);

        const signedUrl = data.signed_url;
        const agentName = data.config?.agent_name || 'Agent';

        if (!signedUrl) {
          throw new Error('Nu s-a primit signed URL de la server');
        }

        // Load and use ElevenLabs SDK
        await loadElevenLabsSDK();

        if (!window.ElevenLabsClient) {
          throw new Error('ElevenLabs SDK nu s-a încărcat');
        }

        console.log('[Agentauto Voice] Starting conversation with ElevenLabs SDK...');

        // Use the Conversation class from SDK
        const Conversation = window.ElevenLabsClient.Conversation;

        // Store reference to widget for client tools
        const widgetRef = this;
        // Use products from voice session response OR from config
        const products = data.products || this.config.products || [];
        // Get pre-formatted catalog for dynamic variables
        const productsCatalog = data.products_catalog || products.map(p =>
          `- ${p.name} (ID: ${p.id}): ${p.price} ${p.currency || 'MDL'}`
        ).join('\n');
        // Widget ID (UUID) for tools
        const widgetUuid = data.config?.widget_id || this.config.id;

        console.log('[Agentauto Voice] Products for agent:', products.length);
        console.log('[Agentauto Voice] Widget UUID:', widgetUuid);

        // Get enhanced system prompt with products
        const systemPrompt = data.config?.system_prompt || null;
        console.log('[Agentauto Voice] System prompt available:', !!systemPrompt);

        this.elevenLabsConversation = await Conversation.startSession({
          signedUrl: signedUrl,
          // Dynamic variables that replace {{product}} etc in agent prompt
          dynamicVariables: {
            product: productsCatalog,
            widget_id: widgetUuid,
            products_count: String(products.length)
          },
          // Override system prompt to include products catalog
          // NOTE: This requires "System prompt" override to be enabled in ElevenLabs dashboard
          overrides: systemPrompt ? {
            agent: {
              prompt: {
                prompt: systemPrompt
              }
            }
          } : undefined,
          onConnect: (props) => {
            console.log('[Agentauto Voice] Connected! Conversation ID:', props?.conversationId);
            this.isVoiceActive = true;
            this.voiceStatus = 'listening';
            this.updateVoiceButton();
            this.showVoiceIndicator('🎤 Vorbește acum...');
          },
          onDisconnect: () => {
            console.log('[Agentauto Voice] Disconnected');
            this.stopVoice();
          },
          onMessage: (message) => {
            console.log('[Agentauto Voice] Message:', message);

            // Handle transcription messages
            if (message.message && typeof message.message === 'string') {
              const isUser = message.source === 'user';

              if (isUser) {
                this.showVoiceIndicator(`🎤 "${message.message}"`);
                this.voiceStatus = 'listening';
              } else {
                this.showVoiceIndicator(`🔊 ${agentName} vorbește...`);
                this.voiceStatus = 'speaking';
              }
              this.updateVoiceButton();

              // Add message to chat
              this.addMessage(isUser ? 'user' : 'assistant', message.message);
            }
          },
          onError: (error) => {
            console.error('[Agentauto Voice] Error:', error);
            this.voiceStatus = 'error';
            this.updateVoiceButton();
            this.showVoiceIndicator('Eroare: ' + (error.message || 'Eroare conexiune'));

            setTimeout(() => {
              this.stopVoice();
            }, 2000);
          },
          onModeChange: (mode) => {
            console.log('[Agentauto Voice] Mode changed:', mode);
            if (mode.mode === 'speaking') {
              this.voiceStatus = 'speaking';
              this.showVoiceIndicator(`🔊 ${agentName} vorbește...`);
            } else if (mode.mode === 'listening') {
              this.voiceStatus = 'listening';
              this.showVoiceIndicator('🎤 Vorbește acum...');
            }
            this.updateVoiceButton();
          },
          // Client tools that the ElevenLabs agent can call
          clientTools: {
            show_products: async (params) => {
              console.log('[Agentauto Voice Tool] show_products called:', params);
              const productNames = params.product_names || [];
              let foundProducts = [];

              if (productNames.length > 0) {
                // Find specific products by name
                foundProducts = productNames.map(name => {
                  return products.find(p =>
                    p.name.toLowerCase().includes(name.toLowerCase()) ||
                    name.toLowerCase().includes(p.name.toLowerCase())
                  );
                }).filter(Boolean);
              } else {
                // Show all products if no names specified
                foundProducts = products.slice(0, 6);
              }

              if (foundProducts.length > 0) {
                // Add products as message with special format
                const productIds = foundProducts.map(p => p.id).join(',');
                widgetRef.addMessage('assistant', `[PRODUCTS:${productIds}]`);
                return `Am afișat ${foundProducts.length} produse în chat: ${foundProducts.map(p => p.name).join(', ')}`;
              }
              return 'Nu am găsit produsele solicitate în catalog.';
            },
            get_products: async (params) => {
              console.log('[Agentauto Voice Tool] get_products called:', params);
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
            add_to_cart: async (params) => {
              console.log('[Agentauto Voice Tool] add_to_cart called:', params);
              // Accept both product_name and product_names (ElevenLabs might send either)
              const productName = params.product_name || params.product_names;
              if (!productName) {
                return 'Te rog să îmi spui ce produs dorești să adaugi în coș.';
              }

              const product = products.find(p =>
                p.name.toLowerCase().includes(productName.toLowerCase())
              );

              if (product) {
                const qty = params.quantity || 1;
                for (let i = 0; i < qty; i++) {
                  widgetRef.addToCart(product);
                }
                // Show visual feedback
                widgetRef.showAddedFeedback(product.name);
                const cartCount = widgetRef.getCartCount();
                const totalPrice = product.price * qty;
                return `Am adăugat ${qty}x ${product.name} în coș. Prețul este ${totalPrice} ${product.currency || 'MDL'}. Total în coș: ${cartCount} produse.`;
              }
              return `Nu am găsit produsul "${productName}" în catalog. Vrei să îți arăt ce produse avem disponibile?`;
            }
          }
        });

        console.log('[Agentauto Voice] Session started successfully');

      } catch (error) {
        console.error('[Agentauto Voice] Error starting voice:', error);
        this.voiceStatus = 'error';
        this.updateVoiceButton();

        let errorMessage = error.message || 'Nu s-a putut porni vocea';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Acces la microfon refuzat';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Microfon negăsit';
        }

        this.showVoiceIndicator('Eroare: ' + errorMessage);

        setTimeout(() => {
          this.voiceStatus = 'idle';
          this.updateVoiceButton();
          this.hideVoiceIndicator();
        }, 3000);
      }
    }

    stopVoice() {
      console.log('[Agentauto Voice] Stopping voice session');

      // End ElevenLabs conversation
      if (this.elevenLabsConversation) {
        try {
          this.elevenLabsConversation.endSession();
        } catch (e) {
          console.warn('[Agentauto Voice] Error ending session:', e);
        }
        this.elevenLabsConversation = null;
      }

      this.isVoiceActive = false;
      this.voiceStatus = 'idle';
      this.currentTranscript = '';
      this.updateVoiceButton();
      this.hideVoiceIndicator();
    }

    updateVoiceButton() {
      const voiceBtn = this.shadowRoot.querySelector('.voice-btn');
      if (!voiceBtn) return;

      // Remove all state classes
      voiceBtn.classList.remove('active', 'connecting', 'speaking', 'error');

      // Add appropriate class based on status
      switch (this.voiceStatus) {
        case 'connecting':
          voiceBtn.classList.add('connecting');
          voiceBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          `;
          break;
        case 'listening':
          voiceBtn.classList.add('active');
          voiceBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
          `;
          break;
        case 'speaking':
          voiceBtn.classList.add('speaking');
          voiceBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          `;
          break;
        case 'error':
          voiceBtn.classList.add('error');
          voiceBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
            </svg>
          `;
          break;
        default:
          voiceBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
          `;
      }
    }

    showVoiceIndicator(text) {
      // Remove existing indicator
      this.hideVoiceIndicator();

      const inputDock = this.shadowRoot.querySelector('.input-dock');
      if (!inputDock) return;

      const indicator = document.createElement('div');
      indicator.className = 'voice-transcript';
      indicator.textContent = text;
      inputDock.appendChild(indicator);
    }

    hideVoiceIndicator() {
      const indicator = this.shadowRoot.querySelector('.voice-transcript');
      if (indicator) {
        indicator.remove();
      }
    }

    renderCartPanel() {
      const cartItems = this.shadowRoot.querySelector('.cart-items');
      const totalValue = this.shadowRoot.querySelector('.total-value');
      const checkoutTotalValue = this.shadowRoot.querySelector('.checkout-total-value');

      if (!cartItems) return;

      if (this.cart.length === 0) {
        cartItems.innerHTML = `
          <div class="cart-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
            </svg>
            <div>Coșul este gol</div>
          </div>
        `;
      } else {
        cartItems.innerHTML = this.cart.map(item => `
          <div class="cart-item" data-id="${item.productId}" data-variant="${item.variant || ''}">
            <img class="cart-item-img" src="${item.image_url}" alt="${item.productName}"/>
            <div class="cart-item-info">
              <div class="cart-item-name">${item.productName}</div>
              ${item.variant ? `<div class="cart-item-variant">${item.variant}</div>` : ''}
              <div class="cart-item-price">${item.price} MDL</div>
            </div>
            <div class="cart-item-actions">
              <button class="qty-btn qty-minus">
                <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14"/></svg>
              </button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn qty-plus">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <button class="remove-btn">
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
          </div>
        `).join('');

        // Add event listeners
        cartItems.querySelectorAll('.cart-item').forEach(item => {
          const id = item.dataset.id;
          const variant = item.dataset.variant;

          item.querySelector('.qty-minus')?.addEventListener('click', () => this.updateQuantity(id, variant, -1));
          item.querySelector('.qty-plus')?.addEventListener('click', () => this.updateQuantity(id, variant, 1));
          item.querySelector('.remove-btn')?.addEventListener('click', () => this.removeFromCart(id, variant));
        });
      }

      const total = this.getCartTotal();
      if (totalValue) totalValue.textContent = `${total} MDL`;
      if (checkoutTotalValue) checkoutTotalValue.textContent = `${total} MDL`;
    }

    renderCheckoutForm() {
      const form = this.shadowRoot.querySelector('.checkout-form');
      if (!form) return;

      const fields = this.config.checkout_fields || this.getDefaultConfig().checkout_fields;
      const enabledFields = fields.filter(f => f.enabled);

      form.innerHTML = enabledFields.map(field => `
        <div class="form-group">
          <label class="form-label">
            ${this.getFieldIcon(field.id)}
            ${field.label}
            ${field.required ? '<span class="required">*</span>' : ''}
          </label>
          ${field.type === 'textarea'
            ? `<textarea class="form-input" data-field="${field.id}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`
            : `<input type="${field.type}" class="form-input" data-field="${field.id}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}/>`
          }
          <div class="form-error" data-error="${field.id}"></div>
        </div>
      `).join('');
    }

    getFieldIcon(fieldId) {
      const icons = {
        name: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>',
        phone: '<svg viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>',
        address: '<svg viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        notes: '<svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>'
      };
      return icons[fieldId] || '';
    }

    async submitOrder() {
      const form = this.shadowRoot.querySelector('.checkout-form');
      const submitBtn = this.shadowRoot.querySelector('.submit-order-btn');
      if (!form || !submitBtn) return;

      // Validate
      const fields = this.config.checkout_fields || this.getDefaultConfig().checkout_fields;
      const enabledFields = fields.filter(f => f.enabled);
      const formData = {};
      let hasErrors = false;

      enabledFields.forEach(field => {
        const input = form.querySelector(`[data-field="${field.id}"]`);
        const errorEl = form.querySelector(`[data-error="${field.id}"]`);
        const value = input?.value?.trim() || '';
        formData[field.id] = value;

        if (field.required && !value) {
          input?.classList.add('error');
          if (errorEl) errorEl.textContent = `${field.label} este obligatoriu`;
          hasErrors = true;
        } else if (field.id === 'phone' && value && !/^[\d\s+()-]{6,}$/.test(value)) {
          input?.classList.add('error');
          if (errorEl) errorEl.textContent = 'Număr de telefon invalid';
          hasErrors = true;
        } else {
          input?.classList.remove('error');
          if (errorEl) errorEl.textContent = '';
        }
      });

      if (hasErrors) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Se procesează...';

      try {
        const orderData = {
          customer_name: formData.name || null,
          customer_phone: formData.phone || null,
          customer_address: formData.address || null,
          customer_notes: formData.notes || null,
          cart_items: this.cart,
          total_amount: this.getCartTotal(),
          currency: 'MDL',
          widget_id: this.widgetId
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
          // Show success
          const checkoutPanel = this.shadowRoot.querySelector('.checkout-panel');
          const successMsg = this.config.checkout_success_message || 'Mulțumim pentru comandă!';

          if (checkoutPanel) {
            checkoutPanel.innerHTML = `
              <div class="order-success">
                <div class="success-icon">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div class="success-title">Comandă plasată!</div>
                <div class="success-message">${successMsg}</div>
              </div>
            `;
          }

          // Clear cart after delay
          setTimeout(() => {
            this.cart = [];
            this.isCartOpen = false;
            this.isCheckoutOpen = false;
            this.updateCartBadge();

            const cartPanel = this.shadowRoot.querySelector('.cart-panel');
            cartPanel?.classList.remove('open');
            checkoutPanel?.classList.remove('open');

            // Re-render panels
            this.render();
          }, 3000);
        } else {
          throw new Error(data.error || 'Order failed');
        }
      } catch (e) {
        console.error('[Agentauto Chat] Order failed:', e);
        submitBtn.disabled = false;
        submitBtn.textContent = this.config.checkout_button_text || 'Finalizează comanda';
        alert('Eroare la plasarea comenzii. Vă rugăm încercați din nou.');
      }
    }

    addMessage(role, text) {
      const chatArea = this.chatArea;

      if (role === 'user') {
        const div = document.createElement('div');
        div.className = 'msg-user';
        div.innerHTML = this.escapeHtml(text);
        chatArea.appendChild(div);
      } else {
        // Assistant message - separate products from text
        const { carousel, textContent } = this.formatMessage(text);
        const container = document.createElement('div');
        container.className = 'msg-bot-container';

        if (carousel) {
          container.innerHTML += carousel;
        }
        if (textContent) {
          container.innerHTML += `<div class="msg-bubble">${textContent}</div>`;
        }

        chatArea.appendChild(container);

        // Add event listeners for product cards
        this.setupProductCardEvents(container);
      }

      chatArea.scrollTop = chatArea.scrollHeight;
    }

    setupProductCardEvents(container) {
      const cartEnabled = this.config.cart_enabled !== false;

      container.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId;
        const productName = card.dataset.productName;
        const productPrice = parseFloat(card.dataset.productPrice) || 0;
        const productImage = card.dataset.productImage;
        const productVariant = card.dataset.productVariant || '';

        // Click on card = ask about product
        card.addEventListener('click', (e) => {
          if (e.target.closest('.add-btn')) return; // Don't trigger if clicking add button

          const input = this.shadowRoot.querySelector('.chat-input');
          if (input) {
            input.value = `Vreau mai multe detalii despre ${productName}`;
            input.focus();
          }
        });

        // Click on + button = add to cart
        if (cartEnabled) {
          const addBtn = card.querySelector('.add-btn');
          addBtn?.addEventListener('click', (e) => {
            e.stopPropagation();

            const product = {
              id: productId,
              name: productName,
              price: productPrice,
              image_url: productImage
            };

            this.addToCart(product, productVariant, productPrice);

            // Visual feedback
            addBtn.classList.add('added');
            addBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';

            setTimeout(() => {
              addBtn.classList.remove('added');
              addBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
            }, 500);
          });
        }
      });
    }

    escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    formatMessage(text) {
      let productCards = [];
      let cleanText = text;
      const cartEnabled = this.config.cart_enabled !== false;

      // Parse cart add actions from voice webhook [CART_ADD:product_id:quantity]
      // This is sent by widget-voice-tools when agent adds to cart via voice
      const cartAddRegex = /\[CART_ADD:([^:]+):(\d+)\]/g;
      cleanText = cleanText.replace(cartAddRegex, (_, productId, quantityStr) => {
        const quantity = parseInt(quantityStr, 10) || 1;
        const product = (this.config.products || []).find(p => p.id === productId);
        if (product && cartEnabled) {
          console.log('[Agentauto Voice] Adding to cart from voice:', product.name, 'x', quantity);
          // Add to cart
          for (let i = 0; i < quantity; i++) {
            this.addToCart(product);
          }
        }
        return ''; // Remove marker from displayed text
      });

      // Extract multiple products from voice tools [PRODUCTS:id1,id2,id3]
      const multiProductsRegex = /\[PRODUCTS:([^\]]+)\]/g;
      cleanText = cleanText.replace(multiProductsRegex, (_, productIdsStr) => {
        const productIds = productIdsStr.split(',').map(id => id.trim());
        productIds.forEach(productId => {
          const product = (this.config.products || []).find(p => p.id === productId);
          if (product) {
            const price = product.price || 0;
            const card = `
              <div class="product-card"
                   data-product-id="${product.id}"
                   data-product-name="${this.escapeAttr(product.name)}"
                   data-product-price="${price}"
                   data-product-image="${product.image_url || ''}"
                   data-product-variant="">
                <img class="card-img" src="${product.image_url}" alt="${this.escapeAttr(product.name)}"/>
                <div class="product-name">${this.escapeHtml(product.name)}</div>
                ${product.description ? `<div class="product-desc">${this.escapeHtml(product.description)}</div>` : ''}
                <div class="product-footer">
                  <span class="product-price">${price} ${product.currency || 'MDL'}</span>
                  ${cartEnabled ? `
                  <button class="add-btn" title="Adaugă în coș">
                    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  ` : ''}
                </div>
              </div>
            `;
            productCards.push(card);
          }
        });
        return '';
      });

      // Extract single local products [PRODUCT:id]
      const productRegex = /\[PRODUCT:([^\]]+)\]/g;
      cleanText = cleanText.replace(productRegex, (_, productId) => {
        const product = (this.config.products || []).find(p => p.id === productId);
        if (product) {
          const price = product.price || 0;
          const card = `
            <div class="product-card"
                 data-product-id="${product.id}"
                 data-product-name="${this.escapeAttr(product.name)}"
                 data-product-price="${price}"
                 data-product-image="${product.image_url || ''}"
                 data-product-variant="">
              <img class="card-img" src="${product.image_url}" alt="${this.escapeAttr(product.name)}"/>
              <div class="product-name">${this.escapeHtml(product.name)}</div>
              ${product.description ? `<div class="product-desc">${this.escapeHtml(product.description)}</div>` : ''}
              <div class="product-footer">
                <span class="product-price">${price} ${product.currency || 'MDL'}</span>
                ${cartEnabled ? `
                <button class="add-btn" title="Adaugă în coș">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                ` : ''}
              </div>
            </div>
          `;
          productCards.push(card);
        }
        return '';
      });

      // Extract scraped products
      const scrapedProductRegex = /\[?SCRAPED_PRODUCT:\s*(\{[^}]+\})\]?/g;
      cleanText = cleanText.replace(scrapedProductRegex, (_, jsonStr) => {
        try {
          const product = JSON.parse(jsonStr);
          const price = parseFloat(product.price) || 0;
          const id = 'scraped-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
          const card = `
            <div class="product-card"
                 data-product-id="${id}"
                 data-product-name="${this.escapeAttr(product.name || '')}"
                 data-product-price="${price}"
                 data-product-image="${product.image || ''}"
                 data-product-variant="">
              ${product.image ? `<img class="card-img" src="${product.image}" alt="${this.escapeAttr(product.name || '')}" onerror="this.style.display='none'"/>` : ''}
              <div class="product-name">${this.escapeHtml(product.name || '')}</div>
              ${product.description ? `<div class="product-desc">${this.escapeHtml(product.description)}</div>` : ''}
              <div class="product-footer">
                <span class="product-price">${product.price || ''}</span>
                ${cartEnabled ? `
                <button class="add-btn" title="Adaugă în coș">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                ` : ''}
              </div>
            </div>
          `;
          productCards.push(card);
        } catch (e) {
          console.error('[Agentauto Chat] Failed to parse scraped product:', e);
        }
        return '';
      });

      // Clean up text
      cleanText = cleanText.trim().replace(/\n{3,}/g, '\n\n');

      // Build carousel if we have products
      let carousel = null;
      if (productCards.length > 0) {
        carousel = `<div class="carousel-scroller no-scrollbar">${productCards.join('')}</div>`;
      }

      const textContent = cleanText ? this.escapeHtml(cleanText) : null;

      return { carousel, textContent };
    }

    escapeAttr(str) {
      return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Mobile-specific methods
    renderMobileMessages(overlay) {
      const messagesContainer = overlay.querySelector('.km-messages');
      if (!messagesContainer) return;

      messagesContainer.innerHTML = '';
      const cartEnabled = this.config.cart_enabled !== false;

      this.messages.forEach(msg => {
        if (msg.role === 'user') {
          const div = document.createElement('div');
          div.className = 'km-msg-user';
          div.innerHTML = this.escapeHtml(msg.content);
          messagesContainer.appendChild(div);
        } else {
          // Assistant message - parse for products
          const { carousel, textContent } = this.formatMessageMobile(msg.content, cartEnabled);
          const container = document.createElement('div');
          container.className = 'km-msg-container';

          if (carousel) {
            container.innerHTML += carousel;
          }
          if (textContent) {
            container.innerHTML += `<div class="km-msg-bot">${textContent}</div>`;
          }

          messagesContainer.appendChild(container);

          // Setup product card events for mobile
          this.setupMobileProductEvents(container, overlay);
        }
      });

      if (this.isLoading) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'km-loading';
        loadingDiv.innerHTML = '<div class="km-loading-dot"></div><div class="km-loading-dot"></div><div class="km-loading-dot"></div>';
        messagesContainer.appendChild(loadingDiv);
      }

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessageMobile(text, cartEnabled) {
      let productCards = [];
      let cleanText = text;

      // Parse cart add actions from voice webhook [CART_ADD:product_id:quantity]
      const cartAddRegex = /\[CART_ADD:([^:]+):(\d+)\]/g;
      cleanText = cleanText.replace(cartAddRegex, (_, productId, quantityStr) => {
        const quantity = parseInt(quantityStr, 10) || 1;
        const product = (this.config.products || []).find(p => p.id === productId);
        if (product && cartEnabled) {
          console.log('[Agentauto Voice] Adding to cart from voice (mobile):', product.name, 'x', quantity);
          for (let i = 0; i < quantity; i++) {
            this.addToCart(product);
          }
        }
        return '';
      });

      // Extract local products
      const productRegex = /\[PRODUCT:([^\]]+)\]/g;
      cleanText = cleanText.replace(productRegex, (_, productId) => {
        const product = (this.config.products || []).find(p => p.id === productId);
        if (product) {
          const price = product.price || 0;
          const card = `
            <div class="km-product-card"
                 data-product-id="${product.id}"
                 data-product-name="${this.escapeAttr(product.name)}"
                 data-product-price="${price}"
                 data-product-image="${product.image_url || ''}"
                 data-product-variant="">
              <img src="${product.image_url}" alt="${this.escapeAttr(product.name)}" onerror="this.style.display='none'"/>
              <div class="km-product-name">${this.escapeHtml(product.name)}</div>
              ${product.description ? `<div class="km-product-desc">${this.escapeHtml(product.description)}</div>` : ''}
              <div class="km-product-footer">
                <span class="km-product-price">${price} ${product.currency || 'MDL'}</span>
                ${cartEnabled ? `
                <button class="km-add-btn" title="Adaugă în coș">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                ` : ''}
              </div>
            </div>
          `;
          productCards.push(card);
        }
        return '';
      });

      // Extract scraped products
      const scrapedProductRegex = /\[?SCRAPED_PRODUCT:\s*(\{[^}]+\})\]?/g;
      cleanText = cleanText.replace(scrapedProductRegex, (_, jsonStr) => {
        try {
          const product = JSON.parse(jsonStr);
          const price = parseFloat(product.price) || 0;
          const id = 'scraped-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
          const card = `
            <div class="km-product-card"
                 data-product-id="${id}"
                 data-product-name="${this.escapeAttr(product.name || '')}"
                 data-product-price="${price}"
                 data-product-image="${product.image || ''}"
                 data-product-variant="">
              ${product.image ? `<img src="${product.image}" alt="${this.escapeAttr(product.name || '')}" onerror="this.style.display='none'"/>` : ''}
              <div class="km-product-name">${this.escapeHtml(product.name || '')}</div>
              ${product.description ? `<div class="km-product-desc">${this.escapeHtml(product.description)}</div>` : ''}
              <div class="km-product-footer">
                <span class="km-product-price">${product.price || ''}</span>
                ${cartEnabled ? `
                <button class="km-add-btn" title="Adaugă în coș">
                  <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                ` : ''}
              </div>
            </div>
          `;
          productCards.push(card);
        } catch (e) {
          console.error('[Agentauto Chat] Failed to parse scraped product:', e);
        }
        return '';
      });

      // Clean up text
      cleanText = cleanText.trim().replace(/\n{3,}/g, '\n\n');

      // Build carousel if we have products
      let carousel = null;
      if (productCards.length > 0) {
        carousel = `<div class="km-carousel">${productCards.join('')}</div>`;
      }

      const textContent = cleanText ? this.escapeHtml(cleanText) : null;

      return { carousel, textContent };
    }

    setupMobileProductEvents(container, overlay) {
      const cartEnabled = this.config.cart_enabled !== false;

      container.querySelectorAll('.km-product-card').forEach(card => {
        const productId = card.dataset.productId;
        const productName = card.dataset.productName;
        const productPrice = parseFloat(card.dataset.productPrice) || 0;
        const productImage = card.dataset.productImage;
        const productVariant = card.dataset.productVariant || '';

        // Click on card = ask about product
        card.addEventListener('click', (e) => {
          if (e.target.closest('.km-add-btn')) return;

          const input = overlay.querySelector('.km-input');
          if (input) {
            input.value = `Vreau mai multe detalii despre ${productName}`;
            input.focus();
          }
        });

        // Click on + button = add to cart
        if (cartEnabled) {
          const addBtn = card.querySelector('.km-add-btn');
          addBtn?.addEventListener('click', (e) => {
            e.stopPropagation();

            const product = {
              id: productId,
              name: productName,
              price: productPrice,
              image_url: productImage
            };

            this.addToCart(product, productVariant, productPrice);
          });
        }
      });
    }

    async sendMessageMobile(message, overlay) {
      if (!message.trim() || this.isLoading) return;

      // Add user message
      this.messages.push({ role: 'user', content: message });
      this.renderMobileMessages(overlay);

      // Show loading
      this.isLoading = true;
      this.renderMobileMessages(overlay);

      try {
        const SUPABASE_URL = 'https://pwfczzxwjfxomqzhhwvj.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZmN6enh3amZ4b21xemhod3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwMTA3OTEsImV4cCI6MjA0OTU4Njc5MX0.4FVIwnc25GwEbDTR_TIvVYztvz9pwZ5uKBFkeMw4dHg';

        const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-widget-groq`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            messages: this.messages.map(m => ({ role: m.role, content: m.content })),
            systemPrompt: this.config.system_prompt,
            products: this.config.products || [],
            scrapeEnabled: this.config.scrape_enabled || false,
            scrapeWebsiteUrl: this.config.scrape_website_url || '',
            widgetId: this.widgetId,
            sessionId: this.sessionId
          })
        });

        const data = await res.json();

        if (data.success && data.message) {
          this.messages.push({ role: 'assistant', content: data.message });
        } else {
          this.messages.push({ role: 'assistant', content: 'Îmi pare rău, a apărut o eroare.' });
        }
      } catch (e) {
        console.error('[Agentauto Chat] Send failed:', e);
        this.messages.push({ role: 'assistant', content: 'Eroare de conexiune.' });
      } finally {
        this.isLoading = false;
        this.renderMobileMessages(overlay);
      }
    }
  }

  if (!customElements.get('agentauto-chat')) {
    customElements.define('agentauto-chat', AgentautoChat);
  }
})();
