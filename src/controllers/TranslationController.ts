import {
    TranslationRequest, TranslationRequestToMultipleLanguages, TranslationResult,
    TranslationResultMultipleLangauges
} from '../types/dtos';
import { API_CONFIG } from '../constants/constants';

export class TranslationController {
  static async translate(request: TranslationRequest): Promise<TranslationResult> {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_CONFIG.BACKEND_API_KEY
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error('Translation failed');
    }
    return response.json();
  }

  static async translateToMultipleLanguages(
      request: TranslationRequestToMultipleLanguages
  ) : Promise<TranslationResultMultipleLangauges> {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/translate/multiple`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': API_CONFIG.BACKEND_API_KEY
          },
          body: JSON.stringify(request),
      });
      if (!response.ok) {
          throw new Error('Translation failed');
      }
      return response.json();
  }
}
