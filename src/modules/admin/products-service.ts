import { requireAdmin } from "@/lib/auth-guards";
import { getPricingSettings } from "@/lib/settings";
import { toMinor } from "@/lib/money";
import { findProductTypes } from "@/modules/catalog/repository";
import {
  findAdminProducts,
  findAdminProductById,
  slugTaken,
  createProductTransaction,
  updateProductTransaction,
  setProductHidden,
  softDeleteProduct,
  type ProductWriteData,
  type SizeInput,
  type ImageInput,
} from "./products-repository";
import { slugify } from "./slugify";

/**
 * "Fine Chain Bracelet" -> "fine-chain-bracelet"
 *
 * Lowercase, spaces to hyphens, anything that isn't a letter, digit or hyphen
 * removed. Arabic and accented characters are stripped rather than
 * transliterated — a slug has to survive being typed into a URL bar.
 */

export interface ProductFormInput {
  id?: string;
  name: string;
  slug: string;
  description: string;
  typeId: string;
    audience: "MEN" | "WOMEN" | "UNISEX" | "NONE";
  /** Grams as typed by the admin — converted to milligrams here. */
  weightG: number;
  /** A plain multiplier as typed, e.g. 2.6 — converted to basis points here. */
  factor: number;
  leadTimeDays: number;
  isFlatPrice: boolean;
  /** EGP as typed — converted to piastres here. */
  flatPriceEgp: number | null;
  isHidden: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  sizes: { label: string; weightG: number | null }[];
  images: { url: string; alt: string }[];
}

export async function listAdminProducts(filters: {
  search?: string;
  hidden?: boolean;
  typeSlug?: string;
}) {
  await requireAdmin();
  const [products, types] = await Promise.all([
    findAdminProducts(filters),
    findProductTypes(),
  ]);
  return { products, types };
}

export async function getAdminProduct(id: string) {
  await requireAdmin();
  return findAdminProductById(id);
}

export async function getProductFormOptions() {
  await requireAdmin();
  const [types, settings] = await Promise.all([
    findProductTypes(),
    getPricingSettings(),
  ]);
  return { types, settings };
}

async function validate(input: ProductFormInput): Promise<{
  product: ProductWriteData;
  sizes: SizeInput[];
  images: ImageInput[];
}> {
  if (input.name.trim().length < 2) throw new Error("NAME_REQUIRED");
  if (input.description.trim().length < 10) throw new Error("DESCRIPTION_REQUIRED");
  if (!input.typeId) throw new Error("TYPE_REQUIRED");

  const slug = slugify(input.slug || input.name);
  if (slug.length < 2) throw new Error("SLUG_INVALID");
  if (await slugTaken(slug, input.id)) throw new Error("SLUG_TAKEN");

  // A flat-priced product with no price is the one broken state priceProduct
  // cannot recover from — it throws rather than showing a wrong number.
  if (input.isFlatPrice) {
    if (input.flatPriceEgp === null || !(input.flatPriceEgp > 0)) {
      throw new Error("FLAT_PRICE_REQUIRED");
    }
  } else {
    if (!(input.weightG > 0)) throw new Error("WEIGHT_REQUIRED");
    if (!(input.factor > 0)) throw new Error("FACTOR_REQUIRED");
  }

  if (!Number.isInteger(input.leadTimeDays) || input.leadTimeDays < 0) {
    throw new Error("LEAD_TIME_INVALID");
  }

  const labels = input.sizes.map((s) => s.label.trim()).filter(Boolean);
  if (new Set(labels).size !== labels.length) throw new Error("DUPLICATE_SIZE");

  return {
    product: {
      slug,
      name: input.name.trim(),
      description: input.description.trim(),
      typeId: input.typeId,
      audience: input.audience,
      weightMg: Math.round(input.weightG * 1000),
      factorBp: Math.round(input.factor * 10000),
      leadTimeDays: input.leadTimeDays,
      isFlatPrice: input.isFlatPrice,
      flatPriceMinor: input.isFlatPrice ? toMinor(input.flatPriceEgp!) : null,
      isHidden: input.isHidden,
      isFeatured: input.isFeatured,
      isBestSeller: input.isBestSeller,
      isTrending: input.isTrending,
    },
    sizes: input.sizes
      .filter((s) => s.label.trim())
      .map((s) => ({
        label: s.label.trim(),
        // null means "same as the product" — the fallback priceProduct uses.
        weightMg: s.weightG === null ? null : Math.round(s.weightG * 1000),
      })),
    images: input.images
      .filter((i) => i.url.trim())
      .map((i) => ({ url: i.url.trim(), alt: i.alt.trim() || null })),
  };
}

export async function createProduct(input: ProductFormInput) {
  await requireAdmin();
  const { product, sizes, images } = await validate(input);
  const created = await createProductTransaction(product, sizes, images);
  return { id: created.id, slug: created.slug };
}

export async function updateProduct(input: ProductFormInput) {
  await requireAdmin();
  if (!input.id) throw new Error("PRODUCT_NOT_FOUND");
  const { product, sizes, images } = await validate(input);
  const updated = await updateProductTransaction(input.id, product, sizes, images);
  return { id: updated.id, slug: updated.slug };
}

export async function toggleHidden(id: string, isHidden: boolean) {
  await requireAdmin();
  await setProductHidden(id, isHidden);
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await softDeleteProduct(id);
}