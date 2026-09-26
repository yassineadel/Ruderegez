import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff, can } from "@/lib/auth-guards";
import type { AdminPermission } from "@/generated/prisma/client";

/** Sidebar entries, each shown only to people who have that section. */
const NAV: { href: string; label: string; needs: AdminPermission[] }[] = [
  { href: "/admin/orders", label: "Orders", needs: ["ORDERS", "PAYMENTS"] },
  { href: "/admin/products", label: "Products", needs: ["PRODUCTS"] },
  { href: "/admin/categories", label: "Categories", needs: ["CATEGORIES"] },
  { href: "/admin/custom-requests", label: "Custom requests", needs: ["CUSTOM_REQUESTS"] },
  { href: "/admin/reviews", label: "Reviews", needs: ["REVIEWS"] },
  { href: "/admin/policies", label: "Policies", needs: ["POLICIES"] },
  { href: "/admin/settings", label: "Settings", needs: ["SETTINGS"] },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin;
  try {
    // Owners, and staff with at least one section.
    admin = await requireStaff();
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNAUTHORIZED";
    if (code === "UNAUTHORIZED") redirect("/sign-in?next=/admin");
    redirect("/");
  }

  const isOwner = admin.role === "ADMIN";
  const links = NAV.filter((n) => n.needs.some((p) => can(admin, p)));

  return (
    <div className="min-h-screen grid lg:grid-cols-[240px_1fr]">
      <aside className="border-r border-line px-6 py-10 hidden lg:block">
        <Link href="/" className="font-display text-lg tracking-[0.3em] block mb-1">
          RUDEREGEZ
        </Link>
        <p className="text-[10px] tracking-[0.25em] text-ink-soft mb-12">ADMIN</p>

        <nav className="space-y-1">
          <NavLink href="/admin">Dashboard</NavLink>
          {links.map((n) => (
            <NavLink key={n.href} href={n.href}>
              {n.label}
            </NavLink>
          ))}
          {isOwner && <NavLink href="/admin/staff">Staff</NavLink>}
        </nav>

        <div className="mt-12 pt-6 border-t border-line">
          <p className="text-xs text-ink-soft leading-relaxed">
            Signed in as<br />
            <span className="text-ink">{admin.name ?? admin.email}</span>
            <br />
            <span className="text-[10px] tracking-[0.15em]">
              {isOwner ? "OWNER" : "STAFF"}
            </span>
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-xs text-ink-soft hover:text-ink underline underline-offset-4"
          >
            Back to store
          </Link>
        </div>
      </aside>

      <main className="px-6 py-10 lg:px-12 lg:py-14">
        {/* Mobile: the sidebar is hidden, so the sections scroll sideways. */}
        <div className="lg:hidden mb-8">
          <Link href="/admin" className="font-display text-lg tracking-[0.3em]">
            ADMIN
          </Link>
          <nav className="flex gap-4 overflow-x-auto mt-4 pb-2 text-xs text-ink-soft">
            {links.map((n) => (
              <Link key={n.href} href={n.href} className="shrink-0 hover:text-ink">
                {n.label}
              </Link>
            ))}
            {isOwner && (
              <Link href="/admin/staff" className="shrink-0 hover:text-ink">
                Staff
              </Link>
            )}
          </nav>
        </div>
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2.5 text-sm text-ink-soft hover:text-ink hover:bg-bone-deep transition-colors"
    >
      {children}
    </Link>
  );
}