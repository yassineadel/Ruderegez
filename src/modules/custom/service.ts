import { randomInt } from "crypto";
import { requireUser } from "@/lib/auth-guards";
import {
  createRequestTransaction,
  requestReferenceExists,
  findRequestByReference,
  findRequestsForUser,
} from "./repository";
import {
  getActiveCategory,
  getDesignForRequest,
  listCategorySizes,
  getCategorySize,
} from "@/modules/catalog/service";
import { getPricingSettings } from "@/lib/settings";
import { calculateitemprice } from "@/modules/pricing/calc";
import type { Minor } from "@/lib/money";

const MAX_IMAGES = 6;

/**
 * CR-2609-0117 - same shape as an order reference but a different prefix, so
 * nobody reads a request number over the phone and gets an order pulled up.
 */
function generateRequestReference(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(randomInt(0, 10000)).padStart(4, "0");
  return `CR-${yy}${mm}-${rand}`;
}

export type DesignSource = "NEW_DESIGN" | "RUDEREGEZ_DESIGN";

export interface SubmitRequestInput {
  source: DesignSource;
  /** ProductType id - the category step. */
  typeId: string;
  /** RUDEREGEZ_DESIGN only - the catalog piece being altered. */
  baseProductId?: string | null;
  description: string;
  /** Optional - a CategorySize id. Label and weight are read from it here. */
  sizeId?: string | null;
  /** NEW_DESIGN only, optional - sketches or reference photos. */
  images: { url: string; sizeBytes: number; mimeType: string }[];
}

/** A new design has nothing else to go on, so it needs more words. */
const MIN_DESCRIPTION = { NEW_DESIGN: 30, RUDEREGEZ_DESIGN: 10 } as const;

export async function submitCustomRequest(
  input: SubmitRequestInput,
): Promise<{ reference: string }> {
  const user = await requireUser();

  // --- 1. source ----------------------------------------------------------
  if (input.source !== "NEW_DESIGN" && input.source !== "RUDEREGEZ_DESIGN") {
    throw new Error("INVALID_SOURCE");
  }

  // --- 2. category - must exist and be live ------------------------------
  const type = input.typeId ? await getActiveCategory(input.typeId) : null;
  if (!type) throw new Error("CATEGORY_REQUIRED");

  // --- 3. the base design ---------------------------------------------------
  // The client sends an id only. Name and photo are read here, from our own
  // database, so a crafted request can't attach someone else's image URL.
  let base: { id: string; name: string; imageUrl: string | null } | null = null;
  if (input.source === "RUDEREGEZ_DESIGN") {
    const product = input.baseProductId
      ? await getDesignForRequest(input.baseProductId)
      : null;
    // typeId check: the piece must belong to the category they picked.
    if (!product || product.typeId !== type.id) throw new Error("DESIGN_REQUIRED");
    base = {
      id: product.id,
      name: product.name,
      imageUrl: product.images[0]?.url ?? null,
    };
  }

  // --- 4. description -------------------------------------------------------
  const description = input.description.trim();
  if (description.length === 0) throw new Error("DESCRIPTION_REQUIRED");
  if (description.length < MIN_DESCRIPTION[input.source]) {
    throw new Error("DESCRIPTION_TOO_SHORT");
  }

  // --- 5. uploads - new designs only ----------------------------------------
  const images = input.source === "NEW_DESIGN" ? input.images : [];
  if (images.length > MAX_IMAGES) throw new Error("TOO_MANY_IMAGES");

  // Every URL must be one we issued. Without this a crafted request could
  // store a link to any site, which the admin panel would then render.
  for (const img of images) {
    if (!img.url.startsWith("https://res.cloudinary.com/")) {
      throw new Error("INVALID_UPLOAD");
    }
    if (!Number.isFinite(img.sizeBytes) || img.sizeBytes <= 0) {
      throw new Error("INVALID_UPLOAD");
    }
  }

  // --- 6. size -> weight -----------------------------------------------------
  // The customer picks a size; its weight comes from our table, never from
  // the browser. The size must belong to the category they picked.
  let requestedSize: string | null = null;
  let requestedWeightMg: number | null = null;
  if (input.sizeId) {
    const size = await getCategorySize(input.sizeId);
    if (!size || size.typeId !== type.id) throw new Error("SIZE_INVALID");
    requestedSize = size.label;
    requestedWeightMg = size.weightMg;
  }

  // --- 7. reference -----------------------------------------------------------
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
      source: input.source,
      type: { connect: { id: type.id } },
      ...(base && {
        baseProduct: { connect: { id: base.id } },
        baseProductName: base.name,
        baseImageUrl: base.imageUrl,
      }),
      description,
      requestedSize,
      requestedWeightMg,
    },
    images,
  });

  return { reference: created.reference };
}

// ============================================================================
//  SIZE OPTIONS + ESTIMATE
// ============================================================================
//  Same formula as the catalog: weight x silver rate x factor, plus the
//  weight tolerance. Only the factor's source differs:
//    - altering one of our pieces -> that piece's own factor
//    - a new design               -> the category's customFactorBp
//  Computed here so factors never reach the browser - only the final number.
// ============================================================================

export interface SizeOption {
  id: string;
  label: string;
  weightMg: number;
  /** Null when there is no factor to price with - weight is still shown. */
  estimateMinor: Minor | null;
}

export async function getSizeOptions(
  typeId: string,
  baseProductId: string | null,
): Promise<SizeOption[]> {
  const type = await getActiveCategory(typeId);
  if (!type) throw new Error("CATEGORY_REQUIRED");

  const [sizes, settings, product] = await Promise.all([
    listCategorySizes(type.id),
    getPricingSettings(),
    baseProductId ? getDesignForRequest(baseProductId) : Promise.resolve(null),
  ]);

  let factorBp: number | null = type.customFactorBp;
  if (product && product.typeId === type.id) {
    // A flat-priced piece (a kit) has no silver formula to estimate with.
    factorBp = product.isFlatPrice ? null : product.factorBp;
  }

  return sizes.map((s) => ({
    id: s.id,
    label: s.label,
    weightMg: s.weightMg,
    estimateMinor:
      factorBp === null
        ? null
        : calculateitemprice(
            s.weightMg,
            factorBp,
            settings.silverRatePerGram,
            settings.weightTolerancePercent,
          ),
  }));
}

export async function getMyRequests() {
  const user = await requireUser();
  return findRequestsForUser(user.id);
}

export async function getRequest(reference: string) {
  return findRequestByReference(reference);
}