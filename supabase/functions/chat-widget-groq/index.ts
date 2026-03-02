import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Helper function to save conversation to database
async function saveConversation(
  widgetId: string | undefined,
  sessionId: string | undefined,
  userMessage: string,
  assistantMessage: string
) {
  if (!widgetId || !sessionId) {
    console.log('[Chat Widget] No widgetId or sessionId, skipping conversation save');
    return;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Chat Widget] Supabase credentials not configured');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, get the widget config id from widget_id
    const { data: config } = await supabase
      .from('chat_widget_configs')
      .select('id')
      .eq('widget_id', widgetId)
      .single();

    if (!config) {
      console.log('[Chat Widget] Widget config not found for:', widgetId);
      return;
    }

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('chat_widget_conversations')
      .select('id, messages')
      .eq('widget_config_id', config.id)
      .eq('session_id', sessionId)
      .single();

    const timestamp = new Date().toISOString();
    const newMessages = [
      { role: 'user', content: userMessage, timestamp },
      { role: 'assistant', content: assistantMessage, timestamp }
    ];

    if (existing) {
      // Update existing conversation
      const updatedMessages = [...(existing.messages || []), ...newMessages];
      await supabase
        .from('chat_widget_conversations')
        .update({
          messages: updatedMessages,
          updated_at: timestamp
        })
        .eq('id', existing.id);
    } else {
      // Create new conversation
      await supabase
        .from('chat_widget_conversations')
        .insert({
          widget_config_id: config.id,
          session_id: sessionId,
          messages: newMessages
        });
    }

    console.log('[Chat Widget] Conversation saved successfully');
  } catch (error) {
    console.error('[Chat Widget] Error saving conversation:', error);
  }
}

interface ScrapedProduct {
  name: string;
  price: string;
  image: string;
  description: string;
  url: string;
}

// Function to scrape products from a website using Jina AI Reader + Groq for extraction
async function scrapeWebsiteProducts(baseUrl: string, query: string, groqApiKey: string): Promise<ScrapedProduct[]> {
  console.log(`[Scraper] Searching for "${query}" on ${baseUrl}`);

  try {
    // Normalize base URL
    const normalizedUrl = baseUrl.replace(/\/$/, '');

    // Use Jina AI Reader to get rendered content (handles JavaScript)
    const jinaUrl = `https://r.jina.ai/${normalizedUrl}`;

    console.log(`[Scraper] Fetching via Jina Reader: ${jinaUrl}`);

    let content = '';

    try {
      const jinaResponse = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
        },
      });

      if (jinaResponse.ok) {
        content = await jinaResponse.text();
        console.log(`[Scraper] Got Jina response, length: ${content.length}`);
      }
    } catch (e) {
      console.log(`[Scraper] Jina fetch failed:`, e);
    }

    if (!content) {
      console.log('[Scraper] Could not fetch any content');
      return [];
    }

    // Truncate content to fit in context (max ~30k chars)
    const truncatedContent = content.length > 30000 ? content.substring(0, 30000) : content;

    // Use Groq to extract matching products
    console.log(`[Scraper] Using AI to find "${query}" in content...`);

    const extractionResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `Ești un expert în extragerea prețurilor de produse din meniuri și cataloage.

SARCINA TA:
Găsește produsul EXACT cerut de utilizator și extrage prețul CORECT.

REGULI STRICTE:
1. Caută EXACT numele produsului în text (ex: "Pizza Carbonara" - caută exact acest text)
2. Prețul este DE OBICEI un număr între 50-500 pentru mâncare (lei/MDL)
3. Prețul apare aproape de numele produsului
4. NU inventa prețuri! Dacă nu găsești, returnează []
5. Returnează DOAR JSON valid: [{"name":"...","price":"... lei"}]

EXEMPLU pentru "Pizza Carbonara":
Dacă în text apare "Pizza Carbonara ... 145" sau "Pizza Carbonara 145 lei"
Răspuns: [{"name":"Pizza Carbonara","price":"145 lei"}]`
          },
          {
            role: 'user',
            content: `Găsește EXACT produsul "${query}" și prețul său în acest meniu/catalog:\n\n${truncatedContent}`
          }
        ],
        temperature: 0,
        max_tokens: 300,
      }),
    });

    if (!extractionResponse.ok) {
      console.error('[Scraper] Groq extraction failed:', await extractionResponse.text());
      return [];
    }

    const extractionData = await extractionResponse.json();
    const aiResponse = extractionData.choices?.[0]?.message?.content || '[]';

    console.log(`[Scraper] AI extraction response: ${aiResponse.substring(0, 200)}`);

    // Parse JSON from response
    let products: ScrapedProduct[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        products = parsed.map((p: any) => ({
          name: p.name || '',
          price: p.price || '',
          image: '',
          description: p.description || '',
          url: normalizedUrl
        })).filter((p: ScrapedProduct) => p.name);
      }
    } catch (e) {
      console.error('[Scraper] Failed to parse AI response:', e);
    }

    console.log(`[Scraper] Found ${products.length} products`);
    return products;

  } catch (error) {
    console.error('[Scraper] Error:', error);
    return [];
  }
}

// Tool definition for Groq
const searchWebsiteTool = {
  type: "function",
  function: {
    name: "search_website_products",
    description: "Caută produse pe site-ul web configurat. Folosește această funcție când clientul întreabă despre produse, meniu, prețuri sau vrea să găsească ceva specific pe site.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Termenul de căutare pentru a găsi produse (ex: 'pizza', 'carbonara', 'mărimea 42')"
        }
      },
      required: ["query"]
    }
  }
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, products, scrapeEnabled, scrapeWebsiteUrl, widgetId, sessionId } = await req.json();

    const GROQ_API_KEY = Deno.env.get('GROQ-KEY');

    if (!GROQ_API_KEY) {
      console.error('[Chat Widget] GROQ API key not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'API key not configured. Please contact support.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Chat Widget] Processing request with', messages?.length || 0, 'messages');
    console.log('[Chat Widget] Scrape enabled:', scrapeEnabled, 'URL:', scrapeWebsiteUrl);

    // Build enhanced system prompt with products catalog
    let enhancedPrompt = systemPrompt || 'Ești un asistent AI prietenos și util. Răspunde concis și clar în limba română.';

    // Add local products catalog if available
    if (products && products.length > 0) {
      enhancedPrompt += `\n\n=== CATALOG PRODUSE ===

REGULI:
1. Produs specific cerut → trimite DOAR acel produs: [PRODUCT:id]
2. Întrebare generală → max 2-3 produse
3. Format [PRODUCT:id] e OBLIGATORIU pentru a afișa cardul

FORMATARE RĂSPUNS (FOARTE IMPORTANT):
- Scrie SCURT și STRUCTURAT
- Folosește linii separate, NU paragrafe lungi
- Exemplu format:

[PRODUCT:id]

Nume produs - descriere scurtă
• Preț: X MDL
• Variante: 10/8/4 bucăți

Ce variantă dorești?

GREȘIT (NU FACE AȘA):
"Da, avem bere! Iată câteva opțiuni: 1. Asahi - bere japoneză, preț 65 MDL 2. Carlsberg - bere fără alcool, preț 50 MDL 3. Guinness..."

CORECT (FA AȘA):
[PRODUCT:id1]
[PRODUCT:id2]

Avem mai multe tipuri de bere!
Ce preferi - cu sau fără alcool?

PRODUSE:
`;
      for (const product of products) {
        const attrs = product.attributes as any;
        const variants = attrs?.variants || attrs?.price_options || [];
        const variantType = attrs?.variant_type || 'none';

        enhancedPrompt += `
---
ID: ${product.id}
Nume: ${product.name}`;

        // Add variant information
        if (variants.length > 1) {
          if (variantType === 'attribute') {
            // Text variants (Avocado, Castraveți, etc.)
            enhancedPrompt += `\nVariante:`;
            for (const v of variants) {
              if (v.attribute && v.price) {
                enhancedPrompt += ` ${v.attribute}=${v.price} MDL,`;
              }
            }
          } else {
            // Numeric variants (10, 8, 4 bucăți)
            enhancedPrompt += `\nPrețuri:`;
            for (const v of variants) {
              if (v.bucati && v.price) {
                enhancedPrompt += ` ${v.bucati}=${v.price} MDL,`;
              } else if (v.price) {
                enhancedPrompt += ` ${v.price} MDL,`;
              }
            }
          }
        } else if (product.price) {
          enhancedPrompt += `\nPreț: ${product.price} ${product.currency || 'MDL'}`;
        }
      }
      enhancedPrompt += `

IMPORTANT DESPRE PREȚURI:
- Multe produse au PREȚURI DIFERITE pentru variante diferite (ex: 10 bucăți=186 MDL, 8 bucăți=173 MDL, 4 bucăți=93 MDL)
- Când clientul alege o variantă specifică (ex: "vreau 4 bucăți"), spune-i PREȚUL CORECT pentru acea variantă!
- NU spune același preț pentru toate variantele - verifică lista de mai sus

Răspunde SCURT, STRUCTURAT, cu linii separate.`;
    }

    // Add web scraping instructions if enabled
    if (scrapeEnabled && scrapeWebsiteUrl) {
      enhancedPrompt += `\n\n=== CĂUTARE LIVE PE SITE ===
Ai acces la funcția search_website_products pentru a căuta produse în timp real pe ${scrapeWebsiteUrl}.

CÂND SĂ FOLOSEȘTI ACEASTĂ FUNCȚIE:
- Când clientul întreabă despre produse care NU sunt în catalogul local
- Când clientul vrea să vadă ce produse sunt disponibile pe site
- Când clientul menționează un produs specific (ex: "vreau pizza carbonara", "aveți burger?")

DUPĂ CE PRIMEȘTI REZULTATELE - FOARTE IMPORTANT:
Când ai rezultate, TREBUIE să incluzi produsul în acest format EXACT (cu paranteze pătrate):
[SCRAPED_PRODUCT:{"name":"Nume Produs","price":"145 lei","url":"${scrapeWebsiteUrl}"}]

EXEMPLU CORECT DE RĂSPUNS:
"Am găsit produsul dorit! [SCRAPED_PRODUCT:{"name":"Pizza Carbonara","price":"145 lei","url":"${scrapeWebsiteUrl}"}]"

REGULI:
1. Folosește EXACT formatul [SCRAPED_PRODUCT:{...}] cu paranteze pătrate
2. JSON-ul trebuie să fie valid (ghilimele duble pentru chei și valori)
3. Dacă nu găsești produsul, spune politicos că nu l-ai găsit și oferă alternative dacă există`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      // Prepare Groq request
      const groqRequest: any = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: enhancedPrompt
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1024,
      };

      // Add tools if scraping is enabled
      if (scrapeEnabled && scrapeWebsiteUrl) {
        groqRequest.tools = [searchWebsiteTool];
        groqRequest.tool_choice = "auto";
      }

      console.log('[Chat Widget] Sending request to Groq...');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groqRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Chat Widget] Groq API error:', response.status, errorText);

        let userMessage = 'A apărut o eroare temporară. Te rog încearcă din nou.';
        if (response.status === 429) {
          userMessage = 'Prea multe cereri. Te rog așteaptă câteva secunde și încearcă din nou.';
        } else if (response.status === 401) {
          userMessage = 'Eroare de autentificare. Te rog contactează suportul.';
        }

        return new Response(JSON.stringify({
          success: false,
          error: userMessage
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const firstChoice = data.choices?.[0];

      // Check if LLM wants to use a tool
      if (firstChoice?.message?.tool_calls && firstChoice.message.tool_calls.length > 0) {
        console.log('[Chat Widget] LLM requested tool call');

        const toolCall = firstChoice.message.tool_calls[0];

        if (toolCall.function.name === 'search_website_products') {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('[Chat Widget] Searching for:', args.query);

          // Execute the scraping
          const scrapedProducts = await scrapeWebsiteProducts(scrapeWebsiteUrl, args.query, GROQ_API_KEY);

          console.log('[Chat Widget] Scraped products:', scrapedProducts.length);

          // Send results back to LLM for final response
          const followUpMessages = [
            ...groqRequest.messages,
            firstChoice.message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                products: scrapedProducts,
                query: args.query,
                website: scrapeWebsiteUrl
              })
            }
          ];

          const followUpResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: followUpMessages,
              temperature: 0.7,
              max_tokens: 1024,
            }),
          });

          if (!followUpResponse.ok) {
            throw new Error('Follow-up request failed');
          }

          const followUpData = await followUpResponse.json();
          const assistantMessage = followUpData.choices?.[0]?.message?.content || 'Nu am putut genera un răspuns.';

          console.log('[Chat Widget] Response with scraped products generated');

          // Save conversation
          const lastUserMsg = messages[messages.length - 1]?.content || '';
          await saveConversation(widgetId, sessionId, lastUserMsg, assistantMessage);

          return new Response(JSON.stringify({
            success: true,
            message: assistantMessage
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // No tool call, return direct response
      const assistantMessage = firstChoice?.message?.content || 'Nu am putut genera un răspuns.';

      console.log('[Chat Widget] Response generated successfully');

      // Save conversation
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      await saveConversation(widgetId, sessionId, lastUserMsg, assistantMessage);

      return new Response(JSON.stringify({
        success: true,
        message: assistantMessage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('[Chat Widget] Request timeout');
        return new Response(JSON.stringify({
          success: false,
          error: 'Răspunsul a durat prea mult. Te rog încearcă din nou.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error('[Chat Widget] Error:', error.message || error);
    return new Response(JSON.stringify({
      success: false,
      error: 'A apărut o eroare neașteptată. Te rog încearcă din nou.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
