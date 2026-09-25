import Link from "next/link";
import { getMyCustomRequests } from "@/modules/account/service";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";

const LABEL: Record<string, string> = {
  SUBMITTED: "With us",
  UNDER_REVIEW: "Being reviewed",
  QUOTED: "Quote ready",
  ACCEPTED: "In your bag",
  DECLINED: "You declined",
  REJECTED: "Can't be made",
};

export default async function AccountRequestsPage() {
  const requests = await getMyCustomRequests();

  if (requests.length === 0) {
    return (
      <div>
        <p className="text-sm text-ink-soft mb-8">
          You haven&apos;t sent a custom request yet.
        </p>
        <Link
          href="/custom"
          className="inline-block bg-ink text-bone px-10 py-4 text-xs tracking-[0.2em] hover:opacity-90 transition-opacity"
        >
          REQUEST SOMETHING →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {requests.map((r) => {
        const needsYou = r.status === "QUOTED";

        return (
          <li key={r.id}>
            <Link
              href={`/custom/${r.reference}`}
              className={
                "flex gap-4 p-5 border transition-colors " +
                (needsYou
                  ? "border-ink hover:bg-bone-deep"
                  : "border-line hover:border-ink")
              }
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
                  {r.reference}
                </p>
                <p className="text-sm truncate">{r.description}</p>
                <p className="text-xs text-ink-soft mt-1">
                  {LABEL[r.status]}
                  {needsYou && r.quotedPriceMinor && (
                    <span className="text-ink">
                      {" "}
                      - {formatEGP(r.quotedPriceMinor as Minor)}, waiting on you
                    </span>
                  )}
                </p>
              </div>

              <span className="text-xs text-ink-soft shrink-0">
                {r.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}