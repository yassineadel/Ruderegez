import { requirePagePermission } from "@/lib/auth-guards";
import { listPromos } from "@/modules/promos/service";
import { formatEGP, type Minor } from "@/lib/money";
import type { AdminPromo } from "@/modules/promos/repository";
import PromoForm from "./promo-form";
import PromoRowActions from "./promo-row-actions";

export default async function AdminPromosPage() {
  await requirePagePermission("PROMOS");
  const promos = await listPromos();
  const now = new Date();

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Promo codes</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-xl leading-relaxed">
        A code takes a percentage off every piece in the order - never the
        delivery fee. One code per order. Customers add it at checkout, before
        they transfer. A code that has been used can be switched off but not
        deleted, so past orders keep their record.
      </p>

      <PromoForm />

      <h2 className="font-display text-2xl font-light mt-16 mb-6">All codes</h2>

      {promos.length === 0 ? (
        <p className="text-sm text-ink-soft py-8">No promo codes yet.</p>
      ) : (
        <div className="border border-line max-w-4xl">
          {promos.map((p) => {
            const status = statusOf(p, now);
            return (
              <div
                key={p.id}
                className={
                  "px-5 py-5 border-b border-line last:border-0 flex flex-wrap items-start justify-between gap-4 " +
                  (status.live ? "" : "bg-bone-deep")
                }
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-mono text-base">{p.code}</span>
                    <span className="font-display text-xl font-light">
                      {p.percentOff}% off
                    </span>
                    <span
                      className={
                        "text-[10px] tracking-[0.2em] " +
                        (status.live ? "text-ink" : "text-ink-soft")
                      }
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed">
                    {usesText(p)}
                    {p.maxUsesPerCustomer !== null &&
                      ` · ${p.maxUsesPerCustomer} per customer`}
                    {p.minSubtotalMinor !== null &&
                      ` · min order ${formatEGP(p.minSubtotalMinor as Minor)}`}
                  </p>
                  <p className="text-xs text-ink-soft mt-1">{datesText(p)}</p>
                </div>

                <PromoRowActions
                  id={p.id}
                  code={p.code}
                  isActive={p.isActive}
                  canDelete={p._count.redemptions === 0 && p.usedCount === 0}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function statusOf(p: AdminPromo, now: Date): { label: string; live: boolean } {
  if (!p.isActive) return { label: "OFF", live: false };
  if (p.expiresAt && p.expiresAt <= now) return { label: "EXPIRED", live: false };
  if (p.maxUses !== null && p.usedCount >= p.maxUses) {
    return { label: "USED UP", live: false };
  }
  if (p.startsAt && p.startsAt > now) return { label: "SCHEDULED", live: true };
  return { label: "ACTIVE", live: true };
}

function usesText(p: AdminPromo): string {
  return p.maxUses !== null
    ? `${p.usedCount} of ${p.maxUses} used`
    : `${p.usedCount} used · no total limit`;
}

// Server components render in the server's time zone (UTC on Vercel) - the
// store's is Cairo, so say so explicitly.
function when(d: Date): string {
  return d.toLocaleString("en-GB", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function datesText(p: AdminPromo): string {
  if (!p.startsAt && !p.expiresAt) return "No end date";
  if (p.startsAt && p.expiresAt) return `${when(p.startsAt)} to ${when(p.expiresAt)}`;
  if (p.startsAt) return `From ${when(p.startsAt)}, no end date`;
  return `Until ${when(p.expiresAt!)}`;
}
