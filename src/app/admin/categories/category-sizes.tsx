"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  addCategorySizeAction,
  removeCategorySizeAction,
  setCategoryFactorAction,
} from "@/modules/admin/categories-actions";

export interface SizeRow {
  id: string;
  label: string;
  weightG: number;
}

/**
 * The sizes a customer can pick on the custom request form, each with the
 * fixed weight that drives the estimate. Plus the factor used to estimate
 * NEW designs in this category (an altered Ruderegez piece uses its own).
 */
export default function CategorySizes({
  categoryId,
  sizes,
  customFactor,
}: {
  categoryId: string;
  sizes: SizeRow[];
  customFactor: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [weight, setWeight] = useState("");
  const [factor, setFactor] = useState(customFactor?.toString() ?? "");

  const field =
    "bg-transparent border border-line px-3 py-2 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function addSize() {
    run(
      () => addCategorySizeAction(categoryId, label, Number(weight)),
      () => {
        setLabel("");
        setWeight("");
      },
    );
  }

  return (
    <div className="px-4 py-5 bg-bone-deep/40 border-t border-line space-y-6">
      {/* ---------------- sizes ---------------- */}
      <div>
        <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-3">
          SIZES FOR CUSTOM REQUESTS
        </p>

        {sizes.length === 0 ? (
          <p className="text-xs text-ink-soft mb-3">
            No sizes yet - customers won&apos;t see a size choice for this
            category.
          </p>
        ) : (
          <div className="border border-line mb-3">
            {sizes.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 px-3 py-2 border-b border-line last:border-0 text-sm"
              >
                <span className="flex-1">{s.label}</span>
                <span className="text-ink-soft">{s.weightG} g</span>
                <button
                  onClick={() => run(() => removeCategorySizeAction(s.id))}
                  disabled={pending}
                  className="p-1 text-ink-soft hover:text-red-800 transition-colors disabled:opacity-40"
                  aria-label={`Delete size ${s.label}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            className={field + " flex-1 min-w-32"}
            placeholder="Label - e.g. 1.5 cm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className={field + " w-32"}
            type="number"
            step="0.1"
            placeholder="Weight (g)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && label.trim() && weight) addSize();
            }}
          />
          <button
            onClick={addSize}
            disabled={pending || !label.trim() || !weight}
            className="bg-ink text-bone px-5 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            ADD SIZE
          </button>
        </div>
      </div>

      {/* ---------------- factor ---------------- */}
      <div>
        <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-3">
          FACTOR FOR NEW DESIGNS
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            className={field + " w-32"}
            type="number"
            step="0.1"
            placeholder="e.g. 2.5"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
          />
          <button
            onClick={() =>
              run(() =>
                setCategoryFactorAction(categoryId, factor ? Number(factor) : null),
              )
            }
            disabled={pending}
            className="border border-ink px-5 py-2 text-xs tracking-[0.2em] disabled:opacity-40 hover:bg-ink hover:text-bone transition-colors"
          >
            SAVE
          </button>
        </div>
        <p className="text-xs text-ink-soft mt-2 leading-relaxed">
          Used for the estimated price on a new design. Altering an existing
          piece uses that piece&apos;s own factor. Leave empty to show weight
          only, with no price.
        </p>
      </div>

      {error && <p className="text-sm text-red-800">{error}</p>}
    </div>
  );
}