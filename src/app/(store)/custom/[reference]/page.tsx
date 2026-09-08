import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRequest } from "@/modules/custom/service";
import { getSetting } from "@/lib/settings";
import { cloudinaryUrl } from "@/lib/cloudinary";

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

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24 max-w-2xl">
      <p className="text-[10px] tracking-[0.3em] text-ink-soft mb-3">
        REQUEST {request.reference}
      </p>
      <h1 className="font-display text-4xl font-light mb-3">
        We&apos;ve got it
      </h1>
      <p className="text-sm text-ink-soft leading-relaxed mb-12">
        We&apos;ll look at this and come back with a price within {slaMin}–
        {slaMax} days. Nothing is charged until you accept.
      </p>

      <section className="mb-10">
        <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
          YOUR PHOTOS
        </h2>
        <div className="flex flex-wrap gap-3">
          {request.images.map((img) => (
            <a
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
            </a>
          ))}
        </div>
      </section>

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
                <dt className="text-xs text-ink-soft mb-1">Rough weight</dt>
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