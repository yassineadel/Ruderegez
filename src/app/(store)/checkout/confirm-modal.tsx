"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import { renderNotice } from "./terms-notice";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  pending,
  error,
  totalMinor,
  depositMinor,
  depositPercent,
  city,
  leadTimeDays,
  notice,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
  totalMinor: Minor;
  depositMinor: Minor;
  depositPercent: number;
  city: string;
  leadTimeDays: number;
  notice?: string;
}) {
  const [accepted, setAccepted] = useState(false);

  // Reset each time it opens — if they closed it, changed the address and
  // reopened, they should be confirming against what they are buying now.
  useEffect(() => {
    if (open) setAccepted(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, pending, onClose]);

  if (!open) return null;

  const lines = renderNotice(notice ?? "", {
    deposit: depositPercent,
    city,
    days: leadTimeDays,
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={() => !pending && onClose()}
    >
      <div
        className="bg-bone w-full max-w-md p-8 my-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-2">
              BEFORE YOU ORDER
            </p>
            <h2 className="font-display text-2xl font-light">
              A few things to know
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={pending}
            className="text-ink-soft hover:text-ink transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* The amount is the reason this gets read rather than clicked past. */}
        <dl className="flex justify-between text-sm border-y border-line py-4 mb-5">
          <div>
            <dt className="text-ink-soft text-xs mb-1">Paying now</dt>
            <dd className="text-lg">{formatEGP(depositMinor)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-ink-soft text-xs mb-1">Order total</dt>
            <dd className="text-lg">{formatEGP(totalMinor)}</dd>
          </div>
        </dl>

        <ul className="space-y-3 text-xs text-ink-soft leading-relaxed mb-6">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        <label className="flex items-start gap-3 cursor-pointer pt-5 border-t border-line">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-xs leading-relaxed">
            I understand the above and accept the{" "}
            <Link
              href="/policies/terms"
              target="_blank"
              className="text-ink underline underline-offset-4"
            >
              terms of sale
            </Link>{" "}
            and{" "}
            <Link
              href="/policies/returns"
              target="_blank"
              className="text-ink underline underline-offset-4"
            >
              returns policy
            </Link>
            .
          </span>
        </label>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 border border-line py-3.5 text-xs tracking-[0.15em] hover:border-ink transition-colors disabled:opacity-40"
          >
            GO BACK
          </button>
          <button
            onClick={onConfirm}
            disabled={pending || !accepted}
            className="flex-[2] bg-ink text-bone py-3.5 text-xs tracking-[0.15em] disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {pending ? "PLACING ORDER…" : "PLACE ORDER →"}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-800">{error}</p>}
      </div>
    </div>
  );
}
