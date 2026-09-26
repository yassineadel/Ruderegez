"use server";

import { revalidatePath } from "next/cache";
import {
  addStaffByEmail,
  updateStaffPermissions,
  removeStaff,
  makeOwner,
  removeOwner,
  cancelInvite,
} from "./service";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL: "Please enter a valid email address.",
  NO_PERMISSIONS: "Tick at least one section. To take away all access, use Remove instead.",
  INVALID_PERMISSION: "One of those sections doesn't exist. Please reload the page.",
  ALREADY_OWNER: "That person is already an owner - they have access to everything.",
  USER_BLOCKED: "That account is blocked. Unblock it before giving it access.",
  STAFF_NOT_FOUND: "That staff member no longer exists. Please reload the page.",
  OWNER_NOT_FOUND: "That owner no longer exists. Please reload the page.",
  LAST_OWNER: "The store must always have at least one owner. Make someone else an owner first.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "Only owners can manage staff.",
};

function fail(err: unknown): { ok: false; error: string } {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!MESSAGES[code]) console.error("[staff action]", err);
  return { ok: false, error: MESSAGES[code] ?? "Something went wrong. Please try again." };
}

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    revalidatePath("/admin/staff");
    return { ok: true, data };
  } catch (err) {
    return fail(err);
  }
}

export async function addStaffAction(email: string, permissions: string[]) {
  return run(() => addStaffByEmail(email, permissions));
}

export async function updateStaffAction(userId: string, permissions: string[]) {
  return run(() => updateStaffPermissions(userId, permissions));
}

export async function removeStaffAction(userId: string) {
  return run(() => removeStaff(userId));
}

export async function makeOwnerAction(userId: string) {
  return run(() => makeOwner(userId));
}

export async function removeOwnerAction(userId: string) {
  return run(() => removeOwner(userId));
}

export async function cancelInviteAction(inviteId: string) {
  return run(() => cancelInvite(inviteId));
}