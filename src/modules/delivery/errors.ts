export const DELIVERY_ERRORS = {
  ZONE_NOT_FOUND: "ZONE_NOT_FOUND",
  ZONE_NAME_INVALID: "ZONE_NAME_INVALID",
  ZONE_NAME_TAKEN: "ZONE_NAME_TAKEN",
  ZONE_FEE_INVALID: "ZONE_FEE_INVALID",
} as const;

export const DELIVERY_MESSAGES: Record<string, string> = {
  [DELIVERY_ERRORS.ZONE_NOT_FOUND]: "That area no longer exists.",
  [DELIVERY_ERRORS.ZONE_NAME_INVALID]: "Area names are 2 to 40 characters.",
  [DELIVERY_ERRORS.ZONE_NAME_TAKEN]: "There is already an area with that name.",
  [DELIVERY_ERRORS.ZONE_FEE_INVALID]: "The fee must be 0 or more, up to 10,000 EGP.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
  BLOCKED: "This account is blocked.",
};

export function toDeliveryMessage(code: string): string {
  return DELIVERY_MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result = { ok: true } | { ok: false; error: string };
