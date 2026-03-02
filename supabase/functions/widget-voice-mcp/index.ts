import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-widget-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// MCP Tool definitions
const MCP_TOOLS = [
  {
    name: "get_products",
    description: "Caută și returnează produse din catalog. Folosește când clientul întreabă de produse sau vrea să vadă ce este disponibil.",
    inputSchema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Termen de căutare pentru filtrare produse (opțional)"
        }
      }
    }
  },
  {
    name: "show_products",
    description: "Afișează produse specifice în chat-ul widget-ului. Folosește când clientul vrea să vadă anumite produse.",
    inputSchema: {
      type: "object",
      properties: {
        product_names: {
          type: "string",
          description: "Numele produselor de afișat, separate prin virgulă"
        }
      }
    }
  },
  {
    name: "add_to_cart",
    description: "Adaugă un produs în coșul de cumpărături al clientului. IMPORTANT: Folosește numele EXACT al produsului din catalog.",
    inputSchema: {
      type: "object",
      properties: {
        product_name: {
          type: "string",
          description: "Numele EXACT al produsului din catalog"
        },
        quantity: {
          type: "number",
          description: "Cantitatea de adăugat (implicit 1)"
        }
      },
      required: ["product_name"]
    }
  },
  {
    name: "checkout",
    description: "Deschide formularul de checkout pentru finalizarea comenzii.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// Helper to get products for a widget
async function getProductsForWidget(supabase: any, widgetId: string) {
  let widgetConfig = null;
  let products: any[] = [];

  // Try by widget_id column first
  const { data: configByWidgetId } = await supabase
    .from('chat_widget_configs')
    .select('*')
    .eq('widget_id', widgetId)
    .maybeSingle();

  if (configByWidgetId) {
    widgetConfig = configByWidgetId;
  } else {
    // Fallback: try by id column
    const { data: configById } = await supabase
      .from('chat_widget_configs')
      .select('*')
      .eq('id', widgetId)
      .maybeSingle();
    widgetConfig = configById;
  }

  if (widgetConfig?.user_id) {
    const { data: productData } = await supabase
      .from('widget_products')
      .select('*')
      .eq('user_id', widgetConfig.user_id)
      .eq('is_active', true);
    products = productData || [];
  }

  return { widgetConfig, products };
}

// Tool execution handlers
async function executeTool(toolName: string, args: any, products: any[]): Promise<{ content: string; isError: boolean; action?: string; data?: any }> {
  switch (toolName) {
    case 'get_products': {
      const search = (args.search || '').toLowerCase();
      let filteredProducts = products;

      if (search) {
        filteredProducts = products.filter(p =>
          p.name?.toLowerCase().includes(search) ||
          p.description?.toLowerCase().includes(search)
        );
      }

      const productList = filteredProducts.slice(0, 10).map(p =>
        `- ${p.name}: ${p.price} ${p.currency || 'MDL'}`
      ).join('\n');

      return {
        content: filteredProducts.length > 0
          ? `Am găsit ${filteredProducts.length} produse:\n${productList}`
          : 'Nu am găsit produse care să corespundă căutării.',
        isError: false,
        data: { products: filteredProducts.slice(0, 10) }
      };
    }

    case 'show_products': {
      let productNames = args.product_names || '';
      if (typeof productNames === 'string') {
        productNames = productNames.split(',').map((n: string) => n.trim()).filter(Boolean);
      }

      let foundProducts: any[] = [];
      if (productNames.length > 0) {
        foundProducts = productNames.map((name: string) => {
          return products.find(p =>
            p.name?.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.name?.toLowerCase() || '')
          );
        }).filter(Boolean);
      } else {
        foundProducts = products.slice(0, 6);
      }

      const productIds = foundProducts.map(p => p.id);

      return {
        content: foundProducts.length > 0
          ? `[PRODUCTS:${productIds.join(',')}] Uite ${foundProducts.length} produse: ${foundProducts.map(p => p.name).join(', ')}.`
          : 'Nu am găsit produsele solicitate.',
        isError: false,
        action: 'show_products',
        data: { product_ids: productIds, products: foundProducts }
      };
    }

    case 'add_to_cart': {
      const productName = args.product_name || args.product_names;
      const quantity = args.quantity || 1;

      if (!productName) {
        return {
          content: 'Te rog să îmi spui ce produs dorești să adaugi în coș.',
          isError: true
        };
      }

      // Flexible search
      const searchTerm = productName.toLowerCase().trim();
      const product = products.find(p => {
        const pName = p.name?.toLowerCase() || '';
        const searchWords = searchTerm.split(/\s+/);
        const nameWords = pName.split(/\s+/);

        return pName.includes(searchTerm) ||
               searchTerm.includes(pName) ||
               searchWords.some((word: string) => word.length > 2 && pName.includes(word)) ||
               nameWords.some((word: string) => word.length > 2 && searchTerm.includes(word));
      });

      if (product) {
        const cartMarker = `[CART_ADD:${product.id}:${quantity}]`;
        return {
          content: `${cartMarker} Am adăugat ${quantity}x ${product.name} în coș. Prețul este ${product.price * quantity} ${product.currency || 'MDL'}.`,
          isError: false,
          action: 'add_to_cart',
          data: { product_id: product.id, product_name: product.name, quantity, price: product.price }
        };
      } else {
        return {
          content: `Nu am găsit produsul "${productName}" în catalog. Vrei să îți arăt ce produse avem disponibile?`,
          isError: true
        };
      }
    }

    case 'checkout': {
      return {
        content: '[CHECKOUT] Am deschis formularul de finalizare comandă. Te rog să completezi datele de contact și adresa de livrare.',
        isError: false,
        action: 'open_checkout'
      };
    }

    default:
      return {
        content: `Nu cunosc tool-ul: ${toolName}`,
        isError: true
      };
  }
}

// Handle JSON-RPC request
async function handleJsonRpc(body: any, supabase: any, widgetId: string) {
  const { jsonrpc, id, method, params } = body;

  console.log('[MCP] Method:', method, 'ID:', id);

  // Handle initialize
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false }
        },
        serverInfo: {
          name: 'agentauto-widget-tools',
          version: '1.0.0'
        }
      }
    };
  }

  // Handle initialized notification
  if (method === 'notifications/initialized' || method === 'initialized') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  // Handle tools/list
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: MCP_TOOLS }
    };
  }

  // Handle tools/call
  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    // Get widget_id from args if not in header
    const effectiveWidgetId = args.widget_id || widgetId;

    // Get products
    const { products } = await getProductsForWidget(supabase, effectiveWidgetId);
    console.log('[MCP] Executing tool:', toolName, 'with', products.length, 'products');

    // Execute tool
    const result = await executeTool(toolName, args, products);

    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: result.content }],
        isError: result.isError
      }
    };
  }

  // Unknown method
  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` }
  };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get widget_id from header or query param
  const widgetId = req.headers.get('x-widget-id') || url.searchParams.get('widget_id') || '';

  console.log('[MCP] Request:', req.method, url.pathname, 'widget_id:', widgetId);

  // Handle GET request - return server info and capabilities (for SSE initial connection)
  if (req.method === 'GET') {
    // For SSE transport, we need to return an event stream
    const encoder = new TextEncoder();

    // Create the messages endpoint URL
    const messagesUrl = `${url.origin}${url.pathname}`;

    const stream = new ReadableStream({
      start(controller) {
        // Send endpoint event immediately
        const endpointEvent = `event: endpoint\ndata: ${JSON.stringify({ url: messagesUrl })}\n\n`;
        controller.enqueue(encoder.encode(endpointEvent));

        // Send a ping to keep connection alive
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch (e) {
            clearInterval(pingInterval);
          }
        }, 15000);

        // Close after 50 seconds (before Supabase timeout)
        setTimeout(() => {
          clearInterval(pingInterval);
          controller.close();
        }, 50000);
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
    });
  }

  // Handle POST request - JSON-RPC messages
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[MCP] JSON-RPC:', JSON.stringify(body, null, 2));

      const response = await handleJsonRpc(body, supabase, widgetId);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('[MCP] Error:', error);
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});
