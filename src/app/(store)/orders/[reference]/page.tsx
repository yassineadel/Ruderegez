import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findOrderByReference } from "@/modules/orders/repository";
import { getSetting } from "@/lib/settings";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const session = await auth();

  const order = await findOrderByReference(reference);
  if (!order) notFound();

  // Only the owner or an admin may see an order.
  const isOwner = session?.user?.id === order.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  if (!isOwner && !isAdmin) notFound();

  const [instapay, instapayName, vodafone] = await Promise.all([
    getSetting("instapayHandle"),
    getSetting("instapayAccountName"),
    getSetting("vodafoneCashNumber"),
  ]);

  const awaitingPayment = order.status === "PLACED";

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24 max-w-3xl">
      <p className="text-[10px] tracking-[0.3em] text-ink-soft mb-3">
        ORDER {order.reference}
      </p>
      <h1 className="font-display text-4xl font-light mb-3">
        {awaitingPayment ? "Almost there" : "Thank you"}
      </h1>
      <p className="text-sm text-ink-soft mb-12 leading-relaxed">
        {awaitingPayment
          ? "Your order is reserved. Send the transfer below and we'll confirm it within a few hours."
          : "We've received your payment and your order is being prepared."}
      </p>

      {awaitingPayment && (
        <section className="border border-ink p-8 mb-12">
          <h2 className="font-display text-2xl font-light mb-2">
            Pay {formatEGP(order.depositDueMinor as Minor)}
          </h2>
          <p className="text-xs text-ink-soft mb-6">
            Send this amount using either method, then send us the screenshot.
          </p>

          <dl className="space-y-4 text-sm">
            {instapay && (
              <div>
                <dt className="text-[10px] tracking-[0.2em] text-ink-soft mb-1">
                  INSTAPAY
                </dt>
                <dd className="font-mono">{instapay}</dd>
                {instapayName && (
                  <dd className="text-xs text-ink-soft mt-0.5">{instapayName}</dd>
                )}
              </div>
            )}
            {vodafone && (
              <div>
                <dt className="text-[10px] tracking-[0.2em] text-ink-soft mb-1">
                  VODAFONE CASH
                </dt>
                <dd className="font-mono">{vodafone}</dd>
              </div>
            )}
            {!instapay && !vodafone && (
              <p className="text-sm text-ink-soft">
                Payment details are being set up. We'll contact you shortly.
              </p>
            )}
          </dl>

          <p className="mt-6 pt-6 border-t border-line text-xs text-ink-soft leading-relaxed">
            Include your reference <span className="text-ink">{order.reference}</span>{" "}
            in the transfer note if you can. Upload your screenshot below once
            you've sent it.
          </p>

          <div className="mt-6 border border-dashed border-line p-6 text-center">
            <p className="text-xs text-ink-soft">
              Screenshot upload coming next - for now, send it to us on
              WhatsApp with your reference.
            </p>
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="font-display text-2xl font-light mb-6">Your pieces</h2>
        <ul className="border-t border-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-5 py-6 border-b border-line">
              <div className="w-20 aspect-[4/5] bg-bone-deep shrink-0 overflow-hidden">
                {item.imageUrlSnapshot && (
                  <img
                    src={item.imageUrlSnapshot}
                    alt={item.nameSnapshot}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 flex justify-between gap-4">
                <div>
                  <p className="text-sm">{item.nameSnapshot}</p>
                  {item.sizeSnapshot && (
                    <p className="text-xs text-ink-soft mt-1">
                      Size {item.sizeSnapshot}
                    </p>
                  )}
                  {item.quantity > 1 && (
                    <p className="text-xs text-ink-soft mt-1">
                      Quantity {item.quantity}
                    </p>
                  )}
                </div>
                <p className="text-sm shrink-0">
                  {formatEGP(item.lineTotalMinor as Minor)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid sm:grid-cols-2 gap-12 mb-12">
        <div>
          <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
            DELIVERING TO
          </h2>
          <address className="not-italic text-sm leading-relaxed">
            {order.customerName}
            <br />
            {order.addressLine}
            <br />
            {order.addressCity}
            <br />
            {order.customerPhone}
          </address>
        </div>

        <div>
          <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
            TOTAL
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd>{formatEGP(order.subtotalMinor as Minor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery</dt>
              <dd>{formatEGP(order.deliveryFeeMinor as Minor)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-line">
              <dt>Total</dt>
              <dd>{formatEGP(order.totalMinor as Minor)}</dd>
            </div>
            {order.balanceDueMinor > 0 && (
              <div className="flex justify-between pt-2 text-ink-soft">
                <dt>
                  {order.paymentMethod === "DEPOSIT_THEN_PICKUP"
                    ? "On collection"
                    : "On delivery"}
                </dt>
                <dd>{formatEGP(order.balanceDueMinor as Minor)}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <Link
        href="/products"
        className="inline-block border border-ink px-8 py-3.5 text-xs tracking-[0.2em] hover:bg-ink hover:text-bone transition-colors"
      >
        CONTINUE SHOPPING
      </Link>
    </div>
  );
}   