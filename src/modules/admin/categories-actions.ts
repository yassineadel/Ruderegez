"use server";

import { revalidatePath } from "next/cache";
import {
  addCategory,
  renameCategory,
  setCategoryActive,
  removeCategory,
  moveCategory,
  addCategorySize,
  removeCategorySize,
  setCategoryFactor,
} from "./categories-service";
import { type Result } from "./errors";

const MESSAGES: Record<string, string> = {
  SIZE_LABEL_INVALID: "Give the size a label of up to 30 characters.",
  SIZE_WEIGHT_INVALID: "Enter a weight between 0.1 and 1000 grams.",
  SIZE_EXISTS: "This category already has a size with that label.",
  FACTOR_INVALID: "Enter a factor between 1 and 10 - for example 2.5.",
  NAME_REQUIRED: "Please give the category a name.",
  NAME_INVALID: "That name needs at least two letters or numbers.",
  CATEGORY_EXISTS: "A category with that name already exists.",
  CATEGORY_NOT_EMPTY:
  "This category still has products in it. Hide it instead, or move the products first.",
  CATEGORY_NOT_FOUND: "That category no longer exists.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
};

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!MESSAGES[code]) console.error("[admin categories]", err);
  return {
    ok: false,
    error: MESSAGES[code] ?? "Something went wrong. Please try again.",
  };
}

function revalidateAll() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
  revalidatePath("/custom");
}

export async function addCategoryAction(name: string): Promise<Result> {
  try {
    await addCategory(name);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function renameCategoryAction(
  id: string,
  name: string,
): Promise<Result> {
  try {
    await renameCategory(id, name);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setCategoryActiveAction(
  id: string,
  isActive: boolean,
): Promise<Result> {
  try {
    await setCategoryActive(id, isActive);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function removeCategoryAction(id: string): Promise<Result> {
  try {
    await removeCategory(id);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function moveCategoryAction(
  id: string,
  direction: "up" | "down",
): Promise<Result> {
  try {
    await moveCategory(id, direction);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function addCategorySizeAction(
  typeId: string,
  label: string,
  weightG: number,
): Promise<Result> {
  try {
    await addCategorySize(typeId, label, weightG);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function removeCategorySizeAction(id: string): Promise<Result> {
  try {
    await removeCategorySize(id);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setCategoryFactorAction(
  id: string,
  factor: number | null,
): Promise<Result> {
  try {
    await setCategoryFactor(id, factor);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}