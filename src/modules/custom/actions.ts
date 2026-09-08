"use server";

import { revalidatePath } from "next/cache";
import { submitCustomRequest, type SubmitRequestInput } from "./service";
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