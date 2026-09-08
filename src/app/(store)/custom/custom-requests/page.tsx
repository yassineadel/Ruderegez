import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guards";
import { cloudinaryUrl } from "@/lib/cloudinary";

export default async function AdminCustomRequestsPage() {
  await requireAdmin();

  const requests = await prisma.customRequest.findMany({
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Custom requests</h1>
      <p className="text-sm text-ink-soft mb-10">
        {requests.length} {requests.length === 1 ? "request" : "requests"}
      </p>

      {requests.length === 0 ? (
        <p className="text-sm text-ink-soft py-16">Nothing here yet.</p>
      ) : (
        <div className="border border-line max-w-3xl">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/custom/${r.reference}`}
              className="flex gap-4 px-4 py-4 border-b border-line last:border-0 hover:bg-bone-deep transition-colors"
            >
              <div className="w-16 aspect-square bg-bone-deep shrink-0 overflow-hidden">
                {r.images[0] && (
                  <img
                    src={cloudinaryUrl(r.images[0].url, { width: 140, height: 140 })}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-ink-soft mb-1">
                  {r.reference} · {r.status}
                </p>
                <p className="text-sm truncate">{r.description}</p>
                <p className="text-xs text-ink-soft mt-1 truncate">
                  {r.user.name ?? r.user.email}
                  {r.requestedSize && ` · ${r.requestedSize}`}
                  {r.requestedWeightMg &&
                    ` · ~${(r.requestedWeightMg / 1000).toFixed(1)}g`}
                </p>
              </div>

              <span className="text-xs text-ink-soft shrink-0">
                {r.createdAt.toLocaleDateString("en-GB", {
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