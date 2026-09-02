import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?next=/account");

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24 max-w-4xl">
      <h1 className="font-display text-4xl font-light mb-2">Your account</h1>
      <p className="text-sm text-ink-soft mb-10">{session.user.email}</p>

      <nav className="flex gap-6 mb-12 text-xs tracking-[0.15em] border-b border-line">
        <Link href="/account" className="pb-3 text-ink-soft hover:text-ink transition-colors">
          ORDERS
        </Link>
        <Link href="/account/profile" className="pb-3 text-ink-soft hover:text-ink transition-colors">
          DETAILS
        </Link>
      </nav>

      {children}
    </div>
  );
}