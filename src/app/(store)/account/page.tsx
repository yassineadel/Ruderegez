import Link from "next/link";
import { getMyOrders } from "@/modules/account/service";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import { cloudinaryUrl } from "@/lib/cloudinary";

/**
 * Customer-facing wording. The admin sees PAYMENT_UNDER_REVIEW; a customer
 * seeing that reads it as something being wrong with their order.
 */
const LABEL: Record<string, string> = {
  PLACED: "Awaiting payment",
  PAYMENT_UNDER_REVIEW: "Checking your payment",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "Being made",
  READY_TO_SHIP: "Ready to send",
  SHIPPED: "On its way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default async function AccountOrdersPage() {
  const orders = await getMyOrders();

  if (orders.length === 0) {
    return (
      <div>
        <p className="text-sm text-ink-soft mb-8">
          You haven&apos;t placed an order yet.
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

  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/orders/${order.reference}`}
            className="block border border-line p-6 hover:border-ink transition-colors"
          >
            <div className="flex flex-wrap justify-between gap-4 mb-5">
              <div>
                <p className="font-mono text-xs text-ink-soft mb-1">
                  {order.reference}
                </p>
                <p className="text-sm">{LABEL[order.status]}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">{formatEGP(order.totalMinor as Minor)}</p>
                <p className="text-xs text-ink-soft mt-1">
                  {order.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {order.items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="w-14 aspect-[4/5] bg-bone-deep overflow-hidden"
                >
                  {item.imageUrlSnapshot && (
                    <img
                      src={cloudinaryUrl(item.imageUrlSnapshot, { width: 120 })}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              ))}
              {order.items.length > 4 && (
                <div className="w-14 aspect-[4/5] bg-bone-deep flex items-center justify-center text-xs text-ink-soft">
                  +{order.items.length - 4}
                </div>
              )}
            </div>

            {order.status === "PLACED" && (
              <p className="mt-5 text-xs text-ink-soft">
                Waiting for your transfer - open this order for the payment
                details.
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}