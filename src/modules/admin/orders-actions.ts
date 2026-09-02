"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/generated/prisma/client";
import { changeStatus, confirmPayment } from "./orders-service";
import { type Result } from "./errors";

const MESSAGES: Record<string, string> = {
  ORDER_NOT_FOUND: "That order no longer exists.",
  INVALID_TRANSITION: "That status change isn't allowed from where the order is now.",
  REASON_REQUIRED: "Please give a reason for cancelling.",
  INVALID_AMOUNT: "Please enter the amount received.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
};

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!MESSAGES[code]) console.error("[admin orders]", err);
  return { ok: false, error: MESSAGES[code] ?? "Something went wrong. Please try again." };
}

export async function changeStatusAction(input: {
  reference: string;
  toStatus: OrderStatus;
  note?: string;
}): Promise<Result> {
  try {
    await changeStatus(input);
    revalidatePath(`/admin/orders/${input.reference}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function confirmPaymentAction(input: {
  reference: string;
  amountMinor: number;
  referenceNumber?: string;
}): Promise<Result> {
  try {
    await confirmPayment(input);
    revalidatePath(`/admin/orders/${input.reference}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}