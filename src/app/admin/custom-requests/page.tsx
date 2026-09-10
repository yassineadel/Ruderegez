import Link from "next/link";
import { listCustomRequests } from "@/modules/admin/custom-service";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import type { CustomRequestStatus } from "@/generated/prisma/client";

const STATUSES: CustomRequestStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "QUOTED",
  "ACCEPTED",
  "DECLINED",
  "REJECTED",
];

const LABEL: Record<string, string> = {
  SUBMITTED: "New",
  UNDER_REVIEW: "Reviewing",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  DECLINED: "Declined by customer",
  REJECTED: "Rejected",
};

export default async function AdminCustomRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as CustomRequestStatus)
    ? (params.status as CustomRequestStatus)
    : undefined;

  const { requests, counts } = await listCustomRequests(status);

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Custom requests</h1>
      <p className="text-sm text-ink-soft mb-10">
        {requests.length} {requests.length === 1 ? "request" : "requests"}
        {status && ` · ${LABEL[status]}`}
      </p>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-10 text-xs tracking-[0.12em]">
        <Link
          href="/admin/custom-requests"
          className={
            "pb-1 border-b transition-colors " +
            (!status
              ? "border-ink"
              : "border-transparent text-ink-soft hover:text-ink")
          }
        >
          ALL
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/custom-requests?status=${s}`}
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

      {requests.length === 0 ? (
        <p className="text-sm text-ink-soft py-16">Nothing here.</p>
      ) : (
        <div className="border border-line max-w-3xl">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/admin/custom-requests/${r.reference}`}
              className="flex gap-4 px-4 py-4 border-b border-line last:border-0 hover:bg-bone-deep transition-colors"
            >
              <div className="w-16 aspect-square bg-bone-deep shrink-0 overflow-hidden">
                {r.images[0] && (
                  <img
                    src={cloudinaryUrl(r.images[0].url, {
                      width: 140,
                      height: 140,
                    })}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-ink-soft mb-1">
                  {r.reference} · {LABEL[r.status]}
                </p>
                <p className="text-sm truncate">{r.description}</p>
                <p className="text-xs text-ink-soft mt-1 truncate">
                  {r.user.name ?? r.user.email}
                  {r.requestedSize && ` · ${r.requestedSize}`}
                  {r.requestedWeightMg &&
                    ` · ~${(r.requestedWeightMg / 1000).toFixed(1)}g`}
                </p>
              </div>

              <div className="text-right shrink-0">
                {r.quotedPriceMinor && (
                  <p className="text-sm">
                    {formatEGP(r.quotedPriceMinor as Minor)}
                  </p>
                )}
                <p className="text-xs text-ink-soft mt-1">
                  {r.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}