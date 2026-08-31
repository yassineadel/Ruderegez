import { getSettingsMap, toFormValue } from "@/modules/admin/service";
import { SETTING_GROUPS } from "@/modules/admin/settings-fields";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const stored = await getSettingsMap();

  const initial: Record<string, string> = {};
  for (const group of SETTING_GROUPS) {
    for (const field of group.fields) {
      initial[field.key] = toFormValue(field, stored[field.key] ?? "");
    }
  }

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Settings</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-2xl">
        Changes take effect immediately for new carts and quotes. Orders that
        have already been placed keep the prices they were placed at.
      </p>

      <SettingsForm initial={initial} />
    </>
  );
}