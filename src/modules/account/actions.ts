"use server";

import { revalidatePath } from "next/cache";
import { saveProfile, changePassword } from "./service";
import { toAccountMessage, type Result } from "./errors";

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  return { ok: false, error: toAccountMessage(code) };
}

export async function saveProfileAction(input: {
  name: string;
  phone: string;
  addressLine: string;
  addressNotes: string;
}): Promise<Result> {
  try {
    await saveProfile(input);
    revalidatePath("/account/profile");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<Result> {
  try {
    await changePassword(input);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}