export const ADMIN_ERRORS = {
  REQUIRED_FIELD: "REQUIRED_FIELD",
  INVALID_NUMBER: "INVALID_NUMBER",
  INVALID_VALUE: "INVALID_VALUE",
  OUT_OF_RANGE: "OUT_OF_RANGE",
  SLA_RANGE_INVERTED: "SLA_RANGE_INVERTED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  BLOCKED: "BLOCKED",
} as const;

const MESSAGES: Record<string, string> = {
  [ADMIN_ERRORS.REQUIRED_FIELD]: "One of the required fields is empty.",
  [ADMIN_ERRORS.INVALID_NUMBER]: "One of the numeric fields is not a valid number.",
  [ADMIN_ERRORS.INVALID_VALUE]: "One of the fields has an unexpected value.",
  [ADMIN_ERRORS.OUT_OF_RANGE]: "One of the values is outside the allowed range.",
  [ADMIN_ERRORS.SLA_RANGE_INVERTED]:
    "The fastest quote turnaround cannot be slower than the slowest.",
  [ADMIN_ERRORS.UNAUTHORIZED]: "Please sign in again.",
  [ADMIN_ERRORS.FORBIDDEN]: "You do not have permission to change these.",
  [ADMIN_ERRORS.BLOCKED]: "This account is blocked.",
};

export function toAdminMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };