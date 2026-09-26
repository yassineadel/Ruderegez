import { getTeam } from "@/modules/staff/service";
import { requireUser } from "@/lib/auth-guards";
import StaffManager from "./staff-manager";

export default async function AdminStaffPage() {
  const me = await requireUser();

  let data;
  try {
    data = await getTeam(); // owners only - throws for everyone else
  } catch {
    return (
      <>
        <h1 className="font-display text-4xl font-light mb-4">Staff</h1>
        <p className="text-sm text-ink-soft">Only owners can manage staff.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Staff</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-xl leading-relaxed">
        Owners can do everything, including this page. Staff can only use the
        sections ticked for them. Changes apply on their next click - no need
        for them to sign out.
      </p>

      <StaffManager
        meId={me.id}
        team={data.team.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as "ADMIN" | "STAFF",
          permissions: u.permissions,
          isBlocked: u.isBlocked,
        }))}
        invites={data.invites.map((i) => ({
          id: i.id,
          email: i.email,
          permissions: i.permissions,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </>
  );
}