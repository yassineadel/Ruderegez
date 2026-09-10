import { auth, signOut } from "@/lib/auth";
import { getCartCount } from "@/modules/cart/service";
import { countAwaitingResponse } from "@/modules/account/service";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

/**
 * Wraps every customer-facing page. (auth) and /admin have their own layouts,
 * so the sign-in screen and the admin panel deliberately do NOT get this
 * header and footer.
 *
 * The session, the bag count and anything waiting on the customer are read
 * here, once, and passed down - so the header stays a dumb component that
 * renders what it is given.
 */
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cartCount] = await Promise.all([auth(), getCartCount()]);

  // Only meaningful once signed in — countAwaitingResponse calls requireUser,
  // which throws for a guest. The catch keeps a guest visit from 500ing.
  const awaitingCount = session?.user
    ? await countAwaitingResponse().catch(() => 0)
    : 0;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader
        isSignedIn={Boolean(session?.user)}
        isAdmin={session?.user?.role === "ADMIN"}
        cartCount={cartCount}
        awaitingCount={awaitingCount}
        onSignOut={handleSignOut}
      />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}