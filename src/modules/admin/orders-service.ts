import { requirePermission, requireAnyPermission } from "@/lib/auth-guards";
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


/** For the order page: which of the allowed moves need PAYMENTS. */
export function paymentMoves(status: OrderStatus): OrderStatus[] {
  return ALLOWED[status].filter((to) => isPaymentDecision(status, to));
}

/**
 * Moves that are really payment decisions. Confirming an order that is
 * waiting on payment, or sending it back to "placed" (receipt rejected),
 * needs PAYMENTS - otherwise ORDERS-only staff could approve money through
 * the status buttons and skip the payment check entirely.
 */
function isPaymentDecision(from: OrderStatus, to: OrderStatus): boolean {
  const awaiting = from === "PLACED" || from === "PAYMENT_UNDER_REVIEW";
  return awaiting && (to === "CONFIRMED" || to === "PLACED" || to === "PAYMENT_UNDER_REVIEW");
}

export async function listOrders(filters: {
  status?: OrderStatus;
  search?: string;
  skip?: number;
  take?: number;
}) {
    await requireAnyPermission(["ORDERS", "PAYMENTS"]);
  const [orders, total, counts] = await Promise.all([
    findOrders(filters),
    countOrders(filters),
    countByStatus(),
  ]);
  return { orders, total, counts };
}

export async function getOrder(reference: string) {
  await requireAnyPermission(["ORDERS", "PAYMENTS"]);
  return findOrderDetail(reference);
}

export async function changeStatus(input: {
  reference: string;
  toStatus: OrderStatus;
  note?: string;
}) {
    const order = await findOrderDetail(input.reference);
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const admin = await requirePermission(
    isPaymentDecision(order.status, input.toStatus) ? "PAYMENTS" : "ORDERS",
  );
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
    const admin = await requirePermission("PAYMENTS");

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