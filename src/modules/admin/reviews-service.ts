import { requirePermission } from "@/lib/auth-guards";
import {
  findReviews,
  countReviews,
  findReviewById,
  hideReview as hideReviewRow,
  unhideReview as unhideReviewRow,
} from "./reviews-repository";

export async function listReviews(filter?: "visible" | "hidden") {
  await requirePermission("REVIEWS");
  const [reviews, counts] = await Promise.all([
    findReviews(filter),
    countReviews(),
  ]);
  return { reviews, counts };
}

/** Returns the product slug so the action can refresh that product page. */
export async function hideReview(input: {
  id: string;
  reason: string;
}): Promise<{ slug: string }> {
  const admin = await requirePermission("REVIEWS");

  const reason = input.reason.trim();
  if (reason.length < 3) throw new Error("REASON_REQUIRED");

  const review = await findReviewById(input.id);
  if (!review) throw new Error("REVIEW_NOT_FOUND");
  if (review.hiddenAt) throw new Error("ALREADY_HIDDEN");

  await hideReviewRow({ id: review.id, reason, actorUserId: admin.id });
  return { slug: review.product.slug };
}

export async function unhideReview(id: string): Promise<{ slug: string }> {
  const admin = await requirePermission("REVIEWS");

  const review = await findReviewById(id);
  if (!review) throw new Error("REVIEW_NOT_FOUND");
  if (!review.hiddenAt) throw new Error("NOT_HIDDEN");

  await unhideReviewRow({
    id: review.id,
    previousReason: review.hiddenReason,
    actorUserId: admin.id,
  });
  return { slug: review.product.slug };
}