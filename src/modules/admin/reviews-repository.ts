import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type AdminReview = Prisma.ReviewGetPayload<{
  include: {
    user: { select: { name: true; email: true } };
    product: { select: { name: true; slug: true } };
    orderItem: { select: { order: { select: { reference: true } } } };
    images: { select: { id: true; url: true } };
  };
}>;

export function findReviews(filter?: "visible" | "hidden"): Promise<AdminReview[]> {
  const where: Prisma.ReviewWhereInput =
    filter === "visible"
      ? { hiddenAt: null }
      : filter === "hidden"
        ? { hiddenAt: { not: null } }
        : {};

  return prisma.review.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, slug: true } },
      orderItem: { select: { order: { select: { reference: true } } } },
      images: { select: { id: true, url: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function countReviews(): Promise<{ visible: number; hidden: number }> {
  const [visible, hidden] = await Promise.all([
    prisma.review.count({ where: { hiddenAt: null } }),
    prisma.review.count({ where: { hiddenAt: { not: null } } }),
  ]);
  return { visible, hidden };
}

export function findReviewById(id: string) {
  return prisma.review.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
}

/** Hide + audit in one transaction - a hidden review with no log entry
 *  would be exactly the unexplained removal the rule exists to prevent. */
export function hideReview(data: {
  id: string;
  reason: string;
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.review.update({
      where: { id: data.id },
      data: {
        hiddenAt: new Date(),
        hiddenReason: data.reason,
        hiddenByUserId: data.actorUserId,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "REVIEW_HIDDEN",
        entityType: "Review",
        entityId: data.id,
        actorUserId: data.actorUserId,
        reason: data.reason,
      },
    }),
  ]);
}

export function unhideReview(data: {
  id: string;
  previousReason: string | null;
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.review.update({
      where: { id: data.id },
      data: { hiddenAt: null, hiddenReason: null, hiddenByUserId: null },
    }),
    prisma.auditLog.create({
      data: {
        action: "REVIEW_RESTORED",
        entityType: "Review",
        entityId: data.id,
        actorUserId: data.actorUserId,
        beforeJson: { hiddenReason: data.previousReason },
      },
    }),
  ]);
}
export function findReviewImageById(id: string) {
  return prisma.reviewImage.findUnique({
    where: { id },
    include: { review: { select: { id: true, product: { select: { slug: true } } } } },
  });
}

/** Remove one photo + audit. The review itself stays up. */
export function deleteReviewImage(data: {
  id: string;
  reviewId: string;
  url: string;
  reason: string;
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.reviewImage.delete({ where: { id: data.id } }),
    prisma.auditLog.create({
      data: {
        action: "REVIEW_PHOTO_REMOVED",
        entityType: "Review",
        entityId: data.reviewId,
        actorUserId: data.actorUserId,
        reason: data.reason,
        beforeJson: { url: data.url },
      },
    }),
  ]);
}
