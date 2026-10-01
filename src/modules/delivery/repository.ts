import { prisma } from "@/lib/db";

const ORDER = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

export function findActiveZones() {
  return prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: ORDER });
}

export function findAllZones() {
  return prisma.deliveryZone.findMany({ orderBy: [{ isActive: "desc" }, ...ORDER] });
}

export function findZoneById(id: string) {
  return prisma.deliveryZone.findUnique({ where: { id } });
}

export function findZoneByName(name: string) {
  // Case-insensitive, so "giza" can't sit next to "Giza".
  return prisma.deliveryZone.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
}

export async function nextSortOrder(): Promise<number> {
  const last = await prisma.deliveryZone.aggregate({ _max: { sortOrder: true } });
  return (last._max.sortOrder ?? -1) + 1;
}

// Every write is logged: a delivery fee is money the customer pays.

export function createZoneRow(data: {
  name: string;
  feeMinor: number;
  sortOrder: number;
  actorUserId: string;
}) {
  const { actorUserId, ...fields } = data;
  return prisma.$transaction(async (tx) => {
    const zone = await tx.deliveryZone.create({ data: fields });
    await tx.auditLog.create({
      data: {
        action: "DELIVERY_ZONE_CREATED",
        entityType: "DeliveryZone",
        entityId: zone.id,
        actorUserId,
        afterJson: { name: zone.name, feeMinor: zone.feeMinor },
      },
    });
    return zone;
  });
}

export function updateZoneRow(data: {
  id: string;
  before: { name: string; feeMinor: number; isActive: boolean };
  after: { name: string; feeMinor: number; isActive: boolean };
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.deliveryZone.update({ where: { id: data.id }, data: data.after }),
    prisma.auditLog.create({
      data: {
        action: "DELIVERY_ZONE_UPDATED",
        entityType: "DeliveryZone",
        entityId: data.id,
        actorUserId: data.actorUserId,
        beforeJson: data.before,
        afterJson: data.after,
      },
    }),
  ]);
}

export function deleteZoneRow(data: {
  id: string;
  before: { name: string; feeMinor: number };
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.deliveryZone.delete({ where: { id: data.id } }),
    prisma.auditLog.create({
      data: {
        action: "DELIVERY_ZONE_DELETED",
        entityType: "DeliveryZone",
        entityId: data.id,
        actorUserId: data.actorUserId,
        beforeJson: data.before,
      },
    }),
  ]);
}

/** Saves the list order: each area's sortOrder becomes its position. */
export function setZoneOrder(ids: string[]) {
  return prisma.$transaction(
    ids.map((id, i) =>
      prisma.deliveryZone.update({ where: { id }, data: { sortOrder: i } }),
    ),
  );
}
