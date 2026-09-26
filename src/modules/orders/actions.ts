"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@/generated/prisma/client";
import { placeOrder, submitPaymentProof } from "./service";
import { lockCheckoutSession } from "./checkout-session";
import { toOrderMessage, type Result } from "./errors";

export async function placeOrderAction(input: {
  customerName: string;
  customerPhone: string;
  addressLine: string;
  addressCity: string;
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