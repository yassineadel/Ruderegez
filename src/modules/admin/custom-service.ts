import { requirePermission } from "@/lib/auth-guards";
import { getPricingSettings } from "@/lib/settings";
import { calculateitemprice } from "@/modules/pricing/calc";
import type { Minor } from "@/lib/money";
import type { CustomRequestStatus } from "@/generated/prisma/client";
import {
  findCustomRequests,
  countCustomByStatus,
  findCustomRequest,
  markUnderReview,
  saveQuote,
  rejectRequest,
} from "./custom-repository";

/** Which statuses the admin may move a request to from where it is now. */
const ALLOWED: Record<CustomRequestStatus, CustomRequestStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "QUOTED", "REJECTED"],
  UNDER_REVIEW: ["QUOTED", "REJECTED"],
  // Re-quoting overwrites the previous figures. Allowed while the customer
  // hasn't answered - an admin who mistyped a price needs to fix it.
  QUOTED: ["QUOTED", "REJECTED"],
  ACCEPTED: [],
  DECLINED: [],
  REJECTED: [],
};

export async function listCustomRequests(status?: CustomRequestStatus) {
  await requirePermission("CUSTOM_REQUESTS");
  const [requests, counts] = await Promise.all([
    findCustomRequests(status),
    countCustomByStatus(),
  ]);
  return { requests, counts };
}

export async function getCustomRequest(reference: string) {
  await requirePermission("CUSTOM_REQUESTS");
  return findCustomRequest(reference);
}

export async function startReview(reference: string) {
  await requirePermission("CUSTOM_REQUESTS");
  const request = await findCustomRequest(reference);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (request.status !== "SUBMITTED") throw new Error("INVALID_TRANSITION");
  await markUnderReview(request.id);
}

/**
 * The price is computed from weight and factor, not typed in - so a custom
 * piece is priced the same way a catalog piece is, and moves with the silver
 * rate identically. The admin can still override the result.
 */
export async function quoteRequest(input: {
  reference: string;
  weightG: number;
  factor: number;
  /** EGP, if the admin wants to override the computed figure. */
  overrideEgp?: number | null;
  leadTimeDays: number;
  note?: string;
}) {
  const admin = await requirePermission("CUSTOM_REQUESTS");

  const request = await findCustomRequest(input.reference);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (!ALLOWED[request.status].includes("QUOTED")) {
    throw new Error("INVALID_TRANSITION");
  }

  if (!(input.weightG > 0) || input.weightG > 1000) {
    throw new Error("INVALID_WEIGHT");
  }
  if (!(input.factor > 0) || input.factor > 20) {
    throw new Error("INVALID_FACTOR");
  }
  if (!Number.isInteger(input.leadTimeDays) || input.leadTimeDays < 0) {
    throw new Error("INVALID_LEAD_TIME");
  }

  const settings = await getPricingSettings();
  const weightMg = Math.round(input.weightG * 1000);

  const computed = calculateitemprice(
    weightMg,
    Math.round(input.factor * 10000),
    settings.silverRatePerGram,
    settings.weightTolerancePercent,
  );

  const quotedPriceMinor =
    input.overrideEgp !== undefined && input.overrideEgp !== null
      ? Math.round(input.overrideEgp * 100)
      : (computed as number);

  if (quotedPriceMinor <= 0) throw new Error("INVALID_PRICE");

  await saveQuote({
    id: request.id,
    quotedWeightMg: weightMg,
    quotedPriceMinor,
    quotedLeadTimeDays: input.leadTimeDays,
    quoteNote: input.note?.trim() || null,
    actorUserId: admin.id,
  });
}

export async function rejectCustomRequest(input: {
  reference: string;
  reason: string;
}) {
  const admin = await requirePermission("CUSTOM_REQUESTS");

  const request = await findCustomRequest(input.reference);
  if (!request) throw new Error("REQUEST_NOT_FOUND");
  if (!ALLOWED[request.status].includes("REJECTED")) {
    throw new Error("INVALID_TRANSITION");
  }
  if (!input.reason.trim()) throw new Error("REASON_REQUIRED");

  await rejectRequest({
    id: request.id,
    reason: input.reason.trim(),
    actorUserId: admin.id,
  });
}

/** Lets the quote form show a live price as the admin types. */
export async function previewQuotePrice(
  weightG: number,
  factor: number,
): Promise<Minor> {
  const settings = await getPricingSettings();
  return calculateitemprice(
    Math.round(weightG * 1000),
    Math.round(factor * 10000),
    settings.silverRatePerGram,
    settings.weightTolerancePercent,
  );
} 