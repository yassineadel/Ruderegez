"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestResetAction } from "@/modules/auth/actions";

export default function ForgotPasswordPage() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await requestResetAction({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  const field =
    "w-full bg-transparent border border-line px-4 py-3.5 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";

  // Deliberately identical whether or not the address has an account.
  if (sent) {
    return (
      <>
        <h1 className="font-display text-5xl font-light mb-2">Check your email</h1>
        <p className="text-sm text-ink-soft mb-9">
          If an account exists for {email}, we&apos;ve sent a link to reset your
          password. It expires in 30 minutes.
        </p>

        <p className="mb-7 border border-line px-4 py-3 text-sm text-ink-soft">
          Nothing arrived? Check your spam folder, or{" "}
          <button
            onClick={() => setSent(false)}
            className="text-ink underline underline-offset-4"
          >
            try a different address
          </button>
          .
        </p>

        <Link
          href="/sign-in"
          className="block w-full border border-ink py-3.5 text-center text-xs tracking-[0.2em] hover:bg-ink hover:text-bone transition-colors"
        >
          BACK TO SIGN IN
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-5xl font-light mb-2">Forgot password</h1>
      <p className="text-sm text-ink-soft mb-9">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <div className="mb-5">
        <input
          className={field}
          type="email"
          placeholder="Email"
          value={email}
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={pending || email.length === 0}
        className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "SENDING…" : "SEND RESET LINK →"}
      </button>

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}

      <p className="mt-7 text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/sign-in" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}