import type { Minor } from "@/lib/money";
import { requireUser } from "@/lib/auth-guards";
import { getPricingSettings } from "@/lib/settings";
import { getCartView, cartSignature, type CartView } from "@/modules/cart/service";
import {
  findCheckoutSession,
  findReusableCheckoutSession,
  replaceCheckoutSession,
  lockCheckoutSessionRow,
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
} | null> {
  const user = await requireUser();

  // The signature only depends on lines and quantities, so the live view is
  // fine for computing it.
  const liveCart = await getCartView();
  if (liveCart.lines.length === 0) return null;
  const signature = cartSignature(liveCart);

  let row = await findReusableCheckoutSession(user.id, signature);

  if (!row) {
    const settings = await getPricingSettings();
    row = await replaceCheckoutSession({
      userId: user.id,
      rateMinor: settings.silverRatePerGram,
      cartSignature: signature,
      expiresAt: new Date(Date.now() + UPLOAD_WINDOW_MS),
    });
  }

  const cart = await getCartView({ silverRateOverride: row.rateMinor as Minor });

  return {
    session: {
      id: row.id,
      rateMinor: row.rateMinor as Minor,
      expiresAt: row.expiresAt.toISOString(),
      locked: row.receiptLockedAt !== null,
    },
    cart,
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
 * placeOrder's gate. Returns the held rate to price the order at, or throws.
 */
export async function assertUsableSession(
  sessionId: string,
  userId: string,
): Promise<{ rateMinor: Minor }> {
  const row = await findCheckoutSession(sessionId);

  if (!row || row.userId !== userId || row.usedAt) throw new Error("SESSION_INVALID");
  if (row.expiresAt.getTime() + EXPIRY_GRACE_MS < Date.now()) {
    throw new Error("SESSION_EXPIRED");
  }
  // The receipt is what earned the order window - no receipt, no order.
  if (!row.receiptLockedAt) throw new Error("PROOF_REQUIRED");

  const liveCart = await getCartView();
  if (cartSignature(liveCart) !== row.cartSignature) throw new Error("CART_CHANGED");

  return { rateMinor: row.rateMinor as Minor };
}