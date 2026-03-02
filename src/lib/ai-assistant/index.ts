/**
 * AI Assistant Library
 *
 * Provides intent detection and action execution for the Agent Automation platform
 */

export { detectIntent, detectLanguage, ALL_INTENTS } from './intent-patterns';
export {
  ACTION_CATALOG,
  ROUTE_MAP,
  ROUTE_LABELS,
  getAction,
  getResponseMessage,
  getActionSteps
} from './action-catalog';
export type { ActionStep, ActionDefinition } from './action-catalog';

import { detectIntent } from './intent-patterns';
import { getAction, getActionSteps, getResponseMessage, ACTION_CATALOG } from './action-catalog';
import type { ActionStep } from './action-catalog';

export interface DetectedAction {
  intentId: string;
  params: Record<string, any>;
  responseMessage: string;
  steps: ActionStep[];
  isNavigation: boolean;
  path?: string;
}

/**
 * Main function to detect and prepare action from user text
 */
export function detectAndPrepareAction(text: string): DetectedAction | null {
  const detected = detectIntent(text);
  if (!detected) return null;

  const { id, params } = detected;
  const action = getAction(id);
  if (!action) return null;

  const responseMessage = getResponseMessage(id, params);
  const steps = getActionSteps(id, params);

  return {
    intentId: id,
    params,
    responseMessage,
    steps,
    isNavigation: action.type === 'navigate',
    path: action.type === 'navigate' ? action.path : undefined
  };
}

/**
 * Check if text contains any action intent
 */
export function hasActionIntent(text: string): boolean {
  return detectIntent(text) !== null;
}

/**
 * Get all available action IDs
 */
export function getAllActionIds(): string[] {
  return Object.keys(ACTION_CATALOG);
}

/**
 * Get action by ID
 */
export function getActionById(id: string) {
  return ACTION_CATALOG[id];
}
