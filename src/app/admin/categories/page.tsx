import { listCategories } from "@/modules/admin/categories-service";
import CategoriesManager from "./categories-manager";
import { requirePagePermission } from "@/lib/auth-guards";

export default async function AdminCategoriesPage() {
  await requirePagePermission(["ORDERS", "PAYMENTS"]);
  const categories = await listCategories();

  return (
    <>
      <h1 className="font-display text-4xl font-light mb-2">Categories</h1>
      <p className="text-sm text-ink-soft mb-10 max-w-xl">
        These appear in the store filters and when adding a product. The order
        here is the order customers see.
      </p>

      <CategoriesManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          isActive: c.isActive,
          productCount: c._count.products,
          customFactor: c.customFactorBp === null ? null : c.customFactorBp / 10000,
          sizes: c.sizes.map((s) => ({
            id: s.id,
            label: s.label,
            weightG: s.weightMg / 1000,
          })),
        }))}
      />
    </>
  );
}