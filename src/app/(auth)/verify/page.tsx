"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyAction } from "@/modules/auth/actions";

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await verifyAction({ email, code });
      if (!result.ok) return setError(result.error);
      router.push("/sign-in?verified=1");
    });
  }

  return (
    <>
      <h1 className="font-display text-5xl font-light mb-2">Check your email</h1>
      <p className="text-sm text-ink-soft mb-9">
        We sent a 6-digit code to {email || "your email address"}
      </p>

      <input
        className="w-full bg-transparent border border-line px-4 py-4 mb-7
                   text-center text-2xl tracking-[0.5em] font-display
                   placeholder:text-ink-soft placeholder:tracking-normal placeholder:text-base
                   focus:outline-none focus:border-ink transition-colors"
        placeholder="Enter code"
        value={code}
        inputMode="numeric"
        maxLength={6}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
      />

      <button
        onClick={handleSubmit}
        disabled={pending || code.length !== 6}
        className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em]
                   disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "VERIFYING…" : "VERIFY EMAIL →"}
      </button>

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}

      <p className="mt-7 text-center text-sm text-ink-soft">
        The code expires in 10 minutes.
      </p>
    </>
  );
}