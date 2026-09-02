"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  toggleHidden,
  deleteProduct,
  type ProductFormInput,
} from "./products-service";
import { type Result } from "./errors";

const MESSAGES: Record<string, string> = {
  NAME_REQUIRED: "Please give the product a name.",
  DESCRIPTION_REQUIRED: "Please write a description of at least 10 characters.",
  TYPE_REQUIRED: "Please choose a category.",
  SLUG_INVALID: "The URL slug needs at least two letters or numbers.",
  SLUG_TAKEN: "Another product already uses that URL slug.",
  FLAT_PRICE_REQUIRED: "A fixed-price product needs a price.",
  WEIGHT_REQUIRED: "Please enter the silver weight in grams.",
  FACTOR_REQUIRED: "Please enter the pricing factor.",
  LEAD_TIME_INVALID: "Lead time must be a whole number of days.",
  DUPLICATE_SIZE: "Two sizes have the same label.",
  PRODUCT_NOT_FOUND: "That product no longer exists.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do that.",
};

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!MESSAGES[code]) console.error("[admin products]", err);
  return {
    ok: false,
    error: MESSAGES[code] ?? "Something went wrong. Please try again.",
  };
}

function revalidateAll(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/products/${slug}`);
}

export async function createProductAction(
  input: ProductFormInput,
): Promise<Result<{ id: string }>> {
  try {
    const created = await createProduct(input);
    revalidateAll(created.slug);
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateProductAction(
  input: ProductFormInput,
): Promise<Result<{ id: string }>> {
  try {
    const updated = await updateProduct(input);
    revalidateAll(updated.slug);
    return { ok: true, data: { id: updated.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function toggleHiddenAction(
  id: string,
  isHidden: boolean,
): Promise<Result> {
  try {
    await toggleHidden(id, isHidden);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProductAction(id: string): Promise<Result> {
  try {
    await deleteProduct(id);
    revalidateAll();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}