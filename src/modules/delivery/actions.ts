"use server";

import { revalidatePath } from "next/cache";
import { createZone, updateZone, deleteZone, moveZone } from "./service";
import { DELIVERY_MESSAGES, toDeliveryMessage, type Result } from "./errors";

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!DELIVERY_MESSAGES[code]) console.error("[delivery zones]", err);
  return { ok: false, error: toDeliveryMessage(code) };
}

/** Areas show on the admin page, checkout, the cart and the footer. */
function revalidate() {
  revalidatePath("/admin/delivery");
  revalidatePath("/", "layout");
}

export async function createZoneAction(input: { name: string; feeEgp: number }): Promise<Result> {
  try {
    await createZone(input);
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateZoneAction(input: {
  id: string;
  name?: string;
  feeEgp?: number;
  isActive?: boolean;
}): Promise<Result> {
  try {
    await updateZone(input);
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteZoneAction(id: string): Promise<Result> {
  try {
    await deleteZone(id);
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function moveZoneAction(id: string, direction: "up" | "down"): Promise<Result> {
  try {
    await moveZone(id, direction);
    revalidate();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
