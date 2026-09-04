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
 * Creates the order, its item snapshots, the opening status event, and empties
 * the cart - as ONE unit.
 *
 * A cart emptied without an order created is a customer who has paid for
 * nothing. A transaction makes that state impossible.
 */
export function createOrderTransaction(data: {
  order: Prisma.OrderCreateInput;
  items: Omit<Prisma.OrderItemCreateManyInput, "orderId">[];
  cartId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: data.order });

    await tx.orderItem.createMany({
      data: data.items.map((i) => ({ ...i, orderId: order.id })),
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: "PLACED",
        note: "Order placed by customer.",
      },
    });

    await tx.cartItem.deleteMany({ where: { cartId: data.cartId } });

    return order;
  });
}