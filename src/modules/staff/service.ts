import { requireOwner } from "@/lib/auth-guards";
import { isPermission } from "@/lib/permissions";
import type { AdminPermission } from "@/generated/prisma/client";
import {
  findTeam,
  findInvites,
  findUserByEmail,
  findUserById,
  countOwners,
  setAccess,
  upsertInvite,
  deleteInvite,
} from "./repository";

// ============================================================================
//  STAFF PAGE  -  owners only
// ============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only real, known sections - never trust the list the browser sends. */
function cleanPermissions(input: string[]): AdminPermission[] {
  const unique = [...new Set(input)];
  if (!unique.every(isPermission)) throw new Error("INVALID_PERMISSION");
  if (unique.length === 0) throw new Error("NO_PERMISSIONS");
  return unique as AdminPermission[];
}

export async function getTeam() {
  await requireOwner();
  const [team, invites] = await Promise.all([findTeam(), findInvites()]);
  return { team, invites };
}

/**
 * The owner types an email and ticks sections.
 *   - account exists  -> it becomes staff (or its sections are updated) now
 *   - no account yet  -> an invite, claimed when they sign in with this email
 */
export async function addStaffByEmail(
  rawEmail: string,
  rawPermissions: string[],
): Promise<{ result: "GRANTED" | "UPDATED" | "INVITED" }> {
  const owner = await requireOwner();

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error("INVALID_EMAIL");
  const permissions = cleanPermissions(rawPermissions);

  const user = await findUserByEmail(email);

  if (!user) {
    await upsertInvite({ email, permissions, actorUserId: owner.id });
    return { result: "INVITED" };
  }

  if (user.role === "ADMIN") throw new Error("ALREADY_OWNER");
  if (user.isBlocked) throw new Error("USER_BLOCKED");

  await setAccess({
    userId: user.id,
    role: "STAFF",
    permissions,
    actorUserId: owner.id,
    action: user.role === "STAFF" ? "STAFF_PERMISSIONS_CHANGED" : "STAFF_ADDED",
    before: { role: user.role, permissions: user.permissions },
  });
  return { result: user.role === "STAFF" ? "UPDATED" : "GRANTED" };
}

export async function updateStaffPermissions(userId: string, rawPermissions: string[]) {
  const owner = await requireOwner();
  const user = await findUserById(userId);
  if (!user || user.role !== "STAFF") throw new Error("STAFF_NOT_FOUND");

  await setAccess({
    userId,
    role: "STAFF",
    permissions: cleanPermissions(rawPermissions),
    actorUserId: owner.id,
    action: "STAFF_PERMISSIONS_CHANGED",
    before: { role: user.role, permissions: user.permissions },
  });
}

/** Back to an ordinary customer account. Their orders and history stay. */
export async function removeStaff(userId: string) {
  const owner = await requireOwner();
  const user = await findUserById(userId);
  if (!user || user.role !== "STAFF") throw new Error("STAFF_NOT_FOUND");

  await setAccess({
    userId,
    role: "CUSTOMER",
    permissions: [],
    actorUserId: owner.id,
    action: "STAFF_REMOVED",
    before: { role: user.role, permissions: user.permissions },
  });
}

/** Staff -> owner. Full access, including this page. */
export async function makeOwner(userId: string) {
  const owner = await requireOwner();
  const user = await findUserById(userId);
  if (!user || user.role !== "STAFF") throw new Error("STAFF_NOT_FOUND");
  if (user.isBlocked) throw new Error("USER_BLOCKED");

  await setAccess({
    userId,
    role: "ADMIN",
    permissions: [],
    actorUserId: owner.id,
    action: "OWNER_ADDED",
    before: { role: user.role, permissions: user.permissions },
  });
}

/**
 * Owner -> customer. Refused if it would leave the store with no owner -
 * nobody could then manage staff, and nobody could fix that from the site.
 */
export async function removeOwner(userId: string) {
  const owner = await requireOwner();
  const user = await findUserById(userId);
  if (!user || user.role !== "ADMIN") throw new Error("OWNER_NOT_FOUND");

  if ((await countOwners()) <= 1) throw new Error("LAST_OWNER");

  await setAccess({
    userId,
    role: "CUSTOMER",
    permissions: [],
    actorUserId: owner.id,
    action: "OWNER_REMOVED",
    before: { role: user.role, permissions: user.permissions },
  });
}

export async function cancelInvite(inviteId: string) {
  const owner = await requireOwner();
  await deleteInvite(inviteId, owner.id);
}