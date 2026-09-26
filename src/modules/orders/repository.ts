import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true; statusEvents: true; paymentProofs: true };
}>;

export function findOrderByReference(
  reference: string,
): Promise<OrderWithItems | null> {
  return prisma.order.findUnique({
    where: { reference },
    include: {
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      paymentProofs: { orderBy: { createdAt: "desc" } },
    },
  });
}

export function findOrdersForUser(userId: string): Promise<OrderWithItems[]> {
  return prisma.order.findMany({
    where: { userId },
    include: {
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      paymentProofs: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function referenceExists(reference: string): Promise<boolean> {
  return prisma.order
    .findUnique({ where: { reference }, select: { id: true } })
    .then((r) => r !== null);
}

/**
 * Creates the order, its item snapshots, its payment receipt, the status
 * history, and empties the cart - as ONE unit.
 *
 * A cart emptied without an order created is a customer who has paid for
 * nothing. A transaction makes that state impossible. The receipt is part of
 * the same unit because the customer has already transferred the money: an
 * order without its receipt would look unpaid.
 */
export function createOrderTransaction(data: {
  order: Prisma.OrderCreateInput;
  items: Omit<Prisma.OrderItemCreateManyInput, "orderId">[];
  cartId: string;
  proof: { screenshotUrl: string; amountMinor: number; referenceNumber?: string };
  checkoutSessionId: string;
}) {
  return prisma.$transaction(async (tx) => {
    // Claim the price hold FIRST. Only one request can flip usedAt from null,
    // so a double-click or a second tab can't place two orders from one hold.
    const claimed = await tx.checkoutSession.updateMany({
      where: { id: data.checkoutSessionId, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw new Error("SESSION_INVALID");

    const order = await tx.order.create({ data: data.order });
    await tx.paymentProof.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        screenshotUrl: data.proof.screenshotUrl,
        amountMinor: data.proof.amountMinor,
        referenceNumber: data.proof.referenceNumber,
      },
    });

    // Two events, so the timeline still reads "placed, then receipt in" -
    // the same history an order paid afterwards would have. The 1ms gap keeps
    // them in that order when sorted by createdAt.
    const now = new Date();
    await tx.orderStatusEvent.createMany({
      data: [
        {
          orderId: order.id,
          fromStatus: null,
          toStatus: "PLACED",
          note: "Order placed by customer.",
          createdAt: now,
        },
        {
          orderId: order.id,
          fromStatus: "PLACED",
          toStatus: "PAYMENT_UNDER_REVIEW",
          note: "Payment receipt uploaded at checkout.",
          createdAt: new Date(now.getTime() + 1),
        },
      ],
    });

    await tx.cartItem.deleteMany({ where: { cartId: data.cartId } });

    return order;
  });
}

export function createPaymentProof(data: {
  orderId: string;
  screenshotUrl: string;
  amountMinor: number;
  referenceNumber?: string;
}) {
  return prisma.$transaction([
    prisma.paymentProof.create({
      data: {
        orderId: data.orderId,
        status: "PENDING",
        screenshotUrl: data.screenshotUrl,
        amountMinor: data.amountMinor,
        referenceNumber: data.referenceNumber,
      },
    }),
    prisma.order.update({
      where: { id: data.orderId },
      data: { status: "PAYMENT_UNDER_REVIEW" },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: data.orderId,
        fromStatus: "PLACED",
        toStatus: "PAYMENT_UNDER_REVIEW",
        note: "Customer uploaded payment proof.",
      },
    }),
  ]);
}


// ============================================================================
//  CHECKOUT SESSIONS  (price hold)
// ============================================================================

export function findCheckoutSession(id: string) {
  return prisma.checkoutSession.findUnique({ where: { id } });
}

/** A still-valid hold for this exact bag - so a page refresh keeps the timer. */
export function findReusableCheckoutSession(userId: string, cartSignature: string) {
  return prisma.checkoutSession.findFirst({
    where: {
      userId,
      cartSignature,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Starts a new hold and clears this customer's old unused ones - they can
 * only ever have one checkout in progress, and old rows would just pile up.
 */
export function replaceCheckoutSession(data: {
  userId: string;
  rateMinor: number;
  cartSignature: string;
  expiresAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.checkoutSession.deleteMany({
      where: { userId: data.userId, usedAt: null },
    });
    return tx.checkoutSession.create({ data });
  });
}

export function lockCheckoutSessionRow(id: string, expiresAt: Date) {
  return prisma.checkoutSession.update({
    where: { id },
    data: { receiptLockedAt: new Date(), expiresAt },
  });
}