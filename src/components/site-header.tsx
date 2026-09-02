"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/**
 * Client component only because of the mobile menu toggle. Whether the visitor
 * is signed in, and how many items are in their bag, are decided on the SERVER
 * and passed down as props — the header never queries anything itself.
 */
export default function SiteHeader({
  isSignedIn,
  isAdmin,
  cartCount,
  onSignOut,
}: {
  isSignedIn: boolean;
  isAdmin: boolean;
  cartCount: number;
onSignOut: () => Promise<void>;
}) {        
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/products", label: "ALL" },
    { href: "/products?audience=WOMEN", label: "WOMEN" },
    { href: "/products?audience=MEN", label: "MEN" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-bone/95 backdrop-blur border-b border-line">
      <div className="px-6 lg:px-12 h-16 lg:h-20 flex items-center justify-between">
        {/* Left — desktop nav, mobile menu button */}
        <nav className="hidden lg:flex items-center gap-8 text-[11px] tracking-[0.2em] flex-1">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-ink-soft hover:text-ink transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setOpen(true)}
          className="lg:hidden text-ink"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Centre — wordmark */}
        <Link
          href="/"
          className="font-display text-lg lg:text-xl tracking-[0.35em] lg:flex-1 lg:text-center"
        >
          RUDEREGEZ
        </Link>

        {/* Right — account and bag */}
        <div className="flex items-center gap-5 lg:gap-7 text-[11px] tracking-[0.2em] lg:flex-1 lg:justify-end">
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden lg:block text-ink-soft hover:text-ink transition-colors"
            >
              ADMIN
            </Link>
          )}
                    {isSignedIn ? (
            <>
              <Link
                href="/account"
                className="hidden lg:block text-ink-soft hover:text-ink transition-colors"
              >
                ACCOUNT
              </Link>
              <form action={onSignOut} className="hidden lg:block">
                <button
                  type="submit"
                  className="text-ink-soft hover:text-ink transition-colors tracking-[0.2em]"
                >
                  SIGN OUT
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="hidden lg:block text-ink-soft hover:text-ink transition-colors"
            >
              SIGN IN
            </Link>
          )}
          <Link href="/cart" className="hover:text-ink transition-colors">
            BAG{cartCount > 0 && ` (${cartCount})`}
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-bone lg:hidden">
          <div className="px-6 h-16 flex items-center justify-between border-b border-line">
            <span className="font-display text-lg tracking-[0.35em]">RUDEREGEZ</span>
            <button onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>

          <nav className="px-6 py-10 flex flex-col gap-7 text-sm tracking-[0.2em]">
            {links.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="border-t border-line pt-7 flex flex-col gap-7 text-ink-soft">
              <Link href="/cart" onClick={() => setOpen(false)}>
                BAG{cartCount > 0 && ` (${cartCount})`}
              </Link>
                            {isSignedIn ? (
                <>
                  <Link href="/account" onClick={() => setOpen(false)}>
                    ACCOUNT
                  </Link>
                  <form action={onSignOut}>
                    <button type="submit" className="tracking-[0.2em]">
                      SIGN OUT
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/sign-in" onClick={() => setOpen(false)}>
                  SIGN IN
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={() => setOpen(false)}>
                  ADMIN
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}