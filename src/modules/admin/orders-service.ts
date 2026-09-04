import { requireAdmin } from "@/lib/auth-guards";
import type { OrderStatus } from "@/generated/prisma/client";
import {
  findOrders,
  countOrders,
  countByStatus,
  findOrderDetail,
  applyStatusChange,
  recordPayment,
} from "./orders-repository";

/**
 * Which statuses may follow which.
 *
 * OrderStatusEvent is append-only - a wrong transition cannot be tidied up
 * afterwards, only followed by another event explaining it. So the rules are
 * enforced BEFORE the write, not corrected after.
 *
 * CANCELLED and DELIVERED are terminal: nothing follows them.
 */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["PAYMENT_UNDER_REVIEW", "CONFIRMED", "CANCELLED"],
  PAYMENT_UNDER_REVIEW: ["CONFIRMED", "PLACED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function allowedNext(status: OrderStatus): OrderStatus[] {
  return ALLOWED[status];
}

export async function listOrders(filters: {
  status?: OrderStatus;
  search?: string;
  skip?: number;
  take?: number;
}) {
  await requireAdmin();
  const [orders, total, counts] = await Promise.all([
    findOrders(filters),
    countOrders(filters),
    countByStatus(),
  ]);
  return { orders, total, counts };
}

export async function getOrder(reference: string) {
  await requireAdmin();
  return findOrderDetail(reference);
}

export async function changeStatus(input: {
  reference: string;
  toStatus: OrderStatus;
  note?: string;
}) {
  const admin = await requireAdmin();

  const order = await findOrderDetail(input.reference);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  if (!ALLOWED[order.status].includes(input.toStatus)) {
    throw new Error("INVALID_TRANSITION");
  }

  // Cancelling requires a reason - otherwise nobody can explain it later.
  if (input.toStatus === "CANCELLED" && !input.note?.trim()) {
    throw new Error("REASON_REQUIRED");
  }

  await applyStatusChange({
    orderId: order.id,
    fromStatus: order.status,
    toStatus: input.toStatus,
    actorUserId: admin.id,
    note: input.note?.trim() || undefined,
  });
}

export async function confirmPayment(input: {
  reference: string;
  amountMinor: number;
  referenceNumber?: string;
}) {
  const admin = await requireAdmin();

  const order = await findOrderDetail(input.reference);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  if (order.status !== "PLACED" && order.status !== "PAYMENT_UNDER_REVIEW") {
    throw new Error("INVALID_TRANSITION");
  }

  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("INVALID_AMOUNT");
  }

  await recordPayment({
    orderId: order.id,
    fromStatus: order.status,
    amountMinor: input.amountMinor,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    actorUserId: admin.id,
  });
}