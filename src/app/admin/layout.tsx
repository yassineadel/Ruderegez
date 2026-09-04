import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNAUTHORIZED";
    if (code === "UNAUTHORIZED") redirect("/sign-in?next=/admin");
    redirect("/");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[240px_1fr]">
      <aside className="border-r border-line px-6 py-10 hidden lg:block">
        <Link href="/" className="font-display text-lg tracking-[0.3em] block mb-1">
          RUDEREGEZ
        </Link>
        <p className="text-[10px] tracking-[0.25em] text-ink-soft mb-12">ADMIN</p>

        <nav className="space-y-1">
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/orders">Orders</NavLink>
          <NavLink href="/admin/products">Products</NavLink>
          <NavLink href="/admin/categories">Categories</NavLink>
          <NavLink href="/admin/settings">Settings</NavLink>
        </nav>

        <div className="mt-12 pt-6 border-t border-line">
          <p className="text-xs text-ink-soft leading-relaxed">
            Signed in as<br />
            <span className="text-ink">{admin.name ?? admin.email}</span>
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
        <div className="lg:hidden mb-8 flex items-center justify-between">
          <Link href="/admin" className="font-display text-lg tracking-[0.3em]">
            ADMIN
          </Link>
          <Link href="/admin/settings" className="text-xs text-ink-soft">
            Settings
          </Link>
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