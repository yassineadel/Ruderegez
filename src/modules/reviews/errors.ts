export const REVIEW_ERRORS = {
  INVALID_RATING: "INVALID_RATING",
  BODY_TOO_SHORT: "BODY_TOO_SHORT",
  BODY_TOO_LONG: "BODY_TOO_LONG",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  TOO_MANY_IMAGES: "TOO_MANY_IMAGES",
  INVALID_IMAGE: "INVALID_IMAGE",
  UNAUTHORIZED: "UNAUTHORIZED",
  BLOCKED: "BLOCKED",
} as const;

export const REVIEW_BODY_MIN = 10;
export const REVIEW_BODY_MAX = 2000;
export const REVIEW_MAX_IMAGES = 3;

const MESSAGES: Record<string, string> = {
  [REVIEW_ERRORS.INVALID_RATING]: "Please choose a rating from 1 to 5 stars.",
  [REVIEW_ERRORS.BODY_TOO_SHORT]: `Please write at least ${REVIEW_BODY_MIN} characters.`,
  [REVIEW_ERRORS.BODY_TOO_LONG]: `Please keep your review under ${REVIEW_BODY_MAX} characters.`,
  [REVIEW_ERRORS.NOT_ELIGIBLE]:
    "You can review this piece once an order containing it has been delivered.",
  [REVIEW_ERRORS.TOO_MANY_IMAGES]: `You can add up to ${REVIEW_MAX_IMAGES} photos.`,
  [REVIEW_ERRORS.INVALID_IMAGE]: "One of the photos didn't upload properly. Please remove it and add it again.",
  [REVIEW_ERRORS.UNAUTHORIZED]: "Please sign in to leave a review.",
  [REVIEW_ERRORS.BLOCKED]: "This account can't leave reviews.",
};

export function toReviewMessage(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result = { ok: true } | { ok: false; error: string };