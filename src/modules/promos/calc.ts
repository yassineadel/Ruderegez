import type { Minor } from "@/lib/money";

// ============================================================================
//  PROMO RULES - pure functions, no database, safe for client components.
// ============================================================================

export const PERCENT_MIN = 1;
export const PERCENT_MAX = 90;

/** " eid 25 " -> "EID25". Spaces are dropped, not rejected - people type them. */
export function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** 3 to 20 characters: A-Z, 0-9, - and _. Run on a normalized code. */
export function isValidCode(code: string): boolean {
  return /^[A-Z0-9_-]{3,20}$/.test(code);
}

/**
 * The discount in piastres. Rounded DOWN - the store gives away less than one
 * piastre at most, never the customer overpaying by one.
 *   promoDiscount(123457, 10) -> 12345
 */
export function promoDiscount(subtotalMinor: Minor, percentOff: number): Minor {
  return Math.floor((subtotalMinor * percentOff) / 100) as Minor;
}

/** The fields the rules need - a PromoCode row satisfies this. */
export interface PromoRuleFields {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  minSubtotalMinor: number | null;
  usedCount: number;
}

/**
 * Every rule a code must pass to be applied. Returns the first failing error
 * code, or null when the code can be used. Order matters: a code that is
 * switched off should say so before it says "below the minimum".
 */
export function checkPromoRules(
  promo: PromoRuleFields,
  ctx: { now: Date; subtotalMinor: Minor; customerUses: number },
): string | null {
  if (!promo.isActive) return "PROMO_INACTIVE";
  if (promo.startsAt && promo.startsAt > ctx.now) return "PROMO_NOT_STARTED";
  if (promo.expiresAt && promo.expiresAt <= ctx.now) return "PROMO_EXPIRED";
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return "PROMO_LIMIT_REACHED";
  }
  if (
    promo.maxUsesPerCustomer !== null &&
    ctx.customerUses >= promo.maxUsesPerCustomer
  ) {
    return "PROMO_CUSTOMER_LIMIT";
  }
  if (promo.minSubtotalMinor !== null && ctx.subtotalMinor < promo.minSubtotalMinor) {
    return "PROMO_MIN_SUBTOTAL";
  }
  return null;
}
