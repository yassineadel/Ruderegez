import { prisma } from "@/lib/db";
import type { SilverRateSnapshot } from "@/generated/prisma/client";

/**
 * Internal settings the sync keeps for itself. None of these are in
 * SETTING_GROUPS, so the admin settings form can never overwrite them.
 */
export const SYNC_KEYS = {
  rate: "silverRatePerGramMinor", // the store rate every price uses
  rateUpdatedAt: "silverRateUpdatedAt",
  lastCheckAt: "silverRateLastCheckAt",
  lastCheckResult: "silverRateLastCheckResult", // UNCHANGED | APPLIED | HELD | FAILED
  lastCheckMessage: "silverRateLastCheckMessage",
  lastUsdPerOzCents: "silverUsdPerOzCents",
  egpPerUsdMilli: "egpPerUsdMilli",
  egpPerUsdFetchedAt: "egpPerUsdFetchedAt",
} as const;

export async function readSyncState(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(SYNC_KEYS) } },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function upsert(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value, updatedByUserId: null },
    create: { key, value },
  });
}

/** Every check ends here, whatever happened - so the admin can see it ran. */
export function recordCheck(values: Record<string, string>) {
  return prisma.$transaction(
    Object.entries(values).map(([key, value]) => upsert(key, value)),
  );
}

/**
 * The rate changes, its history row, and its audit entry - together or not
 * at all. NFR-08: every change to money is explainable afterwards.
 */
export function applyRate(data: {
  rateMinor: number;
  previousRateMinor: number;
  usdPerOzCents: number;
  egpPerUsdMilli: number;
  trigger: "cron" | "admin";
  actorUserId: string | null;
  checkValues: Record<string, string>;
  /** When approving a held rate, that row is marked applied instead of adding one. */
  heldSnapshotId?: string;
}) {
  const now = new Date();
  return prisma.$transaction([
    upsert(SYNC_KEYS.rate, String(data.rateMinor)),
    upsert(SYNC_KEYS.rateUpdatedAt, now.toISOString()),
    ...Object.entries(data.checkValues).map(([k, v]) => upsert(k, v)),
    data.heldSnapshotId
      ? prisma.silverRateSnapshot.update({
          where: { id: data.heldSnapshotId },
          data: {
            status: "APPLIED",
            resolvedByUserId: data.actorUserId,
            resolvedAt: now,
          },
        })
      : prisma.silverRateSnapshot.create({
          data: {
            status: "APPLIED",
            rateMinor: data.rateMinor,
            previousRateMinor: data.previousRateMinor,
            usdPerOzCents: data.usdPerOzCents,
            egpPerUsdMilli: data.egpPerUsdMilli,
            trigger: data.trigger,
          },
        }),
    prisma.auditLog.create({
      data: {
        action: data.heldSnapshotId
          ? "SILVER_RATE_HELD_APPROVED"
          : "SILVER_RATE_AUTO_UPDATED",
        entityType: "Setting",
        entityId: SYNC_KEYS.rate,
        // Null actor = the system did it. An approval carries the admin.
        actorUserId: data.actorUserId,
        beforeJson: { [SYNC_KEYS.rate]: data.previousRateMinor },
        afterJson: {
          [SYNC_KEYS.rate]: data.rateMinor,
          usdPerOzCents: data.usdPerOzCents,
          egpPerUsdMilli: data.egpPerUsdMilli,
          trigger: data.trigger,
        },
      },
    }),
  ]);
}

export function createHeldSnapshot(data: {
  rateMinor: number;
  previousRateMinor: number;
  usdPerOzCents: number;
  egpPerUsdMilli: number;
  trigger: "cron" | "admin";
}) {
  return prisma.silverRateSnapshot.create({ data: { ...data, status: "HELD" } });
}

/** The most recent held rate still waiting for the admin, if any. */
export function findOpenHeld(): Promise<SilverRateSnapshot | null> {
  return prisma.silverRateSnapshot.findFirst({
    where: { status: "HELD", resolvedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export function findSnapshot(id: string): Promise<SilverRateSnapshot | null> {
  return prisma.silverRateSnapshot.findUnique({ where: { id } });
}

/**
 * A newer held rate replaces an older one - the admin only ever decides on
 * the latest number, not a queue of stale ones.
 */
export function dismissOpenHeld(actorUserId: string | null, exceptId?: string) {
  return prisma.silverRateSnapshot.updateMany({
    where: {
      status: "HELD",
      resolvedAt: null,
      ...(exceptId && { id: { not: exceptId } }),
    },
    data: { status: "DISMISSED", resolvedByUserId: actorUserId, resolvedAt: new Date() },
  });
}

export function findRecentSnapshots(take = 20): Promise<SilverRateSnapshot[]> {
  return prisma.silverRateSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
}