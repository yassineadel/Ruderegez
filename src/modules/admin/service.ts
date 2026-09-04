import { requireAdmin } from "@/lib/auth-guards";
import { toMinor, fromMinor } from "@/lib/money";
import type { Minor } from "@/lib/money";
import { EDITABLE_KEYS, FIELD_BY_KEY, type SettingField } from "./settings-fields";
import { findAllSettings, findSettingsByKeys, applySettingChanges } from "./repository";

/** Stored form -> form form. "11368" -> "113.68" for money, unchanged otherwise. */
export function toFormValue(field: SettingField, stored: string): string {
  if (field.kind === "money") {
    const n = Number.parseInt(stored, 10);
    return Number.isFinite(n) ? String(fromMinor(n as Minor)) : "";
  }
  return stored;
}

/** Form form -> stored form. Throws a code the action translates. */
function toStoredValue(field: SettingField, submitted: string): string {
  const raw = submitted.trim();

  if (field.kind === "text" || field.kind === "textarea") {
    if (!raw && !field.allowEmpty) throw new Error("REQUIRED_FIELD");
    return raw;
  }

  if (field.kind === "select") {
    const allowed = field.options?.map((o) => o.value) ?? [];
    if (!allowed.includes(raw)) throw new Error("INVALID_VALUE");
    return raw;
  }

  // money, percent, int
  const n = Number(raw);
  if (raw === "" || !Number.isFinite(n)) throw new Error("INVALID_NUMBER");
  if (field.min !== undefined && n < field.min) throw new Error("OUT_OF_RANGE");
  if (field.max !== undefined && n > field.max) throw new Error("OUT_OF_RANGE");

  if (field.kind === "money") return String(toMinor(n));

  if (!Number.isInteger(n)) throw new Error("INVALID_NUMBER");
  return String(n);
}

/** Every setting, keyed, for the form to render from. */
export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await findAllSettings();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function updateSettings(
  submitted: Record<string, string>,
): Promise<{ changed: number }> {
  const admin = await requireAdmin();

  // 1. Validate and convert EVERYTHING before touching the database.
  const wanted: Record<string, string> = {};
  for (const [key, value] of Object.entries(submitted)) {
    if (!EDITABLE_KEYS.includes(key)) continue;
    wanted[key] = toStoredValue(FIELD_BY_KEY[key], value);
  }

  // 2. Cross-field rule.
  const lo = Number(wanted.quoteSlaDaysMin);
  const hi = Number(wanted.quoteSlaDaysMax);
  if (Number.isFinite(lo) && Number.isFinite(hi) && lo > hi) {
    throw new Error("SLA_RANGE_INVERTED");
  }

  // 3. Diff against what is stored.
  const current = await findSettingsByKeys(Object.keys(wanted));
  const currentMap = Object.fromEntries(current.map((r) => [r.key, r.value]));

  const changes = Object.entries(wanted)
    .filter(([key, value]) => currentMap[key] !== value)
    .map(([key, value]) => ({ key, value }));

  if (changes.length === 0) return { changed: 0 };

  // 4. Write + audit atomically.
  const beforeJson = Object.fromEntries(
    changes.map((c) => [c.key, currentMap[c.key] ?? null]),
  );
  const afterJson = Object.fromEntries(changes.map((c) => [c.key, c.value]));

  await applySettingChanges(changes, {
    actorUserId: admin.id,
    beforeJson,
    afterJson,
  });

  return { changed: changes.length };
}