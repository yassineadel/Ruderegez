import { randomInt } from "crypto";
import { requireUser } from "@/lib/auth-guards";
import {
  createRequestTransaction,
  requestReferenceExists,
  findRequestByReference,
  findRequestsForUser,
} from "./repository";

const MAX_IMAGES = 6;

/**
 * CR-2609-0117 — same shape as an order reference but a different prefix, so
 * nobody reads a request number over the phone and gets an order pulled up.
 */
function generateRequestReference(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(randomInt(0, 10000)).padStart(4, "0");
  return `CR-${yy}${mm}-${rand}`;
}

export interface SubmitRequestInput {
  description: string;
  requestedSize?: string;
  /** Grams as the customer typed them — converted to milligrams here. */
  requestedWeightG?: number | null;
  images: { url: string; sizeBytes: number; mimeType: string }[];
}

export async function submitCustomRequest(
  input: SubmitRequestInput,
): Promise<{ reference: string }> {
  const user = await requireUser();

  const description = input.description.trim();
  if (description.length < 10) throw new Error("DESCRIPTION_REQUIRED");

  if (input.images.length === 0) throw new Error("IMAGES_REQUIRED");
  if (input.images.length > MAX_IMAGES) throw new Error("TOO_MANY_IMAGES");

  // Every URL must be one we issued. Without this a crafted request could
  // store a link to any site, which the admin panel would then render.
  for (const img of input.images) {
    if (!img.url.startsWith("https://res.cloudinary.com/")) {
      throw new Error("INVALID_UPLOAD");
    }
    if (!Number.isFinite(img.sizeBytes) || img.sizeBytes <= 0) {
      throw new Error("INVALID_UPLOAD");
    }
  }

  let requestedWeightMg: number | null = null;
  if (input.requestedWeightG !== undefined && input.requestedWeightG !== null) {
    const g = input.requestedWeightG;
    if (!Number.isFinite(g) || g < 0.1 || g > 1000) {
      throw new Error("INVALID_WEIGHT");
    }
    requestedWeightMg = Math.round(g * 1000);
  }

  let reference = generateRequestReference();
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!(await requestReferenceExists(reference))) break;
    reference = generateRequestReference();
    if (attempt === 4) throw new Error("REFERENCE_COLLISION");
  }

  const created = await createRequestTransaction({
    request: {
      reference,
      user: { connect: { id: user.id } },
      status: "SUBMITTED",
      description,
      requestedSize: input.requestedSize?.trim() || null,
      requestedWeightMg,
    },
    images: input.images,
  });

  return { reference: created.reference };
}

export async function getMyRequests() {
  const user = await requireUser();
  return findRequestsForUser(user.id);
}

export async function getRequest(reference: string) {
  return findRequestByReference(reference);
}