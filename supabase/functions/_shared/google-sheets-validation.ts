/**
 * Input validation for Google Sheets Edge Functions
 * Strict validation to prevent injection and malformed data
 */

// Google Spreadsheet ID format: alphanumeric with dashes and underscores, 30-50 chars
const SPREADSHEET_ID_REGEX = /^[a-zA-Z0-9_-]{20,60}$/;

// Sheet name: any printable characters except some special ones
const SHEET_NAME_REGEX = /^[^*?:\\\/\[\]]{1,100}$/;

// State token for OAuth: alphanumeric with dashes, 32-64 chars
const STATE_TOKEN_REGEX = /^[a-zA-Z0-9_-]{32,64}$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSpreadsheetId(id: unknown): ValidationResult {
  if (typeof id !== 'string') {
    return { valid: false, error: 'Spreadsheet ID must be a string' };
  }

  if (!id.trim()) {
    return { valid: false, error: 'Spreadsheet ID is required' };
  }

  if (!SPREADSHEET_ID_REGEX.test(id)) {
    return { valid: false, error: 'Invalid spreadsheet ID format' };
  }

  return { valid: true };
}

export function validateSheetName(name: unknown): ValidationResult {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Sheet name must be a string' };
  }

  if (!name.trim()) {
    return { valid: false, error: 'Sheet name is required' };
  }

  if (!SHEET_NAME_REGEX.test(name)) {
    return { valid: false, error: 'Sheet name contains invalid characters' };
  }

  return { valid: true };
}

export function validateStateToken(state: unknown): ValidationResult {
  if (typeof state !== 'string') {
    return { valid: false, error: 'State token must be a string' };
  }

  if (!STATE_TOKEN_REGEX.test(state)) {
    return { valid: false, error: 'Invalid state token format' };
  }

  return { valid: true };
}

export function validateUserId(userId: unknown): ValidationResult {
  if (typeof userId !== 'string') {
    return { valid: false, error: 'User ID must be a string' };
  }

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return { valid: false, error: 'Invalid user ID format' };
  }

  return { valid: true };
}

export function validateRange(range: unknown): ValidationResult {
  if (typeof range !== 'string') {
    return { valid: false, error: 'Range must be a string' };
  }

  // Basic A1 notation validation: A1, A1:B10, Sheet1!A1:B10
  const rangeRegex = /^([^!]+!)?[A-Z]+[0-9]*(:[A-Z]+[0-9]*)?$/i;
  if (!rangeRegex.test(range)) {
    return { valid: false, error: 'Invalid range format' };
  }

  return { valid: true };
}

export function validateColumnMapping(mapping: unknown): ValidationResult {
  if (typeof mapping !== 'object' || mapping === null) {
    return { valid: false, error: 'Column mapping must be an object' };
  }

  const m = mapping as Record<string, unknown>;

  // Required columns
  if (!m.name_column || typeof m.name_column !== 'string') {
    return { valid: false, error: 'name_column is required' };
  }
  if (!m.phone_column || typeof m.phone_column !== 'string') {
    return { valid: false, error: 'phone_column is required' };
  }

  // Column format validation (A-ZZ)
  const columnRegex = /^[A-Z]{1,2}$/;
  const columns = [
    'name_column', 'phone_column', 'email_column', 'location_column',
    'language_column', 'status_column', 'duration_column', 'cost_column',
    'summary_column', 'audio_column'
  ];

  for (const col of columns) {
    if (m[col] && typeof m[col] === 'string') {
      if (!columnRegex.test(m[col] as string)) {
        return { valid: false, error: `Invalid column format for ${col}` };
      }
    }
  }

  return { valid: true };
}

// Sanitize string to prevent XSS and injection
export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') return '';

  return input
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

// Extract and validate spreadsheet ID from URL or direct ID
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;

  // If it looks like a direct ID, validate and return
  if (SPREADSHEET_ID_REGEX.test(input)) {
    return input;
  }

  // Try to extract from URL
  // Format: https://docs.google.com/spreadsheets/d/{spreadsheetId}/...
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,60})/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  return null;
}
