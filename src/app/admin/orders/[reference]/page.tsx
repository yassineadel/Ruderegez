import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrder, allowedNext } from "@/modules/admin/orders-service";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import OrderControls from "./order-controls";

const LABEL: Record<string, string> = {
  PLACED: "Placed",
  PAYMENT_UNDER_REVIEW: "Payment review",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In production",
  READY_TO_SHIP: "Ready to ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const order = await getOrder(reference);
  if (!order) notFound();

  const next = allowedNext(order.status);
  const awaitingPayment =
    order.status === "PLACED" || order.status === "PAYMENT_UNDER_REVIEW";

  return (
    <>
      <Link
        href="/admin/orders"
        className="text-xs tracking-[0.15em] text-ink-soft hover:text-ink transition-colors"
      >
        ← ALL ORDERS
      </Link>

      <h1 className="font-display text-4xl font-light mt-6 mb-2">
        {order.reference}
      </h1>
      <p className="text-sm text-ink-soft mb-10">
        {LABEL[order.status]} ·{" "}
        {order.createdAt.toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <div className="grid lg:grid-cols-[1fr_340px] gap-12 items-start max-w-5xl">
        <div>
          <section className="mb-12">
            <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
              ITEMS
            </h2>
            <ul className="border-t border-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5 border-b border-line">
                  <div className="w-16 aspect-[4/5] bg-bone-deep shrink-0 overflow-hidden">
                    {item.imageUrlSnapshot && (
                      <img
                        src={item.imageUrlSnapshot}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 flex justify-between gap-4">
                    <div>
                      <p className="text-sm">{item.nameSnapshot}</p>
                      <p className="text-xs text-ink-soft mt-1">
                        {item.sizeSnapshot && `Size ${item.sizeSnapshot} · `}
                        {(item.weightMgSnapshot / 1000).toFixed(1)}g ·{" "}
                        {(item.factorBpSnapshot / 10000).toFixed(1)}× · rate{" "}
                        {formatEGP(item.silverRateMinorSnapshot as Minor)}/g
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-ink-soft">
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

          <section className="mb-12">
            <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
              HISTORY
            </h2>
            <ul className="space-y-4">
              {order.statusEvents.map((e) => (
                <li key={e.id} className="flex gap-4 text-sm">
                  <span className="text-xs text-ink-soft w-28 shrink-0">
                    {e.createdAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>
                    {LABEL[e.toStatus]}
                    {e.note && (
                      <span className="block text-xs text-ink-soft mt-0.5">
                        {e.note}
                      </span>
                    )}
                   <span className="block text-xs text-ink-soft mt-0.5">
  {e.actorUserId ? "Admin" : "Customer"}
</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {order.paymentProofs.length > 0 && (
            <section>
              <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
                PAYMENTS
              </h2>
              <ul className="space-y-3">
                {order.paymentProofs.map((p) => (
                  <li
                    key={p.id}
                    className="border border-line p-4 flex justify-between gap-4 text-sm"
                  >
                    <div>
                      <p>{formatEGP(p.amountMinor as Minor)}</p>
                      {p.referenceNumber && (
                        <p className="text-xs text-ink-soft mt-1 font-mono">
                          {p.referenceNumber}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-ink-soft">{p.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-10 space-y-8">
          <div className="border border-line p-6">
            <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
              CUSTOMER
            </h2>
            <address className="not-italic text-sm leading-relaxed">
              {order.customerName}
              <br />
              {order.customerPhone}
              <br />
              <span className="text-ink-soft">{order.user.email}</span>
            </address>
            <p className="text-sm mt-4 leading-relaxed">
              {order.addressLine}
              <br />
              {order.addressCity}
            </p>
            {order.addressNotes && (
              <p className="text-xs text-ink-soft mt-3 leading-relaxed">
                {order.addressNotes}
              </p>
            )}
          </div>

          <div className="border border-line p-6">
            <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
              MONEY
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
              <div className="flex justify-between pt-2 text-ink-soft">
                <dt>Deposit ({order.depositPercentSnapshot}%)</dt>
                <dd>{formatEGP(order.depositDueMinor as Minor)}</dd>
              </div>
              <div className="flex justify-between text-ink-soft">
                <dt>Balance</dt>
                <dd>{formatEGP(order.balanceDueMinor as Minor)}</dd>
              </div>
            </dl>
            <p className="text-xs text-ink-soft mt-4 pt-4 border-t border-line">
              Rate at purchase:{" "}
              {formatEGP(order.silverRateMinorSnapshot as Minor)}/g
            </p>
          </div>

          <OrderControls
            reference={order.reference}
            allowedNext={next}
            awaitingPayment={awaitingPayment}
            depositDueMinor={order.depositDueMinor}
            labels={LABEL}
          />
        </div>
      </div>
    </>
  );
}