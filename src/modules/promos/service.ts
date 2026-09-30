import type { Minor } from "@/lib/money";
import { toMinor } from "@/lib/money";
import { requirePermission } from "@/lib/auth-guards";
import type { PromoCode } from "@/generated/prisma/client";
import {
  normalizeCode,
  isValidCode,
  promoDiscount,
  checkPromoRules,
  PERCENT_MIN,
  PERCENT_MAX,
} from "./calc";
import {
  findPromos,
  findPromoById,
  findPromoByCode,
  countCustomerRedemptions,
  countOpenHoldsWithPromo,
  createPromoRow,
  setPromoActiveRow,
  deletePromoRow,
} from "./repository";

// ============================================================================
//  CUSTOMER SIDE
// ============================================================================

/**
 * Can this customer use this code on a bag of this size, right now?
 * Returns the promo and the discount it gives, or throws a PROMO_* error.
 *
 * Accepts either a typed code (applying at checkout) or a promo row already
 * loaded (carrying a code over to a new price hold).
 */
export async function validatePromo(input: {
  code: string | PromoCode;
  subtotalMinor: Minor;
  userId: string;
}): Promise<{ promo: PromoCode; discountMinor: Minor }> {
  let promo: PromoCode | null;
  if (typeof input.code === "string") {
    const code = normalizeCode(input.code);
    // An invalid shape can't exist in the table - skip the query.
    promo = isValidCode(code) ? await findPromoByCode(code) : null;
  } else {
    promo = input.code;
  }
  if (!promo) throw new Error("PROMO_NOT_FOUND");

  const customerUses =
    promo.maxUsesPerCustomer !== null
      ? await countCustomerRedemptions(promo.id, input.userId)
      : 0;

  const failed = checkPromoRules(promo, {
    now: new Date(),
    subtotalMinor: input.subtotalMinor,
    customerUses,
  });
  if (failed) throw new Error(failed);

  return { promo, discountMinor: promoDiscount(input.subtotalMinor, promo.percentOff) };
}

// ============================================================================
//  ADMIN SIDE  -  every function checks PROMOS itself
// ============================================================================

export async function listPromos() {
  await requirePermission("PROMOS");
  return findPromos();
}

export interface CreatePromoInput {
  code: string;
  percentOff: number;
  /** ISO strings from the browser (converted there from the admin's local time). */
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  /** In EGP, as typed. Stored as piastres. */
  minSubtotalEgp?: number | null;
}

export async function createPromo(input: CreatePromoInput) {
  const admin = await requirePermission("PROMOS");

  const code = normalizeCode(input.code ?? "");
  if (!isValidCode(code)) throw new Error("PROMO_CODE_INVALID");

  const percentOff = input.percentOff;
  if (
    !Number.isInteger(percentOff) ||
    percentOff < PERCENT_MIN ||
    percentOff > PERCENT_MAX
  ) {
    throw new Error("PROMO_PERCENT_INVALID");
  }

  const maxUses = optionalLimit(input.maxUses);
  const maxUsesPerCustomer = optionalLimit(input.maxUsesPerCustomer);

  let minSubtotalMinor: number | null = null;
  if (input.minSubtotalEgp !== null && input.minSubtotalEgp !== undefined) {
    if (!Number.isFinite(input.minSubtotalEgp) || input.minSubtotalEgp <= 0) {
      throw new Error("PROMO_MIN_INVALID");
    }
    minSubtotalMinor = toMinor(input.minSubtotalEgp);
  }

  const startsAt = optionalDate(input.startsAt);
  const expiresAt = optionalDate(input.expiresAt);
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    throw new Error("PROMO_DATES_INVALID");
  }

  if (await findPromoByCode(code)) throw new Error("PROMO_CODE_TAKEN");

  try {
    return await createPromoRow({
      code,
      percentOff,
      startsAt,
      expiresAt,
      maxUses,
      maxUsesPerCustomer,
      minSubtotalMinor,
      actorUserId: admin.id,
    });
  } catch (err) {
    // Two admins creating the same code at the same moment - the unique
    // index catches the one the check above couldn't.
    if (isUniqueViolation(err)) throw new Error("PROMO_CODE_TAKEN");
    throw err;
  }
}

/** Switching off stops NEW checkouts using it. Holds already showing it keep it. */
export async function setPromoActive(id: string, isActive: boolean) {
  const admin = await requirePermission("PROMOS");
  const promo = await findPromoById(id);
  if (!promo) throw new Error("PROMO_NOT_FOUND");
  if (promo.isActive === isActive) return;
  await setPromoActiveRow({ id, isActive, actorUserId: admin.id });
}

export async function deletePromo(id: string) {
  const admin = await requirePermission("PROMOS");
  const promo = await findPromoById(id);
  if (!promo) throw new Error("PROMO_NOT_FOUND");
  if (promo._count.redemptions > 0 || promo.usedCount > 0) {
    throw new Error("PROMO_IN_USE");
  }
  // Deleting would strip the discount from a checkout that may already have
  // been paid at the discounted amount. Switching off is safe - holds keep it.
  if ((await countOpenHoldsWithPromo(id)) > 0) throw new Error("PROMO_IN_CHECKOUT");
  await deletePromoRow({
    id,
    code: promo.code,
    percentOff: promo.percentOff,
    actorUserId: admin.id,
  });
}

// ---------------------------------------------------------------------------

/** Empty = no limit. Otherwise a whole number of 1 or more. */
function optionalLimit(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 1 || value > 1_000_000) {
    throw new Error("PROMO_LIMIT_INVALID");
  }
  return value;
}

function optionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("PROMO_DATES_INVALID");
  return date;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}
