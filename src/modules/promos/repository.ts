import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type AdminPromo = Prisma.PromoCodeGetPayload<{
  include: { _count: { select: { redemptions: true } } };
}>;

export function findPromos(): Promise<AdminPromo[]> {
  return prisma.promoCode.findMany({
    include: { _count: { select: { redemptions: true } } },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
}

export function findPromoById(id: string) {
  return prisma.promoCode.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });
}

export function findPromoByCode(code: string) {
  return prisma.promoCode.findUnique({ where: { code } });
}

/**
 * Checkouts still holding this code (unused, not expired). Their customers
 * may have transferred the discounted amount already.
 */
export function countOpenHoldsWithPromo(promoCodeId: string) {
  return prisma.checkoutSession.count({
    where: { promoCodeId, usedAt: null, expiresAt: { gt: new Date() } },
  });
}

/** Orders this customer has already placed with this code. */
export function countCustomerRedemptions(promoCodeId: string, userId: string) {
  return prisma.promoRedemption.count({ where: { promoCodeId, userId } });
}

/** Create + audit together - a money-affecting admin action is always logged. */
export function createPromoRow(data: {
  code: string;
  percentOff: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  minSubtotalMinor: number | null;
  actorUserId: string;
}) {
  const { actorUserId, ...fields } = data;
  return prisma.$transaction(async (tx) => {
    const promo = await tx.promoCode.create({
      data: { ...fields, createdByUserId: actorUserId },
    });
    await tx.auditLog.create({
      data: {
        action: "PROMO_CREATED",
        entityType: "PromoCode",
        entityId: promo.id,
        actorUserId,
        afterJson: {
          ...fields,
          startsAt: fields.startsAt?.toISOString() ?? null,
          expiresAt: fields.expiresAt?.toISOString() ?? null,
        },
      },
    });
    return promo;
  });
}

export function setPromoActiveRow(data: {
  id: string;
  isActive: boolean;
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.promoCode.update({
      where: { id: data.id },
      data: { isActive: data.isActive },
    }),
    prisma.auditLog.create({
      data: {
        action: data.isActive ? "PROMO_ENABLED" : "PROMO_DISABLED",
        entityType: "PromoCode",
        entityId: data.id,
        actorUserId: data.actorUserId,
        beforeJson: { isActive: !data.isActive },
        afterJson: { isActive: data.isActive },
      },
    }),
  ]);
}

/**
 * Only for a code no order has used - the Restrict foreign key on
 * PromoRedemption refuses anything else even if the service check is missed.
 * Checkouts that had it applied simply lose it (SetNull).
 */
export function deletePromoRow(data: {
  id: string;
  code: string;
  percentOff: number;
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.promoCode.delete({ where: { id: data.id } }),
    prisma.auditLog.create({
      data: {
        action: "PROMO_DELETED",
        entityType: "PromoCode",
        entityId: data.id,
        actorUserId: data.actorUserId,
        beforeJson: { code: data.code, percentOff: data.percentOff },
      },
    }),
  ]);
}
