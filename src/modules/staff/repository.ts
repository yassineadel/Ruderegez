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

// ============================================================================
//  STAFF PAGE
// ============================================================================

const TEAM_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  permissions: true,
  isBlocked: true,
  createdAt: true,
} as const;

/** Everyone with admin-panel access - owners first. */
export function findTeam() {
  return prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    select: TEAM_SELECT,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export function findInvites() {
  return prisma.staffInvite.findMany({ orderBy: { createdAt: "desc" } });
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: TEAM_SELECT });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: TEAM_SELECT });
}

export function countOwners(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN", isBlocked: false } });
}

/**
 * Every change to someone's access is written together with its audit row.
 * "Who gave this person access to payments, and when?" always has an answer.
 */
export function setAccess(data: {
  userId: string;
  role: "CUSTOMER" | "STAFF" | "ADMIN";
  permissions: AdminPermission[];
  actorUserId: string;
  action: string;
  before: { role: string; permissions: AdminPermission[] };
}) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: data.userId },
      data: { role: data.role, permissions: data.permissions },
    }),
    prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: "User",
        entityId: data.userId,
        actorUserId: data.actorUserId,
        beforeJson: data.before,
        afterJson: { role: data.role, permissions: data.permissions },
      },
    }),
  ]);
}

export function upsertInvite(data: {
  email: string;
  permissions: AdminPermission[];
  actorUserId: string;
}) {
  return prisma.$transaction([
    prisma.staffInvite.upsert({
      where: { email: data.email },
      update: { permissions: data.permissions, invitedByUserId: data.actorUserId },
      create: {
        email: data.email,
        permissions: data.permissions,
        invitedByUserId: data.actorUserId,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "STAFF_INVITED",
        entityType: "StaffInvite",
        entityId: data.email,
        actorUserId: data.actorUserId,
        afterJson: { email: data.email, permissions: data.permissions },
      },
    }),
  ]);
}

export function deleteInvite(id: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.staffInvite.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        action: "STAFF_INVITE_CANCELLED",
        entityType: "StaffInvite",
        entityId: invite.email,
        actorUserId,
        beforeJson: { email: invite.email, permissions: invite.permissions },
      },
    });
  });
}