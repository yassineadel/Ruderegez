import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCartView } from "@/modules/cart/service";
import { getPricingSettings, getSetting } from "@/lib/settings";
import CheckoutForm from "./checkout-form";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?next=/checkout");

  const [cart, settings, city, notice, leadTime] = await Promise.all([
    getCartView(),
    getPricingSettings(),
    getSetting("deliveryCityAllowed", "Cairo"),
    getSetting("checkoutNotice"),
    getSetting("defaultLeadTimeDays", "7"),
  ]);

  if (cart.lines.length === 0) redirect("/cart");

  return (
    <div className="px-6 lg:px-12 py-16 lg:py-24">
      <h1 className="font-display text-4xl font-light mb-2">Checkout</h1>
      <p className="text-sm text-ink-soft mb-12">
        {cart.itemCount} {cart.itemCount === 1 ? "piece" : "pieces"}
      </p>

      <CheckoutForm
        lines={cart.lines}
        subtotalMinor={cart.subtotalMinor}
        deliveryFeeMinor={settings.deliveryFee}
        depositPercent={settings.depositPercent}
        city={city}
        defaultName={session.user.name ?? ""}
        leadTimeDays={Number(leadTime)}
        notice={notice || undefined}
      />
    </div>
  );
}