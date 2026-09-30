"use server";

import { revalidatePath } from "next/cache";
import { createPromo, setPromoActive, deletePromo, type CreatePromoInput } from "./service";
import { PROMO_MESSAGES, toPromoMessage, type Result } from "./errors";

function fail(err: unknown): { ok: false; error: string } {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!PROMO_MESSAGES[code]) console.error("[admin promos]", err);
  return { ok: false, error: toPromoMessage(code) };
}

export async function createPromoAction(
  input: CreatePromoInput,
): Promise<Result<{ code: string }>> {
  try {
    const promo = await createPromo(input);
    revalidatePath("/admin/promos");
    return { ok: true, data: { code: promo.code } };
  } catch (err) {
    return fail(err);
  }
}

export async function setPromoActiveAction(id: string, isActive: boolean): Promise<Result> {
  try {
    await setPromoActive(id, isActive);
    revalidatePath("/admin/promos");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deletePromoAction(id: string): Promise<Result> {
  try {
    await deletePromo(id);
    revalidatePath("/admin/promos");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
