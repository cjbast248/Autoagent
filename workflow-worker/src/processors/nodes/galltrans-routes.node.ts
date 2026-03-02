/**
 * Galltrans Routes Node
 *
 * A complete node that:
 * 1. Takes city names input (e.g., "Chisinau Bucuresti 2026-01-25")
 * 2. Looks up city IDs from database
 * 3. Uses Groq to analyze and extract route parameters
 * 4. Makes HTTP request to Galltrans API to find routes
 * 5. Returns formatted route data
 */

import { executeCityLookupNode, CityLookupConfig } from './city-lookup.node.js';

// ============================================
// TYPES
// ============================================

export interface GalltransRoutesConfig {
  // City lookup settings
  query?: string;  // Input query like "Chisinau Bucuresti 2026-01-25" or expression
  databaseEntries?: Array<{ point_id: number; point_latin_name: string; point_ru_name?: string; point_ua_name?: string }>;

  // API settings
  apiUrl?: string;  // Default: https://galltrans.com/api/route_search
  password?: string;  // API password
  login?: string;  // API login
  currency?: string;  // EUR, MDL, etc.
  transport?: string;  // bus, train, etc.

  // Groq settings (optional - for smart extraction)
  useGroq?: boolean;
  groqPrompt?: string;

  // Output settings
  returnRawResponse?: boolean;
}

export interface RouteResult {
  success: boolean;
  query: string;
  fromCity: {
    name: string;
    id: number | null;
  };
  toCity: {
    name: string;
    id: number | null;
  };
  date: string | null;
  routes: Array<{
    id?: string;
    departure: string;
    arrival: string;
    duration?: string;
    price?: number;
    currency?: string;
    carrier?: string;
    seats?: number;
    transport?: string;
  }>;
  totalRoutes: number;
  error?: string;
  rawResponse?: unknown;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Resolve template expressions in a string
 */
function resolveTemplates(template: string, data: Record<string, unknown>): string {
  if (!template) return '';

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();

    // Handle $json prefix
    const cleanPath = trimmedPath.replace(/^\$json\./, '').replace(/^\$input\./, '');
    const parts = cleanPath.split('.');

    let current: unknown = data;
    for (const part of parts) {
      if (current === null || current === undefined) return match;
      if (typeof current !== 'object') return match;

      // Handle array access like [0]
      const arrayMatch = part.match(/^([^\[]*)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);
        if (arrayName) {
          current = (current as Record<string, unknown>)[arrayName];
        }
        if (Array.isArray(current)) {
          current = current[index];
        } else {
          return match;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    if (current !== undefined && current !== null) {
      return typeof current === 'object' ? JSON.stringify(current) : String(current);
    }
    return match;
  });
}

/**
 * Extract message/query from various input formats
 */
function extractQuery(inputData: Record<string, unknown>, configQuery?: string): string {
  // If config has a template, resolve it
  if (configQuery) {
    const resolved = resolveTemplates(configQuery, inputData);
    if (resolved && !resolved.includes('{{')) {
      return resolved;
    }
  }

  // Try common field names
  const queryFields = ['query', 'message', 'text', 'input', 'cities', 'route'];

  for (const field of queryFields) {
    if (typeof inputData[field] === 'string' && inputData[field]) {
      return inputData[field] as string;
    }
  }

  // Try body object
  if (inputData.body && typeof inputData.body === 'object') {
    const body = inputData.body as Record<string, unknown>;
    for (const field of queryFields) {
      if (typeof body[field] === 'string' && body[field]) {
        return body[field] as string;
      }
    }
  }

  return '';
}

/**
 * Use Groq to extract route information from natural language
 */
async function extractRouteInfoWithGroq(
  text: string,
  cityData: { fromId: number | null; toId: number | null; date: string | null },
  config: GalltransRoutesConfig
): Promise<{
  password: string;
  id_from: string;
  trans: string;
  change: string;
  date: string;
  id_to: string;
  v: string;
  currency: string;
  login: string;
  lang: string;
}> {
  const apiKey = process.env.GROQ_API_KEY;

  // Default values
  const defaultParams = {
    password: config.password || 'A12345678',
    id_from: String(cityData.fromId || ''),
    trans: config.transport || 'bus',
    change: 'auto',
    date: cityData.date || new Date().toISOString().split('T')[0],
    id_to: String(cityData.toId || ''),
    v: '1.1',
    currency: config.currency || 'EUR',
    login: config.login || 'Aichat',
    lang: 'ro',
  };

  // If no Groq or no API key, return defaults
  if (!config.useGroq || !apiKey) {
    console.log('[Galltrans Routes] Using default params (no Groq)');
    return defaultParams;
  }

  try {
    const prompt = config.groqPrompt || `Din textul următor, extrage informațiile pentru căutarea rutelor de transport:

Text: "${text}"

ID-uri găsite:
- ID plecare: ${cityData.fromId || 'necunoscut'}
- ID sosire: ${cityData.toId || 'necunoscut'}
- Data: ${cityData.date || 'necunoscută'}

Returnează un JSON cu aceste câmpuri:
{
  "id_from": "${cityData.fromId || ''}",
  "id_to": "${cityData.toId || ''}",
  "date": "${cityData.date || new Date().toISOString().split('T')[0]}",
  "trans": "bus",
  "lang": "ro"
}

RĂSPUNDE DOAR CU JSON-ul, fără explicații!`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Ești un asistent care extrage date structurate. Răspunzi DOAR cu JSON valid.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (response.ok) {
      const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = result.choices?.[0]?.message?.content || '';

      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...defaultParams,
          id_from: String(parsed.id_from || defaultParams.id_from),
          id_to: String(parsed.id_to || defaultParams.id_to),
          date: parsed.date || defaultParams.date,
          trans: parsed.trans || defaultParams.trans,
          lang: parsed.lang || defaultParams.lang,
        };
      }
    }
  } catch (error) {
    console.error('[Galltrans Routes] Groq extraction error:', error);
  }

  return defaultParams;
}

/**
 * Search routes via Galltrans API
 */
async function searchRoutes(params: {
  password: string;
  id_from: string;
  trans: string;
  change: string;
  date: string;
  id_to: string;
  v: string;
  currency: string;
  login: string;
  lang: string;
}, apiUrl: string): Promise<{ success: boolean; routes: any[]; raw: unknown; error?: string }> {

  console.log('[Galltrans Routes] Searching routes with params:', {
    ...params,
    password: '***hidden***',
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        routes: [],
        raw: null,
        error: `API error (${response.status}): ${errorText.substring(0, 200)}`,
      };
    }

    const data = await response.json() as Record<string, unknown>;
    console.log('[Galltrans Routes] API response received');

    // Parse routes from response (adapt based on actual API response format)
    let routes: unknown[] = [];

    if (Array.isArray(data)) {
      routes = data;
    } else if (data.routes && Array.isArray(data.routes)) {
      routes = data.routes as unknown[];
    } else if (data.data && Array.isArray(data.data)) {
      routes = data.data as unknown[];
    } else if (data.results && Array.isArray(data.results)) {
      routes = data.results as unknown[];
    }

    return {
      success: true,
      routes,
      raw: data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Galltrans Routes] API request error:', errorMessage);
    return {
      success: false,
      routes: [],
      raw: null,
      error: errorMessage,
    };
  }
}

// ============================================
// MAIN EXECUTION FUNCTION
// ============================================

export async function executeGalltransRoutesNode(
  config: GalltransRoutesConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  console.log('[Galltrans Routes] Starting execution...');
  console.log('[Galltrans Routes] Input data keys:', Object.keys(inputData).join(', '));

  // Step 1: Extract query from input
  const query = extractQuery(inputData, config.query);
  console.log('[Galltrans Routes] Extracted query:', query);

  if (!query) {
    return {
      ...inputData,
      galltrans_routes: {
        success: false,
        query: '',
        fromCity: { name: '', id: null },
        toCity: { name: '', id: null },
        date: null,
        routes: [],
        totalRoutes: 0,
        error: 'No query provided. Expected format: "City1 City2 YYYY-MM-DD"',
      } as RouteResult,
    };
  }

  // Step 2: City Lookup - find city IDs
  console.log('[Galltrans Routes] Step 2: Looking up city IDs...');

  const cityLookupConfig: CityLookupConfig = {
    query,
    databaseEntries: config.databaseEntries,
  };

  const cityLookupResult = await executeCityLookupNode(cityLookupConfig, inputData);

  // Extract city lookup data
  const lookupData = cityLookupResult as Record<string, unknown>;
  const cities = (lookupData.cities || []) as Array<{ input_name: string; point_id: number | null; matched_name: string | null }>;
  const date = lookupData.date as string | null;

  const fromCity = cities[0] || { input_name: '', point_id: null, matched_name: null };
  const toCity = cities[1] || { input_name: '', point_id: null, matched_name: null };

  console.log('[Galltrans Routes] City lookup result:', {
    from: fromCity,
    to: toCity,
    date,
  });

  // Check if we have valid city IDs
  if (!fromCity.point_id || !toCity.point_id) {
    const missingCities = [];
    if (!fromCity.point_id) missingCities.push(fromCity.input_name || 'departure city');
    if (!toCity.point_id) missingCities.push(toCity.input_name || 'arrival city');

    return {
      ...inputData,
      galltrans_routes: {
        success: false,
        query,
        fromCity: { name: fromCity.input_name, id: fromCity.point_id },
        toCity: { name: toCity.input_name, id: toCity.point_id },
        date,
        routes: [],
        totalRoutes: 0,
        error: `Could not find city IDs for: ${missingCities.join(', ')}`,
        cityLookup: lookupData,
      } as RouteResult,
    };
  }

  // Step 3: Extract route parameters (optionally using Groq)
  console.log('[Galltrans Routes] Step 3: Extracting route parameters...');

  const routeParams = await extractRouteInfoWithGroq(
    query,
    { fromId: fromCity.point_id, toId: toCity.point_id, date },
    config
  );

  // Step 4: Search routes via API
  console.log('[Galltrans Routes] Step 4: Searching routes via API...');

  const apiUrl = config.apiUrl || 'https://galltrans.com/api/route_search';
  const searchResult = await searchRoutes(routeParams, apiUrl);

  // Step 5: Format and return results
  console.log('[Galltrans Routes] Step 5: Formatting results...');

  const result: RouteResult = {
    success: searchResult.success,
    query,
    fromCity: {
      name: fromCity.matched_name || fromCity.input_name,
      id: fromCity.point_id,
    },
    toCity: {
      name: toCity.matched_name || toCity.input_name,
      id: toCity.point_id,
    },
    date,
    routes: searchResult.routes.map((route: any) => ({
      id: route.id || route.route_id,
      departure: route.departure || route.departure_time || route.from_time,
      arrival: route.arrival || route.arrival_time || route.to_time,
      duration: route.duration || route.travel_time,
      price: route.price || route.cost,
      currency: route.currency || routeParams.currency,
      carrier: route.carrier || route.company || route.operator,
      seats: route.seats || route.available_seats,
      transport: route.transport || route.type || routeParams.trans,
    })),
    totalRoutes: searchResult.routes.length,
    error: searchResult.error,
  };

  if (config.returnRawResponse) {
    result.rawResponse = searchResult.raw;
  }

  console.log(`[Galltrans Routes] Complete! Found ${result.totalRoutes} routes`);

  return {
    ...inputData,
    galltrans_routes: result,
    // Also expose key fields at top level for easy access
    routes: result.routes,
    totalRoutes: result.totalRoutes,
    fromCity: result.fromCity,
    toCity: result.toCity,
    routeDate: result.date,
  };
}
