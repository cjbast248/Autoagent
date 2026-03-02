import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[Voice Tools] Request:', JSON.stringify(body, null, 2));

    // ElevenLabs sends tool calls - parameters can be in body directly or in parameters object
    const { tool_name, parameters, widget_id, conversation_id, search, product_names, product_name, quantity } = body;

    // Get parameters from either direct body or parameters object
    const params = {
      search: search || parameters?.search,
      product_names: product_names || parameters?.product_names,
      product_name: product_name || parameters?.product_name,
      quantity: quantity || parameters?.quantity
    };

    if (!tool_name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'tool_name is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('[Voice Tools] Supabase URL:', supabaseUrl ? 'set' : 'NOT SET');
    console.log('[Voice Tools] Service Key:', supabaseServiceKey ? 'set (length: ' + supabaseServiceKey.length + ')' : 'NOT SET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get widget config and products
    let products: any[] = [];
    let widgetConfig: any = null;

    if (widget_id) {
      console.log('[Voice Tools] Looking up widget_id:', widget_id, 'type:', typeof widget_id);

      // First try by widget_id column (public ID - this is what ElevenLabs sends)
      const { data: configByWidgetId, error: err1 } = await supabase
        .from('chat_widget_configs')
        .select('*')
        .eq('widget_id', widget_id)
        .maybeSingle();

      console.log('[Voice Tools] Lookup by widget_id column:', configByWidgetId ? `found (user_id=${configByWidgetId.user_id})` : 'not found', err1?.message || '');

      if (configByWidgetId) {
        widgetConfig = configByWidgetId;
      } else {
        // Fallback: try by id column (internal UUID)
        const { data: configById, error: err2 } = await supabase
          .from('chat_widget_configs')
          .select('*')
          .eq('id', widget_id)
          .maybeSingle();

        console.log('[Voice Tools] Lookup by id column:', configById ? `found (user_id=${configById.user_id})` : 'not found', err2?.message || '');
        widgetConfig = configById;
      }

      // Get products for this widget
      if (widgetConfig?.user_id) {
        console.log('[Voice Tools] Fetching products for user_id:', widgetConfig.user_id);

        const { data: productData, error: prodErr } = await supabase
          .from('widget_products')
          .select('*')
          .eq('user_id', widgetConfig.user_id)
          .eq('is_active', true);

        console.log('[Voice Tools] Products query result:', productData?.length || 0, 'products', prodErr?.message || '');
        products = productData || [];

        if (products.length > 0) {
          console.log('[Voice Tools] First product:', products[0].name);
        }
      } else {
        console.log('[Voice Tools] No user_id found in widget config');
      }
    } else {
      console.log('[Voice Tools] No widget_id provided!');
    }

    // Handle different tools
    let result: any;

    switch (tool_name) {
      case 'get_products': {
        const search = (params.search || '')?.toLowerCase();

        let filteredProducts = products;
        if (search) {
          filteredProducts = products.filter(p =>
            p.name?.toLowerCase().includes(search) ||
            p.description?.toLowerCase().includes(search)
          );
        }

        result = {
          success: true,
          products: filteredProducts.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            currency: p.currency || 'MDL',
            image_url: p.image_url
          })),
          total_count: filteredProducts.length,
          message: filteredProducts.length > 0
            ? `Am găsit ${filteredProducts.length} produse.`
            : 'Nu am găsit produse care să corespundă căutării.'
        };
        break;
      }

      case 'show_products': {
        // product_names can be string (comma-separated) or array
        let productNames = params.product_names || [];
        if (typeof productNames === 'string') {
          productNames = productNames.split(',').map((n: string) => n.trim()).filter(Boolean);
        }

        let foundProducts: any[] = [];

        if (productNames.length > 0) {
          // Find specific products by name
          foundProducts = productNames.map((name: string) => {
            return products.find(p =>
              p.name?.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(p.name?.toLowerCase() || '')
            );
          }).filter(Boolean);
        } else {
          // Return all products (limited)
          foundProducts = products.slice(0, 6);
        }

        result = {
          success: true,
          products: foundProducts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            currency: p.currency || 'MDL',
            image_url: p.image_url
          })),
          // Special format that the widget will parse
          display_products: foundProducts.map(p => p.id),
          message: foundProducts.length > 0
            ? `Uite ${foundProducts.length} produse: ${foundProducts.map(p => p.name).join(', ')}.`
            : 'Nu am găsit produsele solicitate.'
        };
        break;
      }

      case 'add_to_cart': {
        // Accept both product_name and product_names (ElevenLabs might send either)
        const productName = params.product_name || params.product_names;
        const quantity = params.quantity || 1;

        if (!productName) {
          result = {
            success: false,
            error: 'product_name is required',
            message: 'Te rog să îmi spui ce produs dorești să adaugi în coș.'
          };
          break;
        }

        // Flexible search: check both directions and also word matching
        const searchTerm = productName.toLowerCase().trim();
        const product = products.find(p => {
          const pName = p.name?.toLowerCase() || '';
          // Check if product name contains search term OR search term contains product name
          // Also check individual words
          const searchWords = searchTerm.split(/\s+/);
          const nameWords = pName.split(/\s+/);

          return pName.includes(searchTerm) ||
                 searchTerm.includes(pName) ||
                 searchWords.some((word: string) => word.length > 2 && pName.includes(word)) ||
                 nameWords.some((word: string) => word.length > 2 && searchTerm.includes(word));
        });

        if (product) {
          // Include a special marker that the widget will parse to add to cart
          // Format: [CART_ADD:product_id:quantity] - widget parses this and executes the action
          const cartMarker = `[CART_ADD:${product.id}:${quantity}]`;
          result = {
            success: true,
            action: 'add_to_cart',
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              currency: product.currency || 'MDL',
              quantity: quantity
            },
            message: `${cartMarker} Am adăugat ${quantity}x ${product.name} în coș. Prețul este ${product.price * quantity} ${product.currency || 'MDL'}.`
          };
        } else {
          result = {
            success: false,
            error: 'Product not found',
            message: `Nu am găsit produsul "${productName}" în catalog. Vrei să îți arăt ce produse avem disponibile?`
          };
        }
        break;
      }

      case 'get_cart_total': {
        // This would need cart state from somewhere - for now return instruction
        result = {
          success: true,
          message: 'Pentru a vedea totalul coșului, clientul poate apăsa pe iconița coșului din chat.'
        };
        break;
      }

      case 'checkout': {
        result = {
          success: true,
          action: 'open_checkout',
          message: 'Am deschis formularul de finalizare comandă. Te rog să completezi datele de contact și adresa de livrare.'
        };
        break;
      }

      default:
        result = {
          success: false,
          error: `Unknown tool: ${tool_name}`,
          message: 'Nu am înțeles ce trebuie să fac. Poți să reformulezi?'
        };
    }

    console.log('[Voice Tools] Result:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Voice Tools] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      message: 'A apărut o eroare. Te rog să încerci din nou.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
