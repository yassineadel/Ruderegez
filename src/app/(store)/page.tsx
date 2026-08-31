import Link from "next/link";
import { listFeatured, listProductTypes } from "@/modules/catalog/service";
import ProductCard from "@/components/product-card";

export default async function HomePage() {
  const [featured, types] = await Promise.all([
    listFeatured(4),
    listProductTypes(),
  ]);

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* HERO — text-led, so it holds up before real photography arrives.  */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative">
        <div className="grid lg:grid-cols-2 min-h-[70vh]">
          <div className="flex items-center px-6 lg:px-12 py-20 lg:py-0">
            <div className="max-w-md">
              <p className="text-[10px] tracking-[0.3em] text-ink-soft mb-6">
                HANDMADE IN CAIRO
              </p>
              <h1 className="font-display text-5xl lg:text-6xl font-light leading-[1.1] mb-6">
                Silver, made
                <br />
                to order.
              </h1>
              <p className="text-sm text-ink-soft leading-relaxed mb-10">
                Every piece is made by hand after you order it. Nothing sits in
                a warehouse, and nothing is mass produced.
              </p>
              <Link
                href="/products"
                className="inline-block bg-ink text-bone px-10 py-4 text-xs tracking-[0.2em] hover:opacity-90 transition-opacity"
              >
                VIEW THE COLLECTION →
              </Link>
            </div>
          </div>

          <div className="relative bg-bone-deep min-h-[50vh] lg:min-h-0">
            <img
              src="/auth-hero.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FEATURED — hand-picked in admin, so it is never empty by accident. */}
      {/* ---------------------------------------------------------------- */}
      {featured.length > 0 && (
        <section className="px-6 lg:px-12 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-ink-soft mb-3">
                SELECTED
              </p>
              <h2 className="font-display text-3xl lg:text-4xl font-light">
                Featured pieces
              </h2>
            </div>
            <Link
              href="/products"
              className="text-xs tracking-[0.2em] text-ink-soft hover:text-ink transition-colors whitespace-nowrap"
            >
              SEE ALL →
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* BRAND                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-bone-deep px-6 lg:px-12 py-24">
        <div className="max-w-2xl">
          <p className="text-[10px] tracking-[0.3em] text-ink-soft mb-6">
            OUR APPROACH
          </p>
          <h2 className="font-display text-3xl lg:text-4xl font-light leading-snug mb-8">
            We do not keep stock. Each piece begins when you order it.
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 text-xs text-ink-soft leading-relaxed">
            <div>
              <p className="text-ink mb-2 tracking-[0.15em]">STERLING SILVER</p>
              <p>Solid 925 silver throughout. No plating, no filler.</p>
            </div>
            <div>
              <p className="text-ink mb-2 tracking-[0.15em]">MADE BY HAND</p>
              <p>
                Weights vary slightly between pieces. Prices account for that.
              </p>
            </div>
            <div>
              <p className="text-ink mb-2 tracking-[0.15em]">LIVE PRICING</p>
              <p>
                Prices follow the silver rate, so you pay what the metal is
                worth today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CATEGORIES                                                        */}
      {/* ---------------------------------------------------------------- */}
      {types.length > 0 && (
        <section className="px-6 lg:px-12 py-24">
          <p className="text-[10px] tracking-[0.3em] text-ink-soft mb-3">
            BROWSE
          </p>
          <h2 className="font-display text-3xl lg:text-4xl font-light mb-12">
            By category
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line">
            {types.map((t) => (
              <Link
                key={t.id}
                href={`/products?type=${t.slug}`}
                className="bg-bone px-6 py-12 text-center hover:bg-bone-deep transition-colors"
              >
                <span className="font-display text-xl font-light">{t.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
