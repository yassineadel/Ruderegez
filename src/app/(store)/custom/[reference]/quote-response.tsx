"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  acceptQuoteAction,
  declineQuoteAction,
} from "@/modules/custom/accept-actions";

export default function QuoteResponse({ reference }: { reference: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);

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
    <div className="mt-8 pt-6 border-t border-line">
      {!confirmingDecline ? (
        <>
          <button
            onClick={() => run(() => acceptQuoteAction(reference))}
            disabled={pending}
            className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {pending ? "ADDING…" : "ACCEPT — ADD TO MY BAG →"}
          </button>

          <button
            onClick={() => setConfirmingDecline(true)}
            disabled={pending}
            className="mt-3 w-full text-xs tracking-[0.15em] text-ink-soft hover:text-ink transition-colors py-2 disabled:opacity-40"
          >
            NO THANKS
          </button>

          <p className="mt-4 text-xs text-ink-soft leading-relaxed">
            Accepting puts this in your bag at the price above. You still pay
            at checkout, and the price will not change.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft leading-relaxed mb-4">
            Declining closes this quote. You can always send a new request if
            you change your mind.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmingDecline(false)}
              disabled={pending}
              className="flex-1 border border-line py-3.5 text-xs tracking-[0.15em] hover:border-ink transition-colors disabled:opacity-40"
            >
              GO BACK
            </button>
            <button
              onClick={() => run(() => declineQuoteAction(reference))}
              disabled={pending}
              className="flex-1 border border-ink py-3.5 text-xs tracking-[0.15em] hover:bg-ink hover:text-bone transition-colors disabled:opacity-40"
            >
              {pending ? "…" : "DECLINE"}
            </button>
          </div>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}
    </div>
  );
}