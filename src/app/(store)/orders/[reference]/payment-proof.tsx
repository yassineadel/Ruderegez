"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/image-upload";
import { submitPaymentProofAction } from "@/modules/orders/actions";

export default function PaymentProof({ reference }: { reference: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [payRef, setPayRef] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!url) {
      setError("Please upload your transfer screenshot first.");
      return;
    }
    startTransition(async () => {
      const result = await submitPaymentProofAction({
        reference,
        screenshotUrl: url,
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
    <div className="mt-6 pt-6 border-t border-line">
      <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-3">
        SEND US THE RECEIPT
      </p>
      <p className="text-xs text-ink-soft leading-relaxed mb-4">
        Once you&apos;ve made the transfer, upload the screenshot here. We
        usually confirm within a few hours.
      </p>

      <ImageUpload
        value={url}
        onChange={setUrl}
        folder="payments"
        label="Upload your screenshot"
      />

      <input
        className="w-full mt-3 bg-transparent border border-line px-4 py-3 text-sm placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors"
        placeholder="Transfer reference number (optional)"
        value={payRef}
        onChange={(e) => setPayRef(e.target.value)}
      />

      <button
        onClick={submit}
        disabled={pending || !url}
        className="mt-4 w-full bg-ink text-bone py-3.5 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "SENDING…" : "SEND PROOF OF PAYMENT"}
      </button>

      {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
    </div>
  );
}