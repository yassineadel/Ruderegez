import { prisma } from "@/lib/db";
import type { AdminPermission } from "@/generated/prisma/client";

export function findInviteByEmail(email: string) {
  return prisma.staffInvite.findUnique({ where: { email } });
}

/**
 * Turns an invite into access, together or not at all: the user becomes
 * STAFF with the invited sections, the invite is deleted, and it is logged.
 */
export function claimInvite(data: {
  userId: string;
  inviteId: string;
  permissions: AdminPermission[];
  email: string;
}) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: data.userId },
      data: {
        role: "STAFF",
        permissions: data.permissions,
      },
    }),
    prisma.staffInvite.delete({ where: { id: data.inviteId } }),
    prisma.auditLog.create({
      data: {
        action: "STAFF_INVITE_CLAIMED",
        entityType: "User",
        entityId: data.userId,
        actorUserId: data.userId,
        afterJson: { email: data.email, permissions: data.permissions },
      },
    }),
  ]);
}