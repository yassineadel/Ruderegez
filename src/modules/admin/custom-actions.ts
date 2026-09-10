"use server";

import { revalidatePath } from "next/cache";
import {
  startReview,
  quoteRequest,
  rejectCustomRequest,
} from "./custom-service";
import { type Result } from "./errors";

const MESSAGES: Record<string, string> = {
  REQUEST_NOT_FOUND: "That request no longer exists.",
  INVALID_TRANSITION: "That isn't allowed from where this request is now.",
  INVALID_WEIGHT: "Enter a weight between 0 and 1000 grams.",
  INVALID_FACTOR: "Enter a factor between 0 and 20.",
  INVALID_LEAD_TIME: "Lead time must be a whole number of days.",
  INVALID_PRICE: "The quoted price must be more than zero.",
  REASON_REQUIRED: "Please give a reason for rejecting.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
};

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!MESSAGES[code]) console.error("[admin custom]", err);
  return {
    ok: false,
    error: MESSAGES[code] ?? "Something went wrong. Please try again.",
  };
}

function revalidate(reference: string) {
  revalidatePath(`/admin/custom-requests/${reference}`);
  revalidatePath("/admin/custom-requests");
  revalidatePath(`/custom/${reference}`);
  revalidatePath("/account");
}

export async function startReviewAction(reference: string): Promise<Result> {
  try {
    await startReview(reference);
    revalidate(reference);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function quoteRequestAction(input: {
  reference: string;
  weightG: number;
  factor: number;
  overrideEgp?: number | null;
  leadTimeDays: number;
  note?: string;
}): Promise<Result> {
  try {
    await quoteRequest(input);
    revalidate(input.reference);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function rejectCustomRequestAction(input: {
  reference: string;
  reason: string;
}): Promise<Result> {
  try {
    await rejectCustomRequest(input);
    revalidate(input.reference);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}