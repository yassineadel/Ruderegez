import Link from "next/link";
import { listOrders } from "@/modules/admin/orders-service";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import type { OrderStatus } from "@/generated/prisma/client";

const STATUSES: OrderStatus[] = [
  "PLACED",
  "PAYMENT_UNDER_REVIEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const LABEL: Record<OrderStatus, string> = {
  PLACED: "Placed",
  PAYMENT_UNDER_REVIEW: "Payment review",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In production",
  READY_TO_SHIP: "Ready to ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : undefined;

  const { orders, total, counts } = await listOrders({
    status,
    search: params.q,
    take: 50,
  });

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Orders</h1>
      <p className="text-sm text-ink-soft mb-10">
        {total} {total === 1 ? "order" : "orders"}
        {status && ` · ${LABEL[status]}`}
      </p>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-10 text-xs tracking-[0.12em]">
        <Link
          href="/admin/orders"
          className={
            "pb-1 border-b transition-colors " +
            (!status ? "border-ink" : "border-transparent text-ink-soft hover:text-ink")
          }
        >
          ALL
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={
              "pb-1 border-b transition-colors " +
              (status === s
                ? "border-ink"
                : "border-transparent text-ink-soft hover:text-ink")
            }
          >
            {LABEL[s].toUpperCase()}
            {counts[s] ? ` (${counts[s]})` : ""}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-ink-soft py-16">No orders here yet.</p>
      ) : (
        <div className="border border-line">
          <div className="hidden lg:grid grid-cols-[140px_1fr_140px_120px_110px] gap-4 px-5 py-3 border-b border-line text-[10px] tracking-[0.2em] text-ink-soft">
            <span>REFERENCE</span>
            <span>CUSTOMER</span>
            <span>STATUS</span>
            <span className="text-right">TOTAL</span>
            <span className="text-right">PLACED</span>
          </div>

          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.reference}`}
              className="grid lg:grid-cols-[140px_1fr_140px_120px_110px] gap-1 lg:gap-4 px-5 py-4 border-b border-line last:border-0 hover:bg-bone-deep transition-colors text-sm"
            >
              <span className="font-mono text-xs">{o.reference}</span>
              <span className="min-w-0">
                <span className="block truncate">{o.customerName}</span>
                <span className="block text-xs text-ink-soft truncate">
                  {o.items.length} {o.items.length === 1 ? "piece" : "pieces"} ·{" "}
                  {o.customerPhone}
                </span>
              </span>
              <span className="text-xs text-ink-soft lg:text-ink">
                {LABEL[o.status]}
              </span>
              <span className="lg:text-right">
                {formatEGP(o.totalMinor as Minor)}
              </span>
              <span className="lg:text-right text-xs text-ink-soft">
                {o.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}