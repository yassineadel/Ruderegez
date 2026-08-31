import { notFound } from "next/navigation";
import { getProductDetail } from "@/modules/catalog/service";
import { formatEGP } from "@/lib/money";
import ProductGallery from "./gallery";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductDetail(slug);

  if (!product) notFound();

  const hasSizes = product.sizes.length > 0;

  return (
    <div className="px-6 py-16 lg:px-12 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 max-w-6xl mx-auto">
        <ProductGallery images={product.images} name={product.name} />

        <div className="lg:pt-8">
          <p className="text-[10px] tracking-[0.25em] text-ink-soft mb-3">
            {product.type.name.toUpperCase()}
          </p>

          <h1 className="font-display text-4xl font-light mb-4">{product.name}</h1>

          <p className="text-2xl font-light mb-8">
            {hasSizes ? (
              <>
                from {formatEGP(
                  product.sizes.reduce(
                    (min, s) => (s.priceMinor < min ? s.priceMinor : min),
                    product.sizes[0].priceMinor,
                  ),
                )}
              </>
            ) : (
              formatEGP(product.priceMinor)
            )}
          </p>

          <p className="text-sm text-ink-soft leading-relaxed mb-10 whitespace-pre-line">
            {product.description}
          </p>

          {hasSizes && (
            <div className="mb-10">
              <p className="text-xs tracking-[0.15em] text-ink-soft mb-3">SIZE</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <div
                    key={s.id}
                    className="border border-line px-5 py-3 text-sm"
                    title={formatEGP(s.priceMinor)}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-soft mt-3">
                Price varies by size. Selection comes with the cart on Day 6.
              </p>
            </div>
          )}

          <div className="border-t border-line pt-6 space-y-2 text-xs text-ink-soft">
            <p>Made to order — ready in about {product.leadTimeDays} days.</p>
            <p>Handmade in Cairo from sterling silver.</p>
            {!product.isFlatPrice && (
              <p>
                Weight is approximate; final pieces vary slightly and the price
                accounts for that.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}