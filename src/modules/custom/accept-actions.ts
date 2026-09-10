"use server";

import { revalidatePath } from "next/cache";
import { acceptQuote, declineQuote } from "./accept-service";
import { toCustomMessage, type Result } from "./errors";

function revalidate(reference: string) {
  revalidatePath(`/custom/${reference}`);
  revalidatePath("/cart");
  revalidatePath("/account");
  revalidatePath("/", "layout");
}

export async function acceptQuoteAction(reference: string): Promise<Result> {
  try {
    await acceptQuote(reference);
    revalidate(reference);
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[acceptQuoteAction]", err);
    return { ok: false, error: toCustomMessage(code) };
  }
}

export async function declineQuoteAction(reference: string): Promise<Result> {
  try {
    await declineQuote(reference);
    revalidate(reference);
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "UNKNOWN") console.error("[declineQuoteAction]", err);
    return { ok: false, error: toCustomMessage(code) };
  }
}