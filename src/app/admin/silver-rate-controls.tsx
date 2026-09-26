"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  syncSilverRateNowAction,
  approveHeldRateAction,
  dismissHeldRateAction,
} from "@/modules/pricing/rate-sync-actions";

const OUTCOME: Record<string, string> = {
  UNCHANGED: "Checked - the price moved less than 0.5%, so the rate stays.",
  APPLIED: "Rate updated. Every price in the store now uses it.",
  HELD: "The price moved more than 40% - it's waiting for your approval below.",
};

/**
 * Without heldId: the "Update now" button.
 * With heldId:    Approve / Dismiss for a held rate.
 */
export default function SilverRateControls({ heldId }: { heldId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setIsError(true);
        setMessage(result.error ?? "Something went wrong.");
        return;
      }
      const outcome = result.data as { result?: string; message?: string } | undefined;
      if (outcome?.result === "FAILED") {
        setIsError(true);
        setMessage(`Update failed - ${outcome.message}`);
      } else if (outcome?.result) {
        setIsError(false);
        setMessage(OUTCOME[outcome.result] ?? null);
      }
      router.refresh();
    });
  }

  const button =
    "px-6 py-3 text-xs tracking-[0.2em] disabled:opacity-40 transition-colors";

  if (heldId) {
    return (
      <div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => run(() => approveHeldRateAction(heldId))}
            disabled={pending}
            className={`${button} bg-ink text-bone hover:opacity-90`}
          >
            {pending ? "…" : "APPLY THIS RATE"}
          </button>
          <button
            onClick={() => run(() => dismissHeldRateAction())}
            disabled={pending}
            className={`${button} border border-ink hover:bg-ink hover:text-bone`}
          >
            DISMISS
          </button>
        </div>
        {message && (
          <p className={`mt-3 text-xs ${isError ? "text-red-800" : "text-ink-soft"}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-xs">
      <button
        onClick={() => run(() => syncSilverRateNowAction())}
        disabled={pending}
        className={`${button} border border-ink hover:bg-ink hover:text-bone`}
      >
        {pending ? "CHECKING…" : "UPDATE NOW"}
      </button>
      {message && (
        <p className={`mt-3 text-xs leading-relaxed ${isError ? "text-red-800" : "text-ink-soft"}`}>
          {message}
        </p>
      )}
    </div>
  );
}