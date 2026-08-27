"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordAction } from "@/modules/auth/actions";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field =
    "w-full bg-transparent border border-line px-4 py-3.5 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";

  function handleSubmit() {
    setError(null);

    // Checked here, not in Zod — the confirm field never leaves the browser.
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordAction({ token, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/sign-in?reset=1");
    });
  }

  // Someone reached this page without a link.
  if (!token) {
    return (
      <>
        <h1 className="font-display text-5xl font-light mb-2">Invalid link</h1>
        <p className="text-sm text-ink-soft mb-9">
          This page needs a reset link to work. Request a new one and try again.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full bg-ink text-bone py-4 text-center text-xs tracking-[0.2em] hover:opacity-90 transition-opacity"
        >
          REQUEST A NEW LINK →
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-5xl font-light mb-2">New password</h1>
      <p className="text-sm text-ink-soft mb-9">
        Choose a password of at least 8 characters
      </p>

      <div className="space-y-3 mb-7">
        <div className="relative">
          <input
            className={field + " pr-12"}
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <input
          className={field}
          type={showPassword ? "text" : "password"}
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={pending || password.length === 0 || confirm.length === 0}
        className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "SAVING…" : "SET NEW PASSWORD →"}
      </button>

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}

      <p className="mt-7 text-center text-sm text-ink-soft">
        <Link href="/sign-in" className="text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </>
  );
}