"use server";

import { revalidatePath } from "next/cache";
import {
  createSlide,
  setSlideActive,
  deleteSlide,
  moveSlide,
  setSliderTitle,
  type CreateSlideInput,
} from "./service";
import { HOMEPAGE_MESSAGES, toHomepageMessage, type Result } from "./errors";

function fail(err: unknown): Result {
  const code = err instanceof Error ? err.message : "UNKNOWN";
  if (!HOMEPAGE_MESSAGES[code]) console.error("[homepage slider]", err);
  return { ok: false, error: toHomepageMessage(code) };
}

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
    revalidatePath("/admin/homepage");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createSlideAction(input: CreateSlideInput): Promise<Result> {
  return run(() => createSlide(input));
}

export async function setSlideActiveAction(id: string, isActive: boolean): Promise<Result> {
  return run(() => setSlideActive(id, isActive));
}

export async function deleteSlideAction(id: string): Promise<Result> {
  return run(() => deleteSlide(id));
}

export async function moveSlideAction(id: string, direction: "up" | "down"): Promise<Result> {
  return run(() => moveSlide(id, direction));
}

export async function setSliderTitleAction(title: string): Promise<Result> {
  return run(() => setSliderTitle(title));
}
