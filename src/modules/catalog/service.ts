import type { Minor } from "@/lib/money";
import { getPricingSettings } from "@/lib/settings";
import { priceProduct } from "@/modules/pricing/price-product";
import {
  findProducts,
  countProducts,
  findProductBySlug,
  findFeaturedProducts,
  findProductTypes,
  type ProductCard,
  type ProductDetail,
  type ProductFilters,
} from "./repository";

// ============================================================================
//  TYPES
// ============================================================================
//  Prices are never stored (BRD 7.1) — they are computed from the live silver
//  rate on every render. So the types the pages consume are the repository's
//  rows PLUS a price that only exists in memory.
// ============================================================================

export type PricedProductCard = ProductCard & { priceMinor: Minor };

export type PricedProductDetail = Omit<ProductDetail, "sizes"> & {
  priceMinor: Minor;
  sizes: (ProductDetail["sizes"][number] & { priceMinor: Minor })[];
};

// ============================================================================
//  QUERIES
// ============================================================================

export async function listProducts(
  filters: ProductFilters,
): Promise<{ products: PricedProductCard[]; total: number }> {
  // Settings fetched ONCE, above the loop. This is why priceProduct takes
  // them as a parameter instead of fetching its own.
  const settings = await getPricingSettings();

  // Neither depends on the other, so they run at the same time.
  const [products, total] = await Promise.all([
    findProducts(filters),
    countProducts(filters),
  ]);

  return {
    products: products.map((p) => ({
      ...p,
      priceMinor: priceProduct(p, settings),
    })),
    total,
  };
}

export async function getProductDetail(
  slug: string,
): Promise<PricedProductDetail | null> {
  const [settings, product] = await Promise.all([
    getPricingSettings(),
    findProductBySlug(slug),
  ]);

  if (!product) return null;

  return {
    ...product,
    // The base price, used when a product has no sizes.
    priceMinor: priceProduct(product, settings),
    // A size may override the weight, so each one gets its own price.
    sizes: product.sizes.map((s) => ({
      ...s,
      priceMinor: priceProduct(product, settings, s),
    })),
  };
}

export async function listFeatured(take = 8): Promise<PricedProductCard[]> {
  const settings = await getPricingSettings();
  const products = await findFeaturedProducts(take);

  return products.map((p) => ({
    ...p,
    priceMinor: priceProduct(p, settings),
  }));
}

/** Straight pass-through — the filter bar needs the categories. */
export { findProductTypes as listProductTypes };