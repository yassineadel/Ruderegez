import { prisma } from "@/lib/db";
import type { Prisma, OrderStatus } from "@/generated/prisma/client";

export type AdminOrderRow = Prisma.OrderGetPayload<{
  include: { items: true; user: { select: { email: true } } };
}>;

export type AdminOrderDetail = Prisma.OrderGetPayload<{
  include: {
    items: true;
    statusEvents: true;
    paymentProofs: true;
    user: { select: { id: true; name: true; email: true } };
  };
}>;

export function findOrders(filters: {
  status?: OrderStatus;
  search?: string;
  skip?: number;
  take?: number;
}): Promise<AdminOrderRow[]> {
  return prisma.order.findMany({
    where: buildWhere(filters),
    include: { items: true, user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    skip: filters.skip ?? 0,
    take: filters.take ?? 30,
  });
}

export function countOrders(filters: {
  status?: OrderStatus;
  search?: string;
}): Promise<number> {
  return prisma.order.count({ where: buildWhere(filters) });
}

export function findOrderDetail(
  reference: string,
): Promise<AdminOrderDetail | null> {
  return prisma.order.findUnique({
    where: { reference },
    include: {
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      paymentProofs: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

/** Counts per status, for the filter bar badges. */
export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count.status]));
}

/**
 * A status change is TWO writes: the order's current status, and an
 * append-only event recording who moved it and when (FR-102).
 *
 * They go together or not at all — an order whose status changed with no
 * event is a change nobody can explain.
 */
export function applyStatusChange(data: {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  actorUserId: string;
  note?: string;
}) {
  return prisma.$transaction([
    prisma.order.update({
      where: { id: data.orderId },
      data: { status: data.toStatus },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: data.orderId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        actorUserId: data.actorUserId,
        note: data.note,
      },
    }),
  ]);
}

/**
 * Recording a payment moves the order forward AND creates the proof row AND
 * writes the status event. One unit.
 */
export function recordPayment(data: {
  orderId: string;
  fromStatus: OrderStatus;
  amountMinor: number;
  referenceNumber?: string;
  screenshotUrl?: string;
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.paymentProof.create({
      data: {
        orderId: data.orderId,
        status: "CONFIRMED",
        amountMinor: data.amountMinor,
        referenceNumber: data.referenceNumber,
        screenshotUrl: data.screenshotUrl,
        reviewedByUserId: data.actorUserId,
        reviewedAt: new Date(),
      },
    }),
    prisma.order.update({
      where: { id: data.orderId },
      data: { status: "CONFIRMED" },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: data.orderId,
        fromStatus: data.fromStatus,
        toStatus: "CONFIRMED",
        actorUserId: data.actorUserId,
        note: data.referenceNumber
          ? `Payment confirmed — ref ${data.referenceNumber}`
          : "Payment confirmed",
      },
    }),
  ]);
}

function buildWhere(filters: {
  status?: OrderStatus;
  search?: string;
}): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { reference: { contains: filters.search, mode: "insensitive" } },
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { customerPhone: { contains: filters.search } },
    ];
  }
  return where;
}