import { prisma } from "@/lib/db";
import type { Setting, Prisma } from "@/generated/prisma/client";

// ---------- reads ----------

export function findAllSettings(): Promise<Setting[]> {
  return prisma.setting.findMany();
}

export function findSettingsByKeys(keys: string[]): Promise<Setting[]> {
  return prisma.setting.findMany({
    where: { key: { in: keys } },
  });
}

// ---------- write ----------

export function applySettingChanges(
  changes: { key: string; value: string }[],
  audit: {
    actorUserId: string;
    beforeJson: Prisma.InputJsonValue;
    afterJson: Prisma.InputJsonValue;
  },
): Promise<unknown[]> {
  return prisma.$transaction([
    ...changes.map((c) =>
      prisma.setting.upsert({
        where: { key: c.key },
        update: { value: c.value, updatedByUserId: audit.actorUserId },
        create: {
          key: c.key,
          value: c.value,
          updatedByUserId: audit.actorUserId,
        },
      }),
    ),
    prisma.auditLog.create({
      data: {
        action: "SETTINGS_UPDATED",
        entityType: "Setting",
        actorUserId: audit.actorUserId,
        beforeJson: audit.beforeJson,
        afterJson: audit.afterJson,
      },
    }),
  ]);
}