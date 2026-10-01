export const HOMEPAGE_ERRORS = {
  SLIDE_NOT_FOUND: "SLIDE_NOT_FOUND",
  SLIDE_KIND_INVALID: "SLIDE_KIND_INVALID",
  SLIDE_PRODUCT_INVALID: "SLIDE_PRODUCT_INVALID",
  SLIDE_REVIEW_INVALID: "SLIDE_REVIEW_INVALID",
  SLIDE_IMAGE_REQUIRED: "SLIDE_IMAGE_REQUIRED",
  SLIDE_LINK_INVALID: "SLIDE_LINK_INVALID",
  SLIDE_TEXT_TOO_LONG: "SLIDE_TEXT_TOO_LONG",
  SLIDER_TITLE_INVALID: "SLIDER_TITLE_INVALID",
} as const;

export const HOMEPAGE_MESSAGES: Record<string, string> = {
  [HOMEPAGE_ERRORS.SLIDE_NOT_FOUND]: "That card no longer exists.",
  [HOMEPAGE_ERRORS.SLIDE_KIND_INVALID]: "Choose a product, a review or an image.",
  [HOMEPAGE_ERRORS.SLIDE_PRODUCT_INVALID]:
    "Choose a product that is visible in the store and has a photo.",
  [HOMEPAGE_ERRORS.SLIDE_REVIEW_INVALID]: "Choose a review that is visible on the site.",
  [HOMEPAGE_ERRORS.SLIDE_IMAGE_REQUIRED]: "Upload the picture for this card.",
  [HOMEPAGE_ERRORS.SLIDE_LINK_INVALID]:
    "Links must be a page on this site (starting with /) or an https:// address.",
  [HOMEPAGE_ERRORS.SLIDE_TEXT_TOO_LONG]: "Keep the title under 60 characters and the subtitle under 100.",
  [HOMEPAGE_ERRORS.SLIDER_TITLE_INVALID]: "The section title must be 1 to 40 characters.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
  BLOCKED: "This account is blocked.",
};

export function toHomepageMessage(code: string): string {
  return HOMEPAGE_MESSAGES[code] ?? "Something went wrong. Please try again.";
}

export type Result = { ok: true } | { ok: false; error: string };
