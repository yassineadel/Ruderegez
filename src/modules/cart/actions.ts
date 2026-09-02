"use server";

import { revalidatePath } from "next/cache";
import { addToCart, setQuantity, removeFromCart } from "./service";
import { toCartMessage, type Result } from "./errors";

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (code === "UNKNOWN") console.error("[cart]", err);
  return { ok: false, error: toCartMessage(code) };
}

export async function addToCartAction(input: {
  productId: string;
  size?: string;
  quantity?: number;
}): Promise<Result> {
  try {
    await addToCart(input);
    revalidatePath("/cart");
    revalidatePath("/", "layout"); // header badge
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setQuantityAction(
  itemId: string,
  quantity: number,
): Promise<Result> {
  try {
    await setQuantity(itemId, quantity);
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function removeFromCartAction(itemId: string): Promise<Result> {
  try {
    await removeFromCart(itemId);
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}