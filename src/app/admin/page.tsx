import Link from "next/link";
import { getPricingSettings } from "@/lib/settings";
import { formatEGP, type Minor } from "@/lib/money";
import SilverRatePanel from "./silver-rate-panel";
import { listDeliveryZones } from "@/modules/delivery/service";

export default async function AdminDashboard() {
  const [p, zones] = await Promise.all([getPricingSettings(), listDeliveryZones()]);
  const fees = zones.map((z) => z.feeMinor);
  const lo = Math.min(...fees) as Minor;
  const hi = Math.max(...fees) as Minor;
  const delivery =
    fees.length === 0
      ? "Collection only"
      : lo === hi
        ? formatEGP(lo)
        : `${formatEGP(lo)} – ${formatEGP(hi)}`;

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Dashboard</h1>
      <p className="text-sm text-ink-soft mb-10">
        The values currently used to price every item in the store.
      </p>

      {/* Updated automatically every 5 minutes - see the panel for details. */}
      <SilverRatePanel />

      <div className="grid gap-px bg-line border border-line sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
        <Stat label="Deposit - standard" value={`${p.depositPercent}%`} />
        <Stat label="Deposit - custom" value={`${p.depositPercentCustom}%`} />
        <Stat
          label={`Delivery - ${zones.length} ${zones.length === 1 ? "area" : "areas"}`}
          value={delivery}
        />
        <Stat label="Weight tolerance" value={`${p.weightTolerancePercent}%`} />
        <Stat
          label="Engraving"
          value={
            p.engravingFeeMode === "FLAT"
              ? `${formatEGP(p.engravingFee)} flat`
              : `${formatEGP(p.engravingFeePerChar)} / char`
          }
        />
      </div>

      <Link
        href="/admin/settings"
        className="mt-8 inline-block border border-ink px-8 py-3.5 text-xs tracking-[0.2em] hover:bg-ink hover:text-bone transition-colors"
      >
        EDIT SETTINGS →
      </Link>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bone px-6 py-7">
      <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-2">
        {label.toUpperCase()}
      </p>
      <p className="font-display text-2xl font-light">{value}</p>
    </div>
  );
}