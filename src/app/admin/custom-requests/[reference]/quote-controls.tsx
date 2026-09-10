"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import {
  startReviewAction,
  quoteRequestAction,
  rejectCustomRequestAction,
} from "@/modules/admin/custom-actions";

/** BRD 6.3 names copyright as a required ground — a customer uploading a club
 *  crest or a brand logo puts the legal risk on the shop. */
const REJECT_REASONS = [
  "The design is copyrighted or trademarked, so we can't make it.",
  "This isn't something we can make in silver.",
  "The photos don't show enough for us to quote.",
];

export default function QuoteControls({
  reference,
  status,
  silverRatePerGram,
  tolerancePercent,
  defaultWeightG,
  defaultLeadTimeDays,
  defaultNote,
}: {
  reference: string;
  status: string;
  silverRatePerGram: number;
  tolerancePercent: number;
  defaultWeightG: number;
  defaultLeadTimeDays: number;
  defaultNote: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [weightG, setWeightG] = useState(defaultWeightG);
  const [factor, setFactor] = useState(2.5);
  const [override, setOverride] = useState("");
  const [leadTime, setLeadTime] = useState(defaultLeadTimeDays);
  const [note, setNote] = useState(defaultNote);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const field =
    "w-full bg-transparent border border-line px-3 py-2.5 text-sm " +
    "focus:outline-none focus:border-ink transition-colors";
  const label = "block text-xs text-ink-soft mb-1.5";

  /** Mirrors calculateitemprice so the price moves as he types. */
  const computed = (() => {
    const weightMg = Math.round(weightG * 1000);
    const charged = Math.round((weightMg * (100 + tolerancePercent)) / 100);
    return Math.round(
      (charged * Math.round(factor * 10000) * silverRatePerGram) / 10000000,
    );
  })();

  const finalPrice = override ? Math.round(Number(override) * 100) : computed;

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
    <div className="space-y-6">
      {status === "SUBMITTED" && (
        <button
          onClick={() => run(() => startReviewAction(reference))}
          disabled={pending}
          className="w-full border border-ink py-3 text-xs tracking-[0.2em] hover:bg-ink hover:text-bone transition-colors disabled:opacity-40"
        >
          MARK AS REVIEWING
        </button>
      )}

      <div className="border border-ink p-6">
        <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
          {status === "QUOTED" ? "REVISE THE QUOTE" : "QUOTE THIS"}
        </h2>

        <div className="space-y-3">
          <label className="block">
            <span className={label}>Weight (grams)</span>
            <input
              className={field}
              type="number"
              step="0.1"
              value={weightG}
              onChange={(e) => setWeightG(Number(e.target.value))}
            />
          </label>

          <label className="block">
            <span className={label}>Factor</span>
            <input
              className={field}
              type="number"
              step="0.1"
              value={factor}
              onChange={(e) => setFactor(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="mt-4 pt-4 border-t border-line">
          <p className="text-xs text-ink-soft mb-1">Computed price</p>
          <p className="font-display text-2xl font-light">
            {formatEGP(computed as Minor)}
          </p>
          <p className="text-xs text-ink-soft mt-2 leading-relaxed">
            {weightG}g × {factor} at {formatEGP(silverRatePerGram as Minor)}/g,
            plus {tolerancePercent}% tolerance.
          </p>
        </div>

        <label className="block mt-4">
          <span className={label}>Override the price (EGP, optional)</span>
          <input
            className={field}
            type="number"
            step="0.01"
            placeholder="Leave blank to use the computed price"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          />
        </label>

        <label className="block mt-3">
          <span className={label}>Lead time (days)</span>
          <input
            className={field}
            type="number"
            value={leadTime}
            onChange={(e) => setLeadTime(Number(e.target.value))}
          />
        </label>

        <label className="block mt-3">
          <span className={label}>Note to the customer</span>
          <textarea
            className={field + " min-h-20 resize-y"}
            placeholder="Anything they should know. Quotes are not automatically time-limited, so say here if this one is."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <button
          onClick={() =>
            run(() =>
              quoteRequestAction({
                reference,
                weightG,
                factor,
                overrideEgp: override ? Number(override) : null,
                leadTimeDays: leadTime,
                note,
              }),
            )
          }
          disabled={pending || finalPrice <= 0}
          className="mt-5 w-full bg-ink text-bone py-3 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {pending ? "SENDING…" : `SEND QUOTE — ${formatEGP(finalPrice as Minor)}`}
        </button>
      </div>

      <div className="border border-line p-6">
        {!rejecting ? (
          <button
            onClick={() => setRejecting(true)}
            className="w-full border border-red-800 text-red-800 py-3 text-xs tracking-[0.2em] hover:bg-red-800 hover:text-bone transition-colors"
          >
            REJECT THIS REQUEST
          </button>
        ) : (
          <>
            <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-3">
              WHY?
            </h2>
            <div className="space-y-2 mb-3">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={
                    "w-full text-left border p-3 text-xs leading-relaxed transition-colors " +
                    (reason === r
                      ? "border-ink bg-bone-deep"
                      : "border-line hover:border-ink")
                  }
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              className={field + " min-h-20 resize-y"}
              placeholder="Or write your own — the customer sees this."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setRejecting(false)}
                className="flex-1 border border-line py-3 text-xs tracking-[0.15em] hover:border-ink transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() =>
                  run(() => rejectCustomRequestAction({ reference, reason }))
                }
                disabled={pending || !reason.trim()}
                className="flex-[2] border border-red-800 text-red-800 py-3 text-xs tracking-[0.15em] hover:bg-red-800 hover:text-bone transition-colors disabled:opacity-40"
              >
                CONFIRM REJECTION
              </button>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-800">{error}</p>}
    </div>
  );
}