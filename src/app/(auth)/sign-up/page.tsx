"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupAction } from "@/modules/auth/actions";
import { Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await signupAction({ name, email, password });
      if (!result.ok) return setError(result.error);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    });
  }

  const field =
    "w-full bg-transparent border border-line px-4 py-3.5 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";

  return (
    <>
      <h1 className="font-display text-5xl font-light mb-2">Create account</h1>
      <p className="text-sm text-ink-soft mb-9">
        Join us to design your own piece
      </p>

      <button className="w-full border border-ink py-3.5 text-xs tracking-[0.2em] hover:bg-ink hover:text-bone transition-colors mb-7">
        CONTINUE WITH GOOGLE
      </button>

      <div className="flex items-center gap-4 mb-7">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] tracking-[0.2em] text-ink-soft">OR</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-3 mb-7">
        <input
          className={field}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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

      <button
        onClick={handleSubmit}
        disabled={pending}
        className="w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "CREATING…" : "CREATE ACCOUNT →"}
      </button>

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}

      <p className="mt-7 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}