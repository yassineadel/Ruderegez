import { requirePagePermission } from "@/lib/auth-guards";
import { getSliderAdmin } from "@/modules/homepage/service";
import SliderManager from "./slider-manager";

export default async function AdminHomepagePage() {
  await requirePagePermission("HOMEPAGE");
  const data = await getSliderAdmin();

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Homepage slider</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-xl leading-relaxed">
        A row of cards under the main banner on the homepage. Each card is a
        product, a customer review, or any picture you upload with a link of
        your choice. Products and reviews update by themselves - if a product
        is hidden or a review is hidden, its card stops showing. The slider
        only appears once at least one card is switched on.
      </p>

      <SliderManager {...data} />
    </>
  );
}
