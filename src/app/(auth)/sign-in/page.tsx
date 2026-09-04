"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justVerified = searchParams.get("verified") === "1";

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      // ONE message for every failure: no such user, wrong password,
      // unverified, blocked. Same principle as signup - nothing leaks.
      if (!result || result.error) {
        setError("Incorrect email or password.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  const field =
    "w-full bg-transparent border border-line px-4 py-3.5 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";

  return (
    <>
      <h1 className="font-display text-5xl font-light mb-2">Welcome back</h1>
      <p className="text-sm text-ink-soft mb-9">Sign in or create an account</p>

      {justVerified && (
        <p className="mb-7 border border-line px-4 py-3 text-sm text-ink-soft">
          Your email is verified. Sign in to continue.
        </p>
      )}

      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full border border-ink py-3.5 text-xs tracking-[0.2em] hover:bg-ink hover:text-bone transition-colors mb-7"
      >
        CONTINUE WITH GOOGLE
      </button>

      <div className="flex items-center gap-4 mb-7">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] tracking-[0.2em] text-ink-soft">OR</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-3 mb-5">
        <input
          className={field}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <input
            className={field + " pr-12"}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
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
      </div>

      <div className="flex justify-end mb-7">
        <Link
          href="/forgot-password"
          className="text-sm text-ink-soft hover:text-ink underline underline-offset-4"
        >
          Forgot password?
        </Link>
      </div>

      <button
        onClick={handleSubmit}
        disabled={pending}
        className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "SIGNING IN…" : "SIGN IN →"}
      </button>

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}

      <p className="mt-7 text-center text-sm text-ink-soft">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-ink underline underline-offset-4">
          Create one
        </Link>
      </p>
    </>
  );
}