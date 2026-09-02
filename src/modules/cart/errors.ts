export const CART_ERRORS = {
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  SIZE_REQUIRED: "SIZE_REQUIRED",
  INVALID_SIZE: "INVALID_SIZE",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  NO_CART: "NO_CART",
} as const;

const MESSAGES: Record<string, string> = {
  [CART_ERRORS.PRODUCT_NOT_FOUND]: "That piece is no longer available.",
  [CART_ERRORS.SIZE_REQUIRED]: "Please choose a size first.",
  [CART_ERRORS.INVALID_SIZE]: "That size isn't available for this piece.",
  [CART_ERRORS.INVALID_QUANTITY]: "Please choose a quantity between 1 and 20.",
  [CART_ERRORS.ITEM_NOT_FOUND]: "That item is no longer in your bag.",
  [CART_ERRORS.NO_CART]: "Your bag is empty.",
};

export function toCartMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };