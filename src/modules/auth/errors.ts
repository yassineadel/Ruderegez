/**
 * Error codes shared between the service (which throws them) and the actions
 * (which translate them). Deliberately NOT in actions.ts - that file is
 * "use server", and a "use server" file may only export async functions.
 */
export const AUTH_ERRORS = {
  INVALID_CODE: "INVALID_CODE",
  INVALID_TOKEN: "INVALID_TOKEN",
} as const;

const MESSAGES: Record<string, string> = {
  [AUTH_ERRORS.INVALID_CODE]: "That code is invalid or has expired.",
  [AUTH_ERRORS.INVALID_TOKEN]:
    "This reset link is invalid or has expired. Please request a new one.",
};

export function toUserMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result = { ok: true } | { ok: false; error: string };