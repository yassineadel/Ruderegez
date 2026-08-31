"use client";

import { useState, useTransition } from "react";
import { updateSettingsAction } from "@/modules/admin/actions";
import { SETTING_GROUPS, type SettingField } from "@/modules/admin/settings-fields";

export default function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const dirty = Object.keys(values).some((k) => values[k] !== initial[k]);

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(null);
  }

  function handleSave() {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const result = await updateSettingsAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const n = result.data?.changed ?? 0;
      setSaved(n === 0 ? "No changes to save." : `Saved ${n} change${n === 1 ? "" : "s"}.`);
      if (n > 0) window.location.reload();
    });
  }

  const field =
    "w-full bg-transparent border border-line px-4 py-3 text-sm " +
    "placeholder:text-ink-soft focus:outline-none focus:border-ink transition-colors";

  return (
    <div className="max-w-2xl pb-32">
      {SETTING_GROUPS.map((group) => (
        <section key={group.title} className="mb-12">
          <h2 className="font-display text-2xl font-light mb-1">{group.title}</h2>
          <p className="text-sm text-ink-soft mb-6">{group.description}</p>

          <div className="space-y-6">
            {group.fields.map((f) => (
              <Field
                key={f.key}
                field={f}
                value={values[f.key] ?? ""}
                onChange={(v) => set(f.key, v)}
                className={field}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] border-t border-line bg-bone px-6 py-4 lg:px-12">
        <div className="max-w-2xl flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={pending || !dirty}
            className="bg-ink text-bone px-10 py-3.5 text-xs tracking-[0.2em] disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {pending ? "SAVING…" : "SAVE CHANGES"}
          </button>

          {dirty && !pending && <span className="text-sm text-ink-soft">Unsaved changes</span>}
          {saved && <span className="text-sm text-ink-soft">{saved}</span>}
          {error && <span className="text-sm text-red-800">{error}</span>}
        </div>
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
  className,
}: {
  field: SettingField;
  value: string;
  onChange: (v: string) => void;
  className: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs tracking-[0.15em] text-ink-soft mb-2">
        {field.label.toUpperCase()}
      </span>

      {field.kind === "select" ? (
        <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          <input
            className={className + (field.kind === "money" ? " pl-14" : "")}
            type={field.kind === "text" ? "text" : "number"}
            step={field.kind === "money" ? "0.01" : "1"}
            min={field.min}
            max={field.max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.kind === "money" && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
              EGP
            </span>
          )}
          {field.kind === "percent" && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
              %
            </span>
          )}
        </div>
      )}

      {field.help && <span className="block text-xs text-ink-soft mt-2">{field.help}</span>}
    </label>
  );
}