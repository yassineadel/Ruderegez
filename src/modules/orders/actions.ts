"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@/generated/prisma/client";
import { placeOrder } from "./service";
import { toOrderMessage, type Result } from "./errors";

export async function placeOrderAction(input: {
  customerName: string;
  customerPhone: string;
  addressLine: string;
  addressCity: string;
  addressNotes?: string;
  paymentMethod: PaymentMethod;
  expectedTotalMinor: number;
}): Promise<Result<{ reference: string }>> {
  try {
    const order = await placeOrder(input);
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return { ok: true, data: { reference: order.reference } };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[placeOrderAction]", err);
    return { ok: false, error: toOrderMessage(code) };
  }
}