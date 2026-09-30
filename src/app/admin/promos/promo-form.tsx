"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPromoAction } from "@/modules/promos/actions";

const field =
  "w-full bg-transparent border border-line px-4 py-3 text-sm " +
  "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";
const label = "block text-[10px] tracking-[0.2em] text-ink-soft mb-2";

/** Letters without look-alikes (no O/0, I/1), so a code read aloud still works. */
function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** "" -> null, otherwise the number (NaN stays NaN so the server refuses it). */
function num(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

/** datetime-local is the admin's own clock (Cairo) - convert here, in the browser. */
function iso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export default function PromoForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [perCustomer, setPerCustomer] = useState("1");
  const [minOrder, setMinOrder] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    startTransition(async () => {
      const result = await createPromoAction({
        code,
        percentOff: Number(percent),
        startsAt: iso(startsAt),
        expiresAt: iso(expiresAt),
        maxUses: num(maxUses),
        maxUsesPerCustomer: num(perCustomer),
        minSubtotalEgp: num(minOrder),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreated(result.data?.code ?? code.toUpperCase());
      setCode("");
      setPercent("");
      setStartsAt("");
      setExpiresAt("");
      setMaxUses("");
      setPerCustomer("1");
      setMinOrder("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="border border-line p-6 max-w-4xl">
      <h2 className="font-display text-2xl font-light mb-6">New code</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="promo-code">CODE</label>
          <div className="flex gap-2">
            <input
              id="promo-code"
              className={field + " font-mono uppercase placeholder:normal-case"}
              placeholder="e.g. EID25"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
              required
            />
            <button
              type="button"
              onClick={() => setCode(randomCode())}
              className="shrink-0 border border-line px-3 text-xs text-ink-soft hover:border-ink hover:text-ink transition-colors"
            >
              Generate
            </button>
          </div>
        </div>

        <div>
          <label className={label} htmlFor="promo-percent">DISCOUNT %</label>
          <input
            id="promo-percent"
            className={field}
            type="number"
            min={1}
            max={90}
            step={1}
            placeholder="1 to 90"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={label} htmlFor="promo-starts">STARTS (OPTIONAL)</label>
          <input
            id="promo-starts"
            className={field}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>

        <div>
          <label className={label} htmlFor="promo-ends">ENDS (OPTIONAL)</label>
          <input
            id="promo-ends"
            className={field}
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <div>
          <label className={label} htmlFor="promo-max">TOTAL USES</label>
          <input
            id="promo-max"
            className={field}
            type="number"
            min={1}
            step={1}
            placeholder="Unlimited"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>

        <div>
          <label className={label} htmlFor="promo-per">USES PER CUSTOMER</label>
          <input
            id="promo-per"
            className={field}
            type="number"
            min={1}
            step={1}
            placeholder="Unlimited"
            value={perCustomer}
            onChange={(e) => setPerCustomer(e.target.value)}
          />
        </div>

        <div>
          <label className={label} htmlFor="promo-min">MINIMUM ORDER, EGP</label>
          <input
            id="promo-min"
            className={field}
            type="number"
            min={1}
            step="0.01"
            placeholder="No minimum"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-ink-soft mt-5 leading-relaxed">
        Leave a limit empty for no limit. The minimum is checked against the
        pieces before the discount, without delivery.
      </p>

      <div className="flex items-center gap-5 mt-6">
        <button
          type="submit"
          disabled={pending || !code.trim() || !percent}
          className="bg-ink text-bone px-8 py-3.5 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {pending ? "CREATING…" : "CREATE CODE"}
        </button>
        {created && (
          <p className="text-sm">
            <span className="font-mono">{created}</span> is live.
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-800">{error}</p>}
    </form>
  );
}
