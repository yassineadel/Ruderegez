"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "./service";
import { toAdminMessage, type Result } from "./errors";

export async function updateSettingsAction(
  submitted: Record<string, string>,
): Promise<Result<{ changed: number }>> {
  try {
    const result = await updateSettings(submitted);

    revalidatePath("/", "layout");

    return { ok: true, data: result };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[updateSettingsAction]", err);
    return { ok: false, error: toAdminMessage(code) };
  }
}