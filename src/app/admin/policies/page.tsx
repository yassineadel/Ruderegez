import { getSettingsMap, toFormValue } from "@/modules/admin/service";
import { SETTING_GROUPS } from "@/modules/admin/settings-fields";
import SettingsForm from "../settings/settings-form";

const GROUP = "Policies";

export default async function PoliciesPage() {
  const stored = await getSettingsMap();
  const group = SETTING_GROUPS.find((g) => g.title === GROUP);

  const initial: Record<string, string> = {};
  for (const field of group?.fields ?? []) {
    initial[field.key] = toFormValue(field, stored[field.key] ?? "");
  }

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Policies</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-2xl">
        These appear on the policy pages and are linked from checkout. Write
        them in plain text — leave a blank line between paragraphs.
      </p>

      <SettingsForm initial={initial} only={GROUP} />
    </>
  );
}