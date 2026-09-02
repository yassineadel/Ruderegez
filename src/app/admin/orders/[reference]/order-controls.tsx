"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/generated/prisma/client";
import { fromMinor } from "@/lib/money";
import {
  changeStatusAction,
  confirmPaymentAction,
} from "@/modules/admin/orders-actions";

export default function OrderControls({
  reference,
  allowedNext,
  awaitingPayment,
  depositDueMinor,
  labels,
}: {
  reference: string;
  allowedNext: OrderStatus[];
  awaitingPayment: boolean;
  depositDueMinor: number;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(String(fromMinor(depositDueMinor as never)));
  const [payRef, setPayRef] = useState("");
  const [note, setNote] = useState("");

  const field =
    "w-full bg-transparent border border-line px-3 py-2.5 text-sm " +
    "focus:outline-none focus:border-ink transition-colors";

  function move(toStatus: OrderStatus) {
    setError(null);
    if (toStatus === "CANCELLED" && !note.trim()) {
      setError("Please give a reason for cancelling.");
      return;
    }
    startTransition(async () => {
      const result = await changeStatusAction({ reference, toStatus, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  function pay() {
    setError(null);
    const egp = Number(amount);
    if (!Number.isFinite(egp) || egp <= 0) {
      setError("Enter the amount received.");
      return;
    }
    startTransition(async () => {
      const result = await confirmPaymentAction({
        reference,
        amountMinor: Math.round(egp * 100),
        referenceNumber: payRef || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      {awaitingPayment && (
        <div className="border border-ink p-6">
          <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
            RECORD PAYMENT
          </h2>
          <div className="space-y-3">
            <label className="block">
              <span className="block text-xs text-ink-soft mb-1.5">
                Amount received (EGP)
              </span>
              <input
                className={field}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="block text-xs text-ink-soft mb-1.5">
                Transfer reference (optional)
              </span>
              <input
                className={field}
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="From the InstaPay receipt"
              />
            </label>
          </div>
          <button
            onClick={pay}
            disabled={pending}
            className="mt-4 w-full bg-ink text-bone py-3 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {pending ? "SAVING…" : "CONFIRM PAYMENT"}
          </button>
          <p className="text-xs text-ink-soft mt-3 leading-relaxed">
            Confirming moves the order to Confirmed and records who did it.
          </p>
        </div>
      )}

      {allowedNext.length > 0 && (
        <div className="border border-line p-6">
          <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
            MOVE ORDER
          </h2>

          <label className="block mb-4">
            <span className="block text-xs text-ink-soft mb-1.5">
              Note (required to cancel)
            </span>
            <textarea
              className={field + " min-h-16 resize-y"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          <div className="space-y-2">
            {allowedNext.map((s) => (
              <button
                key={s}
                onClick={() => move(s)}
                disabled={pending}
                className={
                  "w-full py-3 text-xs tracking-[0.2em] transition-colors disabled:opacity-40 " +
                  (s === "CANCELLED"
                    ? "border border-red-800 text-red-800 hover:bg-red-800 hover:text-bone"
                    : "border border-ink hover:bg-ink hover:text-bone")
                }
              >
                {labels[s].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-800">{error}</p>}
    </div>
  );
}