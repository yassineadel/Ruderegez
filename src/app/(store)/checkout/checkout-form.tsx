"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { formatEGP } from "@/lib/money";
import type { Minor } from "@/lib/money";
import type { CartLine } from "@/modules/cart/service";
import {
  placeOrderAction,
  lockCheckoutSessionAction,
} from "@/modules/orders/actions";
import type { CheckoutSessionView } from "@/modules/orders/checkout-session";
import ConfirmModal from "./confirm-modal";
import TermsNotice from "./terms-notice";

/**
 * Two ways to buy:
 *   FULL_INSTAPAY        pay everything now, we deliver (delivery fee applies)
 *   DEPOSIT_THEN_PICKUP  pay the deposit now, collect and pay the rest at the
 *                        store (no delivery, so no delivery fee)
 */
type Method = "FULL_INSTAPAY" | "DEPOSIT_THEN_PICKUP";

export default function CheckoutForm({
  lines,
  subtotalMinor,
  deliveryFeeMinor,
  depositPercent,
  city,
  defaultName,
  leadTimeDays,
  notice,
  storeAddress,
  storeMapLink,
  payTo,
  session,
}: {
  lines: CartLine[];
  subtotalMinor: Minor;
  deliveryFeeMinor: Minor;
  depositPercent: number;
  city: string;
  defaultName: string;
  leadTimeDays: number;
  notice?: string;
  storeAddress: string;
  storeMapLink: string | null;
  /** Where the customer sends the money. Empty strings mean "not set up". */
  payTo: { instapay: string; instapayName: string; vodafone: string };
  /** The price hold - every number on this page is priced at its rate. */
  session: CheckoutSessionView;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<Method>("FULL_INSTAPAY");
  const [modalOpen, setModalOpen] = useState(false);

  // The transfer receipt - uploaded before the order is placed.
  const [receiptUrl, setReceiptUrl] = useState("");
  const [payRef, setPayRef] = useState("");
  const [locking, setLocking] = useState(false);

  // ---------------- price hold ----------------
  const secondsLeft = useCountdown(session.expiresAt);
  const expired = secondsLeft <= 0;
  const [holdNotice, setHoldNotice] = useState<string | null>(null);

  // Time ran out: ask the server again. It opens a new hold at today's rate
  // and the page re-renders with the new prices. Form fields keep their
  // values - only the numbers change.
  // Retries every few seconds in case this device's clock runs slightly
  // ahead of the server's and the first refresh still gets the old hold.
  useEffect(() => {
    if (!expired || pending) return;
    router.refresh();
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [expired, pending, router]);

  // A new hold replaced the old one. A receipt uploaded under the old hold
  // was for the old amount, so it has to go.
  const previousSession = useRef(session.id);
  useEffect(() => {
    if (previousSession.current === session.id) return;
    previousSession.current = session.id;
    setReceiptUrl("");
    setPayRef("");
    setHoldNotice(
      "Your price hold ran out, so the prices have been refreshed at today's silver rate. Please check the amount before transferring.",
    );
  }, [session.id]);

  /** Receipt uploaded: lock the price for 15 more minutes. */
  async function handleReceipt(url: string) {
    setReceiptUrl(url);
    if (!url || session.locked) return;

    setLocking(true);
    const result = await lockCheckoutSessionAction(session.id);
    setLocking(false);

    if (!result.ok) {
      setError(result.error);
    }
    // Either way the server now knows best - locked (new expiry) or expired
    // (new hold). Refresh pulls whichever it is.
    router.refresh();
  }

  const isPickup = method === "DEPOSIT_THEN_PICKUP";
  // Must match the server: no delivery fee on a collection order.
  const deliveryMinor = (isPickup ? 0 : deliveryFeeMinor) as Minor;
  const total = (subtotalMinor + deliveryMinor) as Minor;
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
        addressLine: isPickup ? "" : address,
        addressCity: city,
        addressNotes: isPickup ? undefined : notes || undefined,
        paymentMethod: method,
        checkoutSessionId: session.id,
        paymentScreenshotUrl: receiptUrl,
        paymentReferenceNumber: payRef || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        // Expired hold, changed bag, used session - the server's view is the
        // truth, so reload it. A still-valid hold is simply reused.
        router.refresh();
        return;
      }
      router.push(`/orders/${result.data!.reference}`);
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-12 lg:gap-20 items-start">
      {/* ---------------- left: details ---------------- */}
      <div className="max-w-lg">
        {/* ---------------- price hold banner ---------------- */}
        <div
          className={
            "border p-4 mb-10 text-sm flex items-center justify-between gap-4 " +
            (session.locked ? "border-ink" : secondsLeft < 60 ? "border-red-800" : "border-line")
          }
        >
          <p className="leading-relaxed">
            {session.locked
              ? "Receipt received - your price is locked. Place your order within"
              : "Price held at today's silver rate. Upload your transfer receipt within"}
          </p>
          <span
            className={
              "font-mono text-lg shrink-0 " +
              (secondsLeft < 60 && !expired ? "text-red-800" : "")
            }
          >
            {formatTimer(secondsLeft)}
          </span>
        </div>

        {holdNotice && (
          <p className="mb-10 text-sm border-l-2 border-ink pl-4 leading-relaxed">
            {holdNotice}
          </p>
        )}

        {/* Payment first - the choice decides whether we need an address. */}
        <h2 className="font-display text-2xl font-light mb-6">Payment</h2>

        <div className="space-y-3 mb-12">
          <MethodOption
            value="FULL_INSTAPAY"
            selected={method}
            onSelect={setMethod}
            title="Pay in full now - delivered to you"
            detail={`One transfer by InstaPay or Vodafone Cash. Delivered within ${city}.`}
          />
          <MethodOption
            value="DEPOSIT_THEN_PICKUP"
            selected={method}
            onSelect={setMethod}
            title={`Pay ${depositPercent}% now - collect from our store`}
            detail="Transfer the deposit now and pay the balance when you collect the piece. No delivery fee."
          />
        </div>

        <h2 className="font-display text-2xl font-light mb-6">
          {isPickup ? "Collection" : "Delivery"}
        </h2>

        <div className="space-y-4">
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

          {isPickup ? (
            <div className="border border-line p-5 flex gap-3 items-start">
              <MapPin size={16} className="mt-0.5 shrink-0 text-ink-soft" />
              <div className="text-sm">
                <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-1">
                  COLLECT FROM
                </p>
                <p>{storeAddress || "Our store"}</p>
                {storeMapLink && (
                  <Link
                    href={storeMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs underline underline-offset-4 text-ink-soft hover:text-ink transition-colors"
                  >
                    Open in Google Maps
                  </Link>
                )}
                <p className="text-xs text-ink-soft mt-3 leading-relaxed">
                  We&apos;ll call you on this number when your piece is ready.
                </p>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* ---------------- transfer + receipt ---------------- */}
        <h2 className="font-display text-2xl font-light mt-12 mb-2">
          Send {formatEGP(deposit)}
        </h2>
        <p className="text-xs text-ink-soft mb-6 leading-relaxed">
          Transfer the amount using either method below, then upload the
          screenshot. We confirm it within a few hours of your order.
        </p>

        <dl className="space-y-4 text-sm border border-line p-5">
          {payTo.instapay && (
            <div>
              <dt className="text-[10px] tracking-[0.2em] text-ink-soft mb-1">
                INSTAPAY
              </dt>
              <dd className="font-mono">{payTo.instapay}</dd>
              {payTo.instapayName && (
                <dd className="text-xs text-ink-soft mt-0.5">
                  {payTo.instapayName}
                </dd>
              )}
            </div>
          )}
          {payTo.vodafone && (
            <div>
              <dt className="text-[10px] tracking-[0.2em] text-ink-soft mb-1">
                VODAFONE CASH
              </dt>
              <dd className="font-mono">{payTo.vodafone}</dd>
            </div>
          )}
          {!payTo.instapay && !payTo.vodafone && (
            <p className="text-sm text-ink-soft">
              Payment details are being set up. Please contact us to order.
            </p>
          )}
        </dl>

        <div className="mt-5 space-y-3">
          <ImageUpload
            value={receiptUrl}
            onChange={handleReceipt}
            folder="payments"
            label="Upload your transfer screenshot"
          />
          {locking && (
            <p className="text-xs text-ink-soft">Locking your price…</p>
          )}
          <input
            className={field}
            placeholder="Transfer reference number (optional)"
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
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
            <dd>{isPickup ? "Collection - free" : formatEGP(deliveryMinor)}</dd>
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
              <dt className="text-ink-soft">On collection</dt>
              <dd>{formatEGP(balance)}</dd>
            </div>
          )}
        </dl>

        {/* Informational only - acceptance happens in the modal. */}
        <TermsNotice
          depositPercent={depositPercent}
          city={city}
          leadTimeDays={leadTimeDays}
          notice={notice}
        />

        <button
          onClick={() => setModalOpen(true)}
          disabled={
            !name ||
            !phone ||
            (!isPickup && !address) ||
            !receiptUrl ||
            !session.locked ||
            expired
          }
          className="mt-6 w-full bg-ink text-bone py-4 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          REVIEW AND PLACE ORDER →
        </button>

        {/* Hidden while the modal is open - it shows the error itself. */}
        {error && !modalOpen && (
          <p className="mt-4 text-sm text-red-800">{error}</p>
        )}

        <p className="mt-4 text-[11px] text-ink-soft leading-relaxed">
          {receiptUrl
            ? "Receipt attached. We'll confirm your order once we've checked the transfer."
            : "Upload your transfer screenshot to place the order."}
        </p>
      </div>

      <ConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleSubmit}
        pending={pending}
        error={error}
        totalMinor={total}
        depositMinor={deposit}
        depositPercent={depositPercent}
        city={city}
        leadTimeDays={leadTimeDays}
        notice={notice}
      />
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

// ============================================================================
//  TIMER
// ============================================================================

/** Seconds until `iso`, ticking once a second. Never below zero. */
function useCountdown(iso: string): number {
  const target = new Date(iso).getTime();
  const calc = () => Math.max(0, Math.round((target - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(calc);

  useEffect(() => {
    setSeconds(calc());
    const id = setInterval(() => setSeconds(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return seconds;
}

function formatTimer(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}