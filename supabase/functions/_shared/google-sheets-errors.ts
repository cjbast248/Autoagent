/**
 * Standardized error handling for Google Sheets Edge Functions
 * All errors return consistent format with user-friendly messages
 */

import { getCorsHeaders } from './google-sheets-cors.ts';

export interface GoogleSheetsError {
  code: string;
  message: string;
  userMessage: string; // Romanian message for UI
  status: number;
}

export const GOOGLE_SHEETS_ERRORS: Record<string, GoogleSheetsError> = {
  // Authentication errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'User not authenticated',
    userMessage: 'Nu ești autentificat. Te rog să te loghezi din nou.',
    status: 401,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Google OAuth token expired',
    userMessage: 'Conexiunea cu Google a expirat. Te rog să te reconectezi.',
    status: 401,
  },
  TOKEN_REFRESH_FAILED: {
    code: 'TOKEN_REFRESH_FAILED',
    message: 'Failed to refresh Google OAuth token',
    userMessage: 'Nu am putut reînnoi conexiunea cu Google. Te rog să te reconectezi.',
    status: 401,
  },
  INVALID_STATE: {
    code: 'INVALID_STATE',
    message: 'Invalid or expired OAuth state',
    userMessage: 'Sesiunea de autentificare a expirat. Te rog să încerci din nou.',
    status: 400,
  },

  // Connection errors
  NO_CONNECTION: {
    code: 'NO_CONNECTION',
    message: 'No Google Sheets connection found',
    userMessage: 'Nu ai conectat un cont Google. Te rog să te conectezi mai întâi.',
    status: 404,
  },
  CONNECTION_FAILED: {
    code: 'CONNECTION_FAILED',
    message: 'Failed to connect to Google',
    userMessage: 'Conexiunea cu Google a eșuat. Te rog să încerci din nou.',
    status: 500,
  },

  // Google API errors
  SPREADSHEET_NOT_FOUND: {
    code: 'SPREADSHEET_NOT_FOUND',
    message: 'Spreadsheet not found or access denied',
    userMessage: 'Nu am găsit acest spreadsheet sau nu ai permisiuni de acces.',
    status: 404,
  },
  SHEET_NOT_FOUND: {
    code: 'SHEET_NOT_FOUND',
    message: 'Sheet not found in spreadsheet',
    userMessage: 'Nu am găsit acest sheet în spreadsheet.',
    status: 404,
  },
  ACCESS_DENIED: {
    code: 'ACCESS_DENIED',
    message: 'Access denied to Google resource',
    userMessage: 'Nu ai permisiuni pentru această resursă Google.',
    status: 403,
  },
  QUOTA_EXCEEDED: {
    code: 'QUOTA_EXCEEDED',
    message: 'Google API quota exceeded',
    userMessage: 'Am depășit limita de cereri către Google. Te rog să aștepți câteva minute.',
    status: 429,
  },

  // Validation errors
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    message: 'Invalid input parameters',
    userMessage: 'Datele introduse sunt invalide.',
    status: 400,
  },
  MISSING_SPREADSHEET_ID: {
    code: 'MISSING_SPREADSHEET_ID',
    message: 'Spreadsheet ID is required',
    userMessage: 'ID-ul spreadsheet-ului lipsește.',
    status: 400,
  },
  INVALID_SPREADSHEET_ID: {
    code: 'INVALID_SPREADSHEET_ID',
    message: 'Invalid spreadsheet ID format',
    userMessage: 'ID-ul spreadsheet-ului este invalid.',
    status: 400,
  },

  // Rate limiting
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    userMessage: 'Prea multe cereri. Te rog să aștepți câteva secunde.',
    status: 429,
  },

  // Server errors
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    userMessage: 'A apărut o eroare. Te rog să încerci din nou.',
    status: 500,
  },
  CONFIG_ERROR: {
    code: 'CONFIG_ERROR',
    message: 'Server configuration error',
    userMessage: 'Eroare de configurare. Te rog să contactezi suportul.',
    status: 500,
  },
};

export function createErrorResponse(
  error: GoogleSheetsError,
  requestOrigin: string | null,
  details?: string
): Response {
  const body = {
    error: error.code,
    message: error.message,
    userMessage: error.userMessage,
    ...(details && { details }),
  };

  return new Response(JSON.stringify(body), {
    status: error.status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(requestOrigin),
    },
  });
}

export function createSuccessResponse(
  data: unknown,
  requestOrigin: string | null,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(requestOrigin),
    },
  });
}

// Map Google API errors to our error types
export function mapGoogleError(googleError: { code?: number; message?: string }): GoogleSheetsError {
  const code = googleError.code;
  const message = googleError.message?.toLowerCase() || '';

  if (code === 401 || message.includes('invalid credentials')) {
    return GOOGLE_SHEETS_ERRORS.TOKEN_EXPIRED;
  }
  if (code === 403 || message.includes('access denied') || message.includes('forbidden')) {
    return GOOGLE_SHEETS_ERRORS.ACCESS_DENIED;
  }
  if (code === 404 || message.includes('not found')) {
    if (message.includes('sheet')) {
      return GOOGLE_SHEETS_ERRORS.SHEET_NOT_FOUND;
    }
    return GOOGLE_SHEETS_ERRORS.SPREADSHEET_NOT_FOUND;
  }
  if (code === 429 || message.includes('quota') || message.includes('rate limit')) {
    return GOOGLE_SHEETS_ERRORS.QUOTA_EXCEEDED;
  }

  return GOOGLE_SHEETS_ERRORS.INTERNAL_ERROR;
}
