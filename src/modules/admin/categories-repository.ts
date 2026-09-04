import { prisma } from "@/lib/db";
import type { Prisma, ProductType } from "@/generated/prisma/client";

export type CategoryRow = Prisma.ProductTypeGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

/** All of them, active or not - the admin needs to see what it has hidden. */
export function findAllCategories(): Promise<CategoryRow[]> {
  return prisma.productType.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function categorySlugTaken(
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const found = await prisma.productType.findUnique({
    where: { slug },
    select: { id: true },
  });
  return found !== null && found.id !== exceptId;
}

export async function nextSortOrder(): Promise<number> {
  const last = await prisma.productType.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

export function createCategory(data: {
  name: string;
  slug: string;
  sortOrder: number;
}): Promise<ProductType> {
  return prisma.productType.create({ data });
}

export function updateCategory(
  id: string,
  data: { name?: string; slug?: string; isActive?: boolean },
): Promise<ProductType> {
  return prisma.productType.update({ where: { id }, data });
}

export function deleteCategory(id: string): Promise<ProductType> {
  return prisma.productType.delete({ where: { id } });
}

export function countProductsInCategory(id: string): Promise<number> {
  return prisma.product.count({ where: { typeId: id, deletedAt: null } });
}

/**
 * Swaps the sortOrder of two categories, in one transaction.
 *
 * Both rows must move together - writing one and failing on the other would
 * leave two categories claiming the same position.
 */
export function swapSortOrder(
  a: { id: string; sortOrder: number },
  b: { id: string; sortOrder: number },
) {
  return prisma.$transaction([
    prisma.productType.update({
      where: { id: a.id },
      data: { sortOrder: b.sortOrder },
    }),
    prisma.productType.update({
      where: { id: b.id },
      data: { sortOrder: a.sortOrder },
    }),
  ]);
}