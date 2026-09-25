import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/modules/catalog/service";
import { getProductReviews, getMyReviewState } from "@/modules/reviews/service";
import ProductGallery from "./gallery";
import AddToBag from "./add-to-bag";
import Stars from "./stars";
import Reviews from "./reviews";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductDetail(slug);

  if (!product) notFound();

  // Both need the product id, and neither depends on the other.
  const [{ reviews, average, count }, myState] = await Promise.all([
    getProductReviews(product.id),
    getMyReviewState(product.id),
  ]);

  return (
    <div className="px-6 py-16 lg:px-12 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 max-w-6xl mx-auto">
        <ProductGallery images={product.images} name={product.name} />

        <div className="lg:pt-8">
          <p className="text-[10px] tracking-[0.25em] text-ink-soft mb-3">
            {product.type.name.toUpperCase()}
          </p>

          <h1 className="font-display text-4xl font-light mb-4">
            {product.name}
          </h1>

          {average !== null && (
            <Link
              href="#reviews"
              className="inline-flex items-center gap-2 mb-6 text-ink-soft hover:text-ink transition-colors"
            >
              <Stars rating={average} size="text-xs" />
              <span className="text-xs underline underline-offset-4">
                {average.toFixed(1)} ({count})
              </span>
            </Link>
          )}

          <AddToBag
            productId={product.id}
            basePriceMinor={product.priceMinor}
            sizes={product.sizes.map((s) => ({
              id: s.id,
              label: s.label,
              priceMinor: s.priceMinor,
            }))}
          />

          <p className="text-sm text-ink-soft leading-relaxed my-10 whitespace-pre-line">
            {product.description}
          </p>

          <div className="border-t border-line pt-6 space-y-2 text-xs text-ink-soft">
            <p>Made to order - ready in about {product.leadTimeDays} days.</p>
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

      <Reviews
        productId={product.id}
        slug={product.slug}
        reviews={reviews}
        average={average}
        count={count}
        myState={myState}
      />
    </div>
  );
}