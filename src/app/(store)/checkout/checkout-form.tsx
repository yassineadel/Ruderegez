"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import type { CartLine } from "@/modules/cart/service";
import { placeOrderAction } from "@/modules/orders/actions";

type Method =
  | "DEPOSIT_THEN_CASH_ON_DELIVERY"
  | "FULL_INSTAPAY"
  | "DEPOSIT_THEN_PICKUP";

export default function CheckoutForm({
  lines,
  subtotalMinor,
  deliveryFeeMinor,
  depositPercent,
  city,
  defaultName,
}: {
  lines: CartLine[];
  subtotalMinor: Minor;
  deliveryFeeMinor: Minor;
  depositPercent: number;
  city: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<Method>("DEPOSIT_THEN_CASH_ON_DELIVERY");

  const total = (subtotalMinor + deliveryFeeMinor) as Minor;
  const deposit =
    method === "FULL_INSTAPAY"
      ? total
      : (Math.round((total * depositPercent) / 100) as Minor);
  const balance = (total - deposit) as Minor;

  const field =
    "w-full bg-transparent border border-line px-4 py-3.5 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await placeOrderAction({
        customerName: name,
        customerPhone: phone,
        addressLine: address,
        addressCity: city,
        addressNotes: notes || undefined,
        paymentMethod: method,
        expectedTotalMinor: total,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/orders/${result.data!.reference}`);
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-12 lg:gap-20 items-start">
      {/* ---------------- left: details ---------------- */}
      <div className="max-w-lg">
        <h2 className="font-display text-2xl font-light mb-6">Delivery</h2>

        <div className="space-y-4 mb-12">
          <input
            className={field}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={field}
            placeholder="Phone (01xxxxxxxxx)"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <textarea
            className={field + " min-h-24 resize-y"}
            placeholder="Street, building, floor, apartment"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <input className={field} value={city} disabled />
          <p className="text-xs text-ink-soft">
            We currently deliver within {city} only.
          </p>
          <textarea
            className={field + " min-h-20 resize-y"}
            placeholder="Delivery notes (optional) - landmarks, best time to call"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <h2 className="font-display text-2xl font-light mb-6">Payment</h2>

        <div className="space-y-3">
          <MethodOption
            value="DEPOSIT_THEN_CASH_ON_DELIVERY"
            selected={method}
            onSelect={setMethod}
            title={`Pay ${depositPercent}% now, rest on delivery`}
            detail="Transfer the deposit by InstaPay or Vodafone Cash. Pay the balance in cash when it arrives."
          />
          <MethodOption
            value="FULL_INSTAPAY"
            selected={method}
            onSelect={setMethod}
            title="Pay in full now"
            detail="One transfer, nothing to pay on delivery."
          />
          <MethodOption
            value="DEPOSIT_THEN_PICKUP"
            selected={method}
            onSelect={setMethod}
            title={`Pay ${depositPercent}% now, collect in person`}
            detail="Pay the balance when you collect the piece."
          />
        </div>
      </div>

      {/* ---------------- right: summary ---------------- */}
      <div className="border border-line p-8 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-light mb-6">Your order</h2>

        <ul className="space-y-3 mb-6 text-sm">
          {lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-4">
              <span className="text-ink-soft">
                {l.name}
                {l.size && ` · ${l.size}`}
                {l.quantity > 1 && ` × ${l.quantity}`}
              </span>
              <span className="shrink-0">{formatEGP(l.lineTotalMinor)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-3 text-sm border-t border-line pt-4">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd>{formatEGP(subtotalMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Delivery</dt>
            <dd>{formatEGP(deliveryFeeMinor)}</dd>
          </div>
          <div className="flex justify-between pt-3 border-t border-line text-base">
            <dt>Total</dt>
            <dd>{formatEGP(total)}</dd>
          </div>
        </dl>

        <dl className="space-y-2 text-sm mt-6 pt-6 border-t border-line">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Pay now</dt>
            <dd>{formatEGP(deposit)}</dd>
          </div>
          {balance > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">
                {method === "DEPOSIT_THEN_PICKUP" ? "On collection" : "On delivery"}
              </dt>
              <dd>{formatEGP(balance)}</dd>
            </div>
          )}
        </dl>

        {/* The handmade-variance notice. Not about the silver rate. */}
        <div className="mt-6 pt-6 border-t border-line">
          <p className="text-xs text-ink-soft leading-relaxed">
            Each piece is made by hand, so the finished weight varies slightly.
            The price above already allows for that, and it is what you pay. In
            the rare case a piece comes out significantly heavier, we will
            contact you and ask before charging anything extra.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={pending || !name || !phone || !address}
          className="mt-8 w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {pending ? "PLACING ORDER…" : "PLACE ORDER →"}
        </button>

        {error && <p className="mt-4 text-sm text-red-800">{error}</p>}

        <p className="mt-4 text-[11px] text-ink-soft leading-relaxed">
          Payment instructions come next. Your order is confirmed once we
          receive the transfer.
        </p>
      </div>
    </div>
  );
}

function MethodOption({
  value,
  selected,
  onSelect,
  title,
  detail,
}: {
  value: Method;
  selected: Method;
  onSelect: (v: Method) => void;
  title: string;
  detail: string;
}) {
  const active = selected === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={
        "w-full text-left border p-5 transition-colors " +
        (active ? "border-ink bg-bone-deep" : "border-line hover:border-ink")
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={
            "mt-1 h-3 w-3 rounded-full border shrink-0 " +
            (active ? "border-ink bg-ink" : "border-line")
          }
        />
        <div>
          <p className="text-sm mb-1">{title}</p>
          <p className="text-xs text-ink-soft leading-relaxed">{detail}</p>
        </div>
      </div>
    </button>
  );
}