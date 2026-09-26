import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { openCheckoutSession } from "@/modules/orders/checkout-session";
import { getPricingSettings, getSetting } from "@/lib/settings";
import CheckoutForm from "./checkout-form";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?next=/checkout");

  const [
    checkout,
    settings,
    city,
    notice,
    leadTime,
    storeAddress,
    storeMapLink,
    instapay,
    instapayName,
    vodafone,
  ] = await Promise.all([
    // Opens (or reuses) the price hold and prices the bag at the held rate.
    openCheckoutSession(),
    getPricingSettings(),
    getSetting("deliveryCityAllowed", "Cairo"),
    getSetting("checkoutNotice"),
    getSetting("defaultLeadTimeDays", "7"),
    getSetting("storeAddress"),
    getSetting("storeMapLink"),
    getSetting("instapayHandle"),
    getSetting("instapayAccountName"),
    getSetting("vodafoneCashNumber"),
  ]);

  if (!checkout) redirect("/cart");
  const { cart, session: hold } = checkout;

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
        storeAddress={storeAddress}
        storeMapLink={storeMapLink.startsWith("https://") ? storeMapLink : null}
        payTo={{ instapay, instapayName, vodafone }}
        session={hold}
      />
    </div>
  );
}