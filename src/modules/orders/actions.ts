"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@/generated/prisma/client";
import { placeOrder, submitPaymentProof } from "./service";
import {
  lockCheckoutSession,
  applyPromoToCheckout,
  removePromoFromCheckout,
} from "./checkout-session";
import { toOrderMessage, type Result } from "./errors";

export async function placeOrderAction(input: {
  customerName: string;
  customerPhone: string;
  addressLine: string;
  deliveryZoneId?: string;
  addressNotes?: string;
  paymentMethod: PaymentMethod;
  checkoutSessionId: string;
  paymentScreenshotUrl: string;
  paymentReferenceNumber?: string;
}): Promise<Result<{ reference: string }>> {
  try {
    const order = await placeOrder(input);
    revalidatePath("/cart");
    revalidatePath("/admin/orders");
    revalidatePath("/", "layout");
    return { ok: true, data: { reference: order.reference } };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[placeOrderAction]", err);
    return { ok: false, error: toOrderMessage(code) };
  }
}

export async function submitPaymentProofAction(input: {
  reference: string;
  screenshotUrl: string;
  referenceNumber?: string;
}): Promise<Result> {
  try {
    await submitPaymentProof(input);
    revalidatePath(`/orders/${input.reference}`);
    revalidatePath("/account");
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[submitPaymentProofAction]", err);
    return { ok: false, error: toOrderMessage(code) };
  }
}

/** Receipt uploaded - extend the price hold so they can place the order. */
export async function lockCheckoutSessionAction(sessionId: string): Promise<Result> {
  try {
    await lockCheckoutSession(sessionId);
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[lockCheckoutSessionAction]", err);
    return { ok: false, error: toOrderMessage(code) };
  }
}
/** Checkout: apply a promo code to the price hold. */
export async function applyPromoAction(input: {
  sessionId: string;
  code: string;
}): Promise<Result> {
  try {
    await applyPromoToCheckout(input.sessionId, input.code);
    revalidatePath("/checkout");
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[applyPromoAction]", err);
    return { ok: false, error: toOrderMessage(code) };
  }
}

/** Checkout: take the promo code off the price hold. */
export async function removePromoAction(sessionId: string): Promise<Result> {
  try {
    await removePromoFromCheckout(sessionId);
    revalidatePath("/checkout");
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[removePromoAction]", err);
    return { ok: false, error: toOrderMessage(code) };
  }
}
