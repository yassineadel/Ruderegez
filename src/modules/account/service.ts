import { requireUser } from "@/lib/auth-guards";
import { hashPassword, verifyPassword } from "@/lib/password";
import { findOrdersForUser } from "@/modules/orders/repository";
import { updateProfile, updatePassword } from "./repository";

export async function getMyOrders() {
  const user = await requireUser();
  return findOrdersForUser(user.id);
}

export async function getMyProfile() {
  const user = await requireUser();
  return {
    name: user.name ?? "",
    email: user.email,
    phone: user.phone ?? "",
    addressLine: user.addressLine ?? "",
    addressNotes: user.addressNotes ?? "",
    hasPassword: user.passwordHash !== null,
  };
}

export async function saveProfile(input: {
  name: string;
  phone: string;
  addressLine: string;
  addressNotes: string;
}) {
  const user = await requireUser();

  const name = input.name.trim();
  if (name.length < 2) throw new Error("NAME_REQUIRED");

  const phone = input.phone.replace(/[\s-]/g, "");
  if (phone && !/^01[0125]\d{8}$/.test(phone)) {
    throw new Error("INVALID_PHONE");
  }

  await updateProfile(user.id, {
    name,
    phone: phone || null,
    addressLine: input.addressLine.trim() || null,
    addressNotes: input.addressNotes.trim() || null,
  });
}

/**
 * Requires the CURRENT password even though the person is already signed in.
 *
 * A session can be left open on a shared machine. Without this check, whoever
 * finds that machine can lock the real owner out in two clicks.
 */
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const user = await requireUser();

  if (!user.passwordHash) throw new Error("NO_PASSWORD_SET");

  const ok = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!ok) throw new Error("WRONG_PASSWORD");

  if (input.newPassword.length < 8) throw new Error("PASSWORD_TOO_SHORT");

  await updatePassword(user.id, await hashPassword(input.newPassword));
}