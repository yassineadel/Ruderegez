import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import {
  findVisibleReviews,
  summarizeReviews,
  findUserReview,
  findDeliveredOrderItem,
  upsertReview,
  findReviewTargets,
  type PublicReview,
} from "./repository";
import { REVIEW_BODY_MIN, REVIEW_BODY_MAX } from "./errors";

// ============================================================================
//  TYPES
// ============================================================================

export type DisplayReview = Omit<PublicReview, "user"> & { authorName: string };

/** Drives what the review form shows. Worked out on the server so the page
 *  never has to guess. */
export type MyReviewState =
  | { status: "SIGNED_OUT" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "CAN_REVIEW" }
  | {
      status: "REVIEWED";
      review: { rating: number; body: string; isHidden: boolean };
    };

// ============================================================================
//  QUERIES
// ============================================================================

/** Public - no sign-in needed to read reviews. */
export async function getProductReviews(productId: string): Promise<{
  reviews: DisplayReview[];
  average: number | null;
  count: number;
}> {
  const [reviews, summary] = await Promise.all([
    findVisibleReviews(productId),
    summarizeReviews(productId),
  ]);

  return {
    reviews: reviews.map(({ user, ...r }) => ({
      ...r,
      authorName: toDisplayName(user.name),
    })),
    ...summary,
  };
}

/**
 * Uses auth() rather than requireUser() on purpose: a signed-out visitor is
 * a normal state on a product page, not an error to throw.
 */
export async function getMyReviewState(
  productId: string,
): Promise<MyReviewState> {
  const session = await auth();
  if (!session?.user?.id) return { status: "SIGNED_OUT" };

  const userId = session.user.id;

  const existing = await findUserReview(userId, productId);
  if (existing) {
    return {
      status: "REVIEWED",
      review: {
        rating: existing.rating,
        body: existing.body,
        isHidden: existing.hiddenAt !== null,
      },
    };
  }

  const orderItem = await findDeliveredOrderItem(userId, productId);
  return orderItem ? { status: "CAN_REVIEW" } : { status: "NOT_ELIGIBLE" };
}

/**
 * Review links for a delivered order, keyed by productId. Only the signed-in
 * customer's own reviews count towards "reviewed", so an admin viewing the
 * order never sees the customer's state.
 */
export async function getReviewLinks(
  productIds: string[],
): Promise<Record<string, { slug: string; reviewed: boolean }>> {
  const session = await auth();
  if (!session?.user?.id || productIds.length === 0) return {};

  const products = await findReviewTargets(session.user.id, productIds);

  return Object.fromEntries(
    products.map((p) => [
      p.id,
      { slug: p.slug, reviewed: p.reviews.length > 0 },
    ]),
  );
}

// ============================================================================
//  COMMANDS
// ============================================================================

export async function submitReview(input: {
  productId: string;
  rating: number;
  body: string;
}): Promise<{ slug: string }> {
  // 1. Signed in and not blocked (BRD 9.3 - blocked users can't act).
  const user = await requireUser();

  // 2. Validate the input. The client is never trusted.
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("INVALID_RATING");
  }

  const body = input.body.trim();
  if (body.length < REVIEW_BODY_MIN) throw new Error("BODY_TOO_SHORT");
  if (body.length > REVIEW_BODY_MAX) throw new Error("BODY_TOO_LONG");

  // 3. FR-37 - bought AND received. Checked on every submit, including edits,
  //    so the rule holds even if someone calls the action directly.
  const orderItem = await findDeliveredOrderItem(user.id, input.productId);
  if (!orderItem) throw new Error("NOT_ELIGIBLE");

  // 4. Save.
  await upsertReview({
    userId: user.id,
    productId: input.productId,
    orderItemId: orderItem.id,
    rating: input.rating,
    body,
  });

  // The action needs the slug to refresh the right product page.
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { slug: true },
  });
  return { slug: product?.slug ?? "" };
}

// ============================================================================
//  HELPERS
// ============================================================================

/** "Mona Hassan" -> "Mona H." - enough to feel real, not enough to identify
 *  someone. Falls back when the account has no name. */
function toDisplayName(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Verified customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}