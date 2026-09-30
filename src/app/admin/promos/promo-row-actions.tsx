"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPromoActiveAction, deletePromoAction } from "@/modules/promos/actions";

export default function PromoRowActions({
  id,
  code,
  isActive,
  canDelete,
}: {
  id: string;
  code: string;
  isActive: boolean;
  /** Only a code no order has used. */
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="text-right">
      <div className="flex items-center gap-4 justify-end">
        <button
          onClick={() => run(() => setPromoActiveAction(id, !isActive))}
          disabled={pending}
          className="border border-ink px-5 py-2 text-xs tracking-[0.15em] disabled:opacity-40 hover:bg-ink hover:text-bone transition-colors"
        >
          {isActive ? "SWITCH OFF" : "SWITCH ON"}
        </button>
        {canDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete ${code}? This can't be undone.`)) {
                run(() => deletePromoAction(id));
              }
            }}
            disabled={pending}
            className="text-xs text-ink-soft hover:text-red-800 underline underline-offset-4 disabled:opacity-40"
          >
            Delete
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-800 max-w-xs">{error}</p>}
    </div>
  );
}
