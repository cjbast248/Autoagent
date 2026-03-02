
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
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'URL is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Scraper] Fetching URL:', url);

    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    console.log('[Scraper] Fetched HTML, length:', html.length);

    // Use Groq to extract products from HTML
    const GROQ_API_KEY = Deno.env.get('GROQ-KEY');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ API key not configured');
    }

    // Truncate HTML to fit in context (keep important parts)
    let truncatedHtml = html;
    if (html.length > 50000) {
      // Try to find product sections
      const productSectionMatch = html.match(/<main[\s\S]*?<\/main>/i) ||
                                   html.match(/<div[^>]*class="[^"]*product[^"]*"[\s\S]*$/i);
      if (productSectionMatch) {
        truncatedHtml = productSectionMatch[0].slice(0, 50000);
      } else {
        truncatedHtml = html.slice(0, 50000);
      }
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a web scraping expert. Extract product information from HTML.
Return ONLY a valid JSON array of products. Each product must have:
- name: string (product name)
- description: string (product description, ingredients, or details)
- price: number or null (price as number, without currency symbols)
- currency: string (currency code like "RON", "MDL", "USD", "EUR")
- image_url: string (full URL to product image)

Rules:
1. Return ONLY the JSON array, no other text
2. Make sure image URLs are complete (add domain if relative)
3. Extract price as a number only
4. If you can't find products, return an empty array []
5. Maximum 20 products`
          },
          {
            role: 'user',
            content: `Extract products from this webpage (URL: ${url}):\n\n${truncatedHtml}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('[Scraper] Groq API error:', errorText);
      throw new Error('Failed to analyze page with AI');
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices?.[0]?.message?.content || '[]';

    console.log('[Scraper] AI response:', aiResponse.slice(0, 500));

    // Parse the JSON response
    let products = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('[Scraper] Failed to parse AI response:', parseError);
      products = [];
    }

    // Validate and clean products
    const validProducts = products
      .filter((p: any) => p.name && p.image_url)
      .map((p: any) => ({
        name: String(p.name).trim(),
        description: p.description ? String(p.description).trim() : '',
        price: typeof p.price === 'number' ? p.price : (parseFloat(p.price) || null),
        currency: p.currency || 'RON',
        image_url: p.image_url.startsWith('http') ? p.image_url : new URL(p.image_url, url).href,
      }))
      .slice(0, 20);

    console.log('[Scraper] Found', validProducts.length, 'products');

    return new Response(JSON.stringify({
      success: true,
      products: validProducts,
      count: validProducts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Scraper] Error:', error.message || error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to scrape products'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
