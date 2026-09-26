import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { AdminPermission } from "@/generated/prisma/client";
import { redirect } from "next/navigation";

// ============================================================================
//  WHO MAY DO WHAT
// ============================================================================
//  Every check reads the user from the DATABASE, not from the session
//  cookie. The cookie still says whatever role they had when they signed in;
//  the database says what they have now. So removing someone's access takes
//  effect on their very next click, not at their next login.
// ============================================================================

export async function requireUser() {
  // 1. Get the current session
  const session = await auth();
  // 2. If there is no session, or no user in it -> throw "UNAUTHORIZED"
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  // 3. Look up that user in the database by their id
  const found = await prisma.user.findUnique({ where: { id: session.user.id } });
  // 4. If not found, or they are blocked -> throw "BLOCKED"
  if (!found || found.isBlocked) {
    throw new Error("BLOCKED");
  }
  // 5. Return the user
  return found;
}

/** Owners - full access. Stored as role ADMIN, shown as "Owner". */
export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

/**
 * Kept so nothing breaks while the checks are being moved over. It means
 * OWNER ONLY - so any call site not yet switched to requirePermission is
 * locked to owners, never accidentally opened to staff.
 */
export const requireAdmin = requireOwner;

/** Anyone allowed into the admin panel at all - an owner, or staff. */
export async function requireStaff() {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  if (user.role === "STAFF" && user.permissions.length > 0) return user;
  throw new Error("FORBIDDEN");
}

/** One section. Owners always pass; staff only if it was granted to them. */
export async function requirePermission(permission: AdminPermission) {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  if (user.role === "STAFF" && user.permissions.includes(permission)) return user;
  throw new Error("FORBIDDEN");
}

/** Passes if the user has ANY of these - e.g. an order page for ORDERS or PAYMENTS. */
export async function requireAnyPermission(permissions: AdminPermission[]) {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  if (user.role === "STAFF" && permissions.some((p) => user.permissions.includes(p))) {
    return user;
  }
  throw new Error("FORBIDDEN");
}

/**
 * For deciding what to SHOW (menu items, dashboard blocks, buttons).
 * Never use this instead of a require* check - hiding a button is not
 * protecting the action behind it.
 */
export function can(
  user: { role: string; permissions: AdminPermission[] },
  permission: AdminPermission,
): boolean {
  return user.role === "ADMIN" || (user.role === "STAFF" && user.permissions.includes(permission));
}


/**
 * For admin PAGES. Same rule as requirePermission, but instead of throwing
 * it sends the person to the dashboard with a "no access" notice - a thrown
 * error would show a generic error page instead.
 *
 * Pages use this; services and actions keep using requirePermission. Both
 * matter: the page check is for a clean screen, the service check is the
 * one that actually protects the data.
 */
export async function requirePagePermission(
  permission: AdminPermission | AdminPermission[],
) {
  const list = Array.isArray(permission) ? permission : [permission];
  try {
    return await requireAnyPermission(list);
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "UNAUTHORIZED") redirect("/sign-in?next=/admin");
    redirect("/admin?denied=1");
  }
}

/** For showing the "Admin" link in the store header. Never throws. */
export async function hasAdminAccess(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true, isBlocked: true },
  });
  if (!user || user.isBlocked) return false;
  return user.role === "ADMIN" || (user.role === "STAFF" && user.permissions.length > 0);
}

/**
 * Non-throwing check by id, for customer pages that staff may also open
 * (an order, a custom request). Reads the database, like every check here.
 */
export async function userHasAnyPermission(
  userId: string | undefined,
  permissions: AdminPermission[],
): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true, isBlocked: true },
  });
  if (!user || user.isBlocked) return false;
  return permissions.some((p) => can(user, p));
}