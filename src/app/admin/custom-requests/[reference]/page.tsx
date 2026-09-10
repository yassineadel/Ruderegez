import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomRequest } from "@/modules/admin/custom-service";
import { getPricingSettings } from "@/lib/settings";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import QuoteControls from "./quote-controls";

const LABEL: Record<string, string> = {
  SUBMITTED: "New",
  UNDER_REVIEW: "Reviewing",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  DECLINED: "Declined by customer",
  REJECTED: "Rejected",
};

export default async function AdminCustomRequestPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const [request, settings] = await Promise.all([
    getCustomRequest(reference),
    getPricingSettings(),
  ]);

  if (!request) notFound();

  const open =
    request.status === "SUBMITTED" ||
    request.status === "UNDER_REVIEW" ||
    request.status === "QUOTED";

  return (
    <>
      <Link
        href="/admin/custom-requests"
        className="text-xs tracking-[0.15em] text-ink-soft hover:text-ink transition-colors"
      >
        ← ALL REQUESTS
      </Link>

      <h1 className="font-display text-4xl font-light mt-6 mb-2">
        {request.reference}
      </h1>
      <p className="text-sm text-ink-soft mb-10">
        {LABEL[request.status]} ·{" "}
        {request.createdAt.toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-12 items-start max-w-5xl">
        <div>
          <section className="mb-10">
            <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
              PHOTOS
            </h2>
            <div className="flex flex-wrap gap-3">
              {request.images.map((img) => (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-32 aspect-square bg-bone-deep overflow-hidden border border-line hover:border-ink transition-colors"
                  title="Open full size"
                >
                  <img
                    src={cloudinaryUrl(img.url, { width: 280, height: 280 })}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-3">
              WHAT THEY ASKED FOR
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {request.description}
            </p>

            {(request.requestedSize || request.requestedWeightMg) && (
              <dl className="flex gap-10 mt-5 text-sm">
                {request.requestedSize && (
                  <div>
                    <dt className="text-xs text-ink-soft mb-1">Size</dt>
                    <dd>{request.requestedSize}</dd>
                  </div>
                )}
                {request.requestedWeightMg && (
                  <div>
                    <dt className="text-xs text-ink-soft mb-1">
                      Their rough weight
                    </dt>
                    <dd>{(request.requestedWeightMg / 1000).toFixed(1)}g</dd>
                  </div>
                )}
              </dl>
            )}
          </section>

          {request.quotedPriceMinor && (
            <section className="border border-line p-6 mb-10">
              <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
                CURRENT QUOTE
              </h2>
              <dl className="grid sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-ink-soft mb-1">Price</dt>
                  <dd>{formatEGP(request.quotedPriceMinor as Minor)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-soft mb-1">Weight</dt>
                  <dd>
                    {request.quotedWeightMg
                      ? `${(request.quotedWeightMg / 1000).toFixed(1)}g`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-soft mb-1">Lead time</dt>
                  <dd>{request.quotedLeadTimeDays ?? "—"} days</dd>
                </div>
              </dl>
              {request.quoteNote && (
                <p className="text-xs text-ink-soft mt-4 pt-4 border-t border-line leading-relaxed whitespace-pre-line">
                  {request.quoteNote}
                </p>
              )}
              {request.quotedAt && (
                <p className="text-xs text-ink-soft mt-3">
                  Quoted{" "}
                  {request.quotedAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </section>
          )}

          {request.rejectionReason && (
            <section className="border border-red-800 p-6 mb-10">
              <h2 className="text-[10px] tracking-[0.2em] text-red-800 mb-3">
                REJECTED
              </h2>
              <p className="text-sm leading-relaxed">
                {request.rejectionReason}
              </p>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-10 space-y-8">
          <div className="border border-line p-6">
            <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
              CUSTOMER
            </h2>
            <p className="text-sm leading-relaxed">
              {request.user.name ?? "—"}
              <br />
              <span className="text-ink-soft">{request.user.email}</span>
            </p>
          </div>

          {open && (
            <QuoteControls
              reference={request.reference}
              status={request.status}
              silverRatePerGram={settings.silverRatePerGram}
              tolerancePercent={settings.weightTolerancePercent}
              defaultWeightG={
                request.quotedWeightMg
                  ? request.quotedWeightMg / 1000
                  : request.requestedWeightMg
                    ? request.requestedWeightMg / 1000
                    : 5
              }
              defaultLeadTimeDays={request.quotedLeadTimeDays ?? 14}
              defaultNote={request.quoteNote ?? ""}
            />
          )}
        </div>
      </div>
    </>
  );
}