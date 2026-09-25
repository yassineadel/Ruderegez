import { requireAdmin } from "@/lib/auth-guards";
import type { Minor } from "@/lib/money";
import { fetchSilverUsdPerOz, fetchEgpPerUsd, toRateMinor } from "./rate-sources";
import {
  SYNC_KEYS,
  readSyncState,
  recordCheck,
  applyRate,
  createHeldSnapshot,
  dismissOpenHeld,
  findOpenHeld,
  findSnapshot,
  findRecentSnapshots,
} from "./rate-sync-repository";

// ============================================================================
//  RULES
// ============================================================================

/** Moves smaller than this are ignored - prices don't twitch every 5 minutes. */
const MIN_CHANGE = 0.005; // 0.5%

/** Moves larger than this are never applied automatically - the admin decides. */
const MAX_AUTO_CHANGE = 0.4; // 40%

/** The FX provider only updates daily, so there's no point asking more often. */
const FX_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** If the FX provider is down, an older saved rate is still usable this long. */
const FX_FALLBACK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SyncResult =
  | { result: "UNCHANGED"; rateMinor: number }
  | { result: "APPLIED"; rateMinor: number; previousRateMinor: number }
  | { result: "HELD"; rateMinor: number; previousRateMinor: number }
  | { result: "FAILED"; message: string };

// ============================================================================
//  THE CHECK
// ============================================================================

/**
 * Fetch, convert, decide, record. Called by the cron route every 5 minutes
 * and by the admin's "Update now" button.
 *
 * Never throws for an outside failure - a failed check is a normal outcome
 * that gets recorded and shown to the admin. The store keeps its last good
 * rate until a check succeeds.
 */
export async function runSilverRateSync(
  trigger: "cron" | "admin",
  actorUserId: string | null = null,
): Promise<SyncResult> {
  const now = new Date();
  const state = await readSyncState();
  const currentRate = Number.parseInt(state[SYNC_KEYS.rate] ?? "", 10);

  const failed = async (message: string): Promise<SyncResult> => {
    await recordCheck({
      [SYNC_KEYS.lastCheckAt]: now.toISOString(),
      [SYNC_KEYS.lastCheckResult]: "FAILED",
      [SYNC_KEYS.lastCheckMessage]: message,
    });
    return { result: "FAILED", message };
  };

  // --- 1. silver ------------------------------------------------------------
  let usdPerOz: number;
  try {
    usdPerOz = await fetchSilverUsdPerOz();
  } catch (err) {
    return failed(`Silver price: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  // --- 2. USD -> EGP, reusing today's saved rate ----------------------------
  const savedFx = Number.parseInt(state[SYNC_KEYS.egpPerUsdMilli] ?? "", 10) / 1000;
  const savedFxAt = Date.parse(state[SYNC_KEYS.egpPerUsdFetchedAt] ?? "");
  const fxAge = Number.isFinite(savedFxAt) ? now.getTime() - savedFxAt : Infinity;

  let egpPerUsd: number;
  let fxFetchedAt: string | null = null;

  if (Number.isFinite(savedFx) && savedFx > 0 && fxAge < FX_MAX_AGE_MS) {
    egpPerUsd = savedFx;
  } else {
    try {
      egpPerUsd = await fetchEgpPerUsd();
      fxFetchedAt = now.toISOString();
    } catch (err) {
      // A few days' old exchange rate is far better than no update at all.
      if (Number.isFinite(savedFx) && savedFx > 0 && fxAge < FX_FALLBACK_MAX_AGE_MS) {
        egpPerUsd = savedFx;
      } else {
        return failed(`Exchange rate: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }
  }

  // --- 3. convert -----------------------------------------------------------
  const newRate = toRateMinor(usdPerOz, egpPerUsd);
  const usdPerOzCents = Math.round(usdPerOz * 100);
  const egpPerUsdMilli = Math.round(egpPerUsd * 1000);

  const baseCheck: Record<string, string> = {
    [SYNC_KEYS.lastCheckAt]: now.toISOString(),
    [SYNC_KEYS.lastUsdPerOzCents]: String(usdPerOzCents),
    [SYNC_KEYS.egpPerUsdMilli]: String(egpPerUsdMilli),
    ...(fxFetchedAt && { [SYNC_KEYS.egpPerUsdFetchedAt]: fxFetchedAt }),
  };

  // No rate yet (fresh install): take the fetched one as-is.
  if (!Number.isFinite(currentRate) || currentRate <= 0) {
    await applyRate({
      rateMinor: newRate,
      previousRateMinor: 0,
      usdPerOzCents,
      egpPerUsdMilli,
      trigger,
      actorUserId,
      checkValues: { ...baseCheck, [SYNC_KEYS.lastCheckResult]: "APPLIED", [SYNC_KEYS.lastCheckMessage]: "" },
    });
    return { result: "APPLIED", rateMinor: newRate, previousRateMinor: 0 };
  }

  const change = Math.abs(newRate - currentRate) / currentRate;

  // --- 4a. too small to matter ---------------------------------------------
  if (change < MIN_CHANGE) {
    await recordCheck({
      ...baseCheck,
      [SYNC_KEYS.lastCheckResult]: "UNCHANGED",
      [SYNC_KEYS.lastCheckMessage]: "",
    });
    return { result: "UNCHANGED", rateMinor: currentRate };
  }

  // --- 4b. too big to trust -------------------------------------------------
  if (change > MAX_AUTO_CHANGE) {
    const held = await createHeldSnapshot({
      rateMinor: newRate,
      previousRateMinor: currentRate,
      usdPerOzCents,
      egpPerUsdMilli,
      trigger,
    });
    await dismissOpenHeld(null, held.id);
    await recordCheck({
      ...baseCheck,
      [SYNC_KEYS.lastCheckResult]: "HELD",
      [SYNC_KEYS.lastCheckMessage]: `Moved ${(change * 100).toFixed(1)}% - waiting for approval.`,
    });
    return { result: "HELD", rateMinor: newRate, previousRateMinor: currentRate };
  }

  // --- 4c. normal change - apply --------------------------------------------
  // A normal update makes any older held number obsolete.
  await dismissOpenHeld(null);
  await applyRate({
    rateMinor: newRate,
    previousRateMinor: currentRate,
    usdPerOzCents,
    egpPerUsdMilli,
    trigger,
    actorUserId,
    checkValues: { ...baseCheck, [SYNC_KEYS.lastCheckResult]: "APPLIED", [SYNC_KEYS.lastCheckMessage]: "" },
  });
  return { result: "APPLIED", rateMinor: newRate, previousRateMinor: currentRate };
}

// ============================================================================
//  ADMIN
// ============================================================================

/** "Update now" - same rules as the cron, run on demand. */
export async function syncSilverRateNow(): Promise<SyncResult> {
  const admin = await requireAdmin();
  return runSilverRateSync("admin", admin.id);
}

/** Apply a rate that was held for moving more than 40%. */
export async function approveHeldRate(snapshotId: string) {
  const admin = await requireAdmin();

  const held = await findSnapshot(snapshotId);
  if (!held || held.status !== "HELD" || held.resolvedAt) {
    throw new Error("HELD_RATE_NOT_FOUND");
  }

  const state = await readSyncState();
  const currentRate = Number.parseInt(state[SYNC_KEYS.rate] ?? "0", 10);

  await applyRate({
    rateMinor: held.rateMinor,
    previousRateMinor: currentRate,
    usdPerOzCents: held.usdPerOzCents,
    egpPerUsdMilli: held.egpPerUsdMilli,
    trigger: "admin",
    actorUserId: admin.id,
    heldSnapshotId: held.id,
    checkValues: {
      [SYNC_KEYS.lastCheckResult]: "APPLIED",
      [SYNC_KEYS.lastCheckMessage]: "Held rate approved by admin.",
    },
  });
}

export async function dismissHeldRate() {
  const admin = await requireAdmin();
  await dismissOpenHeld(admin.id);
}

/** Everything the admin panel shows. */
export async function getSilverRateStatus() {
  await requireAdmin();
  const [state, held, history] = await Promise.all([
    readSyncState(),
    findOpenHeld(),
    findRecentSnapshots(10),
  ]);

  const int = (k: string) => {
    const n = Number.parseInt(state[k] ?? "", 10);
    return Number.isFinite(n) ? n : null;
  };
  const date = (k: string) => (state[k] ? new Date(state[k]) : null);

  return {
    rateMinor: int(SYNC_KEYS.rate) as Minor | null,
    rateUpdatedAt: date(SYNC_KEYS.rateUpdatedAt),
    lastCheckAt: date(SYNC_KEYS.lastCheckAt),
    lastCheckResult: state[SYNC_KEYS.lastCheckResult] ?? null,
    lastCheckMessage: state[SYNC_KEYS.lastCheckMessage] ?? "",
    usdPerOzCents: int(SYNC_KEYS.lastUsdPerOzCents),
    egpPerUsdMilli: int(SYNC_KEYS.egpPerUsdMilli),
    egpPerUsdFetchedAt: date(SYNC_KEYS.egpPerUsdFetchedAt),
    held,
    history,
  };
}