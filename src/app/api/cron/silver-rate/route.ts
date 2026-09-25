import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runSilverRateSync } from "@/modules/pricing/rate-sync-service";

/**
 * Called by cron-job.org every 5 minutes.
 *
 * Protected by CRON_SECRET: the caller must send
 *   Authorization: Bearer <CRON_SECRET>
 * Without it, anyone who found the URL could hammer the price APIs from our
 * server until they blocked us.
 */

export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // not configured = nobody gets in

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  // Constant-time compare, so the response time leaks nothing about the secret.
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const outcome = await runSilverRateSync("cron");
    // 200 even for FAILED - the check ran, the failure is recorded for the
    // admin. A 500 would only make cron-job.org email you every 5 minutes.
    return NextResponse.json(outcome);
  } catch (err) {
    // Only a database problem gets here.
    console.error("[cron silver-rate]", err);
    return NextResponse.json({ error: "Sync crashed" }, { status: 500 });
  }
}