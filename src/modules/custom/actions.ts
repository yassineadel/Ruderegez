"use server";

import { revalidatePath } from "next/cache";
import { listDesignsForType, type DesignPick } from "@/modules/catalog/service";
import {
  submitCustomRequest,
  getSizeOptions,
  type SubmitRequestInput,
  type SizeOption,
} from "./service";
import { toCustomMessage, type Result } from "./errors";

export async function submitCustomRequestAction(
  input: SubmitRequestInput,
): Promise<Result<{ reference: string }>> {
  try {
    const created = await submitCustomRequest(input);
    revalidatePath("/account");
    revalidatePath("/admin/custom-requests");
    return { ok: true, data: created };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[submitCustomRequestAction]", err);
    return { ok: false, error: toCustomMessage(code) };
  }
}

/** Step 3 of the form - the pieces in the chosen category. */
export async function listDesignsAction(
  typeId: string,
): Promise<Result<DesignPick[]>> {
  try {
    return { ok: true, data: await listDesignsForType(typeId) };
  } catch (err) {
    console.error("[listDesignsAction]", err);
    return { ok: false, error: toCustomMessage("UNKNOWN") };
  }
}

/** Details step - the category's sizes, each with its weight and estimate. */
export async function listSizeOptionsAction(
  typeId: string,
  baseProductId: string | null,
): Promise<Result<SizeOption[]>> {
  try {
    return { ok: true, data: await getSizeOptions(typeId, baseProductId) };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[listSizeOptionsAction]", err);
    return { ok: false, error: toCustomMessage(code) };
  }
}