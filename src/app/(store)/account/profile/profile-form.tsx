"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import {
  saveProfileAction,
  changePasswordAction,
} from "@/modules/account/actions";

export default function ProfileForm({
  profile,
}: {
  profile: {
    name: string;
    email: string;
    phone: string;
    addressLine: string;
    addressNotes: string;
    hasPassword: boolean;
  };
}) {
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [addressLine, setAddressLine] = useState(profile.addressLine);
  const [addressNotes, setAddressNotes] = useState(profile.addressNotes);
  const [detailsMsg, setDetailsMsg] = useState<string | null>(null);
  const [detailsErr, setDetailsErr] = useState<string | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const field =
    "w-full bg-transparent border border-line px-4 py-3.5 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";
  const label = "block text-xs tracking-[0.15em] text-ink-soft mb-2";

  function saveDetails() {
    setDetailsErr(null);
    setDetailsMsg(null);
    startTransition(async () => {
      const result = await saveProfileAction({
        name,
        phone,
        addressLine,
        addressNotes,
      });
      if (!result.ok) {
        setDetailsErr(result.error);
        return;
      }
      setDetailsMsg("Saved.");
    });
  }

  function savePassword() {
    setPwErr(null);
    setPwMsg(null);
    if (next !== confirm) {
      setPwErr("The two new passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: current,
        newPassword: next,
      });
      if (!result.ok) {
        setPwErr(result.error);
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setPwMsg("Your password has been changed.");
    });
  }

  return (
    <div className="max-w-lg space-y-14">
      <section>
        <h2 className="font-display text-2xl font-light mb-1">Your details</h2>
        <p className="text-sm text-ink-soft mb-6">
          Saved here so checkout is quicker next time.
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className={label}>NAME</span>
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="block">
            <span className={label}>EMAIL</span>
            <input className={field} value={profile.email} disabled />
            <span className="block text-xs text-ink-soft mt-2">
              Get in touch if you need to change this.
            </span>
          </label>

          <label className="block">
            <span className={label}>PHONE</span>
            <input
              className={field}
              inputMode="tel"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className="block">
            <span className={label}>DELIVERY ADDRESS</span>
            <textarea
              className={field + " min-h-24 resize-y"}
              placeholder="Street, building, floor, apartment"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
            />
          </label>

          <label className="block">
            <span className={label}>DELIVERY NOTES</span>
            <textarea
              className={field + " min-h-20 resize-y"}
              placeholder="Landmarks, best time to call"
              value={addressNotes}
              onChange={(e) => setAddressNotes(e.target.value)}
            />
          </label>
        </div>

        <button
          onClick={saveDetails}
          disabled={pending}
          className="mt-6 bg-ink text-bone px-10 py-3.5 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {pending ? "SAVING…" : "SAVE DETAILS"}
        </button>

        {detailsMsg && <p className="mt-4 text-sm text-ink-soft">{detailsMsg}</p>}
        {detailsErr && <p className="mt-4 text-sm text-red-800">{detailsErr}</p>}
      </section>

      {profile.hasPassword && (
        <section>
          <h2 className="font-display text-2xl font-light mb-6">Password</h2>

          <div className="space-y-4">
            <label className="block">
              <span className={label}>CURRENT PASSWORD</span>
              <input
                className={field}
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={label}>NEW PASSWORD</span>
              <input
                className={field}
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </label>
            <label className="block">
              <span className={label}>CONFIRM NEW PASSWORD</span>
              <input
                className={field}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          </div>

          <button
            onClick={savePassword}
            disabled={pending || !current || !next}
            className="mt-6 border border-ink px-10 py-3.5 text-xs tracking-[0.2em] disabled:opacity-40 hover:bg-ink hover:text-bone transition-colors"
          >
            {pending ? "SAVING…" : "CHANGE PASSWORD"}
          </button>

          {pwMsg && <p className="mt-4 text-sm text-ink-soft">{pwMsg}</p>}
          {pwErr && <p className="mt-4 text-sm text-red-800">{pwErr}</p>}
        </section>
      )}

      <section className="pt-8 border-t border-line">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-ink-soft hover:text-ink underline underline-offset-4 transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}