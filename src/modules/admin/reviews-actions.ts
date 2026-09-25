"use server";

import { revalidatePath } from "next/cache";
import { hideReview, unhideReview } from "./reviews-service";
import { type Result } from "./errors";

const MESSAGES: Record<string, string> = {
  REVIEW_NOT_FOUND: "That review no longer exists.",
  REASON_REQUIRED: "Please give a reason for hiding this review.",
  ALREADY_HIDDEN: "This review is already hidden.",
  NOT_HIDDEN: "This review is already visible.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
};

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!MESSAGES[code]) console.error("[admin reviews]", err);
  return {
    ok: false,
    error: MESSAGES[code] ?? "Something went wrong. Please try again.",
  };
}

function revalidate(slug: string) {
  revalidatePath("/admin/reviews");
  if (slug) revalidatePath(`/products/${slug}`);
}

export async function hideReviewAction(input: {
  id: string;
  reason: string;
}): Promise<Result> {
  try {
    const { slug } = await hideReview(input);
    revalidate(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function unhideReviewAction(id: string): Promise<Result> {
  try {
    const { slug } = await unhideReview(id);
    revalidate(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}