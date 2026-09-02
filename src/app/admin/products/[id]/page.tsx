import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAdminProduct,
  getProductFormOptions,
} from "@/modules/admin/products-service";
import ProductForm from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, { types, settings }] = await Promise.all([
    getAdminProduct(id),
    getProductFormOptions(),
  ]);

  if (!product) notFound();

  return (
    <>
      <Link
        href="/admin/products"
        className="text-xs tracking-[0.15em] text-ink-soft hover:text-ink transition-colors"
      >
        ← ALL PRODUCTS
      </Link>

      <h1 className="font-display text-4xl font-light mt-6 mb-2">
        {product.name}
      </h1>
      <p className="text-sm text-ink-soft mb-10">
        <Link
          href={`/products/${product.slug}`}
          className="underline underline-offset-4 hover:text-ink"
        >
          /products/{product.slug}
        </Link>
      </p>

      <ProductForm
        types={types}
        settings={settings}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          typeId: product.typeId,
          audience: product.audience,
          weightG: product.weightMg / 1000,
          factor: product.factorBp / 10000,
          leadTimeDays: product.leadTimeDays,
          isFlatPrice: product.isFlatPrice,
          flatPriceEgp:
            product.flatPriceMinor === null ? null : product.flatPriceMinor / 100,
          isHidden: product.isHidden,
          isFeatured: product.isFeatured,
          isBestSeller: product.isBestSeller,
          isTrending: product.isTrending,
          sizes: product.sizes.map((s) => ({
            label: s.label,
            weightG: s.weightMg === null ? null : s.weightMg / 1000,
          })),
          images: product.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
        }}
      />
    </>
  );
}