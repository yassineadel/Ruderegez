export const CUSTOM_ERRORS = {
  NOT_SIGNED_IN: "NOT_SIGNED_IN",
  DESCRIPTION_REQUIRED: "DESCRIPTION_REQUIRED",
  IMAGES_REQUIRED: "IMAGES_REQUIRED",
  TOO_MANY_IMAGES: "TOO_MANY_IMAGES",
  INVALID_UPLOAD: "INVALID_UPLOAD",
  INVALID_WEIGHT: "INVALID_WEIGHT",
  REFERENCE_COLLISION: "REFERENCE_COLLISION",
} as const;

const MESSAGES: Record<string, string> = {
  [CUSTOM_ERRORS.NOT_SIGNED_IN]: "Please sign in to send a request.",
  [CUSTOM_ERRORS.DESCRIPTION_REQUIRED]:
    "Please describe what you'd like — a sentence or two is enough.",
  [CUSTOM_ERRORS.IMAGES_REQUIRED]: "Please add at least one photo.",
  [CUSTOM_ERRORS.TOO_MANY_IMAGES]: "Please add no more than six photos.",
  [CUSTOM_ERRORS.INVALID_UPLOAD]: "One of those uploads didn't work. Please try again.",
  [CUSTOM_ERRORS.INVALID_WEIGHT]: "Please enter a weight between 0.1 and 1000 grams.",
  [CUSTOM_ERRORS.REFERENCE_COLLISION]: "Something went wrong. Please try again.",
};

export function toCustomMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };