import Link from "next/link";
import { listReviews } from "@/modules/admin/reviews-service";
import ReviewControls from "./review-controls";
import { requirePagePermission } from "@/lib/auth-guards";

const FILTERS = [
  { key: undefined, label: "ALL" },
  { key: "visible", label: "VISIBLE" },
  { key: "hidden", label: "HIDDEN" },
] as const;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requirePagePermission(["ORDERS", "PAYMENTS"]);
  const params = await searchParams;
  const filter =
    params.filter === "visible" || params.filter === "hidden"
      ? params.filter
      : undefined;

  const { reviews, counts } = await listReviews(filter);

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Reviews</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-xl leading-relaxed">
        Reviews go live as soon as a customer posts them. Hide one only for
        abuse, spam, or personal information - the reason is logged. Hiding
        honest negative reviews undermines trust in every rating on the site.
      </p>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-10 text-xs tracking-[0.12em]">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n =
            f.key === "visible"
              ? counts.visible
              : f.key === "hidden"
                ? counts.hidden
                : counts.visible + counts.hidden;
          return (
            <Link
              key={f.label}
              href={f.key ? `/admin/reviews?filter=${f.key}` : "/admin/reviews"}
              className={
                "pb-1 border-b transition-colors " +
                (active
                  ? "border-ink"
                  : "border-transparent text-ink-soft hover:text-ink")
              }
            >
              {f.label} ({n})
            </Link>
          );
        })}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-ink-soft py-16">Nothing here.</p>
      ) : (
        <div className="border border-line max-w-3xl">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={
                "px-5 py-5 border-b border-line last:border-0 " +
                (r.hiddenAt ? "bg-bone-deep" : "")
              }
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <Link
                    href={`/products/${r.product.slug}#reviews`}
                    className="text-sm hover:underline underline-offset-4"
                  >
                    {r.product.name}
                  </Link>
                  <p className="text-xs text-ink-soft mt-1 truncate">
                    {r.user.name ?? "No name"} ({r.user.email}), order{" "}
                    <Link
                      href={`/admin/orders/${r.orderItem.order.reference}`}
                      className="font-mono hover:text-ink"
                    >
                      {r.orderItem.order.reference}
                    </Link>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm tracking-[0.15em]">
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  <p className="text-xs text-ink-soft mt-1">
                    {r.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-line text-ink-soft mb-4">
                {r.body}
              </p>

              {r.hiddenAt && (
                <p className="text-xs text-red-800 mb-4">
                  Hidden {r.hiddenAt.toLocaleDateString("en-GB")}:{" "}
                  {r.hiddenReason}
                </p>
              )}

              <ReviewControls id={r.id} isHidden={r.hiddenAt !== null} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}