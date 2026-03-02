// @ts-nocheck
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Advanced scraping started');
    
    const requestData = await req.json();
    const { url, deepScraping = false, maxDepth = 1 } = requestData;
    
    console.log(`🌐 Scraping URL: ${url} (Deep: ${deepScraping}, MaxDepth: ${maxDepth})`);

    // Track processed URLs to avoid duplicates
    const processedUrls = new Set();
    const allProducts = [];
    const allLinks = [];
    const allImages = [];
    const pagesToProcess = [{ url, depth: 0 }];

    let title = '';
    let description = '';
    let keywords = '';
    let bodyText = '';

    while (pagesToProcess.length > 0 && allProducts.length < 10000) {
      const { url: currentUrl, depth } = pagesToProcess.shift();
      
      if (processedUrls.has(currentUrl) || (deepScraping && depth > maxDepth)) {
        continue;
      }
      
      processedUrls.add(currentUrl);
      console.log(`Processing page: ${currentUrl} (depth: ${depth})`);
    
      try {
        // Fetch the page
        const response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          console.log(`HTTP error for ${currentUrl}: ${response.status}`);
          continue;
        }

        const htmlContent = await response.text();
        console.log(`📄 HTML content retrieved from ${currentUrl}: ${htmlContent.length} characters`);

        // Parse HTML using DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Get basic info from first page
        if (depth === 0) {
          title = doc.querySelector('title')?.textContent || '';
          description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
          keywords = doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
          bodyText = doc.body?.textContent?.substring(0, 10000) || '';
        }

        // Extract products from current page
        const productSelectors = [
          '.product, .product-item, .product-card, .item, .listing-item',
          '.produs, .articol, .oferta, .anunt',
          '[data-product], [data-item]',
          '.product-container, .item-container',
          '.shop-item, .store-item, .catalog-item'
        ];

        const pageProducts = [];
        
        for (const selector of productSelectors) {
          const elements = doc.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} products with selector: ${selector} on ${currentUrl}`);
            
            for (let i = 0; i < elements.length; i++) {
              const element = elements[i];
              
              // Extract title - simple and direct approach
              let productTitle = '';
              
              // Get all text from the element and clean it
              const elementText = element.textContent || '';
              
              // Split text into lines and find the first meaningful one
              const lines = elementText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
              
              for (const line of lines) {
                // Skip lines that are clearly prices, buttons or short fragments
                if (line.length > 10 && 
                    line.length < 200 && 
                    !line.match(/^\d+[.,]\d+/) && // Not starting with a number (price)
                    !line.match(/MDL|LEI|RON/i) && // Not containing currency
                    !line.match(/^(adauga|cos|buy|cart|add)/i) && // Not a button text
                    !line.match(/^\d+$/) && // Not just a number
                    line.split(' ').length > 1) { // More than one word
                  productTitle = line.trim();
                  break;
                }
              }
              
              // If no good title found, try to get it from link
              if (!productTitle) {
                const link = element.querySelector('a');
                if (link) {
                  // Try title attribute first
                  const titleAttr = link.getAttribute('title');
                  if (titleAttr && titleAttr.length > 10) {
                    productTitle = titleAttr.trim();
                  } else {
                    // Try link text
                    const linkText = link.textContent?.trim();
                    if (linkText && linkText.length > 10 && linkText.length < 200) {
                      productTitle = linkText;
                    }
                  }
                }
              }
              
              // Final cleanup
              if (productTitle) {
                // Remove extra whitespace
                productTitle = productTitle.replace(/\s+/g, ' ').trim();
                // Remove common unwanted text
                productTitle = productTitle.replace(/\s*(MDL|LEI|RON)\s*.*$/i, '');
                productTitle = productTitle.replace(/^\s*(produs|item|articol)[\s:]/i, '');
              }
              
              // Extract price with enhanced selectors for sote.md and Romanian sites
              let productPrice = '';
              const priceSelectors = [
                '.price, .pret, .cost, .pretul',
                '.product-price, .produs-pret',
                '[data-price]',
                '.money, .suma, .valoare',
                '.price-current, .price-regular',
                '.current-price, .regular-price',
                '.product__price, .item__price',
                '.price-item, .price-value'
              ];
              
              for (const pSel of priceSelectors) {
                const priceEl = element.querySelector(pSel);
                if (priceEl?.textContent?.trim()) {
                  const priceText = priceEl.textContent.trim();
                  // Check for Romanian currency patterns
                  if (priceText.match(/\d+(\.\d+)?\s*(MDL|LEI|RON|lei|mdl|ron)/i) || 
                      priceText.match(/\d+(\,\d+)?\s*(MDL|LEI|RON|lei|mdl|ron)/i) ||
                      priceText.match(/\d+/)) {
                    productPrice = priceText;
                    break;
                  }
                }
              }
              
              // Fallback: search in all text content for price patterns
              if (!productPrice) {
                const allText = element.textContent || '';
                const priceMatch = allText.match(/(\d+(?:[.,]\d+)?)\s*(MDL|LEI|RON|lei|mdl|ron)/i);
                if (priceMatch) {
                  productPrice = priceMatch[0];
                }
              }
              
              // Extract image with better selectors
              let productImage = '';
              const imgEl = element.querySelector('img');
              if (imgEl) {
                let imgSrc = imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy') || imgEl.getAttribute('srcset');
                if (imgSrc) {
                  // Handle srcset format
                  if (imgSrc.includes(',')) {
                    imgSrc = imgSrc.split(',')[0].trim().split(' ')[0];
                  }
                  // Make sure it's a full URL
                  if (imgSrc.startsWith('//')) {
                    imgSrc = 'https:' + imgSrc;
                  } else if (imgSrc.startsWith('/')) {
                    const baseUrl = new URL(currentUrl);
                    imgSrc = `${baseUrl.origin}${imgSrc}`;
                  }
                  productImage = imgSrc;
                }
              }
              
              // Extract URL with better logic
              let productUrl = currentUrl;
              const linkEl = element.querySelector('a');
              if (linkEl?.getAttribute('href')) {
                const href = linkEl.getAttribute('href');
                if (href) {
                  if (href.startsWith('http')) {
                    productUrl = href;
                  } else if (href.startsWith('/')) {
                    const baseUrl = new URL(currentUrl);
                    productUrl = `${baseUrl.origin}${href}`;
                  } else {
                    productUrl = new URL(href, currentUrl).href;
                  }
                }
              }
              
              if (productTitle && (productPrice || productImage)) {
                pageProducts.push({
                  id: `product_${Date.now()}_${i}_${depth}`,
                  title: productTitle,
                  price: productPrice || 'Preț nu este disponibil',
                  image: productImage || '',
                  url: productUrl,
                  description: '',
                  availability: 'Unknown',
                  brand: '',
                  category: '',
                  sku: '',
                  specifications: {},
                  reviews: { rating: 0, count: 0, topReviews: [] },
                  images: productImage ? [{ src: productImage, alt: productTitle, title: productTitle, type: 'main' }] : [],
                  seoData: { title: productTitle, description: '', keywords: [] }
                });
              }
            }
          }
        }

        // Add products from this page
        allProducts.push(...pageProducts);

        // Extract links for deep scraping
        const pageLinks = Array.from(doc.querySelectorAll('a')).map(link => {
          const href = link.getAttribute('href');
          let fullUrl = '';
          if (href) {
            try {
              if (href.startsWith('http')) {
                fullUrl = href;
              } else if (href.startsWith('/')) {
                const baseUrl = new URL(currentUrl);
                fullUrl = `${baseUrl.origin}${href}`;
              } else {
                fullUrl = new URL(href, currentUrl).href;
              }
            } catch (e) {
              // Invalid URL, skip
              fullUrl = '';
            }
          }
          return {
            url: fullUrl,
            text: link.textContent?.trim() || '',
            type: 'link'
          };
        }).filter(link => link.url); // Only keep valid URLs

        allLinks.push(...pageLinks);

        // Extract images
        const pageImages = Array.from(doc.querySelectorAll('img')).map(img => ({
          src: img.src || img.getAttribute('src') || '',
          alt: img.alt || '',
          title: img.title || ''
        })).filter(img => img.src); // Only keep images with src

        allImages.push(...pageImages);

        // Add new pages to process if deep scraping is enabled
        if (deepScraping && depth < maxDepth) {
          const baseUrl = new URL(currentUrl);
          const relevantLinks = pageLinks.filter(link => {
            try {
              const linkUrl = new URL(link.url);
              return linkUrl.hostname === baseUrl.hostname && 
                     !processedUrls.has(link.url) &&
                     link.url !== currentUrl &&
                     !link.url.includes('#') &&
                     (link.url.includes('/products/') || 
                      link.url.includes('/collection') || 
                      link.url.includes('/category') ||
                      link.url.includes('/page/') ||
                      link.text.toLowerCase().includes('next') ||
                      link.text.toLowerCase().includes('urmatoarea'));
            } catch {
              return false;
            }
          });

          for (const link of relevantLinks.slice(0, 50)) { // Limit to 50 links per page
            pagesToProcess.push({ url: link.url, depth: depth + 1 });
          }
        }
      } catch (pageError) {
        console.log(`Error processing page ${currentUrl}:`, pageError.message);
        continue;
      }
    }

    const result = {
      url,
      title,
      description,
      keywords,
      text: bodyText,
      links: allLinks,
      images: allImages,
      products: allProducts,
      success: true
    };

    console.log(`✅ Scraping completed: ${allProducts.length} products found from ${processedUrls.size} pages`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Scraping error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Eroare la scraping',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});