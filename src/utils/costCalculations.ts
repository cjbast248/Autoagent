/**
 * Cost calculation utilities
 * Credits-based pricing structure
 * 1 credit = 1 cent ($0.01)
 * 100 credits = $1
 */

// Base rate for extra minutes per plan
export const COST_PER_MINUTE = 0.15; // Default fallback (in USD)
export const PROFESSIONAL_EXTRA_RATE = 0.20; // $0.20/min for extra minutes
export const BUSINESS_EXTRA_RATE = 0.18; // $0.18/min for extra minutes

/**
 * Convert USD to credits (1 credit = 1 cent = $0.01)
 * @param usd Amount in USD
 * @returns Amount in credits
 */
export const usdToCredits = (usd: number): number => {
  return Math.round(usd * 100);
};

/**
 * Convert credits to USD
 * @param credits Amount in credits
 * @returns Amount in USD
 */
export const creditsToUsd = (credits: number): number => {
  return credits / 100;
};

// Plan minute allocations
export const PLAN_MINUTES = {
  PROFESSIONAL: 1170, // 17¢ effective rate
  BUSINESS: 4000, // 15¢ effective rate
  ENTERPRISE: 0 // Unlimited/custom
};

// Plan pricing
export const PLAN_PRICING = {
  PROFESSIONAL: 199,
  BUSINESS: 599,
  ENTERPRISE: 0 // Custom
};

/**
 * Calculate cost based on duration in seconds
 * @param durationSeconds Duration in seconds
 * @returns Cost in USD
 */
export const calculateCostFromSeconds = (durationSeconds: number): number => {
  const durationMinutes = durationSeconds / 60;
  return Math.round(durationMinutes * COST_PER_MINUTE * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate cost based on duration in minutes
 * @param durationMinutes Duration in minutes
 * @returns Cost in USD
 */
export const calculateCostFromMinutes = (durationMinutes: number): number => {
  return Math.round(durationMinutes * COST_PER_MINUTE * 100) / 100; // Round to 2 decimals
};

/**
 * Convert balance to minutes based on plan
 * @param balanceUsd Balance in USD
 * @param plan User's current plan
 * @returns Available minutes
 */
export const convertBalanceToMinutes = (balanceUsd: number, plan?: string): number => {
  let rate = COST_PER_MINUTE;
  
  if (plan === 'PROFESSIONAL') {
    rate = PROFESSIONAL_EXTRA_RATE;
  } else if (plan === 'BUSINESS') {
    rate = BUSINESS_EXTRA_RATE;
  }
  
  return Math.floor(balanceUsd / rate);
};

/**
 * Get effective cost per minute for a plan
 * @param plan Plan name
 * @returns Cost per minute for extra usage
 */
export const getExtraCostPerMinute = (plan?: string): number => {
  switch (plan) {
    case 'PROFESSIONAL':
      return PROFESSIONAL_EXTRA_RATE;
    case 'BUSINESS':
      return BUSINESS_EXTRA_RATE;
    default:
      return COST_PER_MINUTE;
  }
};

/**
 * Format duration from seconds to MM:SS format
 * @param durationSeconds Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Format duration from seconds to human readable format
 * @param durationSeconds Duration in seconds
 * @returns Human readable duration string
 */
export const formatDurationHuman = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  
  if (minutes === 0) {
    return `${seconds}s`;
  }
  
  if (seconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${seconds}s`;
};