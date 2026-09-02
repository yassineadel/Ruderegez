import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type AdminProductRow = Prisma.ProductGetPayload<{
  include: { images: true; type: true; _count: { select: { sizes: true } } };
}>;

export type AdminProductDetail = Prisma.ProductGetPayload<{
  include: { images: true; sizes: true; type: true };
}>;

export function findAdminProducts(filters: {
  search?: string;
  hidden?: boolean;
  typeSlug?: string;
}): Promise<AdminProductRow[]> {
  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (filters.hidden !== undefined) where.isHidden = filters.hidden;
  if (filters.typeSlug) where.type = { slug: filters.typeSlug };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.product.findMany({
    where,
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      type: true,
      _count: { select: { sizes: true } },
    },
    orderBy: [{ isHidden: "asc" }, { createdAt: "desc" }],
  });
}

export function findAdminProductById(
  id: string,
): Promise<AdminProductDetail | null> {
  return prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      sizes: { orderBy: { sortOrder: "asc" } },
      type: true,
    },
  });
}

/** Excludes `exceptId` so editing a product doesn't collide with itself. */
export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const found = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  return found !== null && found.id !== exceptId;
}

export interface ProductWriteData {
  slug: string;
  name: string;
  description: string;
  typeId: string;
  audience: "MEN" | "WOMEN" | "UNISEX" | "NONE";
  weightMg: number;
  factorBp: number;
  leadTimeDays: number;
  isFlatPrice: boolean;
  flatPriceMinor: number | null;
  isHidden: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
}

export interface SizeInput {
  label: string;
  weightMg: number | null;
}

export interface ImageInput {
  url: string;
  alt: string | null;
}

/**
 * Creates a product with its sizes and images in one transaction.
 *
 * A product row without its sizes is a product whose price is wrong for every
 * size but one — worse than no product at all, because it looks finished.
 */
export function createProductTransaction(
  product: ProductWriteData,
  sizes: SizeInput[],
  images: ImageInput[],
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: product });

    if (sizes.length > 0) {
      await tx.productSize.createMany({
        data: sizes.map((s, i) => ({
          productId: created.id,
          label: s.label,
          weightMg: s.weightMg,
          sortOrder: i,
        })),
      });
    }

    if (images.length > 0) {
      await tx.productImage.createMany({
        data: images.map((img, i) => ({
          productId: created.id,
          url: img.url,
          alt: img.alt,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      });
    }

    return created;
  });
}

/**
 * Sizes and images are REPLACED, not merged.
 *
 * The form sends the complete list it wants to exist. Working out which rows
 * were added, removed or reordered — and doing it correctly under concurrent
 * edits — is far more code than deleting and re-inserting a handful of rows.
 */
export function updateProductTransaction(
  id: string,
  product: ProductWriteData,
  sizes: SizeInput[],
  images: ImageInput[],
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({ where: { id }, data: product });

    await tx.productSize.deleteMany({ where: { productId: id } });
    if (sizes.length > 0) {
      await tx.productSize.createMany({
        data: sizes.map((s, i) => ({
          productId: id,
          label: s.label,
          weightMg: s.weightMg,
          sortOrder: i,
        })),
      });
    }

    await tx.productImage.deleteMany({ where: { productId: id } });
    if (images.length > 0) {
      await tx.productImage.createMany({
        data: images.map((img, i) => ({
          productId: id,
          url: img.url,
          alt: img.alt,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      });
    }

    return updated;
  });
}

export function setProductHidden(id: string, isHidden: boolean) {
  return prisma.product.update({ where: { id }, data: { isHidden } });
}

/** Soft delete — OrderItem keeps its productId link for reporting. */
export function softDeleteProduct(id: string) {
  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), isHidden: true },
  });
}