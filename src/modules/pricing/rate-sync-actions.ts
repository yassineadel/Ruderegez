"use server";

import { revalidatePath } from "next/cache";
import {
  syncSilverRateNow,
  approveHeldRate,
  dismissHeldRate,
  type SyncResult,
} from "./rate-sync-service";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  HELD_RATE_NOT_FOUND: "That rate was already approved or dismissed.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
};

function fail(err: unknown): { ok: false; error: string } {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!MESSAGES[code]) console.error("[silver rate action]", err);
  return { ok: false, error: MESSAGES[code] ?? "Something went wrong. Please try again." };
}

/** A new rate reprices the whole store - every page showing a price. */
function revalidateStore() {
  revalidatePath("/", "layout");
}

export async function syncSilverRateNowAction(): Promise<Result<SyncResult>> {
  try {
    const outcome = await syncSilverRateNow();
    revalidateStore();
    return { ok: true, data: outcome };
  } catch (err) {
    return fail(err);
  }
}

export async function approveHeldRateAction(snapshotId: string): Promise<Result> {
  try {
    await approveHeldRate(snapshotId);
    revalidateStore();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function dismissHeldRateAction(): Promise<Result> {
  try {
    await dismissHeldRate();
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}