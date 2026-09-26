import { getProductFormOptions } from "@/modules/admin/products-service";
import ProductForm from "../product-form";
import { requirePagePermission } from "@/lib/auth-guards";

export default async function NewProductPage() {
  await requirePagePermission(["ORDERS", "PAYMENTS"]);
  const { types, settings } = await getProductFormOptions();

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">New product</h1>
      <p className="text-sm text-ink-soft mb-10">
        It stays hidden from the store until you make it visible.
      </p>
      <ProductForm types={types} settings={settings} />
    </>
  );
}