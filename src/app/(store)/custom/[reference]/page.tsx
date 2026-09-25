import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRequest } from "@/modules/custom/service";
import { getSetting } from "@/lib/settings";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import QuoteResponse from "./quote-response";

export default async function CustomRequestPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const session = await auth();

  const request = await getRequest(reference);
  if (!request) notFound();

  const isOwner = session?.user?.id === request.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  if (!isOwner && !isAdmin) notFound();

  const [slaMin, slaMax] = await Promise.all([
    getSetting("quoteSlaDaysMin", "1"),
    getSetting("quoteSlaDaysMax", "3"),
  ]);

  const waiting =
    request.status === "SUBMITTED" || request.status === "UNDER_REVIEW";

  const heading: Record<string, string> = {
    SUBMITTED: "We've got it",
    UNDER_REVIEW: "We're looking at it",
    QUOTED: "Here's your quote",
    ACCEPTED: "It's in your bag",
    DECLINED: "Quote declined",
    REJECTED: "We can't make this one",
  };

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24 max-w-2xl">
      <p className="text-[10px] tracking-[0.3em] text-ink-soft mb-3">
        REQUEST {request.reference}
      </p>
      <h1 className="font-display text-4xl font-light mb-3">
        {heading[request.status]}
      </h1>

      {waiting && (
        <p className="text-sm text-ink-soft leading-relaxed mb-12">
          We&apos;ll come back with a price within {slaMin}–{slaMax} days.
          Nothing is charged until you accept.
        </p>
      )}

      {/* ---------------- the quote ---------------- */}
      {request.status === "QUOTED" && request.quotedPriceMinor && (
        <section className="border border-ink p-8 mb-12">
          <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-2">
            YOUR PRICE
          </p>
          <p className="font-display text-4xl font-light mb-6">
            {formatEGP(request.quotedPriceMinor as Minor)}
          </p>

          <dl className="grid sm:grid-cols-2 gap-4 text-sm border-t border-line pt-5">
            {request.quotedWeightMg && (
              <div>
                <dt className="text-xs text-ink-soft mb-1">Silver weight</dt>
                <dd>{(request.quotedWeightMg / 1000).toFixed(1)}g</dd>
              </div>
            )}
            {request.quotedLeadTimeDays !== null && (
              <div>
                <dt className="text-xs text-ink-soft mb-1">Ready in</dt>
                <dd>about {request.quotedLeadTimeDays} days</dd>
              </div>
            )}
          </dl>

          {request.quoteNote && (
            <p className="text-sm text-ink-soft leading-relaxed mt-5 pt-5 border-t border-line whitespace-pre-line">
              {request.quoteNote}
            </p>
          )}

          {isOwner && <QuoteResponse reference={request.reference} />}
        </section>
      )}

      {/* ---------------- accepted ---------------- */}
      {request.status === "ACCEPTED" && (
        <section className="border border-line p-8 mb-12">
          <p className="text-sm text-ink-soft leading-relaxed mb-6">
            This piece is in your bag at{" "}
            {request.quotedPriceMinor
              ? formatEGP(request.quotedPriceMinor as Minor)
              : "the quoted price"}
            . Work begins once your payment clears.
          </p>
          <Link
            href="/cart"
            className="inline-block bg-ink text-bone px-10 py-3.5 text-xs tracking-[0.2em] hover:opacity-90 transition-opacity"
          >
            GO TO YOUR BAG →
          </Link>
        </section>
      )}

      {/* ---------------- declined ---------------- */}
      {request.status === "DECLINED" && (
        <p className="text-sm text-ink-soft leading-relaxed mb-12">
          You declined this quote. If you&apos;ve changed your mind or want
          something adjusted, send a new request and mention this reference.
        </p>
      )}

      {/* ---------------- rejected ---------------- */}
      {request.status === "REJECTED" && request.rejectionReason && (
        <section className="border border-line p-8 mb-12">
          <p className="text-sm leading-relaxed">{request.rejectionReason}</p>
        </section>
      )}

      {/* ---------------- what it starts from ---------------- */}
      {request.source === "RUDEREGEZ_DESIGN" && (
        <section className="mb-10">
          <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
            THE PIECE YOU CHOSE
            {request.type && ` · ${request.type.name.toUpperCase()}`}
          </h2>
          <div className="flex gap-5 items-center">
            <div className="w-28 aspect-square bg-bone-deep overflow-hidden border border-line shrink-0">
              {request.baseImageUrl && (
                <img
                  src={cloudinaryUrl(request.baseImageUrl, { width: 240, height: 240 })}
                  alt={request.baseProductName ?? ""}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <p className="font-display text-xl">{request.baseProductName}</p>
          </div>
        </section>
      )}

      {request.source === "NEW_DESIGN" && request.type && (
        <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-10">
          NEW DESIGN · {request.type.name.toUpperCase()}
        </p>
      )}

      {/* ---------------- what they sent ---------------- */}
      {request.images.length > 0 && (
        <section className="mb-10">
          <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
            YOUR PHOTOS
          </h2>
          <div className="flex flex-wrap gap-3">
            {request.images.map((img) => (
              <Link
                key={img.id}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="w-28 aspect-square bg-bone-deep overflow-hidden border border-line hover:border-ink transition-colors"
              >
                <img
                  src={cloudinaryUrl(img.url, { width: 240, height: 240 })}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-3">
          WHAT YOU ASKED FOR
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-line">
          {request.description}
        </p>

        {(request.requestedSize || request.requestedWeightMg) && (
          <dl className="flex gap-10 mt-6 text-sm">
            {request.requestedSize && (
              <div>
                <dt className="text-xs text-ink-soft mb-1">Size</dt>
                <dd>{request.requestedSize}</dd>
              </div>
            )}
            {request.requestedWeightMg && (
              <div>
                <dt className="text-xs text-ink-soft mb-1">Silver weight</dt>
                <dd>{(request.requestedWeightMg / 1000).toFixed(1)}g</dd>
              </div>
            )}
          </dl>
        )}
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