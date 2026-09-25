"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  hideReviewAction,
  unhideReviewAction,
} from "@/modules/admin/reviews-actions";

const HIDE_REASONS = [
  "Abusive or offensive language.",
  "Spam or advertising.",
  "Contains personal information.",
  "Not about this product.",
];

export default function ReviewControls({
  id,
  isHidden,
}: {
  id: string;
  isHidden: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hiding, setHiding] = useState(false);
  const [reason, setReason] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setHiding(false);
      setReason("");
      router.refresh();
    });
  }

  if (isHidden) {
    return (
      <div>
        <button
          onClick={() => run(() => unhideReviewAction(id))}
          disabled={pending}
          className="border border-ink px-5 py-2 text-xs tracking-[0.15em] disabled:opacity-40 hover:bg-ink hover:text-bone transition-colors"
        >
          {pending ? "RESTORING…" : "RESTORE"}
        </button>
        {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
      </div>
    );
  }

  if (!hiding) {
    return (
      <button
        onClick={() => setHiding(true)}
        className="text-xs text-ink-soft hover:text-ink underline underline-offset-4"
      >
        Hide this review
      </button>
    );
  }

  return (
    <div className="space-y-3 max-w-md">
      <div className="flex flex-wrap gap-2">
        {HIDE_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={
              "border px-3 py-1.5 text-xs transition-colors " +
              (reason === r
                ? "border-ink bg-ink text-bone"
                : "border-line hover:border-ink")
            }
          >
            {r}
          </button>
        ))}
      </div>
      <input
        className="w-full bg-transparent border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-ink transition-colors"
        placeholder="Or write a reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-3">
        <button
          onClick={() => run(() => hideReviewAction({ id, reason }))}
          disabled={pending || !reason.trim()}
          className="bg-ink text-bone px-5 py-2 text-xs tracking-[0.15em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {pending ? "HIDING…" : "HIDE"}
        </button>
        <button
          onClick={() => {
            setHiding(false);
            setReason("");
            setError(null);
          }}
          className="text-xs text-ink-soft hover:text-ink underline underline-offset-4"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-800">{error}</p>}
    </div>
  );
}