import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left - image. Hidden on mobile; the form is what matters there. */}
      <div className="relative hidden lg:block bg-bone-deep">
        <img
          src="/auth-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />

        <Link
          href="/"
          className="absolute top-12 left-12 font-display text-2xl tracking-[0.35em] text-ink"
        >
          RUDEREGEZ
        </Link>

        <p className="absolute bottom-28 left-12 text-[11px] leading-7 tracking-[0.25em] text-ink">
          HANDMADE<br />SILVER<br />JEWELLERY
        </p>

        <p className="absolute bottom-12 left-12 text-[11px] tracking-[0.25em] text-ink-soft">
          EGYPT - CAIRO
        </p>
      </div>

      {/* Right - the form */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Wordmark for mobile, where the left panel is hidden */}
          <Link
            href="/"
            className="lg:hidden block mb-12 font-display text-xl tracking-[0.35em]"
          >
            RUDEREGEZ
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}