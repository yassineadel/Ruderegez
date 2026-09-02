export const ORDER_ERRORS = {
  EMPTY_CART: "EMPTY_CART",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  INVALID_PHONE: "INVALID_PHONE",
  INVALID_CITY: "INVALID_CITY",
  INVALID_PAYMENT_METHOD: "INVALID_PAYMENT_METHOD",
  PRICE_MOVED: "PRICE_MOVED",
  REFERENCE_COLLISION: "REFERENCE_COLLISION",
  NOT_SIGNED_IN: "NOT_SIGNED_IN",
} as const;

const MESSAGES: Record<string, string> = {
  [ORDER_ERRORS.EMPTY_CART]: "Your bag is empty.",
  [ORDER_ERRORS.INVALID_ADDRESS]: "Please enter a delivery address.",
  [ORDER_ERRORS.INVALID_PHONE]: "Please enter a valid Egyptian phone number.",
  [ORDER_ERRORS.INVALID_CITY]: "We only deliver within the listed city at the moment.",
  [ORDER_ERRORS.INVALID_PAYMENT_METHOD]: "Please choose how you'd like to pay.",
  [ORDER_ERRORS.PRICE_MOVED]:
    "The silver rate changed while you were checking out. Please review the new total and confirm.",
  [ORDER_ERRORS.REFERENCE_COLLISION]: "Something went wrong placing your order. Please try again.",
  [ORDER_ERRORS.NOT_SIGNED_IN]: "Please sign in to place your order.",
};

export function toOrderMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };