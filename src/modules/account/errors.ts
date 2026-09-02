export const ACCOUNT_ERRORS = {
  NAME_REQUIRED: "NAME_REQUIRED",
  INVALID_PHONE: "INVALID_PHONE",
  WRONG_PASSWORD: "WRONG_PASSWORD",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  NO_PASSWORD_SET: "NO_PASSWORD_SET",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

const MESSAGES: Record<string, string> = {
  [ACCOUNT_ERRORS.NAME_REQUIRED]: "Please enter your name.",
  [ACCOUNT_ERRORS.INVALID_PHONE]: "Please enter a valid Egyptian mobile number.",
  [ACCOUNT_ERRORS.WRONG_PASSWORD]: "That current password isn't right.",
  [ACCOUNT_ERRORS.PASSWORD_TOO_SHORT]: "Your new password needs at least 8 characters.",
  [ACCOUNT_ERRORS.NO_PASSWORD_SET]:
    "This account signs in with Google, so there's no password to change.",
  [ACCOUNT_ERRORS.UNAUTHORIZED]: "Please sign in again.",
};

export function toAccountMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result = { ok: true } | { ok: false; error: string };