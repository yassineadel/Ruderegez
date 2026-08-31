import Link from "next/link";
import { formatEGP } from "@/lib/money";
import type { PricedProductCard } from "@/modules/catalog/service";

export default function ProductCard({ product }: { product: PricedProductCard }) {
  const image = product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="aspect-[4/5] bg-bone-deep overflow-hidden mb-4">
        {image ? (
          <img
            src={image.url}
            alt={image.alt ?? product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-ink-soft text-xs tracking-[0.2em]">
            NO IMAGE
          </div>
        )}
      </div>

      <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-1">
        {product.type.name.toUpperCase()}
      </p>
      <h3 className="text-sm mb-1">{product.name}</h3>
      <p className="text-sm text-ink-soft">{formatEGP(product.priceMinor)}</p>
    </Link>
  );
}