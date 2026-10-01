"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  createZoneAction,
  updateZoneAction,
  deleteZoneAction,
  moveZoneAction,
} from "@/modules/delivery/actions";

interface Zone {
  id: string;
  name: string;
  feeEgp: number;
  isActive: boolean;
}

const field =
  "bg-transparent border border-line px-3 py-2.5 text-sm placeholder:text-ink-soft " +
  "focus:outline-none focus:border-ink transition-colors";

export default function ZonesManager({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl">
      {/* ---------------- add ---------------- */}
      <form
        className="border border-line p-5 flex flex-wrap gap-3 items-end mb-10"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => createZoneAction({ name, feeEgp: Number(fee) }),
            () => {
              setName("");
              setFee("");
            },
          );
        }}
      >
        <label className="flex-1 min-w-48">
          <span className="block text-[10px] tracking-[0.2em] text-ink-soft mb-2">AREA</span>
          <input
            className={field + " w-full"}
            placeholder="e.g. Giza"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
          />
        </label>
        <label className="w-40">
          <span className="block text-[10px] tracking-[0.2em] text-ink-soft mb-2">FEE, EGP</span>
          <input
            className={field + " w-full"}
            type="number"
            min={0}
            max={10000}
            step="0.01"
            placeholder="0 = free"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending || !name.trim() || fee === ""}
          className="bg-ink text-bone px-6 py-3 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          ADD AREA
        </button>
      </form>

      {error && <p className="mb-6 text-sm text-red-800">{error}</p>}

      {/* ---------------- list ---------------- */}
      {zones.length === 0 ? (
        <p className="text-sm text-ink-soft py-8">
          No delivery areas. Customers can only collect from the store until
          you add one.
        </p>
      ) : (
        <div className="border border-line">
          {zones.map((z, i) => (
            <ZoneRow
              key={`${z.id}:${z.name}:${z.feeEgp}`}
              zone={z}
              first={i === 0}
              last={i === zones.length - 1}
              pending={pending}
              run={run}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ZoneRow({
  zone,
  first,
  last,
  pending,
  run,
}: {
  zone: Zone;
  first: boolean;
  last: boolean;
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [name, setName] = useState(zone.name);
  const [fee, setFee] = useState(String(zone.feeEgp));
  const changed = name.trim() !== zone.name || Number(fee) !== zone.feeEgp;

  return (
    <div
      className={
        "px-4 py-4 border-b border-line last:border-0 flex flex-wrap items-center gap-3 " +
        (zone.isActive ? "" : "bg-bone-deep")
      }
    >
      <div className="flex flex-col">
        <button
          onClick={() => run(() => moveZoneAction(zone.id, "up"))}
          disabled={pending || first}
          className="text-ink-soft hover:text-ink disabled:opacity-20"
          aria-label={`Move ${zone.name} up`}
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={() => run(() => moveZoneAction(zone.id, "down"))}
          disabled={pending || last}
          className="text-ink-soft hover:text-ink disabled:opacity-20"
          aria-label={`Move ${zone.name} down`}
        >
          <ArrowDown size={14} />
        </button>
      </div>

      <input
        className={field + " flex-1 min-w-36"}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        aria-label="Area name"
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">EGP</span>
        <input
          className={field + " w-28"}
          type="number"
          min={0}
          max={10000}
          step="0.01"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          aria-label="Delivery fee in EGP"
        />
      </div>

      {changed ? (
        <button
          onClick={() =>
            run(() => updateZoneAction({ id: zone.id, name, feeEgp: Number(fee) }))
          }
          disabled={pending || !name.trim() || fee === ""}
          className="bg-ink text-bone px-4 py-2.5 text-xs tracking-[0.15em] disabled:opacity-40"
        >
          SAVE
        </button>
      ) : (
        <button
          onClick={() => run(() => updateZoneAction({ id: zone.id, isActive: !zone.isActive }))}
          disabled={pending}
          className="border border-ink px-4 py-2.5 text-xs tracking-[0.15em] disabled:opacity-40 hover:bg-ink hover:text-bone transition-colors"
        >
          {zone.isActive ? "SWITCH OFF" : "SWITCH ON"}
        </button>
      )}

      <button
        onClick={() => {
          if (confirm(`Delete ${zone.name}? Past orders keep their delivery details.`)) {
            run(() => deleteZoneAction(zone.id));
          }
        }}
        disabled={pending}
        className="text-xs text-ink-soft hover:text-red-800 underline underline-offset-4 disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  );
}
