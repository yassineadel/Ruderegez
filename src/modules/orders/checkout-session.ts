import type { Minor } from "@/lib/money";
import { requireUser } from "@/lib/auth-guards";
import { getPricingSettings } from "@/lib/settings";
import { getCartView, cartSignature, type CartView } from "@/modules/cart/service";
import type { PromoCode } from "@/generated/prisma/client";
import { validatePromo } from "@/modules/promos/service";
import { promoDiscount } from "@/modules/promos/calc";
import { toPromoMessage } from "@/modules/promos/errors";
import {
  findCheckoutSession,
  findReusableCheckoutSession,
  findLatestUnusedCheckoutSession,
  replaceCheckoutSession,
  lockCheckoutSessionRow,
  setCheckoutSessionPromo,
} from "./repository";

// ============================================================================
//  THE PRICE HOLD
// ============================================================================
//  Opening checkout  -> the silver rate is held for 5 minutes.
//  Receipt uploaded  -> held for 15 more minutes to place the order.
//  Time runs out     -> the next page load opens a new hold at today's rate.
//
//  The countdown in the browser is only a display. The server's expiresAt is
//  the one that counts, and placeOrder checks it again.
//
//  PROMO CODES ride on the hold, like the rate. A code is checked when it is
//  applied; after that the hold honours it until the hold ends, even if the
//  code is switched off or runs out meanwhile - the customer may already
//  have transferred the discounted amount. It can be changed only BEFORE the
//  receipt is uploaded. When a hold is replaced, its code is checked again
//  and carried over if it still passes.
// ============================================================================

export const UPLOAD_WINDOW_MS = 5 * 60 * 1000;
export const ORDER_WINDOW_MS = 15 * 60 * 1000;

/** Covers the second between the timer reaching 0:00 and the click landing. */
export const EXPIRY_GRACE_MS = 30 * 1000;

export interface CheckoutSessionView {
  id: string;
  rateMinor: Minor;
  expiresAt: string; // ISO - crosses to the client component
  locked: boolean;
  /** The promo on this hold, with its discount on the held subtotal. */
  promo: { code: string; percentOff: number; discountMinor: Minor } | null;
}

/**
 * Called by the checkout page on every render. Reuses the current hold if it
 * is still valid for this bag, otherwise starts a new one at the live rate.
 * Returns the bag priced at the HELD rate, so every number on the page
 * matches what placeOrder will charge.
 */
export async function openCheckoutSession(): Promise<{
  session: CheckoutSessionView;
  cart: CartView;
  /** Set when the previous hold's promo could not be carried over. */
  promoNotice: string | null;
} | null> {
  const user = await requireUser();

  // The signature only depends on lines and quantities, so the live view is
  // fine for computing it.
  const liveCart = await getCartView();
  if (liveCart.lines.length === 0) return null;
  const signature = cartSignature(liveCart);

  let row = await findReusableCheckoutSession(user.id, signature);
  let promoNotice: string | null = null;

  if (!row) {
    const [settings, previous] = await Promise.all([
      getPricingSettings(),
      findLatestUnusedCheckoutSession(user.id),
    ]);

    // Carry the old hold's promo over, if it still passes today. The new hold
    // is priced at the live rate - the same rate liveCart was priced at.
    let promoCodeId: string | null = null;
    if (previous?.promoCode) {
      try {
        await validatePromo({
          code: previous.promoCode,
          subtotalMinor: liveCart.subtotalMinor,
          userId: user.id,
        });
        promoCodeId = previous.promoCode.id;
      } catch (err) {
        const code = err instanceof Error ? err.message : "UNKNOWN";
        promoNotice = `Promo code ${previous.promoCode.code} was removed: ${toPromoMessage(code)}`;
      }
    }

    row = await replaceCheckoutSession({
      userId: user.id,
      rateMinor: settings.silverRatePerGram,
      cartSignature: signature,
      expiresAt: new Date(Date.now() + UPLOAD_WINDOW_MS),
      promoCodeId,
    });
  }

  const cart = await getCartView({ silverRateOverride: row.rateMinor as Minor });

  return {
    session: {
      id: row.id,
      rateMinor: row.rateMinor as Minor,
      expiresAt: row.expiresAt.toISOString(),
      locked: row.receiptLockedAt !== null,
      promo: promoView(row.promoCode, cart.subtotalMinor),
    },
    cart,
    promoNotice,
  };
}

/**
 * Applies a typed code to the hold. Checked against the bag at the HELD rate,
 * which is the subtotal the discount will be taken from.
 */
export async function applyPromoToCheckout(sessionId: string, rawCode: string): Promise<void> {
  const user = await requireUser();
  const row = await assertEditableSession(sessionId, user.id);

  const cart = await getCartView({ silverRateOverride: row.rateMinor as Minor });
  if (cartSignature(cart) !== row.cartSignature) throw new Error("CART_CHANGED");

  const { promo } = await validatePromo({
    code: rawCode,
    subtotalMinor: cart.subtotalMinor,
    userId: user.id,
  });

  if (!(await setCheckoutSessionPromo(row.id, promo.id))) throw new Error("PROMO_LOCKED");
}

export async function removePromoFromCheckout(sessionId: string): Promise<void> {
  const user = await requireUser();
  const row = await assertEditableSession(sessionId, user.id);
  if (!(await setCheckoutSessionPromo(row.id, null))) throw new Error("PROMO_LOCKED");
}

/** The hold is this customer's, unused, in time, and has no receipt yet. */
async function assertEditableSession(sessionId: string, userId: string) {
  const row = await findCheckoutSession(sessionId);
  if (!row || row.userId !== userId || row.usedAt) throw new Error("SESSION_INVALID");
  if (row.receiptLockedAt) throw new Error("PROMO_LOCKED");
  if (row.expiresAt.getTime() + EXPIRY_GRACE_MS < Date.now()) {
    throw new Error("SESSION_EXPIRED");
  }
  return row;
}

function promoView(
  promo: PromoCode | null,
  subtotalMinor: Minor,
): CheckoutSessionView["promo"] {
  if (!promo) return null;
  return {
    code: promo.code,
    percentOff: promo.percentOff,
    discountMinor: promoDiscount(subtotalMinor, promo.percentOff),
  };
}

/**
 * The receipt is in - hold the price for 15 more minutes to place the order.
 * Refused if the 5 minutes already ran out: the customer uploads again at the
 * new price rather than locking in an old one late.
 */
export async function lockCheckoutSession(sessionId: string): Promise<void> {
  const user = await requireUser();
  const row = await findCheckoutSession(sessionId);

  if (!row || row.userId !== user.id || row.usedAt) throw new Error("SESSION_INVALID");
  if (row.receiptLockedAt) return; // already locked - uploading again changes nothing
  if (row.expiresAt.getTime() + EXPIRY_GRACE_MS < Date.now()) {
    throw new Error("SESSION_EXPIRED");
  }

  const liveCart = await getCartView();
  if (cartSignature(liveCart) !== row.cartSignature) throw new Error("CART_CHANGED");

  await lockCheckoutSessionRow(row.id, new Date(Date.now() + ORDER_WINDOW_MS));
}

/**
 * placeOrder's gate. Returns the held rate to price the order at, and the
 * promo the hold carries, or throws.
 */
export async function assertUsableSession(
  sessionId: string,
  userId: string,
): Promise<{ rateMinor: Minor; promo: PromoCode | null }> {
  const row = await findCheckoutSession(sessionId);

  if (!row || row.userId !== userId || row.usedAt) throw new Error("SESSION_INVALID");
  if (row.expiresAt.getTime() + EXPIRY_GRACE_MS < Date.now()) {
    throw new Error("SESSION_EXPIRED");
  }
  // The receipt is what earned the order window - no receipt, no order.
  if (!row.receiptLockedAt) throw new Error("PROOF_REQUIRED");

  const liveCart = await getCartView();
  if (cartSignature(liveCart) !== row.cartSignature) throw new Error("CART_CHANGED");

  return { rateMinor: row.rateMinor as Minor, promo: row.promoCode };
}