// Kept out of actions.ts on purpose: a "use server" file may only export
// async functions, and exporting this object from one breaks the module.

export const PROMO_ERRORS = {
  // --- customer, at checkout -------------------------------------------------
  PROMO_NOT_FOUND: "PROMO_NOT_FOUND",
  PROMO_INACTIVE: "PROMO_INACTIVE",
  PROMO_NOT_STARTED: "PROMO_NOT_STARTED",
  PROMO_EXPIRED: "PROMO_EXPIRED",
  PROMO_LIMIT_REACHED: "PROMO_LIMIT_REACHED",
  PROMO_CUSTOMER_LIMIT: "PROMO_CUSTOMER_LIMIT",
  PROMO_MIN_SUBTOTAL: "PROMO_MIN_SUBTOTAL",
  PROMO_LOCKED: "PROMO_LOCKED",

  // --- admin -----------------------------------------------------------------
  PROMO_CODE_INVALID: "PROMO_CODE_INVALID",
  PROMO_CODE_TAKEN: "PROMO_CODE_TAKEN",
  PROMO_PERCENT_INVALID: "PROMO_PERCENT_INVALID",
  PROMO_LIMIT_INVALID: "PROMO_LIMIT_INVALID",
  PROMO_MIN_INVALID: "PROMO_MIN_INVALID",
  PROMO_DATES_INVALID: "PROMO_DATES_INVALID",
  PROMO_IN_USE: "PROMO_IN_USE",
  PROMO_IN_CHECKOUT: "PROMO_IN_CHECKOUT",
} as const;

export const PROMO_MESSAGES: Record<string, string> = {
  // Not found, switched off and not started all read the same to a customer -
  // telling them a code exists but is paused only invites guessing.
  [PROMO_ERRORS.PROMO_NOT_FOUND]: "That promo code isn't valid.",
  [PROMO_ERRORS.PROMO_INACTIVE]: "That promo code isn't valid.",
  [PROMO_ERRORS.PROMO_NOT_STARTED]: "That promo code isn't valid.",
  [PROMO_ERRORS.PROMO_EXPIRED]: "That promo code has expired.",
  [PROMO_ERRORS.PROMO_LIMIT_REACHED]: "That promo code has been fully used.",
  [PROMO_ERRORS.PROMO_CUSTOMER_LIMIT]: "You've already used this promo code.",
  [PROMO_ERRORS.PROMO_MIN_SUBTOTAL]: "Your order is below the minimum for this code.",
  [PROMO_ERRORS.PROMO_LOCKED]:
    "Your receipt is already uploaded, so the amount can't change now.",

  [PROMO_ERRORS.PROMO_CODE_INVALID]:
    "Codes are 3 to 20 characters: letters, numbers, - and _ only.",
  [PROMO_ERRORS.PROMO_CODE_TAKEN]: "A promo code with that name already exists.",
  [PROMO_ERRORS.PROMO_PERCENT_INVALID]: "The discount must be a whole number from 1 to 90.",
  [PROMO_ERRORS.PROMO_LIMIT_INVALID]: "Usage limits must be whole numbers of 1 or more.",
  [PROMO_ERRORS.PROMO_MIN_INVALID]: "The minimum order must be a positive amount.",
  [PROMO_ERRORS.PROMO_DATES_INVALID]: "The end date must be after the start date.",
  [PROMO_ERRORS.PROMO_IN_USE]:
    "This code has been used on orders, so it can only be switched off, not deleted.",
  [PROMO_ERRORS.PROMO_IN_CHECKOUT]:
    "A customer is checking out with this code right now. Switch it off instead, or try again in a few minutes.",

  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
  BLOCKED: "This account is blocked.",
};

export function toPromoMessage(code: string): string {
  return PROMO_MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
