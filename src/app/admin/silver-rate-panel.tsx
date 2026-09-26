import { getSilverRateStatus } from "@/modules/pricing/rate-sync-service";
import { formatEGP, type Minor } from "@/lib/money";
import SilverRateControls from "./silver-rate-controls";

/** The cron runs every 5 minutes - 30 minutes of silence means it stopped. */
const STALE_AFTER_MS = 30 * 60 * 1000;

const RESULT_LABEL: Record<string, string> = {
  UNCHANGED: "Checked - price moved less than 0.5%, rate unchanged",
  APPLIED: "Checked - rate updated",
  HELD: "Checked - big move held for your approval",
  FAILED: "Last check failed",
};

function when(d: Date | null): string {
  if (!d) return "never";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
}

function ago(d: Date | null): string {
  if (!d) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

export default async function SilverRatePanel() {
  const s = await getSilverRateStatus();

  const stale =
    !s.lastCheckAt || Date.now() - s.lastCheckAt.getTime() > STALE_AFTER_MS;
  const failed = s.lastCheckResult === "FAILED";
  const healthy = !stale && !failed;

  return (
    <section className="border border-line max-w-4xl mb-12">
      {/* ---------------- headline ---------------- */}
      <div className="p-6 lg:p-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-2">
            SILVER RATE - PURE SILVER, PER GRAM
          </p>
          <p className="font-display text-4xl font-light">
            {s.rateMinor !== null ? formatEGP(s.rateMinor) : "-"}
          </p>
          <p className="text-xs text-ink-soft mt-2">
            Last changed {when(s.rateUpdatedAt)}
            {s.rateUpdatedAt && ` (${ago(s.rateUpdatedAt)})`}
          </p>

          {s.usdPerOzCents !== null && s.egpPerUsdMilli !== null && (
            <p className="text-xs text-ink-soft mt-4 leading-relaxed">
              ${(s.usdPerOzCents / 100).toFixed(2)} per oz ×{" "}
              {(s.egpPerUsdMilli / 1000).toFixed(2)} EGP per $ ÷ 31.1035 g
              <br />
              Dollar rate from {when(s.egpPerUsdFetchedAt)} - it updates once a
              day.
            </p>
          )}
        </div>

        <SilverRateControls />
      </div>

      {/* ---------------- health ---------------- */}
      <div
        className={
          "px-6 lg:px-8 py-4 border-t text-sm flex items-start gap-3 " +
          (healthy ? "border-line" : "border-red-800 bg-red-50")
        }
      >
        <span
          className={
            "mt-1.5 h-2 w-2 rounded-full shrink-0 " +
            (healthy ? "bg-green-700" : "bg-red-800")
          }
        />
        <div>
          <p>
            {stale && !failed
              ? "No check in the last 30 minutes - the scheduler may have stopped."
              : (RESULT_LABEL[s.lastCheckResult ?? ""] ?? "Not checked yet")}
          </p>
          <p className="text-xs text-ink-soft mt-1">
            Last check {when(s.lastCheckAt)}
            {s.lastCheckAt && ` (${ago(s.lastCheckAt)})`}
            {s.lastCheckMessage && ` - ${s.lastCheckMessage}`}
          </p>
          {!healthy && (
            <p className="text-xs text-ink-soft mt-1">
              The store keeps using the rate above until a check succeeds.
            </p>
          )}
        </div>
      </div>

      {/* ---------------- held rate ---------------- */}
      {s.held && (
        <div className="px-6 lg:px-8 py-5 border-t border-ink bg-bone-deep">
          <p className="text-[10px] tracking-[0.2em] mb-2">NEEDS YOUR APPROVAL</p>
          <p className="text-sm leading-relaxed mb-4">
            The fetched rate is{" "}
            <strong>{formatEGP(s.held.rateMinor as Minor)}</strong>, a{" "}
            {Math.round(
              (Math.abs(s.held.rateMinor - s.held.previousRateMinor) /
                s.held.previousRateMinor) *
                100,
            )}
            % move from {formatEGP(s.held.previousRateMinor as Minor)}. Moves
            over 40% are never applied automatically - it may be a real market
            move, or a broken price feed.
          </p>
          <SilverRateControls heldId={s.held.id} />
        </div>
      )}

      {/* ---------------- history ---------------- */}
      {s.history.length > 0 && (
        <div className="border-t border-line px-6 lg:px-8 py-5">
          <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-3">
            RECENT CHANGES
          </p>
          <ul className="text-xs divide-y divide-line">
            {s.history.map((h) => (
              <li key={h.id} className="py-2 flex flex-wrap gap-x-6 gap-y-1">
                <span className="w-32 text-ink-soft">{when(h.createdAt)}</span>
                <span className="w-44">
                  {formatEGP(h.previousRateMinor as Minor)} →{" "}
                  {formatEGP(h.rateMinor as Minor)}
                </span>
                <span className="text-ink-soft">
                  {h.status === "APPLIED"
                    ? h.trigger === "admin"
                      ? "Applied by admin"
                      : "Applied automatically"
                    : h.status === "HELD"
                      ? "Held"
                      : "Dismissed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}