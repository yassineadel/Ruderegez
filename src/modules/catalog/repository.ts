import { prisma } from "@/lib/db";
import type { Prisma, ProductType } from "@/generated/prisma/client";

// ============================================================================
//  TYPES
// ============================================================================
//  A product fetched with `include` is wider than the bare `Product` row -
//  it carries its images, sizes and type. ProductGetPayload derives that
//  shape from the query, so the type can never drift from what is fetched.
// ============================================================================

export type ProductDetail = Prisma.ProductGetPayload<{
  include: { images: true; sizes: true; type: true };
}>;

export type ProductCard = Prisma.ProductGetPayload<{
  include: { images: true; type: true };
}>;

/** Every visible product query starts from this. Hidden and soft-deleted
 *  products must never reach the storefront, so the condition lives here
 *  rather than in each caller. */
const VISIBLE = { isHidden: false, deletedAt: null } as const;

// ============================================================================
//  QUERIES
// ============================================================================

export function findProductTypes(): Promise<ProductType[]> {
  return prisma.productType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function findProductBySlug(slug: string): Promise<ProductDetail | null> {
  return prisma.product.findFirst({
    where: { ...VISIBLE, slug },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      sizes: { orderBy: { sortOrder: "asc" } },
      type: true,
    },
  });
}

export interface ProductFilters {
  typeSlug?: string;
  audience?: "MEN" | "WOMEN" | "UNISEX";
  search?: string;
  skip?: number;
  take?: number;
}

export function findProducts(filters: ProductFilters): Promise<ProductCard[]> {
  return prisma.product.findMany({
    where: buildWhere(filters),
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      type: true,
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    skip: filters.skip ?? 0,
    take: filters.take ?? 24,
  });
}

/** The total ignoring pagination - the grid needs it to render page numbers. */
export function countProducts(filters: ProductFilters): Promise<number> {
  return prisma.product.count({ where: buildWhere(filters) });
}

export function findFeaturedProducts(take = 8): Promise<ProductCard[]> {
  return prisma.product.findMany({
    where: { ...VISIBLE, isFeatured: true },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      type: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * Shared by findProducts and countProducts so the two can never disagree -
 * a filter applied to the list but not the count would give you page numbers
 * for products that aren't there.
 */
function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...VISIBLE };

  if (filters.typeSlug) {
    where.type = { slug: filters.typeSlug };
  }

  if (filters.audience) {
    // A UNISEX piece belongs in both the men's and women's listings.
    where.audience =
      filters.audience === "UNISEX"
        ? "UNISEX"
        : { in: [filters.audience, "UNISEX"] };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export function findTrendingProducts(take = 6): Promise<ProductCard[]> {
  return prisma.product.findMany({
    where: { ...VISIBLE, isTrending: true },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      type: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}