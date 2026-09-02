"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import { addToCartAction } from "@/modules/cart/actions";

interface SizeOption {
  id: string;
  label: string;
  priceMinor: Minor;
}

export default function AddToBag({
  productId,
  sizes,
  basePriceMinor,
}: {
  productId: string;
  sizes: SizeOption[];
  basePriceMinor: Minor;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const hasSizes = sizes.length > 0;
  const price = hasSizes
    ? (sizes.find((s) => s.label === selected)?.priceMinor ?? null)
    : basePriceMinor;

  function handleAdd() {
    setError(null);
    setAdded(false);

    if (hasSizes && !selected) {
      setError("Please choose a size first.");
      return;
    }

    startTransition(async () => {
      const result = await addToCartAction({
        productId,
        size: selected ?? undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdded(true);
      router.refresh();
    });
  }

  return (
    <>
      <p className="text-2xl font-light mb-8">
        {price !== null ? (
          formatEGP(price)
        ) : (
          <>
            from{" "}
            {formatEGP(
              Math.min(...sizes.map((s) => s.priceMinor)) as Minor,
            )}
          </>
        )}
      </p>

      {hasSizes && (
        <div className="mb-8">
          <p className="text-xs tracking-[0.15em] text-ink-soft mb-3">SIZE</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s.label);
                  setError(null);
                }}
                className={
                  "border px-5 py-3 text-sm transition-colors " +
                  (selected === s.label
                    ? "border-ink bg-ink text-bone"
                    : "border-line hover:border-ink")
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={pending}
        className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "ADDING…" : "ADD TO BAG →"}
      </button>

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}
      {added && (
        <p className="mt-4 text-sm text-ink-soft">
          Added to your bag.{" "}
          <a href="/cart" className="text-ink underline underline-offset-4">
            View bag
          </a>
        </p>
      )}
    </>
  );
}