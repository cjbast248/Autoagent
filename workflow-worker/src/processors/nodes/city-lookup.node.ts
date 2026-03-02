/**
 * City Lookup Node - Lookup location IDs from city names
 *
 * Input format: "City1 City2 YYYY-MM-DD"
 * Example: "Chișinău București 2026-01-22"
 *
 * Output:
 * {
 *   "success": true,
 *   "date": "2026-01-22",
 *   "cities": [
 *     { "input_name": "Chișinău", "point_id": 40, "matched_name": "Chisinau" }
 *   ],
 *   "formatted": "40,143,2026-01-22",
 *   "errors": []
 * }
 */

export interface CityLookupConfig {
  query?: string;  // Input query string
  database?: string;  // CSV format: "id,name\n40,Chisinau\n143,Bucuresti"
  databaseEntries?: Array<{ point_id: number; point_latin_name: string }>;
}

export interface CityMatch {
  input_name: string;
  point_id: number | null;
  matched_name: string | null;
  error?: string;
}

export interface CityLookupResult {
  success: boolean;
  date: string | null;
  cities: CityMatch[];
  formatted: string;
  errors: string[];
}

// Character normalization map for diacritics
const CHAR_MAP: Record<string, string> = {
  // Romanian
  'ă': 'a', 'â': 'a', 'Ă': 'A', 'Â': 'A',
  'î': 'i', 'ï': 'i', 'Î': 'I', 'Ï': 'I',
  'ș': 's', 'ş': 's', 'Ș': 'S', 'Ş': 'S',
  'ț': 't', 'ţ': 't', 'Ț': 'T', 'Ţ': 'T',
  // Hungarian
  'ö': 'o', 'ő': 'o', 'Ö': 'O', 'Ő': 'O',
  'ü': 'u', 'ű': 'u', 'Ü': 'U', 'Ű': 'U',
  // French/Spanish
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
  'ç': 'c', 'Ç': 'C',
  'ñ': 'n', 'Ñ': 'N',
  // German
  'ß': 'ss', 'ẞ': 'SS',
  // Russian/Cyrillic transliteration
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
  'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i',
  'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
  'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
  'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
  'э': 'e', 'ю': 'yu', 'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
  'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
  'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
  'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
  'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch',
  'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
  'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  // Other common characters
  'à': 'a', 'á': 'a', 'ã': 'a', 'å': 'a',
  'À': 'A', 'Á': 'A', 'Ã': 'A', 'Å': 'A',
  'ì': 'i', 'í': 'i', 'ĩ': 'i',
  'Ì': 'I', 'Í': 'I', 'Ĩ': 'I',
  'ò': 'o', 'ó': 'o', 'õ': 'o', 'ø': 'o',
  'Ò': 'O', 'Ó': 'O', 'Õ': 'O', 'Ø': 'O',
  'ù': 'u', 'ú': 'u', 'ũ': 'u',
  'Ù': 'U', 'Ú': 'U', 'Ũ': 'U',
};

/**
 * Normalize text by removing diacritics and converting to lowercase
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  let result = '';
  for (const char of text) {
    result += CHAR_MAP[char] || char;
  }

  return result.toLowerCase().trim();
}

/**
 * Validate date string in YYYY-MM-DD format
 */
export function isValidDate(dateString: string): boolean {
  if (!dateString) return false;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Month names in various languages for parsing human dates
 */
const MONTH_NAMES: Record<string, number> = {
  // Romanian
  'ianuarie': 1, 'ian': 1, 'feb': 2, 'februarie': 2, 'mar': 3, 'martie': 3,
  'apr': 4, 'aprilie': 4, 'mai': 5, 'iun': 6, 'iunie': 6,
  'iul': 7, 'iulie': 7, 'aug': 8, 'august': 8, 'sep': 9, 'septembrie': 9,
  'oct': 10, 'octombrie': 10, 'nov': 11, 'noiembrie': 11, 'dec': 12, 'decembrie': 12,
  // English
  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
  'july': 7, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
  // Russian
  'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6,
  'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
};

/**
 * Try to parse a human-readable date like "26 ianuarie" or "26 january"
 * Returns YYYY-MM-DD format or null if not parseable
 */
function parseHumanDate(parts: string[]): { date: string; consumedParts: number } | null {
  if (parts.length < 2) return null;

  // Try pattern: "26 ianuarie" (day month) - check last 2 parts
  const lastPart = parts[parts.length - 1].toLowerCase();
  const secondLastPart = parts[parts.length - 2];

  // Check if last part is a month name
  const monthNum = MONTH_NAMES[lastPart];
  if (monthNum) {
    // Check if second last part is a day number
    const dayNum = parseInt(secondLastPart, 10);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      const currentYear = new Date().getFullYear();
      const month = String(monthNum).padStart(2, '0');
      const day = String(dayNum).padStart(2, '0');
      return { date: `${currentYear}-${month}-${day}`, consumedParts: 2 };
    }
  }

  // Try pattern: "26.01.2026" or "26/01/2026" or "26-01-2026"
  const dateMatch = lastPart.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (dateMatch) {
    let [, day, month, year] = dateMatch;
    if (year.length === 2) {
      year = `20${year}`;
    }
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    return { date: `${year}-${m}-${d}`, consumedParts: 1 };
  }

  return null;
}

/**
 * Parse input query to extract cities and date
 */
export function parseQuery(query: string): { cities: string[]; date: string | null; error: string | null } {
  if (!query || typeof query !== 'string') {
    return { cities: [], date: null, error: 'Input query is empty or invalid' };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { cities: [], date: null, error: 'Input query is empty' };
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length < 2) {
    return { cities: [], date: null, error: 'Query must contain at least one city and a date' };
  }

  // First check: last part is already YYYY-MM-DD format
  const lastPart = parts[parts.length - 1];
  if (isValidDate(lastPart)) {
    return {
      cities: parts.slice(0, -1),
      date: lastPart,
      error: null
    };
  }

  // Second check: try to parse human-readable dates like "26 ianuarie"
  const humanDate = parseHumanDate(parts);
  if (humanDate) {
    return {
      cities: parts.slice(0, -humanDate.consumedParts),
      date: humanDate.date,
      error: null
    };
  }

  // If no date found, assume all parts are cities and use today's date
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  console.log(`[City Lookup] No date found in query, using today: ${todayStr}`);

  return {
    cities: parts,
    date: todayStr,
    error: null
  };
}

/**
 * Parse database from CSV/text string format
 * Supports multiple formats:
 * 1. CSV with newlines: "90,Moskva\n2,Minsk"
 * 2. Space-separated pairs: "90,Moskva 2,Minsk 257,London"
 * 3. With header: "point_id,point_latin_name 90,Moskva 2,Minsk"
 */
function parseDatabaseCSV(text: string): Array<{ point_id: number; point_latin_name: string }> {
  if (!text || !text.trim()) return [];

  const entries: Array<{ point_id: number; point_latin_name: string }> = [];

  // Normalize: replace multiple spaces/tabs with single space
  const normalizedText = text.replace(/[\t]+/g, ' ').replace(/  +/g, ' ').trim();

  // Check if it's space-separated format or newline-separated
  const hasNewlines = normalizedText.includes('\n');

  let items: string[];

  if (hasNewlines) {
    // Traditional CSV with newlines
    items = normalizedText.split('\n').map(line => line.trim()).filter(Boolean);
  } else {
    // Space-separated format: "90,Moskva 2,Minsk 257,London"
    items = normalizedText.split(' ').filter(Boolean);
  }

  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    // Skip header
    if (trimmed.toLowerCase() === 'point_id,point_latin_name' ||
        trimmed.toLowerCase().startsWith('point_id,') ||
        trimmed.toLowerCase() === 'id,name' ||
        trimmed.toLowerCase().startsWith('id,')) {
      continue;
    }

    // Parse "id,name" format
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) continue;

    const idStr = trimmed.substring(0, commaIndex).trim();
    const name = trimmed.substring(commaIndex + 1).trim();
    const id = parseInt(idStr, 10);

    if (!isNaN(id) && name) {
      // Avoid duplicates
      if (!entries.some(e => e.point_id === id)) {
        entries.push({ point_id: id, point_latin_name: name });
      }
    }
  }

  return entries;
}

/**
 * City name aliases - common alternative spellings
 */
const CITY_ALIASES: Record<string, string[]> = {
  'kyiv': ['kiev', 'kiew', 'киев', 'київ'],
  'kiev': ['kyiv', 'kiew', 'киев', 'київ'],
  'chisinau': ['kishinev', 'kishinau', 'кишинев', 'кишинэу', 'chișinău', 'chisineu'],
  'bucuresti': ['bucharest', 'bukarest', 'бухарест', 'bucurești'],
  'bucharest': ['bucuresti', 'bukarest', 'bucurești'],
  'odessa': ['odesa', 'одесса', 'одеса'],
  'odesa': ['odessa', 'одесса', 'одеса'],
  'moscow': ['moskva', 'moscova', 'москва', 'moskau'],
  'moskva': ['moscow', 'moscova', 'москва', 'moskau'],
  'minsk': ['минск'],
  'warsaw': ['warszawa', 'varsovia', 'варшава'],
  'warszawa': ['warsaw', 'varsovia', 'варшава'],
  'prague': ['praha', 'praga', 'прага'],
  'praha': ['prague', 'praga', 'прага'],
  'vienna': ['wien', 'viena', 'вена'],
  'wien': ['vienna', 'viena', 'вена'],
  'berlin': ['берлин'],
  'paris': ['париж'],
  'london': ['лондон'],
  'rome': ['roma', 'рим'],
  'roma': ['rome', 'рим'],
  'saint-petersburg': ['sankt-peterburg', 'st petersburg', 'санкт-петербург', 'spb', 'piter'],
  'sankt-peterburg': ['saint-petersburg', 'st petersburg', 'санкт-петербург'],
  'lviv': ['lvov', 'lwow', 'lemberg', 'львов', 'львів'],
  'lvov': ['lviv', 'lwow', 'lemberg', 'львов', 'львів'],
  'kharkiv': ['kharkov', 'харьков', 'харків'],
  'kharkov': ['kharkiv', 'харьков', 'харків'],
  'dnipro': ['dnepropetrovsk', 'dnepr', 'днепр', 'дніпро'],
  'istanbul': ['constantinople', 'стамбул'],
  'tbilisi': ['tiflis', 'тбилиси'],
  'riga': ['рига'],
  'vilnius': ['vilna', 'вильнюс'],
  'tallinn': ['таллин', 'таллинн'],
  'helsinki': ['хельсинки'],
  'stockholm': ['стокгольм'],
  'copenhagen': ['kobenhavn', 'копенгаген'],
  'amsterdam': ['амстердам'],
  'brussels': ['brussel', 'bruxelles', 'брюссель'],
  'budapest': ['будапешт'],
  'sofia': ['софия'],
  'athens': ['athina', 'афины'],
  'belgrade': ['beograd', 'белград'],
  'zagreb': ['загреб'],
};

/**
 * Find city in database using fuzzy matching with aliases
 */
export function findCity(
  searchName: string,
  database: Array<{ point_id: number; point_latin_name: string }>
): { point_id: number; matched_name: string } | null {
  if (!searchName || !database || database.length === 0) return null;

  const normalizedSearch = normalizeText(searchName);

  // 1. Exact match (normalized)
  for (const entry of database) {
    const normalizedEntry = normalizeText(entry.point_latin_name);
    if (normalizedEntry === normalizedSearch) {
      return { point_id: entry.point_id, matched_name: entry.point_latin_name };
    }
  }

  // 2. Check aliases - if search term has known aliases, try them
  const searchAliases = CITY_ALIASES[normalizedSearch] || [];
  for (const alias of searchAliases) {
    const aliasNormalized = normalizeText(alias);
    for (const entry of database) {
      const entryNormalized = normalizeText(entry.point_latin_name);
      if (entryNormalized === aliasNormalized ||
          entryNormalized.includes(aliasNormalized) ||
          aliasNormalized.includes(entryNormalized)) {
        return { point_id: entry.point_id, matched_name: entry.point_latin_name };
      }
    }
  }

  // 3. Check if any database entry has the search term as an alias
  for (const entry of database) {
    const entryNormalized = normalizeText(entry.point_latin_name);
    const entryAliases = CITY_ALIASES[entryNormalized] || [];
    if (entryAliases.some(alias => normalizeText(alias) === normalizedSearch)) {
      return { point_id: entry.point_id, matched_name: entry.point_latin_name };
    }
  }

  // 4. Starts with match (for partial names like "Sankt" matching "Sankt-Peterburg")
  for (const entry of database) {
    const normalizedEntry = normalizeText(entry.point_latin_name);
    if (normalizedEntry.startsWith(normalizedSearch) || normalizedSearch.startsWith(normalizedEntry)) {
      return { point_id: entry.point_id, matched_name: entry.point_latin_name };
    }
  }

  // 5. Contains match
  for (const entry of database) {
    const normalizedEntry = normalizeText(entry.point_latin_name);
    if (normalizedEntry.includes(normalizedSearch) || normalizedSearch.includes(normalizedEntry)) {
      return { point_id: entry.point_id, matched_name: entry.point_latin_name };
    }
  }

  // 6. Levenshtein distance for typos - find best match
  let bestMatch: { point_id: number; matched_name: string; distance: number } | null = null;
  const maxDistance = Math.max(2, Math.floor(normalizedSearch.length * 0.35)); // Allow up to 35% difference

  for (const entry of database) {
    const normalizedEntry = normalizeText(entry.point_latin_name);
    const distance = levenshteinDistance(normalizedSearch, normalizedEntry);

    if (distance <= maxDistance) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { point_id: entry.point_id, matched_name: entry.point_latin_name, distance };
      }
    }
  }

  if (bestMatch) {
    return { point_id: bestMatch.point_id, matched_name: bestMatch.matched_name };
  }

  return null;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Main lookup function
 */
export function lookupCities(
  query: string,
  database: Array<{ point_id: number; point_latin_name: string }>
): CityLookupResult {
  // Parse the query
  const parsed = parseQuery(query);

  if (parsed.error) {
    return {
      success: false,
      date: null,
      cities: [],
      formatted: '',
      errors: [parsed.error]
    };
  }

  const cities: CityMatch[] = [];
  const errors: string[] = [];
  const foundIds: number[] = [];

  // Lookup each city
  for (const cityName of parsed.cities) {
    const match = findCity(cityName, database);

    if (match) {
      cities.push({
        input_name: cityName,
        point_id: match.point_id,
        matched_name: match.matched_name
      });
      foundIds.push(match.point_id);
    } else {
      cities.push({
        input_name: cityName,
        point_id: null,
        matched_name: null,
        error: 'not_found'
      });
      errors.push(`City not found: "${cityName}"`);
    }
  }

  // Build formatted output
  const formatted = foundIds.length > 0
    ? `${foundIds.join(',')},${parsed.date}`
    : '';

  return {
    success: errors.length === 0,
    date: parsed.date,
    cities,
    formatted,
    errors
  };
}

/**
 * Try to extract message from body - handles both direct object and JSON string in text field
 */
function extractMessageFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;

  const bodyObj = body as Record<string, unknown>;

  // Direct message field
  if (typeof bodyObj.message === 'string') {
    return bodyObj.message;
  }

  // Query field (common for search requests)
  if (typeof bodyObj.query === 'string') {
    return bodyObj.query;
  }

  // Text field might contain JSON string
  if (typeof bodyObj.text === 'string') {
    try {
      const parsed = JSON.parse(bodyObj.text);
      if (typeof parsed.message === 'string') {
        return parsed.message;
      }
      if (typeof parsed.query === 'string') {
        return parsed.query;
      }
    } catch {
      // Not JSON, return text as-is
      return bodyObj.text;
    }
  }

  return null;
}

/**
 * Template value resolution utility
 * Supports:
 * - {{ $json.body.message }} - simple path access
 * - {{ $('Webhook').item.json['body.message'] }} - n8n style reference
 * - Auto-parses JSON strings in body.text field
 */
function resolveTemplateValue(value: string, data: Record<string, unknown>): string {
  if (!value) return '';

  let result = value;

  // First, handle n8n style: {{ $('NodeName').item.json['path.to.value'] }}
  result = result.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\['([^']+)'\]\s*\}\}/g, (match, _nodeName, path) => {
    const parts = path.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        // Special handling: if looking for body.message but it doesn't exist, try extracting from body.text
        if (path === 'body.message' || path === 'body.query') {
          const extracted = extractMessageFromBody(data.body);
          if (extracted) return extracted;
        }
        return match;
      }
      if (typeof current !== 'object') return match;
      current = (current as Record<string, unknown>)[part];
    }

    if (current !== undefined && current !== null) {
      return typeof current === 'object' ? JSON.stringify(current) : String(current);
    }

    // Fallback: try to extract from body.text if looking for body.message
    if (path === 'body.message' || path === 'body.query') {
      const extracted = extractMessageFromBody(data.body);
      if (extracted) return extracted;
    }

    return match;
  });

  // Also handle: {{ $('NodeName').item.json.path.to.value }} (dot notation)
  result = result.replace(/\{\{\s*\$\(['"]([^'"]+)['"]\)\.item\.json\.([a-zA-Z0-9_.]+)\s*\}\}/g, (match, _nodeName, path) => {
    const parts = path.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        if (path === 'body.message' || path === 'body.query') {
          const extracted = extractMessageFromBody(data.body);
          if (extracted) return extracted;
        }
        return match;
      }
      if (typeof current !== 'object') return match;
      current = (current as Record<string, unknown>)[part];
    }

    if (current !== undefined && current !== null) {
      return typeof current === 'object' ? JSON.stringify(current) : String(current);
    }

    if (path === 'body.message' || path === 'body.query') {
      const extracted = extractMessageFromBody(data.body);
      if (extracted) return extracted;
    }

    return match;
  });

  // Then handle simple path: {{ $json.body.message }} or {{ body.message }}
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const parts = trimmedPath.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        if (trimmedPath.includes('body.message') || trimmedPath.includes('body.query')) {
          const extracted = extractMessageFromBody(data.body);
          if (extracted) return extracted;
        }
        return match;
      }
      if (typeof current !== 'object') return match;

      // Handle special prefixes
      if (part === '$json' || part === '$input') continue;

      current = (current as Record<string, unknown>)[part];
    }

    if (current !== undefined && current !== null) {
      return typeof current === 'object' ? JSON.stringify(current) : String(current);
    }

    if (trimmedPath.includes('body.message') || trimmedPath.includes('body.query')) {
      const extracted = extractMessageFromBody(data.body);
      if (extracted) return extracted;
    }

    return match;
  });

  return result;
}

/**
 * Execute City Lookup Node
 */
export async function executeCityLookupNode(
  config: CityLookupConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  console.log('[City Lookup] Executing...');
  console.log('[City Lookup] Config query:', config.query);
  console.log('[City Lookup] Input data keys:', Object.keys(inputData).join(', '));

  // Get query from config or input data
  let query = config.query || '';

  // Resolve template expressions
  if (query.includes('{{')) {
    console.log('[City Lookup] Resolving template expression:', query);
    query = resolveTemplateValue(query, inputData);
    console.log('[City Lookup] Resolved to:', query);
  }

  // Fallback to input data fields
  if (!query || query.includes('{{')) {
    console.log('[City Lookup] Template not resolved or empty, trying fallback extraction...');

    // First try to extract from body (handles JSON in body.text)
    const extracted = extractMessageFromBody(inputData.body);
    if (extracted) {
      query = extracted;
      console.log('[City Lookup] Extracted from body:', query);
    } else {
      query = (inputData.query as string) ||
              (inputData.message as string) ||
              (inputData.text as string) ||
              '';

      // Check body object directly
      if (!query && inputData.body && typeof inputData.body === 'object') {
        const body = inputData.body as Record<string, unknown>;
        query = (body.query as string) ||
                (body.message as string) ||
                (body.text as string) ||
                '';
      }
    }
  }

  console.log(`[City Lookup] Final query: "${query}"`);

  if (!query) {
    return {
      ...inputData,
      city_lookup: {
        success: false,
        date: null,
        cities: [],
        formatted: '',
        errors: ['No query provided']
      }
    };
  }

  // Get database entries
  let database: Array<{ point_id: number; point_latin_name: string }> = [];

  if (config.databaseEntries && Array.isArray(config.databaseEntries)) {
    database = config.databaseEntries;
  } else if (config.database && typeof config.database === 'string') {
    database = parseDatabaseCSV(config.database);
  }

  console.log(`[City Lookup] Database has ${database.length} entries`);

  if (database.length === 0) {
    return {
      ...inputData,
      city_lookup: {
        success: false,
        date: null,
        cities: [],
        formatted: '',
        errors: ['No database provided. Add city entries in format: "id,name" per line']
      }
    };
  }

  // Perform lookup
  const result = lookupCities(query, database);

  console.log(`[City Lookup] Result: ${result.success ? 'success' : 'failed'}, ${result.cities.length} cities, formatted: "${result.formatted}"`);

  // Return a clean output with lookup results as primary data
  // This makes it easy to use in subsequent nodes

  // Transform cities to lookupResults format for n8n-style expressions compatibility
  // This allows {{ $json.lookupResults[0].pointId }} to work
  const lookupResults = result.cities.map(city => ({
    searchTerm: city.input_name,
    found: city.point_id !== null,
    pointId: city.point_id,
    pointName: city.matched_name,
    // Also include original field names for flexibility
    point_id: city.point_id,
    matched_name: city.matched_name,
    input_name: city.input_name,
  }));

  // Parse date parts if available
  let parsedDate: { year?: number; month?: number; day?: number } | null = null;
  if (result.date) {
    const [year, month, day] = result.date.split('-').map(Number);
    parsedDate = { year, month, day };
  }

  return {
    // Primary output - the formatted string with IDs
    formatted: result.formatted,
    success: result.success,
    date: result.date,
    parsedDate,
    cities: result.cities,
    // Alias for n8n-style expressions: {{ $json.lookupResults[0].pointId }}
    lookupResults,
    errors: result.errors,
    // Original query for reference
    query: query,
    // Parsed cities for Groq prompt - easy to use
    parsedCities: result.cities.filter(c => c.point_id !== null).map(c => c.matched_name),
    // Keep input data nested for reference if needed
    _input: inputData,
  };
}
