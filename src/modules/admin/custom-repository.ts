import { prisma } from "@/lib/db";
import type { Prisma, CustomRequestStatus } from "@/generated/prisma/client";

export type AdminCustomRequest = Prisma.CustomRequestGetPayload<{
  include: { images: true; user: { select: { id: true; name: true; email: true } } };
}>;

export function findCustomRequests(status?: CustomRequestStatus) {
  return prisma.customRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export function countCustomByStatus() {
  return prisma.customRequest
    .groupBy({ by: ["status"], _count: { status: true } })
    .then((rows) =>
      Object.fromEntries(rows.map((r) => [r.status, r._count.status])),
    );
}

export function findCustomRequest(
  reference: string,
): Promise<AdminCustomRequest | null> {
  return prisma.customRequest.findUnique({
    where: { reference },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export function markUnderReview(id: string) {
  return prisma.customRequest.update({
    where: { id },
    data: { status: "UNDER_REVIEW" },
  });
}

/**
 * Writes the quote AND an audit row together.
 *
 * A quote is a price offered to a customer — NFR-08's requirement that money
 * decisions be explainable applies here as much as to the silver rate.
 */
export function saveQuote(data: {
  id: string;
  quotedWeightMg: number;
  quotedPriceMinor: number;
  quotedLeadTimeDays: number;
  quoteNote: string | null;
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.customRequest.update({
      where: { id: data.id },
      data: {
        status: "QUOTED",
        quotedWeightMg: data.quotedWeightMg,
        quotedPriceMinor: data.quotedPriceMinor,
        quotedLeadTimeDays: data.quotedLeadTimeDays,
        quoteNote: data.quoteNote,
        quotedAt: new Date(),
        quotedByUserId: data.actorUserId,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "CUSTOM_REQUEST_QUOTED",
        entityType: "CustomRequest",
        entityId: data.id,
        actorUserId: data.actorUserId,
        afterJson: {
          quotedWeightMg: data.quotedWeightMg,
          quotedPriceMinor: data.quotedPriceMinor,
          quotedLeadTimeDays: data.quotedLeadTimeDays,
        },
      },
    }),
  ]);
}

export function rejectRequest(data: {
  id: string;
  reason: string;
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.customRequest.update({
      where: { id: data.id },
      data: { status: "REJECTED", rejectionReason: data.reason },
    }),
    prisma.auditLog.create({
      data: {
        action: "CUSTOM_REQUEST_REJECTED",
        entityType: "CustomRequest",
        entityId: data.id,
        actorUserId: data.actorUserId,
        afterJson: { reason: data.reason },
      },
    }),
  ]);
}