import Link from "next/link";
import { getCartView } from "@/modules/cart/service";
import { getPricingSettings } from "@/lib/settings";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import { listDeliveryZones } from "@/modules/delivery/service";
import CartLines from "./cart-lines";

export default async function CartPage() {
  const [cart, settings, zones] = await Promise.all([
    getCartView(),
    getPricingSettings(),
    listDeliveryZones(),
  ]);

  if (cart.lines.length === 0) {
    return (
      <div className="px-6 lg:px-12 py-24 max-w-2xl">
        <h1 className="font-display text-4xl font-light mb-3">Your bag</h1>
        <p className="text-sm text-ink-soft mb-10">
          There&apos;s nothing in it yet.
        </p>
        <Link
          href="/products"
          className="inline-block bg-ink text-bone px-10 py-4 text-xs tracking-[0.2em] hover:opacity-90 transition-opacity"
        >
          BROWSE THE COLLECTION →
        </Link>
      </div>
    );
  }

  const deposit = Math.round(
    (cart.subtotalMinor * settings.depositPercent) / 100,
  ) as Minor;

  // The area is chosen at checkout, so the bag shows the cheapest one -
  // "from" when the areas cost different amounts.
  const fees = zones.map((z) => z.feeMinor);
  const lowestFee = (fees.length ? Math.min(...fees) : 0) as Minor;
  const feesVary = new Set(fees).size > 1;
  const total = (cart.subtotalMinor + lowestFee) as Minor;

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24">
      <h1 className="font-display text-4xl font-light mb-2">Your bag</h1>
      <p className="text-sm text-ink-soft mb-12">
        {cart.itemCount} {cart.itemCount === 1 ? "piece" : "pieces"}
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-20 items-start">
        <CartLines lines={cart.lines} />

        <div className="border border-line p-8 lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-light mb-6">Summary</h2>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd>{formatEGP(cart.subtotalMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery</dt>
              <dd>
                {fees.length === 0
                  ? "Collection only"
                  : `${feesVary ? "From " : ""}${formatEGP(lowestFee)}`}
              </dd>
            </div>
            <div className="flex justify-between pt-3 border-t border-line text-base">
              <dt>{feesVary ? "Total from" : "Total"}</dt>
              <dd>{formatEGP(total)}</dd>
            </div>
          </dl>

          <div className="mt-6 pt-6 border-t border-line">
            <p className="text-xs text-ink-soft leading-relaxed">
              A {settings.depositPercent}% deposit of{" "}
              <span className="text-ink">{formatEGP(deposit)}</span> is paid now.
              The balance is due when your order is ready.
            </p>
          </div>

          <Link
            href="/checkout"
            className="mt-8 block bg-ink text-bone py-4 text-center text-xs tracking-[0.2em] hover:opacity-90 transition-opacity"
          >
            CHECKOUT →
          </Link>

          <p className="mt-4 text-[11px] text-ink-soft leading-relaxed">
            Prices follow the live silver rate and are confirmed when your order
            is placed.{feesVary && " The delivery fee depends on the area you choose at checkout."}
          </p>
        </div>
      </div>
    </div>
  );
}