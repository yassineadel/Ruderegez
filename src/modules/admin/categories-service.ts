import { requireAdmin } from "@/lib/auth-guards";
import { slugify } from "./slugify";
import {
  findAllCategories,
  categorySlugTaken,
  nextSortOrder,
  createCategory,
  updateCategory,
  deleteCategory,
  countProductsInCategory,
  swapSortOrder,
  findCategoryById,
  sizeLabelTaken,
  nextSizeSortOrder,
  createCategorySize,
  deleteCategorySize,
} from "./categories-repository";

export async function listCategories() {
  await requireAdmin();
  return findAllCategories();
}

export async function addCategory(name: string) {
  await requireAdmin();

  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("NAME_REQUIRED");

  const slug = slugify(trimmed);
  if (slug.length < 2) throw new Error("NAME_INVALID");
  if (await categorySlugTaken(slug)) throw new Error("CATEGORY_EXISTS");

  await createCategory({
    name: trimmed,
    slug,
    sortOrder: await nextSortOrder(),
  });
}

/**
 * The slug is NOT regenerated on rename.
 *
 * It is part of every filter URL - /products?type=bracelet - and links get
 * shared and bookmarked. Fixing a typo in a display name should not silently
 * break those.
 */
export async function renameCategory(id: string, name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("NAME_REQUIRED");
  await updateCategory(id, { name: trimmed });
}

export async function setCategoryActive(id: string, isActive: boolean) {
  await requireAdmin();
  await updateCategory(id, { isActive });
}

/**
 * Deletes only if empty.
 *
 * Product.typeId is required, so Postgres would refuse anyway - but a clear
 * message beats a foreign-key error. A category with products gets
 * deactivated instead: hidden from the filters and the product dropdown,
 * while everything already in it keeps working.
 */
export async function removeCategory(id: string) {
  await requireAdmin();

  const count = await countProductsInCategory(id);
  if (count > 0) throw new Error("CATEGORY_NOT_EMPTY");

  await deleteCategory(id);
}

export async function moveCategory(id: string, direction: "up" | "down") {
  await requireAdmin();

  const all = await findAllCategories();
  const index = all.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("CATEGORY_NOT_FOUND");

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) return; // already at the end

  await swapSortOrder(
    { id: all[index].id, sortOrder: all[index].sortOrder },
    { id: all[swapWith].id, sortOrder: all[swapWith].sortOrder },
  );
}

// ============================================================================
//  SIZES + CUSTOM FACTOR  (custom request form)
// ============================================================================

/** Weight arrives in grams from the form and is stored in milligrams. */
export async function addCategorySize(typeId: string, label: string, weightG: number) {
  await requireAdmin();

  const category = await findCategoryById(typeId);
  if (!category) throw new Error("CATEGORY_NOT_FOUND");

  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > 30) throw new Error("SIZE_LABEL_INVALID");
  if (!Number.isFinite(weightG) || weightG < 0.1 || weightG > 1000) {
    throw new Error("SIZE_WEIGHT_INVALID");
  }
  if (await sizeLabelTaken(typeId, trimmed)) throw new Error("SIZE_EXISTS");

  await createCategorySize({
    typeId,
    label: trimmed,
    weightMg: Math.round(weightG * 1000),
    sortOrder: await nextSizeSortOrder(typeId),
  });
}

export async function removeCategorySize(id: string) {
  await requireAdmin();
  await deleteCategorySize(id);
}

/**
 * The admin types a multiplier - 2.5 - and it is stored as basis points,
 * 25000, the same unit as Product.factorBp. Null clears it, which hides the
 * estimate for new designs in that category.
 */
export async function setCategoryFactor(id: string, factor: number | null) {
  await requireAdmin();

  if (factor === null) {
    await updateCategory(id, { customFactorBp: null });
    return;
  }
  if (!Number.isFinite(factor) || factor < 1 || factor > 10) {
    throw new Error("FACTOR_INVALID");
  }
  await updateCategory(id, { customFactorBp: Math.round(factor * 10000) });
}