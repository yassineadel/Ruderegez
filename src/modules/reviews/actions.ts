"use server";

import { revalidatePath } from "next/cache";
import { submitReview } from "./service";
import { toReviewMessage, type Result } from "./errors";

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  return { ok: false, error: toReviewMessage(code) };
}

export async function submitReviewAction(input: {
  productId: string;
  rating: number;
  body: string;
}): Promise<Result> {
  try {
    const { slug } = await submitReview(input);
    if (slug) revalidatePath(`/products/${slug}`);
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}