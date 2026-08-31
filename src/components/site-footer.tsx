import Link from "next/link";
import { getSetting } from "@/lib/settings";

/**
 * Server component. Reads the store contact details straight from settings, so
 * the client can change the phone number in the admin panel without a deploy.
 */
export default async function SiteFooter() {
  const [phone, address, city] = await Promise.all([
    getSetting("storePhone"),
    getSetting("storeAddress"),
    getSetting("deliveryCityAllowed", "Cairo"),
  ]);

  return (
    <footer className="border-t border-line mt-24">
      <div className="px-6 lg:px-12 py-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg tracking-[0.35em] mb-4">RUDEREGEZ</p>
          <p className="text-xs text-ink-soft leading-relaxed">
            Handmade sterling silver jewellery.
            <br />
            Made to order in Cairo.
          </p>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">SHOP</p>
          <ul className="space-y-2.5 text-xs">
            <li><Link href="/products" className="hover:text-ink-soft transition-colors">All pieces</Link></li>
            <li><Link href="/products?audience=WOMEN" className="hover:text-ink-soft transition-colors">Women</Link></li>
            <li><Link href="/products?audience=MEN" className="hover:text-ink-soft transition-colors">Men</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">HELP</p>
          <ul className="space-y-2.5 text-xs">
            <li><Link href="/policies/returns" className="hover:text-ink-soft transition-colors">Returns</Link></li>
            <li><Link href="/policies/terms" className="hover:text-ink-soft transition-colors">Terms</Link></li>
            <li><Link href="/policies/privacy" className="hover:text-ink-soft transition-colors">Privacy</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-soft mb-4">CONTACT</p>
          <ul className="space-y-2.5 text-xs text-ink-soft">
            {phone && <li>{phone}</li>}
            {address && <li>{address}</li>}
            <li>Delivery within {city}</li>
          </ul>
        </div>
      </div>

      <div className="px-6 lg:px-12 py-6 border-t border-line text-[10px] tracking-[0.15em] text-ink-soft">
        © {new Date().getFullYear()} RUDEREGEZ — CAIRO, EGYPT
      </div>
    </footer>
  );
}
