"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminPermission } from "@/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import {
  addStaffAction,
  updateStaffAction,
  removeStaffAction,
  makeOwnerAction,
  removeOwnerAction,
  cancelInviteAction,
} from "@/modules/staff/actions";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "STAFF";
  permissions: AdminPermission[];
  isBlocked: boolean;
}

interface Invite {
  id: string;
  email: string;
  permissions: AdminPermission[];
  createdAt: string;
}

type ActionResult = { ok: boolean; error?: string; data?: unknown };

const LABEL: Record<string, string> = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.label]));

export default function StaffManager({
  meId,
  team,
  invites,
}: {
  meId: string;
  team: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const owners = team.filter((m) => m.role === "ADMIN");
  const staff = team.filter((m) => m.role === "STAFF");

  function run(fn: () => Promise<ActionResult>, success?: (data: unknown) => string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setMessage({ text: result.error ?? "Something went wrong.", error: true });
        return;
      }
      if (success) setMessage({ text: success(result.data), error: false });
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl space-y-14">
      {message && (
        <p
          className={
            "text-sm border-l-2 pl-4 leading-relaxed " +
            (message.error ? "border-red-800 text-red-800" : "border-ink")
          }
        >
          {message.text}
        </p>
      )}

      {/* ---------------- add ---------------- */}
      <AddStaff pending={pending} run={run} />

      {/* ---------------- owners ---------------- */}
      <section>
        <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">
          OWNERS - FULL ACCESS
        </h2>
        <ul className="border border-line divide-y divide-line">
          {owners.map((o) => (
            <li key={o.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <Person member={o} isMe={o.id === meId} />
              <ConfirmButton
                label="Remove owner"
                confirmLabel="Yes, remove"
                disabled={pending || owners.length <= 1}
                title={owners.length <= 1 ? "The store needs at least one owner" : undefined}
                onConfirm={() =>
                  run(
                    () => removeOwnerAction(o.id),
                    () => `${o.email} is no longer an owner.`,
                  )
                }
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- staff ---------------- */}
      <section>
        <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">STAFF</h2>
        {staff.length === 0 ? (
          <p className="text-sm text-ink-soft">No staff yet.</p>
        ) : (
          <ul className="border border-line divide-y divide-line">
            {staff.map((m) => (
              <StaffRow key={m.id} member={m} pending={pending} run={run} />
            ))}
          </ul>
        )}
      </section>

      {/* ---------------- invites ---------------- */}
      <section>
        <h2 className="text-[10px] tracking-[0.2em] text-ink-soft mb-2">
          PENDING INVITES
        </h2>
        <p className="text-xs text-ink-soft mb-4 leading-relaxed">
          No account with these emails yet. Access is given automatically when
          they sign up and sign in with that exact email.
        </p>
        {invites.length === 0 ? (
          <p className="text-sm text-ink-soft">None.</p>
        ) : (
          <ul className="border border-line divide-y divide-line">
            {invites.map((i) => (
              <li key={i.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm truncate">{i.email}</p>
                  <p className="text-xs text-ink-soft mt-1">
                    {i.permissions.map((p) => LABEL[p]).join(", ")}
                  </p>
                </div>
                <ConfirmButton
                  label="Cancel"
                  confirmLabel="Yes, cancel"
                  disabled={pending}
                  onConfirm={() =>
                    run(
                      () => cancelInviteAction(i.id),
                      () => `Invite for ${i.email} cancelled.`,
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ============================================================================
//  ADD BY EMAIL
// ============================================================================

function AddStaff({
  pending,
  run,
}: {
  pending: boolean;
  run: (fn: () => Promise<ActionResult>, success?: (data: unknown) => string) => void;
}) {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<AdminPermission[]>([]);

  function submit() {
    const target = email.trim();
    run(
      () => addStaffAction(target, selected),
      (data) => {
        setEmail("");
        setSelected([]);
        const result = (data as { result?: string } | undefined)?.result;
        if (result === "INVITED") {
          return `No account uses ${target} yet. Ask them to sign up with that email - they'll get access as soon as they sign in.`;
        }
        if (result === "UPDATED") return `${target}'s sections were updated.`;
        return `${target} now has access. They'll see the admin panel on their next click.`;
      },
    );
  }

  return (
    <section className="border border-ink p-6">
      <h2 className="font-display text-2xl font-light mb-5">Give someone access</h2>

      <input
        className="w-full bg-transparent border border-line px-4 py-3 text-sm placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors mb-5"
        type="email"
        placeholder="their-email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <PermissionPicker value={selected} onChange={setSelected} />

      <button
        onClick={submit}
        disabled={pending || !email.trim() || selected.length === 0}
        className="mt-6 bg-ink text-bone px-8 py-3.5 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {pending ? "SAVING…" : "GIVE ACCESS"}
      </button>
    </section>
  );
}

// ============================================================================
//  ONE STAFF MEMBER
// ============================================================================

function StaffRow({
  member,
  pending,
  run,
}: {
  member: Member;
  pending: boolean;
  run: (fn: () => Promise<ActionResult>, success?: (data: unknown) => string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<AdminPermission[]>(member.permissions);

  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Person member={member} isMe={false} />
          {!editing && (
            <p className="text-xs text-ink-soft mt-2">
              {member.permissions.map((p) => LABEL[p]).join(", ")}
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex flex-wrap justify-end gap-2 shrink-0">
            <button
              onClick={() => {
                setSelected(member.permissions);
                setEditing(true);
              }}
              disabled={pending}
              className="border border-line px-3 py-2 text-[11px] tracking-[0.1em] hover:border-ink transition-colors disabled:opacity-40"
            >
              EDIT
            </button>
            <ConfirmButton
              label="Make owner"
              confirmLabel="Yes, full access"
              disabled={pending}
              onConfirm={() =>
                run(
                  () => makeOwnerAction(member.id),
                  () => `${member.email} is now an owner.`,
                )
              }
            />
            <ConfirmButton
              label="Remove"
              confirmLabel="Yes, remove"
              disabled={pending}
              danger
              onConfirm={() =>
                run(
                  () => removeStaffAction(member.id),
                  () => `${member.email} no longer has admin access.`,
                )
              }
            />
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4">
          <PermissionPicker value={selected} onChange={setSelected} />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() =>
                run(
                  () => updateStaffAction(member.id, selected),
                  () => {
                    setEditing(false);
                    return `${member.email}'s sections were updated.`;
                  },
                )
              }
              disabled={pending || selected.length === 0}
              className="bg-ink text-bone px-6 py-2.5 text-xs tracking-[0.2em] disabled:opacity-40"
            >
              SAVE
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={pending}
              className="border border-line px-6 py-2.5 text-xs tracking-[0.2em] hover:border-ink"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ============================================================================
//  SMALL PIECES
// ============================================================================

function Person({ member, isMe }: { member: Member; isMe: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-sm truncate">
        {member.name ?? member.email}
        {isMe && <span className="ml-2 text-[10px] tracking-[0.15em] text-ink-soft">YOU</span>}
        {member.isBlocked && (
          <span className="ml-2 text-[10px] tracking-[0.15em] text-red-800">BLOCKED</span>
        )}
      </p>
      {member.name && <p className="text-xs text-ink-soft truncate">{member.email}</p>}
    </div>
  );
}

function PermissionPicker({
  value,
  onChange,
}: {
  value: AdminPermission[];
  onChange: (next: AdminPermission[]) => void;
}) {
  function toggle(key: AdminPermission) {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
      {PERMISSIONS.map((p) => (
        <label key={p.key} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(p.key)}
            onChange={() => toggle(p.key)}
            className="mt-1 shrink-0"
          />
          <span>
            <span className="block text-sm">{p.label}</span>
            <span className="block text-xs text-ink-soft">{p.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/** Two clicks for anything that takes access away or hands out full access. */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  danger,
  title,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <span className="flex gap-2">
        <button
          onClick={() => {
            setArmed(false);
            onConfirm();
          }}
          disabled={disabled}
          className="bg-ink text-bone px-3 py-2 text-[11px] tracking-[0.1em] disabled:opacity-40"
        >
          {confirmLabel.toUpperCase()}
        </button>
        <button
          onClick={() => setArmed(false)}
          className="border border-line px-3 py-2 text-[11px] tracking-[0.1em] hover:border-ink"
        >
          NO
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setArmed(true)}
      disabled={disabled}
      title={title}
      className={
        "border px-3 py-2 text-[11px] tracking-[0.1em] transition-colors disabled:opacity-30 " +
        (danger
          ? "border-line text-red-800 hover:border-red-800"
          : "border-line hover:border-ink")
      }
    >
      {label.toUpperCase()}
    </button>
  );
}