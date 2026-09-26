import { prisma } from "@/lib/db";
import { findInviteByEmail, claimInvite } from "./repository";

// Kept apart from service.ts on purpose: auth.ts imports this, and service.ts
// imports the auth guards, which import auth.ts. Separate files keep that
// from becoming a circular import.

/**
 * Called on every sign-in. If an owner invited this email, the person
 * becomes staff now.
 *
 * Only for a VERIFIED email - otherwise anyone could sign up with an invited
 * address they don't own and walk into the admin panel. Credentials sign-in
 * already refuses unverified users; Google sign-ins come verified.
 *
 * Never throws: a failed claim must not block the sign-in itself. They can
 * sign in again, or the owner can grant access directly.
 */
export async function claimStaffInviteOnSignIn(userId: string | undefined) {
  if (!userId) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.emailVerified || user.isBlocked) return;
    // Owners and existing staff are managed from the Staff page, not invites.
    if (user.role !== "CUSTOMER") return;

    const invite = await findInviteByEmail(user.email.toLowerCase());
    if (!invite) return;

    await claimInvite({
      userId: user.id,
      inviteId: invite.id,
      permissions: invite.permissions,
      email: user.email,
    });
  } catch (err) {
    console.error("[claimStaffInviteOnSignIn]", err);
  }
}