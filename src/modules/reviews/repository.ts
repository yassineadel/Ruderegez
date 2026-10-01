import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

// ============================================================================
//  TYPES
// ============================================================================

/** What the storefront shows. Only the reviewer's name leaves the database -
 *  never their email. */
export type PublicReview = Prisma.ReviewGetPayload<{
  select: {
    id: true;
    rating: true;
    body: true;
    createdAt: true;
    user: { select: { name: true } };
    images: { select: { id: true; url: true } };
  };
}>;

const IMAGES = {
  select: { id: true, url: true },
  orderBy: { sortOrder: "asc" },
} as const;

/** Hidden reviews must never reach the storefront, so the condition lives
 *  here rather than in each caller. Same idea as VISIBLE in catalog. */
const VISIBLE = { hiddenAt: null } as const;

// ============================================================================
//  QUERIES
// ============================================================================

export function findVisibleReviews(productId: string): Promise<PublicReview[]> {
  return prisma.review.findMany({
    where: { ...VISIBLE, productId },
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      user: { select: { name: true } },
      images: IMAGES,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Average and count in one query. Prisma returns null for the average when
 *  there are no rows. */
export async function summarizeReviews(
  productId: string,
): Promise<{ average: number | null; count: number }> {
  const result = await prisma.review.aggregate({
    where: { ...VISIBLE, productId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return { average: result._avg.rating, count: result._count._all };
}

export function findUserReview(userId: string, productId: string) {
  return prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    include: { images: IMAGES },
  });
}

/**
 * FR-37 - the proof of purchase. The most recent DELIVERED catalog order line
 * for this product, belonging to this user. Null means they may not review.
 *
 * Only CATALOG lines count: custom pieces have no productId to review.
 */
export function findDeliveredOrderItem(
  userId: string,
  productId: string,
): Promise<{ id: string } | null> {
  return prisma.orderItem.findFirst({
    where: {
      productId,
      kind: "CATALOG",
      order: { userId, status: "DELIVERED" },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
}

// ============================================================================
//  WRITES
// ============================================================================

/**
 * Create or edit - one review per customer per product.
 *
 * On edit, the moderation fields are deliberately NOT touched. A customer
 * whose review was hidden for abuse cannot un-hide it by editing.
 *
 * The photos are replaced as a set: whatever the form sends is the review's
 * photos now. One transaction, so a review never shows half the old set and
 * half the new.
 */
export function upsertReview(data: {
  userId: string;
  productId: string;
  orderItemId: string;
  rating: number;
  body: string;
  images: string[];
}) {
  const { images, ...fields } = data;
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.upsert({
      where: {
        userId_productId: { userId: fields.userId, productId: fields.productId },
      },
      create: fields,
      update: {
        rating: fields.rating,
        body: fields.body,
        orderItemId: fields.orderItemId,
      },
    });

    await tx.reviewImage.deleteMany({ where: { reviewId: review.id } });
    if (images.length > 0) {
      await tx.reviewImage.createMany({
        data: images.map((url, i) => ({ reviewId: review.id, url, sortOrder: i })),
      });
    }
    return review;
  });
}

/**
 * For the order page's "Review this piece" links. Returns each product's slug
 * plus whether this user has already reviewed it. Hidden or deleted products
 * are left out - there is no page to link to.
 */
export function findReviewTargets(userId: string, productIds: string[]) {
  return prisma.product.findMany({
    where: { id: { in: productIds }, isHidden: false, deletedAt: null },
    select: {
      id: true,
      slug: true,
      reviews: { where: { userId }, select: { id: true } },
    },
  });
}