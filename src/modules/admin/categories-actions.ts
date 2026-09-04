"use server";

import { revalidatePath } from "next/cache";
import {
  addCategory,
  renameCategory,
  setCategoryActive,
  removeCategory,
  moveCategory,
} from "./categories-service";
import { type Result } from "./errors";

const MESSAGES: Record<string, string> = {
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