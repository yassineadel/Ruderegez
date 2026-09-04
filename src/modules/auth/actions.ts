"use server";

import {
  signupSchema,
  verifyOtpSchema,
  requestResetSchema,
  resetPasswordSchema,
} from "./schema";
import {
  startSignup,
  verifySignup,
  requestPasswordReset,
  resetPassword,
} from "./service";

import { toUserMessage, type Result } from "./errors";

export async function signupAction(raw: unknown): Promise<Result> {
  try {
    const parsed = signupSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    await startSignup(parsed.data);
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    return { ok: false, error: toUserMessage(code) };
  }
}

export async function verifyAction(raw: unknown): Promise<Result> {
  try {
    const parsed = verifyOtpSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    await verifySignup(parsed.data);
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    return { ok: false, error: toUserMessage(code) };
  }
}

/**
 * Always returns ok:true when the email is well-formed, whether or not an
 * account exists. The page shows one message either way.
 */
export async function requestResetAction(raw: unknown): Promise<Result> {
  try {
    const parsed = requestResetSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    await requestPasswordReset(parsed.data);
    return { ok: true };
  } catch (err) {
    console.error("[requestResetAction]", err);
    // Even a genuine failure returns ok - an error here would reveal that
    // something happened for this address and not for others.
    return { ok: true };
  }
}

export async function resetPasswordAction(raw: unknown): Promise<Result> {
  try {
    const parsed = resetPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message };
    }
    await resetPassword(parsed.data);
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    return { ok: false, error: toUserMessage(code) };
  }
}