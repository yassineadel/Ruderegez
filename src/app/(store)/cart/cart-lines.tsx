"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { formatEGP } from "@/lib/money";
import { setQuantityAction, removeFromCartAction } from "@/modules/cart/actions";
import type { CartLine } from "@/modules/cart/service";

export default function CartLines({ lines }: { lines: CartLine[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(itemId: string, quantity: number) {
    setError(null);
    startTransition(async () => {
      const result = await setQuantityAction(itemId, quantity);
      if (!result.ok) setError(result.error);
    });
  }

  function remove(itemId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeFromCartAction(itemId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      {error && <p className="mb-6 text-sm text-red-800">{error}</p>}

      <ul className={pending ? "opacity-60 transition-opacity" : ""}>
        {lines.map((line) => (
          <li
            key={line.id}
            className="flex gap-5 py-8 border-b border-line first:pt-0"
          >
            <Link
              href={`/products/${line.slug}`}
              className="w-24 sm:w-32 aspect-[4/5] bg-bone-deep shrink-0 overflow-hidden"
            >
              {line.imageUrl && (
                <img
                  src={line.imageUrl}
                  alt={line.name}
                  className="h-full w-full object-cover"
                />
              )}
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-1">
                    {line.typeName.toUpperCase()}
                  </p>
                  <Link href={`/products/${line.slug}`} className="text-sm">
                    {line.name}
                  </Link>
                  {line.size && (
                    <p className="text-xs text-ink-soft mt-1">Size {line.size}</p>
                  )}
                </div>

                <button
                  onClick={() => remove(line.id)}
                  disabled={pending}
                  className="text-ink-soft hover:text-ink transition-colors shrink-0"
                  aria-label="Remove"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-end justify-between mt-5">
                <div className="flex items-center border border-line">
                  <button
                    onClick={() => change(line.id, line.quantity - 1)}
                    disabled={pending}
                    className="px-3 py-2 hover:bg-bone-deep transition-colors disabled:opacity-40"
                    aria-label="Decrease"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-4 text-sm tabular-nums">{line.quantity}</span>
                  <button
                    onClick={() => change(line.id, line.quantity + 1)}
                    disabled={pending || line.quantity >= 20}
                    className="px-3 py-2 hover:bg-bone-deep transition-colors disabled:opacity-40"
                    aria-label="Increase"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-sm">{formatEGP(line.lineTotalMinor)}</p>
                  {line.quantity > 1 && (
                    <p className="text-xs text-ink-soft mt-0.5">
                      {formatEGP(line.unitPriceMinor)} each
                    </p>
                  )}
                </div>
              </div>

              {line.priceChanged && (
                <p className="mt-3 text-xs text-ink-soft">
                  The silver rate has moved since you added this. The price
                  above is current.
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}